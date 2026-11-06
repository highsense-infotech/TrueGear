// Module 11 — Reports. Figures are computed in the browser from the Vehicle
// Sales records loaded from the server (data/store.ts). Two live Evolve reads sit alongside:
// 17 VehicleSalesSummary on the Sales Dashboard and 01 AccountSummary on
// Customer Balances (29, the full ageing list, still fails on live).

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Car, TrendingUp, Coins, Clock, Inbox, Gauge, FileText, CalendarCheck, Trophy, Target, Check,
  Download, FileSpreadsheet, FileDown, Wallet, Percent, Users, Timer, Lock, BarChart3,
} from "lucide-react";
import { useCurrency } from "../../../context/CurrencyContext";
import {
  PageHeader, Card, KpiGrid, KpiCard, Toolbar, FilterSelect, DataTable, StatusBadge, SmallButton, Tabs,
  ConfirmDialog, Notice, ProgressBar, Badge, SearchInput, EmptyState, type Column,
} from "../components/ui";
import { previewToast } from "../components/helpers";
import { EvolveLiveCard } from "../components/evolve";
import { getEvolveAccountSummary, getEvolveSalesSummary } from "../../../api/vehicleSalesEvolve.api";
import { BarList, ColumnChart, StackedBar, Funnel, ChartLegend, SERIES } from "../components/charts";
import { screenPath } from "../registry";
import {
  BRANCHES, EXECUTIVES, MODEL_CODES, ACCESSORIES, FI_PRODUCTS, MAINTENANCE_PLANS, ON_ROAD, type EnquiryStatus,
} from "../data/mock";
import { useSalesData, usePersistentState, userById, type Deal, type SalesData } from "../data/store";

// ── date ranges ──────────────────────────────────────────────────────────────
const PERIODS = ["This month", "Last month", "Quarter", "YTD", "All time"] as const;
type Period = (typeof PERIODS)[number];
const BRANCH_OPTIONS = ["All branches", ...BRANCHES];

const pad = (n: number) => String(n).padStart(2, "0");
const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function periodRange(p: Period): [string, string] {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const endOf = (mm: number) => isoDay(new Date(y, mm + 1, 0));
  switch (p) {
    case "This month": return [isoDay(new Date(y, m, 1)), endOf(m)];
    case "Last month": return [isoDay(new Date(y, m - 1, 1)), endOf(m - 1)];
    case "Quarter": return [isoDay(new Date(y, m - 2, 1)), endOf(m)];
    case "YTD": return [`${y}-01-01`, endOf(m)];
    default: return ["0000-01-01", "9999-12-31"];
  }
}

const ALL_TIME = periodRange("All time");

const inRange = (date: string | undefined, [from, to]: [string, string]) => !!date && date.slice(0, 10) >= from && date.slice(0, 10) <= to;
const daysBetween = (a: string, b: string) => Math.round((new Date(b.slice(0, 10)).getTime() - new Date(a.slice(0, 10)).getTime()) / 86400000);

// Last six calendar months (oldest first) as YYYY-MM keys + short labels.
function lastSixMonths() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return { key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`, label: d.toLocaleDateString("en-GB", { month: "short" }) };
  });
}

// ── deal maths (excl. VAT, same GP split as the Sale screens) ────────────────
// revenue = vehicle price − discount + accessories + maintenance plan + F&I
// front GP = vehicle price − discount − stock cost
// back GP  = 35% of accessories + 22% of F&I + 18% of maintenance plan
function dealFigures(d: Deal, data: SalesData) {
  const stock = data.stock.find((s) => s.stockNo === d.stockNo);
  const acc = ACCESSORIES.filter((a) => d.accessories.includes(a.code)).reduce((n, a) => n + a.price, 0);
  const fi = FI_PRODUCTS.filter((f) => d.fi.includes(f.code)).reduce((n, f) => n + f.price, 0);
  const plan = MAINTENANCE_PLANS.find((m) => m.code === d.maintenance)?.price ?? 0;
  const vehicleNet = d.vehiclePrice - d.discount;
  const revenue = vehicleNet + acc + plan + fi;
  const frontGp = stock ? vehicleNet - stock.cost : 0;
  const backGp = Math.round(acc * 0.35 + fi * 0.22 + plan * 0.18);
  const enquiry = data.enquiries.find((e) => e.id === d.enquiryId);
  const branch = stock?.branch ?? enquiry?.branch ?? userById(d.repId)?.branch ?? "";
  const category = MODEL_CODES.find((m) => m.code === stock?.modelCode)?.category ?? "Other";
  return { stock, acc, fi, plan, vehicleNet, revenue, frontGp, backGp, gp: frontGp + backGp, branch, category, enquiry };
}

// Total payable incl. VAT and on-the-road costs, as on the invoice.
function dealPayable(d: Deal, data: SalesData, vatPct: number) {
  const f = dealFigures(d, data);
  const onRoad = ON_ROAD.reduce((n, o) => n + o.price, 0);
  const vat = (f.vehicleNet + f.acc + f.plan) * (vatPct / 100);
  const total = f.revenue + onRoad + vat;
  const tradeNet = d.tradeIn ? d.tradeIn.value - d.tradeIn.settlement : 0;
  const paid = d.payments.reduce((n, p) => n + p.amount, 0);
  return { total, balance: Math.max(0, Math.round(total - tradeNet - d.deposit - paid)) };
}

const liveDeals = (data: SalesData) => data.deals.filter((d) => d.status !== "Cancelled");

// ── shared filter state ──────────────────────────────────────────────────────
function useReportFilters() {
  const [period, setPeriod] = useState<Period>("This month");
  const [branch, setBranch] = useState("All branches");
  const range = periodRange(period);
  const branchOk = (b: string | undefined) => branch === "All branches" || b === branch;
  const bar = (
    <Toolbar>
      <FilterSelect label="Date range" value={period} onChange={(v) => setPeriod(v as Period)} options={[...PERIODS]} />
      <FilterSelect label="Branch" value={branch} onChange={setBranch} options={BRANCH_OPTIONS} />
      <span className="text-[12px] text-[#999] md:ml-auto">{period} · {branch}</span>
    </Toolbar>
  );
  return { period, branch, range, branchOk, bar };
}

// Monthly targets saved on Settings › Sales Targets.
interface TargetRow { id: string; units: string; revenue: string; gp: string }
function useTargets() {
  const [targets] = usePersistentState<Record<string, TargetRow[]>>("settings.targets", {});
  // Sum of targets for executives (optional filter) over months inside the range.
  return (range: [string, string], ids?: string[]) => {
    const sum = { units: 0, revenue: 0, gp: 0 };
    Object.entries(targets).forEach(([month, rows]) => {
      if (`${month}-01` < range[0].slice(0, 7) + "-01" || `${month}-01` > range[1]) return;
      rows.filter((r) => !ids || ids.includes(r.id)).forEach((r) => {
        sum.units += Number(r.units) || 0;
        sum.revenue += Number(r.revenue) || 0;
        sum.gp += Number(r.gp) || 0;
      });
    });
    return sum;
  };
}

type View = "chart" | "table";
const VIEW_TABS: { key: View; label: string }[] = [{ key: "chart", label: "Chart" }, { key: "table", label: "Table" }];

function ViewToggle({ value, onChange }: { value: View; onChange: (v: View) => void }) {
  return <Tabs tabs={VIEW_TABS} value={value} onChange={onChange} className="mb-0 md:w-max" />;
}

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
const rMillions = (n: number) => `R${(n / 1_000_000).toFixed(2)}m`;

function NoData({ title, message, to, cta }: { title: string; message: string; to?: string; cta?: string }) {
  const navigate = useNavigate();
  return (
    <EmptyState
      icon={BarChart3}
      title={title}
      message={message}
      action={to && cta ? <SmallButton variant="primary" onClick={() => navigate(to)}>{cta}</SmallButton> : undefined}
    />
  );
}

// ── Sales Dashboard ──────────────────────────────────────────────────────────
export function SalesDashboard() {
  const { formatCurrency } = useCurrency();
  const data = useSalesData();
  const f = useReportFilters();
  const targetsFor = useTargets();
  const [view, setView] = useState<View>("chart");

  const deals = liveDeals(data).map((d) => ({ d, x: dealFigures(d, data) })).filter(({ x }) => f.branchOk(x.branch));
  const inPeriod = deals.filter(({ d }) => inRange(d.created, f.range));
  const units = inPeriod.length;
  const revenue = inPeriod.reduce((n, { x }) => n + x.revenue, 0);
  const gp = inPeriod.reduce((n, { x }) => n + x.gp, 0);
  const execIds = EXECUTIVES.filter((e) => f.branchOk(e.branch)).map((e) => e.id);
  const target = targetsFor(f.range, execIds).revenue;
  const openStock = data.stock.filter((s) => s.status !== "Sold" && f.branchOk(s.branch));
  const avgAge = openStock.length ? Math.round(openStock.reduce((n, s) => n + s.daysInStock, 0) / openStock.length) : 0;
  const enquiries = data.enquiries.filter((e) => inRange(e.created, f.range) && f.branchOk(e.branch));
  const testDrives = data.testDrives.filter((t) => t.status !== "Cancelled" && inRange(t.date, f.range) && f.branchOk(data.stock.find((s) => s.stockNo === t.stockNo)?.branch));
  const quotes = data.quotes.filter((q) => inRange(q.date, f.range) && f.branchOk(data.enquiries.find((e) => e.id === q.enquiryId)?.branch));

  const months = lastSixMonths();
  const monthly = months.map((m) => {
    const value = deals.filter(({ d }) => d.created.slice(0, 7) === m.key).reduce((n, { x }) => n + x.revenue, 0);
    const t = targetsFor([`${m.key}-01`, `${m.key}-31`], execIds).revenue;
    return { label: m.label, value, target: t || undefined };
  });
  const hasMonthly = monthly.some((m) => m.value > 0 || (m.target ?? 0) > 0);

  const categories = Array.from(new Set([...MODEL_CODES.map((m) => m.category), "Other"]))
    .map((c) => ({ label: c, value: inPeriod.filter(({ x }) => x.category === c).length }))
    .filter((c) => c.value > 0);

  return (
    <>
      <PageHeader />
      {f.bar}
      <EvolveSalesThisMonth />
      <KpiGrid>
        <KpiCard label="Units sold" value={units} hint="Deals created in period (not cancelled)" icon={Car} />
        <KpiCard
          label="Revenue vs target"
          value={formatCurrency(revenue)}
          hint={target ? `${pct(revenue, target)}% of ${formatCurrency(target)}` : "No target set in Settings › Sales Targets"}
          tone={target ? (revenue >= target ? "up" : "down") : undefined}
          icon={TrendingUp}
        />
        <KpiCard label="Gross profit / unit" value={formatCurrency(units ? Math.round(gp / units) : 0)} hint="Front + back GP" icon={Coins} />
        <KpiCard label="Average stock age" value={`${avgAge} days`} hint={`${openStock.length} unsold vehicle(s)`} icon={Clock} />
      </KpiGrid>
      <KpiGrid>
        <KpiCard label="Enquiries" value={enquiries.length} icon={Inbox} />
        <KpiCard label="Test drives" value={testDrives.length} icon={Gauge} />
        <KpiCard label="Quotes issued" value={quotes.length} hint="All versions" icon={FileText} />
        <KpiCard label="Bookings (deals)" value={units} icon={CalendarCheck} />
      </KpiGrid>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2" title="Revenue vs target (last 6 months)" actions={hasMonthly ? <ViewToggle value={view} onChange={setView} /> : undefined}>
          {!hasMonthly ? (
            <NoData title="No sales yet" message="Revenue appears here once a deal is created on Sale Details." to={screenPath("sales-order", "sale-details")} cta="Go to Sale Details" />
          ) : view === "chart" ? (
            <>
              <div className="mb-3"><ChartLegend items={[{ label: "Revenue", color: SERIES[0] }, { label: "Target", marker: "line" }]} /></div>
              <ColumnChart data={monthly} format={rMillions} />
            </>
          ) : (
            <DataTable
              paginate={false}
              rows={monthly}
              rowKey={(r) => r.label}
              columns={[
                { key: "label", header: "Month", render: (r) => r.label },
                { key: "value", header: "Revenue", align: "right", render: (r) => formatCurrency(r.value) },
                { key: "target", header: "Target", align: "right", render: (r) => (r.target ? formatCurrency(r.target) : "—") },
                { key: "pct", header: "% of target", align: "right", render: (r) => (r.target ? `${pct(r.value, r.target)}%` : "—") },
              ]}
            />
          )}
        </Card>
        <Card title="Units sold by category">
          {categories.length ? <BarList data={categories} /> : <NoData title="No units sold in this period" message="Change the date range or create a deal." />}
        </Card>
      </div>
    </>
  );
}

// ── Enquiry to Sale Report ───────────────────────────────────────────────────
type Dimension = "Source" | "Campaign" | "Model" | "Branch" | "Executive";
const DIMENSIONS: Dimension[] = ["Source", "Campaign", "Model", "Branch", "Executive"];

const STAGE_RANK: Record<EnquiryStatus, number> = { New: 0, Contacted: 1, Qualified: 2, "Test Drive": 3, Quoted: 4, Negotiation: 5, Won: 6, Lost: -1 };

interface FunnelRow { name: string; enquiries: number; contacted: number; testDrive: number; quoted: number; won: number; contactDays: number | null; closeDays: number | null }

function funnelRows(data: SalesData, dim: Dimension, range: [string, string], branchOk: (b?: string) => boolean): FunnelRow[] {
  const keyOf = (e: SalesData["enquiries"][number]) =>
    dim === "Source" ? e.source
      : dim === "Campaign" ? e.campaign
        : dim === "Model" ? e.interest.split(" ").slice(0, 2).join(" ")
          : dim === "Branch" ? e.branch
            : userById(e.ownerId)?.name ?? "Unassigned";
  const enquiries = data.enquiries.filter((e) => inRange(e.created, range) && branchOk(e.branch));
  const groups = new Map<string, typeof enquiries>();
  enquiries.forEach((e) => groups.set(keyOf(e), [...(groups.get(keyOf(e)) ?? []), e]));
  const avg = (ns: number[]) => (ns.length ? Math.round((ns.reduce((a, b) => a + b, 0) / ns.length) * 10) / 10 : null);

  return Array.from(groups.entries()).map(([name, list]) => {
    const firstContact = list.map((e) => {
      const acts = data.activities.filter((a) => a.enquiryId === e.id).map((a) => a.date).sort();
      return acts[0] ? Math.max(0, daysBetween(e.created, acts[0])) : null;
    }).filter((n): n is number => n !== null);
    const won = list.filter((e) => e.status === "Won" || data.deals.some((d) => d.enquiryId === e.id && d.status !== "Cancelled"));
    const close = won.map((e) => {
      const deal = data.deals.find((d) => d.enquiryId === e.id);
      return deal ? Math.max(0, daysBetween(e.created, deal.created)) : null;
    }).filter((n): n is number => n !== null);
    return {
      name,
      enquiries: list.length,
      contacted: list.filter((e) => STAGE_RANK[e.status] >= 1 || data.activities.some((a) => a.enquiryId === e.id)).length,
      testDrive: list.filter((e) => STAGE_RANK[e.status] >= 3 || data.testDrives.some((t) => t.enquiryId === e.id)).length,
      quoted: list.filter((e) => STAGE_RANK[e.status] >= 4 || data.quotes.some((q) => q.enquiryId === e.id)).length,
      won: won.length,
      contactDays: avg(firstContact),
      closeDays: avg(close),
    };
  });
}

export function EnquiryToSale() {
  const data = useSalesData();
  const f = useReportFilters();
  const [dim, setDim] = useState<Dimension>("Source");
  const rows = funnelRows(data, dim, f.range, f.branchOk);
  const tot = rows.reduce(
    (a, r) => ({ enquiries: a.enquiries + r.enquiries, contacted: a.contacted + r.contacted, testDrive: a.testDrive + r.testDrive, quoted: a.quoted + r.quoted, won: a.won + r.won }),
    { enquiries: 0, contacted: 0, testDrive: 0, quoted: 0, won: 0 },
  );

  const columns: Column<FunnelRow>[] = [
    { key: "name", header: dim, render: (r) => <span className="font-medium text-[#333]">{r.name}</span>, sortValue: (r) => r.name },
    { key: "enquiries", header: "Enquiries", align: "right", render: (r) => r.enquiries, sortValue: (r) => r.enquiries },
    { key: "contacted", header: "Contacted", align: "right", render: (r) => r.contacted, sortValue: (r) => r.contacted },
    { key: "testDrive", header: "Test drive", align: "right", render: (r) => r.testDrive, sortValue: (r) => r.testDrive },
    { key: "quoted", header: "Quoted", align: "right", render: (r) => r.quoted, sortValue: (r) => r.quoted },
    { key: "won", header: "Won", align: "right", render: (r) => r.won, sortValue: (r) => r.won },
    { key: "conv", header: "Conversion", align: "right", render: (r) => `${pct(r.won, r.enquiries)}%`, sortValue: (r) => pct(r.won, r.enquiries) },
    { key: "contactDays", header: "Days to first contact", align: "right", render: (r) => (r.contactDays === null ? "—" : <span className={r.contactDays > 1 ? "text-[#e53e3e]" : ""}>{r.contactDays}</span>), sortValue: (r) => r.contactDays ?? -1 },
    { key: "closeDays", header: "Days to close", align: "right", render: (r) => (r.closeDays === null ? "—" : r.closeDays), sortValue: (r) => r.closeDays ?? -1 },
  ];

  if (!rows.length) {
    return (
      <>
        <PageHeader />
        {f.bar}
        <Card><NoData title="No enquiries in this period" message="Capture an enquiry to see the funnel fill up." to={screenPath("crm", "add-enquiry")} cta="Add enquiry" /></Card>
      </>
    );
  }

  return (
    <>
      <PageHeader />
      {f.bar}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card title="Overall funnel" subtitle="Step conversion shown beside each stage">
          <Funnel stages={[
            { label: "Enquiries", value: tot.enquiries },
            { label: "Contacted", value: tot.contacted },
            { label: "Test drive", value: tot.testDrive },
            { label: "Quoted", value: tot.quoted },
            { label: "Won", value: tot.won },
          ]} />
          <Notice tone="info" className="mt-4">First contact later than 1 day after the enquiry is shown in red. It is measured from the first logged activity.</Notice>
        </Card>
        <Card
          className="xl:col-span-2"
          title={`Drop-off by ${dim.toLowerCase()}`}
          actions={<FilterSelect label="Group by" value={dim} onChange={(v) => setDim(v as Dimension)} options={DIMENSIONS} />}
        >
          <DataTable columns={columns} rows={rows} rowKey={(r) => r.name} dense />
        </Card>
      </div>
    </>
  );
}

// ── Lost Sales Report ────────────────────────────────────────────────────────
type LostGroup = "Reason" | "Competitor" | "Model" | "Branch" | "Executive";
const LOST_GROUPS: LostGroup[] = ["Reason", "Competitor", "Model", "Branch", "Executive"];

export function LostSales() {
  const { formatCurrency } = useCurrency();
  const data = useSalesData();
  const f = useReportFilters();
  const [group, setGroup] = useState<LostGroup>("Reason");
  const [view, setView] = useState<View>("chart");

  const lost = data.lostDeals
    .map((l) => ({ l, e: data.enquiries.find((e) => e.id === l.enquiryId) }))
    .filter(({ l, e }) => inRange(l.date, f.range) && f.branchOk(e?.branch));
  const keyOf = ({ l, e }: (typeof lost)[number]) =>
    group === "Reason" ? l.reason
      : group === "Competitor" ? l.competitor || "Not captured"
        : group === "Model" ? (e?.interest.split(" ").slice(0, 2).join(" ") ?? "Unknown")
          : group === "Branch" ? (e?.branch ?? "Unknown")
            : (userById(e?.ownerId)?.name ?? "Unassigned");
  const map = new Map<string, { value: number; lostValue: number }>();
  lost.forEach((x) => {
    const k = keyOf(x);
    const cur = map.get(k) ?? { value: 0, lostValue: 0 };
    map.set(k, { value: cur.value + 1, lostValue: cur.lostValue + (x.e?.value ?? 0) });
  });
  const rows = Array.from(map.entries()).map(([label, v]) => ({ label, ...v })).sort((a, b) => b.value - a.value);
  const total = lost.length;
  const totalValue = rows.reduce((n, d) => n + d.lostValue, 0);
  const reasons = new Map<string, number>();
  lost.forEach(({ l }) => reasons.set(l.reason, (reasons.get(l.reason) ?? 0) + 1));
  const topReason = Array.from(reasons.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  return (
    <>
      <PageHeader />
      {f.bar}
      <KpiGrid cols={3}>
        <KpiCard label="Lost deals" value={total} icon={Inbox} />
        <KpiCard label="Estimated lost value" value={formatCurrency(totalValue)} hint="Enquiry value" icon={Coins} />
        <KpiCard label="Top reason" value={<span className="text-[16px]">{topReason}</span>} icon={Target} />
      </KpiGrid>
      <Card
        title={`Lost deals by ${group.toLowerCase()}`}
        actions={
          <>
            <FilterSelect label="Group by" value={group} onChange={(v) => setGroup(v as LostGroup)} options={LOST_GROUPS} />
            {rows.length > 0 && <ViewToggle value={view} onChange={setView} />}
          </>
        }
      >
        {!rows.length ? (
          <NoData title="No lost deals in this period" message="Enquiries closed on Close as Lost show up here." to={screenPath("crm", "close-as-lost")} cta="Close as Lost" />
        ) : view === "chart" ? (
          <BarList data={rows.map((d) => ({ label: d.label, value: d.value, sub: formatCurrency(d.lostValue) }))} color={SERIES[1]} />
        ) : (
          <DataTable
            paginate={false}
            rows={rows}
            rowKey={(d) => d.label}
            columns={[
              { key: "label", header: group, render: (d) => d.label },
              { key: "value", header: "Lost deals", align: "right", render: (d) => d.value, sortValue: (d) => d.value },
              { key: "share", header: "Share", align: "right", render: (d) => `${pct(d.value, total)}%` },
              { key: "lostValue", header: "Est. value", align: "right", render: (d) => formatCurrency(d.lostValue), sortValue: (d) => d.lostValue },
            ]}
          />
        )}
      </Card>
    </>
  );
}

// ── per-executive figures (Team Ranking, My Sales Score, Commission) ────────
interface ExecFigures { id: string; name: string; branch: string; units: number; revenue: number; gp: number; leads: number; won: number; conversion: number }

function execFigures(data: SalesData, range: [string, string], branchOk: (b?: string) => boolean): ExecFigures[] {
  return EXECUTIVES.filter((e) => branchOk(e.branch)).map((e) => {
    const deals = liveDeals(data).filter((d) => d.repId === e.id && inRange(d.created, range)).map((d) => dealFigures(d, data));
    const leads = data.enquiries.filter((q) => q.ownerId === e.id && inRange(q.created, range));
    const won = leads.filter((q) => q.status === "Won").length;
    return {
      id: e.id,
      name: e.name,
      branch: e.branch,
      units: deals.length,
      revenue: deals.reduce((n, d) => n + d.revenue, 0),
      gp: deals.reduce((n, d) => n + d.gp, 0),
      leads: leads.length,
      won,
      conversion: pct(won, leads.length),
    };
  });
}

// ── Team Ranking ─────────────────────────────────────────────────────────────
type RankMetric = "units" | "revenue" | "gp" | "conversion";

export function TeamRanking() {
  const { formatCurrency } = useCurrency();
  const data = useSalesData();
  const f = useReportFilters();
  const [metric, setMetric] = useState<RankMetric>("gp");
  const rows = execFigures(data, f.range, f.branchOk).sort((a, b) => b[metric] - a[metric]);
  const hasData = rows.some((r) => r.units > 0 || r.leads > 0);
  const fmt = (n: number) => (metric === "revenue" || metric === "gp" ? formatCurrency(n) : metric === "conversion" ? `${n}%` : String(n));

  return (
    <>
      <PageHeader />
      <div className="mt-5">{f.bar}</div>
      {!hasData ? (
        <Card><NoData title="Nothing to rank yet" message="Assign enquiries to executives and create deals to see the ranking." to={screenPath("crm", "add-enquiry")} cta="Add enquiry" /></Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
          <Card className="xl:col-span-3" title="Ranking" icon={Trophy}>
            <DataTable
              paginate={false}
              rows={rows}
              rowKey={(r) => r.id}
              columns={[
                { key: "rank", header: "#", render: (r) => { const i = rows.indexOf(r); return i === 0 && r[metric] > 0 ? <Badge tone="amber"><Trophy size={12} /> 1</Badge> : i + 1; } },
                { key: "name", header: "Executive", render: (r) => <div><p className="text-[#333] font-medium">{r.name}</p><p className="text-[11px] text-[#999]">{r.branch}</p></div> },
                { key: "units", header: "Units", align: "right", render: (r) => r.units },
                { key: "revenue", header: "Revenue", align: "right", render: (r) => formatCurrency(r.revenue) },
                { key: "gp", header: "Gross profit", align: "right", render: (r) => formatCurrency(r.gp) },
                { key: "leads", header: "Enquiries", align: "right", render: (r) => r.leads },
                { key: "conversion", header: "Conversion", align: "right", render: (r) => `${r.conversion}%` },
              ]}
            />
          </Card>
          <Card
            className="xl:col-span-2"
            title="Compare executives"
            actions={
              <FilterSelect
                label="Metric"
                value={metric}
                onChange={(v) => setMetric(v as RankMetric)}
                options={[{ value: "gp", label: "Gross profit" }, { value: "revenue", label: "Revenue" }, { value: "units", label: "Units" }, { value: "conversion", label: "Conversion" }]}
              />
            }
          >
            <BarList data={rows.map((r) => ({ label: r.name, value: r[metric] }))} format={fmt} />
          </Card>
        </div>
      )}
    </>
  );
}

// ── My Sales Score ───────────────────────────────────────────────────────────
export function MySalesScore() {
  const { formatCurrency } = useCurrency();
  const data = useSalesData();
  const targetsFor = useTargets();
  const [execId, setExecId] = useState(EXECUTIVES[0]?.id ?? "");
  const [period, setPeriod] = useState<Period>("This month");
  const exec = userById(execId);
  const range = periodRange(period);
  const b = execFigures(data, range, () => true).find((r) => r.id === execId);
  const t = targetsFor(range, [execId]);

  const metrics = [
    { label: "Units sold", actual: b?.units ?? 0, target: t.units, fmt: (n: number) => String(n), icon: Car },
    { label: "Revenue", actual: b?.revenue ?? 0, target: t.revenue, fmt: formatCurrency, icon: TrendingUp },
    { label: "Gross profit", actual: b?.gp ?? 0, target: t.gp, fmt: formatCurrency, icon: Coins },
  ];
  const withTarget = metrics.filter((m) => m.target > 0);
  const overall = withTarget.length ? Math.round(withTarget.reduce((n, m) => n + Math.min(100, pct(m.actual, m.target)), 0) / withTarget.length) : null;

  return (
    <>
      <PageHeader />
      <Toolbar>
        <FilterSelect label="Executive" value={execId} onChange={setExecId} options={EXECUTIVES.map((e) => ({ value: e.id, label: e.name }))} className="md:w-56" />
        <FilterSelect label="Date range" value={period} onChange={(v) => setPeriod(v as Period)} options={[...PERIODS]} />
        <span className="text-[12px] text-[#999] md:ml-auto">Executives see only their own score; managers can switch executive.</span>
      </Toolbar>
      {overall === null && (
        <Notice tone="info" className="mb-5" title="No targets set">
          Set monthly targets for {exec?.name} in Settings › Sales Targets to see achievement percentages.
        </Notice>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card title={exec?.name} subtitle={`${exec?.branch} · Evolve rep ${exec?.evolveRep ?? "not linked"}`}>
          <div className="text-center py-4">
            <p className="text-[48px] font-semibold text-[#333] leading-none">{overall === null ? "—" : `${overall}%`}</p>
            <p className="text-[12px] text-[#999] mt-2">Average achievement vs target ({period.toLowerCase()})</p>
            {overall !== null && (
              <>
                <div className="mt-4"><ProgressBar value={overall} label="Overall score" tone={overall >= 90 ? "green" : overall >= 70 ? "amber" : "red"} /></div>
                <div className="mt-3">
                  <StatusBadge status={overall >= 90 ? "On track" : overall >= 70 ? "Needs push" : "Behind"} tone={overall >= 90 ? "green" : overall >= 70 ? "amber" : "red"} />
                </div>
              </>
            )}
            <p className="text-[12px] text-[#666] mt-4">{b?.leads ?? 0} enquiries · {b?.conversion ?? 0}% converted</p>
          </div>
        </Card>
        <Card className="lg:col-span-2" title="Performance vs target">
          <ul className="space-y-5">
            {metrics.map((m) => {
              const p = pct(m.actual, m.target);
              return (
                <li key={m.label}>
                  <div className="flex items-center justify-between gap-3 mb-1.5 text-[13px]">
                    <span className="flex items-center gap-2 text-[#333] font-medium"><m.icon size={15} className="text-[#999]" /> {m.label}</span>
                    <span className="tabular-nums text-[#555]">
                      {m.fmt(m.actual)}{" "}
                      {m.target > 0
                        ? <><span className="text-[#999]">/ {m.fmt(m.target)}</span> <span className={p >= 100 ? "text-[#3aa400]" : "text-[#999]"}>({p}%)</span></>
                        : <span className="text-[#999]">/ no target</span>}
                    </span>
                  </div>
                  <ProgressBar value={m.target > 0 ? p : 0} label={`${m.label} progress`} tone={p >= 100 ? "green" : p >= 75 ? "blue" : "amber"} />
                </li>
              );
            })}
          </ul>
          <p className="text-[11px] text-[#999] mt-5">Units, revenue and GP come from the deals captured for this rep; targets come from Settings › Sales Targets.</p>
        </Card>
      </div>
    </>
  );
}

// ── Commission ───────────────────────────────────────────────────────────────
// Rule set applied below (configuration, not transactional data).
const COMMISSION_RULES = [
  { id: "r1", type: "Per unit", basis: "Any vehicle", rate: "R2 500 per unit", active: true },
  { id: "r2", type: "Per model", basis: "Land Cruiser 79 / Fortuner", rate: "+R1 500 per unit", active: true },
  { id: "r3", type: "GP band", basis: "GP 0 – 6% of revenue", rate: "5% of GP", active: true },
  { id: "r4", type: "GP band", basis: "GP above 6% of revenue", rate: "8% of GP", active: true },
  { id: "r5", type: "Campaign", basis: "Fleet Renewal 2026 / fleet deals", rate: "R4 000 per deal", active: true },
];
const BONUS_MODELS = ["LC79-24-SC", "FTN-24-VX"];

interface CommissionRow { id: string; name: string; units: number; gp: number; unitComm: number; gpComm: number; bonus: number; status: "Pending approval" | "Approved" }

export function Commission() {
  const { formatCurrency } = useCurrency();
  const data = useSalesData();
  const [period, setPeriod] = useState<Period>("This month");
  const range = periodRange(period);
  const [approved, setApproved] = usePersistentState<string[]>("reports.commissionApproved", []);
  const [confirm, setConfirm] = useState<CommissionRow | null>(null);
  const keyOf = (id: string) => `${range[0]}..${range[1]}:${id}`;

  const rows = EXECUTIVES.map((e): CommissionRow => {
    const deals = liveDeals(data).filter((d) => d.repId === e.id && inRange(d.created, range));
    let unitComm = 0;
    let gpComm = 0;
    let bonus = 0;
    let gp = 0;
    deals.forEach((d) => {
      const x = dealFigures(d, data);
      gp += x.gp;
      unitComm += 2500 + (BONUS_MODELS.includes(x.stock?.modelCode ?? "") ? 1500 : 0);
      if (x.gp > 0) gpComm += Math.round(x.gp * (x.gp / (x.revenue || 1) > 0.06 ? 0.08 : 0.05));
      if (d.fleet || x.enquiry?.campaign === "Fleet Renewal 2026") bonus += 4000;
    });
    return { id: e.id, name: e.name, units: deals.length, gp, unitComm, gpComm, bonus, status: approved.includes(keyOf(e.id)) ? "Approved" : "Pending approval" };
  }).filter((r) => r.units > 0);
  const total = rows.reduce((n, r) => n + r.unitComm + r.gpComm + r.bonus, 0);

  return (
    <>
      <PageHeader />
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 mt-5">
        <Card className="xl:col-span-2" title="Commission rules" icon={Percent}>
          <DataTable
            paginate={false}
            dense
            rows={COMMISSION_RULES}
            rowKey={(r) => r.id}
            columns={[
              { key: "type", header: "Rule type", render: (r) => r.type },
              { key: "basis", header: "Applies to", render: (r) => r.basis },
              { key: "rate", header: "Rate", render: (r) => r.rate },
              { key: "active", header: "Status", render: (r) => <StatusBadge status={r.active ? "Active" : "Inactive"} /> },
            ]}
          />
        </Card>
        <Card
          className="xl:col-span-3"
          title="Calculation"
          subtitle={`Total payable: ${formatCurrency(total)}`}
          actions={<FilterSelect label="Date range" value={period} onChange={(v) => setPeriod(v as Period)} options={[...PERIODS]} />}
        >
          {!rows.length ? (
            <NoData title="No deals in this period" message="Commission is calculated once deals are captured for a sales executive." to={screenPath("sales-order", "sale-details")} cta="Go to Sale Details" />
          ) : (
            <DataTable
              paginate={false}
              rows={rows}
              rowKey={(r) => r.id}
              columns={[
                { key: "name", header: "Executive", render: (r) => <span className="font-medium text-[#333]">{r.name}</span> },
                { key: "units", header: "Units", align: "right", render: (r) => r.units },
                { key: "unitComm", header: "Unit comm.", align: "right", render: (r) => formatCurrency(r.unitComm) },
                { key: "gpComm", header: "GP comm.", align: "right", render: (r) => formatCurrency(r.gpComm) },
                { key: "bonus", header: "Campaign", align: "right", render: (r) => formatCurrency(r.bonus) },
                { key: "total", header: "Total", align: "right", render: (r) => <span className="font-semibold">{formatCurrency(r.unitComm + r.gpComm + r.bonus)}</span> },
                { key: "status", header: "Manager approval", render: (r) => <StatusBadge status={r.status} /> },
                {
                  key: "act", header: "", align: "right",
                  render: (r) => r.status === "Approved"
                    ? <span className="text-[11px] text-[#999]">Approved</span>
                    : <SmallButton variant="primary" icon={Check} onClick={() => setConfirm(r)}>Approve</SmallButton>,
                },
              ]}
            />
          )}
        </Card>
      </div>
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm) {
            setApproved((a) => [...a, keyOf(confirm.id)]);
            previewToast(`Commission for ${confirm.name} approved`);
          }
          setConfirm(null);
        }}
        title="Approve commission"
        confirmLabel="Approve"
        message={confirm && <>Approve <span className="font-semibold text-[#333]">{formatCurrency(confirm.unitComm + confirm.gpComm + confirm.bonus)}</span> commission for {confirm.name} ({period.toLowerCase()})?</>}
      />
    </>
  );
}

// ── Customer Balances Due ────────────────────────────────────────────────────
const AGE_BUCKETS = ["Current", "30 days", "60 days", "90 days", "120+ days"] as const;

interface BalanceRow { id: string; name: string; account: string; buckets: number[] }

// Outstanding = invoice total − trade-in equity − deposit − payments, aged by
// the deal date.
function balanceRows(data: SalesData, vatPct: number): BalanceRow[] {
  const today = isoDay(new Date());
  const map = new Map<string, BalanceRow>();
  liveDeals(data).forEach((d) => {
    const { balance } = dealPayable(d, data, vatPct);
    if (balance <= 0) return;
    const c = data.customers.find((x) => x.id === d.customerId);
    const row = map.get(d.customerId) ?? { id: d.customerId, name: c?.name ?? "Unknown customer", account: d.arAccount || c?.arAccount || "—", buckets: [0, 0, 0, 0, 0] };
    const age = daysBetween(d.created, today);
    row.buckets[Math.min(4, Math.max(0, Math.floor(age / 30)))] += balance;
    map.set(d.customerId, row);
  });
  return Array.from(map.values());
}

export function CustomerBalances() {
  const { formatCurrency, taxConfig } = useCurrency();
  const data = useSalesData();
  const [q, setQ] = useState("");
  const [onlyOverdue, setOnlyOverdue] = useState("All accounts");
  const all = useMemo(() => balanceRows(data, taxConfig.percentage), [data, taxConfig.percentage]);
  const rows = all
    .filter((r) => `${r.name} ${r.account}`.toLowerCase().includes(q.toLowerCase()))
    .filter((r) => (onlyOverdue === "All accounts" ? true : r.buckets.slice(1).some((n) => n > 0)));
  const bucketTotals = AGE_BUCKETS.map((label, i) => ({ label, value: rows.reduce((n, r) => n + r.buckets[i], 0) }));
  const total = bucketTotals.reduce((n, b) => n + b.value, 0);
  const overdue = total - bucketTotals[0].value;

  return (
    <>
      <PageHeader />
      <EvolveAccountLookup />

      <div className="mt-5">
        <KpiGrid cols={3}>
          <KpiCard label="Total outstanding" value={formatCurrency(total)} icon={Wallet} />
          <KpiCard label="Overdue (30+ days)" value={formatCurrency(overdue)} tone={overdue > 0 ? "down" : undefined} hint={`${pct(overdue, total)}% of balance`} icon={Timer} />
          <KpiCard label="Accounts with balance" value={rows.length} icon={Users} />
        </KpiGrid>
      </div>

      {total > 0 && (
        <Card title="Ageing summary" className="mb-5">
          <StackedBar data={bucketTotals} format={formatCurrency} />
        </Card>
      )}

      <Card title="Ageing by customer account">
        <Toolbar>
          <SearchInput value={q} onChange={setQ} placeholder="Search customer or AR account" />
          <FilterSelect label="Overdue filter" value={onlyOverdue} onChange={setOnlyOverdue} options={["All accounts", "Overdue only"]} />
        </Toolbar>
        <DataTable
          rows={rows}
          rowKey={(r) => r.id}
          empty={<NoData title="No outstanding balances" message="Balances appear when a deal has an amount still owing after deposit, trade-in and payments." />}
          columns={[
            { key: "name", header: "Customer", render: (r) => <span className="font-medium text-[#333]">{r.name}</span>, sortValue: (r) => r.name },
            { key: "account", header: "AR account", render: (r) => <span className="font-mono text-[12px]">{r.account}</span> },
            ...AGE_BUCKETS.map((label, i) => ({
              key: label,
              header: label,
              align: "right" as const,
              render: (r: BalanceRow) => (r.buckets[i] ? <span className={i >= 3 ? "text-[#e53e3e]" : ""}>{formatCurrency(r.buckets[i])}</span> : <span className="text-[#ccc]">—</span>),
              sortValue: (r: BalanceRow) => r.buckets[i],
            })),
            { key: "total", header: "Balance", align: "right", render: (r) => <span className="font-semibold">{formatCurrency(r.buckets.reduce((a, b) => a + b, 0))}</span>, sortValue: (r) => r.buckets.reduce((a, b) => a + b, 0) },
          ]}
        />
      </Card>
    </>
  );
}

// Units and value sold this month, by Evolve category (17).
function EvolveSalesThisMonth() {
  const { formatCurrency } = useCurrency();
  const to = new Date().toISOString().slice(0, 10);
  const from = `${to.slice(0, 8)}01`;
  return (
    <EvolveLiveCard className="mb-5" title="Sold this month in Evolve" icon={BarChart3} api="17 VehicleSalesSummary" loadKey={from} load={() => getEvolveSalesSummary({ from, to })}>
      {(s) => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
          <KpiGrid cols={2} >
            <KpiCard label="Units sold" value={s.count} icon={Car} />
            <KpiCard label="Value sold" value={formatCurrency(s.value)} icon={Coins} />
          </KpiGrid>
          <div className="md:col-span-2">
            {s.categories.length ? <BarList data={s.categories.map((c) => ({ label: c.category || "—", value: c.value }))} format={formatCurrency} /> : <p className="text-[12px] text-[#999]">No category split returned.</p>}
          </div>
        </div>
      )}
    </EvolveLiveCard>
  );
}

// Balance and ageing for one AR account (01) — the per-account stand-in for 29.
function EvolveAccountLookup() {
  const { formatCurrency } = useCurrency();
  const [input, setInput] = useState("");
  const [account, setAccount] = useState("");
  return (
    <Card className="mt-5" title="Check an account in Evolve" icon={Wallet} subtitle="01 AccountSummary — balance and ageing for one AR account">
      <form className="flex gap-2 flex-wrap" onSubmit={(e) => { e.preventDefault(); setAccount(input.trim()); }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="AR account number" aria-label="AR account number"
          className="flex-1 min-w-48 px-3 py-2 border border-[#e5e7eb] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#ff4f31]" />
        <SmallButton type="submit" variant="primary" disabled={!input.trim()}>Look up</SmallButton>
      </form>
      {account && (
        <EvolveLiveCard key={account} className="mt-4" title={`Account ${account}`} api="01 AccountSummary" autoLoad loadKey={account} load={() => getEvolveAccountSummary(account)}>
          {(a) => (
            <>
              <KpiGrid cols={3}>
                <KpiCard label="Balance" value={formatCurrency(a.balance)} icon={Wallet} />
                <KpiCard label="Credit limit" value={formatCurrency(a.creditLimit)} icon={Coins} />
                <KpiCard label="Credit available" value={formatCurrency(a.creditAvailable)} tone={a.creditAvailable < 0 ? "down" : undefined} icon={Percent} />
              </KpiGrid>
              <StackedBar format={formatCurrency} data={[
                { label: "0–30 days", value: a.ageing.days0to30 },
                { label: "60 days", value: a.ageing.days60 },
                { label: "90 days", value: a.ageing.days90 },
                { label: "120 days", value: a.ageing.days120 },
                { label: "120+ days", value: a.ageing.days120Plus },
              ]} />
              <p className="text-[11px] text-[#999] mt-3">{a.customerName} · last invoice {a.lastInvoice.number || "—"}</p>
            </>
          )}
        </EvolveLiveCard>
      )}
    </Card>
  );
}

// ── Export Reports ───────────────────────────────────────────────────────────
type Format = "CSV" | "Excel" | "PDF";

function downloadCsv(name: string, columns: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = ["# TrueGear Vehicle Sales export", columns.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportReports() {
  const { taxConfig } = useCurrency();
  const data = useSalesData();
  const [formats, setFormats] = useState<Record<string, Format>>({});
  const fmtOf = (id: string) => formats[id] ?? "CSV";

  const reports = useMemo(() => {
    const deals = liveDeals(data).map((d) => ({ d, x: dealFigures(d, data) }));
    const months = Array.from(new Set(deals.map(({ d }) => d.created.slice(0, 7)))).sort();
    return [
      {
        id: "dash", name: "Sales Dashboard summary", desc: "Units, revenue and GP by month",
        columns: ["Month", "Units", "Revenue", "Gross profit"],
        rows: months.map((m) => { const ds = deals.filter(({ d }) => d.created.startsWith(m)); return [m, ds.length, ds.reduce((n, { x }) => n + x.revenue, 0), ds.reduce((n, { x }) => n + x.gp, 0)]; }),
      },
      {
        id: "funnel", name: "Enquiry to Sale", desc: "Funnel by lead source",
        columns: ["Source", "Enquiries", "Contacted", "Test drive", "Quoted", "Won"],
        rows: funnelRows(data, "Source", ALL_TIME, () => true).map((r) => [r.name, r.enquiries, r.contacted, r.testDrive, r.quoted, r.won]),
      },
      {
        id: "lost", name: "Lost Sales", desc: "Every lost deal with reason",
        columns: ["Enquiry", "Date", "Reason", "Competitor", "Note"],
        rows: data.lostDeals.map((l) => [l.enquiryId, l.date, l.reason, l.competitor, l.note]),
      },
      {
        id: "team", name: "Team Ranking", desc: "Units, revenue and GP per executive",
        columns: ["Executive", "Units", "Revenue", "Gross profit", "Enquiries", "Conversion %"],
        rows: execFigures(data, ALL_TIME, () => true).map((e) => [e.name, e.units, e.revenue, e.gp, e.leads, e.conversion]),
      },
      {
        id: "ar", name: "Customer Balances Due", desc: "Ageing per AR account",
        columns: ["Customer", "AR account", ...AGE_BUCKETS],
        rows: balanceRows(data, taxConfig.percentage).map((b) => [b.name, b.account, ...b.buckets]),
      },
    ];
  }, [data, taxConfig.percentage]);

  return (
    <>
      <PageHeader />
      <Notice tone="info" className="mb-5" title="Exports built from Vehicle Sales records">
        CSV files are generated in your browser from the records created in this module. Excel and PDF exports, scheduled exports and
        backend export jobs are planned for Phase 2.
      </Notice>
      <Card title="Available reports">
        <ul className="divide-y divide-[#f0f0f0]">
          {reports.map((r) => {
            const f = fmtOf(r.id);
            return (
              <li key={r.id} className="py-3 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-[#f5f5f5] flex items-center justify-center shrink-0"><FileSpreadsheet size={18} className="text-[#999]" /></div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-[#333]">{r.name}</p>
                    <p className="text-[12px] text-[#999]">{r.desc} · {r.rows.length} rows</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap" role="radiogroup" aria-label={`${r.name} export format`}>
                  {(["CSV", "Excel", "PDF"] as Format[]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      role="radio"
                      aria-checked={f === opt}
                      onClick={() => setFormats((s) => ({ ...s, [r.id]: opt }))}
                      className={`px-3 py-1.5 text-[12px] rounded-full border cursor-pointer ${f === opt ? "bg-[#0061FF] text-white border-[#0061FF]" : "bg-white text-[#666] border-[#e5e7eb] hover:bg-[#f5f5f5]"}`}
                    >
                      {opt}
                    </button>
                  ))}
                  {f === "CSV" ? (
                    <span title={r.rows.length ? undefined : "No records to export yet"}>
                      <SmallButton
                        variant="primary"
                        icon={Download}
                        disabled={!r.rows.length}
                        onClick={() => {
                          downloadCsv(r.name, r.columns, r.rows as (string | number)[][]);
                          previewToast(`${r.name} CSV downloaded`);
                        }}
                      >
                        Download CSV
                      </SmallButton>
                    </span>
                  ) : (
                    <span title={`${f} export is available in Phase 2`}>
                      <SmallButton icon={Lock} disabled>{f} — Phase 2</SmallButton>
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="text-[11px] text-[#999] mt-3 flex items-center gap-1.5"><FileDown size={12} /> Exports contain browser-only test records and are marked as such in the file.</p>
      </Card>
    </>
  );
}
