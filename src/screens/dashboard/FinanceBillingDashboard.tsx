import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Loader2, Receipt, DollarSign, FileText, Wallet } from "lucide-react";
import { StatCard } from "../../components/cards/StatCard.tsx";
import Button from "../../components/common/Button";
import { ROUTES } from "../../constants/routes";
import {
  generateInvoice,
  listReadyForBillingPaginated,
  type ReadyForBillingRow,
} from "../../api/invoicing.api";
import { Pagination } from "../../components/common/Pagination";

const STATUS_COLOR: Record<string, string> = {
  GENERATED: "bg-amber-100 text-amber-700",
  PARTIALLY_PAID: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  VOID: "bg-red-100 text-red-700",
};

export default function FinanceBillingDashboard() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ReadyForBillingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ pending: 0, generated: 0, collected: 0, avg: 0 });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await listReadyForBillingPaginated({ page, limit: pageSize });
      if (res.success && res.data) {
        setRows(res.data.data);
        setTotal(res.data.pagination?.total ?? res.data.data.length);
        setTotalPages(res.data.pagination?.totalPages ?? 1);
        if (res.data.stats) setStats(res.data.stats);
      }
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchAll(); /* eslint-disable-next-line */ }, [page, pageSize]);

  const handleGenerate = async (jobCardId: string) => {
    setBusyId(jobCardId);
    try {
      const res = await generateInvoice(jobCardId);
      if (res.success && res.data) {
        toast.success(`Invoice ${res.data.invoiceNo} generated`);
        navigate(`${ROUTES.FINANCE_BILLING_DASHBOARD}/invoice/${res.data.id}`);
      } else {
        toast.error(res.error?.message ?? "Failed to generate invoice");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message ?? "Failed to generate invoice");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
        <StatCard
          title="Pending invoices"
          value={String(stats.pending).padStart(2, "0")}
          icon={<DollarSign className="w-7 h-7 text-[#FF4F31]" strokeWidth={2} />}
        />
        <StatCard
          title="Open invoices"
          value={String(stats.generated).padStart(2, "0")}
          icon={<FileText className="w-7 h-7 text-[#0061FF]" strokeWidth={2} />}
        />
        <StatCard
          title="Collected"
          value={stats.collected.toFixed(0)}
          icon={<Wallet className="w-7 h-7 text-[#00BF06]" strokeWidth={2} />}
        />
        <StatCard
          title="Average invoice"
          value={stats.avg.toFixed(0)}
          icon={<Receipt className="w-7 h-7 text-[#333]" strokeWidth={2} />}
        />
      </div>

      <div className="mb-3">
        <h2 className="text-[18px] font-semibold text-[#333]">Ready for Billing</h2>
        <p className="text-[13px] text-[#999]">Vehicles that have cleared QC + washbay</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[#ff4f31]" />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-8 text-center text-[14px] text-[#999]">
          No vehicles are ready for billing right now.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.checkInId} className="bg-white border border-[#e5e7eb] rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-[#333]">
                  {(r.registrationNumber ?? "—").toUpperCase()}
                  {r.receivingNo && <span className="ml-2 text-[12px] text-[#ff4f31] font-semibold">{r.receivingNo}</span>}
                </p>
                <p className="text-[12px] text-[#666]">
                  {r.brand} {r.model}{r.customerName ? ` · ${r.customerName}` : ""}
                </p>
                {r.jobCard && (
                  <p className="text-[11px] text-[#999] mt-0.5">
                    Estimate: {Number(r.jobCard.totalEstimate ?? 0).toFixed(2)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {r.invoice ? (
                  <>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLOR[r.invoice.status] ?? "bg-gray-200 text-gray-700"}`}>
                      {r.invoice.invoiceNo} · {r.invoice.status.replace("_", " ")}
                    </span>
                    <Button variant="gradient" onClick={() => navigate(`${ROUTES.FINANCE_BILLING_DASHBOARD}/invoice/${r.invoice!.id}`)}>
                      Open
                    </Button>
                  </>
                ) : r.jobCard ? (
                  <Button variant="gradient" disabled={busyId === r.jobCard.id} onClick={() => handleGenerate(r.jobCard!.id)}>
                    {busyId === r.jobCard.id ? "Generating..." : "Generate Invoice"}
                  </Button>
                ) : (
                  <span className="text-[12px] text-[#999]">No job card</span>
                )}
              </div>
            </div>
          ))}

          {total > 0 && (
            <div className="mt-3 pt-2 border-t border-[#f0f0f0]">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={total}
                itemsPerPage={pageSize}
                onPageChange={setPage}
                onItemsPerPageChange={(l) => {
                  setPageSize(l);
                  setPage(1);
                }}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}
