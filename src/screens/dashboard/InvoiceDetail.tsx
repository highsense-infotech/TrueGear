import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Loader2, Printer, Receipt, Ban } from "lucide-react";
import Button from "../../components/common/Button";
import { ROUTES } from "../../constants/routes";
import {
  getInvoice,
  getInvoicePrintUrl,
  recordPayment,
  voidInvoice,
  type Invoice,
  type PaymentMode,
} from "../../api/invoicing.api";

const PAYMENT_MODES: { key: PaymentMode; label: string }[] = [
  { key: "CASH", label: "Cash" },
  { key: "CARD", label: "Card" },
  { key: "UPI", label: "UPI" },
  { key: "BANK", label: "Bank" },
  { key: "CHEQUE", label: "Cheque" },
];

const STATUS_COLOR: Record<string, string> = {
  GENERATED: "bg-amber-100 text-amber-700",
  PARTIALLY_PAID: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  VOID: "bg-red-100 text-red-700",
  DRAFT: "bg-gray-200 text-gray-700",
};

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [inv, setInv] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<PaymentMode>("CASH");
  const [referenceNo, setReferenceNo] = useState("");

  const fetchOne = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await getInvoice(id);
      if (res.success && res.data) setInv(res.data);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchOne(); }, [id]);

  const balance = inv ? Number(inv.totalAmount) - Number(inv.paidAmount) : 0;

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inv) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    setSubmitting(true);
    try {
      const res = await recordPayment(inv.id, { amount: amt, mode, referenceNo: referenceNo.trim() || undefined });
      if (res.success && res.data) {
        toast.success(res.data.status === "PAID" ? `Paid in full — gate pass ${res.data.gatePass?.code ?? ""}` : "Payment recorded");
        setAmount("");
        setReferenceNo("");
        await fetchOne();
      } else {
        toast.error(res.error?.message ?? "Failed to record payment");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message ?? "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoid = async () => {
    if (!inv) return;
    const reason = window.prompt("Void reason (optional)") ?? undefined;
    if (!window.confirm(`Void ${inv.invoiceNo}? This cannot be undone (the invoice will need to be re-issued).`)) return;
    const res = await voidInvoice(inv.id, reason || undefined);
    if (res.success) {
      toast.success("Invoice voided");
      await fetchOne();
    } else {
      toast.error(res.error?.message ?? "Failed to void");
    }
  };

  const openPrint = () => {
    if (!inv) return;
    const url = getInvoicePrintUrl(inv.id);
    const token = localStorage.getItem("token");
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : undefined })
      .then((r) => r.blob())
      .then((b) => window.open(URL.createObjectURL(b), "_blank"))
      .catch(() => toast.error("Could not open invoice"));
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#ff4f31]" /></div>;
  }
  if (!inv) {
    return <div className="text-center py-12 text-[#999]">Invoice not found</div>;
  }

  const canEdit = inv.status !== "PAID" && inv.status !== "VOID";
  const canVoid = inv.status === "GENERATED" && Number(inv.paidAmount) === 0;

  return (
    <>
      <button onClick={() => navigate(ROUTES.FINANCE_BILLING_DASHBOARD)} className="flex items-center gap-1 text-[13px] text-[#666] mb-3 hover:text-[#333]">
        <ArrowLeft size={14} /> Back to billing
      </button>

      <div className="bg-white border border-[#e5e7eb] rounded-xl p-4 mb-4">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <Receipt className="text-[#ff4f31]" size={20} />
              <h2 className="text-[18px] font-semibold">{inv.invoiceNo}</h2>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLOR[inv.status]}`}>
                {inv.status.replace("_", " ")}
              </span>
            </div>
            <p className="text-[12px] text-[#666] mt-1">
              {inv.vehicle.registrationNumber?.toUpperCase()} · {inv.vehicle.brand} {inv.vehicle.model}
              {inv.customerName ? ` · ${inv.customerName}` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={openPrint} className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] border border-[#e5e7eb] rounded-md hover:bg-[#f5f5f5]">
              <Printer size={14} /> Print
            </button>
            {canVoid && (
              <button onClick={handleVoid} className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] border border-red-200 text-red-600 rounded-md hover:bg-red-50">
                <Ban size={14} /> Void
              </button>
            )}
          </div>
        </div>

        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase text-[#999] border-b border-[#e5e7eb]">
              <th className="py-2">Description</th>
              <th className="text-right py-2">Qty</th>
              <th className="text-right py-2">Unit</th>
              <th className="text-right py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {inv.lines.map((l) => (
              <tr key={l.id} className="border-b border-[#f5f5f5]">
                <td className="py-2">
                  {l.description}
                  {l.isWarranty && <span className="ml-2 text-[10px] text-[#0061FF] font-semibold">[WARRANTY]</span>}
                </td>
                <td className="text-right py-2">{Number(l.quantity).toFixed(2)}</td>
                <td className="text-right py-2">{inv.currencyCode} {Number(l.unitPrice).toFixed(2)}</td>
                <td className="text-right py-2 font-semibold">{inv.currencyCode} {Number(l.lineTotal).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto mt-3 max-w-xs text-[13px]">
          <div className="flex justify-between py-1"><span className="text-[#666]">Subtotal</span><span>{inv.currencyCode} {Number(inv.subtotal).toFixed(2)}</span></div>
          {Number(inv.discountAmount) > 0 && (
            <div className="flex justify-between py-1 text-red-600"><span>Discount</span><span>− {inv.currencyCode} {Number(inv.discountAmount).toFixed(2)}</span></div>
          )}
          <div className="flex justify-between py-1"><span className="text-[#666]">{inv.taxLabel} ({Number(inv.taxPercentage).toFixed(2)}%)</span><span>{inv.currencyCode} {Number(inv.taxAmount).toFixed(2)}</span></div>
          <div className="flex justify-between py-2 border-t-2 border-[#333] mt-1 font-bold"><span>Total</span><span>{inv.currencyCode} {Number(inv.totalAmount).toFixed(2)}</span></div>
          <div className="flex justify-between py-1 text-green-700"><span>Paid</span><span>{inv.currencyCode} {Number(inv.paidAmount).toFixed(2)}</span></div>
          <div className="flex justify-between py-1 font-semibold"><span>Balance</span><span>{inv.currencyCode} {balance.toFixed(2)}</span></div>
        </div>
      </div>

      {/* Record payment */}
      {canEdit && balance > 0 && (
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-4 mb-4">
          <h3 className="text-[15px] font-semibold mb-3">Record payment</h3>
          <form onSubmit={handlePayment} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-[12px] text-[#999]">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={balance.toFixed(2)}
                className="mt-1 w-full h-10 border border-[#e5e7eb] rounded-md px-2 text-[13px] outline-none focus:border-[#ff4f31]"
              />
            </div>
            <div>
              <label className="text-[12px] text-[#999]">Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as PaymentMode)}
                className="mt-1 w-full h-10 border border-[#e5e7eb] rounded-md px-2 text-[13px] outline-none focus:border-[#ff4f31] bg-white">
                {PAYMENT_MODES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[12px] text-[#999]">Reference #</label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="Txn / Cheque #"
                className="mt-1 w-full h-10 border border-[#e5e7eb] rounded-md px-2 text-[13px] outline-none focus:border-[#ff4f31]"
              />
            </div>
            <Button variant="gradient" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Record"}
            </Button>
          </form>
        </div>
      )}

      {/* Payment history */}
      {inv.payments.length > 0 && (
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-4 mb-4">
          <h3 className="text-[15px] font-semibold mb-2">Payment history</h3>
          <div className="space-y-2">
            {inv.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-[13px] border-b border-[#f5f5f5] py-1">
                <div>
                  <span className="font-semibold">{inv.currencyCode} {Number(p.amount).toFixed(2)}</span>
                  <span className="ml-2 text-[#666]">via {p.mode}</span>
                  {p.referenceNo && <span className="ml-2 text-[#999]">ref {p.referenceNo}</span>}
                </div>
                <span className="text-[11px] text-[#999]">{new Date(p.paidAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gate pass */}
      {inv.gatePass && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <h3 className="text-[15px] font-semibold mb-1 text-green-800">Gate pass</h3>
          <p className="text-[20px] font-bold text-green-700 tracking-wide">{inv.gatePass.code}</p>
          <p className="text-[12px] text-green-700 mt-1">
            Status: {inv.gatePass.status}
            {inv.gatePass.redeemedAt && ` · Redeemed ${new Date(inv.gatePass.redeemedAt).toLocaleString()}`}
          </p>
          <p className="text-[11px] text-[#666] mt-2">Show this code at the gate. Security verifies + captures odometer to release the vehicle.</p>
        </div>
      )}
    </>
  );
}
