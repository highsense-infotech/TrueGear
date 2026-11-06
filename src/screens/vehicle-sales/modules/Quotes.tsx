// Module 5 — Quotation. Quotes are saved on the TrueGear server through the
// Vehicle Sales store (data/store.ts); nothing is sent to Evolve from here.

import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Calculator, CircleCheck, Check, X, History, Printer, Copy, Mail, MessageCircle,
  FileText, Eye, Car, Wrench, Percent, Link2, Plus, ArrowRight, MessageSquareText, UserPlus, Truck, Search,
} from "lucide-react";
import { useCurrency } from "../../../context/CurrencyContext";
import { QRCodeSVG } from "qrcode.react";
import {
  PageHeader, Card, KpiGrid, KpiCard, DataTable, StatusBadge, SmallButton, PrimaryButton, SecondaryButton,
  Field, TextInput, SelectInput, TextArea, FormGrid, SummaryRows, ConfirmDialog, KeyValueGrid, Notice, Timeline,
  EmptyState, Badge, RadioCards, ProgressBar, Toggle, FilterPills, Toolbar, SearchInput, type Column,
} from "../components/ui";
import { currentUserName, previewToast } from "../components/helpers";
import { screenPath } from "../registry";
import { useMyEnquiries } from "../access";
import { ACCESSORIES, FI_PRODUCTS, MAINTENANCE_PLANS, ON_ROAD, OEM_INCENTIVES, fmtDate } from "../data/mock";
import {
  salesStore, useSalesData, usePersistentState, customerById, enquiryById, stockByNo, userById, today,
  type Quote, type QuoteStatus, type TradeIn,
  quoteCatalogueStatus,
} from "../data/store";

// Executive discount limit (% of vehicle price) before manager approval.
const EXEC_DISCOUNT_LIMIT = 2.5;
const QUOTE_VALID_DAYS = 14;

interface QuoteInput {
  stockNo: string;
  price?: number; // price captured on a saved quote; defaults to the stock unit's current price
  accessories: string[];
  fi: string[];
  maintenance: string;
  onRoad: boolean;
  tradeIn: number;
  settlement: number;
  discount: number;
  promotion: string;
}

// Quote fields the store's Quote type does not carry.
interface QuoteMeta {
  onRoad: boolean;
  promotion: string;
  reason?: string;
}

interface DiscountDecision {
  id: string;
  req: string;
  action: "Approved" | "Rejected";
  by: string;
  at: string;
  note: string;
}

interface QuoteLine {
  label: string;
  code?: string;
  amount: number;
  vatable: boolean;
  group: "Vehicle" | "Accessories" | "F&I insurance" | "Maintenance plan" | "On-road costs" | "Discount" | "Promotion";
}

const keyOf = (q: Quote) => `${q.id}-v${q.version}`;
const stamp = () => new Date().toISOString().slice(0, 16).replace("T", " ");
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

function useQuoteMeta() {
  return usePersistentState<Record<string, QuoteMeta>>("quotes.meta", {});
}

function inputOf(q: Quote, meta?: QuoteMeta): QuoteInput {
  return {
    stockNo: q.stockNo,
    price: q.vehiclePrice,
    accessories: q.accessories,
    fi: q.fi,
    maintenance: q.maintenance,
    onRoad: meta?.onRoad ?? true,
    tradeIn: q.tradeIn?.value ?? 0,
    settlement: q.tradeIn?.settlement ?? 0,
    discount: q.discount,
    promotion: meta?.promotion ?? "",
  };
}

// Prices are VAT-exclusive. VAT applies to the vehicle, accessories and
// maintenance plan (net of discount / promotion), as on job cards; insurance
// and on-road fees are shown VAT-free. Trade-in is deducted after VAT.
function computeQuote(input: QuoteInput, vatPct: number) {
  const vehicle = stockByNo(input.stockNo);
  const price = input.price ?? vehicle?.current ?? 0;
  const lines: QuoteLine[] = [];
  if (vehicle || input.price) lines.push({ label: vehicle ? `${vehicle.model} (${vehicle.colour})` : input.stockNo, code: input.stockNo, amount: price, vatable: true, group: "Vehicle" });
  ACCESSORIES.filter((a) => input.accessories.includes(a.code)).forEach((a) => lines.push({ label: a.name, code: a.code, amount: a.price, vatable: true, group: "Accessories" }));
  FI_PRODUCTS.filter((f) => input.fi.includes(f.code)).forEach((f) => lines.push({ label: f.name, code: f.code, amount: f.price, vatable: false, group: "F&I insurance" }));
  const plan = MAINTENANCE_PLANS.find((m) => m.code === input.maintenance);
  if (plan) lines.push({ label: plan.name, code: plan.code, amount: plan.price, vatable: true, group: "Maintenance plan" });
  if (input.onRoad) ON_ROAD.forEach((o) => lines.push({ label: o.name, amount: o.price, vatable: false, group: "On-road costs" }));
  if (input.discount > 0) lines.push({ label: "Dealer discount", amount: -input.discount, vatable: true, group: "Discount" });
  const promo = OEM_INCENTIVES.find((p) => p.code === input.promotion);
  if (promo) lines.push({ label: promo.name, code: promo.code, amount: -promo.amount, vatable: true, group: "Promotion" });

  const subtotal = lines.reduce((n, l) => n + l.amount, 0);
  const vatBase = lines.filter((l) => l.vatable).reduce((n, l) => n + l.amount, 0);
  const vat = Math.max(0, vatBase) * (vatPct / 100);
  const total = subtotal + vat;
  const netTradeIn = Math.max(0, input.tradeIn - input.settlement);
  const discountPct = price ? (input.discount / price) * 100 : 0;
  return { vehicle, price, lines, subtotal, vatBase, vat, total, netTradeIn, payable: total - netTradeIn, discountPct, promo };
}

const groupOrder: QuoteLine["group"][] = ["Vehicle", "Accessories", "F&I insurance", "Maintenance plan", "On-road costs", "Discount", "Promotion"];

function QuoteLinesTable({ lines, formatCurrency }: { lines: QuoteLine[]; formatCurrency: (n: number) => string }) {
  return (
    <table className="w-full text-[13px]">
      <thead className="text-[#666] bg-[#fafafa] print:bg-transparent">
        <tr>
          <th className="text-left font-medium px-3 py-2">Item</th>
          <th className="text-left font-medium px-3 py-2 hidden sm:table-cell print:table-cell">Code</th>
          <th className="text-right font-medium px-3 py-2">Amount (excl.)</th>
        </tr>
      </thead>
      <tbody>
        {groupOrder.map((g) => {
          const items = lines.filter((l) => l.group === g);
          if (items.length === 0) return null;
          return [
            <tr key={g} className="border-t border-[#f0f0f0]"><td colSpan={3} className="px-3 pt-2.5 pb-1 text-[11px] uppercase tracking-wide text-[#999]">{g}</td></tr>,
            ...items.map((l, i) => (
              <tr key={`${g}-${i}`}>
                <td className="px-3 py-1.5 text-[#333]">{l.label}{!l.vatable && <span className="text-[10px] text-[#999] ml-1">(no VAT)</span>}</td>
                <td className="px-3 py-1.5 text-[#999] hidden sm:table-cell print:table-cell">{l.code ?? "—"}</td>
                <td className={`px-3 py-1.5 text-right tabular-nums ${l.amount < 0 ? "text-[#e53e3e]" : "text-[#333]"}`}>{formatCurrency(l.amount)}</td>
              </tr>
            )),
          ];
        })}
      </tbody>
    </table>
  );
}

// Evolve lists can run to hundreds of rows: search by name / code, scroll
// inside a fixed height, and keep what is picked visible as removable chips.
function CheckList({ items, selected, onToggle, format, noun = "item" }: {
  items: { code: string; name: string; price: number }[]; selected: string[]; onToggle: (c: string) => void; format: (n: number) => string; noun?: string;
}) {
  const [q, setQ] = useState("");
  const [onlySelected, setOnlySelected] = useState(false);
  const picked = items.filter((it) => selected.includes(it.code));
  const needle = q.trim().toLowerCase();
  const shown = items.filter((it) =>
    (!onlySelected || selected.includes(it.code)) &&
    (!needle || it.name.toLowerCase().includes(needle) || it.code.toLowerCase().includes(needle)));
  const pickedTotal = picked.reduce((n, it) => n + it.price, 0);

  return (
    <div className="space-y-3">
      {picked.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {picked.map((it) => (
            <button key={it.code} type="button" onClick={() => onToggle(it.code)} title="Remove"
              className="inline-flex items-center gap-1 max-w-full rounded-full bg-[#ff4f31]/10 text-[#c2321b] text-[12px] px-2.5 py-1 hover:bg-[#ff4f31]/20 cursor-pointer">
              <span className="truncate">{it.name}</span><span className="tabular-nums">· {format(it.price)}</span><X size={12} className="shrink-0" />
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${items.length} ${noun}s by name or code`} aria-label={`Search ${noun}s`}
            className="w-full pl-8 pr-3 py-2 text-[13px] border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff4f31] text-[#333]" />
        </div>
        <label className="flex items-center gap-1.5 text-[12px] text-[#555] whitespace-nowrap cursor-pointer">
          <input type="checkbox" checked={onlySelected} onChange={(e) => setOnlySelected(e.target.checked)} className="accent-[#ff4f31]" /> Selected only
        </label>
      </div>
      <ul className="divide-y divide-[#f0f0f0] border border-[#e5e7eb] rounded-lg max-h-72 overflow-y-auto">
        {shown.map((it) => (
          <li key={it.code}>
            <label className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-[#fafafa]">
              <input type="checkbox" checked={selected.includes(it.code)} onChange={() => onToggle(it.code)} className="accent-[#ff4f31] w-4 h-4 shrink-0" />
              <span className="flex-1 min-w-0 text-[13px] text-[#333]"><span className="block truncate">{it.name}</span><span className="block text-[11px] text-[#999]">{it.code}</span></span>
              <span className="text-[13px] tabular-nums text-[#333] shrink-0">{format(it.price)}</span>
            </label>
          </li>
        ))}
        {shown.length === 0 && <li className="px-3 py-4 text-center text-[12px] text-[#999]">No {noun}s match “{q}”.</li>}
      </ul>
      <p className="text-[12px] text-[#999]">{picked.length} of {items.length} selected{picked.length ? ` · ${format(pickedTotal)}` : ""}</p>
    </div>
  );
}

// Picks one quote version from a list; the choice lives in ?quote=<id>-v<n>.
function useQuoteParam(list: Quote[]) {
  const [params, setParams] = useSearchParams();
  const wanted = params.get("quote");
  const selected = list.find((q) => keyOf(q) === wanted) ?? list.find((q) => q.id === wanted) ?? list[0];
  const select = (key: string) => setParams((p) => { p.set("quote", key); return p; }, { replace: true });
  return [selected, select] as const;
}

function QuotePicker({ quotes, value, onChange }: { quotes: Quote[]; value?: Quote; onChange: (key: string) => void }) {
  return (
    <Card className="mb-5">
      <Field label="Quote" htmlFor="quote-pick">
        <SelectInput id="quote-pick" value={value ? keyOf(value) : ""} onChange={(e) => onChange(e.target.value)}
          options={quotes.map((q) => ({ value: keyOf(q), label: `${q.id} v${q.version} — ${customerById(q.customerId)?.name ?? "Unknown customer"} · ${q.status}` }))} />
      </Field>
    </Card>
  );
}

function NoQuotes({ message }: { message?: string }) {
  const navigate = useNavigate();
  return (
    <EmptyState icon={FileText} title="No quotes yet" message={message ?? "Create a quote from an open enquiry first."}
      action={<SmallButton variant="primary" icon={Plus} onClick={() => navigate(screenPath("quotation", "new-quote"))}>New quote</SmallButton>} />
  );
}

// ── All Quotations ───────────────────────────────────────────────────────────
// One row per quote (its latest version). Lead scope applies: an executive
// sees quotes on the enquiries they can see.
type QuoteFilter = "All" | "Open" | "Awaiting approval" | "Accepted" | "Rejected";
const CLOSED: QuoteStatus[] = ["Accepted", "Rejected", "Superseded"];

export function AllQuotations() {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const data = useSalesData();
  const myEnquiries = useMyEnquiries();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<QuoteFilter>("All");

  const latest = useMemo(() => {
    const visible = new Set(myEnquiries.map((e) => e.id));
    const byId = new Map<string, { quote: Quote; versions: number }>();
    for (const x of data.quotes) {
      if (!visible.has(x.enquiryId)) continue;
      const cur = byId.get(x.id);
      if (!cur) byId.set(x.id, { quote: x, versions: 1 });
      else byId.set(x.id, { quote: x.version > cur.quote.version ? x : cur.quote, versions: cur.versions + 1 });
    }
    return [...byId.values()].sort((a, b) => b.quote.date.localeCompare(a.quote.date) || b.quote.id.localeCompare(a.quote.id));
  }, [data.quotes, myEnquiries]);

  const matches = (f: QuoteFilter, x: Quote) =>
    f === "All" ? true : f === "Open" ? !CLOSED.includes(x.status) : x.status === f;
  const count = (f: QuoteFilter) => latest.filter((r) => matches(f, r.quote)).length;

  const rows = latest
    .filter((r) => matches(filter, r.quote))
    .filter((r) => {
      const x = r.quote;
      const v = stockByNo(x.stockNo);
      return [x.id, x.enquiryId, x.stockNo, v?.model, customerById(x.customerId)?.name, x.createdBy].join(" ").toLowerCase().includes(q.toLowerCase());
    });

  const open = latest.filter((r) => !CLOSED.includes(r.quote.status));
  const newQuote = <PrimaryButton icon={Plus} onClick={() => navigate(screenPath("quotation", "new-quote"))}>New Quote</PrimaryButton>;
  const openQuote = (id: string) => navigate(`${screenPath("quotation", "quote-history")}?quote=${id}`);

  const columns: Column<{ quote: Quote; versions: number }>[] = [
    { key: "id", header: "Quote", render: (r) => <span className="font-medium text-[#ff4f31]">{r.quote.id}</span>, sortValue: (r) => r.quote.id },
    { key: "customer", header: "Customer", render: (r) => <div><p className="text-[#333]">{customerById(r.quote.customerId)?.name ?? "Unknown customer"}</p><p className="text-[11px] text-[#999]">{r.quote.enquiryId}</p></div>, sortValue: (r) => customerById(r.quote.customerId)?.name ?? "" },
    { key: "vehicle", header: "Vehicle", render: (r) => { const v = stockByNo(r.quote.stockNo); return <div><p className="text-[#333]">{v?.model ?? "—"}</p><p className="text-[11px] text-[#999]">{r.quote.stockNo}{v?.colour ? ` · ${v.colour}` : ""}</p></div>; } },
    { key: "version", header: "Version", render: (r) => `v${r.quote.version}${r.versions > 1 ? ` (${r.versions})` : ""}`, sortValue: (r) => r.quote.version },
    { key: "total", header: "Total", align: "right", render: (r) => formatCurrency(r.quote.total), sortValue: (r) => r.quote.total },
    { key: "date", header: "Date", render: (r) => fmtDate(r.quote.date), sortValue: (r) => r.quote.date },
    { key: "by", header: "Created by", render: (r) => r.quote.createdBy },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.quote.status} /> },
    { key: "act", header: "", align: "right", render: (r) => <SmallButton icon={Eye} onClick={(e) => { e.stopPropagation(); openQuote(r.quote.id); }}>View</SmallButton> },
  ];

  if (latest.length === 0) {
    return (<><PageHeader actions={newQuote} /><NoQuotes /></>);
  }

  return (
    <>
      <PageHeader actions={newQuote} />
      <KpiGrid>
        <KpiCard label="Open quotes" value={open.length} icon={FileText} />
        <KpiCard label="Awaiting approval" value={count("Awaiting approval")} hint="Discount above limit" icon={Percent} />
        <KpiCard label="Accepted" value={count("Accepted")} icon={CircleCheck} />
        <KpiCard label="Open quote value" value={formatCurrency(open.reduce((n, r) => n + r.quote.total, 0))} icon={Calculator} />
      </KpiGrid>
      <Card>
        <FilterPills<QuoteFilter>
          value={filter}
          onChange={setFilter}
          options={(["All", "Open", "Awaiting approval", "Accepted", "Rejected"] as QuoteFilter[]).map((k) => ({ key: k, label: k, count: count(k) }))}
        />
        <Toolbar>
          <SearchInput value={q} onChange={setQ} placeholder="Search quote, enquiry, customer, vehicle or creator" />
        </Toolbar>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.quote.id}
          onRowClick={(r) => openQuote(r.quote.id)}
          empty={<EmptyState icon={FileText} title="No quotes match" message="Clear the search or choose another status." />}
        />
      </Card>
    </>
  );
}

// ── New Quote ────────────────────────────────────────────────────────────────
export function NewQuote() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { formatCurrency, taxConfig } = useCurrency();
  const data = useSalesData();
  const [, setMeta] = useQuoteMeta();
  const myEnquiries = useMyEnquiries();
  const openEnquiries = myEnquiries.filter((e) => !["Won", "Lost"].includes(e.status));

  const [enquiryId, setEnquiryId] = useState(params.get("enquiry") ?? "");
  const [input, setInput] = useState<QuoteInput>({
    stockNo: params.get("stock") ?? "",
    accessories: [],
    fi: [],
    maintenance: "", // optional — none until a contract is picked
    onRoad: true,
    tradeIn: Number(params.get("tradeIn") ?? 0) || 0,
    settlement: Number(params.get("settlement") ?? 0) || 0,
    discount: 0,
    promotion: "",
  });
  const [tradeVehicle] = useState({
    make: params.get("tiMake") ?? "",
    model: params.get("tiModel") ?? "",
    year: Number(params.get("tiYear") ?? 0) || 0,
    registration: params.get("tiReg") ?? "",
  });
  const [deposit, setDeposit] = useState(0);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Quote | null>(null);

  const enquiry = enquiryById(enquiryId);
  const customer = customerById(enquiry?.customerId);
  const q = computeQuote(input, taxConfig.percentage);
  const overLimit = q.discountPct > EXEC_DISCOUNT_LIMIT;
  const available = data.stock.filter((v) => ["In Stock", "Demo", "Reserved"].includes(v.status) || v.stockNo === input.stockNo);
  const previous = data.quotes.filter((x) => x.enquiryId === enquiryId);

  const set = <K extends keyof QuoteInput>(k: K, v: QuoteInput[K]) => setInput((p) => ({ ...p, [k]: v }));
  // Accessories / F&I / maintenance contracts load from Evolve 07 beside the data.
  const catalogueStatus = quoteCatalogueStatus();
  const catalogueNote = catalogueStatus === "loading" ? "Loading accessories, F&I insurances and maintenance contracts from Evolve…"
    : catalogueStatus === "failed" ? "Evolve accessories, F&I insurances and maintenance contracts could not be loaded — reopen Vehicle Sales to retry." : "";
  const toggleIn = (k: "accessories" | "fi", code: string) =>
    setInput((p) => ({ ...p, [k]: p[k].includes(code) ? p[k].filter((c) => c !== code) : [...p[k], code] }));

  const save = async () => {
    const e: Record<string, string> = {};
    if (!enquiry) e.enquiry = "Select the enquiry this quote belongs to";
    if (!q.vehicle) e.vehicle = "Select a vehicle";
    if (input.discount < 0) e.discount = "Discount cannot be negative";
    if (q.vehicle && input.discount > q.price * 0.2) e.discount = "Discount above 20% is not allowed";
    if (input.settlement > input.tradeIn && input.tradeIn > 0) e.settlement = "Settlement is higher than the trade-in value";
    if (deposit < 0) e.deposit = "Deposit cannot be negative";
    if (overLimit && !reason.trim()) e.reason = "Tell the manager why this discount is needed";
    setErrors(e);
    if (Object.keys(e).length || !enquiry || !q.vehicle) return;

    const latest = [...previous].sort((a, b) => b.version - a.version)[0];
    const id = latest?.id ?? (await salesStore.nextNumber("QT"));
    const version = (latest?.version ?? 0) + 1;
    if (latest) salesStore.update("quotes", (x) => x.id === id && x.status !== "Accepted", { status: "Superseded" });

    const tradeIn: TradeIn | null = input.tradeIn > 0
      ? { make: tradeVehicle.make || "Trade-in", model: tradeVehicle.model, year: tradeVehicle.year, registration: tradeVehicle.registration, value: input.tradeIn, settlement: input.settlement }
      : null;
    const createdBy = userById(enquiry.ownerId)?.name ?? "Sales executive";
    const quote: Quote = {
      id, version, enquiryId: enquiry.id, customerId: enquiry.customerId, stockNo: q.vehicle.stockNo, date: today(),
      vehiclePrice: q.price, discount: input.discount, accessories: input.accessories, fi: input.fi, maintenance: input.maintenance,
      tradeIn, deposit, total: Math.round(q.total), status: overLimit ? "Awaiting approval" : "Sent", createdBy,
    };
    salesStore.add("quotes", quote);
    setMeta((m) => ({ ...m, [keyOf(quote)]: { onRoad: input.onRoad, promotion: input.promotion, reason: overLimit ? reason.trim() : undefined } }));
    salesStore.update("enquiries", (x) => x.id === enquiry.id, { status: "Quoted" });
    salesStore.add("activities", {
      id: salesStore.localId("ACT"), customerId: enquiry.customerId, enquiryId: enquiry.id, type: "Quote", date: new Date().toISOString(),
      note: `${id} v${version} created — ${formatCurrency(q.total)}${overLimit ? " (sent for discount approval)" : ""}`, by: createdBy,
    });
    setSaved(quote);
    previewToast(overLimit ? `${id} v${version} sent for discount approval` : `Quote ${id} v${version} created`);
  };

  if (openEnquiries.length === 0 || data.stock.length === 0) {
    return (
      <>
        <PageHeader />
        <div className="space-y-5">
          {openEnquiries.length === 0 && (
            <EmptyState icon={UserPlus} title="No open enquiries" message="A quote is always linked to an enquiry. Capture one first."
              action={<SmallButton variant="primary" onClick={() => navigate(screenPath("crm", "add-enquiry"))}>Add enquiry</SmallButton>} />
          )}
          {data.stock.length === 0 && (
            <EmptyState icon={Truck} title="No vehicles in stock" message="Receive a vehicle into stock so it can be quoted."
              action={<SmallButton variant="primary" onClick={() => navigate(screenPath("goods-receipt", "receive-vehicle"))}>Receive vehicle</SmallButton>} />
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader actions={<SecondaryButton icon={History} onClick={() => navigate(screenPath("quotation", "quote-history"))}>Quote history</SecondaryButton>} />

      {saved && (
        <Notice
          tone={saved.status === "Awaiting approval" ? "warning" : "success"}
          className="mb-5"
          title={saved.status === "Awaiting approval" ? `${saved.id} v${saved.version} is waiting for manager discount approval` : `Quote ${saved.id} v${saved.version} saved`}
          action={
            <div className="flex gap-2 flex-wrap">
              {saved.status === "Awaiting approval"
                ? <SmallButton onClick={() => navigate(screenPath("quotation", "approve-discount"))}>Open approvals</SmallButton>
                : <>
                    <SmallButton icon={Printer} onClick={() => navigate(`${screenPath("quotation", "print-quote")}?quote=${keyOf(saved)}`)}>Print</SmallButton>
                    <SmallButton icon={Link2} onClick={() => navigate(`${screenPath("quotation", "customer-quote-link")}?quote=${keyOf(saved)}`)}>Customer link</SmallButton>
                  </>}
            </div>
          }
        >
          Saved. Saving again creates the next version of the same quote.
        </Notice>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-5">
          <Card title="Customer & enquiry">
            <FormGrid>
              <Field label="Enquiry" required error={errors.enquiry} hint={previous.length ? `Already quoted — saving creates v${Math.max(...previous.map((x) => x.version)) + 1}` : undefined} htmlFor="q-enq">
                <SelectInput id="q-enq" value={enquiryId} onChange={(e) => setEnquiryId(e.target.value)} error={!!errors.enquiry} placeholder="Select enquiry"
                  options={openEnquiries.map((en) => ({ value: en.id, label: `${en.id} — ${customerById(en.customerId)?.name ?? "Unknown"}` }))} />
              </Field>
              <Field label="Customer" htmlFor="q-cust"><TextInput id="q-cust" value={customer?.name ?? ""} disabled /></Field>
              <Field label="Interested in" htmlFor="q-int"><TextInput id="q-int" value={enquiry?.interest ?? ""} disabled /></Field>
              <Field label="Sales executive" htmlFor="q-exec"><TextInput id="q-exec" value={userById(enquiry?.ownerId)?.name ?? ""} disabled /></Field>
            </FormGrid>
          </Card>

          <Card title="Vehicle">
            <FormGrid>
              <Field label="Stock vehicle" required error={errors.vehicle} htmlFor="q-veh">
                <SelectInput id="q-veh" value={input.stockNo} onChange={(e) => set("stockNo", e.target.value)} error={!!errors.vehicle} placeholder="Select vehicle"
                  options={available.map((v) => ({ value: v.stockNo, label: `${v.stockNo} — ${v.model} (${v.colour})` }))} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Retail price"><TextInput value={q.vehicle ? formatCurrency(q.vehicle.retail) : ""} disabled /></Field>
                <Field label="Current price"><TextInput value={q.vehicle ? formatCurrency(q.vehicle.current) : ""} disabled /></Field>
              </div>
            </FormGrid>
            {q.vehicle?.status === "Reserved" && (
              <Notice tone="warning" className="mt-3">This unit is reserved for {q.vehicle.reservedFor}. Quoting is allowed, but it cannot be sold until the reservation is released.</Notice>
            )}
          </Card>

          {catalogueNote && <Notice tone={catalogueStatus === "failed" ? "warning" : "info"}>{catalogueNote}</Notice>}
          <Card title="Accessories">
            {ACCESSORIES.length ? <CheckList items={ACCESSORIES} noun="accessory" selected={input.accessories} onToggle={(c) => toggleIn("accessories", c)} format={formatCurrency} />
              : <p className="text-[13px] text-[#999]">{catalogueStatus === "loading" ? "Loading…" : "No accessories in Evolve."}</p>}
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card title="F&I insurance">
              {FI_PRODUCTS.length ? <CheckList items={FI_PRODUCTS} noun="insurance" selected={input.fi} onToggle={(c) => toggleIn("fi", c)} format={formatCurrency} />
                : <p className="text-[13px] text-[#999]">{catalogueStatus === "loading" ? "Loading…" : "No F&I insurances in Evolve."}</p>}
            </Card>
            <Card title="Maintenance plan">
              {MAINTENANCE_PLANS.length ? (
                <RadioCards name="mp" value={input.maintenance} onChange={(v) => set("maintenance", v)}
                  options={[{ value: "", label: "None", description: "No maintenance contract" },
                    ...MAINTENANCE_PLANS.map((m) => ({ value: m.code, label: m.name, description: formatCurrency(m.price) }))]} />
              ) : (
                <p className="text-[13px] text-[#999]">{catalogueStatus === "loading" ? "Loading…" : "No maintenance contracts in Evolve."}</p>
              )}
            </Card>
          </div>

          <Card title="On-road costs, trade-in, discount & promotion">
            <div className="flex items-center justify-between gap-3 mb-4 border border-[#e5e7eb] rounded-lg px-3 py-2.5">
              <div>
                <p className="text-[13px] text-[#333] font-medium">Include on-road costs</p>
                <p className="text-[11px] text-[#999]">{ON_ROAD.map((o) => `${o.name} ${formatCurrency(o.price)}`).join(" · ")}</p>
              </div>
              <Toggle checked={input.onRoad} onChange={(v) => set("onRoad", v)} label="Include on-road costs" />
            </div>
            <FormGrid>
              <Field label="Trade-in value" hint={tradeVehicle.registration ? `${tradeVehicle.year || ""} ${tradeVehicle.make} ${tradeVehicle.model} · ${tradeVehicle.registration}` : "Use Trade-in Value to pick the customer's vehicle"} htmlFor="q-ti">
                <div className="flex gap-2">
                  <TextInput id="q-ti" type="number" min={0} value={input.tradeIn || ""} placeholder="0" onChange={(e) => set("tradeIn", Number(e.target.value) || 0)} className="no-spinner" onWheel={(e) => e.currentTarget.blur()} />
                  <SmallButton icon={Car} onClick={() => navigate(`${screenPath("quotation", "trade-in-value")}?customer=${enquiry?.customerId ?? ""}&enquiry=${enquiryId}&stock=${input.stockNo}`)}>Value</SmallButton>
                </div>
              </Field>
              <Field label="Trade-in settlement owed" error={errors.settlement} htmlFor="q-set">
                <TextInput id="q-set" type="number" min={0} value={input.settlement || ""} placeholder="0" error={!!errors.settlement} onChange={(e) => set("settlement", Number(e.target.value) || 0)} className="no-spinner" onWheel={(e) => e.currentTarget.blur()} />
              </Field>
              <Field label="Dealer discount (excl. VAT)" error={errors.discount} hint={`Your limit: ${EXEC_DISCOUNT_LIMIT}% of vehicle price${q.vehicle ? ` (${formatCurrency(q.price * EXEC_DISCOUNT_LIMIT / 100)})` : ""}`} htmlFor="q-disc">
                <TextInput id="q-disc" type="number" min={0} value={input.discount || ""} placeholder="0" error={!!errors.discount} onChange={(e) => set("discount", Number(e.target.value) || 0)} className="no-spinner" onWheel={(e) => e.currentTarget.blur()} />
              </Field>
              <Field label="Promotion / OEM incentive" htmlFor="q-promo">
                <SelectInput id="q-promo" value={input.promotion} onChange={(e) => set("promotion", e.target.value)} placeholder="No promotion"
                  options={OEM_INCENTIVES.map((p) => ({ value: p.code, label: `${p.name} (−${formatCurrency(p.amount)})` }))} />
              </Field>
              <Field label="Deposit expected" error={errors.deposit} htmlFor="q-dep">
                <TextInput id="q-dep" type="number" min={0} value={deposit || ""} placeholder="0" error={!!errors.deposit} onChange={(e) => setDeposit(Number(e.target.value) || 0)} className="no-spinner" onWheel={(e) => e.currentTarget.blur()} />
              </Field>
            </FormGrid>
            {overLimit && (
              <Notice tone="warning" className="mt-4" title={`Discount ${q.discountPct.toFixed(1)}% is above your ${EXEC_DISCOUNT_LIMIT}% limit`}>
                Saving will send this quote to a Sales Manager for discount approval before it can be shared with the customer.
                <div className="mt-3">
                  <Field label="Reason for the manager" required error={errors.reason} htmlFor="q-reason">
                    <TextArea id="q-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. competing offer, unit aged in stock" />
                  </Field>
                </div>
              </Notice>
            )}
          </Card>
        </div>

        <div className="space-y-5 lg:sticky lg:top-0">
          <Card title="Price breakdown" bodyClassName="p-0 pb-4">
            {q.lines.length ? <QuoteLinesTable lines={q.lines} formatCurrency={formatCurrency} /> : <p className="px-4 pt-2 text-[12px] text-[#999]">Select a vehicle to start the quote.</p>}
            <div className="px-4 pt-3 mt-2 border-t border-[#e5e7eb]">
              <SummaryRows
                rows={[
                  { label: "Subtotal (excl. VAT)", value: formatCurrency(q.subtotal) },
                  { label: `${taxConfig.label} ${taxConfig.percentage}% on ${formatCurrency(q.vatBase)}`, value: formatCurrency(q.vat), muted: true },
                  { label: "Total incl. VAT", value: formatCurrency(q.total) },
                  ...(q.netTradeIn ? [{ label: "Less net trade-in", value: formatCurrency(-q.netTradeIn), negative: true }] : []),
                ]}
                total={{ label: "Amount payable", value: formatCurrency(q.payable) }}
              />
            </div>
          </Card>
          <Card title="Quote summary">
            <KeyValueGrid cols={2} items={[
              { label: "Customer", value: customer?.name ?? "—" },
              { label: "Vehicle", value: q.vehicle?.stockNo ?? "—" },
              { label: "Discount", value: <span className={overLimit ? "text-[#e53e3e] font-medium" : ""}>{q.discountPct.toFixed(1)}%</span> },
              { label: "Approval", value: overLimit ? <StatusBadge status="Pending approval" /> : <Badge tone="green">Not required</Badge> },
            ]} />
          </Card>
          <PrimaryButton className="w-full!" onClick={save}>{overLimit ? "Submit for discount approval" : "Save quote"}</PrimaryButton>
        </div>
      </div>
    </>
  );
}

// ── Trade-in Value ───────────────────────────────────────────────────────────
const CONDITIONS = [
  { value: "excellent", label: "Excellent", description: "No visible wear, full service history", factor: 1.08 },
  { value: "good", label: "Good", description: "Minor wear, service history mostly complete", factor: 1 },
  { value: "fair", label: "Fair", description: "Visible wear, some repairs needed", factor: 0.88 },
  { value: "poor", label: "Poor", description: "Major repairs or missing history", factor: 0.72 },
] as const;

const MANUAL = "__manual";

function estimateValue(year: number, km: number, factor: number) {
  const age = Math.max(0, new Date().getFullYear() - year);
  const base = 520000 * Math.pow(0.86, age);
  const kmAdj = Math.max(0.55, 1 - Math.max(0, km - age * 20000) / 400000);
  return Math.round((base * kmAdj * factor) / 500) * 500;
}

export function TradeInValue() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { formatCurrency } = useCurrency();
  const data = useSalesData();
  const customers = data.customers;
  const [customerId, setCustomerId] = useState(params.get("customer") || customers[0]?.id || "");
  const customer = customerById(customerId);
  const [reg, setReg] = useState(customer?.vehicles[0]?.registration ?? MANUAL);
  const listed = customer?.vehicles.find((v) => v.registration === reg);
  const [manual, setManual] = useState({ make: "", model: "", year: "", registration: "" });
  const [mileage, setMileage] = useState(String(listed?.odometer ?? ""));
  const [condition, setCondition] = useState<(typeof CONDITIONS)[number]["value"]>("good");
  const [override, setOverride] = useState("");
  const [settlement, setSettlement] = useState("");

  const pickCustomer = (id: string) => {
    setCustomerId(id);
    const v = customerById(id)?.vehicles[0];
    setReg(v?.registration ?? MANUAL);
    setMileage(String(v?.odometer ?? ""));
  };
  const pickVehicle = (r: string) => {
    setReg(r);
    setMileage(String(customer?.vehicles.find((v) => v.registration === r)?.odometer ?? ""));
  };

  const vehicle = listed
    ? { make: listed.make, model: listed.model, year: listed.year, registration: listed.registration }
    : { make: manual.make.trim(), model: manual.model.trim(), year: Number(manual.year) || 0, registration: manual.registration.trim().toUpperCase() };
  const complete = !!vehicle.make && !!vehicle.model && vehicle.year > 1980 && !!vehicle.registration;

  const factor = CONDITIONS.find((c) => c.value === condition)!.factor;
  const estimate = complete ? estimateValue(vehicle.year, Number(mileage) || 0, factor) : 0;
  const value = Number(override) || estimate;
  const net = Math.max(0, value - (Number(settlement) || 0));

  if (customers.length === 0) {
    return (
      <>
        <PageHeader />
        <EmptyState icon={UserPlus} title="No customers yet" message="Customers are created when you capture an enquiry."
          action={<SmallButton variant="primary" onClick={() => navigate(screenPath("crm", "add-enquiry"))}>Add enquiry</SmallButton>} />
      </>
    );
  }

  const apply = () => {
    const back = new URLSearchParams({
      tradeIn: String(value), settlement: String(Number(settlement) || 0),
      tiMake: vehicle.make, tiModel: vehicle.model, tiYear: String(vehicle.year), tiReg: vehicle.registration,
    });
    if (params.get("enquiry")) back.set("enquiry", params.get("enquiry")!);
    if (params.get("stock")) back.set("stock", params.get("stock")!);
    previewToast("Trade-in applied to quote");
    navigate(`${screenPath("quotation", "new-quote")}?${back.toString()}`);
  };

  return (
    <>
      <PageHeader />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-5">
          <Card title="Customer vehicle">
            <FormGrid>
              <Field label="Customer" required htmlFor="ti-cust">
                <SelectInput id="ti-cust" value={customerId} onChange={(e) => pickCustomer(e.target.value)} options={customers.map((c) => ({ value: c.id, label: c.name }))} />
              </Field>
              <Field label="Vehicle" required htmlFor="ti-veh">
                <SelectInput id="ti-veh" value={reg} onChange={(e) => pickVehicle(e.target.value)}
                  options={[...(customer?.vehicles ?? []).map((v) => ({ value: v.registration, label: `${v.registration} — ${v.year} ${v.make} ${v.model}` })), { value: MANUAL, label: "Other vehicle (enter details)" }]} />
              </Field>
              {listed ? (
                <>
                  <Field label="Make"><TextInput value={listed.make} disabled /></Field>
                  <Field label="Model"><TextInput value={listed.model} disabled /></Field>
                  <Field label="Year"><TextInput value={listed.year} disabled /></Field>
                  <Field label="Registration"><TextInput value={listed.registration} disabled /></Field>
                </>
              ) : (
                <>
                  <Field label="Make" required htmlFor="ti-make"><TextInput id="ti-make" value={manual.make} onChange={(e) => setManual({ ...manual, make: e.target.value })} placeholder="e.g. Toyota" /></Field>
                  <Field label="Model" required htmlFor="ti-model"><TextInput id="ti-model" value={manual.model} onChange={(e) => setManual({ ...manual, model: e.target.value })} placeholder="e.g. Corolla 1.8" /></Field>
                  <Field label="Year" required htmlFor="ti-year"><TextInput id="ti-year" type="number" min={1980} value={manual.year} onChange={(e) => setManual({ ...manual, year: e.target.value })} className="no-spinner" onWheel={(e) => e.currentTarget.blur()} /></Field>
                  <Field label="Registration" required htmlFor="ti-reg"><TextInput id="ti-reg" value={manual.registration} onChange={(e) => setManual({ ...manual, registration: e.target.value })} placeholder="e.g. AB 12 CD GP" /></Field>
                </>
              )}
              <Field label="Mileage (km)" required error={!mileage ? "Enter the current odometer reading" : undefined} htmlFor="ti-km">
                <TextInput id="ti-km" type="number" min={0} value={mileage} onChange={(e) => setMileage(e.target.value)} error={!mileage} className="no-spinner" onWheel={(e) => e.currentTarget.blur()} />
              </Field>
            </FormGrid>
          </Card>
          <Card title="Condition">
            <RadioCards name="cond" value={condition} onChange={setCondition} options={CONDITIONS.map((c) => ({ value: c.value, label: c.label, description: c.description }))} />
          </Card>
          <Card title="Service history" icon={Wrench}>
            <EmptyState icon={Wrench} title="No service history linked" message="Vehicle 360 history is not linked to Vehicle Sales yet." />
          </Card>
        </div>

        <div className="space-y-5 lg:sticky lg:top-0">
          <Card title="Valuation">
            <p className="text-[12px] text-[#999]">Estimated trade-in value</p>
            <p className="text-[28px] text-[#333] tabular-nums">{formatCurrency(estimate)}</p>
            <p className="text-[11px] text-[#999] mb-4">Rough guide from age, mileage and condition. Not a market valuation.</p>
            <div className="space-y-3">
              <Field label="Manager valuation override" hint="Leave blank to use the estimate" htmlFor="ti-ov">
                <TextInput id="ti-ov" type="number" min={0} value={override} onChange={(e) => setOverride(e.target.value)} placeholder={String(estimate)} className="no-spinner" onWheel={(e) => e.currentTarget.blur()} />
              </Field>
              <Field label="Settlement owed to bank" htmlFor="ti-set">
                <TextInput id="ti-set" type="number" min={0} value={settlement} onChange={(e) => setSettlement(e.target.value)} placeholder="0" className="no-spinner" onWheel={(e) => e.currentTarget.blur()} />
              </Field>
            </div>
            <div className="mt-4 pt-3 border-t border-[#f0f0f0]">
              <SummaryRows rows={[{ label: "Trade-in value", value: formatCurrency(value) }, { label: "Less settlement", value: formatCurrency(-(Number(settlement) || 0)), negative: true }]} total={{ label: "Net allowance", value: formatCurrency(net) }} />
            </div>
          </Card>
          <PrimaryButton className="w-full!" disabled={!complete || !mileage || !value} onClick={apply}>
            Apply to quote <ArrowRight className="w-4 h-4" />
          </PrimaryButton>
        </div>
      </div>
    </>
  );
}

// ── Approve Discount ─────────────────────────────────────────────────────────
const LIMITS_BY_ROLE = [
  { role: "Sales Executive", pct: 2.5 },
  { role: "Sales Manager", pct: 6 },
  { role: "Dealer Principal", pct: 10 },
];

export function ApproveDiscount() {
  const navigate = useNavigate();
  const { formatCurrency, taxConfig } = useCurrency();
  const data = useSalesData();
  const [meta] = useQuoteMeta();
  const [history, setHistory] = usePersistentState<DiscountDecision[]>("quotes.discountHistory", []);
  const pending = data.quotes.filter((q) => q.status === "Awaiting approval");
  const [selectedKey, setSelectedKey] = useState("");
  const [dialog, setDialog] = useState<null | "approve" | "reject">(null);
  const [counter, setCounter] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  const sel = pending.find((p) => keyOf(p) === selectedKey) ?? pending[0];
  const vehicle = stockByNo(sel?.stockNo);
  const customer = customerById(sel?.customerId);
  const price = sel?.vehiclePrice ?? 0;
  const reqPct = sel && price ? (sel.discount / price) * 100 : 0;
  const permitted = price * (EXEC_DISCOUNT_LIMIT / 100);
  const managerLimit = price * 0.06;

  const decide = () => {
    if (!sel || !dialog) return;
    if (dialog === "reject" && !comment.trim()) { setError("Give the executive a reason"); return; }
    const c = Number(counter);
    if (dialog === "approve" && counter && (c <= 0 || c > managerLimit)) { setError(`Counter-offer must be between 1 and ${formatCurrency(managerLimit)} (your limit)`); return; }
    const action = dialog === "approve" ? "Approved" : "Rejected";
    const amount = dialog === "approve" ? (c || sel.discount) : 0;
    if (dialog === "approve") {
      const total = Math.round(computeQuote({ ...inputOf(sel, meta[keyOf(sel)]), discount: amount }, taxConfig.percentage).total);
      salesStore.update("quotes", (q) => keyOf(q) === keyOf(sel), { status: "Sent", discount: amount, total });
    } else {
      salesStore.update("quotes", (q) => keyOf(q) === keyOf(sel), { status: "Rejected" });
    }
    const note = dialog === "approve" ? `Approved ${formatCurrency(amount)}${comment ? ` — ${comment}` : ""}` : comment;
    setHistory((h) => [{ id: `${keyOf(sel)}-${Date.now()}`, req: `${sel.id} v${sel.version}`, action, by: currentUserName(), at: stamp(), note }, ...h]);
    salesStore.add("activities", { id: salesStore.localId("ACT"), customerId: sel.customerId, enquiryId: sel.enquiryId, type: "Discount", date: new Date().toISOString(), note: `${sel.id} v${sel.version} discount ${action.toLowerCase()}: ${note}`, by: currentUserName() });
    setSelectedKey("");
    setDialog(null); setCounter(""); setComment(""); setError("");
    previewToast(`Discount on ${sel.id} v${sel.version} ${action.toLowerCase()}`);
  };

  return (
    <>
      <PageHeader />
      <KpiGrid cols={3}>
        <KpiCard label="Requests waiting" value={pending.length} icon={Percent} />
        <KpiCard label="Requested discount value" value={formatCurrency(pending.reduce((n, p) => n + p.discount, 0))} icon={Calculator} />
        <KpiCard label="Your approval limit" value="6.0%" hint="Sales Manager" icon={CircleCheck} />
      </KpiGrid>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <Card title="Discount requests" bodyClassName="p-2 sm:p-3">
          {pending.length === 0 ? (
            <EmptyState icon={CircleCheck} title="No pending requests" message={`Quotes with a discount above ${EXEC_DISCOUNT_LIMIT}% land here.`}
              action={<SmallButton icon={Plus} onClick={() => navigate(screenPath("quotation", "new-quote"))}>New quote</SmallButton>} />
          ) : (
            <ul className="space-y-1">
              {pending.map((p) => (
                <li key={keyOf(p)}>
                  <button type="button" onClick={() => setSelectedKey(keyOf(p))}
                    className={`w-full text-left rounded-lg px-3 py-2.5 border transition-colors cursor-pointer ${sel && keyOf(p) === keyOf(sel) ? "border-[#ff4f31] bg-[#fff6f4]" : "border-transparent hover:bg-[#fafafa]"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-medium text-[#ff4f31]">{p.id} v{p.version}</span>
                      <span className="text-[12px] text-[#e53e3e] tabular-nums">{p.vehiclePrice ? ((p.discount / p.vehiclePrice) * 100).toFixed(1) : "0.0"}%</span>
                    </div>
                    <p className="text-[12px] text-[#555] truncate">{customerById(p.customerId)?.name ?? "Unknown customer"}</p>
                    <p className="text-[11px] text-[#999]">{p.createdBy} · {fmtDate(p.date)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="lg:col-span-2 space-y-5">
          {sel ? (
            <Card title={`${sel.id} v${sel.version}`} subtitle={`Requested by ${sel.createdBy} on ${fmtDate(sel.date)}`} actions={<StatusBadge status="Pending approval" />}>
              <KeyValueGrid items={[
                { label: "Customer", value: customer?.name ?? "—" },
                { label: "Vehicle", value: `${sel.stockNo} · ${vehicle?.model ?? ""}` },
                { label: "Vehicle price", value: formatCurrency(price) },
                { label: "Days in stock", value: vehicle?.daysInStock ?? "—" },
                { label: "Gross before discount", value: formatCurrency(price - (vehicle?.cost ?? 0)) },
                { label: "Gross after discount", value: formatCurrency(price - sel.discount - (vehicle?.cost ?? 0)) },
              ]} />
              <div className="mt-5 space-y-3">
                <div>
                  <div className="flex justify-between text-[12px] mb-1"><span className="text-[#555]">Permitted (executive {EXEC_DISCOUNT_LIMIT}%)</span><span className="tabular-nums text-[#333]">{formatCurrency(permitted)}</span></div>
                  <ProgressBar value={permitted} max={managerLimit} tone="green" label="Permitted discount" />
                </div>
                <div>
                  <div className="flex justify-between text-[12px] mb-1"><span className="text-[#555]">Requested ({reqPct.toFixed(1)}%)</span><span className="tabular-nums text-[#e53e3e] font-medium">{formatCurrency(sel.discount)}</span></div>
                  <ProgressBar value={sel.discount} max={managerLimit} tone={sel.discount > managerLimit ? "red" : "amber"} label="Requested discount" />
                </div>
                <p className="text-[11px] text-[#999]">Bars are scaled to your manager limit of 6% ({formatCurrency(managerLimit)}).</p>
              </div>
              {sel.discount > managerLimit && <Notice tone="danger" className="mt-3">Request exceeds your 6% limit — approve a counter-offer within your limit or escalate to the Dealer Principal.</Notice>}
              <div className="mt-4 bg-[#fafafa] border border-[#f0f0f0] rounded-lg px-3 py-2.5 text-[12px] text-[#555]"><span className="font-medium text-[#333]">Executive's reason: </span>{meta[keyOf(sel)]?.reason || "—"}</div>
              <div className="flex gap-2 justify-end mt-4 flex-wrap">
                <SmallButton variant="danger" icon={X} onClick={() => { setDialog("reject"); setError(""); }}>Reject</SmallButton>
                <SmallButton variant="primary" icon={Check} onClick={() => { setDialog("approve"); setError(""); }}>Approve</SmallButton>
              </div>
            </Card>
          ) : <EmptyState icon={FileText} title="Nothing to review" message="There are no discount requests waiting." />}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card title="Limits per role" subtitle="Configured in Settings › Discount Limits">
              <ul className="text-[13px] divide-y divide-[#f0f0f0]">
                {LIMITS_BY_ROLE.map((l) => <li key={l.role} className="flex justify-between py-2"><span className="text-[#555]">{l.role}</span><span className="tabular-nums text-[#333]">{l.pct}%</span></li>)}
              </ul>
            </Card>
            <Card title="Approval history" icon={History}>
              {history.length === 0 ? <p className="text-[12px] text-[#999]">No decisions yet.</p> : (
                <Timeline items={history.map((h) => ({ id: h.id, icon: h.action === "Approved" ? Check : X, tone: h.action === "Approved" ? "green" : "red", title: h.req, meta: `${h.action} by ${h.by} · ${h.at}`, body: h.note }))} />
              )}
            </Card>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={dialog !== null}
        onClose={() => setDialog(null)}
        onConfirm={decide}
        danger={dialog === "reject"}
        title={dialog === "approve" ? "Approve discount" : "Reject discount"}
        confirmLabel={dialog === "approve" ? "Approve" : "Reject"}
        message={sel && <>{sel.createdBy} requested <span className="font-semibold text-[#333]">{formatCurrency(sel.discount)}</span> ({reqPct.toFixed(1)}%) on {sel.id} v{sel.version}.</>}
      >
        {dialog === "approve" && (
          <Field label="Counter-offer amount (optional)" hint="Leave blank to approve the requested amount" htmlFor="dr-counter">
            <TextInput id="dr-counter" type="number" min={0} value={counter} onChange={(e) => { setCounter(e.target.value); setError(""); }} className="no-spinner" onWheel={(e) => e.currentTarget.blur()} />
          </Field>
        )}
        <Field label={dialog === "reject" ? "Reason" : "Comment"} required={dialog === "reject"} error={error} htmlFor="dr-comment">
          <TextArea id="dr-comment" value={comment} onChange={(e) => { setComment(e.target.value); setError(""); }} />
        </Field>
      </ConfirmDialog>
    </>
  );
}

// ── Quote History ────────────────────────────────────────────────────────────
export function QuoteHistory() {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const data = useSalesData();
  const [params, setParams] = useSearchParams();
  const ids = Array.from(new Set(data.quotes.map((q) => q.id)));
  const quoteId = ids.includes(params.get("quote") ?? "") ? params.get("quote")! : ids[0];
  const versions = data.quotes.filter((q) => q.id === quoteId).sort((a, b) => b.version - a.version);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  if (!quoteId) {
    return (<><PageHeader /><NoQuotes /></>);
  }

  const current = versions.find((v) => v.version === selectedVersion) ?? versions[0];
  const prev = versions.find((v) => v.version === current.version - 1);
  const accepted = versions.find((v) => v.status === "Accepted");
  const customer = customerById(current.customerId);
  const deal = accepted && data.deals.find((d) => d.quoteId === accepted.id && d.quoteVersion === accepted.version);

  const columns: Column<Quote>[] = [
    { key: "version", header: "Version", render: (q) => <span className="font-medium">v{q.version}</span> },
    { key: "date", header: "Date", render: (q) => fmtDate(q.date) },
    { key: "vehicle", header: "Vehicle", render: (q) => q.stockNo },
    { key: "total", header: "Total", align: "right", render: (q) => formatCurrency(q.total) },
    { key: "status", header: "Status", render: (q) => <span className="inline-flex gap-1"><StatusBadge status={q.status} />{q.status === "Accepted" && <Badge tone="brand">Drives the deal</Badge>}</span> },
    { key: "act", header: "", align: "right", render: (q) => <SmallButton icon={Eye} onClick={(e) => { e.stopPropagation(); setSelectedVersion(q.version); }}>Preview</SmallButton> },
  ];

  return (
    <>
      <PageHeader actions={<PrimaryButton icon={Plus} onClick={() => navigate(screenPath("quotation", "new-quote") + `?enquiry=${current.enquiryId}&stock=${current.stockNo}`)}>New revision</PrimaryButton>} />
      <div className="flex gap-2 flex-wrap mb-4">
        {ids.map((id) => {
          const c = customerById(data.quotes.find((q) => q.id === id)?.customerId);
          return (
            <button key={id} type="button" onClick={() => { setParams({ quote: id }, { replace: true }); setSelectedVersion(null); }}
              className={`text-left px-3 py-2 rounded-lg border cursor-pointer ${id === quoteId ? "border-[#ff4f31] bg-[#fff6f4]" : "border-[#e5e7eb] bg-white hover:bg-[#fafafa]"}`}>
              <span className="block text-[13px] font-medium text-[#333]">{id}</span>
              <span className="block text-[11px] text-[#999]">{c?.name ?? "Unknown customer"}</span>
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
        <Card title={`Revisions of ${quoteId}`} subtitle={`${customer?.name ?? "Unknown customer"} · ${current.enquiryId}`} className="lg:col-span-3">
          <DataTable columns={columns} rows={versions} rowKey={(q) => keyOf(q)} onRowClick={(q) => setSelectedVersion(q.version)} paginate={false} />
          {accepted ? (
            <Notice tone="success" className="mt-4" title={`v${accepted.version} accepted`}
              action={<SmallButton variant="primary" onClick={() => navigate(deal ? `${screenPath("sales-order", "sale-details")}?deal=${deal.id}` : `${screenPath("sales-order", "sale-details")}?quote=${keyOf(accepted)}`)}>{deal ? `Open deal ${deal.id}` : "Create deal"}</SmallButton>}>
              The accepted version is the one that becomes the deal. Earlier versions are kept read-only.
            </Notice>
          ) : <Notice tone="info" className="mt-4">No version accepted yet. Use Customer Quote Link to record the customer's answer.</Notice>}
        </Card>
        <Card title={`Preview v${current.version}`} className="lg:col-span-2" actions={<StatusBadge status={current.status} />}>
          <KeyValueGrid cols={2} items={[
            { label: "Customer", value: customer?.name ?? "—" },
            { label: "Date", value: fmtDate(current.date) },
            { label: "Vehicle", value: `${current.stockNo} · ${stockByNo(current.stockNo)?.model ?? ""}` },
            { label: "Total", value: <span className="font-semibold">{formatCurrency(current.total)}</span> },
          ]} />
          {prev ? (
            <div className="mt-4 bg-[#fafafa] border border-[#f0f0f0] rounded-lg px-3 py-2.5 text-[12px] text-[#555]">
              Change vs v{prev.version}: <span className={current.total < prev.total ? "text-[#3aa400]" : "text-[#e53e3e]"}>{formatCurrency(current.total - prev.total)}</span>
            </div>
          ) : <p className="mt-4 text-[12px] text-[#999]">First version of this quote.</p>}
          <div className="flex gap-2 mt-4 flex-wrap">
            <SmallButton icon={Printer} onClick={() => navigate(`${screenPath("quotation", "print-quote")}?quote=${keyOf(current)}`)}>Print</SmallButton>
            <SmallButton icon={Link2} onClick={() => navigate(`${screenPath("quotation", "customer-quote-link")}?quote=${keyOf(current)}`)}>Customer link</SmallButton>
          </div>
        </Card>
      </div>
    </>
  );
}

// ── Customer Quote Link ──────────────────────────────────────────────────────
const SHAREABLE: QuoteStatus[] = ["Sent", "Viewed", "Accepted", "Changes requested"];

export function CustomerQuoteLink() {
  const data = useSalesData();
  const list = data.quotes.filter((q) => SHAREABLE.includes(q.status));
  const [quote, select] = useQuoteParam(list);

  return (
    <>
      <PageHeader />
      {!quote ? (
        <NoQuotes message="Only sent quotes can be shared. Create a quote (and get any discount approved) first." />
      ) : (
        <>
          <QuotePicker quotes={list} value={quote} onChange={select} />
          <QuoteLinkView key={keyOf(quote)} quote={quote} />
        </>
      )}
    </>
  );
}

function QuoteLinkView({ quote }: { quote: Quote }) {
  const navigate = useNavigate();
  const { formatCurrency, taxConfig } = useCurrency();
  const data = useSalesData();
  const [meta] = useQuoteMeta();
  const q = computeQuote(inputOf(quote, meta[keyOf(quote)]), taxConfig.percentage);
  const customer = customerById(quote.customerId);
  const ref = `${quote.id} v${quote.version}`;
  const mockUrl = `https://portal.truegear.example/quote/${quote.id}-v${quote.version}`;
  const [mode, setMode] = useState<"viewing" | "changes">("viewing");
  const [agree, setAgree] = useState(false);
  const [signName, setSignName] = useState("");
  const [changes, setChanges] = useState("");
  const [err, setErr] = useState("");
  const hasDeal = data.deals.some((d) => d.quoteId === quote.id && d.quoteVersion === quote.version && d.status !== "Cancelled");

  const log = (type: string, note: string, by: string) =>
    salesStore.add("activities", { id: salesStore.localId("ACT"), customerId: quote.customerId, enquiryId: quote.enquiryId, type, date: new Date().toISOString(), note: `${ref} ${note}`, by });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(mockUrl);
      previewToast("Mock link copied");
    } catch {
      previewToast("Mock link shown on screen");
    }
    log("Quote link", "link generated", quote.createdBy);
  };

  const markViewed = () => {
    salesStore.update("quotes", (x) => keyOf(x) === keyOf(quote), { status: "Viewed" });
    log("Quote link", "opened by customer", customer?.name ?? "Customer");
  };

  const accept = () => {
    if (!agree || !signName.trim()) { setErr("Tick the terms and type your full name to accept"); return; }
    setErr("");
    salesStore.update("quotes", (x) => keyOf(x) === keyOf(quote), { status: "Accepted" });
    log("Quote accepted", `accepted by ${signName.trim()}`, signName.trim());
    previewToast(`${ref} accepted`);
  };
  const sendChanges = () => {
    if (!changes.trim()) { setErr("Describe the changes you would like"); return; }
    setErr("");
    salesStore.update("quotes", (x) => keyOf(x) === keyOf(quote), { status: "Changes requested" });
    log("Quote changes", `changes requested: ${changes.trim()}`, customer?.name ?? "Customer");
    previewToast("Change request recorded");
  };
  const resetToSent = () => {
    salesStore.update("quotes", (x) => keyOf(x) === keyOf(quote), { status: "Sent" });
    setMode("viewing"); setAgree(false); setSignName(""); setChanges(""); setErr("");
  };

  const events = data.activities
    .filter((a) => a.note.startsWith(ref + " "))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((a) => ({
      id: a.id,
      icon: a.type === "Quote accepted" ? CircleCheck : a.type === "Quote changes" ? MessageSquareText : a.note.includes("opened") ? Eye : Mail,
      tone: (a.type === "Quote accepted" ? "green" : a.type === "Quote changes" ? "amber" : a.note.includes("opened") ? "violet" : "blue") as "green" | "amber" | "violet" | "blue",
      title: a.note.slice(ref.length + 1),
      meta: `${new Date(a.date).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} · ${a.by}`,
    }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
      <div className="lg:col-span-2 space-y-5">
        <Card title="Share link" subtitle={`${ref} · ${customer?.name ?? "Unknown customer"}`}>
          <Field label="Login-free quote link (mock)" htmlFor="ql-url">
            <div className="flex gap-2">
              <TextInput id="ql-url" value={mockUrl} readOnly className="font-mono text-[11px]" />
              <SmallButton icon={Copy} onClick={copy}>Copy</SmallButton>
            </div>
          </Field>
          <div className="flex gap-2 mt-3 flex-wrap">
            <span title="Sending is not connected yet"><SmallButton icon={Mail} disabled>Send by email</SmallButton></span>
            <span title="Sending is not connected yet"><SmallButton icon={MessageCircle} disabled>Send by WhatsApp</SmallButton></span>
          </div>
          <Notice tone="info" className="mt-3">This is a mock address — it does not open a real page. Email and WhatsApp sending are disabled; no message is sent{customer ? ` to ${customer.email || customer.phone}` : ""}.</Notice>
        </Card>
        <Card title="Quotation QR" subtitle="Printed on the quotation — the customer pays using this reference">
          <div className="flex items-center gap-4">
            <QuoteQr quote={quote} size={104} />
            <p className="text-[12px] text-[#555]">Reference <span className="font-mono font-semibold text-[#333]">{paymentRef(quote)}</span> links the payment to {quote.enquiryId} and this quote version.</p>
          </div>
        </Card>
        <Card title="Link activity" icon={History}>
          {events.length ? <Timeline items={events} /> : <p className="text-[12px] text-[#999]">No activity yet. Copy the link or answer as the customer on the right.</p>}
        </Card>
        {(quote.status === "Accepted" || quote.status === "Changes requested") && !hasDeal && (
          <SecondaryButton className="w-full" onClick={resetToSent}>Reset customer answer (back to Sent)</SecondaryButton>
        )}
      </div>

      <div className="lg:col-span-3">
        <p className="text-[12px] text-[#999] mb-2 flex items-center gap-1"><Eye size={12} /> Customer view (answer here to test the flow)</p>
        <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-[2px_3px_20px_0px_rgba(0,0,0,0.06)] overflow-hidden max-w-xl">
          <div className="bg-linear-to-r from-[#ff4f31] to-[#fe2b73] px-5 py-4 text-white">
            <p className="text-[12px] opacity-90">ELT Group · {q.vehicle?.branch ?? "Dealership"}</p>
            <p className="text-[18px] font-semibold">Your vehicle quote</p>
            <p className="text-[12px] opacity-90">{ref} · valid until {fmtDate(addDays(quote.date, QUOTE_VALID_DAYS))}</p>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-[13px] text-[#333]">Hi {customer?.name.split(" ")[0] ?? "there"}, here is the quote we discussed for the <span className="font-medium">{q.vehicle?.model ?? quote.stockNo}</span>.</p>
            <div className="border border-[#f0f0f0] rounded-lg overflow-hidden"><QuoteLinesTable lines={q.lines} formatCurrency={formatCurrency} /></div>
            <SummaryRows
              rows={[
                { label: "Total incl. VAT", value: formatCurrency(q.total) },
                ...(q.netTradeIn ? [{ label: "Your trade-in", value: formatCurrency(-q.netTradeIn), negative: true }] : []),
              ]}
              total={{ label: "Amount payable", value: formatCurrency(q.payable) }}
            />

            {quote.status === "Sent" && (
              <SmallButton icon={Eye} onClick={markViewed}>Mark as opened by customer</SmallButton>
            )}
            {(quote.status === "Sent" || quote.status === "Viewed") && mode === "viewing" && (
              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-2 text-[12px] text-[#555]">
                  <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setErr(""); }} className="accent-[#ff4f31] mt-0.5" />
                  I accept this quote and the dealership terms. Prices are subject to vehicle availability.
                </label>
                <Field label="Type your full name to sign" required htmlFor="ql-sign">
                  <TextInput id="ql-sign" value={signName} onChange={(e) => { setSignName(e.target.value); setErr(""); }} placeholder={customer?.name ?? "Full name"} />
                </Field>
                {err && <p className="text-[11px] text-[#FE2B73]" role="alert">{err}</p>}
                <div className="flex gap-2 flex-wrap">
                  <PrimaryButton icon={Check} onClick={accept}>Accept quote</PrimaryButton>
                  <SecondaryButton onClick={() => { setMode("changes"); setErr(""); }}>Request changes</SecondaryButton>
                </div>
              </div>
            )}
            {(quote.status === "Sent" || quote.status === "Viewed") && mode === "changes" && (
              <div className="space-y-3 pt-2">
                <Field label="What would you like changed?" required error={err} htmlFor="ql-changes">
                  <TextArea id="ql-changes" value={changes} onChange={(e) => { setChanges(e.target.value); setErr(""); }} placeholder="e.g. Please remove the nudge bar and quote the 7-year maintenance plan" />
                </Field>
                <div className="flex gap-2">
                  <PrimaryButton onClick={sendChanges}>Send request</PrimaryButton>
                  <SecondaryButton onClick={() => setMode("viewing")}>Back</SecondaryButton>
                </div>
              </div>
            )}
            {quote.status === "Accepted" && (
              <Notice tone="success" title="Quote accepted"
                action={<SmallButton variant="primary" onClick={() => navigate(`${screenPath("sales-order", "sale-details")}?quote=${keyOf(quote)}`)}>{hasDeal ? "Open deal" : "Create deal"}</SmallButton>}>
                The sales executive can now turn this quote into a deal.
              </Notice>
            )}
            {quote.status === "Changes requested" && (
              <Notice tone="warning" title="Change request sent"
                action={<SmallButton onClick={() => navigate(`${screenPath("quotation", "new-quote")}?enquiry=${quote.enquiryId}&stock=${quote.stockNo}`)}>Create revised quote</SmallButton>}>
                The sales executive will send a revised quote.
              </Notice>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Print Quote ──────────────────────────────────────────────────────────────
// Print isolation is scoped to this screen: while it is mounted, printing
// hides everything except the quote document (sidebar, header, toolbar).
const PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  #vs-print-quote, #vs-print-quote * { visibility: visible !important; }
  #vs-print-quote { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; }
  @page { margin: 14mm; }
}`;

// QR on every quotation: carries the payment reference and the deal trail
// (quote version → enquiry → customer → total), so a payment quoting the
// reference is matched back to its quote, enquiry and deal.
const paymentRef = (q: Quote) => `${q.id}-V${q.version}`;
function QuoteQr({ quote, size = 88 }: { quote: Quote; size?: number }) {
  const value = ["TRUEGEAR", `REF=${paymentRef(quote)}`, `ENQ=${quote.enquiryId}`, `CUST=${quote.customerId}`, `TOTAL=${Math.round(quote.total)}`].join("|");
  return (
    <div className="inline-flex flex-col items-center gap-1">
      <QRCodeSVG value={value} size={size} level="M" marginSize={1} title={`Quotation ${paymentRef(quote)}`} />
      <span className="text-[10px] text-[#666] font-mono">{paymentRef(quote)}</span>
    </div>
  );
}

export function PrintQuote() {
  const { formatCurrency, taxConfig } = useCurrency();
  const data = useSalesData();
  const [meta] = useQuoteMeta();
  const list = data.quotes.filter((q) => q.status !== "Superseded");
  const [quote, select] = useQuoteParam(list);
  const [showTradeIn, setShowTradeIn] = useState(true);
  const quoteMeta = quote ? meta[keyOf(quote)] : undefined;
  const q = useMemo(() => (quote ? computeQuote(inputOf(quote, quoteMeta), taxConfig.percentage) : null), [quote, quoteMeta, taxConfig.percentage]);

  if (!quote || !q) {
    return (<><PageHeader /><NoQuotes /></>);
  }

  const customer = customerById(quote.customerId);
  const exec = userById(enquiryById(quote.enquiryId)?.ownerId);
  const v = q.vehicle;
  const validUntil = addDays(quote.date, QUOTE_VALID_DAYS);

  return (
    <>
      <style>{PRINT_CSS}</style>
      <div className="print:hidden">
        <PageHeader actions={
          <>
            <label className="flex items-center gap-2 text-[12px] text-[#555] mr-2">
              <Toggle checked={showTradeIn} onChange={setShowTradeIn} label="Show trade-in on printout" /> Show trade-in
            </label>
            <PrimaryButton icon={Printer} onClick={() => window.print()}>Print quote</PrimaryButton>
          </>
        } />
        <QuotePicker quotes={list} value={quote} onChange={select} />
        <Notice tone="info" className="mb-5">Uses the browser print dialog (choose “Save as PDF” to keep a copy). No PDF is generated or stored by TrueGear.</Notice>
      </div>

      <article id="vs-print-quote" className="bg-white border border-[#e5e7eb] rounded-xl shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)] p-6 sm:p-10 max-w-4xl mx-auto text-[#333]">
        <header className="flex items-start justify-between gap-6 flex-wrap border-b-2 border-[#ff4f31] pb-5">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="ELT Group" className="w-16 h-auto" />
            <div>
              <p className="text-[18px] font-semibold">ELT Group{v ? ` — ${v.branch}` : ""}</p>
              <p className="text-[11px] text-[#666]">Demo dealership address · sales@elt-demo.example.com</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="text-right">
              <p className="text-[22px] font-semibold tracking-wide">QUOTATION</p>
              <p className="text-[12px] text-[#666]">{quote.id} · Version {quote.version}</p>
              <p className="text-[12px] text-[#666]">Date {fmtDate(quote.date)} · Valid until {fmtDate(validUntil)}</p>
              <p className="text-[12px] text-[#333] mt-1">Pay using reference <span className="font-mono font-semibold">{paymentRef(quote)}</span></p>
            </div>
            <QuoteQr quote={quote} />
          </div>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-6 py-5">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-[#999] mb-1">Customer</p>
            <p className="text-[14px] font-medium">{customer?.name ?? "—"}</p>
            {customer && <p className="text-[12px] text-[#555]">{[customer.phone, customer.email].filter(Boolean).join(" · ")}</p>}
            {customer && <p className="text-[12px] text-[#555]">{customer.city}{customer.arAccount ? ` · Account ${customer.arAccount}` : ""}</p>}
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-[#999] mb-1">Vehicle</p>
            {v ? (
              <>
                <p className="text-[14px] font-medium">{v.year} {v.make} {v.model}</p>
                <p className="text-[12px] text-[#555]">Stock {v.stockNo} · {v.colour} · {v.modelCode}</p>
                <p className="text-[12px] text-[#555] font-mono">VIN {v.vin}</p>
              </>
            ) : <p className="text-[14px] font-medium">{quote.stockNo}</p>}
          </div>
        </section>

        <section className="border border-[#e5e7eb] rounded-lg overflow-hidden">
          <QuoteLinesTable lines={q.lines} formatCurrency={formatCurrency} />
        </section>

        <section className="flex justify-end mt-4">
          <div className="w-full sm:w-80 print:w-80">
            <SummaryRows
              rows={[
                { label: "Subtotal (excl. VAT)", value: formatCurrency(q.subtotal) },
                { label: `Discount & promotions`, value: formatCurrency(q.lines.filter((l) => l.amount < 0).reduce((n, l) => n + l.amount, 0)), negative: true },
                { label: `${taxConfig.label} (${taxConfig.percentage}%)`, value: formatCurrency(q.vat) },
                { label: "Total incl. VAT", value: formatCurrency(q.total) },
                ...(showTradeIn && q.netTradeIn ? [{ label: "Less trade-in allowance", value: formatCurrency(-q.netTradeIn), negative: true }] : []),
              ]}
              total={{ label: "Amount payable", value: formatCurrency(showTradeIn ? q.payable : q.total) }}
            />
          </div>
        </section>

        <section className="mt-6 text-[11px] text-[#666] leading-relaxed">
          <p className="font-semibold text-[#333] text-[12px] mb-1">Terms & conditions</p>
          <ol className="list-decimal ml-4 space-y-0.5">
            <li>This quotation is valid until {fmtDate(validUntil)} and subject to vehicle availability.</li>
            <li>Prices include {taxConfig.label} at {taxConfig.percentage}% where indicated. Insurance and licensing fees are not subject to {taxConfig.label}.</li>
            <li>Trade-in value is subject to final inspection on delivery and settlement confirmation.</li>
            <li>OEM incentives apply only while the manufacturer programme is active.</li>
            <li>The vehicle is reserved only once a deposit has been received and confirmed.</li>
          </ol>
        </section>

        <footer className="grid grid-cols-2 gap-10 mt-10 text-[11px] text-[#666]">
          <div><div className="border-b border-[#999] h-10" /><p className="mt-1">Customer signature & date</p></div>
          <div><div className="border-b border-[#999] h-10" /><p className="mt-1">Sales executive: {exec?.name ?? quote.createdBy}</p></div>
        </footer>
        <p className="mt-6 text-center text-[10px] text-[#bbb] print:block">Test quotation — not a binding offer.</p>
      </article>
    </>
  );
}
