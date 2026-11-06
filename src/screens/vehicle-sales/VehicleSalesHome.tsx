import { Link, Navigate, useLocation } from "react-router-dom";
import { ArrowRight, CarFront, CircleCheck, PlugZap, Unplug } from "lucide-react";
import { SALES_MODULES, TOTAL_SCREENS, VEHICLE_SALES_BASE, findModule, modulePath, screenPath, type SalesModule } from "./registry";
import { useSalesAccess, useVisibleModules } from "./access";
import { SalesNoAccess } from "./SalesNoAccess";
import { Badge, Card, IntegrationChip, KpiCard, KpiGrid, PageHeader } from "./components/ui";
import { bodyJobs, useSalesData } from "./data/store";

function statusCounts(modules: SalesModule[]) {
  const all = modules.flatMap((m) => m.screens);
  return {
    ready: all.filter((s) => s.status === "ready").length,
    uat: all.filter((s) => s.status === "uat").length,
    partial: all.filter((s) => s.status === "partial").length,
  };
}

export default function VehicleSalesHome() {
  const counts = statusCounts(SALES_MODULES);
  const data = useSalesData();
  // Only the modules and screens this role may open (Super Admin sees all).
  const modules = useVisibleModules();
  const { canScreen } = useSalesAccess();
  const testCounts = [
    { label: "Purchase orders", value: data.purchaseOrders.length, to: screenPath("purchase-order", "new-purchase-order") },
    { label: "Vehicles in stock", value: data.stock.length, to: screenPath("goods-receipt", "receive-vehicle") },
    { label: "Enquiries", value: data.enquiries.length, to: screenPath("crm", "add-enquiry") },
    { label: "Quotes", value: data.quotes.length, to: screenPath("quotation", "new-quote") },
    { label: "Sales orders", value: data.deals.length, to: screenPath("sales-order", "sale-details") },
    { label: "Body building jobs", value: bodyJobs(data).length, to: screenPath("body-building", "body-building-job") },
  ].filter((c) => { const [, , m, s] = c.to.split("/"); return canScreen(m, s); });
  return (
    <>
      <PageHeader
        icon={CarFront}
        title="Vehicle Sales"
        description="Purchase orders, goods receipt, stock, CRM, quotations, sales orders, body building, invoicing, payments, delivery and reporting for the vehicle sales department."
      />
      <KpiGrid cols={4}>
        <KpiCard label="Modules / screens" value={`${SALES_MODULES.length} / ${TOTAL_SCREENS}`} hint="Screens vs Evolve API workbook, Santosh review 29 Oct 2026" icon={CarFront} />
        <KpiCard label="Ready" value={counts.ready} hint="TrueGear-only or Evolve read APIs working" icon={CircleCheck} />
        <KpiCard label="Evolve link pending UAT" value={counts.uat} hint="Write API built but switched off" icon={PlugZap} />
        <KpiCard label="Partly – no Evolve API" value={counts.partial} hint="Manual step in Evolve required" icon={Unplug} />
      </KpiGrid>

      <Card title="Records" subtitle="Shared by all users. Start by raising a purchase order or capturing an enquiry." className="mb-5">
        <ul className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {testCounts.map((c) => (
            <li key={c.label}>
              <Link to={c.to} className="block border border-[#f0f0f0] rounded-lg px-3 py-2 hover:border-[#ff4f31]">
                <p className="text-[22px] text-[#333] leading-tight tabular-nums">{c.value}</p>
                <p className="text-[12px] text-[#999]">{c.label}</p>
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
        {modules.map((m) => {
          const c = statusCounts([m]);
          return (
            <Card key={m.slug} className="flex flex-col" bodyClassName="flex flex-col flex-1">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-[10px] bg-linear-to-b from-[#ff4f31] to-[#fe2b73] flex items-center justify-center shrink-0">
                  <m.icon className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <Link to={modulePath(m.slug)} className="text-[15px] font-semibold text-[#333] hover:text-[#ff4f31]">
                    {m.label}
                  </Link>
                  <p className="text-[12px] text-[#999]">{m.description}</p>
                </div>
              </div>
              <ul className="space-y-1 flex-1">
                {m.screens.map((s) => (
                  <li key={s.slug}>
                    <Link to={screenPath(m.slug, s.slug)} className="group flex items-center gap-2 text-[13px] text-[#555] hover:text-[#ff4f31] py-0.5">
                      <ArrowRight size={12} className="text-[#ccc] group-hover:text-[#ff4f31]" />
                      <span className="flex-1 truncate">{s.label}</span>
                      {s.status === "uat" && <Badge tone="amber">UAT</Badge>}
                      {s.status === "partial" && <Badge tone="red">No API</Badge>}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-[#999] mt-3 pt-3 border-t border-[#f0f0f0]">
                {m.screens.length} screens · {c.ready} ready{c.uat ? ` · ${c.uat} pending UAT` : ""}{c.partial ? ` · ${c.partial} no Evolve API` : ""}
              </p>
            </Card>
          );
        })}
      </div>
    </>
  );
}

export function ModuleOverview() {
  const { pathname } = useLocation();
  const modules = useVisibleModules();
  const slug = pathname.split("/")[2];
  const module = modules.find((m) => m.slug === slug);
  if (!findModule(slug)) return <Navigate to={VEHICLE_SALES_BASE} replace />;
  if (!module) return <SalesNoAccess />;

  return (
    <>
      <PageHeader icon={module.icon} title={module.label} description={module.description} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {module.screens.map((s) => (
          <Card key={s.slug}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link to={screenPath(module.slug, s.slug)} className="text-[15px] font-semibold text-[#333] hover:text-[#ff4f31]">
                  {s.label}
                </Link>
                <p className="text-[12px] text-[#666] mt-0.5">{s.summary}</p>
              </div>
              <Link
                to={screenPath(module.slug, s.slug)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium rounded-md bg-linear-to-b from-[#ff4f31] to-[#fe2b73] text-white hover:opacity-90 shrink-0"
              >
                Open <ArrowRight size={12} />
              </Link>
            </div>
            <div className="mt-3">
              <IntegrationChip screen={s} />
            </div>
            <p className="text-[12px] text-[#888] mt-2 leading-relaxed">{s.note}</p>
            {s.change && (
              <p className="text-[12px] text-[#555] mt-2 pt-2 border-t border-[#f0f0f0]">
                <Badge tone="violet">Changed 29 Oct</Badge> <span className="ml-1">{s.change}</span>
              </p>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
