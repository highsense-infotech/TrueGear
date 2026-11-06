// Module 1 — Purchase Order. Purchase orders are saved on the TrueGear server
// (Phase 2): created, submitted and approved through /api/vehicle-sales, with
// the PO number assigned by the server. Evolve is used for the supplier master
// (35) and 23 VehicleStockOnOrderMaintenance (switched off until UAT passes).

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Eye, FileText, Clock, CircleCheck, Truck, Send, Check, X, History, ShoppingCart, PlugZap, Trash2, CloudDownload, CalendarClock,
} from "lucide-react";
import { EvolveWriteActions } from "../components/evolve";
import { VehicleCataloguePicker, type CatalogueChoice } from "../components/VehicleCataloguePicker";
import { useCatalogueMakes } from "../components/vehicleCatalogue";
import { evolveErrorMessage, unwrap } from "../components/evolveHooks";
import { getEvolveMasters, listEvolveSuppliers, sendEvolveOnOrder, type OnOrderUnit as EvolveOnOrderUnit } from "../../../api/vehicleSalesEvolve.api";
import Modal from "../../../components/common/Modal";
import { useCurrency } from "../../../context/CurrencyContext";
import {
  PageHeader, Card, KpiGrid, KpiCard, Toolbar, SearchInput, FilterSelect, FilterPills, DataTable, StatusBadge,
  SmallButton, PrimaryButton, SecondaryButton, Field, TextInput, SelectInput, TextArea, FormGrid, SummaryRows,
  ConfirmDialog, KeyValueGrid, Notice, PendingUatNotice, Timeline, EmptyState, Badge, type Column,
} from "../components/ui";
import { previewToast } from "../components/helpers";
import { screenPath } from "../registry";
import {
  SUPPLIERS, MODEL_CODES, COLOURS, BRANCHES, SALES_USERS, MANAGERS, fmtDate, poQty, poReceived, poTotal, poSummary, poEta,
  type PurchaseOrder, type StockVehicle,
} from "../data/mock";
import { SERVER_EXTRAS, salesStore, today, useSalesData, usePersistentState } from "../data/store";
import { createPurchaseOrder, decidePurchaseOrder, revisePoEta, submitPurchaseOrder } from "../../../api/vehicleSales.api";
import { useSalesAccess } from "../access";
import { BODY_KEYS, type BodyType } from "../data/store";
import toast from "react-hot-toast";

const fmtOpt = (iso: string) => (iso ? fmtDate(iso) : "—");

// A draft can only go for approval once every required field is filled in.
const draftComplete = (p: PurchaseOrder) =>
  !!(p.supplier && p.expected && p.lines.length > 0 && p.lines.every((l) => l.modelCode && l.colour && l.qty > 0)); // unit cost is optional

// Vehicle lines of a PO, used by the list modal, approval and Evolve screens.
function POLinesTable({ po, stock }: { po: PurchaseOrder; stock?: StockVehicle[] }) {
  const { formatCurrency } = useCurrency();
  const showReceived = !["Draft", "Approval", "Rejected"].includes(po.status);
  return (
    <div className="overflow-x-auto border border-[#f0f0f0] rounded-lg">
      <table className="w-full text-[12px]">
        <thead className="bg-[#fafafa] text-[#999] text-left">
          <tr>
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Vehicle</th>
            <th className="px-3 py-2 font-medium text-right">Qty</th>
            {showReceived && <th className="px-3 py-2 font-medium text-right">Received</th>}
            {stock && <th className="px-3 py-2 font-medium text-right">In stock now</th>}
            <th className="px-3 py-2 font-medium text-right">Unit cost</th>
            <th className="px-3 py-2 font-medium text-right">Line total</th>
          </tr>
        </thead>
        <tbody>
          {po.lines.map((l, i) => (
            <tr key={l.id} className="border-t border-[#f0f0f0]">
              <td className="px-3 py-2 text-[#999]">{i + 1}</td>
              <td className="px-3 py-2">
                <p className="text-[#333]">{l.model || "Model not set"}</p>
                <p className="text-[11px] text-[#999]">{l.modelCode || "—"} · {l.colour || "colour not set"}{l.spec ? ` · ${l.spec}` : ""}</p>
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{l.qty}</td>
              {showReceived && <td className="px-3 py-2 text-right tabular-nums">{l.received}/{l.qty}</td>}
              {stock && <td className="px-3 py-2 text-right tabular-nums">{stock.filter((v) => v.modelCode === l.modelCode && v.status === "In Stock").length}</td>}
              <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(l.unitCost)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(l.qty * l.unitCost)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-[#e5e7eb] font-semibold text-[#333]">
            <td className="px-3 py-2" colSpan={2}>Total</td>
            <td className="px-3 py-2 text-right tabular-nums">{poQty(po)}</td>
            {showReceived && <td className="px-3 py-2 text-right tabular-nums">{poReceived(po)}/{poQty(po)}</td>}
            {stock && <td />}
            <td />
            <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(poTotal(po))}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── Purchase Orders ──────────────────────────────────────────────────────────
type POFilter = "All" | "Draft" | "Approval" | "Ordered" | "Partially Received" | "Received" | "Rejected";

export function PurchaseOrders() {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const { purchaseOrders } = useSalesData();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<POFilter>("All");
  const [supplier, setSupplier] = useState("All suppliers");
  const [viewingId, setViewingId] = useState<string | null>(null);
  const viewing = purchaseOrders.find((p) => p.id === viewingId) ?? null;

  const rows = useMemo(
    () =>
      purchaseOrders.filter((p) => (status === "All" ? true : p.status === status))
        .filter((p) => (supplier === "All suppliers" ? true : p.supplier === supplier))
        .filter((p) => [p.id, ...p.lines.map((l) => `${l.model} ${l.modelCode}`), p.supplier, p.createdBy].join(" ").toLowerCase().includes(q.toLowerCase())),
    [purchaseOrders, q, status, supplier],
  );

  const count = (s: POFilter) => (s === "All" ? purchaseOrders.length : purchaseOrders.filter((p) => p.status === s).length);
  const openValue = purchaseOrders.filter((p) => p.status !== "Received" && p.status !== "Rejected").reduce((n, p) => n + poTotal(p), 0);

  const submitDraft = async (p: PurchaseOrder) => {
    try {
      const po = unwrap(await submitPurchaseOrder(p.id));
      salesStore.applyServer({ purchaseOrder: po });
      toast.success(`${p.id} submitted for approval`);
    } catch (err) {
      toast.error(evolveErrorMessage(err));
    }
  };

  const columns: Column<PurchaseOrder>[] = [
    { key: "id", header: "PO number", render: (p) => <span className="font-medium text-[#ff4f31]">{p.id}</span>, sortValue: (p) => p.id },
    { key: "supplier", header: "Supplier", render: (p) => p.supplier || "—", sortValue: (p) => p.supplier },
    {
      key: "model", header: "Vehicles", render: (p) => p.lines.length === 1
        ? <div><p className="text-[#333]">{p.lines[0].model}</p><p className="text-[11px] text-[#999]">{p.lines[0].modelCode} · {p.lines[0].colour || "colour not set"}</p></div>
        : <div><p className="text-[#333]">{p.lines.length} models</p><p className="text-[11px] text-[#999] max-w-60 truncate">{p.lines.map((l) => `${l.qty}× ${l.model}`).join(", ")}</p></div>,
    },
    { key: "qty", header: "Qty", align: "right", render: (p) => (p.status === "Partially Received" ? `${poReceived(p)}/${poQty(p)}` : poQty(p)), sortValue: (p) => poQty(p) },
    { key: "total", header: "Total agreed cost", align: "right", render: (p) => formatCurrency(poTotal(p)), sortValue: (p) => poTotal(p) },
    { key: "expected", header: "ETA", render: (p) => p.revisedEta
        ? <span><span className="text-amber-700">{fmtOpt(p.revisedEta)}</span><span className="block text-[11px] text-[#999] line-through">{fmtOpt(p.expected)}</span></span>
        : fmtOpt(p.expected), sortValue: (p) => poEta(p) },
    { key: "createdBy", header: "Created by", render: (p) => p.createdBy },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
    { key: "actions", header: "", align: "right", render: (p) => <SmallButton icon={Eye} onClick={(e) => { e.stopPropagation(); setViewingId(p.id); }}>View</SmallButton> },
  ];

  const newPo = <PrimaryButton icon={Plus} onClick={() => navigate(screenPath("purchase-order", "new-purchase-order"))}>New Purchase Order</PrimaryButton>;

  if (purchaseOrders.length === 0) {
    return (
      <>
        <PageHeader actions={newPo} />
        <EmptyState
          icon={FileText}
          title="No purchase orders yet"
          message="Create your first purchase order to start the buying → receiving → stock flow."
          action={<SmallButton variant="primary" icon={Plus} onClick={() => navigate(screenPath("purchase-order", "new-purchase-order"))}>New Purchase Order</SmallButton>}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader actions={newPo} />
      <KpiGrid>
        <KpiCard label="Open purchase orders" value={purchaseOrders.filter((p) => !["Received", "Rejected"].includes(p.status)).length} icon={FileText} />
        <KpiCard label="Awaiting approval" value={count("Approval")} hint="Needs Sales Manager" icon={Clock} />
        <KpiCard label="Units on order" value={purchaseOrders.filter((p) => ["Ordered", "Partially Received"].includes(p.status)).reduce((n, p) => n + poQty(p) - poReceived(p), 0)} icon={Truck} />
        <KpiCard label="Open order value" value={formatCurrency(openValue)} icon={ShoppingCart} />
      </KpiGrid>

      <Card>
        <FilterPills<POFilter>
          value={status}
          onChange={setStatus}
          options={(["All", "Draft", "Approval", "Ordered", "Partially Received", "Received", "Rejected"] as POFilter[]).map((k) => ({ key: k, label: k, count: count(k) }))}
        />
        <Toolbar>
          <SearchInput value={q} onChange={setQ} placeholder="Search PO number, model, supplier or creator" />
          <FilterSelect label="Supplier" value={supplier} onChange={setSupplier} options={["All suppliers", ...[...new Set(purchaseOrders.map((p) => p.supplier).filter(Boolean))].sort()]} className="md:w-64" />
        </Toolbar>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(p) => p.id}
          onRowClick={(p) => setViewingId(p.id)}
          empty={<EmptyState icon={FileText} title="No purchase orders match" message="Clear the search or choose another status." />}
        />
      </Card>

      <Modal isOpen={!!viewing} onClose={() => setViewingId(null)} title={viewing ? `Purchase Order ${viewing.id}` : ""} size="lg">
        {viewing && (
          <div className="space-y-4">
            <div className="flex items-center gap-2"><StatusBadge status={viewing.status} /><span className="text-[12px] text-[#999]">Created {fmtDate(viewing.created)} by {viewing.createdBy}</span></div>
            <KeyValueGrid
              cols={2}
              items={[
                { label: "Supplier", value: viewing.supplier || "—" },
                { label: "Receiving branch", value: viewing.branch || "—" },
                { label: "Quantity", value: `${poQty(viewing)} ordered · ${poReceived(viewing)} received` },
              ]}
            />
            <PoEtaPanel po={viewing} />
            <POLinesTable po={viewing} />
            {viewing.notes && <p className="text-[12px] text-[#666]"><span className="font-medium text-[#333]">Notes:</span> {viewing.notes}</p>}
            {viewing.status === "Draft" && !draftComplete(viewing) && (
              <Notice tone="warning">This draft is missing a supplier, expected date, or a line's colour or unit cost. Create a new PO with all fields to submit it for approval.</Notice>
            )}
            <div className="flex gap-2 flex-wrap pt-2">
              {viewing.status === "Draft" && <SmallButton variant="primary" icon={Send} disabled={!draftComplete(viewing)} onClick={() => submitDraft(viewing)}>Submit for approval</SmallButton>}
              {viewing.status === "Approval" && <SmallButton variant="primary" onClick={() => navigate(screenPath("purchase-order", "approve-purchase-order"))}>Go to approval</SmallButton>}
              {["Ordered", "Partially Received"].includes(viewing.status) && <SmallButton variant="primary" onClick={() => navigate(screenPath("goods-receipt", "receive-vehicle"))}>Receive vehicles</SmallButton>}
              {["Ordered", "Partially Received", "Received"].includes(viewing.status) && <SmallButton icon={Send} onClick={() => navigate(screenPath("purchase-order", "send-order-to-evolve"))}>Send order to Evolve</SmallButton>}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

// Original vs revised ETA. A supplier delay is recorded by an authorised user
// (PO › Approve) with a reason; the original stays. Customer promise = current
// ETA + the body-building days of the body type the unit will get.
function PoEtaPanel({ po }: { po: PurchaseOrder }) {
  const { can } = useSalesAccess();
  const data = useSalesData();
  const bodyTypes = (data.extra[BODY_KEYS.types] ?? []) as BodyType[];
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ date: "", reason: "" });
  const [errors, setErrors] = useState<{ date?: string; reason?: string }>({});
  const [saving, setSaving] = useState(false);
  const [bodyTypeId, setBodyTypeId] = useState("");
  const editable = ["Approval", "Ordered", "Partially Received"].includes(po.status) && can("purchase-order", "approve");
  const eta = poEta(po);
  const buildDays = bodyTypes.find((t) => t.id === bodyTypeId)?.buildDays ?? 0;
  const promise = eta ? new Date(new Date(eta).getTime() + buildDays * 86400000).toISOString().slice(0, 10) : "";
  const slip = po.revisedEta && po.expected ? Math.round((new Date(po.revisedEta).getTime() - new Date(po.expected).getTime()) / 86400000) : 0;

  const save = async () => {
    const e: typeof errors = {};
    if (!form.date) e.date = "Choose the new ETA";
    else if (form.date < today()) e.date = "Cannot be in the past";
    else if (form.date === eta) e.date = "That is already the current ETA";
    if (form.reason.trim().length < 3) e.reason = "Enter the reason for the delay";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const updated = unwrap(await revisePoEta(po.id, form.date, form.reason.trim()));
      if (updated) salesStore.applyServer({ purchaseOrder: updated });
      toast.success(`${po.id} ETA revised to ${fmtDate(form.date)}`);
      setOpen(false);
      setForm({ date: "", reason: "" });
    } catch (err) {
      toast.error(evolveErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-[#e5e7eb] rounded-lg p-3 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <KeyValueGrid cols={3} items={[
          { label: "Original ETA", value: fmtOpt(po.expected) },
          { label: "Revised ETA", value: po.revisedEta ? <span className="text-amber-700 font-medium">{fmtOpt(po.revisedEta)}{slip > 0 ? ` (+${slip} days)` : ""}</span> : "—" },
          { label: "Customer promise", value: promise ? fmtDate(promise) : "—" },
        ]} />
        {editable && !open && <SmallButton icon={CalendarClock} onClick={() => setOpen(true)}>Revise ETA</SmallButton>}
      </div>
      <Field label="Body building (for the customer promise)" hint={buildDays ? `ETA + ${buildDays} build days` : "No body building — promise = ETA"} htmlFor={`po-bt-${po.id}`}>
        <SelectInput id={`po-bt-${po.id}`} value={bodyTypeId} onChange={(e) => setBodyTypeId(e.target.value)} placeholder="No body building"
          options={bodyTypes.map((t) => ({ value: t.id, label: `${t.name} (${t.buildDays} days)` }))} />
      </Field>
      {open && (
        <div className="bg-[#fafafa] rounded-lg p-3 space-y-3">
          <FormGrid>
            <Field label="New ETA" required error={errors.date} htmlFor={`po-eta-${po.id}`}>
              <TextInput id={`po-eta-${po.id}`} type="date" min={today()} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} error={!!errors.date} />
            </Field>
            <Field label="Reason (supplier delay)" required error={errors.reason} htmlFor={`po-eta-r-${po.id}`}>
              <TextInput id={`po-eta-r-${po.id}`} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} error={!!errors.reason} placeholder="e.g. Shipping delayed at port" />
            </Field>
          </FormGrid>
          <div className="flex justify-end gap-2">
            <SecondaryButton onClick={() => { setOpen(false); setErrors({}); }}>Cancel</SecondaryButton>
            <PrimaryButton disabled={saving} onClick={save}>{saving ? "Saving…" : "Save revised ETA"}</PrimaryButton>
          </div>
        </div>
      )}
      {(po.etaHistory?.length ?? 0) > 0 && (
        <div>
          <p className="text-[12px] font-medium text-[#333] mb-1">ETA changes</p>
          <ul className="space-y-1">
            {[...(po.etaHistory ?? [])].reverse().map((h) => (
              <li key={h.at} className="text-[12px] text-[#555]">
                {fmtDate(h.from)} → <span className="font-medium text-[#333]">{fmtDate(h.to)}</span> · {h.reason}
                <span className="text-[#999]"> — {h.by}, {new Date(h.at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── New Purchase Order ───────────────────────────────────────────────────────
// One order to one supplier, with any number of vehicle lines (different
// models, colours or specs), each with its own quantity and unit cost.
interface POHeader {
  supplier: string;
  expected: string;
  branch: string;
  createdBy: string;
  notes: string;
}

// Make / series / model code come from the vehicle catalogue (same as Create
// Appointment's new-vehicle step; model codes from Evolve 28).
interface LineForm extends Partial<CatalogueChoice> {
  key: string;
  modelCode: string;
  colour: string;
  spec: string;
  qty: string;
  unitCost: string;
}

type LineErrors = Partial<Record<"modelCode" | "colour" | "qty" | "unitCost", string>>;

const EMPTY_HEADER: POHeader = { supplier: "", expected: "", branch: "", createdBy: MANAGERS[0]?.name ?? "", notes: "" };
let lineSeq = 0;
const newLine = (): LineForm => ({ key: `ln${++lineSeq}`, modelCode: "", colour: "", spec: "", qty: "1", unitCost: "" });

export function NewPurchaseOrder() {
  const navigate = useNavigate();
  const { formatCurrency, taxConfig } = useCurrency();
  const [header, setHeader] = useState<POHeader>(EMPTY_HEADER);
  const [lines, setLines] = useState<LineForm[]>(() => [newLine()]);
  const [errors, setErrors] = useState<Partial<Record<keyof POHeader | "lines", string>>>({});
  const [lineErrors, setLineErrors] = useState<Record<string, LineErrors>>({});
  const [submitted, setSubmitted] = useState<null | { mode: "draft" | "approval"; id: string }>(null);

  // Suppliers are Evolve AP accounts (35) only, loaded when the form opens.
  const [evolveSuppliers, setEvolveSuppliers] = useState<{ state: "idle" | "loading" | "done" | "error"; list: typeof SUPPLIERS; error?: string }>({ state: "loading", list: [] });
  const supplierOptions = evolveSuppliers.list;
  const loadEvolveSuppliers = () => {
    setEvolveSuppliers((s) => ({ ...s, state: "loading" }));
    listEvolveSuppliers()
      .then((res) => {
        const list = unwrap(res).filter((a) => !a.stopCredit).map((a) => ({ account: a.accountNumber, name: a.name, terms: a.terms ? `${a.terms} days` : "—" }));
        setEvolveSuppliers({ state: "done", list });
      })
      .catch((err) => setEvolveSuppliers({ state: "error", list: [], error: evolveErrorMessage(err) }));
  };
  useEffect(() => {
    let live = true;
    listEvolveSuppliers()
      .then((res) => {
        const list = unwrap(res).filter((a) => !a.stopCredit).map((a) => ({ account: a.accountNumber, name: a.name, terms: a.terms ? `${a.terms} days` : "—" }));
        if (live) setEvolveSuppliers({ state: "done", list });
      })
      .catch((err) => live && setEvolveSuppliers({ state: "error", list: [], error: evolveErrorMessage(err) }));
    return () => {
      live = false;
    };
  }, []);

  // Vehicle catalogue (Make → Series → Model code). If it can't be read, the
  // built-in model list is offered so a PO can still be raised.
  const catalogue = useCatalogueMakes();
  const useCatalogue = catalogue.makes !== null && catalogue.makes.length > 0;
  // Evolve exterior colours (07) as suggestions; any colour can still be typed.
  const [evolveColours, setEvolveColours] = useState<string[]>([]);
  useEffect(() => {
    let live = true;
    getEvolveMasters(["colours"])
      .then((res) => {
        const list = (res.data?.colours ?? [])
          .filter((c) => !c.fields.ColourType || c.fields.ColourType.toUpperCase() !== "INT")
          .map((c) => c.name || c.code)
          .filter(Boolean);
        if (live) setEvolveColours([...new Set(list)]);
      })
      .catch(() => {
        // Evolve unreachable (e.g. not on the whitelisted server) — typed colours only.
      });
    return () => {
      live = false;
    };
  }, []);
  const colourSuggestions = evolveColours.length ? evolveColours : COLOURS;
  const lineLabel = (l: LineForm) => (useCatalogue ? [l.make, l.model].filter(Boolean).join(" ") : MODEL_CODES.find((m) => m.code === l.modelCode)?.model ?? "");

  const supplier = supplierOptions.find((s) => s.account === header.supplier);
  const lineTotal = (l: LineForm) => (Number(l.qty) || 0) * (Number(l.unitCost) || 0);
  const units = lines.reduce((n, l) => n + (Number(l.qty) || 0), 0);
  const subtotal = lines.reduce((n, l) => n + lineTotal(l), 0);
  const vat = subtotal * (taxConfig.percentage / 100);

  const setH = <K extends keyof POHeader>(k: K, v: POHeader[K]) => {
    setHeader((h) => ({ ...h, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const setL = (key: string, k: keyof LineErrors | "spec", v: string) => {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, [k]: v } : l)));
    setLineErrors((le) => ({ ...le, [key]: { ...le[key], [k]: undefined } }));
    if (errors.lines) setErrors((e) => ({ ...e, lines: undefined }));
  };
  const setCatalogue = (key: string, v: Partial<CatalogueChoice>) => {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...v, modelCode: v.modelCode ?? "" } : l)));
    setLineErrors((le) => ({ ...le, [key]: { ...le[key], modelCode: undefined } }));
    if (errors.lines) setErrors((e) => ({ ...e, lines: undefined }));
  };
  const removeLine = (key: string) => setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.key !== key) : ls));

  const validate = () => {
    const e: Partial<Record<keyof POHeader | "lines", string>> = {};
    if (!header.supplier) e.supplier = "Select a supplier";
    if (!header.expected) e.expected = "Choose an expected delivery date";
    else if (header.expected < today()) e.expected = "Expected date cannot be in the past";
    if (!header.branch) e.branch = "Select the receiving branch";
    if (!header.createdBy) e.createdBy = "Select who is requesting the order";
    const le: Record<string, LineErrors> = {};
    const seen = new Set<string>();
    for (const l of lines) {
      const x: LineErrors = {};
      const qty = Number(l.qty) || 0;
      if (!l.modelCode) x.modelCode = "Select a model code";
      if (!l.colour) x.colour = "Select a colour";
      if (!qty || qty < 1) x.qty = "At least 1";
      // Optional — only a value that was typed has to be a valid amount.
      if (l.unitCost.trim() !== "" && !(Number(l.unitCost) >= 0)) x.unitCost = "Enter a valid amount";
      const combo = `${l.modelCode}|${l.colour.trim().toLowerCase()}|${l.spec.trim().toLowerCase()}`;
      if (l.modelCode && l.colour && seen.has(combo)) x.colour = "Same model and colour as another line — increase that line's quantity instead";
      seen.add(combo);
      if (Object.keys(x).length) le[l.key] = x;
    }
    if (units > 50) e.lines = "More than 50 units needs a fleet PO";
    setErrors(e);
    setLineErrors(le);
    return Object.keys(e).length === 0 && Object.keys(le).length === 0;
  };

  const [saving, setSaving] = useState(false);
  const submit = async (mode: "draft" | "approval") => {
    if (mode === "approval" && !validate()) return;
    const filled = lines.filter((l) => l.modelCode);
    if (filled.length === 0) {
      setErrors({ lines: "Pick at least one model to save a draft" });
      return;
    }
    if (!supplier) {
      setErrors({ supplier: "Select a supplier" });
      return;
    }
    setSaving(true);
    let id: string;
    try {
      // The server assigns the PO number.
      const po = unwrap(await createPurchaseOrder({
        supplier: supplier.name,
        supplierAccount: supplier.account,
        branch: header.branch || undefined,
        lines: filled.map((l) => {
          const base = { colour: l.colour.trim(), spec: l.spec.trim() || undefined, qty: Math.max(1, Number(l.qty) || 1), unitCost: Number(l.unitCost) || 0 };
          if (useCatalogue) {
            return { ...base, make: l.make, series: l.series, modelCode: l.modelCode, model: l.model || l.series || l.modelCode, modelYear: l.year };
          }
          const model = MODEL_CODES.find((m) => m.code === l.modelCode)!;
          return { ...base, make: model.make, modelCode: model.code, model: model.model, modelYear: model.year };
        }),
        expected: header.expected || undefined,
        requestedBy: header.createdBy || "Unknown",
        notes: header.notes.trim() || undefined,
        status: mode === "draft" ? "Draft" : "Approval",
      }));
      salesStore.applyServer({ purchaseOrder: po });
      id = po.id;
    } catch (err) {
      toast.error(evolveErrorMessage(err));
      return;
    } finally {
      setSaving(false);
    }
    setSubmitted({ mode, id });
    toast.success(mode === "draft" ? `Draft purchase order ${id} saved` : `Purchase order ${id} submitted for approval`);
  };

  const reset = () => { setHeader(EMPTY_HEADER); setLines([newLine()]); setErrors({}); setLineErrors({}); setSubmitted(null); };

  if (submitted) {
    return (
      <>
        <PageHeader />
        <Card>
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3"><CircleCheck className="w-7 h-7 text-green-600" /></div>
            <p className="text-[16px] font-semibold text-[#333]">{submitted.mode === "draft" ? "Draft saved" : "Sent for approval"}</p>
            <p className="text-[13px] text-[#666] mt-1 max-w-md mx-auto">
              <span className="font-medium">{submitted.id}</span> was created with status “{submitted.mode === "draft" ? "Draft" : "Approval"}”. It is saved on the server.
            </p>
            <div className="flex justify-center gap-2 mt-5 flex-wrap">
              <SecondaryButton onClick={reset}>Create another</SecondaryButton>
              {submitted.mode === "approval" && <SecondaryButton onClick={() => navigate(screenPath("purchase-order", "approve-purchase-order"))}>Go to approval</SecondaryButton>}
              <PrimaryButton onClick={() => navigate(screenPath("purchase-order", "purchase-orders"))}>Back to purchase orders</PrimaryButton>
            </div>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-5">
          <Card
            title="Order & supplier"
            actions={evolveSuppliers.state === "error" ? <SmallButton icon={CloudDownload} onClick={loadEvolveSuppliers}>Retry</SmallButton> : undefined}
          >
            {evolveSuppliers.state === "error" && <Notice tone="danger" className="mb-4">Evolve suppliers could not be loaded: {evolveSuppliers.error}</Notice>}
            <FormGrid>
              <Field label="Supplier" required error={errors.supplier} htmlFor="po-supplier">
                <SelectInput id="po-supplier" value={header.supplier} onChange={(e) => setH("supplier", e.target.value)} error={!!errors.supplier}
                  disabled={evolveSuppliers.state !== "done"}
                  placeholder={evolveSuppliers.state === "loading" ? "Loading Evolve suppliers…" : evolveSuppliers.state === "error" ? "Evolve suppliers unavailable" : "Select supplier"}
                  options={supplierOptions.map((s) => ({ value: s.account, label: `${s.account} — ${s.name}` }))} />
              </Field>
              <Field label="Receiving branch" required error={errors.branch} htmlFor="po-branch">
                <SelectInput id="po-branch" value={header.branch} onChange={(e) => setH("branch", e.target.value)} error={!!errors.branch} placeholder="Select branch" options={[...BRANCHES]} />
              </Field>
              <Field label="Expected delivery date" required error={errors.expected} htmlFor="po-date">
                <TextInput id="po-date" type="date" value={header.expected} onChange={(e) => setH("expected", e.target.value)} error={!!errors.expected} />
              </Field>
              <Field label="Payment terms" htmlFor="po-terms"><TextInput id="po-terms" value={supplier?.terms ?? ""} placeholder="From supplier account" disabled /></Field>
              <Field label="Requested by" required error={errors.createdBy} htmlFor="po-by">
                <SelectInput id="po-by" value={header.createdBy} onChange={(e) => setH("createdBy", e.target.value)} error={!!errors.createdBy} placeholder="Select user" options={SALES_USERS.map((u) => ({ value: u.name, label: `${u.name} (${u.role})` }))} />
              </Field>
              <Field label="Notes" className="md:col-span-2" htmlFor="po-notes"><TextArea id="po-notes" value={header.notes} onChange={(e) => setH("notes", e.target.value)} placeholder="Internal notes for the approver" /></Field>
            </FormGrid>
          </Card>

          <Card
            title="Vehicles on this order"
          >
            {errors.lines && <Notice tone="warning" className="mb-4">{errors.lines}</Notice>}
            {catalogue.makes === null && <p className="text-[12px] text-[#999] mb-3">Loading the vehicle catalogue…</p>}
            {catalogue.makes !== null && !useCatalogue && (
              <Notice tone="warning" className="mb-4">The vehicle catalogue could not be loaded{catalogue.failed ? "" : " (no makes found)"}, so the built-in model list is shown.</Notice>
            )}
            <datalist id="po-colour-list">{colourSuggestions.map((c) => <option key={c} value={c} />)}</datalist>
            <div className="space-y-4">
              {lines.map((l, i) => {
                const label = lineLabel(l);
                const le = lineErrors[l.key] ?? {};
                return (
                  <div key={l.key} className="border border-[#f0f0f0] rounded-lg p-3 sm:p-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <p className="text-[13px] font-semibold text-[#333]">Line {i + 1}{label ? ` — ${label}` : ""}{l.year ? ` (${l.year})` : ""}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-[12px] text-[#666] tabular-nums">{formatCurrency(lineTotal(l))}</span>
                        {lines.length > 1 && <SmallButton variant="danger" icon={Trash2} onClick={() => removeLine(l.key)} aria-label={`Remove line ${i + 1}`}>Remove</SmallButton>}
                      </div>
                    </div>
                    <FormGrid>
                      {useCatalogue ? (
                        <VehicleCataloguePicker idPrefix={`po-${l.key}`} makes={catalogue.makes ?? []} value={l} onChange={(v) => setCatalogue(l.key, v)} error={le.modelCode} />
                      ) : (
                        <Field label="Model code" required error={le.modelCode} htmlFor={`po-model-${l.key}`}>
                          <SelectInput id={`po-model-${l.key}`} value={l.modelCode} onChange={(e) => setL(l.key, "modelCode", e.target.value)} error={!!le.modelCode} placeholder="Select model code" options={MODEL_CODES.map((m) => ({ value: m.code, label: `${m.code} — ${m.model}` }))} />
                        </Field>
                      )}
                      <Field label="Colour" required error={le.colour} hint={evolveColours.length ? "Evolve colours suggested — or type one" : undefined} htmlFor={`po-colour-${l.key}`}>
                        <TextInput id={`po-colour-${l.key}`} list="po-colour-list" value={l.colour} onChange={(e) => setL(l.key, "colour", e.target.value)} error={!!le.colour} placeholder="Select or type the colour" />
                      </Field>
                      <Field label="Quantity" required error={le.qty} htmlFor={`po-qty-${l.key}`}>
                        <TextInput id={`po-qty-${l.key}`} type="number" min={1} value={l.qty} onChange={(e) => setL(l.key, "qty", e.target.value)} error={!!le.qty} className="no-spinner" onWheel={(e) => e.currentTarget.blur()} />
                      </Field>
                      <Field label="Agreed unit cost (excl. VAT)" hint="Optional" error={le.unitCost} htmlFor={`po-cost-${l.key}`}>
                        <TextInput id={`po-cost-${l.key}`} type="number" min={0} value={l.unitCost} onChange={(e) => setL(l.key, "unitCost", e.target.value)} error={!!le.unitCost} placeholder="0" className="no-spinner" onWheel={(e) => e.currentTarget.blur()} />
                      </Field>
                      <Field label="Specification / options" className="md:col-span-2" hint="e.g. tow bar fitment at factory, canopy pre-fit" htmlFor={`po-spec-${l.key}`}>
                        <TextInput id={`po-spec-${l.key}`} value={l.spec} onChange={(e) => setL(l.key, "spec", e.target.value)} placeholder="Factory options or special build notes" />
                      </Field>
                    </FormGrid>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-center mt-4">
              <SmallButton icon={Plus} onClick={() => setLines((ls) => [...ls, newLine()])}>Add another vehicle line</SmallButton>
            </div>
          </Card>
        </div>

        <div className="space-y-5 lg:sticky lg:top-0">
          <Card title="Order summary">
            <KeyValueGrid cols={2} items={[
              { label: "Supplier", value: supplier?.name ?? "—" },
              { label: "Expected", value: fmtOpt(header.expected) },
              { label: "Lines", value: lines.length },
              { label: "Units", value: units },
            ]} />
            <ul className="mt-4 space-y-1 text-[12px]">
              {lines.map((l, i) => {
                const label = lineLabel(l);
                return (
                  <li key={l.key} className="flex justify-between gap-2">
                    <span className="text-[#555] truncate">{i + 1}. {Number(l.qty) || 0} × {label || "model not set"}{l.colour ? ` (${l.colour})` : ""}</span>
                    <span className="tabular-nums text-[#333] shrink-0">{formatCurrency(lineTotal(l))}</span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 pt-3 border-t border-[#f0f0f0]">
              <SummaryRows
                rows={[
                  { label: `Subtotal (${units} unit${units === 1 ? "" : "s"})`, value: formatCurrency(subtotal) },
                  { label: `${taxConfig.label} (${taxConfig.percentage}%)`, value: formatCurrency(vat), muted: true },
                ]}
                total={{ label: "Total agreed cost", value: formatCurrency(subtotal + vat) }}
              />
            </div>
          </Card>
          <Notice tone="info">Submitting sends the whole PO (all lines) to a Sales Manager for approval. No Evolve record is created at this step.</Notice>
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2">
            <PrimaryButton className="w-full!" disabled={saving} onClick={() => submit("approval")}>{saving ? "Saving…" : "Submit for approval"}</PrimaryButton>
            <SecondaryButton className="w-full" disabled={saving} onClick={() => submit("draft")}>Save as draft</SecondaryButton>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Approve Purchase Order ───────────────────────────────────────────────────
type Decision = { id: string; action: "Approved" | "Rejected"; by: string; at: string; reason?: string };

export function ApprovePurchaseOrder() {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const { purchaseOrders, stock } = useSalesData();
  const pending = purchaseOrders.filter((p) => p.status === "Approval");
  const [selectedId, setSelectedId] = useState("");
  const [dialog, setDialog] = useState<null | "approve" | "reject">(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  // Decisions are recorded on the server with the logged-in approver.
  const [history] = usePersistentState<Decision[]>(SERVER_EXTRAS.approvalHistory, []);

  const selected = pending.find((p) => p.id === selectedId) ?? pending[0];

  const decide = async () => {
    if (!selected || !dialog) return;
    if (dialog === "reject" && !reason.trim()) { setReasonError("A reason is required to reject"); return; }
    const action = dialog === "approve" ? "Approved" : "Rejected";
    try {
      unwrap(await decidePurchaseOrder(selected.id, action, reason.trim() || undefined));
      await salesStore.hydrate(); // brings the PO and the approval history back
    } catch (err) {
      toast.error(evolveErrorMessage(err));
      return;
    }
    setSelectedId("");
    setDialog(null);
    setReason("");
    toast.success(`${selected.id} ${action.toLowerCase()}`);
  };

  return (
    <>
      <PageHeader />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <Card title="Pending approval" subtitle={`${pending.length} purchase order(s)`} bodyClassName="p-2 sm:p-3">
          {pending.length === 0 ? (
            <EmptyState
              icon={CircleCheck}
              title="Nothing to approve"
              message="Purchase orders submitted for approval appear here."
              action={<SmallButton icon={Plus} onClick={() => navigate(screenPath("purchase-order", "new-purchase-order"))}>New Purchase Order</SmallButton>}
            />
          ) : (
            <ul className="space-y-1">
              {pending.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className={`w-full text-left rounded-lg px-3 py-2.5 border transition-colors cursor-pointer ${p.id === selected?.id ? "border-[#ff4f31] bg-[#fff6f4]" : "border-transparent hover:bg-[#fafafa]"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-medium text-[#ff4f31]">{p.id}</span>
                      <span className="text-[12px] text-[#333] tabular-nums">{formatCurrency(poTotal(p))}</span>
                    </div>
                    <p className="text-[12px] text-[#555] truncate">{poSummary(p)}</p>
                    <p className="text-[11px] text-[#999]">Requested by {p.createdBy} · {fmtDate(p.created)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="lg:col-span-2 space-y-5">
          {selected ? (
            <Card
              title={`Order ${selected.id}`}
              subtitle={`Requested by ${selected.createdBy} on ${fmtDate(selected.created)}`}
              actions={<StatusBadge status="Pending approval" />}
            >
              <KeyValueGrid items={[
                { label: "Supplier", value: selected.supplier },
                { label: "Receiving branch", value: selected.branch || "—" },
                { label: "Vehicle lines", value: selected.lines.length },
                { label: "Total units", value: poQty(selected) },
                { label: "Total agreed cost", value: <span className="font-semibold">{formatCurrency(poTotal(selected))}</span> },
                { label: "Expected", value: fmtOpt(selected.expected) },
                { label: "Approver", value: "Sales Manager (any branch)" },
              ]} />
              <div className="mt-4"><POLinesTable po={selected} stock={stock} /></div>
              {selected.notes && <p className="text-[12px] text-[#666] mt-3"><span className="font-medium text-[#333]">Notes:</span> {selected.notes}</p>}
              <div className="flex gap-2 justify-end mt-4 flex-wrap">
                <SmallButton variant="danger" icon={X} onClick={() => { setDialog("reject"); setReasonError(""); }}>Reject</SmallButton>
                <SmallButton variant="primary" icon={Check} onClick={() => setDialog("approve")}>Approve</SmallButton>
              </div>
            </Card>
          ) : (
            <EmptyState icon={FileText} title="No order selected" message="Pick an order on the left to review it." />
          )}

          <Card title="Approval history" icon={History}>
            {history.length === 0 ? (
              <p className="text-[13px] text-[#999]">No decisions yet.</p>
            ) : (
              <Timeline items={history.map((h, i) => ({
                id: `${h.id}-${i}`,
                icon: h.action === "Approved" ? Check : X,
                tone: h.action === "Approved" ? "green" : "red",
                title: <>{h.id} <span className="font-normal text-[#666]">{h.action.toLowerCase()} by {h.by}</span></>,
                meta: h.at,
                body: h.reason,
              }))} />
            )}
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={dialog !== null}
        onClose={() => setDialog(null)}
        onConfirm={decide}
        danger={dialog === "reject"}
        title={dialog === "approve" ? "Approve purchase order" : "Reject purchase order"}
        confirmLabel={dialog === "approve" ? "Approve" : "Reject"}
        message={selected && <>{dialog === "approve" ? "Approve" : "Reject"} <span className="font-semibold text-[#333]">{selected.id}</span> for {poSummary(selected)} ({formatCurrency(poTotal(selected))})? All lines are decided together.</>}
      >
        <Field label={dialog === "reject" ? "Reason" : "Comment (optional)"} required={dialog === "reject"} error={reasonError} htmlFor="po-reason">
          <TextArea id="po-reason" value={reason} onChange={(e) => { setReason(e.target.value); setReasonError(""); }} placeholder={dialog === "reject" ? "Why is this order rejected?" : "Visible to the requester"} />
        </Field>
      </ConfirmDialog>
    </>
  );
}

// ── Send Order to Evolve ─────────────────────────────────────────────────────
interface OnOrderUnit {
  key: string;
  unit: number;
  lineNo: number;
  model: string;
  modelCode: string;
  colour: string;
  unitCost: number;
  vin?: string;
  stockNo?: string;
  vehicle?: StockVehicle;
  evolveStockNo?: string;
  evolveStatus: "Not sent" | "Manual in Evolve" | "Sent to Evolve";
}

export function SendOrderToEvolve() {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const { purchaseOrders, stock } = useSalesData();
  const orders = purchaseOrders.filter((p) => ["Ordered", "Partially Received", "Received"].includes(p.status));
  const [poId, setPoId] = useState("");
  const po = orders.find((p) => p.id === poId) ?? orders[0];
  // Which on-order units were captured by hand in Evolve, keyed "PO#unit".
  const [manual, setManual] = usePersistentState<Record<string, boolean>>("buying.onOrderManual", {});
  // VehicleStockNo Evolve returned per unit when 23 is live, keyed like `manual`.
  const [sent, setSent] = usePersistentState<Record<string, string>>("buying.onOrderEvolve", {});
  // Receiving records which PO each received stock unit came from.
  const [receipts] = usePersistentState<Record<string, { poId?: string; poLineId?: string; supplierInvoice?: string; receivedOn?: string }>>("receiving.receipts", {});
  const [confirmManual, setConfirmManual] = useState<string | null>(null);

  if (!po) {
    return (
      <>
        <PageHeader />
        <PendingUatNotice api="23 VehicleStockOnOrderMaintenance" workaround="Staff capture the on-order stock in Evolve by hand, then mark each unit below as “entered manually” so TrueGear and Evolve stay aligned." />
        <div className="mt-5">
          <EmptyState
            icon={Truck}
            title="No approved orders yet"
            message="Once a purchase order is approved (status “Ordered”) its units can be captured as on-order stock here."
            action={<SmallButton variant="primary" onClick={() => navigate(screenPath("purchase-order", "approve-purchase-order"))}>Go to approvals</SmallButton>}
          />
        </div>
      </>
    );
  }

  // One row per unit on every line; received stock fills the VIN / stock no.
  const units: OnOrderUnit[] = po.lines.flatMap((l, li) => {
    const received = stock
      .filter((v) => receipts[v.stockNo]?.poId === po.id && (receipts[v.stockNo]?.poLineId ?? "L1") === l.id)
      .reverse();
    return Array.from({ length: l.qty }, (_, i) => {
      // Single-line POs keep the older "PO#unit" key so earlier marks still match.
      const key = po.lines.length === 1 ? `${po.id}#${i + 1}` : `${po.id}#${l.id}#${i + 1}`;
      const v = received[i];
      return {
        key, unit: i + 1, lineNo: li + 1, model: l.model, modelCode: l.modelCode, colour: l.colour, unitCost: l.unitCost,
        vin: v?.vin, stockNo: v?.stockNo, vehicle: v, evolveStockNo: sent[key],
        evolveStatus: sent[key] ? "Sent to Evolve" : manual[key] ? "Manual in Evolve" : "Not sent",
      };
    });
  });
  const confirmUnit = units.find((u) => u.key === confirmManual);
  // 23 needs the VIN and engine number, which TrueGear captures on receipt.
  const sendable = units.filter((u) => u.evolveStatus === "Not sent" && u.vehicle);

  const buildOnOrder = (): EvolveOnOrderUnit[] | string => {
    if (!sendable.length) return "No received units are waiting to be sent. Units need a VIN and engine number, captured on Receive Vehicle.";
    return sendable.map((u) => {
      const v = u.vehicle!;
      const receipt = receipts[v.stockNo];
      return {
        vin: v.vin,
        engineNo: v.engineNo,
        franchiseCode: v.make.toUpperCase(),
        year: v.year,
        modelCode: u.modelCode,
        colour: u.colour,
        vendorInvoice: receipt?.supplierInvoice,
        vendorInvoiceDate: receipt?.receivedOn,
        totalPurchaseInvoice: u.unitCost,
        supplierName: po.supplier,
        bookRetail: v.retail,
      };
    });
  };

  const recordSent = (rows: { vehicleStockNo: string }[]) => {
    setSent((m) => ({ ...m, ...Object.fromEntries(sendable.map((u, i) => [u.key, rows[i]?.vehicleStockNo || "Sent"])) }));
    previewToast(`${sendable.length} unit(s) sent to Evolve as on-order stock`);
  };

  const markManual = () => {
    if (!confirmManual) return;
    setManual((m) => ({ ...m, [confirmManual]: true }));
    previewToast("Marked as entered manually in Evolve");
    setConfirmManual(null);
  };

  return (
    <>
      <PageHeader />
      <PendingUatNotice api="23 VehicleStockOnOrderMaintenance" workaround="Staff capture the on-order stock in Evolve by hand, then mark each unit below as “entered manually” so TrueGear and Evolve stay aligned." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5 items-start">
        <Card title="Order summary" className="lg:col-span-1">
          <Field label="Purchase order" htmlFor="soe-po">
            <SelectInput id="soe-po" value={po.id} onChange={(e) => setPoId(e.target.value)} options={orders.map((p) => ({ value: p.id, label: `${p.id} — ${poSummary(p)}` }))} />
          </Field>
          <div className="mt-4">
            <KeyValueGrid cols={2} items={[
              { label: "PO number", value: po.id },
              { label: "Status", value: <StatusBadge status={po.status} /> },
              { label: "Supplier", value: po.supplier },
              { label: "Vehicle lines", value: po.lines.length },
              { label: "Units", value: poQty(po) },
              { label: "Total invoice value", value: formatCurrency(poTotal(po)) },
            ]} />
          </div>
        </Card>

        <Card
          className="lg:col-span-2"
          title="Units to send as on-order stock"
          subtitle="Evolve returns a VehicleStockNo per unit. Units are sent once received (VIN and engine no. known)."
        >
          <DataTable
            paginate={false}
            rows={units}
            rowKey={(u) => u.key}
            columns={[
              { key: "unit", header: "Unit", render: (u) => <div><p className="text-[#333]">{u.model}</p><p className="text-[11px] text-[#999]">Line {u.lineNo} · {u.modelCode} · {u.colour} · unit {u.unit} of {po.lines[u.lineNo - 1].qty}</p></div> },
              { key: "vin", header: "VIN", render: (u) => (u.vin ? <span className="font-mono text-[12px]">{u.vin}</span> : <span className="text-[#bbb]">Captured on receipt</span>) },
              { key: "invoice", header: "Invoice value", align: "right", render: (u) => formatCurrency(u.unitCost) },
              { key: "stockNo", header: "TrueGear stock no.", render: (u) => u.stockNo ?? <span className="text-[#bbb]">Not received</span> },
              { key: "status", header: "Evolve status", render: (u) => <div><StatusBadge status={u.evolveStatus} />{u.evolveStockNo && u.evolveStockNo !== "Sent" && <p className="text-[11px] text-[#999] mt-0.5">{u.evolveStockNo}</p>}</div> },
              {
                key: "act", header: "", align: "right",
                render: (u) => u.evolveStatus === "Not sent"
                  ? <SmallButton onClick={() => setConfirmManual(u.key)}>Mark entered manually</SmallButton>
                  : <Badge tone="green"><CircleCheck size={12} /> Done</Badge>,
              },
            ]}
          />
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <div className="rounded-lg border border-[#e5e7eb] bg-[#fafafa] px-4 py-3 text-[12px] text-[#555]">
              <p className="font-semibold text-[#333] flex items-center gap-1.5 mb-1"><PlugZap size={14} className="text-amber-600" /> 23 VehicleStockOnOrderMaintenance</p>
              <ul className="list-disc ml-5 space-y-0.5">
                <li>Sends VIN, engine no., make, model code, colour, supplier, supplier invoice and invoice value.</li>
                <li>{sendable.length} received unit(s) ready to send; units not yet received wait for their VIN.</li>
              </ul>
            </div>
            <EvolveWriteActions label={`Send ${sendable.length} unit(s) to Evolve`} build={buildOnOrder} send={sendEvolveOnOrder} onSent={(r) => recordSent(r.rows)} />
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={!!confirmManual}
        onClose={() => setConfirmManual(null)}
        onConfirm={markManual}
        title="Mark as entered in Evolve"
        confirmLabel="Mark entered"
        message={confirmUnit && <>Confirm that unit {confirmUnit.unit} of line {confirmUnit.lineNo} ({confirmUnit.model}, {confirmUnit.colour}) on {po.id} has been captured manually as on-order stock in Evolve.</>}
      />
    </>
  );
}
