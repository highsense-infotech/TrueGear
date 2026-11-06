// Module 10 — Delivery / Handover. Vehicles enter the handover queue when a deal
// is invoiced (Sale Status & Invoice). A vehicle with an open Body Building
// job stays locked until it is back and passes the return check. Progress is saved on the
// server (data/store.ts); no job card or workshop gate-out transaction is created.

import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Wrench, UserCheck, ShieldCheck, Droplets, Check, Lock, Unlock, Ticket, DoorOpen, CircleCheck, KeyRound, ClipboardCheck, Car, Receipt,
} from "lucide-react";
import SignaturePad from "../../../components/common/SignaturePad";
import { cn } from "../../../components/utils/cn";
import { useCurrency } from "../../../context/CurrencyContext";
import {
  PageHeader, Card, KpiGrid, KpiCard, Toolbar, SearchInput, FilterSelect, DataTable, StatusBadge, SmallButton,
  PrimaryButton, Field, TextArea, KeyValueGrid, Notice, EmptyState, Badge, ProgressBar, PhotoSlot, ConfirmDialog,
  SelectInput, type Column,
} from "../components/ui";
import { previewToast } from "../components/helpers";
import { screenPath } from "../registry";
import { ACCESSORIES, FI_PRODUCTS, MAINTENANCE_PLANS, ON_ROAD, PDI_STAGES, BRANCHES, fmtDate } from "../data/mock";
import { EvolveLiveCard } from "../components/evolve";
import { listEvolveReadyForCollection } from "../../../api/vehicleSalesEvolve.api";
import {
  salesStore, useSalesData, usePersistentState, stockByNo, customerById, dealById, openBodyJobFor,
  type Deal, type Handover,
} from "../data/store";

const STAGE_ICONS = [Wrench, UserCheck, ShieldCheck, Droplets];
const stamp = () => new Date().toISOString().slice(0, 16).replace("T", " ");

// Amount the customer owes after trade-in; mirrors the deal maths on the Sale screens.
function amountDue(deal: Deal, vatPct: number) {
  const acc = ACCESSORIES.filter((a) => deal.accessories.includes(a.code)).reduce((n, a) => n + a.price, 0);
  const fi = FI_PRODUCTS.filter((f) => deal.fi.includes(f.code)).reduce((n, f) => n + f.price, 0);
  const plan = MAINTENANCE_PLANS.find((m) => m.code === deal.maintenance)?.price ?? 0;
  const onRoad = ON_ROAD.reduce((n, o) => n + o.price, 0);
  const vehicleNet = deal.vehiclePrice - deal.discount;
  const vat = (vehicleNet + acc + plan) * (vatPct / 100);
  const tradeNet = deal.tradeIn ? deal.tradeIn.value - deal.tradeIn.settlement : 0;
  return vehicleNet + acc + fi + plan + onRoad + vat - tradeNet;
}

type PaymentState = "Paid in full" | "Finance approved" | "Deposit only" | "Not paid";

function paymentState(deal: Deal | undefined, vatPct: number): PaymentState {
  if (!deal) return "Not paid";
  const paid = deal.payments.reduce((n, p) => n + p.amount, 0);
  if (paid >= amountDue(deal, vatPct) - 0.5) return "Paid in full";
  if (deal.financeStatus === "Approved") return "Finance approved";
  return paid > 0 ? "Deposit only" : "Not paid";
}
const paymentOk = (s: PaymentState) => s === "Paid in full" || s === "Finance approved";

const pdiLabel = (h: Handover) => (h.pdiStage >= PDI_STAGES.length ? "Passed" : h.pdiStage === 0 ? "Not started" : "In progress");

function readiness(h: Handover, pay: PaymentState) {
  if (h.gatePass?.redeemed) return "Delivered";
  if (openBodyJobFor(h.stockNo)) return "At body builder";
  if (h.pdiStage < PDI_STAGES.length) return "Awaiting PDI";
  return paymentOk(pay) ? "Ready" : "Not ready";
}

// Active handovers (deal not cancelled), newest first.
function useHandovers() {
  const data = useSalesData();
  return data.handovers.filter((h) => dealById(h.dealId)?.status !== "Cancelled");
}

function NoHandovers() {
  const navigate = useNavigate();
  return (
    <EmptyState icon={Car} title="No vehicles in the handover queue" message="A vehicle joins the queue when its deal is invoiced on Sale Status & Invoice."
      action={<SmallButton variant="primary" icon={Receipt} onClick={() => navigate(screenPath("sales-invoice", "sale-status-invoice"))}>Sale status & invoice</SmallButton>} />
  );
}

function HandoverPicker({ list, value, onChange }: { list: Handover[]; value: string; onChange: (stockNo: string) => void }) {
  return (
    <Card className="mb-5">
      <Field label="Vehicle" htmlFor="ho-pick">
        <SelectInput id="ho-pick" value={value} onChange={(e) => onChange(e.target.value)}
          options={list.map((h) => ({ value: h.stockNo, label: `${h.stockNo} — ${stockByNo(h.stockNo)?.model ?? ""} · ${customerById(dealById(h.dealId)?.customerId)?.name ?? "Unknown"} · PDI ${pdiLabel(h)}` }))} />
      </Field>
    </Card>
  );
}

function useStockParam(list: Handover[], prefer?: (h: Handover) => boolean) {
  const [params, setParams] = useSearchParams();
  const selected = list.find((h) => h.stockNo === params.get("stock")) ?? (prefer && list.find(prefer)) ?? list[0];
  const select = (stockNo: string) => setParams({ stock: stockNo }, { replace: true });
  return [selected, select] as const;
}

function BodyLockNotice({ stockNo }: { stockNo: string }) {
  const navigate = useNavigate();
  const job = openBodyJobFor(stockNo);
  if (!job) return null;
  return (
    <Notice tone="danger" title={`At body builder — job ${job.id} (${job.status})`} className="mb-5"
      action={<SmallButton onClick={() => navigate(`${screenPath("body-building", "body-building-job")}?job=${job.id}`)}>Open job</SmallButton>}>
      PDI and release stay locked until the vehicle is back and passes the body building return check.
    </Notice>
  );
}

// ── Pre-Delivery Check ───────────────────────────────────────────────────────
type ItemState = "pending" | "pass" | "fail";
interface Defect { id: string; item: number; text: string; status: "Open" | "Cleared" }

const PDI_ITEMS = [
  { cat: "Exterior", item: "Paint & panels free of transport damage" },
  { cat: "Exterior", item: "All lights, indicators and hazards" },
  { cat: "Interior", item: "Infotainment, Bluetooth and reverse camera" },
  { cat: "Interior", item: "Seats, belts and airbag warning light" },
  { cat: "Mechanical", item: "Fluid levels topped up" },
  { cat: "Mechanical", item: "Tyre pressures incl. spare" },
  { cat: "Mechanical", item: "Road test — brakes, steering, noises" },
  { cat: "Accessories", item: "Fitted accessories match the deal" },
];

export function PreDeliveryCheck() {
  const navigate = useNavigate();
  const list = useHandovers();
  const [selected, select] = useStockParam(list, (h) => h.pdiStage < PDI_STAGES.length);
  return (
    <>
      <PageHeader actions={<SmallButton onClick={() => navigate(screenPath("handover", "ready-to-hand-over"))}>Ready-to-hand-over list</SmallButton>} />
      {!selected ? <NoHandovers /> : (
        <>
          <HandoverPicker list={list} value={selected.stockNo} onChange={select} />
          <PdiForVehicle key={selected.stockNo} handover={selected} />
        </>
      )}
    </>
  );
}

function PdiForVehicle({ handover }: { handover: Handover }) {
  const navigate = useNavigate();
  const vehicle = stockByNo(handover.stockNo);
  const [pdi, setPdi] = usePersistentState<{ items: ItemState[]; defects: Defect[] }>(`handover.pdi.${handover.stockNo}`, { items: PDI_ITEMS.map(() => "pending"), defects: [] });
  const stage = handover.pdiStage;
  const passed = stage >= PDI_STAGES.length;
  const { items, defects } = pdi;

  const setItem = (i: number, s: ItemState) => {
    setPdi((p) => ({
      items: p.items.map((x, idx) => (idx === i ? s : x)),
      defects: s === "fail" && !p.defects.some((d) => d.item === i && d.status === "Open")
        ? [...p.defects, { id: `D-${i}-${Date.now()}`, item: i, text: PDI_ITEMS[i].item, status: "Open" }]
        : p.defects,
    }));
  };
  const clearDefect = (d: Defect) => {
    setPdi((p) => ({
      items: p.items.map((s, idx) => (idx === d.item ? "pass" : s)),
      defects: p.defects.map((x) => (x.id === d.id ? { ...x, status: "Cleared" } : x)),
    }));
  };

  const allPass = items.every((s) => s === "pass") && defects.every((d) => d.status === "Cleared");
  const atBodyBuilder = !!openBodyJobFor(handover.stockNo);

  const advance = () => {
    if (atBodyBuilder || (stage === 2 && !allPass)) return;
    salesStore.update("handovers", (h) => h.stockNo === handover.stockNo, { pdiStage: stage + 1 });
    previewToast(stage === PDI_STAGES.length - 1 ? "PDI passed" : `${PDI_STAGES[stage]} stage signed off`);
  };

  return (
    <>
      <BodyLockNotice stockNo={handover.stockNo} />
      {passed ? (
        <Notice tone="success" title="PDI passed — handover unlocked" className="mb-5" action={<SmallButton variant="primary" onClick={() => navigate(`${screenPath("handover", "handover-checklist")}?stock=${handover.stockNo}`)}>Start handover</SmallButton>}>
          The vehicle can now proceed to the handover checklist (job card status is not changed).
        </Notice>
      ) : (
        <Notice tone="danger" title="Handover locked" className="mb-5">
          The vehicle cannot be released until the PDI is passed through Technician, Foreman, QC-Out and Washbay.
        </Notice>
      )}

      <Card title={`${handover.stockNo} · ${vehicle?.model ?? ""}`} subtitle={`VIN ${vehicle?.vin ?? "—"} · PDI job card`} className="mb-5">
        <ol className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PDI_STAGES.map((s, i) => {
            const Icon = STAGE_ICONS[i];
            const state = i < stage ? "done" : i === stage ? "current" : "todo";
            return (
              <li key={s} className={cn("rounded-lg border px-3 py-3 flex items-center gap-3", state === "done" ? "border-green-200 bg-green-50" : state === "current" ? "border-[#ff4f31] bg-[#fff6f4]" : "border-[#e5e7eb] bg-white")}>
                <span className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0", state === "done" ? "bg-green-500 text-white" : state === "current" ? "bg-linear-to-b from-[#ff4f31] to-[#fe2b73] text-white" : "bg-[#f3f3f3] text-[#999]")}>
                  {state === "done" ? <Check size={16} /> : <Icon size={16} />}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-[#333]">{i + 1}. {s}</p>
                  <p className="text-[11px] text-[#999]">{state === "done" ? "Signed off" : state === "current" ? "In progress" : "Waiting"}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <Card className="lg:col-span-2" title="PDI inspection checklist" icon={ClipboardCheck}>
          <ul className="divide-y divide-[#f0f0f0]">
            {PDI_ITEMS.map((it, i) => (
              <li key={it.item} className="flex items-center justify-between gap-3 py-2.5 flex-wrap">
                <div className="min-w-0">
                  <p className="text-[13px] text-[#333]">{it.item}</p>
                  <p className="text-[11px] text-[#999]">{it.cat}</p>
                </div>
                <div className="flex gap-1" role="group" aria-label={it.item}>
                  {(["pass", "fail"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={passed}
                      onClick={() => setItem(i, s)}
                      aria-pressed={items[i] === s}
                      className={cn("px-3 py-1 rounded-md text-[12px] border cursor-pointer disabled:cursor-not-allowed",
                        items[i] === s ? (s === "pass" ? "bg-green-500 text-white border-green-500" : "bg-red-500 text-white border-red-500") : "bg-white border-[#e5e7eb] text-[#555] hover:bg-[#f5f5f5]")}
                    >
                      {s === "pass" ? "Pass" : "Fail"}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <div className="space-y-5">
          <Card title="Defects & reinspection">
            {defects.length === 0 ? <p className="text-[12px] text-[#999]">No defects recorded. Failing an item adds one here.</p> : (
              <ul className="space-y-2">
                {defects.map((d) => (
                  <li key={d.id} className="border border-[#f0f0f0] rounded-lg px-3 py-2">
                    <p className="text-[12px] text-[#333]">{d.text}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <StatusBadge status={d.status} tone={d.status === "Cleared" ? "green" : "red"} />
                      {d.status !== "Cleared" && !passed && <SmallButton onClick={() => clearDefect(d)}>Reinspected — clear</SmallButton>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Stage sign-off">
            {passed ? <Badge tone="green"><CircleCheck size={12} /> All stages complete</Badge> : (
              <>
                <p className="text-[12px] text-[#666] mb-3">Current stage: <span className="font-medium text-[#333]">{PDI_STAGES[stage]}</span></p>
                {stage === 2 && !allPass && <Notice tone="warning" className="mb-3">QC-Out needs every item passed and all defects cleared.</Notice>}
                <PrimaryButton className="w-full!" disabled={atBodyBuilder || (stage === 2 && !allPass)} onClick={advance}>Sign off {PDI_STAGES[stage]}</PrimaryButton>
              </>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

// ── Handover Checklist ───────────────────────────────────────────────────────
const BASE_GROUPS = [
  { group: "Vehicle walkthrough", items: ["Exterior walkaround with customer", "Infotainment & phone pairing demonstrated", "Safety features explained", "Service intervals explained"] },
  { group: "Documents", items: ["Tax invoice / OTP copy", "Registration papers (NaTIS)", "Service & warranty booklet", "Finance / insurance documents"] },
  { group: "Keys & manuals", items: ["2 × keys handed over", "Owner's manual", "Spare wheel, jack & tools present"] },
];
const PHOTOS = ["Front 3/4 with customer", "Rear 3/4", "Odometer", "Accessories"];

export function HandoverChecklist() {
  const list = useHandovers();
  const [selected, select] = useStockParam(list, (h) => h.pdiStage >= PDI_STAGES.length && !h.checklistDone);
  return (
    <>
      <PageHeader />
      {!selected ? <NoHandovers /> : (
        <>
          <HandoverPicker list={list} value={selected.stockNo} onChange={select} />
          <ChecklistForVehicle key={selected.stockNo} handover={selected} />
        </>
      )}
    </>
  );
}

function ChecklistForVehicle({ handover }: { handover: Handover }) {
  const navigate = useNavigate();
  const vehicle = stockByNo(handover.stockNo);
  const deal = dealById(handover.dealId);
  const customer = customerById(deal?.customerId);
  const accessories = ACCESSORIES.filter((a) => deal?.accessories.includes(a.code));
  const groups = accessories.length ? [...BASE_GROUPS, { group: "Accessories", items: accessories.map((a) => `${a.name} fitted and checked`) }] : BASE_GROUPS;
  const allItems = groups.flatMap((g) => g.items);
  const [saved, setSaved] = usePersistentState<{ done: string[]; photos: string[]; notes: string }>(`handover.checklist.${handover.stockNo}`, { done: [], photos: [], notes: "" });
  const [signature, setSignature] = useState<string | null>(null);
  const pdiPassed = handover.pdiStage >= PDI_STAGES.length;
  const complete = handover.checklistDone;
  const locked = complete || !pdiPassed || !!openBodyJobFor(handover.stockNo);
  const { done, photos, notes } = saved;

  const total = allItems.length + PHOTOS.length + 1;
  const progress = done.filter((d) => allItems.includes(d)).length + photos.length + (signature || complete ? 1 : 0);
  const ready = progress === total;

  const finish = () => {
    salesStore.update("handovers", (h) => h.stockNo === handover.stockNo, { checklistDone: true });
    previewToast("Handover checklist completed");
  };

  return (
    <>
      <Card className="mb-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <KeyValueGrid cols={4} items={[
            { label: "Vehicle", value: `${handover.stockNo} · ${vehicle?.model ?? ""}` },
            { label: "VIN", value: <span className="font-mono text-[12px]">{vehicle?.vin ?? "—"}</span> },
            { label: "Customer", value: customer?.name ?? "—" },
            { label: "PDI", value: <StatusBadge status={pdiLabel(handover)} /> },
          ]} />
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-[12px] text-[#666] mb-1"><span>Completion</span><span>{progress} / {total}</span></div>
          <ProgressBar value={progress} max={total} tone={ready ? "green" : "brand"} label="Handover completion" />
        </div>
      </Card>

      <BodyLockNotice stockNo={handover.stockNo} />
      {!pdiPassed && (
        <Notice tone="danger" title="PDI not passed" className="mb-5" action={<SmallButton onClick={() => navigate(`${screenPath("handover", "pre-delivery-check")}?stock=${handover.stockNo}`)}>Open PDI</SmallButton>}>
          The checklist unlocks once all four PDI stages are signed off.
        </Notice>
      )}
      {complete && (
        <Notice tone="success" title="Handover checklist completed" className="mb-5" action={<SmallButton variant="primary" onClick={() => navigate(screenPath("handover", "gate-pass"))}>Gate pass</SmallButton>}>
          Saved. Issue the gate pass to release the vehicle.
        </Notice>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-5">
          {groups.map((g) => {
            const n = g.items.filter((i) => done.includes(i)).length;
            return (
              <Card key={g.group} title={g.group} actions={<Badge tone={n === g.items.length ? "green" : "gray"}>{n}/{g.items.length}</Badge>}>
                <ul className="space-y-1.5">
                  {g.items.map((it) => (
                    <li key={it}>
                      <label className="flex items-center gap-2.5 text-[13px] text-[#444] cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 accent-[#ff4f31]" checked={done.includes(it)} disabled={locked}
                          onChange={() => setSaved((s) => ({ ...s, done: s.done.includes(it) ? s.done.filter((x) => x !== it) : [...s.done, it] }))} />
                        <span className={done.includes(it) ? "line-through text-[#999]" : ""}>{it}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
        <div className="space-y-5">
          <Card title="Handover photos" subtitle="Tap to capture (simulated)">
            <div className="grid grid-cols-2 gap-2">
              {PHOTOS.map((p) => (
                <PhotoSlot key={p} label={p} captured={photos.includes(p)} meta={`${vehicle?.branch ?? "Dealership"} · ${new Date().toLocaleDateString("en-GB")}`}
                  onCapture={() => !locked && setSaved((s) => ({ ...s, photos: s.photos.includes(p) ? s.photos.filter((x) => x !== p) : [...s.photos, p] }))} />
              ))}
            </div>
          </Card>
          <Card title="Customer signature" subtitle={customer ? `Signed by ${customer.name}` : undefined}>
            {complete ? <p className="text-[12px] text-[#3aa400]">Signed at handover.</p> : <SignaturePad onChange={setSignature} disabled={locked} />}
          </Card>
          <Card title="Notes">
            <TextArea value={notes} disabled={complete} onChange={(e) => setSaved((s) => ({ ...s, notes: e.target.value }))} placeholder="Anything the customer raised at handover" aria-label="Handover notes" />
          </Card>
          <PrimaryButton className="w-full!" disabled={!ready || locked} onClick={finish}>
            {complete ? "Handover completed" : ready ? "Complete handover" : `${total - progress} item(s) remaining`}
          </PrimaryButton>
        </div>
      </div>
    </>
  );
}

// ── Ready to Hand Over ───────────────────────────────────────────────────────
interface ReadyRow { h: Handover; deal?: Deal; pay: PaymentState; ready: string }

export function ReadyToHandOver() {
  const navigate = useNavigate();
  const { taxConfig } = useCurrency();
  const list = useHandovers();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [branch, setBranch] = useState("All branches");

  const all: ReadyRow[] = list.map((h) => {
    const deal = dealById(h.dealId);
    const pay = paymentState(deal, taxConfig.percentage);
    return { h, deal, pay, ready: readiness(h, pay) };
  });

  const rows = all
    .filter((r) => status === "All" || r.ready === status)
    .filter((r) => branch === "All branches" || stockByNo(r.h.stockNo)?.branch === branch)
    .filter((r) => {
      const v = stockByNo(r.h.stockNo);
      return [r.h.stockNo, v?.vin, r.h.registration, v?.engineNo, customerById(r.deal?.customerId)?.name].join(" ").toLowerCase().includes(q.toLowerCase());
    });

  const columns: Column<ReadyRow>[] = [
    { key: "stock", header: "Stock no.", render: (r) => <span className="font-medium text-[#ff4f31]">{r.h.stockNo}</span>, sortValue: (r) => r.h.stockNo },
    { key: "vehicle", header: "Vehicle", render: (r) => stockByNo(r.h.stockNo)?.model },
    { key: "vin", header: "VIN", render: (r) => <span className="font-mono text-[12px]">{stockByNo(r.h.stockNo)?.vin}</span> },
    { key: "reg", header: "Registration", render: (r) => r.h.registration },
    { key: "customer", header: "Customer", render: (r) => customerById(r.deal?.customerId)?.name ?? "—" },
    { key: "deal", header: "Deal", render: (r) => r.h.dealId },
    { key: "pdi", header: "PDI", render: (r) => <StatusBadge status={pdiLabel(r.h)} tone={r.h.pdiStage === 0 ? "gray" : undefined} /> },
    { key: "pay", header: "Payment", render: (r) => <StatusBadge status={r.pay} tone={paymentOk(r.pay) ? "green" : r.pay === "Deposit only" ? "amber" : "red"} /> },
    { key: "ready", header: "Readiness", render: (r) => <StatusBadge status={r.ready} tone={r.ready === "Delivered" ? "gray" : undefined} /> },
    {
      key: "act", header: "", align: "right",
      render: (r) => r.ready === "Ready"
        ? <SmallButton variant="primary" onClick={(e) => { e.stopPropagation(); navigate(`${screenPath("handover", "handover-checklist")}?stock=${r.h.stockNo}`); }}>Hand over</SmallButton>
        : r.ready === "Not ready"
          ? <SmallButton onClick={(e) => { e.stopPropagation(); navigate(`${screenPath("payment", "customer-payments")}?deal=${r.h.dealId}`); }}>Payments</SmallButton>
          : r.ready === "At body builder"
            ? <SmallButton onClick={(e) => { e.stopPropagation(); navigate(`${screenPath("body-building", "body-building-job")}?job=${openBodyJobFor(r.h.stockNo)?.id ?? ""}`); }}>Body job</SmallButton>
          : r.ready === "Awaiting PDI"
            ? <SmallButton onClick={(e) => { e.stopPropagation(); navigate(`${screenPath("handover", "pre-delivery-check")}?stock=${r.h.stockNo}`); }}>View PDI</SmallButton>
            : null,
    },
  ];

  return (
    <>
      <PageHeader />
      <KpiGrid>
        <KpiCard label="Ready for collection" value={all.filter((r) => r.ready === "Ready").length} icon={CircleCheck} />
        <KpiCard label="Awaiting PDI / body build" value={all.filter((r) => r.ready === "Awaiting PDI" || r.ready === "At body builder").length} icon={Wrench} />
        <KpiCard label="Not ready" value={all.filter((r) => r.ready === "Not ready").length} hint="Payment outstanding" icon={Lock} />
        <KpiCard label="Delivered" value={all.filter((r) => r.ready === "Delivered").length} icon={Car} />
      </KpiGrid>
      {list.length === 0 ? <NoHandovers /> : (
        <Card>
          <Toolbar>
            <SearchInput value={q} onChange={setQ} placeholder="Search stock no., VIN, registration, engine no. or customer" />
            <FilterSelect label="Readiness" value={status} onChange={setStatus} options={["All", "Ready", "At body builder", "Awaiting PDI", "Not ready", "Delivered"]} />
            <FilterSelect label="Branch" value={branch} onChange={setBranch} options={["All branches", ...BRANCHES]} />
          </Toolbar>
          <DataTable columns={columns} rows={rows} rowKey={(r) => r.h.stockNo} empty={<EmptyState icon={Car} title="No vehicles match" message="Change the readiness or branch filter." />} />
        </Card>
      )}
      <EvolveLiveCard className="mt-5" title="Ready for collection in Evolve" icon={Car} api="32 GetAllRFCVehicles" load={() => listEvolveReadyForCollection()}
        empty={(rfc) => rfc.length === 0}>
        {(rfc) => {
          // Match Evolve RFC rows to TrueGear handovers by VIN.
          const byVin = new Map(all.map((r) => [stockByNo(r.h.stockNo)?.vin, r]));
          return (
            <DataTable paginate={false} rows={rfc} rowKey={(v) => v.stockNo || v.vin} columns={[
              { key: "rfc", header: "RFC date", render: (v) => (v.rfcDate ? fmtDate(v.rfcDate) : "—"), sortValue: (v) => v.rfcDate ?? "" },
              { key: "stock", header: "Evolve stock no.", render: (v) => v.stockNo },
              { key: "vin", header: "VIN", render: (v) => <span className="font-mono text-[12px]">{v.vin}</span> },
              { key: "reg", header: "Registration", render: (v) => v.registrationNo || "—" },
              { key: "engine", header: "Engine no.", render: (v) => <span className="font-mono text-[12px]">{v.engineNo || "—"}</span> },
              { key: "tg", header: "In TrueGear", render: (v) => { const r = byVin.get(v.vin); return r ? <StatusBadge status={r.ready} /> : <span className="text-[#bbb]">Not in handover list</span>; } },
            ]} />
          );
        }}
      </EvolveLiveCard>
    </>
  );
}

// ── Gate Pass ────────────────────────────────────────────────────────────────
export function GatePass() {
  const { taxConfig } = useCurrency();
  const list = useHandovers();
  const [action, setAction] = useState<{ type: "issue" | "redeem"; stockNo: string } | null>(null);
  const [guard, setGuard] = useState("");
  const [guardError, setGuardError] = useState("");
  const [filter, setFilter] = useState("All");

  const passStatus = (h: Handover) => (h.gatePass?.redeemed ? "Redeemed" : h.gatePass ? "Issued" : "Not issued");
  const rows = useMemo(() => list.filter((h) => filter === "All" || passStatus(h) === filter), [list, filter]);
  const target = list.find((h) => h.stockNo === action?.stockNo);
  const payOf = (h: Handover) => paymentState(dealById(h.dealId), taxConfig.percentage);

  const apply = async () => {
    if (!action || !target) return;
    if (action.type === "redeem" && !guard) { setGuardError("Select the gate officer"); return; }
    if (action.type === "issue") {
      const no = await salesStore.nextNumber("GP");
      salesStore.update("handovers", (h) => h.stockNo === target.stockNo, { gatePass: { no, issued: stamp() } });
      previewToast(`Gate pass ${no} issued`);
    } else {
      salesStore.update("handovers", (h) => h.stockNo === target.stockNo, (h) => ({ ...h, gatePass: h.gatePass ? { ...h.gatePass, redeemed: stamp() } : h.gatePass }));
      salesStore.update("deals", (d) => d.id === target.dealId, { status: "Delivered" });
      const deal = dealById(target.dealId);
      if (deal) salesStore.add("activities", { id: salesStore.localId("ACT"), customerId: deal.customerId, enquiryId: deal.enquiryId || undefined, type: "Delivery", date: new Date().toISOString(), note: `${target.stockNo} delivered — gate pass ${target.gatePass?.no} redeemed`, by: guard });
      previewToast("Gate pass redeemed — deal marked Delivered");
    }
    setAction(null);
    setGuard("");
  };

  return (
    <>
      <PageHeader />
      <Notice tone="info" className="mb-5">A gate pass can only be issued once any body building is completed, the PDI is passed and the deal is paid in full or finance is approved. This is the Vehicle Sales gate pass — it is not linked to the workshop gate-out yet.</Notice>
      {list.length === 0 ? <NoHandovers /> : (
        <Card>
          <Toolbar>
            <FilterSelect label="Status" value={filter} onChange={setFilter} options={["All", "Not issued", "Issued", "Redeemed"]} />
          </Toolbar>
          <DataTable
            rows={rows}
            rowKey={(h) => h.stockNo}
            empty={<EmptyState icon={Ticket} title="No gate passes match" message="Change the status filter." />}
            columns={[
              { key: "pass", header: "Gate pass no.", render: (h) => h.gatePass ? <span className="font-medium text-[#ff4f31]">{h.gatePass.no}</span> : <span className="text-[#bbb]">—</span> },
              { key: "vehicle", header: "Vehicle", render: (h) => (<div><p>{stockByNo(h.stockNo)?.model}</p><p className="text-[11px] text-[#999]">{h.stockNo}</p></div>) },
              { key: "customer", header: "Customer", render: (h) => customerById(dealById(h.dealId)?.customerId)?.name ?? "—" },
              { key: "pdi", header: "PDI", render: (h) => <StatusBadge status={pdiLabel(h)} tone={h.pdiStage === 0 ? "gray" : undefined} /> },
              { key: "pay", header: "Payment / finance", render: (h) => <StatusBadge status={payOf(h)} tone={paymentOk(payOf(h)) ? "green" : "red"} /> },
              { key: "status", header: "Redemption", render: (h) => (<div><StatusBadge status={passStatus(h)} tone={passStatus(h) === "Not issued" ? "gray" : undefined} />{h.gatePass?.redeemed ? <p className="text-[11px] text-[#999] mt-0.5">Out {h.gatePass.redeemed}</p> : h.gatePass ? <p className="text-[11px] text-[#999] mt-0.5">Issued {h.gatePass.issued}</p> : null}</div>) },
              {
                key: "act", header: "", align: "right",
                render: (h) => {
                  const eligible = paymentOk(payOf(h)) && h.pdiStage >= PDI_STAGES.length && !openBodyJobFor(h.stockNo);
                  return !h.gatePass ? (
                    <span title={eligible ? "" : openBodyJobFor(h.stockNo) ? "Vehicle is still at the body builder" : "Requires a passed PDI and full payment or approved finance"}>
                      <SmallButton variant="primary" icon={eligible ? Ticket : Lock} disabled={!eligible} onClick={() => setAction({ type: "issue", stockNo: h.stockNo })}>Issue</SmallButton>
                    </span>
                  ) : !h.gatePass.redeemed ? (
                    <SmallButton icon={DoorOpen} onClick={() => { setGuardError(""); setAction({ type: "redeem", stockNo: h.stockNo }); }}>Redeem at gate</SmallButton>
                  ) : <Badge tone="green"><Unlock size={12} /> Released</Badge>;
                },
              },
            ]}
          />
        </Card>
      )}
      <ConfirmDialog
        open={!!action}
        onClose={() => setAction(null)}
        onConfirm={apply}
        title={action?.type === "issue" ? "Issue gate pass" : "Redeem gate pass"}
        confirmLabel={action?.type === "issue" ? "Issue pass" : "Redeem"}
        message={target && <>{action?.type === "issue" ? "Issue a gate pass for" : "Record gate-out for"} <span className="font-semibold text-[#333]">{target.stockNo}</span> ({customerById(dealById(target.dealId)?.customerId)?.name ?? "customer"})?</>}
      >
        {action?.type === "redeem" && (
          <Field label="Gate officer" required error={guardError} htmlFor="gp-guard">
            <SelectInput id="gp-guard" value={guard} onChange={(e) => { setGuard(e.target.value); setGuardError(""); }} placeholder="Select officer" options={["Gate 1 — Officer A", "Gate 1 — Officer B", "Gate 2 — Officer C"]} error={!!guardError} />
          </Field>
        )}
        {action?.type === "issue" && <p className="text-[12px] text-[#666] flex items-center gap-1.5"><KeyRound size={12} /> The customer presents this pass at the gate.</p>}
      </ConfirmDialog>
    </>
  );
}
