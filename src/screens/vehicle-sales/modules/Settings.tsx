// Module 12 — Settings. Saved on the server as Vehicle Sales settings
// (data/store.ts) so other screens (e.g. My Sales Score) can use them.

import { useMemo, useState } from "react";
import { Save, Plus, Trash2, ListChecks, Target } from "lucide-react";
import { useCurrency } from "../../../context/CurrencyContext";
import { cn } from "../../../components/utils/cn";
import {
  PageHeader, Card, KpiGrid, KpiCard, Toolbar, FilterSelect, SmallButton,
  PrimaryButton, SecondaryButton, Field, TextInput, SelectInput, Notice, Toggle, Tabs, EmptyState, Badge, ConfirmDialog,
} from "../components/ui";
import { previewToast } from "../components/helpers";
import { EXECUTIVES, BRANCHES } from "../data/mock";
import { usePersistentState } from "../data/store";

// ── Discount Limits ──────────────────────────────────────────────────────────
interface Limit { role: string; maxPct: string; maxAmount: string; approver: string; requireReason: boolean }
const SEED_LIMITS: Limit[] = [
  { role: "Sales Executive", maxPct: "2", maxAmount: "15000", approver: "Sales Manager", requireReason: true },
  { role: "Sales Manager", maxPct: "5", maxAmount: "45000", approver: "Dealer Principal", requireReason: true },
  { role: "F&I Manager", maxPct: "1", maxAmount: "5000", approver: "Sales Manager", requireReason: false },
  { role: "Dealer Principal", maxPct: "10", maxAmount: "100000", approver: "None (final)", requireReason: false },
];

export function DiscountLimits() {
  const { formatCurrency } = useCurrency();
  const [savedLimits, setSavedLimits] = usePersistentState<Limit[]>("settings.discountLimits", SEED_LIMITS);
  const [limits, setLimits] = useState(savedLimits);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [testRole, setTestRole] = useState("Sales Executive");
  const [testAmount, setTestAmount] = useState("20000");

  const update = (i: number, patch: Partial<Limit>) => setLimits((l) => l.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));

  const save = () => {
    const e: Record<string, string> = {};
    limits.forEach((l) => {
      const p = Number(l.maxPct);
      if (l.maxPct === "" || isNaN(p) || p < 0 || p > 25) e[`${l.role}-pct`] = "0–25%";
      if (l.maxAmount === "" || Number(l.maxAmount) < 0) e[`${l.role}-amt`] = "Required";
    });
    setErrors(e);
    if (!Object.keys(e).length) { setSavedLimits(limits); previewToast("Discount limits saved"); }
  };

  const rule = limits.find((l) => l.role === testRole)!;
  const needsApproval = Number(testAmount) > Number(rule.maxAmount);

  return (
    <>
      <PageHeader actions={<PrimaryButton icon={Save} onClick={save}>Save limits</PrimaryButton>} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <Card className="lg:col-span-2" title="Role-wise limits" subtitle="A discount above the role's limit is routed to the approver.">
          <div className="overflow-x-auto border border-[#e5e7eb] rounded-lg">
            <table className="w-full text-[13px] min-w-max">
              <thead className="bg-[#fafafa] text-[#666]"><tr>
                <th className="text-left px-4 py-2.5 font-medium">Role</th>
                <th className="text-left px-4 py-2.5 font-medium">Max % of price</th>
                <th className="text-left px-4 py-2.5 font-medium">Max amount</th>
                <th className="text-left px-4 py-2.5 font-medium">Approver above limit</th>
                <th className="text-center px-4 py-2.5 font-medium">Reason required</th>
              </tr></thead>
              <tbody>
                {limits.map((l, i) => (
                  <tr key={l.role} className="border-t border-[#f0f0f0]">
                    <td className="px-4 py-2.5 font-medium text-[#333]">{l.role}</td>
                    <td className="px-4 py-2.5">
                      <TextInput type="number" aria-label={`${l.role} max percent`} className="w-24 no-spinner" value={l.maxPct} onChange={(e) => update(i, { maxPct: e.target.value })} error={!!errors[`${l.role}-pct`]} />
                      {errors[`${l.role}-pct`] && <p className="text-[11px] text-[#FE2B73] mt-0.5">{errors[`${l.role}-pct`]}</p>}
                    </td>
                    <td className="px-4 py-2.5">
                      <TextInput type="number" aria-label={`${l.role} max amount`} className="w-32 no-spinner" value={l.maxAmount} onChange={(e) => update(i, { maxAmount: e.target.value })} error={!!errors[`${l.role}-amt`]} />
                    </td>
                    <td className="px-4 py-2.5">
                      <SelectInput aria-label={`${l.role} approver`} className="w-44" value={l.approver} onChange={(e) => update(i, { approver: e.target.value })} options={["Sales Manager", "Dealer Principal", "None (final)"]} />
                    </td>
                    <td className="px-4 py-2.5 text-center"><Toggle label={`${l.role} reason required`} checked={l.requireReason} onChange={(v) => update(i, { requireReason: v })} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Test a discount">
          <div className="space-y-3">
            <Field label="Requested by" htmlFor="dl-role"><SelectInput id="dl-role" value={testRole} onChange={(e) => setTestRole(e.target.value)} options={limits.map((l) => l.role)} /></Field>
            <Field label="Discount amount" htmlFor="dl-amt"><TextInput id="dl-amt" type="number" className="no-spinner" value={testAmount} onChange={(e) => setTestAmount(e.target.value)} /></Field>
            <Notice tone={needsApproval ? "warning" : "success"}>
              {needsApproval
                ? <>{formatCurrency(Number(testAmount))} exceeds the {testRole} limit of {formatCurrency(Number(rule.maxAmount))} — needs <span className="font-semibold">{rule.approver}</span> approval.</>
                : <>{formatCurrency(Number(testAmount) || 0)} is within the {testRole} limit — no approval needed.</>}
            </Notice>
          </div>
        </Card>
      </div>
    </>
  );
}

// ── Sales Targets ────────────────────────────────────────────────────────────
interface TargetRow { id: string; units: string; revenue: string; gp: string }
// Previous, current and next two months (YYYY-MM).
const TARGET_MONTHS = Array.from({ length: 4 }, (_, i) => {
  const d = new Date(new Date().getFullYear(), new Date().getMonth() - 1 + i, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
});
const blankTargets = (): TargetRow[] => EXECUTIVES.map((e) => ({ id: e.id, units: "", revenue: "", gp: "" }));

export function SalesTargets() {
  const { formatCurrency } = useCurrency();
  const [month, setMonth] = useState(TARGET_MONTHS[1]);
  const [branch, setBranch] = useState("All branches");
  const [savedTargets, setSavedTargets] = usePersistentState<Record<string, TargetRow[]>>("settings.targets", {});
  const [targets, setTargets] = useState<Record<string, TargetRow[]>>(() => Object.fromEntries(TARGET_MONTHS.map((m) => [m, savedTargets[m] ?? blankTargets()])));
  const [errors, setErrors] = useState<string[]>([]);

  const rows = targets[month].filter((t) => branch === "All branches" || (EXECUTIVES.find((e) => e.id === t.id)?.branch || branch) === branch);
  const update = (id: string, patch: Partial<TargetRow>) => setTargets((all) => ({ ...all, [month]: all[month].map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  const sum = (k: keyof Omit<TargetRow, "id">) => rows.reduce((n, r) => n + (Number(r[k]) || 0), 0);

  const save = () => {
    // Blank rows mean "no target"; a started row needs units and revenue.
    const bad = rows.filter((r) => (r.units || r.revenue || r.gp) && (!Number(r.units) || !Number(r.revenue))).map((r) => r.id);
    setErrors(bad);
    if (!bad.length) { setSavedTargets({ ...savedTargets, [month]: targets[month] }); previewToast(`Targets for ${month} saved`); }
  };

  const branchTotals = useMemo(() => BRANCHES.map((b) => {
    const ids = EXECUTIVES.filter((e) => e.branch === b).map((e) => e.id);
    const t = targets[month].filter((r) => ids.includes(r.id));
    return { branch: b, units: t.reduce((n, r) => n + (Number(r.units) || 0), 0), revenue: t.reduce((n, r) => n + (Number(r.revenue) || 0), 0) };
  }), [targets, month]);

  return (
    <>
      <PageHeader actions={<>
        <SecondaryButton onClick={() => { const prev = TARGET_MONTHS[TARGET_MONTHS.indexOf(month) - 1]; if (prev) { setTargets((a) => ({ ...a, [month]: a[prev].map((r) => ({ ...r })) })); previewToast(`Copied targets from ${prev}`); } }} disabled={month === TARGET_MONTHS[0]}>Copy previous month</SecondaryButton>
        <PrimaryButton icon={Save} onClick={save}>Save targets</PrimaryButton>
      </>} />
      <KpiGrid cols={3}>
        <KpiCard label="Units target" value={sum("units")} icon={Target} />
        <KpiCard label="Revenue target" value={formatCurrency(sum("revenue"))} icon={Target} />
        <KpiCard label="Gross profit target" value={formatCurrency(sum("gp"))} icon={Target} />
      </KpiGrid>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <Card className="lg:col-span-2" title="Targets by executive">
          <Toolbar>
            <FilterSelect label="Month" value={month} onChange={setMonth} options={TARGET_MONTHS.map((m) => ({ value: m, label: new Date(m + "-01").toLocaleDateString("en-GB", { month: "long", year: "numeric" }) }))} />
            <FilterSelect label="Branch" value={branch} onChange={setBranch} options={["All branches", ...BRANCHES]} />
          </Toolbar>
          {errors.length > 0 && <Notice tone="danger" className="mb-3">Enter both units and revenue for each executive you set a target for (leave a row blank for no target).</Notice>}
          <div className="overflow-x-auto border border-[#e5e7eb] rounded-lg">
            <table className="w-full text-[13px] min-w-max">
              <thead className="bg-[#fafafa] text-[#666]"><tr>
                <th className="text-left px-4 py-2.5 font-medium">Executive</th>
                <th className="text-left px-4 py-2.5 font-medium">Branch</th>
                <th className="text-left px-4 py-2.5 font-medium">Units<span className="text-[#FE2B73]">*</span></th>
                <th className="text-left px-4 py-2.5 font-medium">Revenue<span className="text-[#FE2B73]">*</span></th>
                <th className="text-left px-4 py-2.5 font-medium">Gross profit</th>
              </tr></thead>
              <tbody>
                {rows.map((r) => {
                  const e = EXECUTIVES.find((x) => x.id === r.id)!;
                  const err = errors.includes(r.id);
                  return (
                    <tr key={r.id} className="border-t border-[#f0f0f0]">
                      <td className="px-4 py-2.5 font-medium text-[#333]">{e.name}</td>
                      <td className="px-4 py-2.5 text-[#666]">{e.branch}</td>
                      <td className="px-4 py-2.5"><TextInput type="number" aria-label={`${e.name} units`} className="w-20 no-spinner" value={r.units} placeholder="—" error={err && !Number(r.units)} onChange={(ev) => update(r.id, { units: ev.target.value })} /></td>
                      <td className="px-4 py-2.5"><TextInput type="number" aria-label={`${e.name} revenue`} className="w-36 no-spinner" value={r.revenue} placeholder="—" error={err && !Number(r.revenue)} onChange={(ev) => update(r.id, { revenue: ev.target.value })} /></td>
                      <td className="px-4 py-2.5"><TextInput type="number" aria-label={`${e.name} gross profit`} className="w-32 no-spinner" value={r.gp} onChange={(ev) => update(r.id, { gp: ev.target.value })} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Branch totals">
          <ul className="space-y-2">
            {branchTotals.map((b) => (
              <li key={b.branch} className="flex items-center justify-between border border-[#f0f0f0] rounded-lg px-3 py-2 text-[13px]">
                <span className="text-[#333]">{b.branch}</span>
                <span className="text-right"><span className="block text-[#333]">{b.units} units</span><span className="text-[11px] text-[#999]">{formatCurrency(b.revenue)}</span></span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

// ── Checklists ───────────────────────────────────────────────────────────────
interface CheckItem { id: string; category: string; label: string; field: "Pass / Conditional / Fail" | "Yes / No" | "Photo" | "Text" | "Signature"; required: boolean; active: boolean }
type TemplateKey = "receipt" | "delivery";

let seq = 100;
const ci = (category: string, label: string, field: CheckItem["field"], required = true, active = true): CheckItem => ({ id: `ci${seq++}`, category, label, field, required, active });

const SEED_TEMPLATES: Record<TemplateKey, CheckItem[]> = {
  receipt: [
    ci("Documents", "Supplier invoice / delivery note matches PO", "Yes / No"),
    ci("Identification", "VIN matches documents", "Pass / Conditional / Fail"),
    ci("Identification", "Engine number matches documents", "Pass / Conditional / Fail"),
    ci("Exterior", "Paint and panels — transport damage", "Pass / Conditional / Fail"),
    ci("Exterior", "Glass and mirrors", "Pass / Conditional / Fail"),
    ci("Interior", "Trim and upholstery", "Pass / Conditional / Fail"),
    ci("Accessories", "Keys × 2, manuals, spare wheel and tools", "Yes / No"),
    ci("Evidence", "Arrival photos (4 sides)", "Photo"),
    ci("Sign-off", "Receiving inspector signature", "Signature"),
    ci("Exterior", "Underbody inspection", "Pass / Conditional / Fail", false, false),
  ],
  delivery: [
    ci("Walkthrough", "Features & infotainment demonstrated", "Yes / No"),
    ci("Documents", "Invoice, registration and warranty booklet handed over", "Yes / No"),
    ci("Keys & manuals", "Keys × 2 and owner's manual", "Yes / No"),
    ci("Accessories", "Fitted accessories match deal", "Pass / Conditional / Fail"),
    ci("Evidence", "Handover photo with customer", "Photo", false),
    ci("Sign-off", "Customer signature", "Signature"),
    ci("Feedback", "Customer comments", "Text", false),
  ],
};

const FIELD_TYPES: CheckItem["field"][] = ["Pass / Conditional / Fail", "Yes / No", "Photo", "Text", "Signature"];

export function Checklists() {
  const [tab, setTab] = useState<TemplateKey>("receipt");
  const [templates, setTemplates] = usePersistentState("settings.checklists", SEED_TEMPLATES);
  const [templateActive, setTemplateActive] = usePersistentState<Record<TemplateKey, boolean>>("settings.checklistsActive", { receipt: true, delivery: true });
  const [draft, setDraft] = useState({ category: "", label: "", field: FIELD_TYPES[0] as CheckItem["field"], required: true });
  const [draftErrors, setDraftErrors] = useState<{ category?: string; label?: string }>({});
  const [removing, setRemoving] = useState<CheckItem | null>(null);

  const items = templates[tab];
  const categories = Array.from(new Set(items.map((i) => i.category)));
  const update = (id: string, patch: Partial<CheckItem>) => setTemplates((t) => ({ ...t, [tab]: t[tab].map((i) => (i.id === id ? { ...i, ...patch } : i)) }));

  const add = () => {
    const e: typeof draftErrors = {};
    if (!draft.category.trim()) e.category = "Category is required";
    if (!draft.label.trim()) e.label = "Item label is required";
    setDraftErrors(e);
    if (Object.keys(e).length) return;
    const item = { ...ci(draft.category.trim(), draft.label.trim(), draft.field, draft.required), id: `ci-${Date.now()}` };
    setTemplates((t) => ({ ...t, [tab]: [...t[tab], item] }));
    setDraft({ ...draft, label: "" });
    previewToast("Checklist item added");
  };

  return (
    <>
      <PageHeader actions={<PrimaryButton icon={Save} onClick={() => previewToast(`${tab === "receipt" ? "New Vehicle Receipt" : "Delivery"} template saved`)}>Save template</PrimaryButton>} />
      <Tabs<TemplateKey> value={tab} onChange={setTab} tabs={[{ key: "receipt", label: "New Vehicle Receipt", icon: ListChecks }, { key: "delivery", label: "Delivery", icon: ListChecks }]} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <Card
          className="lg:col-span-2"
          title={tab === "receipt" ? "New Vehicle Receipt checklist" : "Delivery checklist"}
          subtitle={`${items.filter((i) => i.active).length} active items · ${categories.length} categories`}
          actions={<div className="flex items-center gap-2 text-[12px] text-[#666]">Template active <Toggle label="Template active" checked={templateActive[tab]} onChange={(v) => setTemplateActive((s) => ({ ...s, [tab]: v }))} /></div>}
        >
          {!templateActive[tab] && <Notice tone="warning" className="mb-3">This template is inactive and would not be offered to inspectors.</Notice>}
          {items.length === 0 ? <EmptyState icon={ListChecks} title="No items yet" message="Add the first checklist item on the right." /> : (
            <div className="space-y-4">
              {categories.map((cat) => (
                <div key={cat}>
                  <p className="text-[12px] font-semibold text-[#999] uppercase tracking-wide mb-1.5">{cat}</p>
                  <ul className="border border-[#e5e7eb] rounded-lg divide-y divide-[#f0f0f0]">
                    {items.filter((i) => i.category === cat).map((i) => (
                      <li key={i.id} className={cn("flex items-center gap-3 px-3 py-2 flex-wrap", !i.active && "bg-[#fafafa]")}>
                        <div className="flex-1 min-w-[180px]">
                          <p className={cn("text-[13px]", i.active ? "text-[#333]" : "text-[#999] line-through")}>{i.label}</p>
                          <p className="text-[11px] text-[#999]">{i.field}</p>
                        </div>
                        <label className="flex items-center gap-1.5 text-[12px] text-[#555] cursor-pointer">
                          <input type="checkbox" className="accent-[#ff4f31]" checked={i.required} onChange={(e) => update(i.id, { required: e.target.checked })} /> Required
                        </label>
                        {i.required ? <Badge tone="brand">Required</Badge> : <Badge tone="gray">Optional</Badge>}
                        <Toggle label={`${i.label} active`} checked={i.active} onChange={(v) => update(i.id, { active: v })} />
                        <SmallButton variant="ghost" icon={Trash2} aria-label={`Remove ${i.label}`} onClick={() => setRemoving(i)} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title="Add item" icon={Plus}>
          <div className="space-y-3">
            <Field label="Category" required error={draftErrors.category} hint="Free text — pick existing or type a new one" htmlFor="cl-cat">
              <TextInput id="cl-cat" list="cl-cats" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} error={!!draftErrors.category} />
              <datalist id="cl-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label="Item label" required error={draftErrors.label} htmlFor="cl-label">
              <TextInput id="cl-label" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} error={!!draftErrors.label} placeholder="e.g. Tyre tread depth" />
            </Field>
            <Field label="Field type" required htmlFor="cl-field">
              <SelectInput id="cl-field" value={draft.field} onChange={(e) => setDraft({ ...draft, field: e.target.value as CheckItem["field"] })} options={FIELD_TYPES} />
            </Field>
            <label className="flex items-center gap-2 text-[13px] text-[#444] cursor-pointer">
              <input type="checkbox" className="accent-[#ff4f31]" checked={draft.required} onChange={(e) => setDraft({ ...draft, required: e.target.checked })} /> Required item
            </label>
            <PrimaryButton className="w-full!" icon={Plus} onClick={add}>Add to checklist</PrimaryButton>
          </div>
        </Card>
      </div>
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={() => { if (removing) setTemplates((t) => ({ ...t, [tab]: t[tab].filter((i) => i.id !== removing.id) })); setRemoving(null); previewToast("Checklist item removed"); }}
        danger
        title="Remove checklist item"
        confirmLabel="Remove"
        message={<>Remove <span className="font-semibold text-[#333]">{removing?.label}</span> from this template?</>}
      />
    </>
  );
}
