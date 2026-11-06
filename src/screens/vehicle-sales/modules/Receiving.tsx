// Module 2 — Vehicle Goods Receipt. Received units, their receipts (photos,
// QC, damage claim, Evolve stock-in status) and the PO line counts are saved on
// the TrueGear server (Phase 2). Receiving goes through /api/vehicle-sales/stock/receive,
// which assigns the stock no.; later receipt edits sync through the store.

import { useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  PackageCheck, ScanLine, MapPin, Clock, Camera, CircleCheck, TriangleAlert,
  PlugZap, FileText, ShieldCheck, Wrench, Truck, Car, Plus,
} from "lucide-react";
import SignaturePad from "../../../components/common/SignaturePad";
import LiveCameraCapture from "../../../components/common/LiveCameraCapture";
import type { CapturedPhoto } from "../../../utils/stampImage";
import { useCurrency } from "../../../context/CurrencyContext";
import {
  PageHeader, Card, KpiGrid, KpiCard, DataTable, StatusBadge, SmallButton, PrimaryButton, SecondaryButton,
  Field, TextInput, SelectInput, FormGrid, ConfirmDialog, KeyValueGrid, Notice, PendingUatNotice,
  PhotoSlot, ProgressBar, Badge, Timeline, EmptyState, Tabs,
} from "../components/ui";
import { EvolveWriteActions } from "../components/evolve";
import { sendEvolveStock, type StockUnit as EvolveStockUnit } from "../../../api/vehicleSalesEvolve.api";
import { receiveVehicle, uploadReceiptPhoto, type ReceiptPhoto } from "../../../api/vehicleSales.api";
import { scanOdometer, scanVin } from "../../../api/vehicle.api";
import { evolveErrorMessage, unwrap } from "../components/evolveHooks";
import toast from "react-hot-toast";
import { previewToast } from "../components/helpers";
import { screenPath } from "../registry";
import { BRANCHES, COLOURS, MODEL_CODES, fmtDate, poQty, poReceived, poSummary, type StockVehicle } from "../data/mock";
import { customerById, salesStore, today, useSalesData, usePersistentState } from "../data/store";

// ── Shared receipt details ───────────────────────────────────────────────────
type Rating = "Pass" | "Conditional" | "Fail";
interface Defect { id: string; category: string; severity: "Minor" | "Major" | "Critical"; description: string; photos: number }

interface ReceiptMeta {
  receivedOn: string;
  poId?: string;
  poLineId?: string;
  supplier?: string;
  supplierInvoice?: string;
  photos?: Record<string, ReceiptPhoto | string>; // slot → live-camera photo (a string = old simulated capture)
  scans?: Record<string, ScanResult | boolean>; // scan key → AI read (a boolean = old simulated scan)
  qc?: { ratings: Record<string, Rating>; notes: Record<string, string>; overall: Rating; at: string };
  defects?: Defect[];
  // Supplier claim: estimate → supplier approval → payment → settled.
  // "Claim submitted" is the older name of "Estimate sent".
  claim?: ClaimStatus | "Claim submitted";
  claimType?: "Damage" | "Warranty";
  claimEstimate?: number;
  claimApproved?: number; // amount the supplier approved
  claimSupplierRef?: string;
  claimPaid?: number;
  claimPaidOn?: string;
  claimLog?: { status: string; at: string; note?: string }[];
  evolve?: "Manual in Evolve" | "Sent to Evolve";
  evolveStockNo?: string; // VehicleStockNo Evolve returned from 18
}

interface ScanResult { value: string; at: string; warning?: string }

type ClaimStatus = "Open" | "Estimate sent" | "Supplier approved" | "Rejected" | "Paid" | "Settled";
const claimStatusOf = (m?: ReceiptMeta): ClaimStatus => (m?.claim === "Claim submitted" ? "Estimate sent" : m?.claim ?? "Open");

const nowStamp = () => new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/i;

function useReceipts() {
  const [receipts, setReceipts] = usePersistentState<Record<string, ReceiptMeta>>("receiving.receipts", {});
  // `p` may be a function of the latest receipt, for updates that land after an await.
  const patch = (stockNo: string, p: Partial<ReceiptMeta> | ((m: ReceiptMeta) => Partial<ReceiptMeta>)) =>
    setReceipts((r) => {
      const cur = r[stockNo] ?? { receivedOn: today() };
      return { ...r, [stockNo]: { ...cur, ...(typeof p === "function" ? p(cur) : p) } };
    });
  return [receipts, patch] as const;
}

// Selected vehicle travels between the receiving steps as ?stock=.
function useSelectedVehicle(prefer?: (v: StockVehicle) => boolean) {
  const { stock } = useSalesData();
  const [params, setParams] = useSearchParams();
  const wanted = params.get("stock");
  const vehicle = stock.find((v) => v.stockNo === wanted) ?? (prefer && stock.find(prefer)) ?? stock[0];
  const select = (stockNo: string) => setParams({ stock: stockNo }, { replace: true });
  return { stock, vehicle, select };
}

function VehiclePicker({ stock, value, onChange }: { stock: StockVehicle[]; value: string; onChange: (stockNo: string) => void }) {
  return (
    <Card className="mb-5">
      <Field label="Vehicle" htmlFor="rcv-vehicle" hint="Vehicles you have received, newest first">
        <SelectInput id="rcv-vehicle" value={value} onChange={(e) => onChange(e.target.value)} options={stock.map((v) => ({ value: v.stockNo, label: `${v.stockNo} — ${v.make} ${v.model} · ${v.vin}` }))} />
      </Field>
    </Card>
  );
}

function NoVehicles() {
  const navigate = useNavigate();
  return (
    <>
      <PageHeader />
      <EmptyState
        icon={Car}
        title="No vehicles received yet"
        message="Receive a vehicle first (against a purchase order or without one) and it will show up here."
        action={<SmallButton variant="primary" icon={PackageCheck} onClick={() => navigate(screenPath("goods-receipt", "receive-vehicle"))}>Receive vehicle</SmallButton>}
      />
    </>
  );
}

// Back to sellable stock once the QC claim is settled.
const releaseHold = (v: StockVehicle) => {
  if (v.status === "On Hold") salesStore.update("stock", (x) => x.stockNo === v.stockNo, { status: v.type === "Demo" ? "Demo" : "In Stock" });
};

const withStock = (path: string, stockNo: string) => `${path}?stock=${encodeURIComponent(stockNo)}`;

// ── Receive Vehicle ──────────────────────────────────────────────────────────
type ReceiveMode = "po" | "nopo";

export function ReceiveVehicle() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<ReceiveMode>("po");
  const { formatCurrency } = useCurrency();
  const { deals } = useSalesData();
  // Trade-ins of completed (invoiced / delivered) sales become used stock: they
  // wait here until taken in. deal id → stock no. once received.
  const [takenIn, setTakenIn] = usePersistentState<Record<string, string>>("receiving.tradeInStock", {});
  const [prefill, setPrefill] = useState<{ dealId: string; form: NoPoForm } | null>(null);
  const waiting = deals.filter((d) => d.tradeIn && (d.status === "Invoiced" || d.status === "Delivered") && !takenIn[d.id]);

  const takeIn = (dealId: string) => {
    const d = deals.find((x) => x.id === dealId);
    if (!d?.tradeIn) return;
    const t = d.tradeIn;
    setPrefill({ dealId, form: {
      ...EMPTY_NOPO, type: "Used", make: t.make, model: t.model, year: t.year ? String(t.year) : "",
      registration: t.registration ?? "", cost: String(t.value || ""), source: `Trade-in on ${d.id} — ${customerById(d.customerId)?.name ?? "customer"}`,
    } });
    setMode("nopo");
  };

  return (
    <>
      <PageHeader actions={<SecondaryButton icon={FileText} onClick={() => navigate(screenPath("purchase-order", "purchase-orders"))}>Purchase orders</SecondaryButton>} />
      {waiting.length > 0 && (
        <Card title="Trade-ins waiting to come into stock" icon={Car} subtitle="From completed sales — take each one in as a used vehicle" className="mb-5">
          <ul className="divide-y divide-[#f0f0f0]">
            {waiting.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-2.5 flex-wrap">
                <div className="min-w-0">
                  <p className="text-[13px] text-[#333] font-medium">{d.tradeIn!.year || ""} {d.tradeIn!.make} {d.tradeIn!.model}{d.tradeIn!.registration ? ` · ${d.tradeIn!.registration}` : ""}</p>
                  <p className="text-[12px] text-[#999]">{d.id} · {customerById(d.customerId)?.name ?? "—"} · allowance {formatCurrency(d.tradeIn!.value)}</p>
                </div>
                <SmallButton variant="primary" icon={PackageCheck} onClick={() => takeIn(d.id)}>Take into stock</SmallButton>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Tabs<ReceiveMode> value={mode} onChange={setMode} tabs={[
        { key: "po", label: "Against purchase order", icon: FileText },
        { key: "nopo", label: "Without PO (used / trade-in / demo)", icon: Car },
      ]} />
      {mode === "po" ? <ReceiveAgainstPO onNoPo={() => setMode("nopo")} />
        : <ReceiveWithoutPO key={prefill?.dealId ?? "blank"} prefill={prefill?.form} tradeInDeal={prefill?.dealId}
            onReceived={(stockNo) => {
              if (prefill) {
                setTakenIn((m) => ({ ...m, [prefill.dealId]: stockNo }));
                setPrefill(null);
              }
            }} />}
    </>
  );
}

interface POReceiptForm { vin: string; engineNo: string; colour: string; modelCode: string; branch: string; odometer: string; retail: string; supplierInvoice: string }
const EMPTY_PO_RECEIPT: POReceiptForm = { vin: "", engineNo: "", colour: "", modelCode: "", branch: "", odometer: "", retail: "", supplierInvoice: "" };

function ReceiveAgainstPO({ onNoPo }: { onNoPo: () => void }) {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const { purchaseOrders, stock } = useSalesData();
  const [receipts] = useReceipts();
  const openPOs = purchaseOrders.filter((p) => p.status === "Ordered" || p.status === "Partially Received");
  const [poId, setPoId] = useState("");
  const po = openPOs.find((p) => p.id === poId) ?? openPOs[0];
  const openLines = po ? po.lines.filter((l) => l.received < l.qty) : [];
  const [lineId, setLineId] = useState("");
  const line = openLines.find((l) => l.id === lineId) ?? openLines[0];
  const [form, setForm] = useState<POReceiptForm>(EMPTY_PO_RECEIPT);
  const [errors, setErrors] = useState<Partial<Record<keyof POReceiptForm, string>>>({});
  const [confirm, setConfirm] = useState(false);
  const [lastPoId, setLastPoId] = useState("");

  // The PO just completed drops out of openPOs; keep showing what was received on it.
  const shownPoId = po?.id ?? lastPoId;
  const added = stock.filter((v) => receipts[v.stockNo]?.poId === shownPoId);
  const lineRemaining = line ? line.qty - line.received : 0;
  const poRemaining = po ? poQty(po) - poReceived(po) : 0;
  const suggestedRetail = line ? Math.round((line.unitCost * 1.13) / 100) * 100 : 0;

  const set = (k: keyof POReceiptForm, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  if (openPOs.length === 0 && added.length === 0) {
    return (
      <EmptyState
        icon={Truck}
        title="No open purchase orders"
        message="Approved purchase orders (status “Ordered” or “Partially Received”) can be received here. You can also receive a vehicle without a PO."
        action={
          <div className="flex gap-2 flex-wrap justify-center">
            <SmallButton icon={Plus} onClick={() => navigate(screenPath("purchase-order", "new-purchase-order"))}>New purchase order</SmallButton>
            <SmallButton onClick={() => navigate(screenPath("purchase-order", "approve-purchase-order"))}>Approve purchase orders</SmallButton>
            <SmallButton variant="primary" onClick={onNoPo}>Receive without PO</SmallButton>
          </div>
        }
      />
    );
  }

  const validate = () => {
    if (!po || !line) return false;
    const e: Partial<Record<keyof POReceiptForm, string>> = {};
    const vin = form.vin.trim().toUpperCase();
    if (!VIN_RE.test(vin)) e.vin = "VIN must be 17 characters (no I, O or Q)";
    else if (stock.some((v) => v.vin === vin)) e.vin = "This VIN is already in stock";
    if (!form.engineNo.trim()) e.engineNo = "Engine number is required";
    if (!form.colour) e.colour = "Select the colour";
    else if (form.colour !== line.colour) e.colour = `Does not match the line colour (${line.colour})`;
    if (!form.modelCode.trim()) e.modelCode = "Model code is required";
    else if (form.modelCode.trim().toUpperCase() !== line.modelCode) e.modelCode = `Does not match the line model code (${line.modelCode})`;
    if (!(form.branch || po.branch)) e.branch = "Select the receiving branch";
    if (form.odometer && Number(form.odometer) < 0) e.odometer = "Odometer cannot be negative";
    // Retail price is required. Blank uses cost + 13%, which only works when the PO line has a cost.
    if (form.retail ? Number(form.retail) <= 0 : suggestedRetail <= 0) e.retail = "Enter the retail price";
    if (lineRemaining <= 0) e.vin = "All units on this line have been received";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // The server checks the VIN and the line, assigns the stock no. and updates the PO in one go.
  const receive = async () => {
    if (!po || !line) return;
    const model = MODEL_CODES.find((m) => m.code === line.modelCode);
    try {
      const r = unwrap(await receiveVehicle({
        poNo: po.id,
        lineKey: line.id,
        supplier: po.supplier,
        supplierInvoice: form.supplierInvoice.trim() || undefined,
        vehicle: {
          vin: form.vin.trim().toUpperCase(),
          engineNo: form.engineNo.trim().toUpperCase(),
          // The PO line carries the catalogue make / year; older lines fall back to the built-in list.
          make: line.make || model?.make || "Toyota",
          model: line.model,
          modelCode: line.modelCode,
          year: line.year ?? model?.year ?? new Date().getFullYear(),
          colour: form.colour,
          branch: form.branch || po.branch || "",
          type: "New",
          retail: Number(form.retail) || suggestedRetail,
          cost: line.unitCost,
          odometer: Number(form.odometer) || 0,
        },
      }));
      salesStore.applyServer({ vehicle: r.vehicle, purchaseOrder: r.purchaseOrder, receipt: { stockNo: r.vehicle.stockNo, data: r.receipt } });
      setLastPoId(po.id);
      setForm((f) => ({ ...EMPTY_PO_RECEIPT, branch: f.branch, supplierInvoice: f.supplierInvoice }));
      toast.success(`${r.vehicle.stockNo} received against ${po.id} line ${po.lines.indexOf(line) + 1}`);
    } catch (err) {
      toast.error(evolveErrorMessage(err));
    } finally {
      setConfirm(false);
    }
  };

  const lastVehicle = added[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
      <div className="lg:col-span-2 space-y-5">
        <Card title="1. Select purchase order and vehicle line">
          {openPOs.length === 0 ? (
            <Notice tone="success" title="All open purchase orders are fully received">Create or approve another purchase order to receive more units.</Notice>
          ) : (
            <FormGrid>
              <Field label="Open purchase order" required htmlFor="rv-po">
                <SelectInput id="rv-po" value={po?.id ?? ""} onChange={(e) => { setPoId(e.target.value); setLineId(""); setErrors({}); }} options={openPOs.map((p) => ({ value: p.id, label: `${p.id} — ${poSummary(p)}` }))} />
              </Field>
              <Field label="Vehicle line" required hint="Which vehicle on the PO has arrived" htmlFor="rv-line">
                <SelectInput id="rv-line" value={line?.id ?? ""} onChange={(e) => { setLineId(e.target.value); setErrors({}); }} options={openLines.map((l) => ({ value: l.id, label: `Line ${po!.lines.indexOf(l) + 1} — ${l.model} (${l.colour}) · ${l.qty - l.received} of ${l.qty} to receive` }))} />
              </Field>
            </FormGrid>
          )}
          {po && (
            <div className="mt-4">
              <KeyValueGrid cols={4} items={[
                { label: "Supplier", value: po.supplier },
                { label: "Receiving branch", value: po.branch || "—" },
                { label: "Expected", value: po.expected ? fmtDate(po.expected) : "—" },
                { label: "Units received", value: `${poReceived(po)} of ${poQty(po)}` },
              ]} />
              <div className="overflow-x-auto border border-[#f0f0f0] rounded-lg mt-4">
                <table className="w-full text-[12px]">
                  <thead className="bg-[#fafafa] text-[#999] text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium">Line</th>
                      <th className="px-3 py-2 font-medium">Vehicle</th>
                      <th className="px-3 py-2 font-medium text-right">Ordered</th>
                      <th className="px-3 py-2 font-medium text-right">Received</th>
                      <th className="px-3 py-2 font-medium text-right">Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {po.lines.map((l, i) => (
                      <tr key={l.id} className={`border-t border-[#f0f0f0] ${l.id === line?.id ? "bg-[#fff6f4]" : ""}`}>
                        <td className="px-3 py-2 text-[#999]">{i + 1}</td>
                        <td className="px-3 py-2"><p className="text-[#333]">{l.model}</p><p className="text-[11px] text-[#999]">{l.modelCode} · {l.colour}</p></td>
                        <td className="px-3 py-2 text-right tabular-nums">{l.qty}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{l.received}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{l.qty - l.received === 0 ? <Badge tone="green">Done</Badge> : l.qty - l.received}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3"><ProgressBar value={poReceived(po)} max={poQty(po)} tone={poRemaining === 0 ? "green" : "brand"} label="Units received on this PO" /></div>
            </div>
          )}
        </Card>

        {po && line && (
          <Card title="2. Match arrived vehicle" subtitle={`Expected: ${line.model} · ${line.modelCode} · ${line.colour}. VIN, engine number, colour and model code must match this line.`}>
            <FormGrid>
              <Field label="VIN" required error={errors.vin} htmlFor="rv-vin"><TextInput id="rv-vin" value={form.vin} onChange={(e) => set("vin", e.target.value)} error={!!errors.vin} placeholder="17-character VIN" className="font-mono uppercase" maxLength={17} /></Field>
              <Field label="Engine number" required error={errors.engineNo} htmlFor="rv-eng"><TextInput id="rv-eng" value={form.engineNo} onChange={(e) => set("engineNo", e.target.value)} error={!!errors.engineNo} className="font-mono uppercase" /></Field>
              <Field label="Colour" required error={errors.colour} htmlFor="rv-col"><SelectInput id="rv-col" value={form.colour} onChange={(e) => set("colour", e.target.value)} error={!!errors.colour} placeholder="Select colour" options={[...new Set([line.colour, ...COLOURS].filter(Boolean))]} /></Field>
              <Field label="Model code" required error={errors.modelCode} htmlFor="rv-mc"><TextInput id="rv-mc" value={form.modelCode} onChange={(e) => set("modelCode", e.target.value)} error={!!errors.modelCode} placeholder={line.modelCode} className="uppercase" /></Field>
              <Field label="Receiving branch" required error={errors.branch} htmlFor="rv-branch"><SelectInput id="rv-branch" value={form.branch || po.branch || ""} onChange={(e) => set("branch", e.target.value)} error={!!errors.branch} placeholder="Select branch" options={[...BRANCHES]} /></Field>
              <Field label="Odometer (km)" error={errors.odometer} htmlFor="rv-odo"><TextInput id="rv-odo" type="number" min={0} value={form.odometer} onChange={(e) => set("odometer", e.target.value)} error={!!errors.odometer} placeholder="0" className="no-spinner" onWheel={(e) => e.currentTarget.blur()} /></Field>
              <Field label="Retail price" required error={errors.retail} hint={suggestedRetail > 0 ? `Leave blank to use ${formatCurrency(suggestedRetail)} (cost + 13%)` : undefined} htmlFor="rv-retail"><TextInput id="rv-retail" type="number" min={0} value={form.retail} onChange={(e) => set("retail", e.target.value)} error={!!errors.retail} placeholder={String(suggestedRetail)} className="no-spinner" onWheel={(e) => e.currentTarget.blur()} /></Field>
              <Field label="Supplier invoice no." htmlFor="rv-inv"><TextInput id="rv-inv" value={form.supplierInvoice} onChange={(e) => set("supplierInvoice", e.target.value)} placeholder="Optional" /></Field>
            </FormGrid>
            <div className="flex justify-end mt-4">
              <PrimaryButton icon={PackageCheck} onClick={() => validate() && setConfirm(true)}>Receive unit</PrimaryButton>
            </div>
          </Card>
        )}
      </div>

      <Card title="Received on this PO" subtitle={shownPoId}>
        {added.length === 0 ? (
          <EmptyState icon={PackageCheck} title="No units received yet" message="Matched units appear here. Partial receipts keep the PO open." />
        ) : (
          <ul className="space-y-2">
            {added.map((v) => (
              <li key={v.stockNo} className="border border-[#f0f0f0] rounded-lg px-3 py-2">
                <p className="text-[12px] font-medium text-[#ff4f31]">{v.stockNo} <span className="font-normal text-[#666]">· {v.model}</span></p>
                <p className="font-mono text-[12px] text-[#333]">{v.vin}</p>
                <p className="text-[11px] text-[#999]">{v.engineNo} · {v.colour} · {v.branch} · {fmtDate(receipts[v.stockNo]?.receivedOn ?? today())}</p>
              </li>
            ))}
          </ul>
        )}
        {lastVehicle && (
          <div className="mt-4 space-y-2">
            {po && poRemaining > 0 && <Notice tone="info">Partial receipt — {poRemaining} unit(s) outstanding across {openLines.length} line(s), PO stays open.</Notice>}
            <SmallButton variant="primary" className="w-full" onClick={() => navigate(withStock(screenPath("goods-receipt", "arrival-photos"), lastVehicle.stockNo))}>Next: arrival photos for {lastVehicle.stockNo}</SmallButton>
          </div>
        )}
      </Card>

      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={receive} title="Receive vehicle" confirmLabel="Receive"
        message={po && line && <>Match VIN <span className="font-mono">{form.vin.toUpperCase()}</span> to <span className="font-semibold">{po.id}</span> line {po.lines.indexOf(line) + 1} ({line.model})? {poRemaining - 1 > 0 ? `${poRemaining - 1} unit(s) will remain open on this PO.` : "This completes the PO."}</>} />
    </div>
  );
}

interface NoPoForm {
  type: StockVehicle["type"]; make: string; model: string; modelCode: string; year: string; colour: string;
  vin: string; engineNo: string; registration: string; odometer: string; branch: string; cost: string; retail: string; source: string;
}
const EMPTY_NOPO: NoPoForm = { type: "Used", make: "", model: "", modelCode: "", year: "", colour: "", vin: "", engineNo: "", registration: "", odometer: "", branch: "", cost: "", retail: "", source: "" };

function ReceiveWithoutPO({ prefill, tradeInDeal, onReceived }: { prefill?: NoPoForm; tradeInDeal?: string; onReceived?: (stockNo: string) => void } = {}) {
  const navigate = useNavigate();
  const { stock } = useSalesData();
  const [form, setForm] = useState<NoPoForm>(prefill ?? EMPTY_NOPO);
  const [errors, setErrors] = useState<Partial<Record<keyof NoPoForm, string>>>({});
  const [saved, setSaved] = useState<string | null>(null);

  const set = (k: keyof NoPoForm, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const pickModel = (code: string) => {
    const m = MODEL_CODES.find((x) => x.code === code);
    setForm((f) => ({ ...f, modelCode: code, make: m?.make ?? f.make, model: m?.model ?? f.model, year: m ? String(m.year) : f.year }));
    setErrors((e) => ({ ...e, make: undefined, model: undefined, year: undefined }));
  };

  const save = async () => {
    const e: Partial<Record<keyof NoPoForm, string>> = {};
    const vin = form.vin.trim().toUpperCase();
    const year = Number(form.year);
    if (!form.make.trim()) e.make = "Make is required";
    if (!form.model.trim()) e.model = "Model is required";
    if (!year || year < 1990 || year > new Date().getFullYear() + 1) e.year = "Enter a valid year";
    if (!form.colour) e.colour = "Select the colour";
    if (!VIN_RE.test(vin)) e.vin = "VIN must be 17 characters (no I, O or Q)";
    else if (stock.some((v) => v.vin === vin)) e.vin = "This VIN is already in stock";
    if (!form.engineNo.trim()) e.engineNo = "Engine number is required";
    if (!form.branch) e.branch = "Select the branch";
    if (!(Number(form.cost) > 0)) e.cost = "Enter the cost / trade-in value";
    if (!(Number(form.retail) > 0)) e.retail = "Enter the retail price";
    if (form.type !== "New" && !form.odometer) e.odometer = "Odometer is required for used and demo vehicles";
    setErrors(e);
    if (Object.keys(e).length) return;

    try {
      const r = unwrap(await receiveVehicle({
        supplier: form.source.trim() || undefined,
        vehicle: {
          vin,
          engineNo: form.engineNo.trim().toUpperCase(),
          make: form.make.trim(),
          model: form.model.trim(),
          modelCode: form.modelCode || "—",
          year,
          colour: form.colour,
          branch: form.branch,
          type: form.type,
          retail: Number(form.retail),
          cost: Number(form.cost),
          odometer: Number(form.odometer) || 0,
          registration: form.registration.trim().toUpperCase() || undefined,
        },
      }));
      salesStore.applyServer({ vehicle: r.vehicle, receipt: { stockNo: r.vehicle.stockNo, data: r.receipt } });
      setSaved(r.vehicle.stockNo);
      setForm(EMPTY_NOPO);
      onReceived?.(r.vehicle.stockNo);
      toast.success(`${r.vehicle.stockNo} added to stock`);
    } catch (err) {
      toast.error(evolveErrorMessage(err));
    }
  };

  return (
    <div className="space-y-5">
      {tradeInDeal && !saved && (
        <Notice tone="info" title={`Trade-in from ${tradeInDeal}`}>Make, model, year, registration and cost (the trade-in allowance) are filled in. Add the VIN, engine number, colour, odometer and retail price, then add it to stock.</Notice>
      )}
      {saved && (
        <Notice tone="success" title={`${saved} added to stock`}
          action={
            <div className="flex gap-2 flex-wrap">
              <SmallButton onClick={() => navigate(`${screenPath("stock", "vehicle-details")}?stock=${saved}`)}>View vehicle</SmallButton>
              <SmallButton variant="primary" onClick={() => navigate(withStock(screenPath("goods-receipt", "arrival-photos"), saved))}>Arrival photos</SmallButton>
            </div>
          }>
          Saved. Add another below or continue with the arrival steps.
        </Notice>
      )}
      <Card title="Vehicle" subtitle="For trade-ins, used purchases and demo units that do not come in on a purchase order.">
        <FormGrid cols={3}>
          <Field label="Vehicle type" required htmlFor="np-type"><SelectInput id="np-type" value={form.type} onChange={(e) => set("type", e.target.value)} options={["Used", "Demo", "New"]} /></Field>
          <Field label="Model code (optional)" htmlFor="np-mc"><SelectInput id="np-mc" value={form.modelCode} onChange={(e) => pickModel(e.target.value)} placeholder="Not in the model master" options={MODEL_CODES.map((m) => ({ value: m.code, label: `${m.code} — ${m.model}` }))} /></Field>
          <Field label="Source / supplier" htmlFor="np-src"><TextInput id="np-src" value={form.source} onChange={(e) => set("source", e.target.value)} placeholder="e.g. Trade-in, auction" /></Field>
          <Field label="Make" required error={errors.make} htmlFor="np-make"><TextInput id="np-make" value={form.make} onChange={(e) => set("make", e.target.value)} error={!!errors.make} /></Field>
          <Field label="Model" required error={errors.model} htmlFor="np-model"><TextInput id="np-model" value={form.model} onChange={(e) => set("model", e.target.value)} error={!!errors.model} /></Field>
          <Field label="Year" required error={errors.year} htmlFor="np-year"><TextInput id="np-year" type="number" value={form.year} onChange={(e) => set("year", e.target.value)} error={!!errors.year} className="no-spinner" onWheel={(e) => e.currentTarget.blur()} /></Field>
          <Field label="Colour" required error={errors.colour} htmlFor="np-col"><SelectInput id="np-col" value={form.colour} onChange={(e) => set("colour", e.target.value)} error={!!errors.colour} placeholder="Select colour" options={COLOURS} /></Field>
          <Field label="VIN" required error={errors.vin} htmlFor="np-vin"><TextInput id="np-vin" value={form.vin} onChange={(e) => set("vin", e.target.value)} error={!!errors.vin} placeholder="17-character VIN" className="font-mono uppercase" maxLength={17} /></Field>
          <Field label="Engine number" required error={errors.engineNo} htmlFor="np-eng"><TextInput id="np-eng" value={form.engineNo} onChange={(e) => set("engineNo", e.target.value)} error={!!errors.engineNo} className="font-mono uppercase" /></Field>
          <Field label="Registration" htmlFor="np-reg"><TextInput id="np-reg" value={form.registration} onChange={(e) => set("registration", e.target.value)} placeholder="If registered" className="uppercase" /></Field>
          <Field label="Odometer (km)" required={form.type !== "New"} error={errors.odometer} htmlFor="np-odo"><TextInput id="np-odo" type="number" min={0} value={form.odometer} onChange={(e) => set("odometer", e.target.value)} error={!!errors.odometer} className="no-spinner" onWheel={(e) => e.currentTarget.blur()} /></Field>
          <Field label="Branch" required error={errors.branch} htmlFor="np-branch"><SelectInput id="np-branch" value={form.branch} onChange={(e) => set("branch", e.target.value)} error={!!errors.branch} placeholder="Select branch" options={[...BRANCHES]} /></Field>
          <Field label="Cost / trade-in value" required error={errors.cost} htmlFor="np-cost"><TextInput id="np-cost" type="number" min={0} value={form.cost} onChange={(e) => set("cost", e.target.value)} error={!!errors.cost} className="no-spinner" onWheel={(e) => e.currentTarget.blur()} /></Field>
          <Field label="Retail price" required error={errors.retail} htmlFor="np-retail"><TextInput id="np-retail" type="number" min={0} value={form.retail} onChange={(e) => set("retail", e.target.value)} error={!!errors.retail} className="no-spinner" onWheel={(e) => e.currentTarget.blur()} /></Field>
        </FormGrid>
        <div className="flex justify-end gap-2 mt-4 flex-wrap">
          <SecondaryButton onClick={() => { setForm(EMPTY_NOPO); setErrors({}); }}>Clear</SecondaryButton>
          <PrimaryButton icon={PackageCheck} onClick={save}>Add to stock</PrimaryButton>
        </div>
      </Card>
    </div>
  );
}

// ── Arrival Photos & Scans ───────────────────────────────────────────────────
// Same capture as Gate Entry: live camera only, every frame geo/time-stamped.
// Capturing a scan photo runs its AI read on the raw frame straight away and
// fills the field (odometer) or checks it (VIN).
const VIEW_SLOTS: { slot: string; required?: boolean }[] = [
  { slot: "Front View", required: true }, { slot: "Rear View", required: true }, { slot: "Left View" },
  { slot: "Right View" }, { slot: "Dashboard View" }, { slot: "Engine View" },
];

type ScanKey = "odometer" | "vin";
// The photo slot each scan stores its frame in (kept as evidence).
const SCAN_SLOT: Record<ScanKey, string> = { odometer: "Odometer", vin: "VIN" };
const SCAN_HINT: Record<ScanKey, string> = {
  odometer: "capture the instrument cluster with the ignition on",
  vin: "capture the VIN plate / windscreen sticker",
};
const SCAN_SUBJECT: Record<ScanKey, string> = { odometer: "odometer", vin: "VIN" };

function scanReasonText(reason: string | null | undefined, subject: string): string {
  switch (reason) {
    case "NO_ODOMETER": return "No odometer reading found in that photo.";
    case "NO_VIN": return "No VIN found in that photo.";
    case "INVALID_VIN": return "That is not a valid 17-character VIN — retake it.";
    case "IMAGE_TOO_BLURRY": return "The photo is too blurry — retake it.";
    case "IMAGE_TOO_DARK": return "The photo is too dark — retake it.";
    case "NOT_READABLE": return `The ${subject} could not be read clearly — retake it.`;
    case "IMPLAUSIBLE_VALUE": return "That odometer value looks wrong — retake it or type it.";
    case "LOW_CONFIDENCE": return `Not confident enough reading the ${subject} — retake it or type it.`;
    case "IMAGE_TOO_LARGE": return "That photo is too large to scan.";
    case "UNSUPPORTED_FORMAT": return "That image format is not supported.";
    default: return `Could not scan the ${subject} — retake it or type it.`;
  }
}

const apiError = (e: unknown, fallback: string) => {
  const err = e as { response?: { status?: number; data?: { message?: string; error?: { message?: string } } } };
  if (err?.response?.status === 403) return "Your role needs Goods Receipt › Edit to capture arrival photos.";
  return err?.response?.data?.error?.message ?? err?.response?.data?.message ?? fallback;
};
const asPhoto = (v: ReceiptPhoto | string | undefined): ReceiptPhoto | null => (v && typeof v === "object" ? v : null);
const asScan = (v: ScanResult | boolean | undefined): ScanResult | null => (v && typeof v === "object" ? v : null);
const fmtStamp = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

// Runs the AI read for `key` on the raw (un-stamped) frame.
async function runAiScan(key: ScanKey, file: File): Promise<{ value?: string; error?: string }> {
  if (key === "odometer") {
    const d = (await scanOdometer(file)).data;
    return d?.odometer != null && !d.reason ? { value: String(d.odometer) } : { error: scanReasonText(d?.reason, "odometer") };
  }
  const d = (await scanVin(file)).data;
  return d?.vin && !d.reason ? { value: d.vin } : { error: scanReasonText(d?.reason, "VIN") };
}

export function ArrivalPhotos() {
  const navigate = useNavigate();
  const { stock, vehicle, select } = useSelectedVehicle();
  const [receipts, patchReceipt] = useReceipts();
  const [cameraSlot, setCameraSlot] = useState<string | null>(null);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [scanning, setScanning] = useState<Partial<Record<ScanKey, boolean>>>({});
  const [scanErrors, setScanErrors] = useState<Partial<Record<ScanKey, string>>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  // A retake bumps the slot's id; an older upload/scan finishing later is dropped.
  const captureIds = useRef<Record<string, number>>({});

  if (!vehicle) return <NoVehicles />;
  const stockNo = vehicle.stockNo;
  const meta = receipts[stockNo];
  const photos = meta?.photos ?? {};
  const scans = meta?.scans ?? {};
  const viewsCaptured = VIEW_SLOTS.filter((v) => asPhoto(photos[v.slot])).length;
  const latest = Object.values(photos).map(asPhoto).filter((p): p is ReceiptPhoto => !!p)
    .sort((a, b) => (a.capturedAt ?? "").localeCompare(b.capturedAt ?? "")).pop();
  const vinScan = asScan(scans.vin);
  const vinMatches = vinScan ? vinScan.value === vehicle.vin.toUpperCase() : null;

  const setStock = (p: Partial<StockVehicle>) => salesStore.update("stock", (x) => x.stockNo === stockNo, p);
  const clearError = (k: string) => setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  const scanKeyForSlot = (slot: string) => (Object.keys(SCAN_SLOT) as ScanKey[]).find((k) => SCAN_SLOT[k] === slot);

  const handleCapture = async (slot: string, file: File, shot: CapturedPhoto, rawFile?: File) => {
    setCameraSlot(null);
    const id = (captureIds.current[slot] ?? 0) + 1;
    captureIds.current[slot] = id;
    const current = () => captureIds.current[slot] === id;
    const key = scanKeyForSlot(slot);
    clearError(key ?? slot);

    // AI read on the raw frame, in parallel with the photo upload.
    if (key) {
      setScanning((x) => ({ ...x, [key]: true }));
      setScanErrors((x) => ({ ...x, [key]: undefined }));
      void (async () => {
        let out: { value?: string; error?: string };
        try {
          out = await runAiScan(key, rawFile ?? file);
        } catch (e) {
          out = { error: apiError(e, `Could not scan the ${SCAN_SUBJECT[key]} — retake it or type it.`) };
        }
        if (!current()) return;
        setScanning((x) => ({ ...x, [key]: false }));
        if (!out.value) { setScanErrors((x) => ({ ...x, [key]: out.error })); return; }
        if (key === "odometer") setStock({ odometer: Number(out.value) });
        patchReceipt(stockNo, (m) => ({ scans: { ...(m.scans ?? {}), [key]: { value: out.value!, at: new Date().toISOString() } } }));
      })();
    }

    setUploading((x) => ({ ...x, [slot]: true }));
    try {
      const res = await uploadReceiptPhoto(stockNo, slot, file, shot);
      if (!current()) return;
      const photo = res.data?.photo;
      if (photo) patchReceipt(stockNo, (m) => ({ photos: { ...(m.photos ?? {}), [slot]: photo } }));
    } catch (e) {
      if (current()) toast.error(apiError(e, `${slot} photo could not be saved — retake it.`));
    } finally {
      if (current()) setUploading((x) => ({ ...x, [slot]: false }));
    }
  };

  const proceed = () => {
    const e: Record<string, string> = {};
    if (!(vehicle.odometer > 0)) e.odometer = "Scan or enter the odometer reading";
    for (const v of VIEW_SLOTS) if (v.required && !asPhoto(photos[v.slot])) e[v.slot] = `${v.slot} is required`;
    setErrors(e);
    if (Object.keys(e).length) { toast.error("Complete the required fields and photos"); return; }
    navigate(withStock(screenPath("goods-receipt", "arrival-quality-check"), stockNo));
  };

  // Scan button + thumbnail of the frame it read, beside a field.
  const scanControl = (key: ScanKey) => {
    const ph = asPhoto(photos[SCAN_SLOT[key]]);
    return (
      <div className="flex items-center gap-2 shrink-0">
        {ph?.url && <img src={ph.url} alt={`${SCAN_SLOT[key]} scan photo`} className="w-10 h-10 rounded object-cover border border-[#e5e7eb]" />}
        <SmallButton icon={scanning[key] ? undefined : ScanLine} disabled={!!scanning[key] || !!uploading[SCAN_SLOT[key]]} onClick={() => setCameraSlot(SCAN_SLOT[key])}>
          {scanning[key] ? "Scanning…" : ph ? "Rescan" : "AI scan"}
        </SmallButton>
      </div>
    );
  };
  const scanNote = (key: ScanKey) => scanErrors[key] && <p className="mt-1 text-[11px] text-red-600">{scanErrors[key]}</p>;

  const cameraKey = cameraSlot ? scanKeyForSlot(cameraSlot) : undefined;

  return (
    <>
      <PageHeader />
      <VehiclePicker stock={stock} value={stockNo} onChange={select} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-5">
          <Card title="Vehicle details" icon={ScanLine} subtitle="Capture a photo to AI-scan — or type the value">
            <FormGrid cols={1}>
              <Field label="Odometer Reading (KM)" required error={errors.odometer}>
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <TextInput inputMode="numeric" value={vehicle.odometer ? String(vehicle.odometer) : ""} error={!!errors.odometer} placeholder="e.g. 12"
                      onChange={(ev) => { clearError("odometer"); setStock({ odometer: Number(ev.target.value.replace(/\D/g, "").slice(0, 7)) || 0 }); }} />
                    {scanNote("odometer")}
                  </div>
                  {scanControl("odometer")}
                </div>
              </Field>
              <Field label="VIN">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <TextInput value={vehicle.vin} readOnly className="font-mono bg-[#fafafa]" />
                    {vinScan && !scanning.vin && (vinMatches
                      ? <p className="mt-1 text-[11px] text-green-700 flex items-center gap-1"><CircleCheck size={11} /> Scanned VIN matches the stock record</p>
                      : <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1"><TriangleAlert size={11} /> Scanned VIN <span className="font-mono">{vinScan.value}</span> does not match the stock record</p>)}
                    {scanNote("vin")}
                  </div>
                  {scanControl("vin")}
                </div>
              </Field>
            </FormGrid>
          </Card>

          <Card title="Vehicle photos" subtitle={`${viewsCaptured} of ${VIEW_SLOTS.length} captured · tap a view to open the camera / retake`}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {VIEW_SLOTS.map(({ slot, required }) => {
                const ph = asPhoto(photos[slot]);
                return (
                  <div key={slot}>
                    <PhotoSlot label={required ? `${slot} *` : slot} captured={!!ph} imageUrl={ph?.url} busy={!!uploading[slot]}
                      meta={ph ? fmtStamp(ph.capturedAt) : undefined} onCapture={() => setCameraSlot(slot)} />
                    {errors[slot] && <p className="mt-1 text-[11px] text-red-600">{errors[slot]}</p>}
                  </div>
                );
              })}
            </div>
            <div className="mt-4"><ProgressBar value={viewsCaptured} max={VIEW_SLOTS.length} label="Photos captured" /></div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Capture metadata" icon={MapPin}>
            <KeyValueGrid cols={2} items={[
              { label: "Vehicle", value: `${vehicle.make} ${vehicle.model}` },
              { label: "PO", value: meta?.poId ?? "No PO" },
              { label: "Branch", value: vehicle.branch },
              { label: "GPS", value: latest?.gpsLat != null && latest.gpsLng != null ? `${latest.gpsLat.toFixed(5)}, ${latest.gpsLng.toFixed(5)}` : "Not captured" },
              { label: "Last capture", value: latest ? <span className="flex items-center gap-1"><Clock size={12} /> {fmtStamp(latest.capturedAt)}</span> : "—" },
              ...(latest?.address ? [{ label: "Location", value: latest.address }] : []),
            ]} />
          </Card>
          <PrimaryButton className="w-full!" onClick={proceed}>Continue to quality check</PrimaryButton>
        </div>
      </div>

      <LiveCameraCapture
        isOpen={cameraSlot !== null}
        title={cameraKey ? `AI scan — ${SCAN_HINT[cameraKey]}` : `${cameraSlot ?? ""} photo`}
        onClose={() => setCameraSlot(null)}
        onCapture={(file, shot, raw) => { if (cameraSlot) void handleCapture(cameraSlot, file, shot, raw); }}
      />
    </>
  );
}

// ── Arrival Quality Check ────────────────────────────────────────────────────
const QC_CATEGORIES: { name: string; items: string[] }[] = [
  { name: "Exterior", items: ["Paintwork & panels", "Glass & mirrors", "Lights & indicators", "Wheels & tyres"] },
  { name: "Interior", items: ["Seats & trim", "Dashboard & infotainment", "Keys (2 sets)"] },
  { name: "Mechanical", items: ["Fluid levels", "Battery health", "Engine start / idle"] },
  { name: "Documents", items: ["Supplier invoice", "Certificate of conformity", "Owner's manual & service book"] },
];

export function ArrivalQualityCheck() {
  const { stock, vehicle, select } = useSelectedVehicle();
  const [receipts] = useReceipts();
  if (!vehicle) return <NoVehicles />;
  return (
    <>
      <VehiclePicker stock={stock} value={vehicle.stockNo} onChange={select} />
      {/* Keyed so the checklist re-initialises from the saved result per vehicle. */}
      <QualityChecklist key={vehicle.stockNo} vehicle={vehicle} meta={receipts[vehicle.stockNo]} />
    </>
  );
}

function QualityChecklist({ vehicle, meta }: { vehicle: StockVehicle; meta?: ReceiptMeta }) {
  const navigate = useNavigate();
  const [, patchReceipt] = useReceipts();
  const [ratings, setRatings] = useState<Record<string, Rating>>(meta?.qc?.ratings ?? {});
  const [notes, setNotes] = useState<Record<string, string>>(meta?.qc?.notes ?? {});
  const [signed, setSigned] = useState(false);
  const done = meta?.qc;
  const allItems = QC_CATEGORIES.flatMap((c) => c.items);
  const rated = allItems.filter((i) => ratings[i]).length;
  const fails = allItems.filter((i) => ratings[i] === "Fail").length;
  const conds = allItems.filter((i) => ratings[i] === "Conditional").length;
  const overall: Rating = fails ? "Fail" : conds ? "Conditional" : "Pass";

  const complete = () => {
    patchReceipt(vehicle.stockNo, {
      qc: { ratings, notes, overall, at: nowStamp() },
      ...(overall === "Fail" && !meta?.claim ? { claim: "Open" as const } : {}),
    });
    // A failed unit stays on the lot but is held out of sellable stock.
    if (overall === "Fail") salesStore.update("stock", (v) => v.stockNo === vehicle.stockNo, { status: "On Hold" });
    previewToast(`Receipt QC for ${vehicle.stockNo} completed — ${overall}`);
  };

  return (
    <>
      <PageHeader actions={<SmallButton disabled={!!done} onClick={() => setRatings(Object.fromEntries(allItems.map((i) => [i, "Pass" as Rating])))}>Mark all pass</SmallButton>} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-5">
          {QC_CATEGORIES.map((cat) => (
            <Card key={cat.name} title={cat.name} subtitle="New Vehicle Receipt checklist">
              <ul className="divide-y divide-[#f0f0f0]">
                {cat.items.map((item) => (
                  <li key={item} className="py-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <span className="text-[13px] text-[#333]">{item}</span>
                      <div className="flex gap-1" role="radiogroup" aria-label={item}>
                        {(["Pass", "Conditional", "Fail"] as Rating[]).map((r) => {
                          const active = ratings[item] === r;
                          const cls = r === "Pass" ? "bg-green-600 border-green-600" : r === "Conditional" ? "bg-amber-500 border-amber-500" : "bg-red-600 border-red-600";
                          return (
                            <button key={r} type="button" role="radio" aria-checked={active} disabled={!!done} onClick={() => setRatings((x) => ({ ...x, [item]: r }))}
                              className={`px-2.5 py-1 text-[11px] rounded-md border cursor-pointer disabled:cursor-default ${active ? `${cls} text-white` : "bg-white border-[#e5e7eb] text-[#666] hover:bg-[#f5f5f5]"}`}>{r}</button>
                          );
                        })}
                      </div>
                    </div>
                    {ratings[item] && ratings[item] !== "Pass" && (
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-2">
                        <TextInput aria-label={`${item} notes`} value={notes[item] ?? ""} disabled={!!done} onChange={(e) => setNotes((n) => ({ ...n, [item]: e.target.value }))} placeholder="Describe the issue" />
                        <PhotoSlot label="Photo" captured={!!notes[item]} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>

        <div className="space-y-5 lg:sticky lg:top-0">
          <Card title="Result">
            <KeyValueGrid cols={2} items={[
              { label: "Stock no.", value: vehicle.stockNo },
              { label: "VIN", value: <span className="font-mono text-[12px]">{vehicle.vin}</span> },
              { label: "PO", value: meta?.poId ?? "No PO" },
              { label: "Items rated", value: `${rated} / ${allItems.length}` },
              { label: "Overall", value: rated ? <StatusBadge status={overall} /> : "—" },
            ]} />
            <div className="mt-3"><ProgressBar value={rated} max={allItems.length} label="Checklist progress" /></div>
            {fails > 0 && !done && <Notice tone="danger" className="mt-3">A failed item raises a damage report and keeps the vehicle out of Evolve stock-in until resolved.</Notice>}
          </Card>
          {done ? (
            <Notice tone={done.overall === "Fail" ? "danger" : "success"} title={`QC ${done.overall} · ${done.at}`}
              action={<SmallButton variant="primary" onClick={() => navigate(withStock(screenPath("goods-receipt", done.overall === "Fail" ? "damage-report" : "send-to-evolve-stock"), vehicle.stockNo))}>{done.overall === "Fail" ? "Damage report" : "Send to stock"}</SmallButton>}>
              Result saved for {vehicle.stockNo}.
            </Notice>
          ) : (
            <>
              <Card title="Inspector signature">
                <SignaturePad onChange={(d) => setSigned(!!d)} />
              </Card>
              <PrimaryButton className="w-full!" icon={ShieldCheck} disabled={rated < allItems.length || !signed} onClick={complete}>Complete QC</PrimaryButton>
              {(rated < allItems.length || !signed) && <p className="text-[11px] text-[#999] text-center">Rate every item and sign to complete.</p>}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Damage Report ────────────────────────────────────────────────────────────
export function DamageReport() {
  const [receipts, patchReceipt] = useReceipts();
  const { stock, vehicle, select } = useSelectedVehicle((v) => receipts[v.stockNo]?.qc?.overall === "Fail");
  const [form, setForm] = useState({ category: "", severity: "Minor", description: "" });
  const [error, setError] = useState("");

  if (!vehicle) return <NoVehicles />;
  const meta = receipts[vehicle.stockNo];
  const defects = meta?.defects ?? [];
  const claimStatus = claimStatusOf(meta);
  const qcFailed = meta?.qc?.overall === "Fail";
  const setDefects = (next: Defect[]) => patchReceipt(vehicle.stockNo, { defects: next });

  const add = () => {
    if (!form.category || !form.description.trim()) { setError("Category and description are required"); return; }
    setDefects([...defects, { id: `d-${Date.now()}`, category: form.category, severity: form.severity as Defect["severity"], description: form.description.trim(), photos: 0 }]);
    setForm({ category: "", severity: "Minor", description: "" });
    setError("");
  };

  const history = [
    ...(meta?.qc ? [{ id: "qc", icon: meta.qc.overall === "Fail" ? TriangleAlert : CircleCheck, tone: meta.qc.overall === "Fail" ? "red" as const : "green" as const, title: `Receipt QC ${meta.qc.overall.toLowerCase()}`, meta: meta.qc.at }] : []),
    ...(defects.length ? [{ id: "def", icon: FileText, tone: "blue" as const, title: `${defects.length} defect(s) recorded`, meta: "Damage report" }] : []),
    ...(meta?.claimLog ?? (claimStatus !== "Open" ? [{ status: claimStatus, at: "" }] : [])).map((l, i) => ({
      id: `claim-${i}`, icon: Wrench, tone: l.status === "Settled" || l.status === "Paid" ? "green" as const : l.status === "Rejected" ? "red" as const : "amber" as const,
      title: `${meta?.claimType ?? "Damage"} claim: ${l.status.toLowerCase()}${l.note ? ` — ${l.note}` : ""}`, meta: l.at || "Supplier claim",
    })),
  ];

  return (
    <>
      <PageHeader />
      <VehiclePicker stock={stock} value={vehicle.stockNo} onChange={select} />
      {qcFailed
        ? <Notice tone="warning" className="mb-5" title="Vehicle held out of sellable stock">This unit failed receipt QC. It cannot be stocked in Evolve until the damage is repaired or the claim is settled.</Notice>
        : <Notice tone="info" className="mb-5">This vehicle has {meta?.qc ? `passed QC (${meta.qc.overall})` : "not been through receipt QC yet"}. You can still record damage found on arrival.</Notice>}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-5">
          <Card title="Vehicle & purchase order">
            <KeyValueGrid cols={3} items={[
              { label: "VIN", value: <span className="font-mono text-[12px]">{vehicle.vin}</span> },
              { label: "Model", value: `${vehicle.make} ${vehicle.model}` },
              { label: "Colour", value: vehicle.colour },
              { label: "PO", value: meta?.poId ?? "No PO" },
              { label: "Supplier", value: meta?.supplier ?? "—" },
              { label: "QC date", value: meta?.qc?.at ?? "Not inspected" },
            ]} />
          </Card>
          <Card title="Defects" subtitle={`${defects.length} recorded`}>
            {defects.length > 0 && (
              <DataTable paginate={false} rows={defects} rowKey={(d) => d.id} columns={[
                { key: "category", header: "Category", render: (d) => d.category },
                { key: "severity", header: "Severity", render: (d) => <Badge tone={d.severity === "Minor" ? "amber" : "red"}>{d.severity}</Badge> },
                { key: "description", header: "Description", className: "whitespace-normal min-w-[220px]", render: (d) => d.description },
                { key: "photos", header: "QC photos", render: (d) => <span className="flex items-center gap-1"><Camera size={12} />{d.photos}</span> },
                { key: "x", header: "", align: "right", render: (d) => <SmallButton variant="ghost" onClick={() => setDefects(defects.filter((x) => x.id !== d.id))}>Remove</SmallButton> },
              ]} />
            )}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-[160px_130px_1fr_auto] gap-2 items-end">
              <Field label="Category" required htmlFor="dm-cat"><SelectInput id="dm-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Select" options={["Paintwork", "Panel", "Glass", "Interior", "Mechanical", "Missing item"]} /></Field>
              <Field label="Severity" htmlFor="dm-sev"><SelectInput id="dm-sev" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} options={["Minor", "Major", "Critical"]} /></Field>
              <Field label="Description" required htmlFor="dm-desc"><TextInput id="dm-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What and where" /></Field>
              <SmallButton variant="primary" className="h-[42px]" onClick={add}>Add defect</SmallButton>
            </div>
            {error && <p className="text-[11px] text-[#FE2B73] mt-1" role="alert">{error}</p>}
          </Card>
          {defects.length > 0 && (
            <Card title="QC photos" subtitle="Tap to mark a photo as taken (simulated)">
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {defects.map((d) => (
                  <PhotoSlot key={d.id} label={d.category} captured={d.photos > 0}
                    onCapture={() => setDefects(defects.map((x) => (x.id === d.id ? { ...x, photos: x.photos > 0 ? 0 : 1 } : x)))} />
                ))}
              </div>
            </Card>
          )}
        </div>
        <div className="space-y-5">
          <SupplierClaimCard vehicle={vehicle} meta={meta} hasDefects={defects.length > 0} onChange={(p) => patchReceipt(vehicle.stockNo, p)} />
          <Card title="History">
            {history.length ? <Timeline items={history} /> : <p className="text-[13px] text-[#999]">No events yet.</p>}
          </Card>
        </div>
      </div>
    </>
  );
}

// ── Send to Evolve Stock ─────────────────────────────────────────────────────
type QcLabel = "Passed" | "Conditional" | "Failed" | "Not inspected";
const qcLabel = (m?: ReceiptMeta): QcLabel => (!m?.qc ? "Not inspected" : m.qc.overall === "Pass" ? "Passed" : m.qc.overall === "Fail" ? "Failed" : "Conditional");

export function SendToEvolveStock() {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const [receipts, patchReceipt] = useReceipts();
  const { stock, vehicle, select } = useSelectedVehicle();
  const [confirm, setConfirm] = useState(false);
  // Evolve codes 18 needs that TrueGear does not hold; FVP is the new-vehicle
  // purchase code seen on the Evolve samples — confirm per company.
  const [evolveCodes, setEvolveCodes] = useState({ category: "", purchaseTranCode: "FVP" });

  const meta = vehicle ? receipts[vehicle.stockNo] : undefined;
  const qc = qcLabel(meta);
  const claimSettled = meta?.claim === "Settled";
  const ready = qc === "Passed" || qc === "Conditional" || (qc === "Failed" && claimSettled);

  const checks = useMemo(() => [
    { label: "Receipt QC passed (or claim settled)", ok: ready },
    { label: "Supplier invoice captured", ok: !!meta?.supplierInvoice },
    { label: "Cost captured", ok: (vehicle?.cost ?? 0) > 0 },
    { label: "Model code captured (Evolve 28)", ok: !!vehicle && !!vehicle.modelCode && vehicle.modelCode !== "—" },
  ], [ready, meta, vehicle]);

  if (!vehicle) return <NoVehicles />;
  const category = evolveCodes.category || MODEL_CODES.find((m) => m.code === vehicle.modelCode)?.category || "";
  const buildStock = (): EvolveStockUnit | string => {
    if (!ready) return "Finish the receipt QC (or settle the claim) before stocking.";
    if (!meta?.supplierInvoice) return "Capture the supplier invoice number on Receive Vehicle first.";
    if (!category || !evolveCodes.purchaseTranCode) return "Enter the Evolve category and purchase transaction code.";
    return {
      vin: vehicle.vin,
      engineNo: vehicle.engineNo,
      category,
      franchiseCode: vehicle.make.toUpperCase(),
      year: vehicle.year,
      modelCode: vehicle.modelCode,
      purchaseTranCode: evolveCodes.purchaseTranCode,
      dateStocked: meta.receivedOn,
      colour: vehicle.colour,
      location: vehicle.branch,
      odometer: vehicle.odometer,
      vendorInvoice: meta.supplierInvoice,
      vendorInvoiceDate: meta.receivedOn,
      totalPurchaseInvoice: vehicle.cost,
      supplierName: meta.supplier ?? "",
      comments: `TrueGear ${vehicle.stockNo}${meta.poId ? ` · ${meta.poId}` : ""}`,
    };
  };
  const status = (v: StockVehicle) => receipts[v.stockNo]?.evolve ?? "Not sent";
  const pending = stock.filter((v) => status(v) === "Not sent");

  return (
    <>
      <PageHeader />
      <PendingUatNotice api="18 VehicleStockMaintenance" workaround="Staff add the vehicle to stock in Evolve by hand. TrueGear then picks it up via 06 GetAllStockedVehicles and confirms the VehStockNo." />
      <KpiGrid>
        <KpiCard label="QC done, awaiting stock-in" value={pending.filter((v) => ["Passed", "Conditional"].includes(qcLabel(receipts[v.stockNo]))).length} icon={PackageCheck} />
        <KpiCard label="Stocked in Evolve" value={stock.length - pending.length} icon={CircleCheck} />
        <KpiCard label="Blocked by QC" value={stock.filter((v) => qcLabel(receipts[v.stockNo]) === "Failed" && receipts[v.stockNo]?.claim !== "Settled").length} icon={TriangleAlert} />
        <KpiCard label="Cost awaiting stock-in" value={formatCurrency(pending.reduce((n, v) => n + v.cost, 0))} icon={FileText} />
      </KpiGrid>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <Card className="lg:col-span-2" title="Received units">
          <DataTable paginate={false} rows={stock} rowKey={(v) => v.stockNo} onRowClick={(v) => select(v.stockNo)} columns={[
            { key: "stockNo", header: "Stock no.", render: (v) => <span className={v.stockNo === vehicle.stockNo ? "text-[#ff4f31] font-semibold" : ""}>{v.stockNo}</span> },
            { key: "vin", header: "VIN", render: (v) => <span className="font-mono text-[12px]">{v.vin}</span> },
            { key: "model", header: "Model", render: (v) => v.model },
            { key: "qc", header: "QC", render: (v) => <StatusBadge status={qcLabel(receipts[v.stockNo])} /> },
            { key: "cost", header: "Cost", align: "right", render: (v) => formatCurrency(v.cost) },
            { key: "evolve", header: "Evolve stock", render: (v) => <div><StatusBadge status={status(v)} />{receipts[v.stockNo]?.evolveStockNo && <p className="text-[11px] text-[#999] mt-0.5">{receipts[v.stockNo]?.evolveStockNo}</p>}</div> },
          ]} />
        </Card>
        <Card title="Stock-in payload" subtitle={`${vehicle.stockNo} · ${vehicle.vin}`}>
          <KeyValueGrid cols={2} items={[
            { label: "Engine no.", value: vehicle.engineNo },
            { label: "Category", value: category || vehicle.type },
            { label: "Model code", value: vehicle.modelCode },
            { label: "Colour", value: vehicle.colour },
            { label: "Supplier", value: meta?.supplier ?? "—" },
            { label: "Vendor invoice", value: meta?.supplierInvoice ?? "—" },
            { label: "Cost", value: formatCurrency(vehicle.cost) },
            { label: "QC", value: <StatusBadge status={qc} /> },
          ]} />
          <p className="text-[12px] font-semibold text-[#333] mt-4 mb-2 flex items-center gap-1.5"><PlugZap size={14} className="text-amber-600" /> Integration readiness</p>
          <ul className="space-y-1.5">
            {checks.map((c) => (
              <li key={c.label} className="flex items-center gap-2 text-[12px]">
                {c.ok ? <CircleCheck size={14} className="text-green-600" /> : <TriangleAlert size={14} className="text-amber-600" />}
                <span className={c.ok ? "text-[#555]" : "text-amber-700"}>{c.label}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            {meta?.evolve === "Sent to Evolve" ? (
              <Badge tone="green"><CircleCheck size={12} /> In Evolve stock{meta.evolveStockNo ? ` — ${meta.evolveStockNo}` : ""}</Badge>
            ) : meta?.evolve === "Manual in Evolve" ? (
              <Badge tone="green"><CircleCheck size={12} /> Entered manually — awaiting 06 confirmation</Badge>
            ) : ready ? (
              <div className="space-y-3">
                <FormGrid>
                  <Field label="Evolve category" htmlFor="ste-cat">
                    <TextInput id="ste-cat" value={evolveCodes.category} placeholder={category || "e.g. NEW"} onChange={(e) => setEvolveCodes((c) => ({ ...c, category: e.target.value.toUpperCase() }))} />
                  </Field>
                  <Field label="Purchase code" htmlFor="ste-ptc">
                    <TextInput id="ste-ptc" value={evolveCodes.purchaseTranCode} onChange={(e) => setEvolveCodes((c) => ({ ...c, purchaseTranCode: e.target.value.toUpperCase() }))} />
                  </Field>
                </FormGrid>
                <EvolveWriteActions label="Send to Evolve stock (18)" build={buildStock} send={sendEvolveStock}
                  onSent={(r) => { patchReceipt(vehicle.stockNo, { evolve: "Sent to Evolve", evolveStockNo: r.vehicleStockNo }); previewToast(`${vehicle.stockNo} stocked in Evolve as ${r.vehicleStockNo || "a new unit"}`); }} />
                <SmallButton className="w-full" onClick={() => setConfirm(true)}>Mark entered manually in Evolve</SmallButton>
              </div>
            ) : qc === "Not inspected" ? (
              <Notice tone="warning" action={<SmallButton onClick={() => navigate(withStock(screenPath("goods-receipt", "arrival-quality-check"), vehicle.stockNo))}>Run QC</SmallButton>}>Complete the receipt QC first.</Notice>
            ) : (
              <Notice tone="danger">QC failed — resolve the damage report before stocking.</Notice>
            )}
          </div>
        </Card>
      </div>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} title="Mark as stocked in Evolve" confirmLabel="Mark entered"
        onConfirm={() => { patchReceipt(vehicle.stockNo, { evolve: "Manual in Evolve" }); setConfirm(false); previewToast(`${vehicle.stockNo} marked as entered manually in Evolve`); }}
        message={<>Confirm VIN <span className="font-mono">{vehicle.vin}</span> has been added to stock in Evolve by hand. TrueGear does not create the Evolve stock record.</>} />
    </>
  );
}

// Damage / warranty claim with the supplier. Each step is one click and is
// logged; the estimate is locked once sent. Settling releases a held vehicle.
function SupplierClaimCard({ vehicle, meta, hasDefects, onChange }: {
  vehicle: StockVehicle; meta?: ReceiptMeta; hasDefects: boolean; onChange: (p: Partial<ReceiptMeta>) => void;
}) {
  const { formatCurrency } = useCurrency();
  const status = claimStatusOf(meta);
  const [approved, setApproved] = useState(meta?.claimEstimate ? String(meta.claimEstimate) : "");
  const [ref, setRef] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [paid, setPaid] = useState("");
  const [paidOn, setPaidOn] = useState(today());
  const [err, setErr] = useState("");
  const step = (next: ClaimStatus, extra: Partial<ReceiptMeta> = {}, note?: string) => {
    onChange({ ...extra, claim: next, claimLog: [...(meta?.claimLog ?? []), { status: next, at: nowStamp(), ...(note ? { note } : {}) }] });
    setErr("");
    previewToast(`${meta?.claimType ?? "Damage"} claim: ${next.toLowerCase()}`);
  };
  const money = (v?: number) => (v ? formatCurrency(v) : "—");
  const locked = status !== "Open" && status !== "Rejected";

  return (
    <Card title="Supplier claim" icon={Wrench}>
      <KeyValueGrid cols={2} items={[
        { label: "Claim reference", value: `CLM-${vehicle.stockNo}` },
        { label: "Supplier", value: meta?.supplier ?? "—" },
        { label: "Status", value: <StatusBadge status={status} /> },
        { label: "Supplier ref.", value: meta?.claimSupplierRef || "—" },
        { label: "Estimate", value: money(meta?.claimEstimate) },
        { label: "Approved", value: money(meta?.claimApproved) },
        { label: "Paid", value: meta?.claimPaid ? `${formatCurrency(meta.claimPaid)}${meta.claimPaidOn ? ` · ${fmtDate(meta.claimPaidOn)}` : ""}` : "—" },
      ]} />
      <FormGrid>
        <Field label="Claim type" htmlFor="dm-type">
          <SelectInput id="dm-type" value={meta?.claimType ?? "Damage"} disabled={locked} onChange={(e) => onChange({ claimType: e.target.value as "Damage" | "Warranty" })} options={["Damage", "Warranty"]} />
        </Field>
        <Field label="Estimated repair cost" htmlFor="dm-est">
          <TextInput id="dm-est" type="number" min={0} value={meta?.claimEstimate ?? ""} disabled={locked} onChange={(e) => onChange({ claimEstimate: Number(e.target.value) || undefined })} className="no-spinner" onWheel={(e) => e.currentTarget.blur()} />
        </Field>
      </FormGrid>

      <div className="mt-3 flex flex-col gap-2">
        {(status === "Open" || status === "Rejected") && (
          <SmallButton variant="primary" disabled={!hasDefects || !meta?.claimEstimate}
            onClick={() => step("Estimate sent", {}, status === "Rejected" ? "resent" : undefined)}>
            {status === "Rejected" ? "Resend estimate to supplier" : "Send estimate to supplier"}
          </SmallButton>
        )}
        {(status === "Open" || status === "Rejected") && (!hasDefects || !meta?.claimEstimate) && <p className="text-[11px] text-[#999]">Record at least one defect and the estimated cost first.</p>}

        {status === "Estimate sent" && (
          <div className="space-y-2">
            <FormGrid>
              <Field label="Approved amount" required htmlFor="dm-appr"><TextInput id="dm-appr" type="number" min={0} value={approved} onChange={(e) => setApproved(e.target.value)} className="no-spinner" /></Field>
              <Field label="Supplier reference" htmlFor="dm-ref"><TextInput id="dm-ref" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Their claim no." /></Field>
            </FormGrid>
            <SmallButton variant="primary" onClick={() => (Number(approved) > 0
              ? step("Supplier approved", { claimApproved: Number(approved), claimSupplierRef: ref.trim() || undefined }, formatCurrency(Number(approved)))
              : setErr("Enter the amount the supplier approved"))}>Supplier approved</SmallButton>
            <div className="flex gap-2">
              <TextInput value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="Reason, if the supplier rejected it" />
              <SmallButton variant="danger" onClick={() => (rejectNote.trim() ? step("Rejected", {}, rejectNote.trim()) : setErr("Enter why the supplier rejected the claim"))}>Rejected</SmallButton>
            </div>
          </div>
        )}

        {status === "Supplier approved" && (
          <div className="space-y-2">
            <FormGrid>
              <Field label="Amount paid" required htmlFor="dm-paid"><TextInput id="dm-paid" type="number" min={0} value={paid || String(meta?.claimApproved ?? "")} onChange={(e) => setPaid(e.target.value)} className="no-spinner" /></Field>
              <Field label="Paid on" required htmlFor="dm-paid-on"><TextInput id="dm-paid-on" type="date" max={today()} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} /></Field>
            </FormGrid>
            <SmallButton variant="primary" onClick={() => {
              const amount = Number(paid || meta?.claimApproved || 0);
              if (!(amount > 0) || !paidOn) return setErr("Enter the amount and date the supplier paid");
              step("Paid", { claimPaid: amount, claimPaidOn: paidOn }, formatCurrency(amount));
            }}>Supplier paid</SmallButton>
          </div>
        )}

        {status === "Paid" && (
          <SmallButton variant="primary" onClick={() => { step("Settled"); releaseHold(vehicle); }}>Mark claim settled</SmallButton>
        )}
        {status === "Settled" && <Badge tone="green"><CircleCheck size={12} /> Claim settled — vehicle can be stocked</Badge>}
        {err && <p className="text-[11px] text-[#FE2B73]" role="alert">{err}</p>}
      </div>
      <Notice tone="info" className="mt-3">The estimate and photos go to the supplier by email; TrueGear tracks each step of the claim.</Notice>
    </Card>
  );
}
