// Module 4 — CRM / Enquiry: offers. Offers and selections are saved on the
// server (data/store.ts); sending is simulated — no messages are sent yet.

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Megaphone, Users, Wallet, CalendarDays, Send, Mail, MessageCircle, CircleCheck } from "lucide-react";
import Modal from "../../../components/common/Modal";
import { useCurrency } from "../../../context/CurrencyContext";
import {
  PageHeader, Card, KpiGrid, KpiCard, Toolbar, SearchInput, FilterSelect, DataTable, StatusBadge, SmallButton,
  PrimaryButton, SecondaryButton, Field, TextInput, SelectInput, TextArea, FormGrid, ConfirmDialog, KeyValueGrid,
  Notice, EmptyState, RadioCards, ProgressBar, Badge, type Column,
} from "../components/ui";
import { previewToast } from "../components/helpers";
import { screenPath } from "../registry";
import { MODEL_CODES, OEM_INCENTIVES, CAMPAIGNS, fmtDate } from "../data/mock";
import { useSalesData, usePersistentState, salesStore, today, type SalesData } from "../data/store";

// ── Offers ───────────────────────────────────────────────────────────────────
interface Offer {
  id: string;
  name: string;
  start: string;
  end: string;
  models: string[];
  offerType: "Cash discount" | "Free accessories" | "Finance rate" | "Service plan upgrade";
  value: number;
  incentive: string;
  budget: number;
  status: "Active" | "Scheduled" | "Draft" | "Expired";
}

// Status follows the dates (a Draft stays Draft until edited).
const statusOf = (o: Offer): Offer["status"] => {
  if (o.status === "Draft") return "Draft";
  const t = today();
  return o.end < t ? "Expired" : o.start > t ? "Scheduled" : "Active";
};

// Budget used = offer value × deals in the offer window on an eligible model.
function budgetUsed(o: Offer, data: SalesData) {
  const n = data.deals.filter((d) => {
    if (d.status === "Cancelled" || d.created < o.start || d.created > o.end) return false;
    const code = data.stock.find((s) => s.stockNo === d.stockNo)?.modelCode;
    return !!code && o.models.includes(code);
  }).length;
  return n * o.value;
}

const useOffers = () => usePersistentState<Offer[]>("offers.list", []);

type OfferRow = Offer & { used: number };

type OfferForm = Omit<Offer, "id" | "status" | "value" | "budget"> & { value: string; budget: string };
const EMPTY_OFFER: OfferForm = { name: "", start: "", end: "", models: [], offerType: "Cash discount", value: "", incentive: "", budget: "" };

export function Offers() {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const data = useSalesData();
  const [stored, setOffers] = useOffers();
  const offers: OfferRow[] = stored.map((o) => ({ ...o, status: statusOf(o), used: budgetUsed(o, data) }));
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [editing, setEditing] = useState<OfferRow | "new" | null>(null);
  const [form, setForm] = useState<OfferForm>(EMPTY_OFFER);
  const [errors, setErrors] = useState<Partial<Record<keyof OfferForm, string>>>({});

  const rows = offers
    .filter((o) => status === "All statuses" || o.status === status)
    .filter((o) => o.name.toLowerCase().includes(q.toLowerCase()) || o.id.toLowerCase().includes(q.toLowerCase()));

  const open = (o: OfferRow | "new") => {
    setEditing(o);
    setErrors({});
    setForm(o === "new" ? EMPTY_OFFER : { name: o.name, start: o.start, end: o.end, models: o.models, offerType: o.offerType, value: String(o.value), incentive: o.incentive, budget: String(o.budget) });
  };

  const save = async () => {
    const e: Partial<Record<keyof OfferForm, string>> = {};
    if (!form.name.trim()) e.name = "Offer name is required";
    if (!form.start) e.start = "Start date is required";
    if (!form.end) e.end = "End date is required";
    else if (form.start && form.end < form.start) e.end = "End date must be after the start date";
    if (form.models.length === 0) e.models = "Select at least one eligible model";
    if (!Number(form.value)) e.value = "Enter the offer value";
    if (!Number(form.budget)) e.budget = "Enter a budget cap";
    setErrors(e);
    if (Object.keys(e).length) return;
    const base = { ...form, value: Number(form.value), budget: Number(form.budget) };
    if (editing === "new") {
      const id = await salesStore.nextNumber("OF");
      setOffers((list) => [{ ...base, id, status: "Active" }, ...list]);
      previewToast("Offer created");
    } else if (editing) {
      setOffers((list) => list.map((o) => (o.id === editing.id ? { ...o, ...base, status: o.status === "Draft" ? "Draft" : "Active" } : o)));
      previewToast("Offer updated");
    }
    setEditing(null);
  };

  const toggleModel = (code: string) =>
    setForm((f) => ({ ...f, models: f.models.includes(code) ? f.models.filter((m) => m !== code) : [...f.models, code] }));

  const columns: Column<OfferRow>[] = [
    { key: "name", header: "Offer", render: (o) => (<div><p className="font-medium text-[#333]">{o.name}</p><p className="text-[11px] text-[#999]">{o.id}</p></div>), sortValue: (o) => o.name },
    { key: "dates", header: "Date range", render: (o) => `${fmtDate(o.start)} – ${fmtDate(o.end)}`, sortValue: (o) => o.start },
    { key: "models", header: "Eligible models", render: (o) => <span title={o.models.join(", ")}>{o.models.length === 1 ? o.models[0] : `${o.models.length} models`}</span> },
    { key: "offer", header: "Offer / incentive", render: (o) => (<div><p>{o.offerType} · {formatCurrency(o.value)}</p>{o.incentive && <p className="text-[11px] text-[#0061FF]">OEM: {OEM_INCENTIVES.find((i) => i.code === o.incentive)?.name}</p>}</div>) },
    { key: "budget", header: "Budget cap", render: (o) => (<div className="w-36"><p className="text-[12px]">{formatCurrency(o.used)} / {formatCurrency(o.budget)}</p><ProgressBar value={o.used} max={o.budget || 1} tone={o.used / (o.budget || 1) > 0.85 ? "red" : "brand"} label={`${o.name} budget used`} /></div>), sortValue: (o) => o.used / (o.budget || 1) },
    { key: "status", header: "Status", render: (o) => <StatusBadge status={o.status} /> },
    {
      key: "act", header: "", align: "right",
      render: (o) => (
        <div className="flex gap-1 justify-end">
          <SmallButton variant="ghost" icon={Pencil} onClick={(e) => { e.stopPropagation(); open(o); }} aria-label={`Edit ${o.name}`}>Edit</SmallButton>
          {o.status !== "Expired" && <SmallButton icon={Users} onClick={(e) => { e.stopPropagation(); navigate(`${screenPath("crm", "choose-customers")}?offer=${o.id}`); }}>Customers</SmallButton>}
        </div>
      ),
    },
  ];

  const active = offers.filter((o) => o.status === "Active");

  return (
    <>
      <PageHeader actions={<PrimaryButton icon={Plus} onClick={() => open("new")}>New Offer</PrimaryButton>} />
      <KpiGrid>
        <KpiCard label="Active offers" value={active.length} icon={Megaphone} />
        <KpiCard label="Scheduled" value={offers.filter((o) => o.status === "Scheduled").length} icon={CalendarDays} />
        <KpiCard label="Active budget" value={formatCurrency(active.reduce((n, o) => n + o.budget, 0))} icon={Wallet} />
        <KpiCard label="Budget used" value={formatCurrency(active.reduce((n, o) => n + o.used, 0))} hint="Across active offers" icon={Wallet} />
      </KpiGrid>
      <Card>
        <Toolbar>
          <SearchInput value={q} onChange={setQ} placeholder="Search offer name or number" />
          <FilterSelect label="Status" value={status} onChange={setStatus} options={["All statuses", "Active", "Scheduled", "Draft", "Expired"]} />
        </Toolbar>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(o) => o.id}
          onRowClick={open}
          empty={offers.length
            ? <EmptyState icon={Megaphone} title="No offers match" message="Clear the search or choose another status." />
            : <EmptyState icon={Megaphone} title="No offers yet" message="Create the first offer, then choose customers to send it to." action={<SmallButton variant="primary" icon={Plus} onClick={() => open("new")}>New Offer</SmallButton>} />}
        />
      </Card>

      <Modal isOpen={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "New offer" : "Edit offer"} size="lg">
        <div className="space-y-4">
          <FormGrid>
            <Field label="Offer name" required error={errors.name} className="md:col-span-2" htmlFor="of-name">
              <TextInput id="of-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={!!errors.name} placeholder="e.g. Summer Hilux Drive" />
            </Field>
            <Field label="Start date" required error={errors.start} htmlFor="of-start"><TextInput id="of-start" type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} error={!!errors.start} /></Field>
            <Field label="End date" required error={errors.end} htmlFor="of-end"><TextInput id="of-end" type="date" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} error={!!errors.end} /></Field>
            <Field label="Offer type" required htmlFor="of-type">
              <SelectInput id="of-type" value={form.offerType} onChange={(e) => setForm({ ...form, offerType: e.target.value as Offer["offerType"] })} options={["Cash discount", "Free accessories", "Finance rate", "Service plan upgrade"]} />
            </Field>
            <Field label="Offer value per vehicle" required error={errors.value} htmlFor="of-val"><TextInput id="of-val" type="number" min={0} className="no-spinner" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} error={!!errors.value} /></Field>
            <Field label="Linked OEM incentive" htmlFor="of-inc">
              <SelectInput id="of-inc" value={form.incentive} onChange={(e) => setForm({ ...form, incentive: e.target.value })} placeholder="None" options={OEM_INCENTIVES.map((i) => ({ value: i.code, label: `${i.name} (${formatCurrency(i.amount)})` }))} />
            </Field>
            <Field label="Budget cap" required error={errors.budget} htmlFor="of-budget"><TextInput id="of-budget" type="number" min={0} className="no-spinner" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} error={!!errors.budget} /></Field>
          </FormGrid>
          <Field label="Eligible models / stock" required error={errors.models}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {MODEL_CODES.map((m) => (
                <label key={m.code} className="flex items-center gap-2 text-[12px] text-[#444] border border-[#f0f0f0] rounded-md px-2 py-1.5 cursor-pointer hover:bg-[#fafafa]">
                  <input type="checkbox" checked={form.models.includes(m.code)} onChange={() => toggleModel(m.code)} className="accent-[#ff4f31]" />
                  <span className="truncate">{m.model}</span>
                </label>
              ))}
            </div>
          </Field>
          <div className="flex gap-3 pt-1">
            <SecondaryButton className="flex-1" onClick={() => setEditing(null)}>Cancel</SecondaryButton>
            <PrimaryButton className="flex-1" onClick={save}>{editing === "new" ? "Create offer" : "Save changes"}</PrimaryButton>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ── Choose Customers for Offer ───────────────────────────────────────────────
interface Target {
  id: string;
  name: string;
  vehicle: string;
  registration: string;
  vehicleAge: number | null;
  odometer: number | null;
  lastService: string;
  enquiry: string;
  enquiryStatus: "Open" | "Won" | "Lost" | "None";
  channel: string;
}

// One row per customer; current vehicle = first vehicle on
// the customer record, enquiry = their latest enquiry.
function buildTargets(data: SalesData): Target[] {
  const year = new Date().getFullYear();
  return data.customers.map((c) => {
    const v = c.vehicles[0];
    const enq = data.enquiries.filter((e) => e.customerId === c.id).sort((a, b) => b.created.localeCompare(a.created))[0];
    return {
      id: c.id,
      name: c.name,
      vehicle: v ? `${v.year} ${v.make} ${v.model}` : "No vehicle on record",
      registration: v?.registration ?? "",
      vehicleAge: v ? year - v.year : null,
      odometer: v?.odometer ?? null,
      lastService: v?.lastService ?? "",
      enquiry: enq ? `${enq.interest} (${enq.status})` : "",
      enquiryStatus: !enq ? "None" : enq.status === "Won" ? "Won" : enq.status === "Lost" ? "Lost" : "Open",
      channel: c.type === "Company" ? "Email" : "WhatsApp",
    };
  });
}

// Customers who opted out of marketing (everyone else counts as consented),
// and the selection handed from Choose Customers to Send Offer.
const useNoConsent = () => usePersistentState<Record<string, boolean>>("offers.noConsent", {});
const useSelection = () => usePersistentState<string[]>("offers.selectedCustomers", []);
const ENQUIRY_FILTERS: Record<string, Target["enquiryStatus"] | null> = { "Any enquiry status": null, "Open enquiry": "Open", "Won enquiry": "Won", "Lost enquiry": "Lost", "No enquiry": "None" };

export function ChooseCustomers() {
  const navigate = useNavigate();
  const data = useSalesData();
  const [noConsent, setNoConsent] = useNoConsent();
  const [selected, setSelected] = useSelection();
  const [minAge, setMinAge] = useState("0");
  const [enquiryFilter, setEnquiryFilter] = useState("Any enquiry status");
  const [eligibility, setEligibility] = useState("Consented only");
  const [q, setQ] = useState("");
  const targets = useMemo(() => buildTargets(data), [data]);
  const consent = (t: Target) => !noConsent[t.id];

  const rows = targets
    .filter((t) => Number(minAge) === 0 || (t.vehicleAge !== null && t.vehicleAge >= Number(minAge)))
    .filter((t) => !ENQUIRY_FILTERS[enquiryFilter] || t.enquiryStatus === ENQUIRY_FILTERS[enquiryFilter])
    .filter((t) => (eligibility === "Consented only" ? consent(t) : true))
    .filter((t) => [t.name, t.vehicle, t.registration, t.enquiry].join(" ").toLowerCase().includes(q.toLowerCase()));

  const sel = targets.filter((t) => selected.includes(t.id));

  return (
    <>
      <PageHeader actions={<PrimaryButton icon={Send} disabled={selected.length === 0} onClick={() => navigate(screenPath("crm", "send-offer"))}>Continue to Send Offer</PrimaryButton>} />
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-start">
        <Card className="lg:col-span-3" title="Customers">
          <Toolbar>
            <SearchInput value={q} onChange={setQ} placeholder="Search customer, vehicle or registration" />
            <FilterSelect label="Enquiry" value={enquiryFilter} onChange={setEnquiryFilter} options={Object.keys(ENQUIRY_FILTERS)} />
            <FilterSelect label="Vehicle age" value={minAge} onChange={setMinAge} options={[{ value: "0", label: "Any vehicle age" }, { value: "3", label: "Older than 3 years" }, { value: "5", label: "Older than 5 years" }, { value: "8", label: "Older than 8 years" }, { value: "10", label: "Older than 10 years" }]} />
            <FilterSelect label="Eligibility" value={eligibility} onChange={setEligibility} options={["Consented only", "Include no-consent"]} />
          </Toolbar>
          <DataTable
            selectable
            selected={selected}
            onSelectedChange={setSelected}
            rows={rows}
            rowKey={(t) => t.id}
            columns={[
              { key: "name", header: "Customer", render: (t) => <span className="font-medium text-[#333]">{t.name}</span>, sortValue: (t) => t.name },
              { key: "vehicle", header: "Current vehicle", render: (t) => (<div><p>{t.vehicle}</p>{t.registration && <p className="text-[11px] text-[#999]">{t.registration}</p>}</div>) },
              { key: "age", header: "Vehicle age", align: "right", render: (t) => (t.vehicleAge === null ? "—" : `${t.vehicleAge} yrs`), sortValue: (t) => t.vehicleAge ?? -1 },
              { key: "odo", header: "Odometer", align: "right", render: (t) => (t.odometer === null ? "—" : `${t.odometer.toLocaleString()} km`), sortValue: (t) => t.odometer ?? -1 },
              { key: "svc", header: "Last service", render: (t) => (t.lastService ? fmtDate(t.lastService) : "—"), sortValue: (t) => t.lastService },
              { key: "enq", header: "Latest enquiry", render: (t) => t.enquiry || <span className="text-[#ccc]">—</span> },
              {
                key: "consent", header: "Marketing consent",
                render: (t) => (
                  <button type="button" className="cursor-pointer" title="Click to change consent" onClick={(e) => { e.stopPropagation(); setNoConsent((m) => ({ ...m, [t.id]: consent(t) })); }}>
                    {consent(t) ? <Badge tone="green">Yes</Badge> : <Badge tone="red">No</Badge>}
                  </button>
                ),
              },
            ]}
            empty={targets.length
              ? <EmptyState icon={Users} title="No customers match these filters" message="Relax the filters or include no-consent customers." />
              : <EmptyState icon={Users} title="No customers yet" message="Customers are created when you capture an enquiry." action={<SmallButton variant="primary" onClick={() => navigate(screenPath("crm", "add-enquiry"))}>Add enquiry</SmallButton>} />}
          />
        </Card>
        <div className="space-y-4 lg:sticky lg:top-0">
          <Card title="Selection summary">
            <p className="text-[32px] text-[#333] leading-none">{selected.length}</p>
            <p className="text-[12px] text-[#999] mb-3">customers selected of {rows.length} matching</p>
            <KeyValueGrid cols={2} items={[
              { label: "WhatsApp", value: sel.filter((s) => s.channel === "WhatsApp").length },
              { label: "Email", value: sel.filter((s) => s.channel === "Email").length },
              { label: "Avg vehicle age", value: sel.some((s) => s.vehicleAge !== null) ? `${(sel.reduce((n, s) => n + (s.vehicleAge ?? 0), 0) / sel.filter((s) => s.vehicleAge !== null).length).toFixed(1)} yrs` : "—" },
              { label: "No consent", value: sel.filter((s) => !consent(s)).length },
            ]} />
            {sel.some((s) => !consent(s)) && <Notice tone="warning" className="mt-3">Customers without marketing consent will be excluded when sending.</Notice>}
            <div className="flex gap-2 mt-4">
              <SmallButton onClick={() => setSelected(rows.map((r) => r.id))}>Select all matching</SmallButton>
              <SmallButton variant="ghost" onClick={() => setSelected([])} disabled={!selected.length}>Clear</SmallButton>
            </div>
          </Card>
          <Notice tone="info">Lists the customers captured in this module. Click a consent badge to change it. No Evolve API is needed.</Notice>
        </div>
      </div>
    </>
  );
}

// ── Send Offer ───────────────────────────────────────────────────────────────
const OFFER_TEMPLATES = [
  { id: "t1", name: "Trade-up invitation", subject: "{{first_name}}, your {{vehicle}} could be worth more than you think", body: "Hi {{first_name}},\n\nYour {{vehicle}} is now {{vehicle_age}} years old. This month, {{offer_name}} gives you {{offer_value}} off a new Toyota.\n\nBook a valuation at {{branch}} — reply YES and we will call you.\n\nELT Group Sales" },
  { id: "t2", name: "Hybrid test-drive invite", subject: "Drive the Corolla Cross Hybrid this week", body: "Hi {{first_name}},\n\nJoin us for {{offer_name}} at {{branch}}. Test drive the Corolla Cross Hybrid and get {{offer_value}} in free accessories on purchase.\n\nELT Group Sales" },
  { id: "t3", name: "Fleet renewal briefing", subject: "Fleet renewal support for {{company}}", body: "Dear {{first_name}},\n\nOur {{offer_name}} programme offers {{offer_value}} support per unit on 3+ vehicles. May we arrange a fleet review?\n\nELT Group Fleet Sales" },
];

export function SendOffer() {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const data = useSalesData();
  const [stored] = useOffers();
  const [noConsent] = useNoConsent();
  const [selected] = useSelection();
  const offers = stored.map((o) => ({ ...o, status: statusOf(o), used: budgetUsed(o, data) })).filter((o) => o.status !== "Expired");
  const [channel, setChannel] = useState<"Email" | "WhatsApp">("WhatsApp");
  const [offerId, setOfferId] = useState("");
  const [templateId, setTemplateId] = useState("t1");
  const [campaign, setCampaign] = useState("");
  const [schedule, setSchedule] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const offer = offers.find((o) => o.id === offerId) ?? offers[0];
  const tpl = OFFER_TEMPLATES.find((t) => t.id === templateId)!;
  const recipients = buildTargets(data).filter((t) => selected.includes(t.id) && !noConsent[t.id]);
  const sample = recipients[0];

  if (!offer || (!sample && !done)) {
    return (
      <>
        <PageHeader />
        <Card>
          {!offer ? (
            <EmptyState icon={Send} title="No active offer" message="Create an offer first, then choose the customers to send it to." action={<SmallButton variant="primary" onClick={() => navigate(screenPath("crm", "offers"))}>Go to Offers</SmallButton>} />
          ) : (
            <EmptyState icon={Users} title="No recipients selected" message="Pick customers with marketing consent on Choose Customers." action={<SmallButton variant="primary" onClick={() => navigate(screenPath("crm", "choose-customers"))}>Choose customers</SmallButton>} />
          )}
        </Card>
      </>
    );
  }

  const first = sample?.name ?? "Customer";
  const merge = (text: string) =>
    text
      .replace(/{{first_name}}/g, first.split(" ")[0])
      .replace(/{{vehicle}}/g, sample?.vehicle ?? "vehicle")
      .replace(/{{vehicle_age}}/g, String(sample?.vehicleAge ?? "—"))
      .replace(/{{offer_name}}/g, offer.name)
      .replace(/{{offer_value}}/g, formatCurrency(offer.value))
      .replace(/{{branch}}/g, "ELT Midrand")
      .replace(/{{company}}/g, first);

  const submit = () => {
    if (!campaign) { setError("Select a campaign"); return; }
    setConfirm(true);
  };

  return (
    <>
      <PageHeader />
      {done && (
        <Notice tone="success" title="Campaign simulated" className="mb-5" action={<SmallButton onClick={() => setDone(false)}>Compose another</SmallButton>}>
          No emails or WhatsApp messages were sent. In the live module {recipients.length} messages would be queued on the TrueGear {channel} channel.
        </Notice>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-5">
          <Card title="Compose">
            <div className="space-y-4">
              <Field label="Channel" required>
                <RadioCards name="channel" value={channel} onChange={setChannel} options={[
                  { value: "WhatsApp", label: "WhatsApp", description: "Approved business template" },
                  { value: "Email", label: "Email", description: "TrueGear SMTP channel" },
                ]} />
              </Field>
              <FormGrid>
                <Field label="Offer" required htmlFor="so-offer">
                  <SelectInput id="so-offer" value={offer.id} onChange={(e) => setOfferId(e.target.value)} options={offers.map((o) => ({ value: o.id, label: o.name }))} />
                </Field>
                <Field label="Campaign" required error={error} htmlFor="so-camp">
                  <SelectInput id="so-camp" value={campaign} onChange={(e) => { setCampaign(e.target.value); setError(""); }} placeholder="Select campaign" options={CAMPAIGNS.filter((c) => c !== "None")} error={!!error} />
                </Field>
                <Field label="Template" required htmlFor="so-tpl">
                  <SelectInput id="so-tpl" value={templateId} onChange={(e) => setTemplateId(e.target.value)} options={OFFER_TEMPLATES.map((t) => ({ value: t.id, label: t.name }))} />
                </Field>
                <Field label="Schedule (optional)" hint="Leave empty to send immediately" htmlFor="so-when">
                  <TextInput id="so-when" type="datetime-local" value={schedule} onChange={(e) => setSchedule(e.target.value)} />
                </Field>
              </FormGrid>
              {channel === "Email" && <Field label="Subject"><TextInput value={tpl.subject} readOnly /></Field>}
              <Field label="Message body" hint="Merge fields: {{first_name}}, {{vehicle}}, {{vehicle_age}}, {{offer_name}}, {{offer_value}}, {{branch}}">
                <TextArea value={tpl.body} readOnly className="min-h-[150px] font-mono text-[12px]" />
              </Field>
            </div>
          </Card>
          <Card title="Recipient preview" subtitle={`${recipients.length} selected customer(s) with marketing consent`}>
            <DataTable
              paginate={false}
              dense
              rows={recipients}
              rowKey={(r) => r.id}
              columns={[
                { key: "name", header: "Customer", render: (r) => r.name },
                { key: "vehicle", header: "Vehicle", render: (r) => r.vehicle },
                { key: "ch", header: "Preferred channel", render: (r) => (r.channel === channel ? <Badge tone="green">{r.channel}</Badge> : <Badge tone="gray">{r.channel}</Badge>) },
              ]}
            />
          </Card>
        </div>
        <div className="space-y-5 lg:sticky lg:top-0">
          <Card title="Message preview" icon={channel === "Email" ? Mail : MessageCircle}>
            <div className={channel === "WhatsApp" ? "bg-[#e7f7e7] rounded-lg p-3" : "border border-[#e5e7eb] rounded-lg p-3"}>
              {channel === "Email" && <p className="text-[12px] font-semibold text-[#333] mb-2">{merge(tpl.subject)}</p>}
              <p className="text-[12px] text-[#333] whitespace-pre-line">{merge(tpl.body)}</p>
            </div>
            <p className="text-[11px] text-[#999] mt-2">Preview for {first}</p>
          </Card>
          <Card title="Campaign summary">
            <KeyValueGrid cols={2} items={[
              { label: "Offer", value: offer.name },
              { label: "Campaign", value: campaign || "—" },
              { label: "Channel", value: channel },
              { label: "Recipients", value: recipients.length },
              { label: "When", value: schedule ? schedule.replace("T", " ") : "Immediately" },
              { label: "Budget left", value: formatCurrency(offer.budget - offer.used) },
            ]} />
          </Card>
          <PrimaryButton className="w-full!" icon={Send} onClick={submit}>Send offer</PrimaryButton>
        </div>
      </div>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          setDone(true);
          // Log the simulated offer on each customer's history for follow-up.
          recipients.forEach((r, i) => salesStore.add("activities", { id: `ACT-${Date.now()}-${i}`, customerId: r.id, type: "Offer (simulated)", date: today(), note: `${offer.name} via ${channel}, not actually sent`, by: "Offers" }));
          previewToast("Offer campaign simulated — no messages sent");
        }}
        title="Send offer campaign"
        confirmLabel="Simulate send"
        message={<>Simulate sending <span className="font-semibold text-[#333]">{offer.name}</span> to {recipients.length} customers via {channel}? <span className="flex items-center gap-1 mt-2 text-[12px]"><CircleCheck size={12} /> No messages will actually be sent.</span></>}
      />
    </>
  );
}
