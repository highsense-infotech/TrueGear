// Module 4 — CRM / Enquiry: sales board and lost deals. Saved on the server via data/store.ts.

import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowUp, ArrowDown, Plus, Pencil, Ban, BadgeCheck, GripVertical, Eye, XCircle, RotateCcw, Megaphone,
  CircleCheck, Kanban, Clock, Trophy, Target, RefreshCw, Save,
} from "lucide-react";
import Modal from "../../../components/common/Modal";
import { useCurrency } from "../../../context/CurrencyContext";
import {
  PageHeader, Card, KpiGrid, KpiCard, Toolbar, SearchInput, FilterSelect, DataTable, StatusBadge, SmallButton,
  PrimaryButton, SecondaryButton, Field, TextInput, SelectInput, TextArea, FormGrid, ConfirmDialog, KeyValueGrid,
  Notice, Toggle, EmptyState, Badge, type Column,
} from "../components/ui";
import { previewToast } from "../components/helpers";
import { screenPath } from "../registry";
import { useLeadScope, useMyEnquiries } from "../access";
import {
  BRANCHES, EXECUTIVES, FRANCHISES, LOST_REASONS, COMPETITORS, CAMPAIGNS, fmtDate, type Enquiry, type EnquiryStatus,
} from "../data/mock";
import {
  salesStore, useSalesData, usePersistentState, customerById, userById, enquiryById, today, type LostDeal,
} from "../data/store";

const cn = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

function logActivity(a: { customerId: string; enquiryId?: string; type: string; note: string }) {
  salesStore.add("activities", { id: salesStore.localId("ACT"), date: new Date().toISOString(), by: "You", ...a });
}

function NoEnquiries({ title = "No enquiries yet", message = "Capture an enquiry first — it appears here straight away." }: { title?: string; message?: string }) {
  const navigate = useNavigate();
  return <EmptyState icon={Kanban} title={title} message={message} action={<PrimaryButton icon={Plus} onClick={() => navigate(screenPath("crm", "add-enquiry"))}>Add Enquiry</PrimaryButton>} />;
}

// ── Sales Board ──────────────────────────────────────────────────────────────
const BOARD_STAGES: EnquiryStatus[] = ["New", "Contacted", "Qualified", "Test Drive", "Quoted", "Negotiation", "Won"];

export function SalesBoard() {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const enquiries = useMyEnquiries();
  const { seesAll } = useLeadScope();
  const [branch, setBranch] = useState("All branches");
  const [owner, setOwner] = useState("All executives");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<EnquiryStatus | null>(null);

  const visible = enquiries.filter((e) =>
    e.status !== "Lost" && (branch === "All branches" || e.branch === branch) && (owner === "All executives" || e.ownerId === owner));

  const move = (id: string, stage: EnquiryStatus) => {
    const current = enquiryById(id);
    if (!current || current.status === stage) return;
    salesStore.update("enquiries", (e) => e.id === id, { status: stage, daysInStage: 0 });
    logActivity({ customerId: current.customerId, enquiryId: id, type: "Stage", note: `Moved from ${current.status} to ${stage}` });
    previewToast(`${id} moved to ${stage}`);
  };

  const won = visible.filter((e) => e.status === "Won");
  const pipelineValue = visible.filter((e) => e.status !== "Won").reduce((n, e) => n + e.value, 0);
  const stuck = visible.filter((e) => e.daysInStage >= 5 && e.status !== "Won").length;

  return (
    <>
      <PageHeader
        actions={
          <>
            <SecondaryButton icon={XCircle} onClick={() => navigate(screenPath("crm", "close-as-lost"))}>Close as lost</SecondaryButton>
            <PrimaryButton icon={Plus} onClick={() => navigate(screenPath("crm", "add-enquiry"))}>Add enquiry</PrimaryButton>
          </>
        }
      />
      <KpiGrid>
        <KpiCard label="Open deals" value={visible.length - won.length} icon={Kanban} />
        <KpiCard label="Pipeline value" value={formatCurrency(pipelineValue)} icon={Target} />
        <KpiCard label="Won" value={`${won.length} · ${formatCurrency(won.reduce((n, e) => n + e.value, 0))}`} icon={Trophy} />
        <KpiCard label="Stuck ≥ 5 days in stage" value={stuck} hint="Follow up today" tone={stuck ? "down" : "neutral"} icon={Clock} />
      </KpiGrid>

      {enquiries.length === 0 ? (
        <NoEnquiries message="The board fills up as you capture enquiries. Add one to see it in the New column." />
      ) : (
        <>
          <Toolbar>
            <FilterSelect label="Branch" value={branch} onChange={setBranch} options={["All branches", ...BRANCHES]} />
            {seesAll && <FilterSelect label="Executive" value={owner} onChange={setOwner} options={[{ value: "All executives", label: "All executives" }, ...EXECUTIVES.map((u) => ({ value: u.id, label: u.name }))]} className="md:w-52" />}
            <p className="text-[12px] text-[#999] md:ml-auto">Drag cards between stages, or use “Move to” on a card. Moves are saved for everyone.</p>
          </Toolbar>

          <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide" role="list" aria-label="Sales funnel stages">
            {BOARD_STAGES.map((stage) => {
              const inStage = visible.filter((e) => e.status === stage);
              const total = inStage.reduce((n, e) => n + e.value, 0);
              return (
                <div
                  key={stage}
                  role="listitem"
                  onDragOver={(e) => { e.preventDefault(); setOverStage(stage); }}
                  onDragLeave={() => setOverStage((s) => (s === stage ? null : s))}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("text/plain") || dragId;
                    if (id) move(id, stage);
                    setDragId(null);
                    setOverStage(null);
                  }}
                  className={cn(
                    "w-[270px] shrink-0 rounded-xl border bg-[#fafafa] flex flex-col max-h-[70vh]",
                    overStage === stage ? "border-[#ff4f31] bg-[#fff6f4]" : "border-[#e5e7eb]",
                  )}
                >
                  <div className="px-3 pt-3 pb-2 border-b border-[#eee]">
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-semibold text-[#333]">{stage}</p>
                      <Badge tone={stage === "Won" ? "green" : "gray"}>{inStage.length}</Badge>
                    </div>
                    <p className="text-[11px] text-[#999] tabular-nums mt-0.5">{formatCurrency(total)}</p>
                  </div>
                  <div className="p-2 space-y-2 overflow-y-auto flex-1 min-h-[120px]">
                    {inStage.length === 0 && <p className="text-[11px] text-[#bbb] text-center py-6">Drop a card here</p>}
                    {inStage.map((e) => {
                      const cust = customerById(e.customerId);
                      return (
                        <article
                          key={e.id}
                          draggable
                          onDragStart={(ev) => { ev.dataTransfer.setData("text/plain", e.id); ev.dataTransfer.effectAllowed = "move"; setDragId(e.id); }}
                          onDragEnd={() => { setDragId(null); setOverStage(null); }}
                          className={cn("bg-white border border-[#e5e7eb] rounded-lg p-2.5 shadow-sm cursor-grab active:cursor-grabbing", dragId === e.id && "opacity-50")}
                        >
                          <div className="flex items-start gap-1.5">
                            <GripVertical size={14} className="text-[#ccc] mt-0.5 shrink-0" aria-hidden />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[11px] font-medium text-[#ff4f31]">{e.id}</span>
                                <StatusBadge status={e.priority} />
                              </div>
                              <p className="text-[13px] font-medium text-[#333] truncate">{cust?.name}</p>
                              <p className="text-[11px] text-[#666] truncate">{e.interest}</p>
                              <p className="text-[12px] text-[#333] tabular-nums mt-1">{formatCurrency(e.value)}</p>
                              <div className="flex items-center justify-between mt-1 text-[11px] text-[#999]">
                                <span>{userById(e.ownerId)?.name}</span>
                                <span className={e.daysInStage >= 5 ? "text-[#e53e3e] font-medium" : ""}>{e.daysInStage}d in stage</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-[#f3f3f3]">
                            <select
                              aria-label={`Move ${e.id} to stage`}
                              value={e.status}
                              onChange={(ev) => move(e.id, ev.target.value as EnquiryStatus)}
                              className="flex-1 min-w-0 text-[11px] border border-[#e5e7eb] rounded-md px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-[#ff4f31]"
                            >
                              {BOARD_STAGES.map((s) => <option key={s} value={s}>Move to: {s}</option>)}
                            </select>
                            <button type="button" title="View enquiry" aria-label={`View ${e.id}`} onClick={() => navigate(`${screenPath("crm", "enquiry-details")}?id=${e.id}`)} className="p-1 rounded hover:bg-[#f3f4f6] text-[#555] cursor-pointer"><Eye size={14} /></button>
                            {e.status !== "Won" && (
                              <button type="button" title="Close as lost" aria-label={`Close ${e.id} as lost`} onClick={() => navigate(`${screenPath("crm", "close-as-lost")}?id=${e.id}`)} className="p-1 rounded hover:bg-[#faedee] text-[#FE306C] cursor-pointer"><XCircle size={14} /></button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

// ── Sales Stages Setup ───────────────────────────────────────────────────────
interface Stage { id: string; name: string; enabled: boolean; probability: number }

const DEFAULT_STAGES: Stage[] = [
  { id: "s1", name: "New", enabled: true, probability: 10 },
  { id: "s2", name: "Contacted", enabled: true, probability: 20 },
  { id: "s3", name: "Qualified", enabled: true, probability: 35 },
  { id: "s4", name: "Test Drive", enabled: true, probability: 50 },
  { id: "s5", name: "Quoted", enabled: true, probability: 65 },
  { id: "s6", name: "Negotiation", enabled: true, probability: 80 },
  { id: "s7", name: "Won", enabled: true, probability: 100 },
];

const initialStagesFor = (f: string): Stage[] =>
  f === "Toyota Commercial"
    ? [...DEFAULT_STAGES.slice(0, 3), { id: "s3b", name: "Fleet Proposal", enabled: true, probability: 45 }, ...DEFAULT_STAGES.slice(3).map((s) => (s.name === "Test Drive" ? { ...s, enabled: false } : s))]
    : f === "Pre-Owned"
      ? DEFAULT_STAGES.map((s) => (s.name === "Qualified" ? { ...s, name: "Finance Pre-check" } : s))
      : DEFAULT_STAGES.map((s) => ({ ...s }));

const DEFAULT_BY_FRANCHISE: Record<string, Stage[]> = Object.fromEntries(FRANCHISES.map((f) => [f, initialStagesFor(f)]));

export function SalesStagesSetup() {
  const [saved, setSaved] = usePersistentState<Record<string, Stage[]>>("salesProgress.stages", DEFAULT_BY_FRANCHISE);
  const [franchise, setFranchise] = useState<string>(FRANCHISES[0]);
  const [byFranchise, setByFranchise] = useState<Record<string, Stage[]>>(saved);
  const [editing, setEditing] = useState<Stage | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [prob, setProb] = useState("50");
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);

  const stages = byFranchise[franchise] ?? initialStagesFor(franchise);
  const update = (next: Stage[]) => { setByFranchise((m) => ({ ...m, [franchise]: next })); setDirty(true); };

  const moveStage = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= stages.length) return;
    const next = [...stages];
    [next[idx], next[j]] = [next[j], next[idx]];
    update(next);
  };

  const openForm = (s: Stage | null) => {
    setEditing(s);
    setAdding(!s);
    setName(s?.name ?? "");
    setProb(String(s?.probability ?? 50));
    setError("");
  };

  const saveForm = () => {
    const n = name.trim();
    const p = Number(prob);
    if (!n) return setError("Stage name is required");
    if (stages.some((s) => s.name.toLowerCase() === n.toLowerCase() && s.id !== editing?.id)) return setError("A stage with this name already exists");
    if (Number.isNaN(p) || p < 0 || p > 100) return setError("Win probability must be between 0 and 100");
    if (editing) update(stages.map((s) => (s.id === editing.id ? { ...s, name: n, probability: p } : s)));
    else {
      const wonIdx = stages.findIndex((s) => s.name === "Won");
      const next = [...stages];
      next.splice(wonIdx >= 0 ? wonIdx : next.length, 0, { id: `new-${Date.now()}`, name: n, enabled: true, probability: p });
      update(next);
    }
    setEditing(null);
    setAdding(false);
  };

  const enabled = stages.filter((s) => s.enabled);

  return (
    <>
      <PageHeader
        actions={
          <>
            <SecondaryButton icon={RefreshCw} onClick={() => { setByFranchise((m) => ({ ...m, [franchise]: initialStagesFor(franchise) })); setDirty(true); }}>Reset to defaults</SecondaryButton>
            <PrimaryButton icon={Save} disabled={!dirty} onClick={() => { setSaved(byFranchise); setDirty(false); previewToast(`Stages for ${franchise} saved`); }}>Save changes</PrimaryButton>
          </>
        }
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <Card
          className="lg:col-span-2"
          title="Pipeline stages"
          subtitle="Order here is the order shown on the Sales Board."
          actions={
            <>
              <FilterSelect label="Franchise" value={franchise} onChange={setFranchise} options={[...FRANCHISES]} className="md:w-48" />
              <SmallButton variant="primary" icon={Plus} onClick={() => openForm(null)}>Add stage</SmallButton>
            </>
          }
        >
          <ol className="space-y-2">
            {stages.map((s, i) => (
              <li key={s.id} className={cn("flex items-center gap-3 border rounded-lg px-3 py-2.5", s.enabled ? "border-[#e5e7eb] bg-white" : "border-dashed border-[#e5e7eb] bg-[#fafafa]")}>
                <span className="w-6 h-6 rounded-full bg-[#f3f3f3] text-[11px] font-semibold text-[#666] flex items-center justify-center shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-[13px] font-medium", s.enabled ? "text-[#333]" : "text-[#999] line-through")}>{s.name}</p>
                  <p className="text-[11px] text-[#999]">Win probability {s.probability}%</p>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" aria-label={`Move ${s.name} up`} disabled={i === 0} onClick={() => moveStage(i, -1)} className="p-1.5 rounded hover:bg-[#f3f4f6] text-[#555] disabled:opacity-30 cursor-pointer"><ArrowUp size={14} /></button>
                  <button type="button" aria-label={`Move ${s.name} down`} disabled={i === stages.length - 1} onClick={() => moveStage(i, 1)} className="p-1.5 rounded hover:bg-[#f3f4f6] text-[#555] disabled:opacity-30 cursor-pointer"><ArrowDown size={14} /></button>
                  <button type="button" aria-label={`Rename ${s.name}`} onClick={() => openForm(s)} className="p-1.5 rounded hover:bg-[#f3f4f6] text-[#555] cursor-pointer"><Pencil size={14} /></button>
                  <Toggle checked={s.enabled} label={`${s.name} enabled`} disabled={s.name === "Won"} onChange={(v) => update(stages.map((x) => (x.id === s.id ? { ...x, enabled: v } : x)))} />
                </div>
              </li>
            ))}
          </ol>
          {dirty && <p className="text-[11px] text-amber-700 mt-3">Unsaved changes.</p>}
        </Card>

        <Card title="Board preview" subtitle={`${franchise} · ${enabled.length} active stages`}>
          <div className="flex flex-wrap items-center gap-1.5">
            {enabled.map((s, i) => (
              <span key={s.id} className="flex items-center gap-1.5">
                <span className="px-2.5 py-1 rounded-md bg-[#fff1ee] text-[#e8432a] text-[12px] font-medium">{s.name}</span>
                {i < enabled.length - 1 && <span className="text-[#ccc]">›</span>}
              </span>
            ))}
          </div>
          <Notice tone="info" className="mt-4">“Won” is fixed as the final stage and cannot be disabled. In this test build the Sales Board always shows the standard enquiry stages; custom stages are stored for review only.</Notice>
        </Card>
      </div>

      <Modal isOpen={adding || !!editing} onClose={() => { setAdding(false); setEditing(null); }} title={editing ? "Rename stage" : "Add stage"} size="sm">
        <div className="space-y-4">
          <Field label="Stage name" required error={error} htmlFor="stage-name">
            <TextInput id="stage-name" autoFocus value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="e.g. Finance Approval" error={!!error} />
          </Field>
          <Field label="Win probability (%)" htmlFor="stage-prob" hint="Used for weighted pipeline value">
            <TextInput id="stage-prob" type="number" min={0} max={100} value={prob} onChange={(e) => setProb(e.target.value)} />
          </Field>
          <div className="flex gap-2 justify-end">
            <SmallButton onClick={() => { setAdding(false); setEditing(null); }}>Cancel</SmallButton>
            <SmallButton variant="primary" onClick={saveForm}>{editing ? "Save" : "Add stage"}</SmallButton>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ── Lost reasons (shared by Close as Lost, Lost Reasons Setup, Lost Enquiries)
interface Reason { id: string; name: string; active: boolean; requiresCompetitor: boolean }

const DEFAULT_REASONS: Reason[] = LOST_REASONS.map((r) => ({ ...r, requiresCompetitor: r.name === "Bought from competitor" || r.name === "Price too high" }));
const useLostReasons = () => usePersistentState<Reason[]>("salesProgress.lostReasons", DEFAULT_REASONS);

// ── Close as Lost ────────────────────────────────────────────────────────────
export function CloseAsLost() {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const [params] = useSearchParams();
  const enquiries = useMyEnquiries();
  const [reasons] = useLostReasons();
  const open = enquiries.filter((e) => e.status !== "Lost" && e.status !== "Won");
  const [enquiryId, setEnquiryId] = useState(open.find((e) => e.id === params.get("id"))?.id ?? "");
  const [reason, setReason] = useState("");
  const [competitor, setCompetitor] = useState("");
  const [competitorPrice, setCompetitorPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [campaign, setCampaign] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState<LostDeal | null>(null);
  const [, setCampaigns] = usePersistentState<Record<string, string>>("salesProgress.lostCampaigns", {});

  const enq = enquiryById(enquiryId);
  const cust = enq ? customerById(enq.customerId) : undefined;
  const needsCompetitor = !!reasons.find((r) => r.name === reason)?.requiresCompetitor;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!enquiryId) e.enquiry = "Select the enquiry to close";
    if (!reason) e.reason = "Select a lost reason";
    if (needsCompetitor && !competitor) e.competitor = "Select the competitor for this reason";
    if (notes.trim().length < 10) e.notes = "Add a short note (at least 10 characters)";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const closeLost = () => {
    if (!enq) return;
    const price = Number(competitorPrice) || 0;
    const deal: LostDeal = { enquiryId: enq.id, reason, competitor: competitor || "Other / Unknown", date: today(), note: notes.trim() + (price ? ` (Competitor price ${formatCurrency(price)})` : "") };
    salesStore.update("enquiries", (e) => e.id === enq.id, { status: "Lost", daysInStage: 0 });
    salesStore.add("lostDeals", deal);
    if (campaign) setCampaigns((m) => ({ ...m, [enq.id]: "Re-engagement" }));
    logActivity({ customerId: enq.customerId, enquiryId: enq.id, type: "Lost", note: `Closed as lost — ${reason}` });
    setConfirm(false);
    setDone(deal);
    previewToast(`${enq.id} closed as lost`);
  };

  if (done) {
    return (
      <>
        <PageHeader />
        <Card>
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3"><XCircle className="w-7 h-7 text-red-600" /></div>
            <p className="text-[16px] font-semibold text-[#333]">{done.enquiryId} closed as lost</p>
            <p className="text-[13px] text-[#666] mt-1">Reason: {done.reason} · Competitor: {done.competitor}{campaign ? " · Added to re-engagement campaign" : ""}. Saved.</p>
            <div className="flex justify-center gap-2 mt-5 flex-wrap">
              <SecondaryButton onClick={() => navigate(screenPath("crm", "sales-board"))}>Back to sales board</SecondaryButton>
              <PrimaryButton onClick={() => navigate(screenPath("crm", "lost-enquiries"))}>View lost enquiries</PrimaryButton>
            </div>
          </div>
        </Card>
      </>
    );
  }

  if (open.length === 0) {
    return (<><PageHeader /><NoEnquiries title="No open enquiries to close" message={enquiries.length ? "Every enquiry is already Won or Lost." : "Capture an enquiry first, then close it as lost here."} /></>);
  }

  return (
    <>
      <PageHeader />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <Card title="Enquiry" className="lg:col-span-1">
          <Field label="Enquiry" required error={errors.enquiry} htmlFor="lost-enq">
            <SelectInput id="lost-enq" value={enquiryId} onChange={(e) => { setEnquiryId(e.target.value); setErrors((x) => ({ ...x, enquiry: "" })); }} error={!!errors.enquiry} placeholder="Select enquiry" options={open.map((e) => ({ value: e.id, label: `${e.id} — ${customerById(e.customerId)?.name}` }))} />
          </Field>
          {enq && (
            <div className="mt-4">
              <KeyValueGrid cols={2} items={[
                { label: "Customer", value: cust?.name },
                { label: "Stage", value: <StatusBadge status={enq.status} /> },
                { label: "Vehicle", value: enq.interest },
                { label: "Deal value", value: formatCurrency(enq.value) },
                { label: "Owner", value: userById(enq.ownerId)?.name },
                { label: "Created", value: fmtDate(enq.created) },
              ]} />
            </div>
          )}
        </Card>

        <Card title="Lost details" className="lg:col-span-2">
          <FormGrid>
            <Field label="Lost reason" required error={errors.reason} htmlFor="lost-reason">
              <SelectInput id="lost-reason" value={reason} onChange={(e) => { setReason(e.target.value); setErrors((x) => ({ ...x, reason: "" })); }} error={!!errors.reason} placeholder="Select reason" options={reasons.filter((r) => r.active).map((r) => r.name)} />
            </Field>
            <Field label="Competitor" required={needsCompetitor} error={errors.competitor} htmlFor="lost-comp">
              <SelectInput id="lost-comp" value={competitor} onChange={(e) => { setCompetitor(e.target.value); setErrors((x) => ({ ...x, competitor: "" })); }} error={!!errors.competitor} placeholder="Select competitor" options={COMPETITORS} />
            </Field>
            <Field label="Competitor price (if known)" htmlFor="lost-price">
              <TextInput id="lost-price" type="number" min={0} value={competitorPrice} onChange={(e) => setCompetitorPrice(e.target.value)} placeholder="0" />
            </Field>
            <Field label="Re-engagement" htmlFor="lost-camp">
              <label className="flex items-center gap-2 text-[13px] text-[#555] mt-2.5">
                <input id="lost-camp" type="checkbox" checked={campaign} onChange={(e) => setCampaign(e.target.checked)} className="accent-[#ff4f31] w-4 h-4" />
                Add customer to a re-engagement campaign
              </label>
            </Field>
            <Field label="Notes" required error={errors.notes} className="md:col-span-2" htmlFor="lost-notes">
              <TextArea id="lost-notes" value={notes} onChange={(e) => { setNotes(e.target.value); setErrors((x) => ({ ...x, notes: "" })); }} placeholder="What happened? What could we have done differently?" />
            </Field>
          </FormGrid>
          <div className="flex justify-end gap-2 mt-5">
            <SecondaryButton onClick={() => navigate(-1)}>Cancel</SecondaryButton>
            <PrimaryButton icon={XCircle} onClick={() => validate() && setConfirm(true)}>Close as lost</PrimaryButton>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={closeLost}
        danger
        title="Close enquiry as lost"
        confirmLabel="Close as lost"
        message={enq && <>Close <span className="font-semibold text-[#333]">{enq.id}</span> ({cust?.name}) as lost because “{reason}”? It will leave the sales board and can be reopened from Lost Enquiries.</>}
      />
    </>
  );
}

// ── Lost Reasons Setup ───────────────────────────────────────────────────────
export function LostReasonsSetup() {
  const { lostDeals } = useSalesData();
  const [rows, setRows] = useLostReasons();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [form, setForm] = useState<{ target: Reason | null; open: boolean }>({ target: null, open: false });
  const [name, setName] = useState("");
  const [reqComp, setReqComp] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<Reason | null>(null);

  const uses = (r: Reason) => lostDeals.filter((d) => d.reason === r.name).length;
  const filtered = rows
    .filter((r) => (status === "all" ? true : status === "active" ? r.active : !r.active))
    .filter((r) => r.name.toLowerCase().includes(q.toLowerCase()));

  const openForm = (r: Reason | null) => { setForm({ target: r, open: true }); setName(r?.name ?? ""); setReqComp(r?.requiresCompetitor ?? false); setError(""); };
  const save = () => {
    const n = name.trim();
    if (!n) return setError("Name is required");
    if (rows.some((r) => r.name.toLowerCase() === n.toLowerCase() && r.id !== form.target?.id)) return setError("This lost reason already exists");
    if (form.target) setRows((list) => list.map((r) => (r.id === form.target!.id ? { ...r, name: n, requiresCompetitor: reqComp } : r)));
    else setRows((list) => [...list, { id: `lr-${Date.now()}`, name: n, active: true, requiresCompetitor: reqComp }]);
    previewToast(form.target ? "Lost reason updated" : "Lost reason added");
    setForm({ target: null, open: false });
  };

  const columns: Column<Reason>[] = [
    { key: "name", header: "Reason", render: (r) => <span className="font-medium text-[#333]">{r.name}</span>, sortValue: (r) => r.name },
    { key: "comp", header: "Competitor required", render: (r) => (r.requiresCompetitor ? "Yes" : "No") },
    { key: "uses", header: "Times used", align: "right", render: (r) => uses(r), sortValue: (r) => uses(r) },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.active ? "Active" : "Inactive"} /> },
    {
      key: "act", header: "Actions", align: "right",
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={() => openForm(r)} title="Edit" aria-label={`Edit ${r.name}`} className="p-1.5 rounded hover:bg-[#f3f4f6] text-[#555] cursor-pointer"><Pencil className="w-4 h-4" /></button>
          <button type="button" onClick={() => setConfirm(r)} title={r.active ? "Deactivate" : "Activate"} aria-label={`${r.active ? "Deactivate" : "Activate"} ${r.name}`} className={`p-1.5 rounded hover:bg-[#f3f4f6] cursor-pointer ${r.active ? "text-[#b45309]" : "text-[#1DB401]"}`}>
            {r.active ? <Ban className="w-4 h-4" /> : <BadgeCheck className="w-4 h-4" />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader actions={<PrimaryButton icon={Plus} onClick={() => openForm(null)}>Add lost reason</PrimaryButton>} />
      <Card>
        <Toolbar>
          <SearchInput value={q} onChange={setQ} placeholder="Search lost reasons" />
          <FilterSelect label="Status" value={status} onChange={setStatus} options={[{ value: "all", label: "All statuses" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
        </Toolbar>
        <DataTable columns={columns} rows={filtered} rowKey={(r) => r.id} empty={<EmptyState title="No lost reasons found" message="Try another search or status." />} />
      </Card>

      <Modal isOpen={form.open} onClose={() => setForm({ target: null, open: false })} title={form.target ? "Edit lost reason" : "Add lost reason"} size="sm">
        <div className="space-y-4">
          <Field label="Name" required error={error} htmlFor="lr-name">
            <TextInput id="lr-name" autoFocus value={name} onChange={(e) => { setName(e.target.value); setError(""); }} error={!!error} placeholder="e.g. Delivery lead time too long" />
          </Field>
          <label className="flex items-center gap-2 text-[13px] text-[#555]">
            <input type="checkbox" checked={reqComp} onChange={(e) => setReqComp(e.target.checked)} className="accent-[#ff4f31] w-4 h-4" />
            Require competitor when this reason is used
          </label>
          <div className="flex gap-2 justify-end">
            <SmallButton onClick={() => setForm({ target: null, open: false })}>Cancel</SmallButton>
            <SmallButton variant="primary" onClick={save}>{form.target ? "Save changes" : "Create"}</SmallButton>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          setRows((list) => list.map((r) => (r.id === confirm!.id ? { ...r, active: !r.active } : r)));
          previewToast(`${confirm!.name} ${confirm!.active ? "deactivated" : "activated"}`);
          setConfirm(null);
        }}
        title={confirm?.active ? "Deactivate lost reason" : "Activate lost reason"}
        confirmLabel={confirm?.active ? "Deactivate" : "Activate"}
        message={confirm && <>{confirm.active ? "Deactivate" : "Activate"} <span className="font-semibold text-[#333]">{confirm.name}</span>? {confirm.active ? "It will no longer appear in Close as Lost." : "It will be selectable again in Close as Lost."}</>}
      />
    </>
  );
}

// ── Lost Enquiries ───────────────────────────────────────────────────────────
interface LostRow extends LostDeal { enquiry: Enquiry; campaign?: string }

export function LostEnquiries() {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const { lostDeals: allLost, activities } = useSalesData();
  const enquiries = useMyEnquiries();
  const lostDeals = useMemo(() => allLost.filter((d) => enquiries.some((e) => e.id === d.enquiryId)), [allLost, enquiries]);
  const [reasons] = useLostReasons();
  const [campaigns, setCampaigns] = usePersistentState<Record<string, string>>("salesProgress.lostCampaigns", {});
  const [q, setQ] = useState("");
  const [reason, setReason] = useState("All reasons");
  const [owner, setOwner] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [reopen, setReopen] = useState<LostRow | null>(null);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [campaign, setCampaign] = useState("");
  const [campaignError, setCampaignError] = useState("");

  const rows = useMemo<LostRow[]>(
    () => lostDeals.flatMap((d) => {
      const enquiry = enquiries.find((e) => e.id === d.enquiryId);
      return enquiry ? [{ ...d, enquiry, campaign: campaigns[d.enquiryId] }] : [];
    }),
    [lostDeals, enquiries, campaigns],
  );

  const keyOf = (r: LostRow) => `${r.enquiry.id}-${r.date}`;
  const filtered = rows
    .filter((r) => reason === "All reasons" || r.reason === reason)
    .filter((r) => owner === "all" || r.enquiry.ownerId === owner)
    .filter((r) => [r.enquiry.id, customerById(r.enquiry.customerId)?.name, r.enquiry.interest, r.competitor].join(" ").toLowerCase().includes(q.toLowerCase()));

  const columns: Column<LostRow>[] = [
    { key: "id", header: "Enquiry", render: (r) => <span className="font-medium text-[#ff4f31]">{r.enquiry.id}</span>, sortValue: (r) => r.enquiry.id },
    { key: "customer", header: "Customer", render: (r) => customerById(r.enquiry.customerId)?.name, sortValue: (r) => customerById(r.enquiry.customerId)?.name ?? "" },
    { key: "vehicle", header: "Vehicle", render: (r) => r.enquiry.interest },
    { key: "value", header: "Value", align: "right", render: (r) => formatCurrency(r.enquiry.value), sortValue: (r) => r.enquiry.value },
    { key: "reason", header: "Lost reason", render: (r) => <div><p>{r.reason}</p>{r.note && <p className="text-[11px] text-[#999] max-w-[240px] truncate" title={r.note}>{r.note}</p>}</div>, sortValue: (r) => r.reason },
    { key: "competitor", header: "Competitor", render: (r) => r.competitor },
    { key: "date", header: "Lost on", render: (r) => fmtDate(r.date), sortValue: (r) => r.date },
    { key: "owner", header: "Owner", render: (r) => userById(r.enquiry.ownerId)?.name },
    { key: "status", header: "Status", render: (r) => (<div className="flex gap-1"><StatusBadge status="Lost" />{r.campaign && <Badge tone="blue"><Megaphone size={11} /> {r.campaign}</Badge>}</div>) },
    {
      key: "act", header: "", align: "right",
      render: (r) => (
        <div className="flex justify-end gap-1.5">
          <SmallButton icon={Eye} onClick={(e) => { e.stopPropagation(); navigate(`${screenPath("crm", "enquiry-details")}?id=${r.enquiry.id}`); }}>View</SmallButton>
          <SmallButton icon={RotateCcw} onClick={(e) => { e.stopPropagation(); setReopen(r); }}>Reopen</SmallButton>
        </div>
      ),
    },
  ];

  const doReopen = () => {
    if (!reopen) return;
    salesStore.update("enquiries", (e) => e.id === reopen.enquiry.id, { status: "Contacted", daysInStage: 0 });
    salesStore.remove("lostDeals", (d) => d.enquiryId === reopen.enquiry.id && d.date === reopen.date);
    logActivity({ customerId: reopen.enquiry.customerId, enquiryId: reopen.enquiry.id, type: "Reopened", note: "Reopened from Lost Enquiries to Contacted" });
    setSelected((s) => s.filter((k) => k !== keyOf(reopen)));
    previewToast(`${reopen.enquiry.id} reopened to Contacted`);
    setReopen(null);
  };

  return (
    <>
      <PageHeader />
      <KpiGrid cols={3}>
        <KpiCard label="Lost enquiries" value={rows.length} icon={XCircle} />
        <KpiCard label="Lost deal value" value={formatCurrency(rows.reduce((n, r) => n + r.enquiry.value, 0))} icon={Target} />
        <KpiCard label="Reopened" value={activities.filter((a) => a.type === "Reopened").length} icon={RotateCcw} />
      </KpiGrid>
      <Card>
        <Toolbar>
          <SearchInput value={q} onChange={setQ} placeholder="Search enquiry, customer, vehicle or competitor" />
          <FilterSelect label="Lost reason" value={reason} onChange={setReason} options={["All reasons", ...reasons.map((r) => r.name)]} className="md:w-56" />
          <FilterSelect label="Owner" value={owner} onChange={setOwner} options={[{ value: "all", label: "All owners" }, ...EXECUTIVES.map((u) => ({ value: u.id, label: u.name }))]} />
          <SmallButton variant="primary" icon={Megaphone} disabled={selected.length === 0} onClick={() => { setCampaign(""); setCampaignError(""); setCampaignOpen(true); }}>
            Add {selected.length || ""} to campaign
          </SmallButton>
        </Toolbar>
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={keyOf}
          selectable
          selected={selected}
          onSelectedChange={setSelected}
          empty={rows.length === 0
            ? <EmptyState icon={CircleCheck} title="No lost enquiries" message="Enquiries you close as lost appear here." action={<SmallButton variant="primary" onClick={() => navigate(screenPath("crm", "close-as-lost"))}>Close an enquiry as lost</SmallButton>} />
            : <EmptyState icon={CircleCheck} title="No lost enquiries match" message="Clear the search or filters." />}
        />
      </Card>

      <ConfirmDialog
        open={!!reopen}
        onClose={() => setReopen(null)}
        onConfirm={doReopen}
        title="Reopen enquiry"
        confirmLabel="Reopen"
        message={reopen && <>Reopen <span className="font-semibold text-[#333]">{reopen.enquiry.id}</span> for {customerById(reopen.enquiry.customerId)?.name}? It returns to the board in the “Contacted” stage, owned by {userById(reopen.enquiry.ownerId)?.name}.</>}
      />

      <Modal isOpen={campaignOpen} onClose={() => setCampaignOpen(false)} title="Add to campaign" size="sm">
        <div className="space-y-4">
          <p className="text-[13px] text-[#666]">{selected.length} customer(s) selected.</p>
          <Field label="Campaign" required error={campaignError} htmlFor="lost-campaign">
            <SelectInput id="lost-campaign" value={campaign} onChange={(e) => { setCampaign(e.target.value); setCampaignError(""); }} error={!!campaignError} placeholder="Select campaign" options={CAMPAIGNS.filter((c) => c !== "None")} />
          </Field>
          <div className="flex gap-2 justify-end">
            <SmallButton onClick={() => setCampaignOpen(false)}>Cancel</SmallButton>
            <SmallButton
              variant="primary"
              onClick={() => {
                if (!campaign) return setCampaignError("Choose a campaign");
                const ids = rows.filter((r) => selected.includes(keyOf(r))).map((r) => r.enquiry.id);
                setCampaigns((m) => ({ ...m, ...Object.fromEntries(ids.map((id) => [id, campaign])) }));
                previewToast(`${selected.length} customer(s) added to ${campaign}`);
                setSelected([]);
                setCampaignOpen(false);
              }}
            >
              Add to campaign
            </SmallButton>
          </div>
          <button type="button" onClick={() => navigate(screenPath("crm", "offers"))} className="text-[12px] text-[#0061FF] hover:underline cursor-pointer">Manage campaigns in Offers & Promotions →</button>
        </div>
      </Modal>
    </>
  );
}
