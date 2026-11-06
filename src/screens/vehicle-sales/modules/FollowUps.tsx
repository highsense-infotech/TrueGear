// Module 4 — CRM / Enquiry: follow-ups, test drives and messaging set-up. Saved on the server via data/store.ts.

import { useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Phone, Mail, MessageCircle, MapPin, Car, StickyNote, Plus, Pencil, Save, ChevronLeft, ChevronRight,
  CalendarDays, Clock, CircleCheck, TriangleAlert, ScanLine, KeyRound, Gauge, Fuel, Play, Square, Users,
  Bell, Smartphone, Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Modal from "../../../components/common/Modal";
import SignaturePad from "../../../components/common/SignaturePad";
import SearchableDropdown from "../../../components/common/SearchableDropdown";
import LiveCameraCapture from "../../../components/common/LiveCameraCapture";
import { scanLicence } from "../../../api/vehicle.api";
import {
  PageHeader, Card, KpiGrid, KpiCard, Toolbar, SearchInput, FilterSelect, FilterPills, DataTable, StatusBadge,
  SmallButton, PrimaryButton, SecondaryButton, Field, TextInput, SelectInput, TextArea, FormGrid, KeyValueGrid,
  Notice, Toggle, Tabs, Timeline, PhotoSlot, EmptyState, Badge, type Column, type Tone,
} from "../components/ui";
import { previewToast } from "../components/helpers";
import { screenPath } from "../registry";
import { useMyEnquiries } from "../access";
import { useAuth } from "../../../context/AuthContext";
import { EXECUTIVES, SALES_USERS, BRANCHES, fmtDate, type StockVehicle } from "../data/mock";
import {
  salesStore, useSalesData, usePersistentState, customerById, userById, stockByNo, enquiryById, today,
  type TestDrive,
} from "../data/store";

const cn = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

const fmtWhen = (iso: string) =>
  iso.length <= 10 ? fmtDate(iso) : new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

function logActivity(a: { customerId: string; enquiryId?: string; type: string; note: string }) {
  salesStore.add("activities", { id: salesStore.localId("ACT"), date: new Date().toISOString(), by: "You", ...a });
}

const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parseIso = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (iso: string, n: number) => { const d = parseIso(iso); d.setDate(d.getDate() + n); return isoOf(d); };
const mondayOf = (iso: string) => { const d = parseIso(iso); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day); return isoOf(d); };
const dayLabel = (iso: string) => parseIso(iso).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });

// ── Customer History ─────────────────────────────────────────────────────────
type ActivityType = "Call" | "Email" | "WhatsApp" | "Visit" | "Test drive" | "Note";

const ACTIVITY_META: Record<ActivityType, { icon: LucideIcon; tone: Tone }> = {
  Call: { icon: Phone, tone: "blue" },
  Email: { icon: Mail, tone: "violet" },
  WhatsApp: { icon: MessageCircle, tone: "green" },
  Visit: { icon: MapPin, tone: "amber" },
  "Test drive": { icon: Car, tone: "brand" },
  Note: { icon: StickyNote, tone: "gray" },
};

// Timeline row built from store activities (any module) and test drives.
interface HistoryRow { id: string; type: string; at: string; by: string; title: string; body?: string }

const metaOf = (type: string) => ACTIVITY_META[type as ActivityType] ?? { icon: StickyNote, tone: "gray" as Tone };

function NoCustomers() {
  const navigate = useNavigate();
  return <EmptyState icon={Users} title="No customers yet" message="Customers are created when you capture an enquiry." action={<PrimaryButton icon={Plus} onClick={() => navigate(screenPath("crm", "add-enquiry"))}>Add Enquiry</PrimaryButton>} />;
}

export function CustomerHistory() {
  const [params] = useSearchParams();
  const { customers, activities, testDrives, enquiries } = useSalesData();
  const [picked, setPicked] = useState(customerById(params.get("customer"))?.id ?? "");
  const customerId = picked || customers[0]?.id || "";
  const [filter, setFilter] = useState<"All" | ActivityType>("All");
  const [logOpen, setLogOpen] = useState(false);
  const [logType, setLogType] = useState<ActivityType>("Call");
  const [logText, setLogText] = useState("");
  const [logError, setLogError] = useState("");

  const customer = customerById(customerId);
  const all: HistoryRow[] = [
    ...activities.filter((a) => a.customerId === customerId).map((a) => ({ id: a.id, type: a.type, at: a.date, by: a.by, title: a.note })),
    ...testDrives.filter((t) => t.customerId === customerId && t.status !== "Completed").map((t) => ({
      id: t.id, type: "Test drive", at: `${t.date}T${t.time}:00`, by: userById(t.execId)?.name ?? "—",
      title: `${t.id} ${t.status.toLowerCase()} — ${stockByNo(t.stockNo)?.model ?? t.stockNo}`,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const shown = filter === "All" ? all : all.filter((a) => a.type === filter);
  const enquiry = enquiries.find((e) => e.customerId === customerId && e.status !== "Lost" && e.status !== "Won");

  const save = () => {
    if (logText.trim().length < 3) return setLogError("Describe the activity");
    logActivity({ customerId, enquiryId: enquiry?.id, type: logType, note: logText.trim() });
    previewToast(`${logType} added to the timeline`);
    setLogOpen(false);
    setLogText("");
  };

  if (!customer) return (<><PageHeader /><NoCustomers /></>);

  return (
    <>
      <PageHeader actions={<PrimaryButton icon={Plus} onClick={() => { setLogError(""); setLogOpen(true); }}>Log activity</PrimaryButton>} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <Card title="Customer" className="lg:col-span-1">
          <Field label="Customer" htmlFor="hist-cust">
            <SearchableDropdown options={customers.map((c) => ({ id: c.id, name: c.name }))} value={customerId} onChange={(id) => id && setPicked(id)} placeholder="Search customer" />
          </Field>
          <div className="mt-4">
            <KeyValueGrid cols={2} items={[
              { label: "Type", value: customer.type },
              { label: "Phone", value: customer.phone || "—" },
              { label: "Email", value: customer.email || "—" },
              { label: "AR account", value: customer.arAccount ?? "—" },
              { label: "Open enquiry", value: enquiry ? enquiry.id : "None" },
              { label: "Owner", value: enquiry ? userById(enquiry.ownerId)?.name : "—" },
            ]} />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            {(["Call", "Email", "Test drive"] as ActivityType[]).map((t) => (
              <div key={t} className="rounded-lg bg-[#fafafa] border border-[#f0f0f0] py-2">
                <p className="text-[18px] text-[#333]">{all.filter((a) => a.type === t).length}</p>
                <p className="text-[11px] text-[#999]">{t}s</p>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Activity timeline" subtitle="Newest first" className="lg:col-span-2">
          <FilterPills<"All" | ActivityType>
            value={filter}
            onChange={setFilter}
            options={(["All", "Call", "Email", "WhatsApp", "Visit", "Test drive", "Note"] as const).map((k) => ({ key: k, label: k, count: k === "All" ? all.length : all.filter((a) => a.type === k).length }))}
          />
          {shown.length === 0 ? (
            <EmptyState title={all.length ? "No activity of this type" : "No activity yet"} message="Log a call, email or note to start the history." />
          ) : (
            <Timeline items={shown.map((a) => ({ id: a.id, icon: metaOf(a.type).icon, tone: metaOf(a.type).tone, title: a.title, meta: `${a.type} · ${fmtWhen(a.at)} · ${a.by}`, body: a.body }))} />
          )}
        </Card>
      </div>

      <Modal isOpen={logOpen} onClose={() => setLogOpen(false)} title="Log activity" size="sm">
        <div className="space-y-4">
          <Field label="Activity type" required htmlFor="log-type">
            <SelectInput id="log-type" value={logType} onChange={(e) => setLogType(e.target.value as ActivityType)} options={Object.keys(ACTIVITY_META)} />
          </Field>
          <Field label="Details" required error={logError} htmlFor="log-text">
            <TextArea id="log-text" value={logText} onChange={(e) => { setLogText(e.target.value); setLogError(""); }} placeholder="Outcome of the call, what was sent, next step…" />
          </Field>
          <div className="flex justify-end gap-2">
            <SmallButton onClick={() => setLogOpen(false)}>Cancel</SmallButton>
            <SmallButton variant="primary" onClick={save}>Add to timeline</SmallButton>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ── Message Templates ────────────────────────────────────────────────────────
type Channel = "Email" | "WhatsApp" | "SMS";
interface Template { id: string; name: string; channel: Channel; trigger: string; subject: string; body: string; active: boolean }

const TEMPLATES: Template[] = [
  { id: "t1", name: "Enquiry acknowledgement", channel: "Email", trigger: "New enquiry", subject: "Thank you for your interest in the {{vehicle.model}}", body: "Hi {{customer.firstName}},\n\nThank you for your enquiry about the {{vehicle.model}}. I'm {{executive.name}} and I'll be helping you at {{branch.name}}.\n\nI'll call you shortly on {{customer.phone}}.\n\nKind regards,\n{{executive.name}}", active: true },
  { id: "t2", name: "Quote follow-up", channel: "WhatsApp", trigger: "Quote sent + 2 days", subject: "", body: "Hi {{customer.firstName}}, it's {{executive.name}} from {{branch.name}}. Just checking whether you had a chance to look at quote {{quote.number}} for the {{vehicle.model}}? Total {{quote.total}}. Happy to help with any questions.", active: true },
  { id: "t3", name: "Test drive reminder", channel: "WhatsApp", trigger: "Test drive − 2 hours", subject: "", body: "Hi {{customer.firstName}}, a reminder of your {{vehicle.model}} test drive today at {{booking.time}} at {{branch.name}}. Please bring your driving licence.", active: true },
  { id: "t4", name: "Test drive reminder (SMS)", channel: "SMS", trigger: "Test drive − 2 hours", subject: "", body: "Reminder: {{vehicle.model}} test drive today {{booking.time}} at {{branch.name}}. Bring your licence. Reply STOP to opt out.", active: false },
  { id: "t5", name: "Delivery invitation", channel: "Email", trigger: "PDI passed", subject: "Your {{vehicle.model}} is ready for collection", body: "Hi {{customer.firstName}},\n\nGreat news — your {{vehicle.model}} has passed its pre-delivery inspection and is ready for handover at {{branch.name}}.\n\nPlease reply to book a handover time.\n\n{{executive.name}}", active: true },
];

const MERGE_FIELDS: { key: string; sample: string }[] = [
  { key: "customer.firstName", sample: "[First name]" },
  { key: "customer.phone", sample: "[Phone]" },
  { key: "vehicle.model", sample: "[Vehicle model]" },
  { key: "executive.name", sample: "[Executive]" },
  { key: "branch.name", sample: "[Branch]" },
  { key: "quote.number", sample: "[Quote no.]" },
  { key: "quote.total", sample: "[Quote total]" },
  { key: "booking.time", sample: "[Time]" },
];

const renderMerge = (text: string) => MERGE_FIELDS.reduce((t, f) => t.split(`{{${f.key}}}`).join(f.sample), text);

const CHANNEL_STATUS: Record<Channel, { label: string; tone: Tone; detail: string }> = {
  Email: { label: "Configured", tone: "green", detail: "Uses the existing SMTP settings (Settings → Email)." },
  WhatsApp: { label: "Connected", tone: "green", detail: "Uses the existing TrueGear WhatsApp channel." },
  SMS: { label: "Not configured", tone: "red", detail: "Not configured — gateway to be chosen with ELT. SMS templates can be prepared but will not send." },
};

export function MessageTemplates() {
  const [templates, setTemplates] = usePersistentState<Template[]>("followUps.templates", TEMPLATES);
  const [channel, setChannel] = useState<"All" | Channel>("All");
  const [selectedId, setSelectedId] = useState(TEMPLATES[0].id);
  const [draft, setDraft] = useState<Template>(TEMPLATES[0]);
  const [error, setError] = useState("");

  const list = templates.filter((t) => channel === "All" || t.channel === channel);
  const select = (t: Template) => { setSelectedId(t.id); setDraft(t); setError(""); };
  const insert = (key: string) => setDraft((d) => ({ ...d, body: `${d.body}{{${key}}}` }));

  const save = () => {
    if (!draft.name.trim()) return setError("Template name is required");
    if (!draft.body.trim()) return setError("Message body is required");
    if (draft.channel === "Email" && !draft.subject.trim()) return setError("Email templates need a subject");
    setTemplates((ts) => (ts.some((t) => t.id === draft.id) ? ts.map((t) => (t.id === draft.id ? draft : t)) : [draft, ...ts]));
    setSelectedId(draft.id);
    previewToast(`Template “${draft.name}” saved`);
  };

  const newTemplate = () => {
    const t: Template = { id: `t-${Date.now()}`, name: "", channel: "WhatsApp", trigger: "Manual", subject: "", body: "Hi {{customer.firstName}}, ", active: true };
    setSelectedId(t.id);
    setDraft(t);
    setError("");
  };

  const preview = renderMerge(draft.body);
  const smsSegments = Math.max(1, Math.ceil(preview.length / 160));

  return (
    <>
      <PageHeader actions={<PrimaryButton icon={Plus} onClick={newTemplate}>New template</PrimaryButton>} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        {(Object.keys(CHANNEL_STATUS) as Channel[]).map((c) => (
          <div key={c} className="bg-white border border-[#e5e7eb] rounded-[10px] px-4 py-3 flex items-start gap-3">
            {c === "Email" ? <Mail className="w-5 h-5 text-[#999] mt-0.5" /> : c === "WhatsApp" ? <MessageCircle className="w-5 h-5 text-[#999] mt-0.5" /> : <Smartphone className="w-5 h-5 text-[#999] mt-0.5" />}
            <div className="min-w-0">
              <div className="flex items-center gap-2"><p className="text-[13px] font-semibold text-[#333]">{c}</p><Badge tone={CHANNEL_STATUS[c].tone}>{CHANNEL_STATUS[c].label}</Badge></div>
              <p className="text-[11px] text-[#999] mt-0.5">{CHANNEL_STATUS[c].detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 items-start">
        <Card title="Templates" className="xl:col-span-2" bodyClassName="p-3">
          <FilterPills<"All" | Channel> value={channel} onChange={setChannel} options={(["All", "Email", "WhatsApp", "SMS"] as const).map((k) => ({ key: k, label: k, count: k === "All" ? templates.length : templates.filter((t) => t.channel === k).length }))} />
          <ul className="space-y-1">
            {list.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => select(t)} className={cn("w-full text-left rounded-lg px-3 py-2.5 border transition-colors cursor-pointer", t.id === selectedId ? "border-[#ff4f31] bg-[#fff6f4]" : "border-transparent hover:bg-[#fafafa]")}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-medium text-[#333] truncate">{t.name}</span>
                    <Badge tone={t.channel === "Email" ? "violet" : t.channel === "WhatsApp" ? "green" : "blue"}>{t.channel}</Badge>
                  </div>
                  <p className="text-[11px] text-[#999]">Trigger: {t.trigger} · {t.active ? "Active" : "Inactive"}</p>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <div className="xl:col-span-3 space-y-5">
          <Card title={templates.some((t) => t.id === draft.id) ? "Edit template" : "New template"} actions={<SmallButton variant="primary" icon={Save} onClick={save}>Save template</SmallButton>}>
            {error && <Notice tone="danger" className="mb-4">{error}</Notice>}
            <FormGrid>
              <Field label="Name" required htmlFor="tpl-name"><TextInput id="tpl-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Finance documents request" /></Field>
              <Field label="Channel" required htmlFor="tpl-channel"><SelectInput id="tpl-channel" value={draft.channel} onChange={(e) => setDraft({ ...draft, channel: e.target.value as Channel })} options={["Email", "WhatsApp", "SMS"]} /></Field>
              <Field label="Trigger" htmlFor="tpl-trigger"><SelectInput id="tpl-trigger" value={draft.trigger} onChange={(e) => setDraft({ ...draft, trigger: e.target.value })} options={["Manual", "New enquiry", "Quote sent + 2 days", "Test drive − 2 hours", "PDI passed", "Deal lost"]} /></Field>
              <Field label="Active" htmlFor="tpl-active"><div className="pt-2"><Toggle checked={draft.active} onChange={(v) => setDraft({ ...draft, active: v })} label="Template active" /></div></Field>
              {draft.channel === "Email" && (
                <Field label="Subject" required className="md:col-span-2" htmlFor="tpl-subject"><TextInput id="tpl-subject" value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} /></Field>
              )}
              <Field label="Message" required className="md:col-span-2" htmlFor="tpl-body" hint="Click a merge field below to insert it at the end of the message.">
                <TextArea id="tpl-body" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} className="min-h-[160px] font-mono text-[12px]" />
              </Field>
            </FormGrid>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {MERGE_FIELDS.map((f) => (
                <button key={f.key} type="button" onClick={() => insert(f.key)} className="px-2 py-1 rounded-md border border-[#e5e7eb] bg-[#fafafa] text-[11px] font-mono text-[#555] hover:bg-[#f0f0f0] cursor-pointer">{`{{${f.key}}}`}</button>
              ))}
            </div>
          </Card>

          <Card title="Preview" subtitle="Merge fields shown as placeholders">
            {draft.channel === "SMS" && <Notice tone="warning" className="mb-3">SMS gateway not configured — this template can be saved but will not be sent.</Notice>}
            {draft.channel === "Email" ? (
              <div className="border border-[#e5e7eb] rounded-lg overflow-hidden">
                <div className="bg-[#fafafa] px-4 py-2 text-[12px] text-[#666] border-b border-[#e5e7eb]">Subject: <span className="text-[#333] font-medium">{renderMerge(draft.subject) || "—"}</span></div>
                <p className="px-4 py-3 text-[13px] text-[#333] whitespace-pre-line">{preview}</p>
              </div>
            ) : (
              <div className="bg-[#efeae2] rounded-lg p-4">
                <div className={cn("max-w-sm rounded-lg px-3 py-2 text-[13px] text-[#333] whitespace-pre-line shadow-sm", draft.channel === "WhatsApp" ? "bg-[#d9fdd3] ml-auto" : "bg-white")}>{preview}</div>
              </div>
            )}
            <p className="text-[11px] text-[#999] mt-2">{preview.length} characters{draft.channel === "SMS" ? ` · ${smsSegments} SMS segment(s)` : ""}</p>
          </Card>
        </div>
      </div>
    </>
  );
}

// ── Reminder Rules ───────────────────────────────────────────────────────────
interface Rule { id: string; name: string; trigger: string; action: string; within: number; unit: "minutes" | "hours" | "days"; escalateAfter: number; escalateTo: string; channel: string; enabled: boolean }

const RULES: Rule[] = [
  { id: "r1", name: "First contact on new enquiry", trigger: "New enquiry", action: "Call customer", within: 1, unit: "hours", escalateAfter: 2, escalateTo: "Sales Manager", channel: "In-app + WhatsApp", enabled: true },
  { id: "r2", name: "Chase quote", trigger: "Quote sent", action: "Follow up quote", within: 2, unit: "days", escalateAfter: 24, escalateTo: "Sales Manager", channel: "In-app", enabled: true },
  { id: "r3", name: "Post test-drive call", trigger: "Test drive completed", action: "Call customer", within: 4, unit: "hours", escalateAfter: 24, escalateTo: "Sales Manager", channel: "In-app", enabled: true },
  { id: "r4", name: "Stale deal check", trigger: "No activity on open deal", action: "Review deal", within: 5, unit: "days", escalateAfter: 48, escalateTo: "Branch Manager", channel: "In-app + Email", enabled: true },
  { id: "r5", name: "Lost deal re-engagement", trigger: "Deal lost", action: "Send re-engagement offer", within: 90, unit: "days", escalateAfter: 0, escalateTo: "None", channel: "Email", enabled: false },
];

export function ReminderRules() {
  const [rules, setRules] = usePersistentState<Rule[]>("followUps.reminderRules", RULES);
  const [tasks] = usePersistentState<CalEvent[]>("followUps.tasks", []);
  const now = new Date();
  const overdue = tasks
    .filter((t) => !t.done)
    .map((t) => ({ ...t, hours: Math.floor((now.getTime() - new Date(`${t.date}T${String(t.start).padStart(2, "0")}:00:00`).getTime()) / 3_600_000) }))
    .filter((t) => t.hours >= 1)
    .sort((a, b) => b.hours - a.hours);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const openNew = () => { setErrors({}); setEditing({ id: `r-${Date.now()}`, name: "", trigger: "New enquiry", action: "Call customer", within: 1, unit: "hours", escalateAfter: 4, escalateTo: "Sales Manager", channel: "In-app", enabled: true }); };
  const save = () => {
    if (!editing) return;
    const e: Record<string, string> = {};
    if (!editing.name.trim()) e.name = "Rule name is required";
    if (!editing.within || editing.within < 1) e.within = "Enter a time of at least 1";
    if (editing.escalateAfter < 0) e.escalateAfter = "Cannot be negative";
    setErrors(e);
    if (Object.keys(e).length) return;
    setRules((rs) => (rs.some((r) => r.id === editing.id) ? rs.map((r) => (r.id === editing.id ? editing : r)) : [...rs, editing]));
    previewToast(`Rule “${editing.name}” saved`);
    setEditing(null);
  };

  const columns: Column<Rule>[] = [
    { key: "name", header: "Rule", render: (r) => <div><p className="font-medium text-[#333]">{r.name}</p><p className="text-[11px] text-[#999]">When: {r.trigger}</p></div> },
    { key: "action", header: "Task", render: (r) => r.action },
    { key: "within", header: "Due within", render: (r) => `${r.within} ${r.unit}` },
    { key: "esc", header: "Escalate when overdue", render: (r) => (r.escalateAfter ? `+${r.escalateAfter} h → ${r.escalateTo}` : "No escalation") },
    { key: "channel", header: "Notify via", render: (r) => r.channel },
    { key: "enabled", header: "Enabled", render: (r) => <Toggle checked={r.enabled} label={`${r.name} enabled`} onChange={(v) => { setRules((rs) => rs.map((x) => (x.id === r.id ? { ...x, enabled: v } : x))); previewToast(`${r.name} ${v ? "enabled" : "disabled"}`); }} /> },
    { key: "act", header: "", align: "right", render: (r) => <SmallButton icon={Pencil} onClick={() => { setErrors({}); setEditing({ ...r }); }}>Edit</SmallButton> },
  ];

  return (
    <>
      <PageHeader actions={<PrimaryButton icon={Plus} onClick={openNew}>Add rule</PrimaryButton>} />
      <KpiGrid cols={3}>
        <KpiCard label="Active rules" value={rules.filter((r) => r.enabled).length} icon={Bell} />
        <KpiCard label="Tasks overdue now" value={overdue.length} tone="down" hint="Across all executives" icon={Clock} />
        <KpiCard label="Overdue 24 h or more" value={overdue.filter((o) => o.hours >= 24).length} icon={TriangleAlert} />
      </KpiGrid>
      <Card title="Follow-up rules" className="mb-5">
        <DataTable columns={columns} rows={rules} rowKey={(r) => r.id} paginate={false} />
      </Card>
      <Card title="Overdue tasks" subtitle="Open tasks from the FollowUp Calendar that are past their start time.">
        <DataTable
          paginate={false}
          rows={overdue}
          rowKey={(o) => o.id}
          empty={<EmptyState icon={CircleCheck} title="Nothing overdue" message="Tasks you add in the FollowUp Calendar appear here once they pass their due time without being completed." />}
          columns={[
            { key: "task", header: "Task", render: (o) => <div><p className="text-[#333]">{o.title}</p><p className="text-[11px] text-[#999]">{o.customer}</p></div> },
            { key: "owner", header: "Owner", render: (o) => userById(o.ownerId)?.name },
            { key: "due", header: "Due", render: (o) => `${fmtDate(o.date)} ${String(o.start).padStart(2, "0")}:00` },
            { key: "over", header: "Overdue by", render: (o) => <span className="text-[#e53e3e] font-medium">{o.hours >= 24 ? `${Math.floor(o.hours / 24)} d` : `${o.hours} h`}</span> },
            { key: "esc", header: "Escalation", render: (o) => (o.hours >= 24 ? <StatusBadge status="Escalate" tone="red" /> : <StatusBadge status="Pending" />) },
          ]}
        />
      </Card>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={rules.some((r) => r.id === editing?.id) ? "Edit rule" : "Add rule"} size="lg">
        {editing && (
          <div className="space-y-4">
            <FormGrid>
              <Field label="Rule name" required error={errors.name} className="md:col-span-2" htmlFor="rule-name"><TextInput id="rule-name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} error={!!errors.name} /></Field>
              <Field label="When" required htmlFor="rule-trigger"><SelectInput id="rule-trigger" value={editing.trigger} onChange={(e) => setEditing({ ...editing, trigger: e.target.value })} options={["New enquiry", "Quote sent", "Test drive completed", "No activity on open deal", "Deal lost", "Finance application submitted"]} /></Field>
              <Field label="Create task" required htmlFor="rule-action"><SelectInput id="rule-action" value={editing.action} onChange={(e) => setEditing({ ...editing, action: e.target.value })} options={["Call customer", "Follow up quote", "Review deal", "Send re-engagement offer", "Request documents"]} /></Field>
              <Field label="Due within" required error={errors.within} htmlFor="rule-within">
                <div className="flex gap-2">
                  <TextInput id="rule-within" type="number" min={1} value={editing.within} onChange={(e) => setEditing({ ...editing, within: Number(e.target.value) })} error={!!errors.within} />
                  <SelectInput aria-label="Unit" value={editing.unit} onChange={(e) => setEditing({ ...editing, unit: e.target.value as Rule["unit"] })} options={["minutes", "hours", "days"]} className="w-32" />
                </div>
              </Field>
              <Field label="Escalate after overdue (hours)" error={errors.escalateAfter} hint="0 = no escalation" htmlFor="rule-esc"><TextInput id="rule-esc" type="number" min={0} value={editing.escalateAfter} onChange={(e) => setEditing({ ...editing, escalateAfter: Number(e.target.value) })} /></Field>
              <Field label="Escalate to" htmlFor="rule-escto"><SelectInput id="rule-escto" value={editing.escalateTo} onChange={(e) => setEditing({ ...editing, escalateTo: e.target.value })} options={["Sales Manager", "Branch Manager", "Dealer Principal", "None"]} /></Field>
              <Field label="Notify via" htmlFor="rule-channel"><SelectInput id="rule-channel" value={editing.channel} onChange={(e) => setEditing({ ...editing, channel: e.target.value })} options={["In-app", "In-app + Email", "In-app + WhatsApp", "Email"]} /></Field>
            </FormGrid>
            <Notice tone="info">Preview: when “{editing.trigger}” happens, a “{editing.action}” task is due within {editing.within} {editing.unit}{editing.escalateAfter ? `; if still open ${editing.escalateAfter} h later it escalates to the ${editing.escalateTo}` : ""}.</Notice>
            <div className="flex justify-end gap-2">
              <SmallButton onClick={() => setEditing(null)}>Cancel</SmallButton>
              <SmallButton variant="primary" onClick={save}>Save rule</SmallButton>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

// ── FollowUp Calendar ───────────────────────────────────────────────────────────
type EventType = "Follow-up" | "Test drive" | "Reminder" | "Task" | "Delivery";
interface CalEvent { id: string; date: string; start: number; duration: number; type: EventType; ownerId: string; title: string; customer: string; customerId?: string; enquiryId?: string; done?: boolean }

const EVENT_STYLE: Record<EventType, string> = {
  "Follow-up": "bg-blue-50 border-blue-300 text-blue-800",
  "Test drive": "bg-[#fff1ee] border-[#ff9d8a] text-[#b8331d]",
  Reminder: "bg-amber-50 border-amber-300 text-amber-800",
  Task: "bg-violet-50 border-violet-300 text-violet-800",
  Delivery: "bg-green-50 border-green-300 text-green-800",
};

const HOURS = Array.from({ length: 10 }, (_, i) => 8 + i); // 08:00–17:00

function EventChip({ e, onOpen, compact }: { e: CalEvent; onOpen: (e: CalEvent) => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(e)}
      className={cn("w-full h-full text-left border-l-[3px] border rounded-md px-1.5 py-1 overflow-hidden cursor-pointer hover:shadow-sm", EVENT_STYLE[e.type], e.done && "opacity-50 line-through")}
      title={`${e.type}: ${e.title} — ${e.customer}`}
    >
      <p className="text-[11px] font-semibold truncate">{String(e.start).padStart(2, "0")}:00 {e.title}</p>
      {!compact && <p className="text-[10px] truncate opacity-80">{e.customer} · {userById(e.ownerId)?.name}</p>}
    </button>
  );
}

const EMPTY_TASK = { title: "", type: "Follow-up" as EventType, date: "", start: "9", ownerId: "", enquiryId: "", customer: "" };

// Today's tasks beside the calendar: one group per executive, or just the signed-in executive's own list.
function TodayTasks({ events, ownerIds, mine, onOpen, onComplete }: {
  events: CalEvent[]; ownerIds: string[] | null; mine: boolean; onOpen: (e: CalEvent) => void; onComplete: (e: CalEvent) => void;
}) {
  const todays = events.filter((e) => e.date === today() && (!ownerIds || ownerIds.includes(e.ownerId))).sort((a, b) => a.start - b.start);
  const groups = Array.from(new Set(todays.map((e) => e.ownerId))).map((id) => ({ id, items: todays.filter((e) => e.ownerId === id) }))
    .sort((a, b) => (userById(a.id)?.name ?? "").localeCompare(userById(b.id)?.name ?? ""));
  const pending = todays.filter((e) => !e.done).length;

  const row = (e: CalEvent) => (
    <li key={e.id} className="flex items-start gap-2 py-2 border-b border-[#f3f3f3] last:border-0">
      <input type="checkbox" className="accent-[#ff4f31] mt-0.5 cursor-pointer" checked={!!e.done} disabled={e.done} aria-label={`Mark ${e.title} complete`} onChange={() => onComplete(e)} />
      <button type="button" onClick={() => onOpen(e)} className={cn("flex-1 min-w-0 text-left cursor-pointer", e.done && "opacity-50 line-through")}>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-[#333]">{String(e.start).padStart(2, "0")}:00</span>
          <span className={cn("text-[10px] px-1.5 rounded border", EVENT_STYLE[e.type])}>{e.type}</span>
        </div>
        <p className="text-[12px] text-[#333] truncate">{e.title}</p>
        <p className="text-[11px] text-[#999] truncate">{e.customer}{e.enquiryId ? ` · ${e.enquiryId}` : ""}</p>
      </button>
    </li>
  );

  return (
    <Card title={mine ? "My tasks today" : "Today's tasks"} icon={CalendarDays} subtitle={`${dayLabel(today())} · ${pending} pending of ${todays.length}`}>
      {todays.length === 0 ? <p className="text-[12px] text-[#999]">Nothing scheduled for today.</p>
        : mine ? <ul>{todays.map(row)}</ul>
        : groups.map((g) => (
          <div key={g.id} className="mb-3 last:mb-0">
            <div className="flex items-center justify-between bg-[#fafafa] rounded-md px-2 py-1">
              <p className="text-[12px] font-medium text-[#333] truncate">{userById(g.id)?.name ?? "Unassigned"}</p>
              <Badge tone={g.items.some((e) => !e.done) ? "blue" : "green"}>{g.items.filter((e) => e.done).length}/{g.items.length}</Badge>
            </div>
            <ul className="px-1">{g.items.map(row)}</ul>
          </div>
        ))}
    </Card>
  );
}

export function SalesCalendar() {
  const TODAY = today();
  const { enquiries, customers } = useSalesData();
  const { user } = useAuth();
  // Sales users are test data, so the login is linked to one by email (or full name).
  const me = SALES_USERS.find((u) => u.email.toLowerCase() === user?.email?.toLowerCase() || (!!user?.fullName && u.name.toLowerCase() === user.fullName.toLowerCase()));
  const isAdmin = user?.role?.slug === "super-admin" || me?.role === "Sales Manager";
  const [view, setView] = useState<"day" | "week" | "team">("week");
  const [date, setDate] = useState(TODAY);
  const [owner, setOwner] = useState(!isAdmin && me ? me.id : "all");
  const [events, setEvents] = usePersistentState<CalEvent[]>("followUps.tasks", []);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = events.find((e) => e.id === openId) ?? null;
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_TASK);
  const [formError, setFormError] = useState("");

  const shown = events.filter((e) => owner === "all" || e.ownerId === owner);
  const weekStart = mondayOf(date);
  const weekDays = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));
  const step = view === "day" || view === "team" ? 1 : 7;
  const openEnquiries = enquiries.filter((e) => e.status !== "Won" && e.status !== "Lost");

  const complete = (e: CalEvent) => {
    setEvents((list) => list.map((x) => (x.id === e.id ? { ...x, done: true } : x)));
    if (e.customerId) logActivity({ customerId: e.customerId, enquiryId: e.enquiryId, type: "Task", note: `${e.type} completed: ${e.title}` });
    previewToast(e.customerId ? "Task completed and written to the activity history" : "Task completed");
    setOpenId(null);
  };

  const addEvent = () => {
    const enq = enquiryById(form.enquiryId);
    const customerName = enq ? customerById(enq.customerId)?.name ?? "" : form.customer.trim();
    if (!form.title.trim()) return setFormError("Title is required");
    if (!customerName) return setFormError("Link an enquiry or enter a customer");
    if (!form.ownerId) return setFormError("Choose the executive");
    if (!form.date) return setFormError("Choose a date");
    const customerId = enq?.customerId ?? customers.find((c) => c.name.toLowerCase() === customerName.toLowerCase())?.id;
    setEvents((list) => [...list, { id: `e-${Date.now()}`, date: form.date, start: Number(form.start), duration: 1, type: form.type, ownerId: form.ownerId, title: form.title.trim(), customer: customerName, customerId, enquiryId: enq?.id }]);
    previewToast("Task added to the calendar");
    setAdding(false);
    setDate(form.date);
  };

  const rangeLabel = view === "week" ? `${dayLabel(weekDays[0])} – ${dayLabel(weekDays[5])}` : dayLabel(date);

  return (
    <>
      <PageHeader actions={<PrimaryButton icon={Plus} onClick={() => { setForm({ ...EMPTY_TASK, date }); setFormError(""); setAdding(true); }}>Add task</PrimaryButton>} />
      {events.length === 0 && <Notice tone="info" className="mb-4">The calendar is empty. Use “Add task” to schedule a follow-up — booked test drives are added here automatically.</Notice>}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-1">
        <Tabs value={view} onChange={setView} tabs={[{ key: "day", label: "Day", icon: CalendarDays }, { key: "week", label: "Week", icon: CalendarDays }, { key: "team", label: "Team", icon: Users }]} className="mb-0" />
        <div className="flex items-center gap-2 flex-wrap">
          <SmallButton icon={ChevronLeft} aria-label="Previous" onClick={() => setDate(addDays(date, -step))} />
          <SmallButton onClick={() => setDate(TODAY)}>Today</SmallButton>
          <SmallButton icon={ChevronRight} aria-label="Next" onClick={() => setDate(addDays(date, step))} />
          <span className="text-[13px] font-medium text-[#333] min-w-[180px]">{rangeLabel}</span>
          {view !== "team" && <FilterSelect label="Executive" value={owner} onChange={setOwner} options={[{ value: "all", label: "All executives" }, ...EXECUTIVES.map((u) => ({ value: u.id, label: u.name }))]} />}
        </div>
      </div>
      <div className="flex flex-wrap gap-3 my-3">
        {(Object.keys(EVENT_STYLE) as EventType[]).map((t) => (
          <span key={t} className={cn("text-[11px] px-2 py-0.5 rounded border-l-[3px] border", EVENT_STYLE[t])}>{t}</span>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-5 items-start">
      <div>
        {isAdmin || me
          ? <TodayTasks events={events} ownerIds={isAdmin ? (owner === "all" ? null : [owner]) : [me!.id]} mine={!isAdmin} onOpen={(e) => setOpenId(e.id)} onComplete={complete} />
          : <Notice tone="info">Your login isn't linked to a sales executive, so there is no personal task list. Sales users are matched by email address.</Notice>}
      </div>
      <Card bodyClassName="p-0 sm:p-0">
        <div className="overflow-x-auto">
          {view === "week" && (
            <div className="grid min-w-[760px]" style={{ gridTemplateColumns: "56px repeat(6, minmax(110px, 1fr))", gridTemplateRows: `36px repeat(${HOURS.length}, 52px)` }}>
              <div className="border-b border-[#eee]" />
              {weekDays.map((d, i) => (
                <div key={d} className={cn("border-b border-l border-[#eee] text-[12px] font-medium flex items-center justify-center", d === TODAY ? "text-[#ff4f31] bg-[#fff6f4]" : "text-[#555]")} style={{ gridColumn: i + 2, gridRow: 1 }}>{dayLabel(d)}</div>
              ))}
              {HOURS.map((h, r) => (
                <div key={h} className="text-[10px] text-[#999] pr-2 text-right pt-1 border-b border-[#f3f3f3]" style={{ gridColumn: 1, gridRow: r + 2 }}>{String(h).padStart(2, "0")}:00</div>
              ))}
              {weekDays.map((d, c) => HOURS.map((h, r) => <div key={`${d}-${h}`} className="border-l border-b border-[#f3f3f3]" style={{ gridColumn: c + 2, gridRow: r + 2 }} />))}
              {shown.filter((e) => weekDays.includes(e.date)).map((e) => (
                <div key={e.id} className="p-0.5 z-10" style={{ gridColumn: weekDays.indexOf(e.date) + 2, gridRow: `${e.start - HOURS[0] + 2} / span ${e.duration}` }}>
                  <EventChip e={e} onOpen={(x) => setOpenId(x.id)} compact={e.duration === 1} />
                </div>
              ))}
            </div>
          )}

          {view === "day" && (
            <div className="grid min-w-[420px]" style={{ gridTemplateColumns: "56px 1fr", gridTemplateRows: `repeat(${HOURS.length}, 56px)` }}>
              {HOURS.map((h, r) => (
                <div key={h} className="contents">
                  <div className="text-[10px] text-[#999] pr-2 text-right pt-1 border-b border-[#f3f3f3]" style={{ gridColumn: 1, gridRow: r + 1 }}>{String(h).padStart(2, "0")}:00</div>
                  <div className="border-l border-b border-[#f3f3f3]" style={{ gridColumn: 2, gridRow: r + 1 }} />
                </div>
              ))}
              {shown.filter((e) => e.date === date).map((e) => (
                <div key={e.id} className="p-0.5 z-10" style={{ gridColumn: 2, gridRow: `${e.start - HOURS[0] + 1} / span ${e.duration}` }}>
                  <EventChip e={e} onOpen={(x) => setOpenId(x.id)} />
                </div>
              ))}
            </div>
          )}

          {view === "team" && (
            <div className="grid min-w-[900px]" style={{ gridTemplateColumns: `150px repeat(${HOURS.length}, minmax(70px, 1fr))`, gridTemplateRows: `32px repeat(${EXECUTIVES.length}, 56px)` }}>
              <div className="border-b border-[#eee] text-[11px] text-[#999] flex items-center px-3">Executive</div>
              {HOURS.map((h, i) => <div key={h} className="border-b border-l border-[#eee] text-[10px] text-[#999] flex items-center justify-center" style={{ gridColumn: i + 2, gridRow: 1 }}>{String(h).padStart(2, "0")}:00</div>)}
              {EXECUTIVES.map((u, r) => (
                <div key={u.id} className="contents">
                  <div className="border-b border-[#f3f3f3] px-3 flex flex-col justify-center" style={{ gridColumn: 1, gridRow: r + 2 }}>
                    <p className="text-[12px] font-medium text-[#333] truncate">{u.name}</p>
                    <p className="text-[10px] text-[#999]">{u.branch ? `${u.branch} · ` : ""}{events.filter((e) => e.date === date && e.ownerId === u.id).length} items</p>
                  </div>
                  {HOURS.map((h, c) => <div key={h} className="border-l border-b border-[#f3f3f3]" style={{ gridColumn: c + 2, gridRow: r + 2 }} />)}
                </div>
              ))}
              {events.filter((e) => e.date === date).map((e) => {
                const row = EXECUTIVES.findIndex((u) => u.id === e.ownerId);
                if (row < 0) return null;
                return (
                  <div key={e.id} className="p-0.5 z-10" style={{ gridRow: row + 2, gridColumn: `${e.start - HOURS[0] + 2} / span ${e.duration}` }}>
                    <EventChip e={e} onOpen={(x) => setOpenId(x.id)} compact />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
      </div>

      <Modal isOpen={!!open} onClose={() => setOpenId(null)} title={open?.title} size="sm">
        {open && (
          <div className="space-y-4">
            <KeyValueGrid cols={2} items={[
              { label: "Type", value: <span className={cn("text-[11px] px-2 py-0.5 rounded border", EVENT_STYLE[open.type])}>{open.type}</span> },
              { label: "When", value: `${dayLabel(open.date)} · ${String(open.start).padStart(2, "0")}:00 (${open.duration} h)` },
              { label: "Customer", value: open.customer },
              { label: "Enquiry", value: open.enquiryId ?? "—" },
              { label: "Owner", value: userById(open.ownerId)?.name },
              { label: "Status", value: <StatusBadge status={open.done ? "Completed" : "Scheduled"} /> },
            ]} />
            <div className="flex justify-end gap-2">
              <SmallButton variant="ghost" icon={Trash2} onClick={() => { setEvents((l) => l.filter((x) => x.id !== open.id)); setOpenId(null); previewToast("Task removed"); }}>Delete</SmallButton>
              <SmallButton onClick={() => setOpenId(null)}>Close</SmallButton>
              <SmallButton variant="primary" icon={CircleCheck} disabled={open.done} onClick={() => complete(open)}>Mark complete</SmallButton>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={adding} onClose={() => setAdding(false)} title="Add task" size="sm">
        <div className="space-y-4">
          {formError && <Notice tone="danger">{formError}</Notice>}
          <Field label="Title" required htmlFor="cal-title"><TextInput id="cal-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Call about finance outcome" /></Field>
          <Field label="Link to enquiry" hint="Links the task to the customer's activity history" htmlFor="cal-enq">
            <SelectInput id="cal-enq" value={form.enquiryId} onChange={(e) => { const enq = enquiryById(e.target.value); setForm({ ...form, enquiryId: e.target.value, ownerId: form.ownerId || enq?.ownerId || "" }); }} placeholder={openEnquiries.length ? "No enquiry" : "No open enquiries yet"} options={openEnquiries.map((e) => ({ value: e.id, label: `${e.id} — ${customerById(e.customerId)?.name}` }))} />
          </Field>
          {!form.enquiryId && (
            <>
              <Field label="Customer" required htmlFor="cal-cust"><TextInput id="cal-cust" value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} list="cal-customers" /></Field>
              <datalist id="cal-customers">{customers.map((c) => <option key={c.id} value={c.name} />)}</datalist>
            </>
          )}
          <FormGrid>
            <Field label="Type" htmlFor="cal-type"><SelectInput id="cal-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as EventType })} options={Object.keys(EVENT_STYLE)} /></Field>
            <Field label="Executive" required htmlFor="cal-owner"><SelectInput id="cal-owner" value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })} placeholder="Select executive" options={EXECUTIVES.map((u) => ({ value: u.id, label: u.name }))} /></Field>
            <Field label="Date" required htmlFor="cal-date"><TextInput id="cal-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Start" required htmlFor="cal-start"><SelectInput id="cal-start" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} options={HOURS.map((h) => ({ value: String(h), label: `${String(h).padStart(2, "0")}:00` }))} /></Field>
          </FormGrid>
          <div className="flex justify-end gap-2">
            <SmallButton onClick={() => setAdding(false)}>Cancel</SmallButton>
            <SmallButton variant="primary" onClick={addEvent}>Add task</SmallButton>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ── Demo Vehicles ────────────────────────────────────────────────────────────
const isDemo = (v: StockVehicle) => v.status !== "On Hold" && (v.type === "Demo" || v.status === "Demo");
const activeDrive = (t: TestDrive) => t.status === "Booked" || t.status === "In progress";

function NoStock() {
  const navigate = useNavigate();
  return <EmptyState icon={Car} title="No vehicles in stock yet" message="Receive a vehicle against a purchase order first; it can then be marked as a demo car." action={<PrimaryButton onClick={() => navigate(screenPath("goods-receipt", "receive-vehicle"))}>Receive vehicle</PrimaryButton>} />;
}

export function DemoVehicles() {
  const navigate = useNavigate();
  const { stock, testDrives } = useSalesData();
  const [prevType, setPrevType] = usePersistentState<Record<string, StockVehicle["type"]>>("followUps.demoPrevType", {});
  const [q, setQ] = useState("");
  const [branch, setBranch] = useState("All branches");
  const [scope, setScope] = useState<"demo" | "eligible">("demo");
  const TODAY = today();

  const eligible = stock.filter((v) => isDemo(v) || v.status === "In Stock");
  const demos = eligible.filter(isDemo);
  const rows = eligible
    .filter((v) => scope === "eligible" || isDemo(v))
    .filter((v) => branch === "All branches" || v.branch === branch)
    .filter((v) => [v.stockNo, v.model, v.vin, v.registration].join(" ").toLowerCase().includes(q.toLowerCase()));

  const availability = (v: StockVehicle): { label: string; tone: Tone } => {
    if (testDrives.some((t) => t.stockNo === v.stockNo && t.status === "In progress")) return { label: "On test drive", tone: "amber" };
    const next = testDrives.filter((t) => t.stockNo === v.stockNo && t.status === "Booked" && t.date === TODAY).sort((a, b) => a.time.localeCompare(b.time))[0];
    return { label: next ? `Available · next booking ${next.time}` : "Available", tone: "green" };
  };

  const toggle = (v: StockVehicle, on: boolean) => {
    if (on) {
      setPrevType((m) => ({ ...m, [v.stockNo]: v.type }));
      salesStore.update("stock", (s) => s.stockNo === v.stockNo, { type: "Demo", status: "Demo" });
    } else {
      const prev = prevType[v.stockNo];
      salesStore.update("stock", (s) => s.stockNo === v.stockNo, { type: prev && prev !== "Demo" ? prev : "New", status: "In Stock" });
    }
    previewToast(`${v.stockNo} ${on ? "marked as demo vehicle" : "removed from demo fleet"}`);
  };

  const todays = testDrives.filter((t) => t.date === TODAY && t.status !== "Cancelled");

  const columns: Column<StockVehicle>[] = [
    { key: "stock", header: "Stock no.", render: (v) => <span className="font-medium text-[#ff4f31]">{v.stockNo}</span>, sortValue: (v) => v.stockNo },
    { key: "model", header: "Make / model", render: (v) => <div><p className="text-[#333]">{v.make} {v.model}</p><p className="text-[11px] text-[#999]">{v.colour} · {v.year}</p></div>, sortValue: (v) => v.model },
    { key: "reg", header: "Registration / VIN", render: (v) => (v.registration ? v.registration : <span className="font-mono text-[11px] text-[#999]">{v.vin}</span>) },
    { key: "odo", header: "Odometer", align: "right", render: (v) => `${v.odometer.toLocaleString()} km`, sortValue: (v) => v.odometer },
    { key: "branch", header: "Branch", render: (v) => v.branch },
    { key: "avail", header: "Availability", render: (v) => (isDemo(v) ? <Badge tone={availability(v).tone}>{availability(v).label}</Badge> : <span className="text-[#bbb]">—</span>) },
    { key: "status", header: "Stock status", render: (v) => <StatusBadge status={v.status} /> },
    { key: "demo", header: "Demo car", align: "center", render: (v) => <Toggle checked={isDemo(v)} label={`${v.stockNo} is a demo vehicle`} onChange={(on) => toggle(v, on)} /> },
  ];

  return (
    <>
      <PageHeader actions={<PrimaryButton icon={KeyRound} onClick={() => navigate(screenPath("crm", "book-test-drive"))}>Book test drive</PrimaryButton>} />
      <KpiGrid cols={3}>
        <KpiCard label="Demo vehicles" value={demos.length} icon={Car} />
        <KpiCard label="Available now" value={demos.filter((v) => availability(v).tone === "green").length} icon={CircleCheck} />
        <KpiCard label="Test drives today" value={todays.length} hint={`${todays.filter((t) => t.status === "Completed").length} completed · ${todays.filter(activeDrive).length} open`} icon={CalendarDays} />
      </KpiGrid>
      {stock.length === 0 ? <NoStock /> : (
        <Card>
          <FilterPills<"demo" | "eligible"> value={scope} onChange={setScope} options={[{ key: "demo", label: "Demo fleet", count: demos.length }, { key: "eligible", label: "All eligible stock", count: eligible.length }]} />
          <Toolbar>
            <SearchInput value={q} onChange={setQ} placeholder="Search stock no., model, VIN or registration" />
            <FilterSelect label="Branch" value={branch} onChange={setBranch} options={["All branches", ...BRANCHES]} />
          </Toolbar>
          <DataTable columns={columns} rows={rows} rowKey={(v) => v.stockNo} empty={<EmptyState icon={Car} title="No demo vehicles" message="Switch to “All eligible stock” and mark in-stock units as demo cars." />} />
        </Card>
      )}
    </>
  );
}

// ── Book Test Drive ──────────────────────────────────────────────────────────
const SLOTS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];
const EARLY_STAGES = ["New", "Contacted", "Qualified"];

export function BookTestDrive() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { stock, testDrives } = useSalesData();
  const enquiries = useMyEnquiries();
  const [, setTasks] = usePersistentState<CalEvent[]>("followUps.tasks", []);
  const TODAY = today();
  const openEnquiries = enquiries.filter((e) => e.status !== "Won" && e.status !== "Lost");
  const vehicles = stock.filter((v) => isDemo(v) || v.status === "In Stock").sort((a, b) => Number(isDemo(b)) - Number(isDemo(a)));
  const [enquiryId, setEnquiryId] = useState(openEnquiries.find((e) => e.id === params.get("enquiry"))?.id ?? "");
  const [vehicle, setVehicle] = useState("");
  const [date, setDate] = useState(TODAY);
  const [slot, setSlot] = useState("");
  const [salesperson, setSalesperson] = useState(enquiryById(params.get("enquiry"))?.ownerId ?? "");
  const [notes, setNotes] = useState("");
  const [licence, setLicence] = useState(false);
  const [checked, setChecked] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [booked, setBooked] = useState<string | null>(null);

  const enq = enquiryById(enquiryId);
  const customer = enq ? customerById(enq.customerId) : undefined;
  const taken = testDrives.filter((t) => t.stockNo === vehicle && t.date === date && activeDrive(t));
  const clash = taken.find((t) => t.time === slot);
  // Today's slots that have already started can't be booked.
  const nowHm = new Date().toTimeString().slice(0, 5);
  const isPast = (s: string) => date === TODAY && s <= nowHm;
  const freeCount = SLOTS.filter((s) => !isPast(s) && !taken.some((t) => t.time === s)).length;

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!enq) e.enquiry = "Select the enquiry";
    if (!vehicle) e.vehicle = "Select a vehicle";
    if (!date) e.date = "Choose a date";
    else if (date < TODAY) e.date = "Date cannot be in the past";
    if (!slot) e.slot = "Choose a time slot";
    else if (isPast(slot)) e.slot = "This time has already passed — choose a later slot";
    else if (clash) e.slot = "This slot is already booked — choose another";
    if (!salesperson) e.salesperson = "Select the salesperson";
    setErrors(e);
    if (Object.keys(e).length || !enq) return;
    const id = await salesStore.nextNumber("TD");
    salesStore.add("testDrives", { id, enquiryId: enq.id, customerId: enq.customerId, stockNo: vehicle, date, time: slot, execId: salesperson, status: "Booked", feedback: notes.trim() || undefined });
    if (EARLY_STAGES.includes(enq.status)) salesStore.update("enquiries", (x) => x.id === enq.id, { status: "Test Drive", daysInStage: 0 });
    logActivity({ customerId: enq.customerId, enquiryId: enq.id, type: "Test drive", note: `Test drive ${id} booked — ${stockByNo(vehicle)?.model} on ${dayLabel(date)} at ${slot}` });
    setTasks((list) => [...list, { id: `e-${id}`, date, start: Number(slot.slice(0, 2)), duration: 1, type: "Test drive", ownerId: salesperson, title: `Test drive ${id}`, customer: customer?.name ?? "", customerId: enq.customerId, enquiryId: enq.id }]);
    setBooked(id);
    previewToast(`Test drive ${id} booked`);
  };

  if (booked) {
    const v = stockByNo(vehicle);
    return (
      <>
        <PageHeader />
        <Card>
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3"><CircleCheck className="w-7 h-7 text-green-600" /></div>
            <p className="text-[16px] font-semibold text-[#333]">Test drive {booked} booked</p>
            <p className="text-[13px] text-[#666] mt-1">{customer?.name} · {v?.model} ({v?.registration ?? v?.stockNo}) · {dayLabel(date)} at {slot} with {userById(salesperson)?.name}. Added to the FollowUp Calendar. Saved; no reminder was sent (messaging is not connected yet).</p>
            <div className="flex justify-center gap-2 mt-5 flex-wrap">
              <SecondaryButton onClick={() => { setBooked(null); setSlot(""); setChecked(false); }}>Book another</SecondaryButton>
              <PrimaryButton icon={Play} onClick={() => navigate(`${screenPath("crm", "start-test-drive")}?id=${booked}`)}>Start test drive</PrimaryButton>
            </div>
          </div>
        </Card>
      </>
    );
  }

  if (openEnquiries.length === 0) {
    return (<><PageHeader /><EmptyState icon={Car} title="No open enquiries" message="A test drive is booked against an enquiry. Capture one first." action={<PrimaryButton icon={Plus} onClick={() => navigate(screenPath("crm", "add-enquiry"))}>Add Enquiry</PrimaryButton>} /></>);
  }
  if (vehicles.length === 0) return (<><PageHeader /><NoStock /></>);

  return (
    <>
      <PageHeader />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-5">
          <Card title="Booking details">
            <FormGrid>
              <Field label="Enquiry" required error={errors.enquiry} htmlFor="td-enq">
                <SelectInput id="td-enq" value={enquiryId} onChange={(e) => { setEnquiryId(e.target.value); if (!salesperson) setSalesperson(enquiryById(e.target.value)?.ownerId ?? ""); setErrors((x) => ({ ...x, enquiry: "" })); }} error={!!errors.enquiry} placeholder="Select enquiry" options={openEnquiries.map((e) => ({ value: e.id, label: `${e.id} — ${customerById(e.customerId)?.name} · ${e.interest}` }))} />
              </Field>
              <Field label="Salesperson" required error={errors.salesperson} htmlFor="td-sp">
                <SelectInput id="td-sp" value={salesperson} onChange={(e) => { setSalesperson(e.target.value); setErrors((x) => ({ ...x, salesperson: "" })); }} error={!!errors.salesperson} placeholder="Select salesperson" options={EXECUTIVES.map((u) => ({ value: u.id, label: `${u.name}${u.branch ? ` (${u.branch})` : ""}` }))} />
              </Field>
              <Field label="Vehicle" required error={errors.vehicle} hint="Demo cars are listed first" htmlFor="td-veh">
                <SelectInput id="td-veh" value={vehicle} onChange={(e) => { setVehicle(e.target.value); setChecked(false); setSlot(""); setErrors((x) => ({ ...x, vehicle: "" })); }} error={!!errors.vehicle} placeholder="Select vehicle" options={vehicles.map((v) => ({ value: v.stockNo, label: `${v.stockNo} — ${v.model}${v.registration ? ` (${v.registration})` : ""}${isDemo(v) ? " · Demo" : ""}` }))} />
              </Field>
              <Field label="Date" required error={errors.date} htmlFor="td-date">
                <TextInput id="td-date" type="date" min={TODAY} value={date} onChange={(e) => { setDate(e.target.value); setChecked(false); setSlot(""); }} error={!!errors.date} />
              </Field>
              <Field label="Notes" className="md:col-span-2" htmlFor="td-notes">
                <TextArea id="td-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Route preference, trade-in to inspect, etc." />
              </Field>
              <label className="flex items-center gap-2 text-[13px] text-[#555] md:col-span-2">
                <input type="checkbox" checked={licence} onChange={(e) => setLicence(e.target.checked)} className="accent-[#ff4f31] w-4 h-4" />
                Customer has been asked to bring a valid driving licence
              </label>
            </FormGrid>
          </Card>

          <Card title="Time slot" subtitle="One booking per vehicle per slot." actions={<SmallButton icon={Clock} onClick={() => (vehicle ? setChecked(true) : setErrors((e) => ({ ...e, vehicle: "Select a vehicle first" })))}>Check availability</SmallButton>}>
            {!vehicle ? (
              <EmptyState icon={Car} title="Select a vehicle" message="Slots appear once a vehicle and date are chosen." />
            ) : (
              <>
                {checked && <Notice tone="success" className="mb-3">{stockByNo(vehicle)?.model} on {dayLabel(date)}: {freeCount} of {SLOTS.length} slots free.</Notice>}
                <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2" role="radiogroup" aria-label="Time slots">
                  {SLOTS.map((s) => {
                    const t = taken.find((x) => x.time === s);
                    const past = isPast(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        role="radio"
                        aria-checked={slot === s}
                        disabled={past}
                        onClick={() => { setSlot(s); setErrors((e) => ({ ...e, slot: "" })); }}
                        className={cn(
                          "rounded-lg border px-2 py-2 text-[12px] font-medium transition-colors",
                          past ? "border-[#e5e7eb] bg-[#eeeeee] text-[#b5b5b5] cursor-not-allowed"
                            : slot === s ? (t ? "border-red-400 bg-red-50 text-red-700" : "border-[#ff4f31] bg-[#fff6f4] text-[#ff4f31]") : t ? "border-[#e5e7eb] bg-[#f5f5f5] text-[#aaa] line-through" : "border-[#e5e7eb] bg-white text-[#333] hover:bg-[#fafafa]",
                          !past && "cursor-pointer",
                        )}
                        title={past ? "Time passed" : t ? `Booked: ${customerById(t.customerId)?.name} (${userById(t.execId)?.name})` : "Available"}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
                {clash && (
                  <Notice tone="danger" className="mt-3" title="Double booking">
                    {clash.id} already uses this vehicle at {clash.time} for {customerById(clash.customerId)?.name}. Choose another slot or vehicle.
                  </Notice>
                )}
                {errors.slot && !clash && <p className="text-[11px] text-[#FE2B73] mt-2" role="alert">{errors.slot}</p>}
              </>
            )}
          </Card>
        </div>

        <div className="space-y-5 lg:sticky lg:top-0">
          <Card title="Booking summary">
            <KeyValueGrid cols={2} items={[
              { label: "Customer", value: customer?.name ?? "—" },
              { label: "Vehicle", value: vehicle ? `${stockByNo(vehicle)?.model} · ${stockByNo(vehicle)?.registration ?? vehicle}` : "—" },
              { label: "When", value: slot ? `${dayLabel(date)} at ${slot}` : "—" },
              { label: "Salesperson", value: userById(salesperson)?.name ?? "—" },
            ]} />
          </Card>
          <PrimaryButton className="w-full!" icon={CalendarDays} onClick={submit} disabled={!!clash}>Confirm booking</PrimaryButton>
          <Notice tone="info">A WhatsApp reminder would be sent 2 hours before (Reminder Rules). Not sent — messaging is not connected yet.</Notice>
        </div>
      </div>
    </>
  );
}

function licenceReasonText(reason: string | null | undefined) {
  switch (reason) {
    case "NO_LICENCE_DETECTED": return "That doesn't look like a driving licence — capture the front of the card.";
    case "NOT_READABLE": return "The licence could not be read clearly — retake it.";
    case "LOW_CONFIDENCE": return "Not confident enough reading the licence — retake it in better light.";
    case "IMAGE_TOO_LARGE": return "That image is too large to scan.";
    case "UNSUPPORTED_FORMAT": return "That image format is not supported.";
    default: return "Could not scan the licence — retake it.";
  }
}

// ── Start Test Drive ─────────────────────────────────────────────────────────
export function StartTestDrive() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { testDrives } = useSalesData();
  const td = testDrives.find((t) => t.id === params.get("id"));
  const pickable = testDrives.filter(activeDrive);

  if (td) return <TestDriveRun key={td.id} td={td} />;
  if (pickable.length === 0) {
    return (<><PageHeader /><EmptyState icon={Play} title="No booked test drives" message="Book a test drive first, then start it here." action={<PrimaryButton icon={CalendarDays} onClick={() => navigate(screenPath("crm", "book-test-drive"))}>Book test drive</PrimaryButton>} /></>);
  }
  return (
    <>
      <PageHeader />
      <Card title="Choose a test drive" subtitle={params.get("id") ? `Test drive ${params.get("id")} was not found.` : "Pick a booked or in-progress test drive."}>
        <SelectInput aria-label="Test drive" value="" placeholder="Select test drive" onChange={(e) => navigate(`${screenPath("crm", "start-test-drive")}?id=${e.target.value}`)}
          options={pickable.map((t) => ({ value: t.id, label: `${t.id} — ${customerById(t.customerId)?.name} · ${stockByNo(t.stockNo)?.model ?? t.stockNo} · ${fmtDate(t.date)} ${t.time} (${t.status})` }))} />
      </Card>
    </>
  );
}

function TestDriveRun({ td }: { td: TestDrive }) {
  const customer = customerById(td.customerId);
  const vehicle = stockByNo(td.stockNo);
  const exec = userById(td.execId);
  const baseOdo = vehicle?.odometer ?? 0;
  const capturedAt = useMemo(() => new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }), []);
  const begun = td.status !== "Booked";

  // The DRIVER's licence — often not the customer (e.g. an employee of a company
  // customer). Front / back; the front is read
  // by the AI licence scan (same as Gate Entry). Live camera only — no uploads;
  // images stay in this browser.
  const [front, setFront] = useState<string | null>(null); // preview URL
  const [back, setBack] = useState<string | null>(null);
  const [camera, setCamera] = useState<"front" | "back" | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [licence, setLicence] = useState<{ no: string; name: string } | null>(td.licenceNo ? { no: td.licenceNo, name: td.licenceName ?? "" } : null);
  const scanId = useRef(0);
  const [odoOut, setOdoOut] = useState(String(td.startOdo ?? baseOdo));
  const [fuel, setFuel] = useState("");
  const [accepted, setAccepted] = useState(begun);
  const [signature, setSignature] = useState<string | null>(null);
  const [odoIn, setOdoIn] = useState("");
  const [feedback, setFeedback] = useState("");
  const [odoInError, setOdoInError] = useState("");
  const state = td.status === "Booked" ? "pre" : td.status === "In progress" ? "driving" : "returned";

  const preview = (file: File, side: "front" | "back") => {
    const url = URL.createObjectURL(file);
    (side === "front" ? setFront : setBack)((old) => { if (old) URL.revokeObjectURL(old); return url; });
  };
  // Front → AI scan for the licence number and name (raw frame, before the stamp).
  const takeImage = async (side: "front" | "back", file: File, rawFile?: File) => {
    setCamera(null);
    preview(file, side);
    if (side === "back") return;
    const id = ++scanId.current;
    setScanning(true);
    setScanError("");
    try {
      const d = (await scanLicence(rawFile ?? file)).data;
      if (id !== scanId.current) return;
      if (!d?.isLicence || d.reason || !d.licenceNumber) {
        setLicence(null);
        setScanError(licenceReasonText(d?.reason ?? (d?.isLicence ? "NOT_READABLE" : "NO_LICENCE_DETECTED")));
        return;
      }
      setLicence({ no: d.licenceNumber, name: d.name ?? "" });
    } catch (e) {
      if (id !== scanId.current) return;
      setLicence(null);
      setScanError((e as { response?: { status?: number } })?.response?.status === 403
        ? "Your role cannot scan licences (needs CRM / Enquiry › Edit)."
        : "Could not scan the licence — retake it.");
    } finally {
      if (id === scanId.current) setScanning(false);
    }
  };

  const steps = [
    { label: "Licence scanned & valid", ok: !!licence && (begun || !!back) },
    { label: "Odometer & fuel recorded", ok: Number(odoOut) >= baseOdo && !!fuel },
    { label: "Indemnity accepted", ok: accepted },
    { label: "Customer signature", ok: !!signature },
  ];
  const ready = steps.every((s) => s.ok);

  const start = () => {
    salesStore.update("testDrives", (t) => t.id === td.id, {
      status: "In progress", startOdo: Number(odoOut),
      licenceNo: licence?.no, licenceName: licence?.name || undefined, licenceScannedAt: new Date().toISOString(),
    });
    previewToast(`Test drive ${td.id} started`);
  };

  const finish = () => {
    const out = td.startOdo ?? Number(odoOut);
    if (!odoIn || Number(odoIn) < out) return setOdoInError(`Must be at least ${out.toLocaleString()} km`);
    const end = Number(odoIn);
    salesStore.update("testDrives", (t) => t.id === td.id, { status: "Completed", endOdo: end, feedback: feedback.trim() || td.feedback });
    if (vehicle) salesStore.update("stock", (v) => v.stockNo === vehicle.stockNo, { odometer: end });
    logActivity({ customerId: td.customerId, enquiryId: td.enquiryId, type: "Test drive", note: `Test drive ${td.id} completed — ${vehicle?.model ?? td.stockNo}, ${end - out} km${feedback.trim() ? `. Feedback: ${feedback.trim()}` : ""}` });
    previewToast("Test drive completed and logged to customer history");
  };

  return (
    <>
      <PageHeader />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-5">
          <Card title="1. Driver's licence" icon={ScanLine} subtitle="The person taking the drive — the customer or someone on their behalf">
            {state === "pre" && (
              <>
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  {(["front", "back"] as const).map((side) => (
                    <div key={side}>
                      <PhotoSlot label={side === "front" ? "Licence front *" : "Licence back *"} captured={!!(side === "front" ? front : back)}
                        imageUrl={side === "front" ? front : back} busy={side === "front" && scanning}
                        meta={(side === "front" ? front : back) ? `Captured ${capturedAt}` : undefined} onCapture={() => setCamera(side)} />
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-[#999] mt-2">Tap a side to capture it with the live camera. The front is AI-scanned for the licence number as soon as it is captured.</p>
              </>
            )}
            {scanning && <p className="mt-4 text-[13px] text-[#555]">Scanning licence…</p>}
            {!scanning && scanError && <Notice tone="danger" className="mt-4">{scanError}</Notice>}
            {!scanning && licence && (
              <div className="mt-4 border border-green-200 bg-green-50 rounded-lg p-3">
                <p className="text-[12px] font-semibold text-green-800 flex items-center gap-1.5 mb-2"><CircleCheck size={14} /> Driver licence read</p>
                <KeyValueGrid cols={2} items={[
                  { label: "Driver", value: licence.name || "—" },
                  { label: "Licence no.", value: <span className="font-mono">{licence.no}</span> },
                ]} />
              </div>
            )}
          </Card>

          <LiveCameraCapture isOpen={camera !== null} title={camera === "front" ? "Licence front — AI scan" : "Licence back"}
            onClose={() => setCamera(null)} onCapture={(file, _meta, raw) => { if (camera) void takeImage(camera, file, raw); }} />

          <Card title="2. Vehicle check-out" icon={Gauge}>
            <FormGrid cols={3}>
              <Field label="Odometer out (km)" required htmlFor="td-odo" error={state === "pre" && Number(odoOut) < baseOdo ? `Cannot be below ${baseOdo.toLocaleString()} km` : undefined}>
                <TextInput id="td-odo" type="number" value={odoOut} onChange={(e) => setOdoOut(e.target.value)} disabled={state !== "pre"} />
              </Field>
              <Field label="Fuel level" required htmlFor="td-fuel">
                <SelectInput id="td-fuel" value={fuel} onChange={(e) => setFuel(e.target.value)} placeholder="Select" options={["Full", "3/4", "1/2", "1/4", "Reserve"]} disabled={state !== "pre"} />
              </Field>
              <Field label="Route" htmlFor="td-route">
                <SelectInput id="td-route" defaultValue="Standard 25 km loop" options={["Standard 25 km loop", "Highway route (N1)", "Gravel route (4x4)"]} disabled={state !== "pre"} />
              </Field>
            </FormGrid>
          </Card>

          <Card title="3. Indemnity" icon={Fuel}>
            <div className="bg-[#fafafa] border border-[#eee] rounded-lg p-3 text-[12px] text-[#555] leading-relaxed max-h-36 overflow-y-auto">
              I, the undersigned, confirm that I hold a valid driving licence for this vehicle class and that I am not under the influence of alcohol or any substance. I accept responsibility for traffic fines incurred during the test drive and for damage caused by my negligence, up to the excess applicable under the dealership's insurance. I will follow the agreed route and the instructions of the accompanying salesperson.
            </div>
            <label className="flex items-center gap-2 text-[13px] text-[#333] mt-3">
              <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} disabled={state !== "pre"} className="accent-[#ff4f31] w-4 h-4" />
              Customer has read and accepts the indemnity <span className="text-[#FE2B73]">*</span>
            </label>
            {state === "pre" && (
              <div className="mt-3 max-w-md">
                <p className="text-[13px] font-medium text-[#333] mb-1.5">Customer signature <span className="text-[#FE2B73]">*</span></p>
                <SignaturePad onChange={setSignature} />
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5 lg:sticky lg:top-0">
          <Card title={`Test drive ${td.id}`}>
            <KeyValueGrid cols={2} items={[
              { label: "Customer", value: [customer?.name, customer?.phone].filter(Boolean).join(" · ") || "—" },
              { label: "Driver", value: licence ? [licence.name, licence.no].filter(Boolean).join(" · ") : "Scan the driver's licence" },
              { label: "Vehicle", value: vehicle ? `${vehicle.stockNo} · ${vehicle.model}` : td.stockNo },
              { label: "Registration", value: vehicle?.registration ?? "—" },
              { label: "Salesperson", value: exec?.name ?? "—" },
              { label: "Booked for", value: `${fmtDate(td.date)} ${td.time}` },
              { label: "Status", value: <StatusBadge status={state === "pre" ? "Scheduled" : state === "driving" ? "In progress" : "Completed"} /> },
            ]} />
          </Card>
          <Card title="Checklist">
            {state === "pre" && (
              <ul className="space-y-2">
                {steps.map((s) => (
                  <li key={s.label} className="flex items-center gap-2 text-[13px]">
                    {s.ok ? <CircleCheck size={16} className="text-green-600" /> : <span className="w-4 h-4 rounded-full border-2 border-[#ddd]" />}
                    <span className={s.ok ? "text-[#333]" : "text-[#999]"}>{s.label}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              {state === "pre" && <PrimaryButton className="w-full!" icon={Play} disabled={!ready} onClick={start}>Start test drive</PrimaryButton>}
              {state === "driving" && (
                <div className="space-y-3">
                  <Notice tone="warning">Vehicle out with {(td.startOdo ?? 0).toLocaleString()} km on the clock. Record the odometer on return.</Notice>
                  <Field label="Odometer in (km)" required error={odoInError} htmlFor="td-odoin">
                    <TextInput id="td-odoin" type="number" value={odoIn} onChange={(e) => { setOdoIn(e.target.value); setOdoInError(""); }} error={!!odoInError} />
                  </Field>
                  <Field label="Customer feedback" htmlFor="td-fb">
                    <TextArea id="td-fb" value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Impressions, objections, next step…" />
                  </Field>
                  <PrimaryButton className="w-full!" icon={Square} onClick={finish}>End test drive</PrimaryButton>
                </div>
              )}
              {state === "returned" && (
                <Notice tone="success" title="Test drive completed">
                  {(td.endOdo ?? 0) - (td.startOdo ?? 0)} km driven.{td.feedback ? ` Feedback: ${td.feedback}` : ""} Logged to the customer history.
                </Notice>
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
