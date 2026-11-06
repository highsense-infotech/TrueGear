import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import VehicleSalesLayout from "./VehicleSalesLayout";
import VehicleSalesHome, { ModuleOverview } from "./VehicleSalesHome";
import { SALES_MODULES, VEHICLE_SALES_BASE, legacyPath } from "./registry";
import { SCREEN_COMPONENTS } from "./screens";
import { useSalesAccess } from "./access";
import { SalesNoAccess } from "./SalesNoAccess";

// Nested routes under /vehicle-sales/* (registered once in AppRoutes).
// One route per registry screen: /vehicle-sales/:module/:screen.
export default function VehicleSalesRoutes() {
  return (
    <Routes>
      <Route element={<VehicleSalesLayout />}>
        <Route index element={<VehicleSalesHome />} />
        {SALES_MODULES.map((m) => (
          <Route key={m.slug} path={m.slug}>
            <Route index element={<ModuleOverview />} />
            {m.screens.map((s) => {
              const Screen = SCREEN_COMPONENTS[`${m.slug}/${s.slug}`];
              return Screen ? <Route key={s.slug} path={s.slug} element={<ScreenGuard module={m.slug} screen={s.slug}><Screen /></ScreenGuard>} /> : null;
            })}
          </Route>
        ))}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

// Role check per screen: view on the module plus the screen's own action (access.ts).
function ScreenGuard({ module, screen, children }: { module: string; screen: string; children: React.ReactNode }) {
  const { canScreen } = useSalesAccess();
  return canScreen(module, screen) ? <>{children}</> : <SalesNoAccess />;
}

// Unknown path: send old (pre-29 Oct) URLs to their new home, anything else to the overview.
function NotFound() {
  const { pathname, search } = useLocation();
  const next = legacyPath(pathname);
  return <Navigate to={next ? next + search : VEHICLE_SALES_BASE} replace />;
}
