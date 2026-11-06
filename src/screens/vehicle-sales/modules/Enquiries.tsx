// Module 4 — CRM / Enquiry: enquiries. Saved on the server via data/store.ts.

import { useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus, Eye, Inbox, Flame, UserCheck, Clock, Phone, Mail, MessageCircle, Car, CalendarDays, TriangleAlert,
  CircleCheck, ArrowUp, ArrowDown, Trash2, Shuffle, History, FileText, User, Building2, Pencil, StickyNote,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Modal from "../../../components/common/Modal";
import { useCurrency } from "../../../context/CurrencyContext";
import {
  PageHeader, Card, KpiGrid, KpiCard, Toolbar, SearchInput, FilterSelect, FilterPills, DataTable, StatusBadge,
  SmallButton, PrimaryButton, SecondaryButton, Field, TextInput, SelectInput, TextArea, FormGrid, ConfirmDialog,
  KeyValueGrid, Notice, Timeline, EmptyState, Badge, Toggle, RadioCards, ProgressBar, type Column, type Tone,
} from "../components/ui";
import { previewToast } from "../components/helpers";
import toast from "react-hot-toast";
import { createSalesCustomer } from "../../../api/vehicleSales.api";
import { CompanyPicker, CustomerFinder, type FoundCustomer, type SalesCompany } from "../components/CustomerFinder";
import { VehicleCataloguePicker, type CatalogueChoice } from "../components/VehicleCataloguePicker";
import { useCatalogueMakes } from "../components/vehicleCatalogue";
import { screenPath } from "../registry";
import { useLeadScope, useMyEnquiries } from "../access";
import {
  EXECUTIVES, MANAGERS, BRANCHES, FRANCHISES, LEAD_SOURCES, CAMPAIGNS, MODEL_CODES, fmtDate,
  type Enquiry, type Branch, type StockVehicle,
} from "../data/mock";
import {
  salesStore, useSalesData, usePersistentState, customerById, userById, enquiryById, today,
  type Activity,
} from "../data/store";

const ENQ_STATUSES = ["New", "Contacted", "Qualified", "Test Drive", "Quoted", "Negotiation", "Won", "Lost"] as const;

const fmtWhen = (iso: string) =>
  iso.length <= 10 ? fmtDate(iso) : new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

function logActivity(a: { customerId: string; enquiryId?: string; type: string; note: string }) {
  salesStore.add("activities", { id: salesStore.localId("ACT"), date: new Date().toISOString(), by: "You", ...a });
}

const ACTIVITY_ICON: Record<string, { icon: LucideIcon; tone: Tone }> = {
  Call: { icon: Phone, tone: "blue" },
  Email: { icon: Mail, tone: "violet" },
  WhatsApp: { icon: MessageCircle, tone: "green" },
  Enquiry: { icon: Inbox, tone: "blue" },
  Reassigned: { icon: Shuffle, tone: "amber" },
  "Test drive": { icon: Car, tone: "brand" },
};
const activityItem = (a: Activity) => {
  const m = ACTIVITY_ICON[a.type] ?? { icon: StickyNote, tone: "gray" as Tone };
  return { id: a.id, icon: m.icon, tone: m.tone, title: a.note, meta: `${a.type} · ${fmtWhen(a.date)} · ${a.by}` };
};

// ── Log call popup (shared by quick view and Enquiry Details) ────────────────
type CallOutcome = "Answered" | "No answer" | "Asked to call back" | "Unreachable";
type CallResponse = "Interested" | "Agreed to proceed" | "Needs time to decide" | "Not interested";
const CALL_HOURS = Array.from({ length: 10 }, (_, i) => 8 + i); // matches the sales calendar, 08:00–17:00
const CALL_STAGES: Enquiry["status"][] = ENQ_STATUSES.filter((s) => s !== "Lost");
// Stage a positive response moves the enquiry up to (never down from).
const RESPONSE_STAGE: Partial<Record<CallResponse, Enquiry["status"]>> = { Interested: "Qualified", "Agreed to proceed": "Negotiation" };

function LogCallModal({ enq, onClose }: { enq: Enquiry | null; onClose: () => void }) {
  return (
    <Modal isOpen={!!enq} onClose={onClose} title={enq ? `Log call · ${customerById(enq.customerId)?.name ?? enq.id}` : ""} size="lg">
      {enq && <LogCallForm key={enq.id} enq={enq} onClose={onClose} />}
    </Modal>
  );
}

function LogCallForm({ enq, onClose }: { enq: Enquiry; onClose: () => void }) {
  const navigate = useNavigate();
  const [, setTasks] = usePersistentState<TaskRef[]>("followUps.tasks", []);
  const startStage = enq.status === "New" ? "Contacted" : enq.status;
  const [outcome, setOutcome] = useState<CallOutcome>("Answered");
  const [response, setResponse] = useState<CallResponse>("Interested");
  const [stage, setStage] = useState<Enquiry["status"]>(() => suggestStage(startStage, "Interested"));
  const [notes, setNotes] = useState("");
  const [schedule, setSchedule] = useState(true);
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const [fuDate, setFuDate] = useState(tomorrow);
  const [fuHour, setFuHour] = useState("10");
  const [agenda, setAgenda] = useState("");
  const [errors, setErrors] = useState<{ date?: string; agenda?: string }>({});

  function suggestStage(current: Enquiry["status"], r: CallResponse) {
    const target = RESPONSE_STAGE[r];
    return target && ENQ_STATUSES.indexOf(target) > ENQ_STATUSES.indexOf(current) ? target : current;
  }

  const answered = outcome === "Answered";
  const notInterested = answered && response === "Not interested";
  const stageOptions = CALL_STAGES.includes(startStage) ? CALL_STAGES : [...CALL_STAGES, startStage];

  const save = () => {
    const e: typeof errors = {};
    if (schedule && !notInterested) {
      if (!fuDate) e.date = "Pick a follow-up date";
      else if (fuDate < today()) e.date = "Follow-up date can't be in the past";
      if (!agenda.trim()) e.agenda = "What is the follow-up for?";
    }
    setErrors(e);
    if (Object.keys(e).length) return;

    const c = customerById(enq.customerId);
    const newStage = answered && !notInterested ? stage : enq.status === "New" ? "Contacted" : enq.status;
    const parts = [answered ? `Call answered — ${response}` : `Call: ${outcome}`];
    if (newStage !== enq.status) parts.push(`status ${enq.status} → ${newStage}`);
    if (notes.trim()) parts.push(notes.trim());
    if (schedule && !notInterested) parts.push(`Next follow-up ${fmtDate(fuDate)} ${fuHour.padStart(2, "0")}:00 — ${agenda.trim()}`);
    logActivity({ customerId: enq.customerId, enquiryId: enq.id, type: "Call", note: parts.join(" · ") });

    if (newStage !== enq.status) salesStore.update("enquiries", (x) => x.id === enq.id, { status: newStage, daysInStage: 0 });
    if (schedule && !notInterested) {
      setTasks((list) => [...list, {
        id: `e-${Date.now()}`, date: fuDate, start: Number(fuHour), duration: 1, type: "Follow-up", ownerId: enq.ownerId,
        title: agenda.trim(), customer: c?.name ?? "", customerId: enq.customerId, enquiryId: enq.id,
      }]);
    }
    previewToast(schedule && !notInterested ? "Call logged and follow-up scheduled" : "Call logged");
    onClose();
    if (notInterested) navigate(`${screenPath("crm", "close-as-lost")}?id=${enq.id}`);
  };

  return (
    <div className="space-y-4">
      <Field label="Call outcome" required>
        <RadioCards name="call-outcome" value={outcome} onChange={(v) => { setOutcome(v); setSchedule(true); }} options={[
          { value: "Answered", label: "Answered", description: "Spoke to the customer" },
          { value: "No answer", label: "No answer", description: "Rang out / voicemail" },
          { value: "Asked to call back", label: "Call back", description: "Customer busy, call later" },
          { value: "Unreachable", label: "Unreachable", description: "Switched off / wrong number" },
        ]} />
      </Field>

      {answered && (
        <FormGrid>
          <Field label="Customer response" required htmlFor="call-resp">
            <SelectInput id="call-resp" value={response} onChange={(e) => { const r = e.target.value as CallResponse; setResponse(r); setStage(suggestStage(startStage, r)); }}
              options={["Interested", "Agreed to proceed", "Needs time to decide", "Not interested"]} />
          </Field>
          {!notInterested && (
            <Field label="Enquiry status" hint={`Currently ${enq.status}`} htmlFor="call-stage">
              <SelectInput id="call-stage" value={stage} onChange={(e) => setStage(e.target.value as Enquiry["status"])} options={stageOptions} />
            </Field>
          )}
        </FormGrid>
      )}
      {notInterested && <Notice tone="warning">After saving you'll go to Close as lost to record the reason and competitor.</Notice>}

      <Field label="Call notes" htmlFor="call-notes">
        <TextArea id="call-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What was discussed, objections, budget or vehicle changes…" />
      </Field>

      {!notInterested && (
        <div className="border border-[#e5e7eb] rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div><p className="text-[13px] font-medium text-[#333]">Schedule next follow-up</p><p className="text-[11px] text-[#999]">Added to the sales calendar for {userById(enq.ownerId)?.name ?? "the owner"}</p></div>
            <Toggle label="Schedule next follow-up" checked={schedule} onChange={setSchedule} />
          </div>
          {schedule && (
            <FormGrid>
              <Field label="Date" required error={errors.date} htmlFor="call-fu-date">
                <TextInput id="call-fu-date" type="date" min={today()} value={fuDate} error={!!errors.date} onChange={(e) => { setFuDate(e.target.value); setErrors({ ...errors, date: undefined }); }} />
              </Field>
              <Field label="Time" required htmlFor="call-fu-time">
                <SelectInput id="call-fu-time" value={fuHour} onChange={(e) => setFuHour(e.target.value)} options={CALL_HOURS.map((h) => ({ value: String(h), label: `${String(h).padStart(2, "0")}:00` }))} />
              </Field>
              <Field label="Agenda" required error={errors.agenda} className="md:col-span-2" htmlFor="call-fu-agenda">
                <TextInput id="call-fu-agenda" value={agenda} error={!!errors.agenda} placeholder={answered ? "e.g. Send quote, confirm finance, book test drive" : "e.g. Try calling again"}
                  onChange={(e) => { setAgenda(e.target.value); setErrors({ ...errors, agenda: undefined }); }} />
              </Field>
            </FormGrid>
          )}
        </div>
      )}

      <div className="flex gap-3 justify-end"><SecondaryButton onClick={onClose}>Cancel</SecondaryButton><PrimaryButton onClick={save}>Save call</PrimaryButton></div>
    </div>
  );
}

function NoEnquiries({ title = "No enquiries yet", message = "Capture your first enquiry to start testing the sales flow." }: { title?: string; message?: string }) {
  const navigate = useNavigate();
  return <EmptyState icon={Inbox} title={title} message={message} action={<PrimaryButton icon={Plus} onClick={() => navigate(screenPath("crm", "add-enquiry"))}>Add Enquiry</PrimaryButton>} />;
}

// Funnel: how many enquiries reached each stage (their current stage or later),
// New → Won, with the conversion from the previous stage. Lost enquiries left
// the funnel and are counted on their own. Click a stage to list it.
function EnquiryFunnel({ enquiries, format, onPick }: { enquiries: Enquiry[]; format: (n: number) => string; onPick: (status: string) => void }) {
  const stages: string[] = ENQ_STATUSES.filter((s) => s !== "Lost");
  const live = enquiries.filter((e) => e.status !== "Lost");
  const lost = enquiries.filter((e) => e.status === "Lost");
  const reached = stages.map((_, i) => live.filter((e) => stages.indexOf(e.status) >= i).length);
  const top = Math.max(reached[0], 1);
  const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : "—");

  return (
    <div>
      <div className="grid grid-cols-[84px_1fr_52px] gap-3 px-1 pb-2 text-[11px] uppercase tracking-wide text-[#999]">
        <span>Stage</span><span>Reached</span><span className="text-right">Conv.</span>
      </div>
      <ul className="space-y-1.5">
        {stages.map((stage, i) => {
          const here = live.filter((e) => e.status === stage);
          const width = (reached[i] / top) * 100;
          const tip = `${stage}: ${reached[i]} reached · ${here.length} currently here · ${format(here.reduce((n, e) => n + e.value, 0))} open value`;
          return (
            <li key={stage}>
              <button type="button" onClick={() => onPick(stage)} title={tip} aria-label={tip}
                className="group w-full grid grid-cols-[84px_1fr_52px] gap-3 items-center rounded-lg px-1 py-1.5 text-left hover:bg-[#fafafa] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4f31]">
                <span className="text-[13px] text-[#333] truncate">{stage}</span>
                <span className="relative h-7 flex justify-center">
                  {/* Centred bar → funnel silhouette; a hairline keeps empty stages visible. */}
                  <span className="h-full rounded bg-[#ff4f31] transition-all" style={{ width: `${Math.max(width, reached[i] ? 2 : 0)}%`, opacity: 1 - i * 0.09 }} />
                  {!reached[i] && <span className="absolute inset-x-0 top-1/2 h-px bg-[#e5e7eb]" />}
                  <span className="absolute inset-0 flex items-center justify-center text-[12px] font-semibold tabular-nums text-[#333] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <span className="bg-white/90 rounded px-1.5">{reached[i]}{here.length && here.length !== reached[i] ? <span className="font-normal text-[#999]"> · {here.length} here</span> : null}</span>
                  </span>
                </span>
                <span className="text-right text-[12px] tabular-nums text-[#555]">{i === 0 ? <span className="text-[#999]">100%</span> : pct(reached[i], reached[i - 1])}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 pt-3 border-t border-[#f0f0f0] flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-[#555]">
        <span>Overall conversion (New → Won): <strong className="text-[#333] tabular-nums">{pct(reached[stages.length - 1], reached[0])}</strong></span>
        <button type="button" onClick={() => onPick("Lost")} className="hover:underline cursor-pointer">
          Lost: <strong className="text-[#333] tabular-nums">{lost.length}</strong> ({pct(lost.length, enquiries.length)} of all) — not in the funnel
        </button>
      </div>
    </div>
  );
}

// Lead sources: one bar per source (all enquiries), largest first, with how
// many of them were won. Single series → one hue; values sit beside the bars.
function LeadSourceChart({ enquiries, onPick }: { enquiries: Enquiry[]; onPick: (source: string) => void }) {
  const bySource = [...new Set([...LEAD_SOURCES, ...enquiries.map((e) => e.source)])]
    .map((source) => {
      const list = enquiries.filter((e) => e.source === source);
      return { source, total: list.length, won: list.filter((e) => e.status === "Won").length };
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total || a.source.localeCompare(b.source));
  const max = Math.max(1, ...bySource.map((r) => r.total));

  return (
    <div>
      <div className="grid grid-cols-[120px_1fr_64px] gap-3 px-1 pb-2 text-[11px] uppercase tracking-wide text-[#999]">
        <span>Source</span><span>Enquiries</span><span className="text-right">Won</span>
      </div>
      <ul className="space-y-1.5">
        {bySource.map((r) => {
          const tip = `${r.source}: ${r.total} enquir${r.total === 1 ? "y" : "ies"} · ${r.won} won (${Math.round((r.won / r.total) * 100)}%)`;
          return (
            <li key={r.source}>
              <button type="button" onClick={() => onPick(r.source)} title={tip} aria-label={tip}
                className="w-full grid grid-cols-[120px_1fr_64px] gap-3 items-center rounded-lg px-1 py-1.5 text-left hover:bg-[#fafafa] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4f31]">
                <span className="text-[13px] text-[#333] truncate">{r.source}</span>
                <span className="flex items-center gap-2 min-w-0">
                  <span className="h-5 rounded-r bg-[#ff4f31] shrink-0" style={{ width: `${(r.total / max) * 85}%` }} />
                  <span className="text-[12px] font-semibold tabular-nums text-[#333]">{r.total}</span>
                </span>
                <span className="text-right text-[12px] tabular-nums text-[#555]">{r.won}<span className="text-[#999]"> · {Math.round((r.won / r.total) * 100)}%</span></span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 pt-3 border-t border-[#f0f0f0] text-[12px] text-[#555]">
        Top source: <strong className="text-[#333]">{bySource[0]?.source ?? "—"}</strong>
        {bySource[0] ? <> · {Math.round((bySource[0].total / enquiries.length) * 100)}% of all enquiries</> : null}
      </p>
    </div>
  );
}

// Add Enquiry's "Unassigned" choice: the lead goes to the open pool.
const UNASSIGNED = "__unassigned__";

// Take an unclaimed lead. Re-checked against the latest data so a lead someone
// else claimed a moment ago is not taken over.
function claimEnquiry(id: string, me: string) {
  const current = enquiryById(id);
  if (!current) return;
  if (current.ownerId) { toast.error(`${id} was already claimed by ${userById(current.ownerId)?.name ?? "someone else"}`); return; }
  salesStore.update("enquiries", (e) => e.id === id, { ownerId: me });
  logActivity({ customerId: current.customerId, enquiryId: id, type: "Assignment", note: `Lead claimed by ${userById(me)?.name ?? "salesperson"}` });
  toast.success(`${id} is now yours`);
}

// ── All Enquiries ────────────────────────────────────────────────────────────
export function AllEnquiries() {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const enquiries = useMyEnquiries(); // a sales executive sees own + unclaimed only
  const { seesAll, me } = useLeadScope();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [source, setSource] = useState("All sources");
  const [branch, setBranch] = useState("All branches");
  const [owner, setOwner] = useState("All owners");
  const [quickId, setQuickId] = useState<string | null>(null);
  const quick = enquiries.find((e) => e.id === quickId) ?? null;
  const [callId, setCallId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Funnel + lead sources per salesperson (managers; an executive only sees their own anyway).
  const [chartOwner, setChartOwner] = useState("all");
  const chartEnquiries = chartOwner === "all" ? enquiries : enquiries.filter((e) => (e.ownerId || "") === chartOwner);
  const chartOwnerName = chartOwner === "all" ? "" : chartOwner === "" ? "Unclaimed" : userById(chartOwner)?.name ?? "";
  const toList = () => listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const scoped = useMemo(() => enquiries.filter((e) => {
    const c = customerById(e.customerId);
    return (source === "All sources" || e.source === source) &&
      (branch === "All branches" || e.branch === branch) &&
      (owner === "All owners" || e.ownerId === owner) &&
      [e.id, c?.name, c?.phone, c?.email, e.interest].join(" ").toLowerCase().includes(q.toLowerCase());
  }), [enquiries, q, source, branch, owner]);
  const rows = useMemo(() => scoped.filter((e) => status === "All" || e.status === status), [scoped, status]);

  const count = (s: string) => (s === "All" ? enquiries.length : enquiries.filter((e) => e.status === s).length);
  const details = (e: Enquiry) => navigate(`${screenPath("crm", "enquiry-details")}?id=${e.id}`);

  const columns: Column<Enquiry>[] = [
    { key: "id", header: "Enquiry no.", render: (e) => <span className="font-medium text-[#ff4f31]">{e.id}</span>, sortValue: (e) => e.id },
    { key: "customer", header: "Customer", render: (e) => { const c = customerById(e.customerId); return <div><p className="text-[#333]">{c?.name}</p><p className="text-[11px] text-[#999]">{[c?.phone, c?.email].filter(Boolean).join(" · ")}</p></div>; }, sortValue: (e) => customerById(e.customerId)?.name ?? "" },
    { key: "source", header: "Source", render: (e) => <div><p>{e.source}</p>{e.campaign !== "None" && <p className="text-[11px] text-[#999]">{e.campaign}</p>}</div>, sortValue: (e) => e.source },
    { key: "interest", header: "Interested vehicle", render: (e) => e.interest },
    { key: "budget", header: "Budget", align: "right", render: (e) => formatCurrency(e.budget), sortValue: (e) => e.budget },
    { key: "owner", header: "Owner", render: (e) => e.ownerId ? userById(e.ownerId)?.name ?? "—"
        : <span className="inline-flex items-center gap-2"><Badge tone="amber">Unclaimed</Badge>{me && <SmallButton onClick={(ev) => { ev.stopPropagation(); claimEnquiry(e.id, me); }}>Claim</SmallButton>}</span>,
      sortValue: (e) => userById(e.ownerId)?.name ?? "" },
    { key: "branch", header: "Branch", render: (e) => e.branch },
    { key: "priority", header: "Priority", render: (e) => <StatusBadge status={e.priority} /> },
    { key: "status", header: "Status", render: (e) => <StatusBadge status={e.status} />, sortValue: (e) => ENQ_STATUSES.indexOf(e.status) },
    { key: "created", header: "Created", render: (e) => fmtDate(e.created), sortValue: (e) => e.created },
    { key: "act", header: "", align: "right", render: (e) => <SmallButton icon={Eye} onClick={(ev) => { ev.stopPropagation(); setQuickId(e.id); }}>Quick view</SmallButton> },
  ];

  const open = enquiries.filter((e) => e.status !== "Won" && e.status !== "Lost");
  return (
    <>
      <PageHeader actions={<PrimaryButton icon={Plus} onClick={() => navigate(screenPath("crm", "add-enquiry"))}>Add Enquiry</PrimaryButton>} />
      <KpiGrid>
        <KpiCard label="Open enquiries" value={open.length} icon={Inbox} />
        <KpiCard label="Hot leads" value={open.filter((e) => e.priority === "Hot").length} icon={Flame} />
        <KpiCard label="New (uncontacted)" value={count("New")} hint="Contact within 1 hour" icon={Clock} />
        <KpiCard label="Pipeline value" value={formatCurrency(open.reduce((n, e) => n + e.value, 0))} icon={UserCheck} />
      </KpiGrid>
      {enquiries.length > 0 && (
        <>
          {seesAll && (
            <div className="flex items-center justify-end gap-2 mb-3">
              <span className="text-[12px] text-[#555]">Charts for</span>
              <FilterSelect label="Salesperson" value={chartOwner} onChange={setChartOwner} className="md:w-56"
                options={[{ value: "all", label: "All salespeople" }, ...EXECUTIVES.map((u) => ({ value: u.id, label: u.name })), { value: "", label: "Unclaimed" }]} />
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5 items-stretch">
            <Card title={chartOwnerName ? `Enquiry funnel — ${chartOwnerName}` : "Enquiry funnel"} subtitle="Furthest stage reached · click a stage to list it">
              {chartEnquiries.length ? (
                <EnquiryFunnel enquiries={chartEnquiries} format={formatCurrency}
                  onPick={(s) => { setSource("All sources"); setStatus(s); if (chartOwner !== "all") setOwner(chartOwner); toList(); }} />
              ) : <p className="text-[13px] text-[#999]">No enquiries for {chartOwnerName}.</p>}
            </Card>
            <Card title={chartOwnerName ? `Lead sources — ${chartOwnerName}` : "Lead sources"} subtitle="Enquiries per source · click a source to list it">
              {chartEnquiries.length ? (
                <LeadSourceChart enquiries={chartEnquiries} onPick={(src) => { setStatus("All"); setSource(src); if (chartOwner !== "all") setOwner(chartOwner); toList(); }} />
              ) : <p className="text-[13px] text-[#999]">No enquiries for {chartOwnerName}.</p>}
            </Card>
          </div>
        </>
      )}
      <div ref={listRef} className="scroll-mt-4">
      <Card>
        <FilterPills value={status} onChange={setStatus} options={["All", ...ENQ_STATUSES].map((s) => ({ key: s, label: s, count: count(s) }))} />
        <Toolbar>
          <SearchInput value={q} onChange={setQ} placeholder="Search enquiry no., customer, phone, email or vehicle" />
          <FilterSelect label="Source" value={source} onChange={setSource} options={["All sources", ...LEAD_SOURCES]} />
          <FilterSelect label="Branch" value={branch} onChange={setBranch} options={["All branches", ...BRANCHES]} />
          {seesAll && <FilterSelect label="Owner" value={owner} onChange={setOwner} options={[{ value: "All owners", label: "All owners" }, { value: "", label: "Unclaimed" }, ...EXECUTIVES.map((u) => ({ value: u.id, label: u.name }))]} />}
        </Toolbar>
        <DataTable columns={columns} rows={rows} rowKey={(e) => e.id} onRowClick={details}
          empty={enquiries.length === 0 ? <NoEnquiries /> : <EmptyState icon={Inbox} title="No enquiries match" message="Try another status, source or owner." />} />
      </Card>
      </div>

      <Modal isOpen={!!quick} onClose={() => setQuickId(null)} title={quick ? `Enquiry ${quick.id}` : ""} size="lg">
        {quick && (() => {
          const c = customerById(quick.customerId);
          return (
            <div className="space-y-4">
              <div className="flex gap-2"><StatusBadge status={quick.status} /><StatusBadge status={quick.priority} /></div>
              <KeyValueGrid cols={2} items={[
                { label: "Customer", value: c?.name },
                { label: "Contact", value: [c?.phone, c?.email].filter(Boolean).join(" · ") || "—" },
                { label: "Interested in", value: quick.interest },
                { label: "Budget", value: formatCurrency(quick.budget) },
                { label: "Finance", value: quick.finance },
                { label: "Trade-in", value: quick.tradeIn ? "Yes" : "No" },
                { label: "Owner", value: `${userById(quick.ownerId)?.name} (${quick.branch})` },
                { label: "Source / campaign", value: `${quick.source} / ${quick.campaign}` },
              ]} />
              <div className="flex gap-2 flex-wrap">
                <SmallButton variant="primary" onClick={() => details(quick)}>Open details</SmallButton>
                <SmallButton icon={Phone} onClick={() => { setCallId(quick.id); setQuickId(null); }}>Log call</SmallButton>
                <SmallButton icon={Shuffle} onClick={() => navigate(screenPath("crm", "reassign-enquiries"))}>Reassign</SmallButton>
              </div>
            </div>
          );
        })()}
      </Modal>
      <LogCallModal enq={enquiries.find((e) => e.id === callId) ?? null} onClose={() => setCallId(null)} />
    </>
  );
}

// ── Add Enquiry ──────────────────────────────────────────────────────────────
interface EnqForm {
  type: "Individual" | "Company";
  firstName: string;
  lastName: string;
  company: string;
  regNumber: string;
  contactPerson: string;
  phone: string;
  email: string;
  city: string;
  source: string;
  campaign: string;
  branch: string;
  executive: string;
  interest: string;
  budget: string;
  priority: Enquiry["priority"];
  finance: string;
  tradeIn: boolean;
  notes: string;
}

const EMPTY_ENQ: EnqForm = { type: "Individual", firstName: "", lastName: "", company: "", regNumber: "", contactPerson: "", phone: "", email: "", city: "", source: "", campaign: "None", branch: "", executive: "", interest: "", budget: "", priority: "Warm", finance: "", tradeIn: false, notes: "" };

const franchiseOf = (model: string) => {
  const cat = MODEL_CODES.find((m) => m.model === model)?.category;
  return cat === "LCV" || cat === "Bus" ? "Toyota Commercial" : "Toyota";
};

// First enabled rule (top to bottom) that matches source / branch / franchise.
// Round-robin picks the executive with the fewest open enquiries.
function autoAssign(rules: Rule[], enquiries: Enquiry[], source: string, branch: string, interest: string) {
  const openCount = (id: string) => enquiries.filter((e) => e.ownerId === id && e.status !== "Won" && e.status !== "Lost").length;
  const fewest = (ids: string[]) => [...ids].sort((a, b) => openCount(a) - openCount(b))[0];
  const rule = rules.find((r) => r.enabled && r.assignTo.length > 0 &&
    (r.source === "Any" || r.source === source) &&
    (r.branch === "Any" || r.branch === branch) &&
    (r.franchise === "Any" || r.franchise === franchiseOf(interest)));
  if (rule) return { ownerId: rule.roundRobin ? fewest(rule.assignTo) : rule.assignTo[0], via: `rule “${rule.name}”` };
  const branchExecs = EXECUTIVES.filter((u) => !u.branch || u.branch === branch).map((u) => u.id);
  return { ownerId: fewest(branchExecs.length ? branchExecs : EXECUTIVES.map((u) => u.id)), via: "branch fallback (no rule matched)" };
}

// Stock that fits an enquiry: the same Evolve model code when the enquiry has
// one (catalogue pick), otherwise the model name — with or without the make,
// since catalogue enquiries read "Make Model" and stock holds the model only.
function stockMatchesEnquiry(e: Enquiry, v: StockVehicle) {
  if (e.modelCode && v.modelCode && v.modelCode.toUpperCase() === e.modelCode.toUpperCase()) return true;
  const want = e.interest.split(" × ")[0].trim().toUpperCase();
  if (!want) return false;
  const names = [v.model, `${v.make} ${v.model}`].map((n) => n.trim().toUpperCase()).filter(Boolean);
  return names.some((n) => n === want || n.startsWith(want) || want.startsWith(n));
}

export function AddEnquiry() {
  const navigate = useNavigate();
  const leadScope = useLeadScope();
  const { customers, enquiries } = useSalesData();
  const [rules] = usePersistentState<Rule[]>("enquiries.assignRules", SEED_RULES);
  const [form, setForm] = useState<EnqForm>(EMPTY_ENQ);
  const [errors, setErrors] = useState<Partial<Record<keyof EnqForm, string>>>({});
  // Like Create Appointment: search an existing customer (Vehicle Sales,
  // Evolve CRM, TrueGear) or switch to "+ Add New".
  const [tab, setTab] = useState<"search" | "new">("search");
  const [found, setFound] = useState<FoundCustomer | null>(null);
  const linked = found?.salesCustomerId ?? null;
  const [saved, setSaved] = useState<{ id: string; ownerId: string; via: string; newCustomer: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [customerError, setCustomerError] = useState("");
  // Company for both "Search Existing" and "+ Add New".
  const [company, setCompany] = useState<SalesCompany | null>(null);
  const [companyError, setCompanyError] = useState("");
  // Vehicle of interest: Make → Model → Model code, like Create Appointment.
  const catalogue = useCatalogueMakes();
  const useCatalogue = catalogue.makes !== null && catalogue.makes.length > 0;
  const [vehicle, setVehicle] = useState<Partial<CatalogueChoice>>({});
  const pickVehicle = (v: Partial<CatalogueChoice>) => {
    setVehicle(v);
    set("interest", v.modelCode ? `${v.make ?? ""} ${v.model || v.series || v.modelCode}`.trim() : "");
  };

  const set = <K extends keyof EnqForm>(k: K, v: EnqForm[K]) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };

  const digits = (s: string) => s.replace(/\D/g, "");
  const duplicate = tab === "new" ? customers.find((c) =>
    (form.phone && c.phone && digits(c.phone) === digits(form.phone)) ||
    (form.email && c.email && c.email.toLowerCase() === form.email.trim().toLowerCase()) ||
    (form.type === "Individual" && form.firstName && form.lastName && c.name.toLowerCase() === `${form.firstName} ${form.lastName}`.toLowerCase().trim()),
  ) : undefined;

  // Fill the customer fields from the selected search result (they stay locked).
  const pick = (c: FoundCustomer) => {
    setFound(c);
    if (c.type === "Company") setForm((f) => ({ ...f, type: "Company", company: c.name, regNumber: c.regNumber ?? "", phone: c.phone, email: c.email, city: c.city }));
    else { const [first, ...rest] = c.name.split(" "); setForm((f) => ({ ...f, type: "Individual", firstName: first, lastName: rest.join(" "), phone: c.phone, email: c.email, city: c.city })); }
    setErrors({});
    setCustomerError("");
  };
  // "Possible duplicate" in + Add New: use the existing Vehicle Sales customer.
  const link = (id: string) => {
    const c = customerById(id);
    if (!c) return;
    setTab("search");
    pick({ source: "Vehicle Sales", key: `vs:${c.id}`, name: c.name, type: c.type, phone: c.phone, email: c.email, city: c.city, regNumber: c.regNumber, custSequenceId: c.custSequenceId, salesCustomerId: c.id });
  };
  const switchTab = (t: "search" | "new") => {
    setTab(t);
    setFound(null);
    setForm((f) => ({ ...EMPTY_ENQ, source: f.source, campaign: f.campaign, branch: f.branch, executive: f.executive, interest: f.interest, budget: f.budget, priority: f.priority, finance: f.finance, tradeIn: f.tradeIn, notes: f.notes }));
    setErrors({});
    setCustomerError("");
  };

  // A customer found in one company is not carried over to another.
  const changeCompany = (c: SalesCompany | null) => {
    setCompany(c);
    setCompanyError("");
    if (found) switchTab(tab);
  };

  const validate = () => {
    const e: Partial<Record<keyof EnqForm, string>> = {};
    setCompanyError(company ? "" : "Select the company");
    if (!company) {
      setErrors({});
      return false;
    }
    const noCustomer = tab === "search" && !found;
    setCustomerError(noCustomer ? "Search and select the customer, or use “+ Add New”." : "");
    if (noCustomer) {
      setErrors({});
      return false;
    }
    if (form.type === "Individual") {
      if (!form.firstName.trim()) e.firstName = "First name is required";
      if (!form.lastName.trim()) e.lastName = "Last name is required";
    } else {
      if (!form.company.trim()) e.company = "Company name is required";
      if (!form.contactPerson.trim() && !found) e.contactPerson = "Contact person is required";
    }
    if (!form.phone.trim() && !form.email.trim()) e.phone = "Enter a phone number or email";
    else if (form.phone && digits(form.phone).length < 10) e.phone = "Phone number looks too short";
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Enter a valid email";
    if (!form.source) e.source = "Select the lead source";
    if (!form.branch) e.branch = "Select a branch";
    if (!form.interest) e.interest = useCatalogue ? "Select the make, model and model code" : "Select the vehicle of interest";
    if (!form.finance) e.finance = "Select how the customer will pay";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (saving || !validate()) return;
    setSaving(true);
    try {
      await saveEnquiry();
    } finally {
      setSaving(false);
    }
  };

  const saveEnquiry = async () => {
    // An Evolve / TrueGear customer already in Vehicle Sales is reused, not duplicated.
    let existing = linked ?? (found?.custSequenceId ? customers.find((c) => c.custSequenceId === found.custSequenceId)?.id : undefined);

    // "+ Add New": create the customer in the TrueGear customer master first —
    // the server pushes it to Evolve (04 CustomerMaintenance) in the background,
    // the same as a new customer on Create Appointment.
    let tg: { truegearCustomerId: string; custSequenceId?: string; crmReferenceNo?: string } | undefined;
    if (!found) {
      try {
        const res = await createSalesCustomer({
          type: form.type,
          firstName: form.firstName.trim() || undefined,
          lastName: form.lastName.trim() || undefined,
          companyName: form.company.trim() || undefined,
          regNo: form.regNumber.trim() || undefined,
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          companyId: company?.companyId,
        });
        tg = res.data ?? undefined;
      } catch (e) {
        const err = e as { response?: { status?: number; data?: { error?: { message?: string } } } };
        toast.error(err.response?.status === 403
          ? "Your role cannot create customers (needs CRM / Enquiry › Create)."
          : err.response?.data?.error?.message ?? "The customer could not be created — try again.");
        return;
      }
      if (tg) existing = customers.find((c) => c.truegearCustomerId === tg!.truegearCustomerId)?.id ?? existing;
    }

    const id = await salesStore.nextNumber("ENQ");
    let customerId = existing ?? "";
    if (!customerId) {
      customerId = await salesStore.nextNumber("CUST");
      salesStore.add("customers", {
        id: customerId,
        name: form.type === "Individual" ? `${form.firstName.trim()} ${form.lastName.trim()}` : form.company.trim(),
        type: form.type,
        phone: form.phone.trim(),
        email: form.email.trim(),
        regNumber: form.type === "Company" ? form.regNumber.trim() || undefined : undefined,
        city: form.city.trim() || form.branch,
        custSequenceId: found?.custSequenceId ?? tg?.custSequenceId,
        crmReferenceNo: found?.crmReferenceNo ?? tg?.crmReferenceNo,
        truegearCustomerId: found?.truegearCustomerId ?? tg?.truegearCustomerId,
        companyId: company?.companyId,
        vehicles: found?.vehicle ? [{ ...found.vehicle, odometer: 0, lastService: "" }] : [],
      });
    }
    // Send Sale to Evolve (12) reads the customer's Evolve id from here.
    const custSeq = found?.custSequenceId;
    if (custSeq) {
      const map = (salesStore.get().extra["evolve.custSequenceIds"] ?? {}) as Record<string, string>;
      if (map[customerId] !== custSeq) salesStore.setExtra("evolve.custSequenceIds", { ...map, [customerId]: custSeq });
    }
    const assigned = !leadScope.seesAll && leadScope.me ? { ownerId: leadScope.me, via: "your own capture" }
      : form.executive === UNASSIGNED ? { ownerId: "", via: "the open pool — any executive can claim it" }
      : form.executive ? { ownerId: form.executive, via: "manual selection" }
      : autoAssign(rules, enquiries, form.source, form.branch, form.interest);
    const budget = Number(form.budget) || 0;
    salesStore.add("enquiries", {
      id,
      customerId,
      companyId: company?.companyId ?? company?.interfaceCode,
      companyName: company?.name,
      source: form.source,
      campaign: form.campaign,
      interest: form.interest,
      ...(vehicle.modelCode ? { make: vehicle.make, series: vehicle.series, modelCode: vehicle.modelCode, modelYear: vehicle.year } : {}),
      budget,
      ownerId: assigned.ownerId,
      branch: form.branch as Branch,
      status: "New",
      created: today(),
      priority: form.priority,
      finance: form.finance as Enquiry["finance"],
      tradeIn: form.tradeIn,
      daysInStage: 0,
      value: budget,
    });
    if (form.notes.trim()) salesStore.setExtra(`enquiries.notes.${id}`, form.notes.trim());
    logActivity({ customerId, enquiryId: id, type: "Enquiry", note: `Enquiry created via ${form.source} — ${form.interest}` });
    setSaved({ id, ownerId: assigned.ownerId, via: assigned.via, newCustomer: !existing });
    previewToast(`Enquiry ${id} captured`);
  };

  if (saved) {
    return (
      <>
        <PageHeader />
        <Card>
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3"><CircleCheck className="w-7 h-7 text-green-600" /></div>
            <p className="text-[16px] font-semibold text-[#333]">Enquiry {saved.id} captured</p>
            <p className="text-[13px] text-[#666] mt-1 max-w-md mx-auto">
              {saved.newCustomer ? "A new customer was created" : "Linked to the existing customer"} and {saved.ownerId ? <>assigned to <span className="font-medium">{userById(saved.ownerId)?.name}</span></> : "left unassigned"} via {saved.via}.
            </p>
            <div className="flex justify-center gap-2 mt-5 flex-wrap">
              <SecondaryButton onClick={() => { setForm(EMPTY_ENQ); setFound(null); setTab("search"); setSaved(null); setCompany(null); setVehicle({}); }}>Add another</SecondaryButton>
              <SecondaryButton onClick={() => navigate(screenPath("crm", "all-enquiries"))}>All enquiries</SecondaryButton>
              <PrimaryButton onClick={() => navigate(`${screenPath("crm", "enquiry-details")}?id=${saved.id}`)}>Open enquiry</PrimaryButton>
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
          <div className="flex border border-[#e5e7eb] rounded-lg overflow-hidden bg-white" role="tablist">
            <button type="button" role="tab" aria-selected={tab === "search"} onClick={() => switchTab("search")}
              className={`flex-1 py-2.5 text-[13px] font-medium transition-colors cursor-pointer ${tab === "search" ? "bg-white text-[#333]" : "bg-[#f9f9f9] text-[#999] hover:bg-[#f5f5f5]"}`}>
              Search Existing
            </button>
            <button type="button" role="tab" aria-selected={tab === "new"} onClick={() => switchTab("new")}
              className={`flex-1 py-2.5 text-[13px] font-semibold transition-colors border-l border-[#e5e7eb] cursor-pointer ${tab === "new" ? "bg-white text-[#333]" : "bg-red-50 text-red-500 hover:bg-red-100"}`}>
              + Add New
            </button>
          </div>

          <Card>
            <CompanyPicker value={company} onChange={changeCompany} error={companyError} />
          </Card>

          {tab === "search" && (
            <CustomerFinder key={company?.companyId ?? company?.interfaceCode ?? "none"} company={company}
              salesCustomers={customers} selected={found} onSelect={pick} onAddNew={() => switchTab("new")} />
          )}
          {customerError && <Notice tone="danger">{customerError}</Notice>}
          {found && (
            <Notice tone="success" title={`Selected: ${found.name}`} action={<SmallButton variant="ghost" onClick={() => switchTab("search")}>Clear</SmallButton>}>
              {found.salesCustomerId
                ? `Existing Vehicle Sales customer · ${enquiries.filter((e) => e.customerId === found.salesCustomerId).length} earlier enquiry(s).`
                : `From ${found.source}${found.custSequenceId ? ` · Evolve customer ${found.custSequenceId}` : ""} — saved as a Vehicle Sales customer with this enquiry.`}
            </Notice>
          )}

          {(tab === "new" || found) && <Card title="Customer">
            <div className="mb-4">
              <RadioCards name="enq-type" value={form.type} onChange={(v) => set("type", v)} options={[
                { value: "Individual", label: "Individual", description: "Private buyer" },
                { value: "Company", label: "Company", description: "Business or fleet buyer" },
              ]} />
            </div>
            {duplicate && (
              <Notice tone="warning" className="mb-4" title="Possible duplicate customer" action={<SmallButton onClick={() => link(duplicate.id)}>Use existing</SmallButton>}>
                {duplicate.name} ({[duplicate.phone, duplicate.email].filter(Boolean).join(", ")}) already exists. Link to avoid creating a duplicate.
              </Notice>
            )}
            <FormGrid>
              {form.type === "Individual" ? (
                <>
                  <Field label="First name" required error={errors.firstName} htmlFor="en-first"><TextInput id="en-first" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} error={!!errors.firstName} disabled={!!found} /></Field>
                  <Field label="Last name" required error={errors.lastName} htmlFor="en-last"><TextInput id="en-last" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} error={!!errors.lastName} disabled={!!found} /></Field>
                </>
              ) : (
                <>
                  <Field label="Company name" required error={errors.company} htmlFor="en-co"><TextInput id="en-co" value={form.company} onChange={(e) => set("company", e.target.value)} error={!!errors.company} disabled={!!found} /></Field>
                  <Field label="Registration number" htmlFor="en-reg"><TextInput id="en-reg" value={form.regNumber} onChange={(e) => set("regNumber", e.target.value)} disabled={!!found} placeholder="YYYY/NNNNNN/NN" /></Field>
                  <Field label="Contact person" required={!found} error={errors.contactPerson} htmlFor="en-cp" className="md:col-span-2"><TextInput id="en-cp" value={form.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} error={!!errors.contactPerson} /></Field>
                </>
              )}
              <Field label="Phone" required error={errors.phone} hint="Phone or email required" htmlFor="en-phone"><TextInput id="en-phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} error={!!errors.phone} disabled={!!found} /></Field>
              <Field label="Email" error={errors.email} htmlFor="en-email"><TextInput id="en-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} error={!!errors.email} disabled={!!found} /></Field>
              <Field label="City" htmlFor="en-city"><TextInput id="en-city" value={form.city} onChange={(e) => set("city", e.target.value)} disabled={!!found} /></Field>
            </FormGrid>
          </Card>}

          <Card title="Enquiry">
            <FormGrid>
              <Field label="Lead source" required error={errors.source} htmlFor="en-src"><SelectInput id="en-src" value={form.source} onChange={(e) => set("source", e.target.value)} error={!!errors.source} placeholder="Select source" options={LEAD_SOURCES} /></Field>
              <Field label="Campaign" htmlFor="en-camp"><SelectInput id="en-camp" value={form.campaign} onChange={(e) => set("campaign", e.target.value)} options={CAMPAIGNS} /></Field>
              <Field label="Branch" required error={errors.branch} htmlFor="en-br"><SelectInput id="en-br" value={form.branch} onChange={(e) => set("branch", e.target.value)} error={!!errors.branch} placeholder="Select branch" options={[...BRANCHES]} /></Field>
              {leadScope.seesAll ? (
                <Field label="Sales executive" hint="Blank = auto-assign rules · Unassigned = any executive can claim it" htmlFor="en-exec"><SelectInput id="en-exec" value={form.executive} onChange={(e) => set("executive", e.target.value)} placeholder="Auto-assign"
                  options={[{ value: UNASSIGNED, label: "Unassigned — any executive can claim" }, ...EXECUTIVES.filter((u) => !form.branch || !u.branch || u.branch === form.branch).map((u) => ({ value: u.id, label: u.name }))]} /></Field>
              ) : (
                <Field label="Sales executive" hint="Enquiries you capture are yours"><TextInput value={userById(leadScope.me)?.name ?? "You"} readOnly className="bg-[#fafafa]" /></Field>
              )}
              {useCatalogue ? (
                <VehicleCataloguePicker idPrefix="en-veh" makes={catalogue.makes ?? []} value={vehicle} onChange={pickVehicle} error={errors.interest} />
              ) : (
                <Field label="Vehicle of interest" required error={errors.interest} hint={catalogue.makes === null ? "Loading the vehicle catalogue…" : undefined} htmlFor="en-int">
                  <SelectInput id="en-int" value={form.interest} onChange={(e) => set("interest", e.target.value)} error={!!errors.interest} placeholder="Select model" options={MODEL_CODES.map((m) => m.model)} />
                </Field>
              )}
              <Field label="Budget" htmlFor="en-bud"><TextInput id="en-bud" type="number" min={0} value={form.budget} onChange={(e) => set("budget", e.target.value)} className="no-spinner" onWheel={(e) => e.currentTarget.blur()} placeholder="0" /></Field>
              <Field label="Payment" required error={errors.finance} htmlFor="en-fin"><SelectInput id="en-fin" value={form.finance} onChange={(e) => set("finance", e.target.value)} error={!!errors.finance} placeholder="Select payment" options={["Cash", "Bank finance", "Fleet lease"]} /></Field>
              <Field label="Priority" htmlFor="en-prio"><SelectInput id="en-prio" value={form.priority} onChange={(e) => set("priority", e.target.value as Enquiry["priority"])} options={["Hot", "Warm", "Cold"]} /></Field>
              <Field label="Trade-in" htmlFor="en-trade">
                <label className="flex items-center gap-2 text-[13px] text-[#555] mt-2.5">
                  <input id="en-trade" type="checkbox" checked={form.tradeIn} onChange={(e) => set("tradeIn", e.target.checked)} className="accent-[#ff4f31] w-4 h-4" />
                  Customer has a vehicle to trade in
                </label>
              </Field>
              <Field label="Notes" className="md:col-span-2" htmlFor="en-notes"><TextArea id="en-notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Requirements, timing, trade-in…" /></Field>
            </FormGrid>
          </Card>
        </div>
        <div className="space-y-5 lg:sticky lg:top-0">
          <Card title="Summary">
            <KeyValueGrid cols={2} items={[
              { label: "Customer", value: form.type === "Individual" ? `${form.firstName} ${form.lastName}`.trim() || "—" : form.company || "—" },
              { label: "Company", value: company?.name ?? "—" },
              { label: "Customer record", value: found ? <Badge tone={found.source === "Evolve" ? "blue" : "green"}>{found.salesCustomerId ? "Existing" : found.source}</Badge> : tab === "new" ? <Badge tone="blue">New (TrueGear)</Badge> : "—" },
              { label: "Vehicle", value: form.interest ? `${form.interest}${vehicle.modelCode && vehicle.modelCode !== vehicle.series ? ` (${vehicle.modelCode})` : ""}` : "—" },
              { label: "Assigned to", value: userById(form.executive)?.name ?? "Auto-assign rule" },
            ]} />
          </Card>
          <PrimaryButton className="w-full!" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save enquiry"}</PrimaryButton>
        </div>
      </div>
    </>
  );
}

// ── Enquiry Details ──────────────────────────────────────────────────────────
export function EnquiryDetails() {
  const navigate = useNavigate();
  const enquiries = useMyEnquiries();
  const { canSee } = useLeadScope();
  const [params] = useSearchParams();
  const enq = enquiryById(params.get("id"));

  if (enq && !canSee(enq)) {
    return (<><PageHeader /><EmptyState icon={User} title="Another salesperson's enquiry" message={`${enq.id} is owned by ${userById(enq.ownerId)?.name ?? "another salesperson"}. Ask your sales manager to reassign it if you need it.`}
      action={<SecondaryButton onClick={() => navigate(screenPath("crm", "all-enquiries"))}>My enquiries</SecondaryButton>} /></>);
  }
  if (enq) return <EnquiryDetailView key={enq.id} enq={enq} />;
  if (enquiries.length === 0) return (<><PageHeader /><NoEnquiries /></>);
  return (
    <>
      <PageHeader />
      <Card title="Choose an enquiry" subtitle={params.get("id") ? `Enquiry ${params.get("id")} was not found.` : "Pick an enquiry to open its details."}>
        <SelectInput aria-label="Enquiry" value="" placeholder="Select enquiry" onChange={(e) => navigate(`${screenPath("crm", "enquiry-details")}?id=${e.target.value}`)}
          options={enquiries.map((e) => ({ value: e.id, label: `${e.id} — ${customerById(e.customerId)?.name ?? "Unknown"} · ${e.interest}` }))} />
      </Card>
    </>
  );
}

// Same records the sales calendar (FollowUps) reads and writes.
interface TaskRef { id: string; date: string; start: number; title: string; enquiryId?: string; customerId?: string; done?: boolean; duration?: number; type?: string; ownerId?: string; customer?: string }

function EnquiryDetailView({ enq }: { enq: Enquiry }) {
  const navigate = useNavigate();
  const { me } = useLeadScope();
  const { formatCurrency } = useCurrency();
  const { stock, activities } = useSalesData();
  const c = customerById(enq.customerId);
  const [notes, setNotes] = usePersistentState(`enquiries.notes.${enq.id}`, "");
  const [draftNotes, setDraftNotes] = useState(notes);
  const [editNotes, setEditNotes] = useState(false);
  const [tasks] = usePersistentState<TaskRef[]>("followUps.tasks", []);
  const [callOpen, setCallOpen] = useState(false);

  const history = activities.filter((a) => a.enquiryId === enq.id).sort((a, b) => b.date.localeCompare(a.date));
  const nextTask = tasks.filter((t) => !t.done && (t.enquiryId === enq.id || t.customerId === enq.customerId)).sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`))[0];
  const lastContact = history.find((a) => ["Call", "Email", "WhatsApp", "Visit"].includes(a.type));

  const matches = stock.filter((v) => stockMatchesEnquiry(enq, v));
  const available = matches.filter((v) => v.status === "In Stock" || v.status === "Demo");
  const onOrder = matches.filter((v) => v.status === "In Transit");

  const log = (type: string, title: string) => {
    logActivity({ customerId: enq.customerId, enquiryId: enq.id, type, note: title });
    if (enq.status === "New") salesStore.update("enquiries", (e) => e.id === enq.id, { status: "Contacted", daysInStage: 0 });
    previewToast(title);
  };

  return (
    <>
      <PageHeader
        title={`${enq.id} · ${c?.name ?? "Unknown customer"}`}
        description={`${enq.interest} · ${enq.branch} · Owner ${userById(enq.ownerId)?.name}`}
        actions={
          <>
            <SecondaryButton onClick={() => navigate(screenPath("crm", "all-enquiries"))}>All enquiries</SecondaryButton>
            {!enq.ownerId && me && <SmallButton variant="primary" icon={UserCheck} onClick={() => claimEnquiry(enq.id, me)}>Claim lead</SmallButton>}
            <SmallButton variant="primary" icon={FileText} onClick={() => navigate(`${screenPath("quotation", "new-quote")}?enquiry=${enq.id}`)}>Create quote</SmallButton>
            <SmallButton icon={Car} onClick={() => navigate(`${screenPath("crm", "book-test-drive")}?enquiry=${enq.id}`)}>Book test drive</SmallButton>
            {enq.status !== "Lost" && enq.status !== "Won" && <SmallButton variant="danger" onClick={() => navigate(`${screenPath("crm", "close-as-lost")}?id=${enq.id}`)}>Close as lost</SmallButton>}
          </>
        }
      />
      <div className="flex gap-2 mb-4 flex-wrap"><StatusBadge status={enq.status} /><StatusBadge status={enq.priority} /><Badge tone="gray">{enq.daysInStage} day(s) in stage</Badge></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-5">
          <Card title="Customer" icon={c?.type === "Company" ? Building2 : User}>
            <KeyValueGrid items={[
              { label: "Name", value: c?.name ?? "—" },
              { label: "Type", value: c?.type ?? "—" },
              { label: "Phone", value: c?.phone || "—" },
              { label: "Email", value: c?.email || "—" },
              { label: "City", value: c?.city || "—" },
              { label: "AR account", value: c?.arAccount ?? "None" },
            ]} />
          </Card>
          <Card title="Requirements">
            <KeyValueGrid items={[
              { label: "Vehicle wanted", value: enq.interest },
              { label: "Budget", value: formatCurrency(enq.budget) },
              { label: "Finance preference", value: enq.finance },
              { label: "Source / campaign", value: `${enq.source} / ${enq.campaign}` },
              { label: "Trade-in", value: enq.tradeIn ? (c?.vehicles[0] ? `${c.vehicles[0].year} ${c.vehicles[0].make} ${c.vehicles[0].model}` : "Yes") : "None" },
              { label: "Created", value: fmtDate(enq.created) },
            ]} />
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5"><p className="text-[11px] text-[#999] uppercase tracking-wide">Notes</p>
                <SmallButton variant="ghost" icon={Pencil} onClick={() => { if (editNotes) { setNotes(draftNotes); previewToast("Notes updated"); } else setDraftNotes(notes); setEditNotes(!editNotes); }}>{editNotes ? "Save" : "Edit"}</SmallButton></div>
              {editNotes ? <TextArea value={draftNotes} onChange={(e) => setDraftNotes(e.target.value)} aria-label="Enquiry notes" /> : <p className="text-[13px] text-[#444]">{notes || <span className="text-[#bbb]">No notes yet.</span>}</p>}
            </div>
            {enq.tradeIn && <SmallButton className="mt-3" onClick={() => navigate(screenPath("quotation", "trade-in-value"))}>Value trade-in</SmallButton>}
          </Card>
          <Card title="Matching stock">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2"><p className="text-[11px] text-green-700">Available</p><p className="text-[20px] text-green-800">{available.length}</p></div>
              <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2"><p className="text-[11px] text-blue-700">On order</p><p className="text-[20px] text-blue-800">{onOrder.length}</p></div>
              <div className={`rounded-lg border px-3 py-2 ${available.length + onOrder.length === 0 ? "bg-red-50 border-red-200" : "bg-[#fafafa] border-[#f0f0f0]"}`}><p className="text-[11px] text-[#999]">Order required</p><p className="text-[20px] text-[#333]">{available.length + onOrder.length === 0 ? "Yes" : "No"}</p></div>
            </div>
            {matches.length === 0 ? (
              <EmptyState icon={Car} title="No matching stock" message="Raise a purchase order and receive the vehicle to see it here." action={<SmallButton variant="primary" onClick={() => navigate(screenPath("purchase-order", "new-purchase-order"))}>Raise purchase order</SmallButton>} />
            ) : (
              <DataTable paginate={false} rows={matches} rowKey={(v) => v.stockNo} onRowClick={(v) => navigate(`${screenPath("stock", "vehicle-details")}?stock=${v.stockNo}`)} columns={[
                { key: "stockNo", header: "Stock no.", render: (v) => <span className="text-[#ff4f31] font-medium">{v.stockNo}</span> },
                { key: "model", header: "Model", render: (v) => v.model },
                { key: "colour", header: "Colour", render: (v) => v.colour },
                { key: "branch", header: "Branch", render: (v) => v.branch },
                { key: "price", header: "Price", align: "right", render: (v) => formatCurrency(v.current) },
                { key: "status", header: "Status", render: (v) => <StatusBadge status={v.status} /> },
              ]} />
            )}
          </Card>
        </div>
        <div className="space-y-5">
          <Card title="Follow-up" icon={CalendarDays}>
            <KeyValueGrid cols={2} items={[
              { label: "Next action", value: nextTask ? nextTask.title : "None scheduled" },
              { label: "Due", value: nextTask ? `${fmtDate(nextTask.date)}, ${String(nextTask.start).padStart(2, "0")}:00` : "—" },
              { label: "Last contact", value: lastContact ? `${fmtWhen(lastContact.date)} (${lastContact.type})` : "No contact yet" },
            ]} />
            <div className="flex gap-2 mt-3 flex-wrap">
              <SmallButton icon={Phone} onClick={() => setCallOpen(true)}>Log call</SmallButton>
              <SmallButton icon={Mail} onClick={() => log("Email", "Email logged")}>Log email</SmallButton>
              <SmallButton icon={MessageCircle} onClick={() => log("WhatsApp", "WhatsApp logged")}>WhatsApp</SmallButton>
              <SmallButton icon={CalendarDays} onClick={() => navigate(screenPath("crm", "followup-calendar"))}>Add task</SmallButton>
            </div>
          </Card>
          <Card title="Activity" icon={History} actions={<SmallButton variant="ghost" onClick={() => navigate(`${screenPath("crm", "customer-history")}?customer=${enq.customerId}`)}>Full history</SmallButton>}>
            {history.length === 0 ? <p className="text-[12px] text-[#999]">No activity yet. Log a call, email or WhatsApp above.</p> : <Timeline items={history.map(activityItem)} />}
          </Card>
        </div>
      </div>
      <LogCallModal enq={callOpen ? enq : null} onClose={() => setCallOpen(false)} />
    </>
  );
}

// ── Auto-Assign Rules ────────────────────────────────────────────────────────
interface Rule { id: string; name: string; source: string; branch: string; franchise: string; assignTo: string[]; manager: string; roundRobin: boolean; enabled: boolean }

// Default configuration (not transactional data); edits are saved on the server.
const SEED_RULES: Rule[] = [
  { id: "r1", name: "Fleet leads to Midrand fleet desk", source: "Any", branch: "Midrand", franchise: "Toyota Commercial", assignTo: ["u1"], manager: "u6", roundRobin: false, enabled: true },
  { id: "r2", name: "Website leads — Centurion", source: "Website", branch: "Centurion", franchise: "Toyota", assignTo: ["u3", "u4"], manager: "u7", roundRobin: true, enabled: true },
  { id: "r3", name: "Walk-ins — Midrand round-robin", source: "Walk-in", branch: "Midrand", franchise: "Any", assignTo: ["u1", "u2"], manager: "u6", roundRobin: true, enabled: true },
  { id: "r4", name: "Service-to-Sales referrals", source: "Service Department", branch: "Any", franchise: "Pre-Owned", assignTo: ["u5"], manager: "u7", roundRobin: false, enabled: false },
];

export function AutoAssignRules() {
  const [rules, setRules] = usePersistentState<Rule[]>("enquiries.assignRules", SEED_RULES);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [nameError, setNameError] = useState("");
  const [del, setDel] = useState<Rule | null>(null);

  const move = (i: number, d: -1 | 1) => setRules((r) => { const n = [...r]; [n[i], n[i + d]] = [n[i + d], n[i]]; return n; });
  const save = () => {
    if (!editing) return;
    if (!editing.name.trim()) { setNameError("Rule name is required"); return; }
    if (editing.assignTo.length === 0) { setNameError("Pick at least one sales executive"); return; }
    setRules((r) => (r.some((x) => x.id === editing.id) ? r.map((x) => (x.id === editing.id ? editing : x)) : [...r, editing]));
    setEditing(null);
    previewToast("Assignment rule saved");
  };

  return (
    <>
      <PageHeader actions={<PrimaryButton icon={Plus} onClick={() => { setNameError(""); setEditing({ id: `r${Date.now()}`, name: "", source: "Any", branch: "Any", franchise: "Any", assignTo: [], manager: MANAGERS[0].id, roundRobin: true, enabled: true }); }}>Add rule</PrimaryButton>} />
      <Notice tone="info" className="mb-5">Rules are evaluated top to bottom; the first matching rule assigns new enquiries captured without a sales executive. Unmatched leads go to the branch executive with the fewest open enquiries. Executives are mapped to Evolve rep numbers (07 SalesReps).</Notice>
      <Card>
        <DataTable paginate={false} rows={rules} rowKey={(r) => r.id}
          empty={<EmptyState icon={Shuffle} title="No assignment rules" message="Add a rule to auto-assign new enquiries." />}
          columns={[
            { key: "prio", header: "Priority", render: (r) => { const i = rules.indexOf(r); return (
              <div className="flex items-center gap-1"><span className="w-5 text-center font-medium">{i + 1}</span>
                <SmallButton variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={12} /></SmallButton>
                <SmallButton variant="ghost" aria-label="Move down" disabled={i === rules.length - 1} onClick={() => move(i, 1)}><ArrowDown size={12} /></SmallButton></div>
            ); } },
            { key: "name", header: "Rule", render: (r) => <span className="text-[#333] font-medium">{r.name}</span> },
            { key: "match", header: "Matches", render: (r) => <span className="text-[12px]">Source: {r.source} · Branch: {r.branch} · Franchise: {r.franchise}</span> },
            { key: "assign", header: "Assign to", render: (r) => <div><p>{r.assignTo.map((id) => userById(id)?.name).join(", ")}</p><p className="text-[11px] text-[#999]">Manager: {userById(r.manager)?.name}</p></div> },
            { key: "rr", header: "Round-robin", render: (r) => (r.roundRobin ? <Badge tone="blue"><Shuffle size={11} /> On</Badge> : <Badge tone="gray">Off</Badge>) },
            { key: "enabled", header: "Enabled", render: (r) => <Toggle label={`Enable ${r.name}`} checked={r.enabled} onChange={(v) => setRules((all) => all.map((x) => (x.id === r.id ? { ...x, enabled: v } : x)))} /> },
            { key: "act", header: "", align: "right", render: (r) => <div className="flex justify-end gap-1"><SmallButton variant="ghost" icon={Pencil} onClick={() => { setNameError(""); setEditing({ ...r }); }}>Edit</SmallButton><SmallButton variant="ghost" icon={Trash2} aria-label="Delete" onClick={() => setDel(r)} /></div> },
          ]} />
      </Card>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={editing && rules.some((r) => r.id === editing.id) ? "Edit rule" : "Add rule"} size="lg">
        {editing && (
          <div className="space-y-4">
            <FormGrid>
              <Field label="Rule name" required error={nameError} className="md:col-span-2" htmlFor="ar-name"><TextInput id="ar-name" value={editing.name} onChange={(e) => { setEditing({ ...editing, name: e.target.value }); setNameError(""); }} /></Field>
              <Field label="Lead source" htmlFor="ar-src"><SelectInput id="ar-src" value={editing.source} onChange={(e) => setEditing({ ...editing, source: e.target.value })} options={["Any", ...LEAD_SOURCES]} /></Field>
              <Field label="Branch" htmlFor="ar-br"><SelectInput id="ar-br" value={editing.branch} onChange={(e) => setEditing({ ...editing, branch: e.target.value })} options={["Any", ...BRANCHES]} /></Field>
              <Field label="Franchise" htmlFor="ar-fr"><SelectInput id="ar-fr" value={editing.franchise} onChange={(e) => setEditing({ ...editing, franchise: e.target.value })} options={["Any", ...FRANCHISES]} /></Field>
              <Field label="Escalation manager" htmlFor="ar-mgr"><SelectInput id="ar-mgr" value={editing.manager} onChange={(e) => setEditing({ ...editing, manager: e.target.value })} options={MANAGERS.map((m) => ({ value: m.id, label: `${m.name} (${m.evolveRep})` }))} /></Field>
            </FormGrid>
            <Field label="Sales executives" required>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {EXECUTIVES.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 text-[13px] border border-[#e5e7eb] rounded-lg px-3 py-2 cursor-pointer hover:bg-[#fafafa]">
                    <input type="checkbox" className="accent-[#ff4f31]" checked={editing.assignTo.includes(u.id)} onChange={() => { setNameError(""); setEditing({ ...editing, assignTo: editing.assignTo.includes(u.id) ? editing.assignTo.filter((x) => x !== u.id) : [...editing.assignTo, u.id] }); }} />
                    <span className="flex-1">{u.name}</span><span className="text-[11px] text-[#999]">{u.evolveRep ?? "No Evolve rep"}</span>
                  </label>
                ))}
              </div>
            </Field>
            <div className="flex items-center justify-between border border-[#e5e7eb] rounded-lg px-3 py-2.5">
              <div><p className="text-[13px] font-medium text-[#333]">Round-robin</p><p className="text-[11px] text-[#999]">Give each new lead to the selected executive with the fewest open enquiries</p></div>
              <Toggle label="Round-robin" checked={editing.roundRobin} onChange={(v) => setEditing({ ...editing, roundRobin: v })} />
            </div>
            <div className="flex gap-3 justify-end"><SecondaryButton onClick={() => setEditing(null)}>Cancel</SecondaryButton><PrimaryButton onClick={save}>Save rule</PrimaryButton></div>
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} danger title="Delete rule" confirmLabel="Delete" message={<>Delete rule <span className="font-semibold">{del?.name}</span>?</>}
        onConfirm={() => { setRules((r) => r.filter((x) => x.id !== del?.id)); setDel(null); previewToast("Rule deleted"); }} />
    </>
  );
}

// ── Reassign Enquiries ───────────────────────────────────────────────────────
interface ReassignLog { id: string; enquiries: string[]; from: string; to: string; reason: string; by: string; at: string }

export function ReassignEnquiries() {
  const { enquiries } = useSalesData();
  const [selected, setSelected] = useState<string[]>([]);
  const [fromOwner, setFromOwner] = useState("All owners");
  const [newOwner, setNewOwner] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<{ owner?: string; reason?: string }>({});
  const [confirm, setConfirm] = useState(false);
  const [log, setLog] = usePersistentState<ReassignLog[]>("enquiries.reassignLog", []);

  const isOpen = (e: Enquiry) => e.status !== "Won" && e.status !== "Lost";
  const open = enquiries.filter((e) => isOpen(e) && (fromOwner === "All owners" || e.ownerId === fromOwner));

  const start = () => {
    const e: typeof errors = {};
    if (!newOwner) e.owner = "Choose the new owner";
    if (!reason.trim()) e.reason = "A reason is required for the audit trail";
    setErrors(e);
    if (!Object.keys(e).length) setConfirm(true);
  };

  const apply = () => {
    const moved = enquiries.filter((e) => selected.includes(e.id));
    const fromNames = Array.from(new Set(moved.map((e) => userById(e.ownerId)?.name))).join(", ");
    const to = userById(newOwner)?.name ?? "";
    salesStore.update("enquiries", (e) => selected.includes(e.id), { ownerId: newOwner });
    moved.forEach((e) => logActivity({ customerId: e.customerId, enquiryId: e.id, type: "Reassigned", note: `Reassigned from ${userById(e.ownerId)?.name} to ${to} — ${reason}` }));
    setLog((l) => [{ id: `l${Date.now()}`, enquiries: selected, from: fromNames, to, reason, by: "You", at: new Date().toISOString() }, ...l]);
    previewToast(`${selected.length} enquiry(s) reassigned to ${to}`);
    setSelected([]); setReason(""); setConfirm(false);
  };

  return (
    <>
      <PageHeader />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <Card className="lg:col-span-2" title="Open enquiries" subtitle={`${selected.length} selected`}>
          <Toolbar>
            <FilterSelect label="Current owner" value={fromOwner} onChange={(v) => { setFromOwner(v); setSelected([]); }} options={[{ value: "All owners", label: "All owners" }, ...EXECUTIVES.map((u) => ({ value: u.id, label: u.name }))]} className="md:w-56" />
            {selected.length > 0 && <SmallButton variant="ghost" onClick={() => setSelected([])}>Clear selection</SmallButton>}
          </Toolbar>
          <DataTable selectable selected={selected} onSelectedChange={setSelected} rows={open} rowKey={(e) => e.id}
            empty={enquiries.some(isOpen) ? <EmptyState title="No open enquiries for this owner" /> : <NoEnquiries title="No open enquiries" message="Capture an enquiry first, then reassign it here." />}
            columns={[
              { key: "id", header: "Enquiry", render: (e) => <span className="font-medium text-[#ff4f31]">{e.id}</span> },
              { key: "customer", header: "Customer", render: (e) => customerById(e.customerId)?.name },
              { key: "interest", header: "Vehicle", render: (e) => e.interest },
              { key: "status", header: "Status", render: (e) => <StatusBadge status={e.status} /> },
              { key: "owner", header: "Current owner", render: (e) => userById(e.ownerId)?.name },
              { key: "branch", header: "Branch", render: (e) => e.branch },
            ]} />
        </Card>
        <div className="space-y-5">
          <Card title="Reassign to" icon={Shuffle}>
            <div className="space-y-4">
              <Field label="New owner" required error={errors.owner} htmlFor="ra-owner"><SelectInput id="ra-owner" value={newOwner} onChange={(e) => { setNewOwner(e.target.value); setErrors((x) => ({ ...x, owner: undefined })); }} error={!!errors.owner} placeholder="Select executive" options={EXECUTIVES.map((u) => ({ value: u.id, label: `${u.name} — ${u.branch} (${enquiries.filter((e) => e.ownerId === u.id && isOpen(e)).length} open)` }))} /></Field>
              <Field label="Reason" required error={errors.reason} htmlFor="ra-reason"><SelectInput id="ra-reason" value={reason} onChange={(e) => { setReason(e.target.value); setErrors((x) => ({ ...x, reason: undefined })); }} error={!!errors.reason} placeholder="Select reason" options={["Annual leave", "Workload balancing", "Customer closer to other branch", "Executive left the company", "Customer request"]} /></Field>
              <PrimaryButton className="w-full!" disabled={selected.length === 0} onClick={start}>Reassign {selected.length || ""} enquiry(s)</PrimaryButton>
              {selected.length === 0 && <p className="text-[11px] text-[#999] text-center">Select one or more enquiries first.</p>}
            </div>
          </Card>
          <Card title="Reassignment history" icon={History}>
            {log.length === 0 ? <p className="text-[12px] text-[#999]">No reassignments yet.</p> : (
              <Timeline items={log.map((l) => ({ id: l.id, icon: Shuffle, tone: "blue" as const, title: <>{l.enquiries.length} enquiry(s): {l.from} → {l.to}</>, meta: `${fmtWhen(l.at)} · ${l.by}`, body: <><p>{l.reason}</p><p className="text-[11px] text-[#999]">{l.enquiries.join(", ")}</p></> }))} />
            )}
          </Card>
        </div>
      </div>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={apply} title="Confirm reassignment" confirmLabel="Reassign"
        message={<>Move <span className="font-semibold">{selected.length}</span> enquiry(s) to <span className="font-semibold">{userById(newOwner)?.name}</span>? History is kept on each enquiry.</>} />
    </>
  );
}

// ── Enquiry Priority Settings ────────────────────────────────────────────────
interface Factor { key: string; label: string; weight: number; enabled: boolean; description: string }
interface PrioritySettingsState { factors: Factor[]; hot: number; warm: number }

const SEED_FACTORS: Factor[] = [
  { key: "budget", label: "Budget fits stock", weight: 25, enabled: true, description: "Budget within 10% of a matching vehicle's price" },
  { key: "timing", label: "Purchase timing", weight: 20, enabled: true, description: "Buying within 30 days scores highest" },
  { key: "finance", label: "Finance ready", weight: 15, enabled: true, description: "Cash or pre-approved finance" },
  { key: "source", label: "Lead source quality", weight: 15, enabled: true, description: "Walk-in and referral rank above social media" },
  { key: "engagement", label: "Engagement", weight: 15, enabled: true, description: "Replies, test drive booked, quote viewed" },
  { key: "tradein", label: "Trade-in offered", weight: 10, enabled: true, description: "Customer has a trade-in vehicle" },
  { key: "repeat", label: "Existing customer", weight: 5, enabled: false, description: "Previous purchase or service history" },
];
const SEED_PRIORITY: PrioritySettingsState = { factors: SEED_FACTORS, hot: 70, warm: 45 };

const SOURCE_QUALITY: Record<string, number> = { "Walk-in": 1, Referral: 1, Phone: 0.7, "Service Department": 0.7, Website: 0.5, "OEM Portal": 0.5, Facebook: 0.3 };

export function PrioritySettings() {
  const navigate = useNavigate();
  const { enquiries, stock, activities } = useSalesData();
  const [savedSettings, setSavedSettings] = usePersistentState<PrioritySettingsState>("enquiries.priority", SEED_PRIORITY);
  const [factors, setFactors] = useState<Factor[]>(savedSettings.factors);
  const [hot, setHot] = useState(savedSettings.hot);
  const [warm, setWarm] = useState(savedSettings.warm);
  const [dirty, setDirty] = useState(false);
  const total = factors.filter((f) => f.enabled).reduce((n, f) => n + f.weight, 0);
  const thresholdError = warm >= hot ? "Warm threshold must be below Hot" : "";

  const update = (key: string, patch: Partial<Factor>) => { setFactors((f) => f.map((x) => (x.key === key ? { ...x, ...patch } : x))); setDirty(true); };

  // Factor scores (0–1) estimated from the fields captured on each test enquiry.
  const factorScores = (e: Enquiry): Record<string, number> => {
    const fits = stock.some((v) => stockMatchesEnquiry(e, v) && e.budget >= v.current * 0.9);
    return {
      budget: fits ? 1 : e.budget > 0 ? 0.5 : 0,
      timing: e.priority === "Hot" ? 1 : e.priority === "Warm" ? 0.6 : 0.2,
      finance: e.finance === "Cash" ? 1 : e.finance === "Fleet lease" ? 0.8 : 0.5,
      source: SOURCE_QUALITY[e.source] ?? 0.5,
      engagement: Math.min(1, activities.filter((a) => a.enquiryId === e.id).length / 4),
      tradein: e.tradeIn ? 1 : 0,
      repeat: enquiries.filter((x) => x.customerId === e.customerId).length > 1 ? 1 : 0,
    };
  };
  const score = (e: Enquiry) => {
    const s = factorScores(e);
    const active = factors.filter((f) => f.enabled);
    const w = active.reduce((n, f) => n + f.weight, 0) || 1;
    return Math.round(active.reduce((n, f) => n + f.weight * (s[f.key] ?? 0), 0) / w * 100);
  };
  const classify = (n: number) => (n >= hot ? "Hot" : n >= warm ? "Warm" : "Cold");
  const sample = enquiries.filter((e) => e.status !== "Won" && e.status !== "Lost").slice(0, 6);

  return (
    <>
      <PageHeader actions={
        <>
          <SecondaryButton onClick={() => { setFactors(SEED_FACTORS); setHot(70); setWarm(45); setDirty(true); }}>Reset to defaults</SecondaryButton>
          <PrimaryButton disabled={!dirty || total !== 100 || !!thresholdError} onClick={() => { setSavedSettings({ factors, hot, warm }); setDirty(false); previewToast("Priority settings saved"); }}>Save settings</PrimaryButton>
        </>
      } />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <Card className="lg:col-span-2" title="Scoring factors" subtitle="Enabled weights must total 100%" actions={<Badge tone={total === 100 ? "green" : "red"}>Total {total}%</Badge>}>
          {total !== 100 && <Notice tone="warning" className="mb-4">Enabled weights total {total}%. Adjust them to exactly 100% to save.</Notice>}
          <ul className="divide-y divide-[#f0f0f0]">
            {factors.map((f) => (
              <li key={f.key} className="py-3 grid grid-cols-1 sm:grid-cols-[1fr_200px_auto] gap-3 items-center">
                <div><p className={`text-[13px] font-medium ${f.enabled ? "text-[#333]" : "text-[#aaa]"}`}>{f.label}</p><p className="text-[11px] text-[#999]">{f.description}</p></div>
                <div className="flex items-center gap-2">
                  <input type="range" min={0} max={50} step={5} value={f.weight} disabled={!f.enabled} onChange={(e) => update(f.key, { weight: Number(e.target.value) })} aria-label={`${f.label} weight`} className="flex-1 accent-[#ff4f31]" />
                  <span className="w-10 text-right text-[13px] tabular-nums">{f.weight}%</span>
                </div>
                <Toggle label={`Enable ${f.label}`} checked={f.enabled} onChange={(v) => update(f.key, { enabled: v })} />
              </li>
            ))}
          </ul>
        </Card>
        <div className="space-y-5">
          <Card title="Classification thresholds">
            <div className="space-y-3">
              <Field label="Hot — score at or above" htmlFor="ps-hot"><TextInput id="ps-hot" type="number" min={0} max={100} value={hot} onChange={(e) => { setHot(Number(e.target.value)); setDirty(true); }} className="no-spinner" /></Field>
              <Field label="Warm — score at or above" error={thresholdError} htmlFor="ps-warm"><TextInput id="ps-warm" type="number" min={0} max={100} value={warm} onChange={(e) => { setWarm(Number(e.target.value)); setDirty(true); }} error={!!thresholdError} className="no-spinner" /></Field>
              <p className="text-[12px] text-[#666]">Cold — below {warm}</p>
              <div className="flex h-2.5 rounded-full overflow-hidden" aria-hidden>
                <div className="bg-blue-300" style={{ width: `${warm}%` }} /><div className="bg-amber-400" style={{ width: `${Math.max(0, hot - warm)}%` }} /><div className="bg-red-500 flex-1" />
              </div>
            </div>
          </Card>
          <Card title="Priority preview" subtitle="Your open test enquiries, recalculated as you change weights">
            {sample.length === 0 ? (
              <EmptyState icon={Inbox} title="No open enquiries" message="Add an enquiry to preview its score." action={<SmallButton variant="primary" onClick={() => navigate(screenPath("crm", "add-enquiry"))}>Add Enquiry</SmallButton>} />
            ) : (
              <>
                <ul className="space-y-3">
                  {sample.map((e) => {
                    const n = score(e);
                    return (
                      <li key={e.id}>
                        <div className="flex items-center justify-between gap-2 mb-1"><span className="text-[12px] text-[#333] truncate">{customerById(e.customerId)?.name}</span><span className="flex items-center gap-1.5"><span className="text-[12px] tabular-nums">{n}</span><StatusBadge status={classify(n)} /></span></div>
                        <ProgressBar value={n} tone={classify(n) === "Hot" ? "red" : classify(n) === "Warm" ? "amber" : "blue"} label={`${e.id} score`} />
                      </li>
                    );
                  })}
                </ul>
                <p className="text-[11px] text-[#999] mt-3 flex items-center gap-1"><TriangleAlert size={11} /> Factor scores are estimated from the enquiry fields.</p>
              </>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
