// Module 3 — Vehicle Stock. The TrueGear views read stock saved on the server
// (vehicles get there via Receiving); the "Evolve live" views read real
// stock through the backend: 06 GetAllStockedVehicles, 16 VehicleLookup,
// 26 GetVehicleDealHistory and 19 VehicleStockSummary.

import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Warehouse, Eye, Car, Clock, Wallet, BadgeCheck, FileText, Wrench, MapPin, Calculator, Bookmark, History, PackageCheck,
  Database, CloudDownload,
} from "lucide-react";
import { useCurrency } from "../../../context/CurrencyContext";
import {
  PageHeader, Card, KpiGrid, KpiCard, Toolbar, SearchInput, FilterSelect, DataTable, StatusBadge, SmallButton,
  SecondaryButton, KeyValueGrid, Tabs, Badge, Timeline, EmptyState, SummaryRows, SelectInput, Field, Toggle, type Column,
} from "../components/ui";
import { EvolveLiveCard } from "../components/evolve";
import {
  listEvolveStock, lookupEvolveVehicle, getEvolveDealHistory, getEvolveStockSummary, type EvolveStockVehicle,
} from "../../../api/vehicleSalesEvolve.api";
import { BarList, StackedBar, ORDINAL } from "../components/charts";
import { screenPath } from "../registry";
import { BRANCHES, fmtDate, type StockVehicle } from "../data/mock";
import { stockByNo, userById, useSalesData, usePersistentState } from "../data/store";

const ageBucket = (d: number) => (d <= 30 ? "0–30 days" : d <= 60 ? "31–60 days" : d <= 90 ? "61–90 days" : "90+ days");
const AGE_BUCKETS = ["0–30 days", "31–60 days", "61–90 days", "90+ days"];

// Receiving records the receipt date per stock no.; age counts from there.
function useStockAge() {
  const [receipts] = usePersistentState<Record<string, { receivedOn?: string; supplierInvoice?: string; poId?: string }>>("receiving.receipts", {});
  const age = (v: StockVehicle) => {
    const on = receipts[v.stockNo]?.receivedOn;
    const since = on ? Math.max(0, Math.floor((Date.now() - new Date(on + "T00:00:00").getTime()) / 86400000)) : 0;
    return v.daysInStock + since;
  };
  return { age, receipts };
}

function NoStock() {
  const navigate = useNavigate();
  return (
    <EmptyState
      icon={Warehouse}
      title="No vehicles in stock yet"
      message="Receive a vehicle (against a purchase order, or a used / demo unit without one) and it appears here."
      action={<SmallButton variant="primary" icon={PackageCheck} onClick={() => navigate(screenPath("goods-receipt", "receive-vehicle"))}>Receive vehicle</SmallButton>}
    />
  );
}

function AgeCell({ days }: { days: number }) {
  return <span className={days > 90 ? "text-[#e53e3e] font-medium" : days > 60 ? "text-amber-700" : ""}>{days}</span>;
}

// ── Vehicles in Stock ────────────────────────────────────────────────────────
export function VehiclesInStock() {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const [q, setQ] = useState("");
  const [branch, setBranch] = useState("All branches");
  const [model, setModel] = useState("All models");
  const [status, setStatus] = useState("All statuses");
  const [type, setType] = useState("All types");
  const [source, setSource] = useState<"test" | "evolve">("test");
  const { stock: STOCK } = useSalesData();
  const { age } = useStockAge();

  const models = Array.from(new Set(STOCK.map((v) => `${v.make} ${v.model.split(" ")[0]}`)));
  const rows = useMemo(() => STOCK.filter((v) =>
    (branch === "All branches" || v.branch === branch) &&
    (model === "All models" || `${v.make} ${v.model.split(" ")[0]}` === model) &&
    (status === "All statuses" || v.status === status) &&
    (type === "All types" || v.type === type) &&
    [v.stockNo, v.vin, v.model, v.colour, v.reservedFor ?? ""].join(" ").toLowerCase().includes(q.toLowerCase()),
  ), [STOCK, q, branch, model, status, type]);

  const available = STOCK.filter((v) => v.status === "In Stock");
  const go = (v: StockVehicle) => navigate(`${screenPath("stock", "vehicle-details")}?stock=${v.stockNo}`);

  const columns: Column<StockVehicle>[] = [
    { key: "stockNo", header: "Stock no.", render: (v) => <span className="font-medium text-[#ff4f31]">{v.stockNo}</span>, sortValue: (v) => v.stockNo },
    { key: "vin", header: "VIN", render: (v) => <span className="font-mono text-[12px]">{v.vin}</span> },
    { key: "vehicle", header: "Make / model", render: (v) => (<div><p className="text-[#333]">{v.make} {v.model}</p><p className="text-[11px] text-[#999]">{v.type}</p></div>), sortValue: (v) => v.model },
    { key: "year", header: "Year", render: (v) => v.year, sortValue: (v) => v.year },
    { key: "colour", header: "Colour", render: (v) => v.colour },
    { key: "branch", header: "Location", render: (v) => v.branch, sortValue: (v) => v.branch },
    { key: "retail", header: "Retail", align: "right", render: (v) => formatCurrency(v.retail), sortValue: (v) => v.retail },
    { key: "current", header: "Current", align: "right", render: (v) => <span className={v.current < v.retail ? "text-green-700" : ""}>{formatCurrency(v.current)}</span>, sortValue: (v) => v.current },
    { key: "cost", header: "Accounting cost", align: "right", render: (v) => formatCurrency(v.cost), sortValue: (v) => v.cost },
    { key: "days", header: "Days", align: "right", render: (v) => <AgeCell days={age(v)} />, sortValue: (v) => age(v) },
    { key: "reserved", header: "Reserved", render: (v) => (v.status === "Reserved" ? <span title={v.reservedFor}><Badge tone="amber">{v.reservedFor}</Badge></span> : <span className="text-[#bbb]">—</span>) },
    { key: "status", header: "Status", render: (v) => <StatusBadge status={v.status} /> },
    { key: "act", header: "", align: "right", render: (v) => <SmallButton icon={Eye} onClick={(e) => { e.stopPropagation(); go(v); }}>View</SmallButton> },
  ];

  return (
    <>
      <PageHeader actions={<SecondaryButton icon={Calculator} onClick={() => navigate(screenPath("stock", "stock-totals"))}>Stock totals</SecondaryButton>} />
      <Tabs<"test" | "evolve"> value={source} onChange={setSource} tabs={[
        { key: "test", label: "TrueGear stock", icon: Database },
        { key: "evolve", label: "Evolve live (06)", icon: CloudDownload },
      ]} />
      {source === "evolve" ? <EvolveStockList /> : <>
      <KpiGrid>
        <KpiCard label="Units in stock" value={STOCK.filter((v) => v.status !== "Sold").length} icon={Car} />
        <KpiCard label="Available to sell" value={available.length} icon={BadgeCheck} />
        <KpiCard label="Stock value (cost)" value={formatCurrency(STOCK.filter((v) => v.status !== "Sold").reduce((n, v) => n + v.cost, 0))} icon={Wallet} />
        <KpiCard label="Over 90 days" value={STOCK.filter((v) => age(v) > 90 && v.status !== "Sold").length} hint="Consider price adjustment" tone="down" icon={Clock} />
      </KpiGrid>
      {STOCK.length === 0 ? <NoStock /> : <Card>
        <Toolbar>
          <SearchInput value={q} onChange={setQ} placeholder="Search stock no., VIN, model, colour or customer" />
          <FilterSelect label="Branch" value={branch} onChange={setBranch} options={["All branches", ...BRANCHES]} />
          <FilterSelect label="Make / model" value={model} onChange={setModel} options={["All models", ...models]} />
          <FilterSelect label="Stock status" value={status} onChange={setStatus} options={["All statuses", "In Stock", "On Hold", "Reserved", "Sold", "In Transit", "Demo"]} />
          <FilterSelect label="Vehicle type" value={type} onChange={setType} options={["All types", "New", "Used", "Demo"]} />
        </Toolbar>
        <DataTable columns={columns} rows={rows} rowKey={(v) => v.stockNo} onRowClick={go}
          empty={<EmptyState icon={Warehouse} title="No vehicles match" message="Try another branch, model or status." action={<SmallButton onClick={() => { setQ(""); setBranch("All branches"); setModel("All models"); setStatus("All statuses"); setType("All types"); }}>Clear filters</SmallButton>} />} />
      </Card>}
      </>}
    </>
  );
}

const EVOLVE_TYPE: Record<string, string> = { N: "New", U: "Used", D: "Demo" };

// Live stock from Evolve 06. Read only: selling still starts from a unit that
// was received into TrueGear.
function EvolveStockList() {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const [q, setQ] = useState("");
  const [includeSold, setIncludeSold] = useState(false);
  const columns: Column<EvolveStockVehicle>[] = [
    { key: "stockNo", header: "Evolve stock no.", render: (v) => <span className="font-medium text-[#ff4f31]">{v.stockNo}</span>, sortValue: (v) => v.stockNo },
    { key: "vin", header: "VIN", render: (v) => <span className="font-mono text-[12px]">{v.vin}</span> },
    { key: "vehicle", header: "Make / model", render: (v) => (<div><p className="text-[#333]">{v.make} {v.series} {v.model}</p><p className="text-[11px] text-[#999]">{EVOLVE_TYPE[v.vehicleType] ?? v.vehicleType} · {v.modelCode}</p></div>), sortValue: (v) => `${v.series} ${v.model}` },
    { key: "year", header: "Year", render: (v) => v.year ?? "—", sortValue: (v) => v.year ?? 0 },
    { key: "colour", header: "Colour", render: (v) => v.extColour || "—" },
    { key: "location", header: "Location", render: (v) => v.location || "—", sortValue: (v) => v.location },
    { key: "retail", header: "Retail", align: "right", render: (v) => formatCurrency(v.retailPrice), sortValue: (v) => v.retailPrice },
    { key: "current", header: "Current", align: "right", render: (v) => formatCurrency(v.currentPrice), sortValue: (v) => v.currentPrice },
    { key: "cost", header: "Accounting cost", align: "right", render: (v) => formatCurrency(v.totalCost), sortValue: (v) => v.totalCost },
    { key: "days", header: "Days", align: "right", render: (v) => <AgeCell days={v.daysInStock} />, sortValue: (v) => v.daysInStock },
    { key: "reserved", header: "Reserved", render: (v) => (v.reservedFor ? <span title={v.reservedBy ? `By ${v.reservedBy}` : undefined}><Badge tone="amber">{v.reservedFor}</Badge></span> : <span className="text-[#bbb]">—</span>) },
    { key: "status", header: "Status", render: (v) => <StatusBadge status={v.sold ? "Sold" : v.reservedFor ? "Reserved" : "In Stock"} /> },
    { key: "act", header: "", align: "right", render: (v) => <SmallButton icon={Eye} onClick={() => navigate(`${screenPath("stock", "vehicle-details")}?evolve=${encodeURIComponent(v.vin || v.stockNo)}`)}>View</SmallButton> },
  ];
  return (
    <EvolveLiveCard title="Stock in Evolve" api="06 GetAllStockedVehicles" autoLoad loadKey={String(includeSold)} load={() => listEvolveStock(includeSold)}
      empty={(rows) => rows.length === 0}>
      {(rows) => {
        const shown = rows.filter((v) => [v.stockNo, v.vin, v.make, v.series, v.model, v.extColour, v.reservedFor].join(" ").toLowerCase().includes(q.toLowerCase()));
        const unsold = rows.filter((v) => !v.sold);
        return (
          <>
            <KpiGrid>
              <KpiCard label="Units in Evolve stock" value={unsold.length} icon={Car} />
              <KpiCard label="Reserved in Evolve" value={unsold.filter((v) => v.reservedFor).length} icon={Bookmark} />
              <KpiCard label="Stock value (cost)" value={formatCurrency(unsold.reduce((n, v) => n + v.totalCost, 0))} icon={Wallet} />
              <KpiCard label="Over 90 days" value={unsold.filter((v) => v.daysInStock > 90).length} tone="down" icon={Clock} />
            </KpiGrid>
            <Toolbar>
              <SearchInput value={q} onChange={setQ} placeholder="Search stock no., VIN, model, colour or customer" />
              <Toggle checked={includeSold} onChange={setIncludeSold} label="Include sold" />
            </Toolbar>
            <DataTable columns={columns} rows={shown} rowKey={(v) => v.stockNo || v.vin}
              empty={<EmptyState icon={Warehouse} title="No vehicles match" message="Try another search." />} />
          </>
        );
      }}
    </EvolveLiveCard>
  );
}

// ── Vehicle Details ──────────────────────────────────────────────────────────
type DetailTab = "overview" | "pricing" | "accessories" | "deals";

export function VehicleDetails() {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const [params, setParams] = useSearchParams();
  const { stock, deals } = useSalesData();
  const { age, receipts } = useStockAge();
  const [tab, setTab] = useState<DetailTab>("overview");
  const v = stockByNo(params.get("stock"));
  const evolveKey = params.get("evolve");

  if (!v && evolveKey) return <EvolveVehicleDetails vinOrStockNo={evolveKey} />;

  if (!v) {
    return (
      <>
        <PageHeader actions={<SecondaryButton onClick={() => navigate(screenPath("stock", "vehicles-in-stock"))}>Back to stock</SecondaryButton>} />
        {stock.length === 0 ? <NoStock /> : (
          <Card title="Choose a vehicle" subtitle={params.get("stock") ? `Stock no. ${params.get("stock")} was not found.` : "Pick a vehicle to see its details."}>
            <Field label="Vehicle" htmlFor="vd-pick">
              <SelectInput id="vd-pick" value="" placeholder="Select vehicle" onChange={(e) => setParams({ stock: e.target.value })}
                options={stock.map((x) => ({ value: x.stockNo, label: `${x.stockNo} — ${x.make} ${x.model} · ${x.colour}` }))} />
            </Field>
          </Card>
        )}
      </>
    );
  }

  const days = age(v);
  const gp = v.current - v.cost;
  const meta = receipts[v.stockNo];
  const vehicleDeals = deals.filter((d) => d.stockNo === v.stockNo);
  const invoiced = vehicleDeals.find((d) => d.invoiceNo);

  return (
    <>
      <PageHeader
        title={`${v.stockNo} · ${v.make} ${v.model}`}
        description={`${v.year} · ${v.colour} · ${v.branch}`}
        actions={
          <>
            <SecondaryButton onClick={() => navigate(screenPath("stock", "vehicles-in-stock"))}>Back to stock</SecondaryButton>
            <SmallButton variant="primary" icon={FileText} disabled={v.status === "Sold"} onClick={() => navigate(`${screenPath("quotation", "new-quote")}?stock=${v.stockNo}`)}>Create quote</SmallButton>
          </>
        }
      />
      <div className="flex gap-2 flex-wrap mb-4">
        <StatusBadge status={v.status} />
        <Badge tone="gray">{v.type}</Badge>
        <Badge tone={days > 90 ? "red" : days > 60 ? "amber" : "green"}><Clock size={12} /> {days} days in stock</Badge>
      </div>
      <Tabs<DetailTab> value={tab} onChange={setTab} tabs={[
        { key: "overview", label: "Overview", icon: Car },
        { key: "pricing", label: "Pricing & cost", icon: Wallet },
        { key: "accessories", label: "Factory accessories", icon: Wrench },
        { key: "deals", label: "Deal history", icon: History },
      ]} />

      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          <Card className="lg:col-span-2" title="Identification">
            <KeyValueGrid items={[
              { label: "Stock no.", value: v.stockNo },
              { label: "VIN", value: <span className="font-mono text-[12px]">{v.vin}</span> },
              { label: "Engine no.", value: <span className="font-mono text-[12px]">{v.engineNo}</span> },
              { label: "Make", value: v.make },
              { label: "Model", value: v.model },
              { label: "Model code", value: v.modelCode },
              { label: "Year", value: v.year },
              { label: "Colour", value: v.colour },
              { label: "Registration", value: v.registration ?? "Not registered" },
              { label: "Odometer", value: `${v.odometer.toLocaleString()} km` },
            ]} />
          </Card>
          <div className="space-y-5">
            <Card title="Location & availability" icon={MapPin}>
              <KeyValueGrid cols={2} items={[
                { label: "Branch", value: v.branch },
                { label: "Received", value: meta?.receivedOn ? fmtDate(meta.receivedOn) : "—" },
                { label: "Stock age", value: `${days} days (${ageBucket(days)})` },
                { label: "Availability", value: v.status === "In Stock" ? "Available to sell" : v.status },
              ]} />
            </Card>
            <Card title="Reservation" icon={Bookmark}>
              {v.reservedFor ? (
                <KeyValueGrid cols={2} items={[
                  { label: v.status === "Sold" ? "Sold to" : "Reserved for", value: v.reservedFor },
                  { label: "Source", value: "Sale › Reserve vehicle" },
                ]} />
              ) : (
                <p className="text-[13px] text-[#999]">Not reserved.</p>
              )}
              {!v.reservedFor && v.status === "In Stock" && (
                <SmallButton className="mt-3" onClick={() => navigate(screenPath("sales-order", "reserve-vehicle"))}>Reserve this vehicle</SmallButton>
              )}
            </Card>
          </div>
        </div>
      )}

      {tab === "pricing" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card title="Pricing">
            <SummaryRows rows={[
              { label: "Retail price", value: formatCurrency(v.retail) },
              { label: "Current selling price", value: formatCurrency(v.current) },
              { label: "Price adjustment", value: formatCurrency(v.current - v.retail), negative: v.current < v.retail },
            ]} />
          </Card>
          <Card title="Cost & margin" subtitle="Cost captured on receipt (Evolve TotalAccountingCost when live)">
            <SummaryRows rows={[
              { label: "Total accounting cost", value: formatCurrency(v.cost) },
              { label: "Holding days", value: days },
              { label: "Margin %", value: v.current ? `${((gp / v.current) * 100).toFixed(1)}%` : "—" },
            ]} total={{ label: "Gross profit at current price", value: formatCurrency(gp) }} />
          </Card>
        </div>
      )}

      {tab === "accessories" && <EvolveAccessories vin={v.vin} />}

      {tab === "deals" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card title="Deal history" subtitle="Deals created in Sale, Payment & Invoice">
            {vehicleDeals.length ? (
              <Timeline items={vehicleDeals.map((d) => ({
                id: d.id,
                icon: d.invoiceNo ? BadgeCheck : FileText,
                tone: d.status === "Cancelled" ? "red" : d.invoiceNo ? "green" : "blue",
                title: <>{d.id} <span className="font-normal text-[#666]">· {d.status}</span></>,
                meta: `${fmtDate(d.created)} · ${userById(d.repId)?.name ?? "—"}`,
              }))} />
            ) : (
              <EmptyState icon={History} title="No deals yet" message="This vehicle has not been on any deal." />
            )}
          </Card>
          <Card title="Document numbers">
            <KeyValueGrid cols={2} items={[
              { label: "Purchase order", value: meta?.poId ?? "No PO" },
              { label: "Supplier invoice", value: meta?.supplierInvoice ?? "—" },
              { label: "Deal invoice", value: invoiced?.invoiceNo ?? "Not invoiced" },
              { label: "Received", value: meta?.receivedOn ? fmtDate(meta.receivedOn) : "—" },
            ]} />
          </Card>
          <EvolveDealDocuments vin={v.vin} className="lg:col-span-2" />
        </div>
      )}
    </>
  );
}

function EvolveAccessories({ vin }: { vin: string }) {
  const { formatCurrency } = useCurrency();
  return (
    <EvolveLiveCard title="Factory-fitted accessories" icon={Wrench} api="16 VehicleLookup" loadKey={vin} load={() => lookupEvolveVehicle({ vin })}
      empty={(d) => d.accessories.length === 0}>
      {(d) => (
        <DataTable paginate={false} rows={d.accessories} rowKey={(a) => a.code + a.description} columns={[
          { key: "code", header: "Code", render: (a) => a.code },
          { key: "desc", header: "Accessory", render: (a) => a.description },
          { key: "cost", header: "Cost", align: "right", render: (a) => formatCurrency(a.costPrice) },
          { key: "retail", header: "Retail", align: "right", render: (a) => formatCurrency(a.retailPrice) },
        ]} />
      )}
    </EvolveLiveCard>
  );
}

function EvolveDealDocuments({ vin, className }: { vin: string; className?: string }) {
  return (
    <EvolveLiveCard className={className} title="Evolve deals & documents" icon={History} api="26 GetVehicleDealHistory" loadKey={vin} load={() => getEvolveDealHistory({ vin })}
      empty={(rows) => rows.length === 0}>
      {(rows) => (
        <DataTable paginate={false}
          rows={rows.flatMap((r) => (r.documents.length ? r.documents : [{ type: "—", number: "", date: null, time: "" }]).map((doc) => ({ ...doc, dealNo: r.dealNo })))}
          rowKey={(r) => `${r.dealNo}-${r.number}-${r.type}`} columns={[
            { key: "deal", header: "Evolve deal", render: (r) => <span className="font-medium">{r.dealNo}</span> },
            { key: "type", header: "Document", render: (r) => r.type },
            { key: "no", header: "Number", render: (r) => <span className="font-mono text-[12px]">{r.number || "—"}</span> },
            { key: "date", header: "Date", render: (r) => (r.date ? fmtDate(r.date) : "—") },
          ]} />
      )}
    </EvolveLiveCard>
  );
}

// A unit that exists only in Evolve (opened from the "Evolve live" stock tab).
function EvolveVehicleDetails({ vinOrStockNo }: { vinOrStockNo: string }) {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const query = vinOrStockNo.length >= 17 ? { vin: vinOrStockNo } : { stockNo: vinOrStockNo };
  return (
    <>
      <PageHeader title={`Evolve vehicle ${vinOrStockNo}`} description="Read live from Evolve — not received in TrueGear"
        actions={<SecondaryButton onClick={() => navigate(screenPath("stock", "vehicles-in-stock"))}>Back to stock</SecondaryButton>} />
      <div className="space-y-5">
        <EvolveLiveCard title="Vehicle" icon={Car} api="16 VehicleLookup" autoLoad loadKey={vinOrStockNo} load={() => lookupEvolveVehicle(query)}>
          {(d) => (
            <div className="space-y-5">
              <KeyValueGrid items={[
                { label: "Stock no.", value: d.stockNo },
                { label: "VIN", value: <span className="font-mono text-[12px]">{d.vin}</span> },
                { label: "Engine no.", value: <span className="font-mono text-[12px]">{d.engineNo || "—"}</span> },
                { label: "Make / series", value: `${d.make} ${d.series}` },
                { label: "Model", value: d.model },
                { label: "Model code", value: d.modelCode || "—" },
                { label: "Year", value: d.year ?? "—" },
                { label: "Colour", value: [d.extColour, d.intColour].filter(Boolean).join(" / ") || "—" },
                { label: "Registration", value: d.registrationNo || "Not registered" },
                { label: "Odometer", value: `${d.kilometers.toLocaleString()} km` },
                { label: "Days in stock", value: d.daysInStock },
                { label: "Reserved for", value: d.reservedFor || "—" },
              ]} />
              <SummaryRows rows={[
                { label: "Retail price", value: formatCurrency(d.retailPrice) },
                { label: "Current selling price", value: formatCurrency(d.currentPrice) },
                { label: "Total accounting cost", value: formatCurrency(d.totalCost) },
              ]} total={{ label: "Gross profit at current price", value: formatCurrency(d.currentPrice - d.totalCost) }} />
              {d.accessories.length > 0 && (
                <DataTable paginate={false} rows={d.accessories} rowKey={(a) => a.code + a.description} columns={[
                  { key: "desc", header: "Factory-fitted accessory", render: (a) => a.description },
                  { key: "retail", header: "Retail", align: "right", render: (a) => formatCurrency(a.retailPrice) },
                ]} />
              )}
            </div>
          )}
        </EvolveLiveCard>
        {query.vin && <EvolveDealDocuments vin={query.vin} />}
      </div>
    </>
  );
}

// ── Stock Totals ─────────────────────────────────────────────────────────────
export function StockTotals() {
  const { formatCurrency } = useCurrency();
  const [measure, setMeasure] = useState<"units" | "value">("value");
  const { stock } = useSalesData();
  const { age } = useStockAge();
  const live = stock.filter((v) => v.status !== "Sold");

  if (live.length === 0) {
    return (
      <>
        <PageHeader />
        <EvolveStockTotals />
        <div className="mt-5"><NoStock /></div>
      </>
    );
  }

  const avgAge = (list: StockVehicle[]) => (list.length ? Math.round(list.reduce((n, v) => n + age(v), 0) / list.length) : 0);
  const byBranch = BRANCHES.map((b) => {
    const list = live.filter((v) => v.branch === b);
    return { branch: b as string, units: list.length, value: list.reduce((n, v) => n + v.cost, 0), retail: list.reduce((n, v) => n + v.current, 0), avgAge: avgAge(list) };
  });
  const ages = AGE_BUCKETS.map((b) => ({ label: b, value: live.filter((v) => ageBucket(age(v)) === b).length }));
  const availability = ["In Stock", "On Hold", "Reserved", "Demo", "In Transit"].map((s) => ({ label: s, value: live.filter((v) => v.status === s).length }));
  const totalValue = live.reduce((n, v) => n + v.cost, 0);
  const retailValue = live.reduce((n, v) => n + v.current, 0);

  return (
    <>
      <PageHeader />
      <KpiGrid>
        <KpiCard label="Total stock units" value={live.length} icon={Car} />
        <KpiCard label="Total stock value (cost)" value={formatCurrency(totalValue)} icon={Wallet} />
        <KpiCard label="Retail value" value={formatCurrency(retailValue)} icon={Calculator} />
        <KpiCard label="Average stock age" value={`${avgAge(live)} days`} icon={Clock} />
      </KpiGrid>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Stock by location" actions={
          <div className="flex gap-1" role="tablist">
            {(["value", "units"] as const).map((m) => (
              <SmallButton key={m} variant={measure === m ? "primary" : "outline"} onClick={() => setMeasure(m)} aria-pressed={measure === m}>{m === "value" ? "Value" : "Units"}</SmallButton>
            ))}
          </div>
        }>
          <BarList data={byBranch.map((b) => ({ label: b.branch, value: measure === "value" ? b.value : b.units }))} format={measure === "value" ? (n) => formatCurrency(n) : undefined} />
        </Card>
        <Card title="Stock age" subtitle="Units by days in stock">
          <StackedBar data={ages} colors={ORDINAL.slice(0, 4)} />
          <div className="mt-5"><p className="text-[12px] font-medium text-[#333] mb-2">Availability</p><BarList data={availability} /></div>
        </Card>
        <EvolveStockTotals className="lg:col-span-2" />
        <Card className="lg:col-span-2" title="Summary by location">
          <DataTable paginate={false} rows={[...byBranch, { branch: "Total", units: live.length, value: totalValue, retail: retailValue, avgAge: avgAge(live) }]} rowKey={(b) => b.branch} columns={[
            { key: "branch", header: "Location", render: (b) => <span className={b.branch === "Total" ? "font-semibold" : ""}>{b.branch}</span> },
            { key: "units", header: "Units", align: "right", render: (b) => b.units },
            { key: "value", header: "Stock value (cost)", align: "right", render: (b) => formatCurrency(b.value) },
            { key: "retail", header: "Retail value", align: "right", render: (b) => formatCurrency(b.retail) },
            { key: "share", header: "Share of value", align: "right", render: (b) => (totalValue ? `${Math.round((b.value / totalValue) * 100)}%` : "—") },
            { key: "age", header: "Avg. age (days)", align: "right", render: (b) => b.avgAge },
          ]} />
        </Card>
      </div>
    </>
  );
}

function EvolveStockTotals({ className }: { className?: string }) {
  const { formatCurrency } = useCurrency();
  return (
    <EvolveLiveCard className={className} title="Stock totals in Evolve" icon={Calculator} api="19 VehicleStockSummary" load={() => getEvolveStockSummary()}>
      {(s) => (
        <div className="space-y-4">
          <KpiGrid cols={3}>
            <KpiCard label="For sale" value={`${s.stockForSale.count} · ${formatCurrency(s.stockForSale.value)}`} icon={Car} />
            <KpiCard label="Company vehicles" value={`${s.companyVehicles.count} · ${formatCurrency(s.companyVehicles.value)}`} icon={Warehouse} />
            <KpiCard label="Total stock" value={`${s.total.count} · ${formatCurrency(s.total.value)}`} icon={Wallet} />
          </KpiGrid>
          {s.locations.length > 0 && (
            <DataTable paginate={false} rows={s.locations} rowKey={(l) => l.location} columns={[
              { key: "loc", header: "Location", render: (l) => l.location || "—" },
              { key: "units", header: "Units", align: "right", render: (l) => l.count },
              { key: "value", header: "Value", align: "right", render: (l) => formatCurrency(l.value) },
            ]} />
          )}
        </div>
      )}
    </EvolveLiveCard>
  );
}
