// Modules 6, 8, 9 — Sales Order, Sales Invoice, Payment. Deals are saved on the
// server (data/store.ts). Payments and reservations stay in TrueGear. Evolve
// is used for: 12 OTPMaintenance (Send Sale to Evolve) and 25
// MaintenanceVehicleDeals (Fleet Sale) — both refused by the server until
// writes are switched on — plus the live reads 09 (Sale Status), 26 and 20
// (Download Invoice).

import { useMemo, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Receipt, Wallet, CircleCheck, Plus, FileText, Download, Send, Truck, Trash2, History, ShieldCheck,
  Clock, Check, X, Ban, Banknote, Car, User, Code, LayoutList, FileDown, Hourglass, Link2,
} from "lucide-react";
import Modal from "../../../components/common/Modal";
import { useCurrency } from "../../../context/CurrencyContext";
import {
  PageHeader, Card, KpiGrid, KpiCard, DataTable, StatusBadge, SmallButton, PrimaryButton, SecondaryButton,
  Field, TextInput, SelectInput, TextArea, FormGrid, SummaryRows, ConfirmDialog, KeyValueGrid, Notice,
  PendingUatNotice, Timeline, EmptyState, Badge, RadioCards, Tabs, type Column, type Tone,
} from "../components/ui";
import { currentUserName, previewToast } from "../components/helpers";
import { EvolveLiveCard, EvolveWriteActions } from "../components/evolve";
import { evolveErrorMessage, unwrap } from "../components/evolveHooks";
import {
  getEvolveDealHistory, getEvolveDocument, listEvolveDeals, sendEvolveFleetDeal, sendEvolveOtp,
  type FleetDeal as EvolveFleetDeal, type OtpDeal,
} from "../../../api/vehicleSalesEvolve.api";
import { screenPath } from "../registry";
import { useSalesAccess } from "../access";
import {
  ACCESSORIES, FI_PRODUCTS, MAINTENANCE_PLANS, ON_ROAD, OEM_INCENTIVES, SALES_USERS, EXECUTIVES, MANAGERS, FI_MANAGERS, fmtDate,
} from "../data/mock";
import {
  salesStore, useSalesData, usePersistentState, customerById, enquiryById, stockByNo, userById, today,
  type Deal, type DealStatus, type Payment, type Quote,
} from "../data/store";

const stamp = () => new Date().toISOString().slice(0, 16).replace("T", " ");
const addDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const quoteKey = (q: Quote) => `${q.id}-v${q.version}`;

function logActivity(deal: Deal, type: string, note: string, by: string) {
  salesStore.add("activities", { id: salesStore.localId("ACT"), customerId: deal.customerId, enquiryId: deal.enquiryId || undefined, type, date: new Date().toISOString(), note, by });
}

// ── shared deal maths ────────────────────────────────────────────────────────
function dealTotals(deal: Deal, vatPct: number) {
  const vehicle = stockByNo(deal.stockNo);
  const accessories = ACCESSORIES.filter((a) => deal.accessories.includes(a.code));
  const fi = FI_PRODUCTS.filter((f) => deal.fi.includes(f.code));
  const plan = MAINTENANCE_PLANS.find((m) => m.code === deal.maintenance) ?? null; // optional
  const planPrice = plan?.price ?? 0;
  const accTotal = accessories.reduce((n, a) => n + a.price, 0);
  const fiTotal = fi.reduce((n, f) => n + f.price, 0);
  const onRoad = ON_ROAD.reduce((n, o) => n + o.price, 0);
  const vehicleNet = deal.vehiclePrice - deal.discount;
  const vatBase = vehicleNet + accTotal + planPrice;
  const vat = vatBase * (vatPct / 100);
  const total = vehicleNet + accTotal + fiTotal + planPrice + onRoad + vat;
  const tradeNet = deal.tradeIn ? deal.tradeIn.value - deal.tradeIn.settlement : 0;
  const balance = total - tradeNet - deal.deposit;
  const cost = vehicle?.cost ?? 0;
  const frontGp = vehicleNet - cost;
  const backGp = Math.round(accTotal * 0.35 + fiTotal * 0.22 + planPrice * 0.18);
  const paid = deal.payments.reduce((n, p) => n + p.amount, 0);
  return { vehicle, accessories, fi, plan, accTotal, fiTotal, onRoad, vehicleNet, vat, total, tradeNet, balance, cost, frontGp, backGp, paid };
}

// Selected deal lives in ?deal=; defaults to the newest deal.
function useDealParam(filter?: (d: Deal) => boolean) {
  const data = useSalesData();
  const [params, setParams] = useSearchParams();
  const list = filter ? data.deals.filter(filter) : data.deals;
  const deal = list.find((d) => d.id === params.get("deal")) ?? list[0];
  const select = (id: string) => setParams((p) => { p.set("deal", id); p.delete("quote"); p.delete("new"); return p; }, { replace: true });
  return { deal, list, select };
}

function DealHeaderCard({ deal, list, onSelect }: { deal: Deal; list: Deal[]; onSelect: (id: string) => void }) {
  const v = stockByNo(deal.stockNo);
  const customer = customerById(deal.customerId);
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-xl px-4 sm:px-5 py-3.5 mb-5 flex items-center gap-x-8 gap-y-2 flex-wrap shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)]">
      <div>
        <p className="text-[11px] text-[#999]">Deal</p>
        {list.length > 1 ? (
          <select aria-label="Select deal" value={deal.id} onChange={(e) => onSelect(e.target.value)}
            className="text-[14px] font-semibold text-[#ff4f31] bg-transparent border border-[#e5e7eb] rounded-md px-1.5 py-0.5 cursor-pointer">
            {list.map((d) => <option key={d.id} value={d.id}>{d.id} · {customerById(d.customerId)?.name ?? "Unknown"}</option>)}
          </select>
        ) : <p className="text-[14px] font-semibold text-[#ff4f31]">{deal.id}</p>}
      </div>
      <div><p className="text-[11px] text-[#999]">Customer</p><p className="text-[13px] text-[#333]">{customer?.name ?? "—"}</p></div>
      <div><p className="text-[11px] text-[#999]">Vehicle</p><p className="text-[13px] text-[#333]">{v ? `${v.stockNo} · ${v.model}` : deal.stockNo}</p></div>
      <div><p className="text-[11px] text-[#999]">{deal.fleet ? "Fleet deal" : "Accepted quote"}</p><p className="text-[13px] text-[#333]">{deal.fleet ? "Yes" : `${deal.quoteId} v${deal.quoteVersion}`}</p></div>
      <div className="ml-auto"><StatusBadge status={deal.status} tone={deal.status === "Cancellation requested" ? "amber" : deal.status === "Awaiting finance" ? "amber" : deal.status === "Delivered" ? "green" : undefined} /></div>
    </div>
  );
}

function NoDeal({ message }: { message?: string }) {
  const navigate = useNavigate();
  return (
    <EmptyState icon={Receipt} title="No deals yet" message={message ?? "Create a deal from an accepted quote on Sale Details."}
      action={<SmallButton variant="primary" icon={Plus} onClick={() => navigate(screenPath("sales-order", "sale-details"))}>Create deal</SmallButton>} />
  );
}

// ── Sale Details ─────────────────────────────────────────────────────────────
export function SaleDetails() {
  const data = useSalesData();
  const [params] = useSearchParams();
  const { deal, list, select } = useDealParam();
  const wantsNew = params.get("new") === "1" || !!params.get("quote");
  const quoteDeal = params.get("quote") ? data.deals.find((d) => `${d.quoteId}-v${d.quoteVersion}` === params.get("quote") && d.status !== "Cancelled") : undefined;

  if (quoteDeal) return <SaleDetailsForm key={quoteDeal.id} deal={quoteDeal} list={list} onSelect={select} />;
  if (!deal || wantsNew) return <CreateDealFromQuote onCreated={select} />;
  return <SaleDetailsForm key={deal.id} deal={deal} list={list} onSelect={select} />;
}

function CreateDealFromQuote({ onCreated }: { onCreated: (id: string) => void }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { formatCurrency, taxConfig } = useCurrency();
  const data = useSalesData();
  const promoMeta = (data.extra["quotes.meta"] ?? {}) as Record<string, { promotion?: string }>;
  const hasDeal = (q: Quote) => data.deals.some((d) => d.quoteId === q.id && d.quoteVersion === q.version && d.status !== "Cancelled");
  const accepted = data.quotes.filter((q) => q.status === "Accepted" && !hasDeal(q));
  const [key, setKey] = useState(accepted.some((q) => quoteKey(q) === params.get("quote")) ? params.get("quote")! : accepted[0] ? quoteKey(accepted[0]) : "");
  const quote = accepted.find((q) => quoteKey(q) === key);
  const enquiry = enquiryById(quote?.enquiryId);
  const customer = customerById(quote?.customerId);
  const [repId, setRepId] = useState("");
  const [managerId, setManagerId] = useState("");
  const [fiId, setFiId] = useState("");
  const [ar, setAr] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (accepted.length === 0) {
    return (
      <>
        <PageHeader />
        <EmptyState icon={FileText} title="No accepted quotes waiting for a deal" message="A deal starts from a quote the customer accepted. Record the acceptance on Customer Quote Link."
          action={<div className="flex gap-2 flex-wrap justify-center">
            <SmallButton variant="primary" icon={Link2} onClick={() => navigate(screenPath("quotation", "customer-quote-link"))}>Customer quote link</SmallButton>
            <SmallButton icon={Plus} onClick={() => navigate(screenPath("quotation", "new-quote"))}>New quote</SmallButton>
            {data.deals.length > 0 && <SmallButton onClick={() => onCreated(data.deals[0].id)}>Back to deals</SmallButton>}
          </div>} />
      </>
    );
  }

  const effRep = repId || enquiry?.ownerId || "";
  const effAr = ar || customer?.arAccount || "";
  const promo = quote ? OEM_INCENTIVES.find((p) => p.code === promoMeta[quoteKey(quote)]?.promotion) : undefined;

  const create = async () => {
    const e: Record<string, string> = {};
    if (!quote) e.quote = "Select the accepted quote";
    if (!effRep) e.rep = "Select the sales representative";
    if (!managerId) e.manager = "Select the sales manager";
    if (!effAr.trim()) e.ar = "Enter the customer AR account";
    setErrors(e);
    if (Object.keys(e).length || !quote) return;
    const status: DealStatus = enquiry?.finance === "Bank finance" ? "Awaiting finance" : "Awaiting invoice";
    const dealNo = await salesStore.nextNumber("DL");
    const deal: Deal = {
      id: dealNo, quoteId: quote.id, quoteVersion: quote.version, enquiryId: quote.enquiryId, customerId: quote.customerId,
      stockNo: quote.stockNo, repId: effRep, managerId, fiId, arAccount: effAr.trim().toUpperCase(), vehiclePrice: quote.vehiclePrice,
      discount: quote.discount + (promo?.amount ?? 0), accessories: quote.accessories, fi: quote.fi, maintenance: quote.maintenance,
      tradeIn: quote.tradeIn, deposit: quote.deposit, status, created: today(), payments: [], financeStatus: "Not started",
    };
    salesStore.add("deals", deal);
    salesStore.update("enquiries", (x) => x.id === quote.enquiryId, { status: "Negotiation" });
    logActivity(deal, "Deal", `Deal ${deal.id} created from ${quote.id} v${quote.version}`, userById(effRep)?.name ?? "Sales executive");
    previewToast(`Deal ${deal.id} created`);
    onCreated(deal.id);
  };

  return (
    <>
      <PageHeader />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-5">
          <Card title="Create deal from accepted quote" subtitle="The accepted quote drives the deal: vehicle, products, discount, trade-in and deposit are copied across.">
            <FormGrid>
              <Field label="Accepted quote" required error={errors.quote} htmlFor="cd-quote">
                <SelectInput id="cd-quote" value={key} onChange={(e) => setKey(e.target.value)} error={!!errors.quote}
                  options={accepted.map((q) => ({ value: quoteKey(q), label: `${q.id} v${q.version} — ${customerById(q.customerId)?.name ?? "Unknown"}` }))} />
              </Field>
              <Field label="Customer"><TextInput value={customer?.name ?? ""} disabled /></Field>
              <Field label="Sales representative" required error={errors.rep} htmlFor="cd-rep">
                <SelectInput id="cd-rep" value={effRep} onChange={(e) => setRepId(e.target.value)} error={!!errors.rep} placeholder="Select" options={EXECUTIVES.map((u) => ({ value: u.id, label: `${u.name}${u.evolveRep ? ` (${u.evolveRep})` : " — not linked"}` }))} />
              </Field>
              <Field label="Sales manager" required error={errors.manager} htmlFor="cd-mgr">
                <SelectInput id="cd-mgr" value={managerId} onChange={(e) => setManagerId(e.target.value)} error={!!errors.manager} placeholder="Select" options={MANAGERS.map((u) => ({ value: u.id, label: `${u.name} (${u.evolveRep})` }))} />
              </Field>
              <Field label="F&I manager" htmlFor="cd-fi">
                <SelectInput id="cd-fi" value={fiId} onChange={(e) => setFiId(e.target.value)} placeholder="None" options={FI_MANAGERS.map((u) => ({ value: u.id, label: `${u.name} (${u.evolveRep})` }))} />
              </Field>
              <Field label="Customer AR account" required error={errors.ar} htmlFor="cd-ar">
                <TextInput id="cd-ar" value={effAr} onChange={(e) => setAr(e.target.value)} error={!!errors.ar} placeholder="e.g. AR20001" />
              </Field>
            </FormGrid>
          </Card>
        </div>
        <div className="space-y-5 lg:sticky lg:top-0">
          {quote && (
            <Card title="From the quote">
              <KeyValueGrid cols={2} items={[
                { label: "Vehicle", value: quote.stockNo },
                { label: "Quote total", value: formatCurrency(quote.total) },
                { label: "Discount", value: formatCurrency(quote.discount + (promo?.amount ?? 0)) },
                { label: "Deposit", value: formatCurrency(quote.deposit) },
                { label: "Finance", value: enquiry?.finance ?? "—" },
                { label: `${taxConfig.label}`, value: `${taxConfig.percentage}%` },
              ]} />
            </Card>
          )}
          <PrimaryButton className="w-full!" icon={Plus} onClick={create}>Create deal</PrimaryButton>
          {data.deals.length > 0 && <SecondaryButton className="w-full" onClick={() => onCreated(data.deals[0].id)}>Cancel</SecondaryButton>}
        </div>
      </div>
    </>
  );
}

function SaleDetailsForm({ deal, list, onSelect }: { deal: Deal; list: Deal[]; onSelect: (id: string) => void }) {
  const navigate = useNavigate();
  const [, setParams] = useSearchParams();
  const { formatCurrency, taxConfig } = useCurrency();
  const t = dealTotals(deal, taxConfig.percentage);
  const customer = customerById(deal.customerId);
  const [repId, setRepId] = useState(deal.repId);
  const [managerId, setManagerId] = useState(deal.managerId);
  const [fiId, setFiId] = useState(deal.fiId);
  const [ar, setAr] = useState(deal.arAccount);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const rep = userById(repId);
  const locked = deal.status === "Cancelled";

  const save = () => {
    const e: Record<string, string> = {};
    if (!repId) e.rep = "Select the sales representative";
    if (!managerId) e.manager = "Select the sales manager";
    if (!ar.trim()) e.ar = "Enter the customer AR account";
    setErrors(e);
    if (Object.keys(e).length) return;
    salesStore.update("deals", (d) => d.id === deal.id, { repId, managerId, fiId, arAccount: ar.trim().toUpperCase() });
    previewToast(`Deal ${deal.id} details updated`);
  };

  return (
    <>
      <PageHeader actions={<>
        <SecondaryButton icon={Plus} onClick={() => setParams({ new: "1" })}>New deal from quote</SecondaryButton>
        <SecondaryButton icon={FileText} onClick={() => navigate(`${screenPath("sales-order", "finance-application")}?deal=${deal.id}`)}>Finance application</SecondaryButton>
        <PrimaryButton icon={Send} onClick={() => navigate(`${screenPath("sales-order", "send-sale-to-evolve")}?deal=${deal.id}`)}>Review for Evolve</PrimaryButton>
      </>} />
      <DealHeaderCard deal={deal} list={list} onSelect={onSelect} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-5">
          <Card title="Customer" icon={User}>
            <KeyValueGrid items={[
              { label: "Name", value: customer?.name ?? "—" },
              { label: "Type", value: customer?.type ?? "—" },
              { label: "Registration / ID no.", value: customer?.regNumber || customer?.idNumber || "—" },
              { label: "Phone", value: customer?.phone || "—" },
              { label: "Email", value: customer?.email || "—" },
              { label: "City", value: customer?.city || "—" },
            ]} />
          </Card>
          <Card title="Deal team & account">
            <FormGrid>
              <Field label="Sales representative" required error={errors.rep} htmlFor="sd-rep">
                <SelectInput id="sd-rep" value={repId} disabled={locked} onChange={(e) => setRepId(e.target.value)} error={!!errors.rep} placeholder="Select" options={EXECUTIVES.map((u) => ({ value: u.id, label: `${u.name}${u.evolveRep ? ` (${u.evolveRep})` : " — not linked"}` }))} />
              </Field>
              <Field label="Sales manager" required error={errors.manager} htmlFor="sd-mgr">
                <SelectInput id="sd-mgr" value={managerId} disabled={locked} onChange={(e) => setManagerId(e.target.value)} error={!!errors.manager} placeholder="Select" options={MANAGERS.map((u) => ({ value: u.id, label: `${u.name} (${u.evolveRep})` }))} />
              </Field>
              <Field label="F&I manager" htmlFor="sd-fi">
                <SelectInput id="sd-fi" value={fiId} disabled={locked} onChange={(e) => setFiId(e.target.value)} placeholder="None" options={FI_MANAGERS.map((u) => ({ value: u.id, label: `${u.name} (${u.evolveRep})` }))} />
              </Field>
              <Field label="Customer AR account" required error={errors.ar} htmlFor="sd-ar">
                <TextInput id="sd-ar" value={ar} disabled={locked} onChange={(e) => setAr(e.target.value)} error={!!errors.ar} placeholder="e.g. AR20001" />
              </Field>
            </FormGrid>
            {rep && !rep.evolveRep && (
              <Notice tone="warning" className="mt-3">
                {rep.name} is not linked to an Evolve sales rep yet. An admin links it in Role &amp; User Management (edit the user); until then the deal cannot be sent to Evolve.
              </Notice>
            )}
          </Card>
          <Card title="Vehicle & products">
            <KeyValueGrid items={[
              { label: "Stock no.", value: deal.stockNo },
              { label: "VIN", value: <span className="font-mono text-[12px]">{t.vehicle?.vin ?? "—"}</span> },
              { label: "Vehicle price", value: formatCurrency(deal.vehiclePrice) },
              { label: "Discount", value: formatCurrency(deal.discount) },
              { label: "Maintenance plan", value: t.plan?.name ?? "None" },
              { label: "Deposit", value: formatCurrency(deal.deposit) },
            ]} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-[12px] font-medium text-[#333] mb-1.5">Accessories</p>
                {t.accessories.length ? <ul className="text-[12px] text-[#555] space-y-1">{t.accessories.map((a) => <li key={a.code} className="flex justify-between"><span>{a.name}</span><span className="tabular-nums">{formatCurrency(a.price)}</span></li>)}</ul> : <p className="text-[12px] text-[#999]">None</p>}
              </div>
              <div>
                <p className="text-[12px] font-medium text-[#333] mb-1.5">Insurance (F&I)</p>
                {t.fi.length ? <ul className="text-[12px] text-[#555] space-y-1">{t.fi.map((f) => <li key={f.code} className="flex justify-between"><span>{f.name}</span><span className="tabular-nums">{formatCurrency(f.price)}</span></li>)}</ul> : <p className="text-[12px] text-[#999]">None</p>}
              </div>
            </div>
            <div className="mt-4 bg-[#fafafa] border border-[#f0f0f0] rounded-lg px-3 py-2.5 text-[12px] text-[#555]">
              <span className="font-medium text-[#333]">Trade-in: </span>
              {deal.tradeIn ? <>{deal.tradeIn.year || ""} {deal.tradeIn.make} {deal.tradeIn.model} · {deal.tradeIn.registration || "—"} · {formatCurrency(deal.tradeIn.value)} (settlement {formatCurrency(deal.tradeIn.settlement)})</> : "None"}
            </div>
          </Card>
        </div>
        <div className="space-y-5 lg:sticky lg:top-0">
          <Card title="Deal pricing">
            <SummaryRows rows={[
              { label: "Vehicle (after discount)", value: formatCurrency(t.vehicleNet) },
              { label: "Accessories", value: formatCurrency(t.accTotal) },
              { label: "F&I insurance", value: formatCurrency(t.fiTotal) },
              { label: "Maintenance plan", value: formatCurrency(t.plan?.price ?? 0) },
              { label: "On-road costs", value: formatCurrency(t.onRoad) },
              { label: `${taxConfig.label} (${taxConfig.percentage}%)`, value: formatCurrency(t.vat), muted: true },
              { label: "Deal total", value: formatCurrency(t.total) },
              { label: "Less trade-in", value: formatCurrency(-t.tradeNet), negative: true },
              { label: "Less deposit", value: formatCurrency(-deal.deposit), negative: true },
            ]} total={{ label: "Balance to finance / pay", value: formatCurrency(t.balance) }} />
          </Card>
          <PrimaryButton className="w-full!" disabled={locked} onClick={save}>Save deal details</PrimaryButton>
          <SecondaryButton className="w-full" icon={ShieldCheck} onClick={() => navigate(`${screenPath("sales-order", "reserve-vehicle")}?deal=${deal.id}`)}>Reserve vehicle</SecondaryButton>
        </div>
      </div>
    </>
  );
}

// ── Finance Application ──────────────────────────────────────────────────────
interface FinanceForm {
  applicant: string; idNumber: string; employment: string; employer: string; occupation: string; yearsEmployed: string;
  gross: string; net: string; expenses: string; address: string; yearsAtAddress: string; prevAddress: string;
  insurer: string; policy: string; bank: string; term: string;
}

const FIN_EMPTY: FinanceForm = {
  applicant: "", idNumber: "", employment: "", employer: "", occupation: "", yearsEmployed: "",
  gross: "", net: "", expenses: "", address: "", yearsAtAddress: "", prevAddress: "",
  insurer: "", policy: "", bank: "", term: "60",
};

const financeKey = (dealId: string) => `sale.finance.${dealId}`;

export function FinanceApplication() {
  const { deal, list, select } = useDealParam();
  return (
    <>
      <PageHeader />
      {deal ? <FinanceForDeal key={deal.id} deal={deal} list={list} onSelect={select} /> : <NoDeal />}
    </>
  );
}

function FinanceForDeal({ deal, list, onSelect }: { deal: Deal; list: Deal[]; onSelect: (id: string) => void }) {
  const { formatCurrency, taxConfig } = useCurrency();
  const t = dealTotals(deal, taxConfig.percentage);
  const customer = customerById(deal.customerId);
  const [saved, setSaved] = usePersistentState<FinanceForm | null>(financeKey(deal.id), null);
  const [f, setF] = useState<FinanceForm>(saved ?? { ...FIN_EMPTY, applicant: customer?.name ?? "", employer: customer?.type === "Company" ? customer.name : "" });
  const [errors, setErrors] = useState<Partial<Record<keyof FinanceForm, string>>>({});
  const status = deal.financeStatus ?? "Not started";
  const editable = status === "Not started" || status === "Declined";
  const set = (k: keyof FinanceForm, v: string) => { setF((p) => ({ ...p, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };

  const gross = Number(f.gross) || 0;
  const net = Number(f.net) || 0;
  const exp = Number(f.expenses) || 0;
  const months = Number(f.term) || 60;
  const rate = 0.1175 / 12;
  const instalment = t.balance > 0 ? (t.balance * rate) / (1 - Math.pow(1 + rate, -months)) : 0;
  const disposable = net - exp;
  const ratio = net ? (instalment / net) * 100 : 0;

  const setFinance = (financeStatus: NonNullable<Deal["financeStatus"]>, msg: string) => {
    salesStore.update("deals", (d) => d.id === deal.id, (d) => ({
      ...d,
      financeStatus,
      status: financeStatus === "Approved" && d.status === "Awaiting finance" ? "Awaiting invoice" : d.status,
    }));
    logActivity(deal, "Finance", `${deal.id}: ${msg}`, currentUserName());
    previewToast(msg);
  };

  const submit = () => {
    const e: Partial<Record<keyof FinanceForm, string>> = {};
    (["applicant", "employment", "employer", "gross", "net", "expenses", "address", "yearsAtAddress", "bank"] as (keyof FinanceForm)[]).forEach((k) => { if (!f[k].trim()) e[k] = "Required"; });
    if (f.yearsAtAddress && Number(f.yearsAtAddress) < 3 && !f.prevAddress.trim()) e.prevAddress = "Required when less than 3 years at current address";
    if (net > gross) e.net = "Net income cannot exceed gross income";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaved(f);
    setFinance("Captured", "Finance application captured");
  };

  const steps = ["Not started", "Captured", "Submitted to bank", "Approved"] as const;
  const idx = status === "Declined" ? 2 : steps.indexOf(status as (typeof steps)[number]);

  return (
    <>
      <DealHeaderCard deal={deal} list={list} onSelect={onSelect} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-5">
          <fieldset disabled={!editable} className="space-y-5 min-w-0">
            <Card title="Applicant & employment">
              <FormGrid>
                <Field label="Applicant / authorised signatory" required error={errors.applicant}><TextInput value={f.applicant} onChange={(e) => set("applicant", e.target.value)} error={!!errors.applicant} /></Field>
                <Field label="ID number"><TextInput value={f.idNumber} onChange={(e) => set("idNumber", e.target.value)} /></Field>
                <Field label="Employment status" required error={errors.employment}>
                  <SelectInput value={f.employment} onChange={(e) => set("employment", e.target.value)} error={!!errors.employment} placeholder="Select" options={["Permanently employed", "Contract", "Self-employed / director", "Pensioner"]} />
                </Field>
                <Field label="Employer" required error={errors.employer}><TextInput value={f.employer} onChange={(e) => set("employer", e.target.value)} error={!!errors.employer} /></Field>
                <Field label="Occupation"><TextInput value={f.occupation} onChange={(e) => set("occupation", e.target.value)} /></Field>
                <Field label="Years with employer"><TextInput type="number" min={0} value={f.yearsEmployed} onChange={(e) => set("yearsEmployed", e.target.value)} className="no-spinner" /></Field>
              </FormGrid>
            </Card>
            <Card title="Income & expenses (monthly)">
              <FormGrid cols={3}>
                <Field label="Gross income" required error={errors.gross}><TextInput type="number" min={0} value={f.gross} onChange={(e) => set("gross", e.target.value)} error={!!errors.gross} className="no-spinner" /></Field>
                <Field label="Net income" required error={errors.net}><TextInput type="number" min={0} value={f.net} onChange={(e) => set("net", e.target.value)} error={!!errors.net} className="no-spinner" /></Field>
                <Field label="Total expenses" required error={errors.expenses}><TextInput type="number" min={0} value={f.expenses} onChange={(e) => set("expenses", e.target.value)} error={!!errors.expenses} className="no-spinner" /></Field>
              </FormGrid>
            </Card>
            <Card title="Address history">
              <FormGrid>
                <Field label="Current address" required error={errors.address} className="md:col-span-2"><TextInput value={f.address} onChange={(e) => set("address", e.target.value)} error={!!errors.address} /></Field>
                <Field label="Years at current address" required error={errors.yearsAtAddress}><TextInput type="number" min={0} value={f.yearsAtAddress} onChange={(e) => set("yearsAtAddress", e.target.value)} error={!!errors.yearsAtAddress} className="no-spinner" /></Field>
                <Field label="Previous address" required={!!f.yearsAtAddress && Number(f.yearsAtAddress) < 3} error={errors.prevAddress} hint="Needed if less than 3 years at current address"><TextInput value={f.prevAddress} onChange={(e) => set("prevAddress", e.target.value)} error={!!errors.prevAddress} /></Field>
              </FormGrid>
            </Card>
            <Card title="Existing insurance & bank">
              <FormGrid>
                <Field label="Existing insurer"><TextInput value={f.insurer} onChange={(e) => set("insurer", e.target.value)} /></Field>
                <Field label="Policy number"><TextInput value={f.policy} onChange={(e) => set("policy", e.target.value)} /></Field>
                <Field label="Preferred bank" required error={errors.bank}><SelectInput value={f.bank} onChange={(e) => set("bank", e.target.value)} error={!!errors.bank} placeholder="Select bank" options={["Demo Bank A", "Demo Bank B", "Demo Vehicle Finance"]} /></Field>
                <Field label="Term (months)"><SelectInput value={f.term} onChange={(e) => set("term", e.target.value)} options={["36", "48", "60", "72"]} /></Field>
              </FormGrid>
            </Card>
          </fieldset>
        </div>
        <div className="space-y-5 lg:sticky lg:top-0">
          <Card title="Application status" actions={status === "Declined" ? <StatusBadge status="Declined" tone="red" /> : undefined}>
            <ol className="space-y-2">
              {steps.map((s, i) => (
                <li key={s} className="flex items-center gap-2 text-[13px]">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${i <= idx ? "bg-green-100 text-green-700" : "bg-[#f3f3f3] text-[#999]"}`}>{i < idx || (i === idx && i > 0) ? <Check size={12} /> : i + 1}</span>
                  <span className={i <= idx ? "text-[#333]" : "text-[#999]"}>{s}</span>
                </li>
              ))}
            </ol>
            {status === "Captured" && (
              <SmallButton className="mt-4" onClick={() => setFinance("Submitted to bank", "Submitted to bank")}>Mark submitted to bank</SmallButton>
            )}
            {status === "Submitted to bank" && (
              <div className="flex gap-2 mt-4 flex-wrap">
                <SmallButton variant="primary" icon={Check} onClick={() => setFinance("Approved", "Bank approval recorded")}>Record approval</SmallButton>
                <SmallButton variant="danger" icon={X} onClick={() => setFinance("Declined", "Bank decline recorded")}>Record decline</SmallButton>
              </div>
            )}
            {status === "Declined" && <p className="text-[12px] text-[#e53e3e] mt-3">Declined — update the application and capture it again, or change the deal to cash.</p>}
          </Card>
          <Card title="Summary">
            <SummaryRows rows={[
              { label: "Amount to finance", value: formatCurrency(Math.max(0, t.balance)) },
              { label: `Est. instalment (${months} mo @ 11.75%)`, value: formatCurrency(instalment) },
              { label: "Disposable income", value: formatCurrency(disposable), negative: disposable < instalment },
              { label: "Instalment / net income", value: `${ratio.toFixed(1)}%`, negative: ratio > 30 },
            ]} />
            {ratio > 30 && <Notice tone="warning" className="mt-3">Instalment is above 30% of net income — the bank may request a larger deposit.</Notice>}
          </Card>
          {editable && <PrimaryButton className="w-full!" disabled={deal.status === "Cancelled"} onClick={submit}>Capture application</PrimaryButton>}
        </div>
      </div>
    </>
  );
}

// ── Send Sale to Evolve ──────────────────────────────────────────────────────
function Section({ title, items }: { title: string; items: { label: string; value: ReactNode }[] }) {
  return (
    <div className="border border-[#f0f0f0] rounded-lg p-3.5">
      <p className="text-[12px] font-semibold text-[#333] mb-2">{title}</p>
      {items.length ? <KeyValueGrid cols={2} items={items} /> : <p className="text-[12px] text-[#999]">None</p>}
    </div>
  );
}

export function SendSaleToEvolve() {
  const { deal, list, select } = useDealParam();
  return (
    <>
      <PageHeader />
      <PendingUatNotice api="12 OTPMaintenance" workaround="Staff create the deal in Evolve by hand and TrueGear reads it back via 09 GetVehicleDealInfo." />
      <div className="mt-5">{deal ? <SendForDeal key={deal.id} deal={deal} list={list} onSelect={select} /> : <NoDeal />}</div>
    </>
  );
}

function SendForDeal({ deal, list, onSelect }: { deal: Deal; list: Deal[]; onSelect: (id: string) => void }) {
  const { formatCurrency, taxConfig } = useCurrency();
  const data = useSalesData();
  const t = dealTotals(deal, taxConfig.percentage);
  const customer = customerById(deal.customerId);
  const finance = (data.extra[financeKey(deal.id)] ?? null) as FinanceForm | null;
  const [view, setView] = useState<"structured" | "json">("structured");
  const [manualOpen, setManualOpen] = useState(false);
  const [dealNo, setDealNo] = useState("");
  const [dealErr, setDealErr] = useState("");
  // Evolve ids 12 needs that the test data does not hold: the customer's
  // CustSequenceID (per customer) and the vehicle's Evolve stock no. (from 18).
  const [custSeqs, setCustSeqs] = usePersistentState<Record<string, string>>("evolve.custSequenceIds", {});
  const receipt = (data.extra["receiving.receipts"] as Record<string, { evolveStockNo?: string }> | undefined)?.[deal.stockNo];
  const [evolveStockNo, setEvolveStockNo] = useState(receipt?.evolveStockNo ?? "");
  // Evolve salesperson linked to the user in Role & User Management.
  const repNo = (u?: { evolveRep?: string }) => u?.evolveRep ?? "";
  const rep = userById(deal.repId), mgr = userById(deal.managerId), fi = userById(deal.fiId);
  const person = (u?: { id: string; name: string; evolveRep?: string }) => (u ? `${u.name} (${repNo(u) || "not linked"})` : "—");

  const payload = useMemo(() => ({
    Header: { CustomerAccount: deal.arAccount, CustomerName: customer?.name, SalesRep: rep?.evolveRep, SalesManager: mgr?.evolveRep, FIManager: fi?.evolveRep, ARAccount: deal.arAccount },
    Vehicle: { VehStockNo: deal.stockNo, VIN: t.vehicle?.vin, SellingPrice: deal.vehiclePrice, Discount: deal.discount, InitialDeposit: deal.deposit },
    Accessories: t.accessories.map((a) => ({ Code: a.code, Description: a.name, Amount: a.price })),
    FIDealInsurances: t.fi.map((f) => ({ Code: f.code, Description: f.name, Amount: f.price })),
    ExtendedMaintenanceContracts: t.plan ? [{ Code: t.plan.code, Description: t.plan.name, Amount: t.plan.price }] : [],
    TradeIns: deal.tradeIn ? [{ Make: deal.tradeIn.make, Model: deal.tradeIn.model, Year: deal.tradeIn.year, Registration: deal.tradeIn.registration, Allowance: deal.tradeIn.value, Settlement: deal.tradeIn.settlement }] : [],
    CreditInfo: finance ? { Applicant: finance.applicant, Employer: finance.employer, GrossIncome: Number(finance.gross) || 0, NetIncome: Number(finance.net) || 0, Bank: finance.bank, TermMonths: Number(finance.term) || 0 } : null,
    Pricing: { VatPercent: taxConfig.percentage, Vat: Math.round(t.vat), DealTotal: Math.round(t.total), Balance: Math.round(t.balance) },
  }), [deal, t, customer, rep, mgr, fi, finance, taxConfig.percentage]);

  const cashDeal = enquiryById(deal.enquiryId)?.finance === "Cash";
  const checks = [
    { label: "Sales rep and manager linked to Evolve rep numbers", ok: !!repNo(rep) && !!repNo(mgr) },
    { label: "Customer AR account entered", ok: !!deal.arAccount },
    { label: "Evolve customer ID (CustSequenceID) entered", ok: !!(custSeqs[deal.customerId] ?? customer?.custSequenceId) },
    { label: "Vehicle stocked in Evolve (Evolve stock no.)", ok: !!evolveStockNo.trim() },
    { label: cashDeal ? "Cash deal — no finance application needed" : "Finance application captured", ok: cashDeal || (!!deal.financeStatus && deal.financeStatus !== "Not started") },
    { label: "Vehicle not reserved for another customer", ok: !t.vehicle?.reservedFor || t.vehicle.reservedFor === customer?.name },
  ];

  const buildOtp = (): OtpDeal | string => {
    const custSeq = (custSeqs[deal.customerId] ?? customer?.custSequenceId)?.trim();
    if (deal.status === "Cancelled") return "This deal is cancelled.";
    if (!custSeq) return "Enter the customer's Evolve CustSequenceID.";
    if (!evolveStockNo.trim()) return "Enter the vehicle's Evolve stock no. (shown on Send to Evolve Stock once stocked).";
    if (!repNo(rep) || !repNo(mgr)) return "Link the sales rep and manager to their Evolve salesperson in Role & User Management.";
    if (!deal.arAccount) return "Enter the customer AR account on Sale Details.";
    return {
      crmReferenceNo: deal.id,
      custSequenceId: custSeq,
      salesRepNo: repNo(rep),
      salesManagerNo: repNo(mgr),
      fiManagerNo: repNo(fi) || undefined,
      whoPays: cashDeal ? "C" : "F",
      customerArAccountNo: deal.arAccount,
      vehicle: { stockNo: evolveStockNo.trim(), retailPrice: deal.vehiclePrice, discount: deal.discount, initialDeposit: deal.deposit },
      // Codes must be Evolve accessory codes (07 Accessories) for Evolve to accept them.
      accessories: t.accessories.map((a) => ({ code: a.code, description: a.name, costPrice: 0, retailPrice: a.price })),
      tradeIn: deal.tradeIn
        ? { make: deal.tradeIn.make, modelDescription: deal.tradeIn.model, year: deal.tradeIn.year || undefined, registrationNo: deal.tradeIn.registration || undefined, standInPrice: deal.tradeIn.value, settlement: deal.tradeIn.settlement }
        : undefined,
      credit: finance ? { employerName: finance.employer || undefined, jobTitle: finance.occupation || undefined, netMonthlySalary: Number(finance.net) || undefined } : undefined,
    };
  };

  const recordEvolveDeal = (no: string, how: "sent" | "manual") => {
    salesStore.update("deals", (d) => d.id === deal.id, { evolveDealNo: no });
    logActivity(deal, "Evolve", how === "sent" ? `${deal.id}: sent to Evolve, deal ${no} created` : `${deal.id}: manual Evolve deal ${no} recorded`, currentUserName());
  };

  const confirmManual = () => {
    if (!/^[A-Z]{2,3}\d{4,}$/i.test(dealNo.trim())) { setDealErr("Enter the Evolve deal number, e.g. DL002703 or OTP58231"); return; }
    recordEvolveDeal(dealNo.trim().toUpperCase(), "manual");
    setManualOpen(false); previewToast("Manual Evolve deal number recorded");
  };

  return (
    <>
      <DealHeaderCard deal={deal} list={list} onSelect={onSelect} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <Card className="lg:col-span-2" title="Deal payload preview" subtitle="What TrueGear would send to Evolve. Shown for review only."
          actions={<Tabs className="mb-0!" value={view} onChange={setView} tabs={[{ key: "structured", label: "Structured", icon: LayoutList }, { key: "json", label: "JSON", icon: Code }]} />}>
          {view === "structured" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Section title="Header" items={[{ label: "Customer", value: customer?.name ?? "—" }, { label: "AR account", value: deal.arAccount || "—" }, { label: "Rep", value: person(rep) }, { label: "Manager", value: person(mgr) }, { label: "F&I", value: person(fi) }]} />
              <Section title="Vehicle" items={[{ label: "Stock no.", value: deal.stockNo }, { label: "VIN", value: <span className="font-mono text-[11px]">{t.vehicle?.vin ?? "—"}</span> }, { label: "Price", value: formatCurrency(deal.vehiclePrice) }, { label: "Discount", value: formatCurrency(deal.discount) }, { label: "Initial deposit", value: formatCurrency(deal.deposit) }]} />
              <Section title="Accessories" items={t.accessories.map((a) => ({ label: a.code, value: `${a.name} · ${formatCurrency(a.price)}` }))} />
              <Section title="F&I insurance & maintenance" items={[...t.fi.map((f) => ({ label: f.code, value: `${f.name} · ${formatCurrency(f.price)}` })), ...(t.plan ? [{ label: t.plan.code, value: `${t.plan.name} · ${formatCurrency(t.plan.price)}` }] : [])]} />
              <Section title="Trade-in" items={deal.tradeIn ? [{ label: "Vehicle", value: `${deal.tradeIn.year || ""} ${deal.tradeIn.make} ${deal.tradeIn.model}` }, { label: "Registration", value: deal.tradeIn.registration || "—" }, { label: "Allowance", value: formatCurrency(deal.tradeIn.value) }, { label: "Settlement", value: formatCurrency(deal.tradeIn.settlement) }] : []} />
              <Section title="Credit info & pricing" items={[{ label: "Applicant", value: finance?.applicant || "—" }, { label: "Bank", value: finance ? `${finance.bank} · ${finance.term} mo` : "—" }, { label: `${taxConfig.label}`, value: formatCurrency(t.vat) }, { label: "Deal total", value: formatCurrency(t.total) }]} />
            </div>
          ) : (
            <pre className="bg-[#1f1f1f] text-[#e6e6e6] text-[11px] leading-relaxed rounded-lg p-4 overflow-auto max-h-[480px]">{JSON.stringify(payload, null, 2)}</pre>
          )}
        </Card>
        <div className="space-y-5 lg:sticky lg:top-0">
          <Card title="Readiness">
            <ul className="space-y-2">
              {checks.map((c) => (
                <li key={c.label} className="flex items-start gap-2 text-[12px]">
                  {c.ok ? <CircleCheck size={16} className="text-green-600 shrink-0" /> : <Hourglass size={16} className="text-amber-600 shrink-0" />}
                  <span className={c.ok ? "text-[#333]" : "text-[#8a6100]"}>{c.label}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Integration status">
            {deal.evolveDealNo ? (
              <Notice tone="success" title={`In Evolve: ${deal.evolveDealNo}`}>Sale Status & Invoice reads the deal back from Evolve (09 GetVehicleDealInfo).</Notice>
            ) : (
              <>
                <p className="text-[12px] text-[#555] mb-3">Not sent. The Evolve deal number will appear here once the deal exists in Evolve.</p>
                <FormGrid cols={1}>
                  <Field label="Evolve customer ID (CustSequenceID)" htmlFor="ev-cust">
                    <TextInput id="ev-cust" value={custSeqs[deal.customerId] ?? customer?.custSequenceId ?? ""} placeholder="e.g. 70EC0000123" onChange={(e) => setCustSeqs((m) => ({ ...m, [deal.customerId]: e.target.value.trim() }))} />
                  </Field>
                  <Field label="Evolve stock no." htmlFor="ev-stock">
                    <TextInput id="ev-stock" value={evolveStockNo} placeholder="From Send to Evolve Stock" onChange={(e) => setEvolveStockNo(e.target.value)} />
                  </Field>
                </FormGrid>
                <EvolveWriteActions className="mt-4" label="Send deal to Evolve (12)" build={buildOtp} send={sendEvolveOtp}
                  onSent={(r) => { recordEvolveDeal(r.dealNumber, "sent"); previewToast(`Deal created in Evolve: ${r.dealNumber}`); }} />
                <SmallButton className="w-full mt-2" disabled={deal.status === "Cancelled"} onClick={() => { setManualOpen(true); setDealErr(""); }}>Record manual Evolve deal no.</SmallButton>
              </>
            )}
          </Card>
        </div>
      </div>
      <ConfirmDialog open={manualOpen} onClose={() => setManualOpen(false)} onConfirm={confirmManual} title="Record manual Evolve deal" confirmLabel="Save"
        message="Enter the deal number staff created in Evolve by hand.">
        <Field label="Evolve deal number" required error={dealErr} htmlFor="ev-deal"><TextInput id="ev-deal" value={dealNo} onChange={(e) => { setDealNo(e.target.value); setDealErr(""); }} placeholder="DL002703" error={!!dealErr} /></Field>
      </ConfirmDialog>
    </>
  );
}

// ── Customer Payments ────────────────────────────────────────────────────────
export function CustomerPayments() {
  const { deal, list, select } = useDealParam();
  return deal ? <PaymentsForDeal key={deal.id} deal={deal} list={list} onSelect={select} /> : (<><PageHeader /><NoDeal /></>);
}

function PaymentsForDeal({ deal, list, onSelect }: { deal: Deal; list: Deal[]; onSelect: (id: string) => void }) {
  const { formatCurrency, taxConfig } = useCurrency();
  const t = dealTotals(deal, taxConfig.percentage);
  const [open, setOpen] = useState(false);
  // The quotation's QR / payment reference — pre-filled so payments match the deal.
  const quoteRef = deal.quoteId ? `${deal.quoteId}-V${deal.quoteVersion}` : "";
  const [form, setForm] = useState({ method: "EFT", date: today(), reference: quoteRef, amount: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const due = t.total - t.tradeNet;
  const balance = due - t.paid;
  const locked = deal.status === "Cancelled" || deal.status === "Cancellation requested";

  const add = async () => {
    const e: Record<string, string> = {};
    const amt = Number(form.amount);
    if (!form.reference.trim()) e.reference = "Enter the payment reference";
    if (!amt || amt <= 0) e.amount = "Enter an amount";
    else if (amt > balance + 0.5) e.amount = `Amount exceeds balance due (${formatCurrency(balance)})`;
    if (!form.date) e.date = "Select the payment date";
    setErrors(e);
    if (Object.keys(e).length) return;
    const payment: Payment = { id: await salesStore.nextNumber("RCPT"), date: form.date, method: form.method, reference: form.reference.trim(), amount: amt, evolve: "Pending manual entry" };
    salesStore.update("deals", (d) => d.id === deal.id, (d) => ({ ...d, payments: [...d.payments, payment] }));
    logActivity(deal, "Payment", `${deal.id}: ${formatCurrency(amt)} received (${form.method}, ${payment.reference})`, currentUserName());
    setOpen(false);
    setForm((f) => ({ ...f, reference: quoteRef, amount: "" }));
    previewToast(`Payment ${payment.id} recorded`);
  };

  const markEntered = (p: Payment) => {
    salesStore.update("deals", (d) => d.id === deal.id, (d) => ({ ...d, payments: d.payments.map((x) => (x.id === p.id ? { ...x, evolve: "Manual in Evolve" as const } : x)) }));
    previewToast("Marked as entered in Evolve by finance");
  };

  const columns: Column<Payment>[] = [
    { key: "date", header: "Date", render: (p) => fmtDate(p.date) },
    { key: "method", header: "Method", render: (p) => p.method },
    { key: "ref", header: "Reference", render: (p) => <span className="font-mono text-[12px]">{p.reference}</span> },
    { key: "amount", header: "Amount", align: "right", render: (p) => formatCurrency(p.amount) },
    { key: "tg", header: "TrueGear", render: (p) => <div><Badge tone="blue">Recorded in TrueGear</Badge><p className="text-[11px] text-[#999] mt-0.5">{p.id}</p></div> },
    { key: "evolve", header: "Evolve receipt", render: (p) => p.evolve === "Manual in Evolve" ? <Badge tone="green">Entered manually by finance</Badge> : <Badge tone="amber">Pending manual entry by finance</Badge> },
    { key: "act", header: "", align: "right", render: (p) => p.evolve === "Pending manual entry" ? <SmallButton onClick={() => markEntered(p)}>Mark entered in Evolve</SmallButton> : null },
  ];

  return (
    <>
      <PageHeader actions={<PrimaryButton icon={Plus} disabled={locked || balance <= 0} onClick={() => { setOpen(true); setErrors({}); }}>Record payment</PrimaryButton>} />
      <Notice tone="info" title="Handled in TrueGear">Payments, receipts, instalments and balance due are recorded in TrueGear using the existing invoice-payment flow. The deposit goes to Evolve inside the sales order (12); finance enters each receipt in Evolve.</Notice>
      <div className="mt-5"><DealHeaderCard deal={deal} list={list} onSelect={onSelect} /></div>
      <KpiGrid cols={4}>
        <KpiCard label="Amount due (after trade-in)" value={formatCurrency(due)} icon={Receipt} />
        <KpiCard label="Received (TrueGear)" value={formatCurrency(t.paid)} icon={Wallet} />
        <KpiCard label="Balance due" value={formatCurrency(balance)} tone={balance > 0 ? "down" : "up"} hint={balance > 0 ? (deal.financeStatus === "Approved" ? "Finance pay-out expected" : "Outstanding") : "Fully paid"} icon={Banknote} />
        <KpiCard label="Awaiting Evolve entry" value={deal.payments.filter((p) => p.evolve === "Pending manual entry").length} hint="Receipts finance must capture" icon={Clock} />
      </KpiGrid>
      <Card title="Payments & receipts">
        <DataTable columns={columns} rows={deal.payments} rowKey={(p) => p.id} paginate={false}
          empty={<EmptyState icon={Wallet} title="No payments yet" message={`Expected deposit: ${formatCurrency(deal.deposit)}. Use “Record payment” to add one.`} />} />
      </Card>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Record payment" size="sm">
        <div className="space-y-4">
          <FormGrid>
            <Field label="Method" required><SelectInput value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} options={["EFT", "Card", "Bank finance pay-out", "Cash"]} /></Field>
            <Field label="Date" required error={errors.date}><TextInput type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} error={!!errors.date} /></Field>
            <Field label="Amount" required error={errors.amount}><TextInput type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} error={!!errors.amount} placeholder={String(Math.round(Math.min(balance, deal.deposit || balance)))} className="no-spinner" onWheel={(e) => e.currentTarget.blur()} />
              {balance > 0 && <button type="button" onClick={() => { setForm((f) => ({ ...f, amount: balance.toFixed(2) })); setErrors((e) => ({ ...e, amount: "" })); }} className="mt-1.5 text-[12px] font-medium text-[#ff4f31] hover:underline cursor-pointer">Pay full balance ({formatCurrency(balance)})</button>}
            </Field>
            <Field label="Reference" required error={errors.reference} hint={quoteRef ? `Quotation reference ${quoteRef} (on the quote's QR code)` : undefined}><TextInput value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} error={!!errors.reference} placeholder="Bank reference or card slip no." /></Field>
          </FormGrid>
          <p className="text-[11px] text-[#999]">Saved. Finance must still enter the receipt in Evolve.</p>
          <div className="flex gap-3"><SecondaryButton className="flex-1" onClick={() => setOpen(false)}>Cancel</SecondaryButton><PrimaryButton className="flex-1" onClick={add}>Record</PrimaryButton></div>
        </div>
      </Modal>
    </>
  );
}

// ── Reserve Vehicle ──────────────────────────────────────────────────────────
export function ReserveVehicle() {
  const { deal } = useDealParam((d) => d.status !== "Cancelled");
  return (
    <>
      <PageHeader />
      <Notice tone="info" title="Reserved in TrueGear only">The unit is blocked against the deposit so no other quote can take it. No Evolve reservation is needed — Evolve marks it reserved later, when the sales order (12) is created.</Notice>
      <div className="mt-5">{deal ? <ReserveForDeal key={deal.id} deal={deal} /> : <NoDeal message="A hold is placed for a deal's customer. Create a deal first." />}</div>
    </>
  );
}

function ReserveForDeal({ deal }: { deal: Deal }) {
  const { formatCurrency, taxConfig } = useCurrency();
  const data = useSalesData();
  const [params, setParams] = useSearchParams();
  const customer = customerById(deal.customerId);
  const name = customer?.name ?? deal.customerId;
  const t = dealTotals(deal, taxConfig.percentage);
  const candidates = data.stock.filter((v) => !["Sold", "On Hold"].includes(v.status) || v.stockNo === deal.stockNo);
  const dealList = data.deals.filter((d) => d.status !== "Cancelled");
  const [stockNo, setStockNo] = useState(params.get("stock") ?? deal.stockNo);
  const [holdUntil, setHoldUntil] = usePersistentState<Record<string, string>>("sale.holdUntil", {});
  const [until, setUntil] = useState(holdUntil[stockNo] ?? addDays(10));
  const [confirm, setConfirm] = useState<null | "hold" | "release">(null);
  const v = stockByNo(stockNo);

  if (!v) {
    return <EmptyState icon={Car} title="Vehicle not found" message={`Stock unit ${stockNo} is not in the test stock list.`} />;
  }

  const reservedElsewhere = !!v.reservedFor && v.reservedFor !== name;
  const isHeld = v.status === "Reserved" && v.reservedFor === name;

  const apply = () => {
    if (confirm === "hold") {
      salesStore.update("stock", (s) => s.stockNo === stockNo, { status: "Reserved", reservedFor: name });
      setHoldUntil((h) => ({ ...h, [stockNo]: until }));
      logActivity(deal, "Reservation", `${stockNo} held for ${name} until ${fmtDate(until)}`, userById(deal.repId)?.name ?? "Sales executive");
      previewToast(`TrueGear hold placed on ${stockNo}`);
    } else {
      salesStore.update("stock", (s) => s.stockNo === stockNo, (s) => ({ ...s, status: s.type === "Demo" ? "Demo" : "In Stock", reservedFor: undefined }));
      logActivity(deal, "Reservation", `Hold on ${stockNo} released`, userById(deal.repId)?.name ?? "Sales executive");
      previewToast(`TrueGear hold released on ${stockNo}`);
    }
    setConfirm(null);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-5">
          <Card title="Vehicle" icon={Car}>
            <Field label="Stock unit" htmlFor="rv-stock">
              <SelectInput id="rv-stock" value={stockNo} onChange={(e) => { setStockNo(e.target.value); setUntil(holdUntil[e.target.value] ?? addDays(10)); }} options={candidates.map((c) => ({ value: c.stockNo, label: `${c.stockNo} — ${c.model} (${c.colour}) · ${c.status}` }))} />
            </Field>
            <div className="mt-4"><KeyValueGrid items={[
              { label: "VIN", value: <span className="font-mono text-[12px]">{v.vin}</span> },
              { label: "Branch", value: v.branch },
              { label: "Current price", value: formatCurrency(v.current) },
              { label: "Days in stock", value: v.daysInStock },
              { label: "Stock status", value: <StatusBadge status={v.status} /> },
              { label: "TrueGear hold", value: isHeld ? <Badge tone="amber">Held for {name}{holdUntil[stockNo] ? ` until ${fmtDate(holdUntil[stockNo])}` : ""}</Badge> : <Badge tone="gray">None</Badge> },
            ]} /></div>
          </Card>
          <Card title="Reservation check" subtitle="TrueGear reservations on this unit">
            {v.status === "Sold" ? (
              <Notice tone="danger" title="This unit is sold">It cannot be held.</Notice>
            ) : reservedElsewhere ? (
              <Notice tone="danger" title={`This unit is reserved for “${v.reservedFor}”`}>A hold is blocked to avoid a double sale. Choose another unit or release the other reservation first.</Notice>
            ) : (
              <Notice tone="success" title={v.reservedFor ? `Reserved for ${v.reservedFor} (this customer)` : "Not reserved"}>Not reserved for anyone else.</Notice>
            )}
          </Card>
        </div>
        <div className="space-y-5 lg:sticky lg:top-0">
          <Card title="Customer & deposit">
            <Field label="Deal" htmlFor="rv-deal">
              <SelectInput id="rv-deal" value={deal.id} onChange={(e) => setParams({ deal: e.target.value }, { replace: true })} options={dealList.map((d) => ({ value: d.id, label: `${d.id} — ${customerById(d.customerId)?.name ?? "Unknown"}` }))} />
            </Field>
            <div className="mt-4"><KeyValueGrid cols={2} items={[
              { label: "Customer", value: name },
              { label: "Deposit expected", value: formatCurrency(deal.deposit) },
              { label: "Received", value: formatCurrency(t.paid) },
              { label: "Deposit status", value: t.paid > 0 ? <Badge tone="blue">Recorded in TrueGear</Badge> : <Badge tone="gray">Not received</Badge> },
            ]} /></div>
            <Field label="Hold until" required className="mt-4" htmlFor="rv-until"><TextInput id="rv-until" type="date" value={until} disabled={isHeld} onChange={(e) => setUntil(e.target.value)} /></Field>
          </Card>
          {isHeld ? (
            <SecondaryButton className="w-full" icon={Ban} onClick={() => setConfirm("release")}>Release TrueGear hold</SecondaryButton>
          ) : (
            <PrimaryButton className="w-full!" icon={ShieldCheck} disabled={reservedElsewhere || v.status === "Sold" || !until} onClick={() => setConfirm("hold")}>Place TrueGear hold</PrimaryButton>
          )}
        </div>
      </div>
      <ConfirmDialog open={confirm !== null} onClose={() => setConfirm(null)} onConfirm={apply} danger={confirm === "release"}
        title={confirm === "hold" ? "Place TrueGear hold" : "Release TrueGear hold"} confirmLabel={confirm === "hold" ? "Place hold" : "Release"}
        message={confirm === "hold" ? <>Hold <span className="font-semibold">{stockNo}</span> for {name} until {fmtDate(until)}? Evolve is not updated.</> : <>Release the hold on {stockNo}? Other executives will be able to quote it again.</>} />
    </>
  );
}

// ── Sale Status & Invoice / Download Invoice ─────────────────────────────────
export function SaleStatusInvoice() {
  const { deal, list, select } = useDealParam();
  return (
    <>
      <PageHeader />
      <div className="mt-5">{deal ? <StatusForDeal key={deal.id} deal={deal} list={list} onSelect={select} /> : <NoDeal />}</div>
    </>
  );
}

function StatusForDeal({ deal, list, onSelect }: { deal: Deal; list: Deal[]; onSelect: (id: string) => void }) {
  const navigate = useNavigate();
  const { formatCurrency, taxConfig } = useCurrency();
  const data = useSalesData();
  const [invoiceDates, setInvoiceDates] = usePersistentState<Record<string, string>>("sale.invoiceDates", {});
  const [confirm, setConfirm] = useState(false);
  const t = dealTotals(deal, taxConfig.percentage);
  const customer = customerById(deal.customerId);
  const exVat = t.total / (1 + taxConfig.percentage / 100);
  const invoiced = !!deal.invoiceNo && deal.status !== "Cancelled";
  const delivered = deal.status === "Delivered";
  const steps = ["Sales order created", "Sales order in Evolve", "Invoiced by Evolve", "Handed over"];
  const reached = delivered ? 4 : invoiced ? 3 : deal.evolveDealNo ? 2 : 1;
  const blocked = deal.status === "Awaiting finance" ? "Finance must be approved before invoicing." : deal.status === "Cancellation requested" ? "A cancellation is waiting for approval." : deal.status === "Cancelled" ? "This deal is cancelled." : !deal.evolveDealNo ? "Evolve invoices the sales order after it is pushed — send the sale to Evolve first." : "";

  const history = [
    { doc: "Deal created", number: deal.id, date: deal.created },
    ...(deal.evolveDealNo ? [{ doc: "OTP / deal in Evolve (manual)", number: deal.evolveDealNo, date: "" }] : []),
    ...(deal.invoiceNo ? [{ doc: "Vehicle invoice", number: deal.invoiceNo, date: invoiceDates[deal.id] ?? "" }] : []),
  ];

  // `fromEvolve` carries the invoice Evolve raised (09); otherwise a test invoice.
  const raise = async (fromEvolve?: { invoiceNo: string; invoiceDate: string | null }) => {
    const invoiceNo = fromEvolve?.invoiceNo ?? (await salesStore.nextNumber("INV"));
    const name = customer?.name ?? deal.customerId;
    salesStore.update("deals", (d) => d.id === deal.id, { invoiceNo, status: "Invoiced" });
    salesStore.update("stock", (s) => s.stockNo === deal.stockNo, { status: "Sold", reservedFor: name });
    if (deal.enquiryId) salesStore.update("enquiries", (e) => e.id === deal.enquiryId, { status: "Won", daysInStage: 0 });
    if (!data.handovers.some((h) => h.dealId === deal.id)) {
      salesStore.add("handovers", { stockNo: deal.stockNo, dealId: deal.id, pdiStage: 0, checklistDone: false, registration: "Pending" });
    }
    setInvoiceDates((m) => ({ ...m, [deal.id]: fromEvolve?.invoiceDate ?? today() }));
    logActivity(deal, "Invoice", fromEvolve ? `${deal.id}: Evolve invoice ${invoiceNo} recorded` : `${deal.id}: invoice ${invoiceNo} raised manually`, currentUserName());
    setConfirm(false);
    previewToast(`Invoice ${invoiceNo} ${fromEvolve ? "recorded from Evolve" : "raised"} — vehicle moved to handover`);
  };

  return (
    <>
      <DealHeaderCard deal={deal} list={list} onSelect={onSelect} />
      <Card className="mb-5">
        <ol className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {steps.map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${i < reached ? "bg-green-100 text-green-700" : i === reached ? "bg-amber-100 text-amber-700" : "bg-[#f3f3f3] text-[#999]"}`}>
                {i < reached ? <Check size={14} /> : i === reached ? <Clock size={14} /> : i + 1}
              </span>
              <span className={`text-[12px] ${i <= reached ? "text-[#333]" : "text-[#999]"}`}>{s}</span>
            </li>
          ))}
        </ol>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-5">
          <Card title="Deal status" actions={invoiced ? <Badge tone="green"><CircleCheck size={12} /> Invoice issued</Badge> : <Badge tone="amber"><Hourglass size={12} /> Awaiting invoice</Badge>}>
            <KeyValueGrid items={[
              { label: "Customer", value: customer?.name ?? "—" },
              { label: "Vehicle", value: t.vehicle ? `${t.vehicle.stockNo} · ${t.vehicle.model}` : deal.stockNo },
              { label: "Evolve deal no.", value: deal.evolveDealNo ?? <span className="text-[#bbb]">Not recorded</span> },
              { label: "Deal status", value: <StatusBadge status={deal.status} /> },
              { label: "Invoice number", value: deal.invoiceNo ?? <span className="text-[#bbb]">Not issued yet</span> },
              { label: "Invoice date", value: invoiceDates[deal.id] ? fmtDate(invoiceDates[deal.id]) : <span className="text-[#bbb]">—</span> },
            ]} />
            {!invoiced && !blocked && (
              <Notice tone="warning" className="mt-4" action={<SmallButton variant="primary" icon={Receipt} onClick={() => setConfirm(true)}>Raise invoice manually</SmallButton>}>
                No invoice yet. Raising it marks the vehicle Sold, the enquiry Won and sends the vehicle to the handover queue.
              </Notice>
            )}
            {!invoiced && blocked && (
              <Notice tone="danger" className="mt-4" action={deal.status === "Awaiting finance" ? <SmallButton onClick={() => navigate(`${screenPath("sales-order", "finance-application")}?deal=${deal.id}`)}>Finance application</SmallButton> : !deal.evolveDealNo && deal.status !== "Cancelled" && deal.status !== "Cancellation requested" ? <SmallButton onClick={() => navigate(`${screenPath("sales-order", "send-sale-to-evolve")}?deal=${deal.id}`)}>Send Sale to Evolve</SmallButton> : undefined}>{blocked}</Notice>
            )}
            {invoiced && (
              <Notice tone="success" className="mt-4" action={<SmallButton onClick={() => navigate(`${screenPath("handover", "pre-delivery-check")}?stock=${deal.stockNo}`)}>Go to handover</SmallButton>}>
                Invoiced. The vehicle is in the handover queue.
              </Notice>
            )}
          </Card>
          {deal.evolveDealNo && (
            <EvolveLiveCard title="Deal in Evolve" icon={Receipt} api="09 GetVehicleDealInfo" loadKey={deal.evolveDealNo} load={() => listEvolveDeals({ dealNo: deal.evolveDealNo })}
              empty={(rows) => rows.length === 0}>
              {(rows) => {
                const ev = rows[0];
                return (
                  <>
                    <KeyValueGrid items={[
                      { label: "Evolve status", value: <StatusBadge status={ev.status || "—"} /> },
                      { label: "Evolve invoice no.", value: ev.invoiceNo || <span className="text-[#bbb]">Not invoiced yet</span> },
                      { label: "Invoice date", value: ev.invoiceDate ? fmtDate(ev.invoiceDate) : "—" },
                      { label: "Customer", value: ev.customerName || "—" },
                      { label: "Total due", value: formatCurrency(ev.totalDue) },
                      { label: "Total GP (Evolve)", value: `${formatCurrency(ev.gp.total)} · ${ev.gp.totalPct}%` },
                    ]} />
                    {ev.invoiceNo && !invoiced && deal.status !== "Cancelled" && (
                      <Notice tone="success" className="mt-4" action={<SmallButton variant="primary" icon={Receipt} onClick={() => raise({ invoiceNo: ev.invoiceNo, invoiceDate: ev.invoiceDate })}>Record Evolve invoice</SmallButton>}>
                        Evolve has invoiced this deal. Record invoice {ev.invoiceNo} in TrueGear to move the vehicle to handover.
                      </Notice>
                    )}
                  </>
                );
              }}
            </EvolveLiveCard>
          )}
          <Card title="Deal history & documents" icon={History}>
            <DataTable paginate={false} rows={history} rowKey={(h) => h.number} columns={[
              { key: "doc", header: "Document", render: (h) => h.doc },
              { key: "no", header: "Number", render: (h) => <span className="font-mono text-[12px]">{h.number}</span> },
              { key: "date", header: "Date", render: (h) => (h.date ? fmtDate(h.date) : "—") },
            ]} />
          </Card>
        </div>
        <div className="space-y-5 lg:sticky lg:top-0">
          <Card title="Totals & gross profit">
            <SummaryRows rows={[
              { label: "Deal total incl. VAT", value: formatCurrency(t.total) },
              { label: "Deal total excl. VAT", value: formatCurrency(exVat), muted: true },
              { label: "Vehicle cost", value: formatCurrency(t.cost) },
              { label: "Front-end GP (vehicle)", value: formatCurrency(t.frontGp) },
              { label: "Back-end GP (F&I, accessories)", value: formatCurrency(t.backGp) },
            ]} total={{ label: "Total GP", value: formatCurrency(t.frontGp + t.backGp) }} />
          </Card>
          <SecondaryButton className="w-full" icon={FileDown} onClick={() => navigate(screenPath("sales-invoice", "download-invoice") + `?deal=${deal.id}`)}>Invoice document</SecondaryButton>
        </div>
      </div>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={() => raise()} title="Raise invoice manually" confirmLabel="Raise invoice"
        message={<>Invoice deal <span className="font-semibold">{deal.id}</span> for {formatCurrency(t.total)}? Use this only if Evolve's invoice can't be read — it does not invoice in Evolve.</>} />
    </>
  );
}

// Fetches one Evolve document (20) and saves it as a PDF.
function EvolveDocumentDownload({ documentNumber }: { documentNumber: string }) {
  const [state, setState] = useState<{ busy: boolean; error?: string }>({ busy: false });
  const download = async () => {
    setState({ busy: true });
    try {
      const doc = unwrap(await getEvolveDocument(documentNumber));
      const bytes = Uint8Array.from(atob(doc.base64), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: doc.contentType }));
      const a = Object.assign(document.createElement("a"), { href: url, download: `${documentNumber}.pdf` });
      a.click();
      URL.revokeObjectURL(url);
      setState({ busy: false });
    } catch (err) {
      setState({ busy: false, error: evolveErrorMessage(err) });
    }
  };
  return (
    <div className="flex flex-col items-end gap-1">
      <SmallButton icon={Download} disabled={state.busy} onClick={download}>{state.busy ? "Fetching…" : "Download PDF"}</SmallButton>
      {state.error && <span className="text-[11px] text-[#e53e3e] max-w-60 text-right">{state.error}</span>}
    </div>
  );
}

export function DownloadInvoice() {
  const { deal, list, select } = useDealParam();
  return (
    <>
      <PageHeader />
      <Notice tone="info" title="Live Evolve read — 26 GetVehicleDealHistory · 20 GetDocument">
        26 lists the documents on the Evolve deal; 20 downloads one as a PDF. 20 still needs a test with a real vehicle-invoice number — if Evolve returns nothing, finance downloads the PDF from Evolve by hand.
      </Notice>
      <div className="mt-5">{deal ? <InvoiceForDeal key={deal.id} deal={deal} list={list} onSelect={select} /> : <NoDeal />}</div>
    </>
  );
}

function InvoiceForDeal({ deal, list, onSelect }: { deal: Deal; list: Deal[]; onSelect: (id: string) => void }) {
  const navigate = useNavigate();
  const data = useSalesData();
  const [requested, setRequested] = usePersistentState<string[]>("sale.pdfRequests", []);
  const cust = customerById(deal.customerId);
  const invoiceDate = ((data.extra["sale.invoiceDates"] ?? {}) as Record<string, string>)[deal.id];

  return (
    <>
      <DealHeaderCard deal={deal} list={list} onSelect={onSelect} />
      {!deal.invoiceNo || deal.status === "Cancelled" ? (
        <EmptyState icon={FileText} title="No invoice issued yet" message="This deal has not been invoiced, so there is no document to download."
          action={<SmallButton onClick={() => navigate(`${screenPath("sales-invoice", "sale-status-invoice")}?deal=${deal.id}`)}>View sale status</SmallButton>} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          <Card className="lg:col-span-2" title="Invoice document" icon={FileText}>
            <KeyValueGrid items={[
              { label: "Customer", value: cust?.name ?? "—" },
              { label: "Deal", value: deal.id },
              { label: "Evolve deal no.", value: deal.evolveDealNo ?? "—" },
              { label: "Invoice number", value: deal.invoiceNo },
              { label: "Invoice date", value: invoiceDate ? fmtDate(invoiceDate) : "—" },
              { label: "Format", value: "Base64 PDF via 20 GetDocument" },
              { label: "Send to", value: [cust?.email, cust?.phone].filter(Boolean).join(" · ") || "—" },
            ]} />
            <div className="mt-5">
              {deal.evolveDealNo ? (
                <EvolveLiveCard title="Documents on the Evolve deal" api="26 GetVehicleDealHistory" loadKey={deal.evolveDealNo} load={() => getEvolveDealHistory({ dealNo: deal.evolveDealNo })}
                  empty={(rows) => rows.every((r) => r.documents.length === 0)}>
                  {(rows) => (
                    <DataTable paginate={false} rows={rows.flatMap((r) => r.documents)} rowKey={(d) => d.type + d.number} columns={[
                      { key: "type", header: "Type", render: (d) => d.type },
                      { key: "no", header: "DocumentNumber", render: (d) => <span className="font-mono text-[12px]">{d.number}</span> },
                      { key: "date", header: "Date", render: (d) => (d.date ? fmtDate(d.date) : "—") },
                      { key: "act", header: "", align: "right", render: (d) => <EvolveDocumentDownload documentNumber={d.number} /> },
                    ]} />
                  )}
                </EvolveLiveCard>
              ) : (
                <Notice tone="warning">No Evolve deal number on this deal, so there is no Evolve document to fetch.</Notice>
              )}
            </div>
          </Card>
          <div className="space-y-5 lg:sticky lg:top-0">
            <Card title="Send to customer">
              <span title="Email / WhatsApp sending is not part of the Evolve link"><SmallButton icon={Send} disabled className="w-full">Email / WhatsApp to customer</SmallButton></span>
              <p className="text-[11px] text-[#999] mt-3">Download the Evolve PDF first; sending it from TrueGear comes with the messaging work.</p>
            </Card>
            <SecondaryButton className="w-full" disabled={requested.includes(deal.id)} onClick={() => { setRequested((r) => [...r, deal.id]); previewToast("Request to finance noted"); }}>
              {requested.includes(deal.id) ? "Finance request noted" : "Ask finance for the PDF"}
            </SecondaryButton>
          </div>
        </div>
      )}
    </>
  );
}

// ── Fleet Sale ───────────────────────────────────────────────────────────────
interface FleetLine { stockNo: string; price: number; discount: number }

export function FleetSale() {
  const navigate = useNavigate();
  const { formatCurrency, taxConfig } = useCurrency();
  const data = useSalesData();
  const companies = data.customers.filter((c) => c.type === "Company");
  const pool = data.stock.filter((v) => v.type === "New" && v.status === "In Stock");
  const [buyer, setBuyer] = useState("");
  const [repId, setRepId] = useState("");
  const [managerId, setManagerId] = useState("");
  const [oem, setOem] = useState("");
  const [lines, setLines] = useState<FleetLine[]>([]);
  const [adding, setAdding] = useState("");
  const [saved, setSaved] = useState<string[]>([]);
  // Snapshot of the saved fleet deal, for the 25 MaintenanceVehicleDeals push.
  const [savedFleet, setSavedFleet] = useState<{ repId: string; oem: string; vehicles: { vin: string; retailPrice: number; discount: number }[] } | null>(null);
  const [otpNumber, setOtpNumber] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const gross = lines.reduce((n, l) => n + l.price, 0);
  const disc = lines.reduce((n, l) => n + l.discount, 0);
  const net = gross - disc;
  const vat = net * (taxConfig.percentage / 100);
  const remaining = pool.filter((v) => !lines.some((l) => l.stockNo === v.stockNo));

  const update = (stockNo: string, k: "price" | "discount", val: number) => setLines((ls) => ls.map((l) => (l.stockNo === stockNo ? { ...l, [k]: val } : l)));
  const save = async () => {
    const e: Record<string, string> = {};
    if (!buyer) e.buyer = "Select the buyer";
    if (!repId) e.rep = "Select the sales rep";
    if (!managerId) e.manager = "Select the sales manager";
    if (!oem.trim()) e.oem = "Enter the OEM fleet account";
    if (lines.length < 2) e.lines = "A fleet deal needs at least two vehicles";
    if (lines.some((l) => l.discount > l.price * 0.15)) e.lines = "A per-vehicle discount is above 15%";
    setErrors(e);
    if (Object.keys(e).length) return;
    const company = customerById(buyer);
    const name = company?.name ?? buyer;
    // One sales order per vehicle, numbered together by the server.
    const numbers = await salesStore.allocate("DL", lines.length);
    const ids = lines.map((l, i) => {
      const deal: Deal = {
        id: numbers[i], quoteId: `FLEET ${oem.trim().toUpperCase()}`, quoteVersion: 1, enquiryId: "", customerId: buyer, stockNo: l.stockNo,
        repId, managerId, fiId: "", arAccount: company?.arAccount ?? "", vehiclePrice: l.price, discount: l.discount, accessories: [], fi: [],
        maintenance: "", tradeIn: null, deposit: 0, status: "Awaiting invoice", created: today(), payments: [], financeStatus: "Not started", fleet: true,
      };
      salesStore.add("deals", deal);
      salesStore.update("stock", (s) => s.stockNo === l.stockNo, { status: "Reserved", reservedFor: name });
      return deal.id;
    });
    salesStore.add("activities", { id: salesStore.localId("ACT"), customerId: buyer, type: "Fleet deal", date: new Date().toISOString(), note: `Fleet deal (${oem.trim().toUpperCase()}) saved: ${ids.join(", ")}`, by: userById(repId)?.name ?? "Sales executive" });
    setSaved(ids);
    setSavedFleet({ repId, oem: oem.trim().toUpperCase(), vehicles: lines.map((l) => ({ vin: stockByNo(l.stockNo)?.vin ?? "", retailPrice: l.price, discount: l.discount })) });
    setLines([]);
    previewToast(`Fleet deal saved as ${ids.length} deals`);
  };

  const buildFleet = (): EvolveFleetDeal | string => {
    if (!savedFleet) return "Save the fleet deal first.";
    const rep = userById(savedFleet.repId);
    const salesRep = rep?.evolveRep ?? "";
    if (!salesRep) return "Link the sales rep to their Evolve salesperson in Role & User Management.";
    if (!otpNumber.trim()) return "Enter the OTP number for the fleet deal.";
    return { salesRep, oemAccountNumber: savedFleet.oem, otpNumber: otpNumber.trim(), vehicles: savedFleet.vehicles };
  };
  const recordFleetDeal = (dealNumber: string) => {
    saved.forEach((id) => salesStore.update("deals", (d) => d.id === id, { evolveDealNo: dealNumber }));
    previewToast(`Fleet deal created in Evolve: ${dealNumber}`);
    setSavedFleet(null);
  };

  if (companies.length === 0) {
    return (
      <>
        <PageHeader />
        <PendingUatNotice api="25 MaintenanceVehicleDeals" workaround="Fleet deals are created in Evolve by hand until the API passes UAT." />
        <div className="mt-5">
          <EmptyState icon={Truck} title="No company customers yet" message="Fleet deals are sold to companies. Capture an enquiry for a company customer first."
            action={<SmallButton variant="primary" onClick={() => navigate(screenPath("crm", "add-enquiry"))}>Add enquiry</SmallButton>} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader />
      <PendingUatNotice api="25 MaintenanceVehicleDeals" workaround="Fleet deals are created in Evolve by hand until the API passes UAT." />
      {saved.length > 0 && (
        <Notice tone="success" className="mt-5" title={`Fleet deal saved as ${saved.length} deals`}
          action={<SmallButton onClick={() => navigate(`${screenPath("sales-order", "sale-details")}?deal=${saved[0]}`)}>Open first deal</SmallButton>}>
          {saved.join(", ")} — vehicles are held for the buyer. Submit it to Evolve (25) on the right, or create the fleet deal in Evolve by hand and record the number on Send Sale to Evolve.
        </Notice>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start mt-5">
        <div className="lg:col-span-2 space-y-5">
          <Card title="Buyer & deal">
            <FormGrid>
              <Field label="Buyer (company)" required error={errors.buyer}><SelectInput value={buyer} onChange={(e) => setBuyer(e.target.value)} error={!!errors.buyer} placeholder="Select" options={companies.map((c) => ({ value: c.id, label: c.name }))} /></Field>
              <Field label="Sales rep" required error={errors.rep}><SelectInput value={repId} onChange={(e) => setRepId(e.target.value)} error={!!errors.rep} placeholder="Select" options={SALES_USERS.filter((u) => u.role === "Sales Executive").map((u) => ({ value: u.id, label: `${u.name}${u.evolveRep ? ` (${u.evolveRep})` : " — not linked"}` }))} /></Field>
              <Field label="Sales manager" required error={errors.manager}><SelectInput value={managerId} onChange={(e) => setManagerId(e.target.value)} error={!!errors.manager} placeholder="Select" options={MANAGERS.map((u) => ({ value: u.id, label: `${u.name} (${u.evolveRep})` }))} /></Field>
              <Field label="OEM fleet account" required error={errors.oem}><TextInput value={oem} onChange={(e) => setOem(e.target.value)} error={!!errors.oem} placeholder="e.g. OEM-FLT-0001" /></Field>
            </FormGrid>
          </Card>
          <Card title={`Vehicles (${lines.length})`} icon={Truck}
            actions={<div className="flex gap-2">
              <SelectInput value={adding} onChange={(e) => setAdding(e.target.value)} placeholder={remaining.length ? "Add vehicle…" : "No new stock available"} className="w-56 py-1.5!" aria-label="Add vehicle" options={remaining.map((v) => ({ value: v.stockNo, label: `${v.stockNo} — ${v.model}` }))} />
              <SmallButton icon={Plus} disabled={!adding} onClick={() => { const v = stockByNo(adding); if (v) setLines((ls) => [...ls, { stockNo: v.stockNo, price: v.current, discount: 0 }]); setAdding(""); }}>Add</SmallButton>
            </div>}>
            {errors.lines && <Notice tone="danger" className="mb-3">{errors.lines}</Notice>}
            <DataTable paginate={false} rows={lines} rowKey={(l) => l.stockNo}
              empty={<EmptyState icon={Truck} title="No vehicles" message={pool.length ? "Add new, in-stock units to this fleet deal." : "There are no new vehicles in stock. Receive vehicles first."}
                action={pool.length ? undefined : <SmallButton onClick={() => navigate(screenPath("goods-receipt", "receive-vehicle"))}>Receive vehicle</SmallButton>} />}
              columns={[
                { key: "veh", header: "Vehicle", render: (l) => { const v = stockByNo(l.stockNo); return <div><p className="text-[#333]">{l.stockNo} · {v?.model}</p><p className="text-[11px] text-[#999] font-mono">{v?.vin}</p></div>; } },
                { key: "price", header: "Price", align: "right", render: (l) => <input type="number" aria-label={`Price ${l.stockNo}`} value={l.price} onChange={(e) => update(l.stockNo, "price", Number(e.target.value) || 0)} className="w-28 text-right border border-[#e5e7eb] rounded-md px-2 py-1 text-[13px] no-spinner" /> },
                { key: "disc", header: "Discount", align: "right", render: (l) => <input type="number" aria-label={`Discount ${l.stockNo}`} value={l.discount} onChange={(e) => update(l.stockNo, "discount", Number(e.target.value) || 0)} className="w-24 text-right border border-[#e5e7eb] rounded-md px-2 py-1 text-[13px] no-spinner" /> },
                { key: "net", header: "Net", align: "right", render: (l) => formatCurrency(l.price - l.discount) },
                { key: "rm", header: "", align: "right", render: (l) => <button type="button" aria-label={`Remove ${l.stockNo}`} onClick={() => setLines((ls) => ls.filter((x) => x.stockNo !== l.stockNo))} className="p-1.5 rounded hover:bg-[#f3f4f6] text-[#e53e3e] cursor-pointer"><Trash2 size={14} /></button> },
              ]} />
          </Card>
        </div>
        <div className="space-y-5 lg:sticky lg:top-0">
          <Card title="Fleet totals" actions={<StatusBadge status="Draft" />}>
            <SummaryRows rows={[
              { label: "Units", value: lines.length },
              { label: "Gross price", value: formatCurrency(gross) },
              { label: "Total discount", value: formatCurrency(-disc), negative: true },
              { label: "Net (excl. VAT)", value: formatCurrency(net) },
              { label: `${taxConfig.label} (${taxConfig.percentage}%)`, value: formatCurrency(vat), muted: true },
            ]} total={{ label: "Fleet total", value: formatCurrency(net + vat) }} />
          </Card>
          <PrimaryButton className="w-full!" onClick={save}>Save fleet deal</PrimaryButton>
          {savedFleet && (
            <Card title="Submit to Evolve" subtitle={`${savedFleet.vehicles.length} vehicles · ${savedFleet.oem}`}>
              <Field label="OTP number" htmlFor="fleet-otp">
                <TextInput id="fleet-otp" value={otpNumber} onChange={(e) => setOtpNumber(e.target.value)} placeholder="e.g. OTP60001" />
              </Field>
              <EvolveWriteActions className="mt-3" label="Submit to Evolve (25)" build={buildFleet} send={sendEvolveFleetDeal} onSent={(r) => recordFleetDeal(r.dealNumber)} />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

// ── Cancel Sale / Refund ─────────────────────────────────────────────────────
const FORFEIT_FEE_PCT = 10;

interface CancelRecord {
  prevStatus: DealStatus;
  mode: "refund" | "forfeit";
  reason: string;
  notes: string;
  outcome?: "Approved" | "Rejected";
  log: { id: string; kind: "submit" | "approve" | "reject"; at: string; title: string; body?: string }[];
}

export function CancelSale() {
  const { deal, list, select } = useDealParam();
  return (
    <>
      <PageHeader />
      <Notice tone="info" className="mb-5">No Evolve API: TrueGear records the approval and audit trail. Finance processes any refund in Evolve. No refund or financial transaction happens from this screen.</Notice>
      {deal ? <CancelForDeal key={deal.id} deal={deal} list={list} onSelect={select} /> : <NoDeal />}
    </>
  );
}

function CancelForDeal({ deal, list, onSelect }: { deal: Deal; list: Deal[]; onSelect: (id: string) => void }) {
  const { formatCurrency, taxConfig } = useCurrency();
  const data = useSalesData();
  const [records, setRecords] = usePersistentState<Record<string, CancelRecord>>("sale.cancellations", {});
  const rec = records[deal.id];
  const [mode, setMode] = useState<"refund" | "forfeit">(rec?.mode ?? "refund");
  const [reason, setReason] = useState(rec?.reason ?? "");
  const [notes, setNotes] = useState(rec?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dialog, setDialog] = useState<null | "submit" | "approve" | "reject">(null);
  const canApprove = useSalesAccess().can("payment", "approve");
  const t = dealTotals(deal, taxConfig.percentage);
  const customer = customerById(deal.customerId);

  const state = deal.status === "Cancelled" ? "Approved" : deal.status === "Cancellation requested" ? "Pending manager approval" : rec?.outcome === "Rejected" ? "Rejected" : "Draft";
  const received = t.paid;
  const fee = mode === "forfeit" ? received * (FORFEIT_FEE_PCT / 100) : 0;
  const refund = received - fee;
  const editable = state === "Draft" || state === "Rejected";

  const openSubmit = () => {
    const e: Record<string, string> = {};
    if (!reason) e.reason = "Select a cancellation reason";
    if (!notes.trim()) e.notes = "Add a note for the manager";
    setErrors(e);
    if (!Object.keys(e).length) setDialog("submit");
  };

  const confirm = () => {
    if (dialog === "submit") {
      const entry = { id: `s-${Date.now()}`, kind: "submit" as const, at: stamp(), title: `Cancellation requested — ${mode === "refund" ? "full refund" : `forfeit ${FORFEIT_FEE_PCT}%`}`, body: `${reason}: ${notes}` };
      setRecords((r) => ({ ...r, [deal.id]: { prevStatus: deal.status, mode, reason, notes, log: [...(r[deal.id]?.log ?? []), entry] } }));
      salesStore.update("deals", (d) => d.id === deal.id, { status: "Cancellation requested" });
      logActivity(deal, "Cancellation", `${deal.id}: cancellation requested (${reason})`, userById(deal.repId)?.name ?? "Sales executive");
      previewToast("Cancellation sent for manager approval");
    } else if (dialog === "approve" && rec) {
      const entry = { id: `a-${Date.now()}`, kind: "approve" as const, at: stamp(), title: "Approved by Sales Manager", body: `Finance to process ${formatCurrency(refund)} refund in Evolve.` };
      setRecords((r) => ({ ...r, [deal.id]: { ...rec, outcome: "Approved", log: [...rec.log, entry] } }));
      salesStore.update("deals", (d) => d.id === deal.id, { status: "Cancelled" });
      salesStore.update("stock", (s) => s.stockNo === deal.stockNo, (s) => ({ ...s, status: s.type === "Demo" ? "Demo" : "In Stock", reservedFor: undefined }));
      salesStore.remove("handovers", (h) => h.dealId === deal.id);
      logActivity(deal, "Cancellation", `${deal.id}: cancellation approved — vehicle back in stock`, userById(deal.managerId)?.name ?? "Sales manager");
      previewToast(`Deal ${deal.id} cancelled — ${deal.stockNo} back in stock`);
    } else if (dialog === "reject" && rec) {
      const entry = { id: `r-${Date.now()}`, kind: "reject" as const, at: stamp(), title: "Rejected by Sales Manager" };
      setRecords((r) => ({ ...r, [deal.id]: { ...rec, outcome: "Rejected", log: [...rec.log, entry] } }));
      salesStore.update("deals", (d) => d.id === deal.id, { status: rec.prevStatus });
      logActivity(deal, "Cancellation", `${deal.id}: cancellation rejected — deal stays active`, userById(deal.managerId)?.name ?? "Sales manager");
      previewToast("Cancellation rejected");
    }
    setDialog(null);
  };

  const audit: { id: string; icon: typeof Clock; tone: Tone; title: string; meta: string; body?: string }[] = [
    { id: "created", icon: Receipt, tone: "blue", title: `Deal ${deal.id} created`, meta: `${fmtDate(deal.created)} · ${userById(deal.repId)?.name ?? "Sales executive"}` },
    ...deal.payments.map((p) => ({ id: p.id, icon: Wallet, tone: "green" as Tone, title: `${formatCurrency(p.amount)} recorded in TrueGear`, meta: `${fmtDate(p.date)} · ${p.method} · ${p.reference}` })),
    ...(rec?.log ?? []).map((l) => ({
      id: l.id, icon: l.kind === "submit" ? Send : l.kind === "approve" ? Check : X, tone: (l.kind === "submit" ? "amber" : l.kind === "approve" ? "green" : "red") as Tone,
      title: l.title, meta: `${l.at} · ${l.kind === "submit" ? userById(deal.repId)?.name ?? "Sales executive" : userById(deal.managerId)?.name ?? "Sales manager"}`, body: l.body,
    })),
  ];
  const hasHandoverOut = data.handovers.some((h) => h.dealId === deal.id && h.gatePass?.redeemed);

  return (
    <>
      <DealHeaderCard deal={deal} list={list} onSelect={onSelect} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-5">
          <Card title="Refund or forfeit">
            <RadioCards name="cancel-mode" value={mode} onChange={(v) => editable && setMode(v)} options={[
              { value: "refund", label: "Full refund", description: "Return everything received to the customer" },
              { value: "forfeit", label: `Forfeit ${FORFEIT_FEE_PCT}% of amount received`, description: "Customer withdrew after acceptance; admin fee retained" },
            ]} />
            <FormGrid>
              <div className="mt-4">
                <Field label="Reason" required error={errors.reason}>
                  <SelectInput value={reason} onChange={(e) => { setReason(e.target.value); setErrors((x) => ({ ...x, reason: "" })); }} error={!!errors.reason} placeholder="Select reason" disabled={!editable}
                    options={["Finance declined", "Customer changed mind", "Vehicle no longer available", "Duplicate deal", "Pricing error"]} />
                </Field>
              </div>
              <div className="mt-4 md:col-span-2">
                <Field label="Notes for manager" required error={errors.notes}>
                  <TextArea value={notes} onChange={(e) => { setNotes(e.target.value); setErrors((x) => ({ ...x, notes: "" })); }} disabled={!editable} placeholder="What happened and what the customer was told" />
                </Field>
              </div>
            </FormGrid>
          </Card>
          <Card title="Audit trail" icon={History}><Timeline items={audit} /></Card>
        </div>
        <div className="space-y-5 lg:sticky lg:top-0">
          <Card title="Settlement" actions={<StatusBadge status={state} tone={state === "Approved" ? "green" : state === "Rejected" ? "red" : state === "Draft" ? "gray" : "amber"} />}>
            <SummaryRows rows={[
              { label: "Received in TrueGear", value: formatCurrency(received) },
              { label: mode === "forfeit" ? `Forfeit fee (${FORFEIT_FEE_PCT}%)` : "Forfeit fee", value: formatCurrency(-fee), negative: fee > 0 },
            ]} total={{ label: "Refund to customer", value: formatCurrency(refund) }} />
          </Card>
          {editable && (hasHandoverOut || deal.status === "Delivered"
            ? <Notice tone="warning">This vehicle has already left the dealership. Cancel it through a return process instead.</Notice>
            : <PrimaryButton className="w-full!" onClick={openSubmit}>Request manager approval</PrimaryButton>)}
          {state === "Pending manager approval" && (
            <Card title="Manager decision">
              {canApprove ? (
                <>
                  <p className="text-[12px] text-[#666] mb-3">Approve to cancel the sale and return the vehicle to stock.</p>
                  <div className="flex gap-2">
                    <SmallButton variant="danger" icon={X} onClick={() => setDialog("reject")}>Reject</SmallButton>
                    <SmallButton variant="primary" icon={Check} onClick={() => setDialog("approve")}>Approve</SmallButton>
                  </div>
                </>
              ) : (
                <p className="text-[12px] text-[#666]">Waiting for a manager. Approving needs Payment › Approve permission.</p>
              )}
            </Card>
          )}
          {state === "Approved" && <Notice tone="success" title="Cancelled">The vehicle is back in stock. Finance must still process any refund in Evolve — nothing has been refunded.</Notice>}
          {state === "Rejected" && <Notice tone="danger" title="Rejected">The deal stays active. You can submit a new request.</Notice>}
        </div>
      </div>
      <ConfirmDialog open={dialog !== null} onClose={() => setDialog(null)} onConfirm={confirm} danger={dialog === "reject"}
        title={dialog === "submit" ? "Request cancellation approval" : dialog === "approve" ? "Approve cancellation" : "Reject cancellation"}
        confirmLabel={dialog === "submit" ? "Send request" : dialog === "approve" ? "Approve" : "Reject"}
        message={<>Cancel deal <span className="font-semibold">{deal.id}</span> for {customer?.name ?? "the customer"} with a {mode === "refund" ? "full refund" : "forfeit"} — refund {formatCurrency(refund)}.</>} />
    </>
  );
}
