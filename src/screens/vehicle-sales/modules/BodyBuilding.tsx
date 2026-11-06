// Module 7 — Body Building (new after the Santosh review, 29 Oct 2026).
// A sold vehicle can go to an outside body builder before invoice / delivery.
// Masters and jobs are saved on the server (settings body.builders / body.types
// / body.jobs via data/store.ts). The two-way PDI app sync is not built yet.

import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus, Pencil, Trash2, Ban, BadgeCheck, Hammer, Truck, Clock, CircleCheck, AlertTriangle, RefreshCw, Wrench,
  ClipboardCheck, Send, Undo2, ArrowLeft, Link2,
} from "lucide-react";
import Modal from "../../../components/common/Modal";
import {
  PageHeader, Card, KpiGrid, KpiCard, Toolbar, SearchInput, FilterSelect, DataTable, StatusBadge, SmallButton,
  PrimaryButton, SecondaryButton, Field, TextInput, SelectInput, TextArea, FormGrid, ConfirmDialog, KeyValueGrid,
  Notice, EmptyState, Badge, Timeline, type Column, type Tone,
} from "../components/ui";
import { previewToast } from "../components/helpers";
import { screenPath } from "../registry";
import { fmtDate } from "../data/mock";
import {
  salesStore, useSalesData, usePersistentState, stockByNo, customerById, dealById, userById, today,
  BODY_KEYS, type BodyBuilder, type BodyType, type BodyJob, type BodyJobStatus,
} from "../data/store";

// Days allowed after the vehicle is back for PDI and handover; added to the
// build time to give the revised delivery ETA promised to the customer.
const PDI_BUFFER_DAYS = 2;

// Date-only maths in UTC so the result does not shift with the browser's time zone.
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
const deliveryEta = (j: BodyJob) => addDays(j.returnedOn ?? j.expectedReturn, PDI_BUFFER_DAYS);
const isOverdue = (j: BodyJob) => (j.status === "Sent" || j.status === "In progress" || j.status === "Rework") && j.expectedReturn < today();

const JOB_TONE: Record<BodyJobStatus, Tone> = { Sent: "blue", "In progress": "amber", Returned: "violet", Rework: "red", Completed: "green" };

const useBuilders = () => usePersistentState<BodyBuilder[]>(BODY_KEYS.builders, []);
const useTypes = () => usePersistentState<BodyType[]>(BODY_KEYS.types, []);
const useJobs = () => usePersistentState<BodyJob[]>(BODY_KEYS.jobs, []);

function logActivity(job: BodyJob, note: string) {
  const deal = dealById(job.dealId);
  if (!deal) return;
  salesStore.add("activities", { id: salesStore.localId("ACT"), customerId: deal.customerId, enquiryId: deal.enquiryId || undefined, type: "Body building", date: new Date().toISOString(), note, by: "You" });
}

function PdiAppSyncNotice() {
  return (
    <Notice tone="info" title="PDI app sync" className="mb-5">
      In the live module these records sync both ways with the PDI app, so an update in either place shows in the other. The PDI app sync is not connected yet — records are saved in TrueGear only.
    </Notice>
  );
}

// ── Body Builder Master ──────────────────────────────────────────────────────
const emptyBuilder = (): Omit<BodyBuilder, "id"> => ({ name: "", contact: "", phone: "", email: "", location: "", bodyTypeIds: [], active: true });

export function BodyBuilders() {
  const navigate = useNavigate();
  const [builders, setBuilders] = useBuilders();
  const [types] = useTypes();
  const [jobs] = useJobs();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [edit, setEdit] = useState<{ id: string | null } | null>(null);
  const [form, setForm] = useState(emptyBuilder());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<BodyBuilder | null>(null);

  const typeName = (id: string) => types.find((t) => t.id === id)?.name ?? "—";
  const openJobs = (b: BodyBuilder) => jobs.filter((j) => j.builderId === b.id && j.status !== "Completed").length;
  const rows = builders
    .filter((b) => (status === "all" ? true : status === "active" ? b.active : !b.active))
    .filter((b) => [b.name, b.contact, b.location, ...b.bodyTypeIds.map(typeName)].join(" ").toLowerCase().includes(q.toLowerCase()));

  const open = (b: BodyBuilder | null) => {
    setEdit({ id: b?.id ?? null });
    setForm(b ? { ...b } : emptyBuilder());
    setErrors({});
  };
  const toggleType = (id: string) => setForm((f) => ({ ...f, bodyTypeIds: f.bodyTypeIds.includes(id) ? f.bodyTypeIds.filter((x) => x !== id) : [...f.bodyTypeIds, id] }));

  const save = async () => {
    const e: Record<string, string> = {};
    const name = form.name.trim();
    if (!name) e.name = "Enter the body builder's name";
    else if (builders.some((b) => b.name.toLowerCase() === name.toLowerCase() && b.id !== edit?.id)) e.name = "This body builder already exists";
    if (!form.contact.trim()) e.contact = "Enter a contact person";
    if (!/^[+\d][\d\s-]{6,}$/.test(form.phone.trim())) e.phone = "Enter a valid phone number";
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = "Enter a valid email address";
    if (form.bodyTypeIds.length === 0) e.types = "Pick at least one body type this builder makes";
    setErrors(e);
    if (Object.keys(e).length) return;
    const clean = { ...form, name, contact: form.contact.trim(), phone: form.phone.trim(), email: form.email.trim(), location: form.location.trim() };
    if (edit?.id) setBuilders((list) => list.map((b) => (b.id === edit.id ? { ...clean, id: b.id } : b)));
    else {
      const id = await salesStore.nextNumber("BLD");
      setBuilders((list) => [...list, { ...clean, id }]);
    }
    previewToast(edit?.id ? "Body builder updated" : `Body builder ${name} added`);
    setEdit(null);
  };

  const columns: Column<BodyBuilder>[] = [
    { key: "name", header: "Body builder", render: (b) => (<div><p className="font-medium text-[#333]">{b.name}</p><p className="text-[11px] text-[#999]">{b.id}{b.location ? ` · ${b.location}` : ""}</p></div>), sortValue: (b) => b.name },
    { key: "contact", header: "Contact", render: (b) => (<div><p>{b.contact}</p><p className="text-[11px] text-[#999]">{b.phone}{b.email ? ` · ${b.email}` : ""}</p></div>) },
    { key: "types", header: "Body types built", render: (b) => <div className="flex flex-wrap gap-1">{b.bodyTypeIds.map((id) => <Badge key={id} tone="gray">{typeName(id)}</Badge>)}</div> },
    { key: "jobs", header: "Open jobs", align: "right", render: (b) => openJobs(b), sortValue: (b) => openJobs(b) },
    { key: "status", header: "Status", render: (b) => <StatusBadge status={b.active ? "Active" : "Inactive"} /> },
    {
      key: "act", header: "Actions", align: "right",
      render: (b) => (
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={() => open(b)} title="Edit" aria-label={`Edit ${b.name}`} className="p-1.5 rounded hover:bg-[#f3f4f6] text-[#555] cursor-pointer"><Pencil className="w-4 h-4" /></button>
          <button type="button" onClick={() => setConfirm(b)} title={b.active ? "Deactivate" : "Activate"} aria-label={`${b.active ? "Deactivate" : "Activate"} ${b.name}`} className={`p-1.5 rounded hover:bg-[#f3f4f6] cursor-pointer ${b.active ? "text-[#b45309]" : "text-[#1DB401]"}`}>
            {b.active ? <Ban className="w-4 h-4" /> : <BadgeCheck className="w-4 h-4" />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader actions={<PrimaryButton icon={Plus} disabled={types.length === 0} onClick={() => open(null)}>Add body builder</PrimaryButton>} />
      <PdiAppSyncNotice />
      {types.length === 0 && (
        <Notice tone="warning" title="Add body types first" className="mb-5" action={<SmallButton variant="primary" onClick={() => navigate(screenPath("body-building", "body-types"))}>Body Type Master</SmallButton>}>
          Each body builder is linked to the body types they build, so create the body types before adding a builder.
        </Notice>
      )}
      <Card>
        <Toolbar>
          <SearchInput value={q} onChange={setQ} placeholder="Search name, contact, location or body type" />
          <FilterSelect label="Status" value={status} onChange={setStatus} options={[{ value: "all", label: "All statuses" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
        </Toolbar>
        <DataTable columns={columns} rows={rows} rowKey={(b) => b.id}
          empty={<EmptyState icon={Hammer} title={builders.length ? "No body builders match" : "No body builders yet"} message={builders.length ? "Try another search or status." : "Add the outside companies that fit bodies to your vehicles."} />} />
      </Card>

      <Modal isOpen={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Edit body builder" : "Add body builder"} size="md">
        <div className="space-y-4">
          <FormGrid>
            <Field label="Name" required error={errors.name} htmlFor="bb-name"><TextInput id="bb-name" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={!!errors.name} placeholder="Company name" /></Field>
            <Field label="Location" htmlFor="bb-loc"><TextInput id="bb-loc" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Town or area" /></Field>
            <Field label="Contact person" required error={errors.contact} htmlFor="bb-contact"><TextInput id="bb-contact" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} error={!!errors.contact} /></Field>
            <Field label="Phone" required error={errors.phone} htmlFor="bb-phone"><TextInput id="bb-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={!!errors.phone} placeholder="e.g. 011 555 0100" /></Field>
            <Field label="Email" error={errors.email} htmlFor="bb-email" className="md:col-span-2"><TextInput id="bb-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={!!errors.email} /></Field>
          </FormGrid>
          <fieldset>
            <legend className="block text-[13px] font-medium text-[#333] mb-1.5">Body types built<span className="text-[#FE2B73] ml-0.5" aria-hidden>*</span></legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {types.map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-[13px] text-[#444] border border-[#f0f0f0] rounded-md px-2.5 py-1.5 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-[#ff4f31]" checked={form.bodyTypeIds.includes(t.id)} onChange={() => toggleType(t.id)} />
                  <span className="flex-1">{t.name}</span><span className="text-[11px] text-[#999]">{t.buildDays} days</span>
                </label>
              ))}
            </div>
            {errors.types && <p className="text-[11px] text-[#FE2B73] mt-1" role="alert">{errors.types}</p>}
          </fieldset>
          <div className="flex gap-3"><SecondaryButton className="flex-1" onClick={() => setEdit(null)}>Cancel</SecondaryButton><PrimaryButton className="flex-1" onClick={save}>{edit?.id ? "Save changes" : "Add"}</PrimaryButton></div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          setBuilders((list) => list.map((b) => (b.id === confirm!.id ? { ...b, active: !b.active } : b)));
          previewToast(`${confirm!.name} ${confirm!.active ? "deactivated" : "activated"}`);
          setConfirm(null);
        }}
        title={confirm?.active ? "Deactivate body builder" : "Activate body builder"}
        confirmLabel={confirm?.active ? "Deactivate" : "Activate"}
        message={confirm && <>{confirm.active ? "Deactivate" : "Activate"} <span className="font-semibold text-[#333]">{confirm.name}</span>? {confirm.active ? "Open jobs stay as they are, but no new jobs can be sent to this builder." : "New jobs can be sent to this builder again."}</>}
      />
    </>
  );
}

// ── Body Type Master ─────────────────────────────────────────────────────────
export function BodyTypes() {
  const [types, setTypes] = useTypes();
  const [builders, setBuilders] = useBuilders();
  const [jobs] = useJobs();
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<{ id: string | null } | null>(null);
  const [form, setForm] = useState({ name: "", buildDays: "", description: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [remove, setRemove] = useState<BodyType | null>(null);

  const usedBy = (t: BodyType) => builders.filter((b) => b.bodyTypeIds.includes(t.id)).length;
  const jobCount = (t: BodyType) => jobs.filter((j) => j.bodyTypeId === t.id).length;
  const rows = types.filter((t) => [t.name, t.description].join(" ").toLowerCase().includes(q.toLowerCase()));

  const open = (t: BodyType | null) => {
    setEdit({ id: t?.id ?? null });
    setForm(t ? { name: t.name, buildDays: String(t.buildDays), description: t.description } : { name: "", buildDays: "", description: "" });
    setErrors({});
  };
  const save = async () => {
    const e: Record<string, string> = {};
    const name = form.name.trim();
    const days = Number(form.buildDays);
    if (!name) e.name = "Enter the body type";
    else if (types.some((t) => t.name.toLowerCase() === name.toLowerCase() && t.id !== edit?.id)) e.name = "This body type already exists";
    if (!Number.isInteger(days) || days < 1 || days > 180) e.buildDays = "Enter whole days between 1 and 180";
    setErrors(e);
    if (Object.keys(e).length) return;
    const clean = { name, buildDays: days, description: form.description.trim() };
    if (edit?.id) setTypes((list) => list.map((t) => (t.id === edit.id ? { ...t, ...clean } : t)));
    else {
      const id = await salesStore.nextNumber("BT");
      setTypes((list) => [...list, { id, ...clean }]);
    }
    previewToast(edit?.id ? "Body type updated" : `Body type ${name} added`);
    setEdit(null);
  };

  const columns: Column<BodyType>[] = [
    { key: "name", header: "Body type", render: (t) => (<div><p className="font-medium text-[#333]">{t.name}</p><p className="text-[11px] text-[#999]">{t.id}</p></div>), sortValue: (t) => t.name },
    { key: "days", header: "Standard build time", align: "right", render: (t) => `${t.buildDays} days`, sortValue: (t) => t.buildDays },
    { key: "desc", header: "Description", render: (t) => <span className="text-[#666]">{t.description || "—"}</span> },
    { key: "builders", header: "Builders", align: "right", render: (t) => usedBy(t) },
    { key: "jobs", header: "Jobs", align: "right", render: (t) => jobCount(t) },
    {
      key: "act", header: "Actions", align: "right",
      render: (t) => (
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={() => open(t)} title="Edit" aria-label={`Edit ${t.name}`} className="p-1.5 rounded hover:bg-[#f3f4f6] text-[#555] cursor-pointer"><Pencil className="w-4 h-4" /></button>
          <button type="button" onClick={() => setRemove(t)} disabled={jobCount(t) > 0} title={jobCount(t) ? "Used on a job — cannot delete" : "Delete"} aria-label={`Delete ${t.name}`} className="p-1.5 rounded hover:bg-[#f3f4f6] text-[#FE2B73] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"><Trash2 className="w-4 h-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader actions={<PrimaryButton icon={Plus} onClick={() => open(null)}>Add body type</PrimaryButton>} />
      <PdiAppSyncNotice />
      <Card>
        <Toolbar><SearchInput value={q} onChange={setQ} placeholder="Search body types" /></Toolbar>
        <DataTable columns={columns} rows={rows} rowKey={(t) => t.id}
          empty={<EmptyState icon={Hammer} title={types.length ? "No body types match" : "No body types yet"} message={types.length ? "Try another search." : "Add the bodies fitted to your vehicles, e.g. dropside or tipper, with their standard build time."} />} />
      </Card>

      <Modal isOpen={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Edit body type" : "Add body type"} size="sm">
        <div className="space-y-4">
          <Field label="Body type" required error={errors.name} htmlFor="bt-name"><TextInput id="bt-name" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={!!errors.name} placeholder="e.g. Dropside" /></Field>
          <Field label="Standard build time (days)" required error={errors.buildDays} hint="Added to the delivery ETA when a vehicle is sent for this body" htmlFor="bt-days">
            <TextInput id="bt-days" type="number" min={1} max={180} value={form.buildDays} onChange={(e) => setForm({ ...form, buildDays: e.target.value })} onWheel={(e) => e.currentTarget.blur()} error={!!errors.buildDays} />
          </Field>
          <Field label="Description" htmlFor="bt-desc"><TextArea id="bt-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="flex gap-3"><SecondaryButton className="flex-1" onClick={() => setEdit(null)}>Cancel</SecondaryButton><PrimaryButton className="flex-1" onClick={save}>{edit?.id ? "Save changes" : "Add"}</PrimaryButton></div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!remove}
        danger
        onClose={() => setRemove(null)}
        onConfirm={() => {
          setTypes((list) => list.filter((t) => t.id !== remove!.id));
          setBuilders((list) => list.map((b) => ({ ...b, bodyTypeIds: b.bodyTypeIds.filter((id) => id !== remove!.id) })));
          previewToast(`Body type ${remove!.name} deleted`);
          setRemove(null);
        }}
        title="Delete body type"
        confirmLabel="Delete"
        message={remove && <>Delete <span className="font-semibold text-[#333]">{remove.name}</span>?{usedBy(remove) ? ` It is removed from ${usedBy(remove)} body builder(s).` : ""}</>}
      />
    </>
  );
}

// ── Body Building Job ────────────────────────────────────────────────────────
const RETURN_CHECKS = [
  "Body fitted to the agreed specification",
  "Mountings, welds and fixings secure",
  "Paint and finish free of damage",
  "Lights, reflectors and electrics working",
  "VIN plate and chassis number untouched",
  "Body builder's certificate / documents received",
];

export function BodyBuildingJob() {
  const [params, setParams] = useSearchParams();
  const [jobs] = useJobs();
  const job = jobs.find((j) => j.id === params.get("job"));
  return job
    ? <JobDetail key={job.id} job={job} onBack={() => setParams({}, { replace: true })} />
    : <JobList onOpen={(id) => setParams({ job: id })} />;
}

function JobList({ onOpen }: { onOpen: (id: string) => void }) {
  const navigate = useNavigate();
  const data = useSalesData();
  const [jobs] = useJobs();
  const [builders] = useBuilders();
  const [types] = useTypes();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("Open");
  const [creating, setCreating] = useState(false);

  const builderName = (id: string) => builders.find((b) => b.id === id)?.name ?? "—";
  const typeOf = (id: string) => types.find((t) => t.id === id);
  const customerOf = (j: BodyJob) => customerById(dealById(j.dealId)?.customerId)?.name ?? "—";
  const rows = jobs
    .filter((j) => status === "All" || (status === "Open" ? j.status !== "Completed" : status === "Overdue" ? isOverdue(j) : j.status === status))
    .filter((j) => [j.id, j.stockNo, j.dealId, customerOf(j), builderName(j.builderId), typeOf(j.bodyTypeId)?.name].join(" ").toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.id.localeCompare(a.id));

  const atBuilder = jobs.filter((j) => ["Sent", "In progress", "Rework"].includes(j.status));
  const columns: Column<BodyJob>[] = [
    { key: "id", header: "Job no.", render: (j) => <span className="font-medium text-[#ff4f31]">{j.id}</span>, sortValue: (j) => j.id },
    { key: "vehicle", header: "Vehicle", render: (j) => (<div><p>{stockByNo(j.stockNo)?.model ?? "—"}</p><p className="text-[11px] text-[#999]">{j.stockNo} · {j.dealId}</p></div>) },
    { key: "customer", header: "Customer", render: customerOf },
    { key: "builder", header: "Body builder / type", render: (j) => (<div><p>{builderName(j.builderId)}</p><p className="text-[11px] text-[#999]">{typeOf(j.bodyTypeId)?.name}</p></div>) },
    { key: "sent", header: "Sent", render: (j) => fmtDate(j.sentOn), sortValue: (j) => j.sentOn },
    { key: "return", header: "Expected back", render: (j) => (<div><p>{fmtDate(j.returnedOn ?? j.expectedReturn)}</p>{isOverdue(j) ? <p className="text-[11px] text-[#FE2B73]">Overdue {daysBetween(j.expectedReturn, today())} day(s)</p> : j.returnedOn ? <p className="text-[11px] text-[#999]">Returned</p> : null}</div>), sortValue: (j) => j.expectedReturn },
    { key: "eta", header: "Delivery ETA", render: (j) => fmtDate(deliveryEta(j)), sortValue: (j) => deliveryEta(j) },
    { key: "status", header: "Status", render: (j) => <StatusBadge status={j.status} tone={JOB_TONE[j.status]} /> },
    { key: "act", header: "", align: "right", render: (j) => <SmallButton onClick={(e) => { e.stopPropagation(); onOpen(j.id); }}>Open</SmallButton> },
  ];

  return (
    <>
      <PageHeader actions={<PrimaryButton icon={Send} onClick={() => setCreating(true)}>Send vehicle to body builder</PrimaryButton>} />
      <PdiAppSyncNotice />
      <KpiGrid>
        <KpiCard label="At body builder" value={atBuilder.length} icon={Truck} />
        <KpiCard label="Overdue" value={jobs.filter(isOverdue).length} tone={jobs.some(isOverdue) ? "down" : undefined} hint="Past the expected return date" icon={AlertTriangle} />
        <KpiCard label="Back, awaiting check" value={jobs.filter((j) => j.status === "Returned").length} icon={ClipboardCheck} />
        <KpiCard label="Completed" value={jobs.filter((j) => j.status === "Completed").length} hint="Released to PDI / handover" icon={CircleCheck} />
      </KpiGrid>
      <Card>
        <Toolbar>
          <SearchInput value={q} onChange={setQ} placeholder="Search job, stock no., sales order, customer or builder" />
          <FilterSelect label="Status" value={status} onChange={setStatus} options={["Open", "Overdue", "Sent", "In progress", "Returned", "Rework", "Completed", "All"]} />
        </Toolbar>
        <DataTable columns={columns} rows={rows} rowKey={(j) => j.id} onRowClick={(j) => onOpen(j.id)}
          empty={jobs.length === 0
            ? <EmptyState icon={Hammer} title="No body building jobs yet" message={data.deals.length ? "Send a sold vehicle to a body builder to start tracking it." : "A job is raised for a sold vehicle — create a sales order first."}
                action={data.deals.length ? undefined : <SmallButton variant="primary" onClick={() => navigate(screenPath("sales-order", "sale-details"))}>Sale Details</SmallButton>} />
            : <EmptyState icon={Hammer} title="No jobs match" message="Change the search or status filter." />} />
      </Card>
      {creating && <NewJobModal onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); onOpen(id); }} />}
    </>
  );
}

function NewJobModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const navigate = useNavigate();
  const data = useSalesData();
  const [jobs, setJobs] = useJobs();
  const [builders] = useBuilders();
  const [types] = useTypes();
  const [form, setForm] = useState({ dealId: "", builderId: "", bodyTypeId: "", sentOn: today(), expectedReturn: "", note: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sold vehicles: live sales orders whose unit is not already with a body builder.
  const deals = data.deals.filter((d) => !["Cancelled", "Cancellation requested", "Delivered"].includes(d.status) && !jobs.some((j) => j.stockNo === d.stockNo && j.status !== "Completed"));
  const activeBuilders = builders.filter((b) => b.active);
  const builder = builders.find((b) => b.id === form.builderId);
  const typeOptions = types.filter((t) => builder?.bodyTypeIds.includes(t.id));
  const type = types.find((t) => t.id === form.bodyTypeId);
  const deal = dealById(form.dealId);
  const vehicle = stockByNo(deal?.stockNo);
  const suggested = type && form.sentOn ? addDays(form.sentOn, type.buildDays) : "";
  const expected = form.expectedReturn || suggested;

  const set = (patch: Partial<typeof form>) => { setForm((f) => ({ ...f, ...patch })); setErrors({}); };

  const create = async () => {
    const e: Record<string, string> = {};
    if (!form.dealId) e.dealId = "Select the sales order";
    if (!form.builderId) e.builderId = "Select the body builder";
    if (!form.bodyTypeId) e.bodyTypeId = "Select the body type";
    if (!form.sentOn) e.sentOn = "Enter the date sent";
    else if (form.sentOn > today()) e.sentOn = "The send date cannot be in the future";
    if (!expected) e.expectedReturn = "Enter the expected return date";
    else if (form.sentOn && expected < form.sentOn) e.expectedReturn = "Expected return must be on or after the send date";
    setErrors(e);
    if (Object.keys(e).length || !deal) return;
    const id = await salesStore.nextNumber("BB");
    const job: BodyJob = {
      id, dealId: deal.id, stockNo: deal.stockNo, builderId: form.builderId, bodyTypeId: form.bodyTypeId, sentOn: form.sentOn, expectedReturn: expected, status: "Sent",
      updates: [{ at: new Date().toISOString(), status: "Sent", note: form.note.trim() || `Sent to ${builder?.name} for ${type?.name}`, by: userById(deal.repId)?.name ?? "You" }],
    };
    setJobs((list) => [job, ...list]);
    logActivity(job, `${deal.stockNo} sent to ${builder?.name} for ${type?.name}; expected back ${fmtDate(expected)}, delivery ETA ${fmtDate(deliveryEta(job))}`);
    previewToast(`Body building job ${id} created`);
    onCreated(id);
  };

  const missing = deals.length === 0 ? "sales" : activeBuilders.length === 0 ? "builders" : null;

  return (
    <Modal isOpen onClose={onClose} title="Send vehicle to body builder" size="md">
      {missing ? (
        <div className="space-y-4">
          <Notice tone="warning" title={missing === "sales" ? "No sold vehicle available" : "No active body builder"}>
            {missing === "sales" ? "A body building job is raised for a vehicle on a live sales order that is not already at a body builder." : "Add a body builder (and its body types) in the masters first."}
          </Notice>
          <PrimaryButton className="w-full!" onClick={() => navigate(missing === "sales" ? screenPath("sales-order", "sale-details") : screenPath("body-building", "body-builders"))}>
            {missing === "sales" ? "Go to Sale Details" : "Go to Body Builder Master"}
          </PrimaryButton>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="Sales order (sold vehicle)" required error={errors.dealId} htmlFor="bj-deal">
            <SelectInput id="bj-deal" value={form.dealId} onChange={(e) => set({ dealId: e.target.value })} placeholder="Select sales order" error={!!errors.dealId}
              options={deals.map((d) => ({ value: d.id, label: `${d.id} — ${customerById(d.customerId)?.name ?? "Unknown"} · ${d.stockNo} ${stockByNo(d.stockNo)?.model ?? ""}` }))} />
          </Field>
          {vehicle && <KeyValueGrid items={[{ label: "VIN", value: <span className="font-mono text-[12px]">{vehicle.vin}</span> }, { label: "Colour", value: vehicle.colour }, { label: "Branch", value: vehicle.branch }]} />}
          <FormGrid>
            <Field label="Body builder" required error={errors.builderId} htmlFor="bj-builder">
              <SelectInput id="bj-builder" value={form.builderId} onChange={(e) => set({ builderId: e.target.value, bodyTypeId: "", expectedReturn: "" })} placeholder="Select body builder" error={!!errors.builderId}
                options={activeBuilders.map((b) => ({ value: b.id, label: b.name }))} />
            </Field>
            <Field label="Body type" required error={errors.bodyTypeId} hint={builder ? undefined : "Pick the builder first"} htmlFor="bj-type">
              <SelectInput id="bj-type" value={form.bodyTypeId} disabled={!builder} onChange={(e) => set({ bodyTypeId: e.target.value, expectedReturn: "" })} placeholder="Select body type" error={!!errors.bodyTypeId}
                options={typeOptions.map((t) => ({ value: t.id, label: `${t.name} (${t.buildDays} days)` }))} />
            </Field>
            <Field label="Date sent" required error={errors.sentOn} htmlFor="bj-sent">
              <TextInput id="bj-sent" type="date" max={today()} value={form.sentOn} onChange={(e) => set({ sentOn: e.target.value, expectedReturn: "" })} error={!!errors.sentOn} />
            </Field>
            <Field label="Expected return" required error={errors.expectedReturn} hint={suggested ? `Standard build time gives ${fmtDate(suggested)}` : undefined} htmlFor="bj-return">
              <TextInput id="bj-return" type="date" min={form.sentOn} value={expected} onChange={(e) => set({ expectedReturn: e.target.value })} error={!!errors.expectedReturn} />
            </Field>
          </FormGrid>
          <Field label="Note to body builder" htmlFor="bj-note"><TextArea id="bj-note" value={form.note} onChange={(e) => set({ note: e.target.value })} placeholder="Spec details, e.g. body length or colour" /></Field>
          {expected && (
            <Notice tone="info" title={`Revised delivery ETA: ${fmtDate(addDays(expected, PDI_BUFFER_DAYS))}`}>
              Expected return {fmtDate(expected)} + {PDI_BUFFER_DAYS} days for PDI and handover. Give the customer this date, not the original one.
            </Notice>
          )}
          <div className="flex gap-3"><SecondaryButton className="flex-1" onClick={onClose}>Cancel</SecondaryButton><PrimaryButton className="flex-1" icon={Send} onClick={create}>Create job</PrimaryButton></div>
        </div>
      )}
    </Modal>
  );
}

const STEPS: BodyJobStatus[] = ["Sent", "In progress", "Returned", "Completed"];

function JobDetail({ job, onBack }: { job: BodyJob; onBack: () => void }) {
  const navigate = useNavigate();
  const [, setJobs] = useJobs();
  const [builders] = useBuilders();
  const [types] = useTypes();
  const builder = builders.find((b) => b.id === job.builderId);
  const type = types.find((t) => t.id === job.bodyTypeId);
  const deal = dealById(job.dealId);
  const customer = customerById(deal?.customerId);
  const vehicle = stockByNo(job.stockNo);
  const [update, setUpdate] = useState<null | "progress" | "returned">(null);
  const [form, setForm] = useState({ note: "", expectedReturn: job.expectedReturn, returnedOn: today() });
  const [formError, setFormError] = useState("");
  const [checks, setChecks] = useState<Record<string, "pass" | "fail">>({});
  const [checkNotes, setCheckNotes] = useState("");
  const [confirmCheck, setConfirmCheck] = useState(false);

  const stepIndex = job.status === "Rework" ? 1 : STEPS.indexOf(job.status);
  const allChecked = RETURN_CHECKS.every((c) => checks[c]);
  const checkPassed = RETURN_CHECKS.every((c) => checks[c] === "pass");

  const patch = (next: Partial<BodyJob>, status: BodyJobStatus, note: string) => {
    setJobs((list) => list.map((j) => (j.id === job.id ? { ...j, ...next, status, updates: [...j.updates, { at: new Date().toISOString(), status, note, by: "You" }] } : j)));
    logActivity(job, `${job.id}: ${note}`);
  };

  const saveUpdate = () => {
    if (update === "progress") {
      if (!form.note.trim() && form.expectedReturn === job.expectedReturn) return setFormError("Add a note or change the expected return date");
      if (form.expectedReturn < job.sentOn) return setFormError("Expected return cannot be before the send date");
      const moved = form.expectedReturn !== job.expectedReturn;
      const note = [form.note.trim(), moved ? `Expected return moved to ${fmtDate(form.expectedReturn)} (delivery ETA ${fmtDate(addDays(form.expectedReturn, PDI_BUFFER_DAYS))})` : ""].filter(Boolean).join(" · ");
      patch({ expectedReturn: form.expectedReturn }, job.status === "Sent" ? "In progress" : job.status, note);
      previewToast(moved ? "Expected return updated — tell the customer the new delivery ETA" : "Progress update saved");
    } else if (update === "returned") {
      if (!form.returnedOn) return setFormError("Enter the return date");
      if (form.returnedOn < job.sentOn) return setFormError("Return date cannot be before the send date");
      if (form.returnedOn > today()) return setFormError("Return date cannot be in the future");
      patch({ returnedOn: form.returnedOn, returnCheck: undefined }, "Returned", `Vehicle back from ${builder?.name} on ${fmtDate(form.returnedOn)}${form.note.trim() ? ` · ${form.note.trim()}` : ""}`);
      setChecks({});
      previewToast("Vehicle marked as returned — complete the return check");
    }
    setUpdate(null);
  };

  const finishCheck = () => {
    const failed = RETURN_CHECKS.filter((c) => checks[c] === "fail");
    const returnCheck = { items: checks, notes: checkNotes.trim(), at: new Date().toISOString(), passed: checkPassed };
    if (checkPassed) {
      patch({ returnCheck }, "Completed", `Return check passed${checkNotes.trim() ? ` · ${checkNotes.trim()}` : ""} — released to PDI / handover`);
      previewToast(`${job.id} completed — vehicle released to PDI`);
    } else {
      patch({ returnCheck, returnedOn: undefined }, "Rework", `Return check failed (${failed.join("; ")}) — sent back to ${builder?.name}`);
      previewToast("Return check failed — job sent back for rework");
    }
    setConfirmCheck(false);
    setChecks({});
    setCheckNotes("");
  };

  const icons: Record<BodyJobStatus, typeof Send> = { Sent: Send, "In progress": Wrench, Returned: Undo2, Rework: RefreshCw, Completed: CircleCheck };

  return (
    <>
      <PageHeader actions={<SmallButton icon={ArrowLeft} onClick={onBack}>All jobs</SmallButton>} />
      <PdiAppSyncNotice />
      {job.status === "Completed" ? (
        <Notice tone="success" title="Body building completed" className="mb-5" action={<SmallButton variant="primary" onClick={() => navigate(`${screenPath("handover", "pre-delivery-check")}?stock=${job.stockNo}`)}>Go to PDI</SmallButton>}>
          The return check passed. The vehicle can go through invoicing, PDI and handover.
        </Notice>
      ) : (
        <Notice tone={isOverdue(job) ? "danger" : "warning"} title={isOverdue(job) ? `Overdue — expected back ${fmtDate(job.expectedReturn)}` : "Vehicle not released yet"} className="mb-5">
          PDI, gate pass and handover stay locked until the vehicle is back and passes the return check.
        </Notice>
      )}

      <Card className="mb-5">
        <ol className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STEPS.map((s, i) => {
            const label = i === 1 && job.status === "Rework" ? "Rework" : s;
            const done = i < stepIndex || job.status === "Completed";
            const current = i === stepIndex && job.status !== "Completed";
            return (
              <li key={s} className="flex items-center gap-2">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-green-100 text-green-700" : current ? "bg-amber-100 text-amber-700" : "bg-[#f3f3f3] text-[#999]"}`}>
                  {done ? <CircleCheck size={14} /> : current ? <Clock size={14} /> : i + 1}
                </span>
                <span className={`text-[12px] ${done || current ? "text-[#333]" : "text-[#999]"}`}>{label}</span>
              </li>
            );
          })}
        </ol>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-5">
          <Card title={`${job.id} · ${vehicle?.model ?? job.stockNo}`} icon={Hammer} actions={<StatusBadge status={job.status} tone={JOB_TONE[job.status]} />}>
            <KeyValueGrid items={[
              { label: "Stock no.", value: job.stockNo },
              { label: "VIN", value: <span className="font-mono text-[12px]">{vehicle?.vin ?? "—"}</span> },
              { label: "Sales order", value: <button type="button" className="text-[#ff4f31] hover:underline cursor-pointer" onClick={() => navigate(`${screenPath("sales-order", "sale-details")}?deal=${job.dealId}`)}>{job.dealId}</button> },
              { label: "Customer", value: customer?.name ?? "—" },
              { label: "Body builder", value: builder ? `${builder.name}${builder.phone ? ` · ${builder.phone}` : ""}` : "—" },
              { label: "Body type", value: type ? `${type.name} (${type.buildDays} days standard)` : "—" },
              { label: "Sent", value: fmtDate(job.sentOn) },
              { label: job.returnedOn ? "Returned" : "Expected back", value: fmtDate(job.returnedOn ?? job.expectedReturn) },
              { label: "Revised delivery ETA", value: <span className="font-semibold text-[#333]">{fmtDate(deliveryEta(job))}</span> },
            ]} />
          </Card>

          {job.status === "Returned" && (
            <Card title="Return check" icon={ClipboardCheck} subtitle="Inspect the vehicle before it is released to PDI">
              <ul className="divide-y divide-[#f3f3f3]">
                {RETURN_CHECKS.map((c) => (
                  <li key={c} className="flex items-center justify-between gap-3 py-2">
                    <span className="text-[13px] text-[#444]">{c}</span>
                    <div className="flex gap-1.5 shrink-0">
                      <SmallButton variant={checks[c] === "pass" ? "primary" : "outline"} onClick={() => setChecks((x) => ({ ...x, [c]: "pass" }))}>Pass</SmallButton>
                      <SmallButton variant={checks[c] === "fail" ? "danger" : "outline"} onClick={() => setChecks((x) => ({ ...x, [c]: "fail" }))}>Fail</SmallButton>
                    </div>
                  </li>
                ))}
              </ul>
              <Field label="Notes" className="mt-3" htmlFor="bj-check-notes"><TextArea id="bj-check-notes" value={checkNotes} onChange={(e) => setCheckNotes(e.target.value)} placeholder="Anything found on return" /></Field>
              <PrimaryButton className="w-full! mt-4" disabled={!allChecked} onClick={() => setConfirmCheck(true)}>
                {!allChecked ? `${RETURN_CHECKS.filter((c) => !checks[c]).length} item(s) to check` : checkPassed ? "Pass and release vehicle" : "Fail and send back for rework"}
              </PrimaryButton>
            </Card>
          )}

          <Card title="Progress" icon={Clock}>
            <Timeline items={[...job.updates].reverse().map((u, i) => ({
              id: `${u.at}-${i}`, icon: icons[u.status], tone: JOB_TONE[u.status],
              title: u.status, meta: `${new Date(u.at).toLocaleString("en-GB")} · ${u.by}`, body: u.note,
            }))} />
          </Card>
        </div>

        <div className="space-y-5 lg:sticky lg:top-0">
          <Card title="Actions">
            <div className="space-y-2">
              {(job.status === "Sent" || job.status === "In progress" || job.status === "Rework") && (
                <>
                  <SecondaryButton className="w-full" icon={RefreshCw} onClick={() => { setForm({ note: "", expectedReturn: job.expectedReturn, returnedOn: today() }); setFormError(""); setUpdate("progress"); }}>
                    {job.status === "Sent" ? "Mark build started" : "Add progress update"}
                  </SecondaryButton>
                  <PrimaryButton className="w-full!" icon={Undo2} onClick={() => { setForm({ note: "", expectedReturn: job.expectedReturn, returnedOn: today() }); setFormError(""); setUpdate("returned"); }}>Vehicle returned</PrimaryButton>
                </>
              )}
              {job.status === "Returned" && <p className="text-[12px] text-[#666]">Complete the return check to release the vehicle.</p>}
              {job.status === "Completed" && <p className="text-[12px] text-[#666]">Nothing left to do on this job.</p>}
            </div>
          </Card>
          {job.returnCheck && (
            <Card title="Last return check">
              <Badge tone={job.returnCheck.passed ? "green" : "red"}>{job.returnCheck.passed ? "Passed" : "Failed"}</Badge>
              <p className="text-[11px] text-[#999] mt-1">{new Date(job.returnCheck.at).toLocaleString("en-GB")}</p>
              {!job.returnCheck.passed && <ul className="mt-2 text-[12px] text-[#FE2B73] list-disc pl-4">{Object.entries(job.returnCheck.items).filter(([, v]) => v === "fail").map(([k]) => <li key={k}>{k}</li>)}</ul>}
              {job.returnCheck.notes && <p className="text-[12px] text-[#555] mt-2">{job.returnCheck.notes}</p>}
            </Card>
          )}
          <Card title="PDI app">
            <p className="text-[12px] text-[#666] flex items-start gap-1.5"><Link2 size={14} className="shrink-0 mt-0.5" /> PDI app sync not connected yet. When it is, status and dates are shared both ways.</p>
          </Card>
        </div>
      </div>

      <Modal isOpen={!!update} onClose={() => setUpdate(null)} title={update === "returned" ? "Vehicle returned" : job.status === "Sent" ? "Mark build started" : "Progress update"} size="sm">
        <div className="space-y-4">
          {update === "progress" ? (
            <Field label="Expected return" required hint={`Delivery ETA becomes ${fmtDate(addDays(form.expectedReturn || job.expectedReturn, PDI_BUFFER_DAYS))}`} htmlFor="bj-up-return">
              <TextInput id="bj-up-return" type="date" min={job.sentOn} value={form.expectedReturn} onChange={(e) => { setForm({ ...form, expectedReturn: e.target.value }); setFormError(""); }} />
            </Field>
          ) : (
            <Field label="Return date" required htmlFor="bj-up-returned">
              <TextInput id="bj-up-returned" type="date" min={job.sentOn} max={today()} value={form.returnedOn} onChange={(e) => { setForm({ ...form, returnedOn: e.target.value }); setFormError(""); }} />
            </Field>
          )}
          <Field label="Note" error={formError} htmlFor="bj-up-note">
            <TextArea id="bj-up-note" value={form.note} onChange={(e) => { setForm({ ...form, note: e.target.value }); setFormError(""); }} placeholder={update === "returned" ? "Who brought it back, anything noticed" : "e.g. Body mounted, waiting for paint"} />
          </Field>
          <div className="flex gap-3"><SecondaryButton className="flex-1" onClick={() => setUpdate(null)}>Cancel</SecondaryButton><PrimaryButton className="flex-1" onClick={saveUpdate}>Save</PrimaryButton></div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmCheck}
        onClose={() => setConfirmCheck(false)}
        onConfirm={finishCheck}
        danger={!checkPassed}
        title={checkPassed ? "Pass return check" : "Fail return check"}
        confirmLabel={checkPassed ? "Pass and release" : "Send back for rework"}
        message={checkPassed
          ? <>All items passed. Release <span className="font-semibold text-[#333]">{job.stockNo}</span> to PDI and handover?</>
          : <>Some items failed. The job goes back to <span className="font-semibold text-[#333]">{builder?.name}</span> for rework and the vehicle stays locked.</>}
      />
    </>
  );
}
