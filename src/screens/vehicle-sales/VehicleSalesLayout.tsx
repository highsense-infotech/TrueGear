import { Suspense, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Loader2, ListTree, X, CloudOff } from "lucide-react";
import { Breadcrumb } from "../../components/common/Breadcrumb";
import { VEHICLE_SALES_BASE, findModule, modulePath } from "./registry";
import { ModuleNav } from "./ModuleNav";
import { salesStore, useServerRecords } from "./data/store";

export default function VehicleSalesLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const server = useServerRecords();

  // Everything is on the server: load it when Vehicle Sales opens, and again
  // when the user comes back to the tab (unless a change is still saving) so
  // work done by other users shows up.
  useEffect(() => {
    void salesStore.hydrate();
    const onFocus = () => {
      if (!salesStore.saving()) void salesStore.hydrate();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const [, , moduleSlug, screenSlug] = pathname.split("/");
  const module = findModule(moduleSlug);
  const screen = module?.screens.find((s) => s.slug === screenSlug);

  const crumbs = [
    { label: "Vehicle Sales", onClick: () => navigate(VEHICLE_SALES_BASE) },
    ...(module ? [{ label: module.label, onClick: () => navigate(modulePath(module.slug)) }] : []),
    ...(screen ? [{ label: screen.label }] : []),
  ];
  // The last crumb is the current page — not a link.
  const lastIdx = crumbs.length - 1;
  const items = crumbs.map((c, i) => (i === lastIdx ? { label: c.label } : c));

  return (
    // Full width: the module / screen list opens from the main sidebar's
    // Vehicle Sales icon on hover (desktop) or the "Browse screens" drawer.
    <div>
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Breadcrumb items={items} />
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden mb-5 inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium border border-[#e5e7eb] rounded-md bg-white text-[#444] hover:bg-[#f5f5f5] cursor-pointer"
          >
            <ListTree size={14} /> Browse screens
          </button>
        </div>

        {server.status === "error" && (
          <div role="alert" className="flex items-center gap-2 flex-wrap bg-red-50 border border-red-200 text-red-800 rounded-lg px-3 py-2 mb-5 text-[12px]">
            <CloudOff size={14} className="shrink-0" />
            <span className="flex-1 min-w-0"><span className="font-semibold">Vehicle Sales data could not be loaded.</span> {server.error}</span>
            <button type="button" onClick={() => void salesStore.hydrate()} className="px-2 py-1 rounded-md border border-red-200 bg-white/60 hover:bg-white font-medium cursor-pointer">Retry</button>
          </div>
        )}

        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20" role="status" aria-label="Loading screen">
              <Loader2 className="w-6 h-6 animate-spin text-[#ff4f31]" />
            </div>
          }
        >
          {server.status === "ready" ? (
            <Outlet />
          ) : server.status !== "error" ? (
            <div className="flex items-center justify-center gap-2 py-20 text-[13px] text-[#666]" role="status">
              <Loader2 className="w-5 h-5 animate-spin text-[#ff4f31]" /> Loading Vehicle Sales data…
            </div>
          ) : null}
        </Suspense>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Vehicle Sales screens">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-[300px] max-w-[85vw] bg-white shadow-xl p-3 overflow-y-auto">
            <div className="flex items-center justify-between px-2 py-2 mb-2 border-b border-[#f0f0f0]">
              <p className="text-[14px] font-semibold text-[#333]">Vehicle Sales</p>
              <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close" className="p-1 rounded hover:bg-[#f3f4f6] cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <ModuleNav onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
