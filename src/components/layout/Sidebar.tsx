import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Menu, X, CheckCircle, ShieldUser, ClipboardList, Settings, Package, Users, Tag, CalendarDays, Globe, Wrench, ShieldCheck, Droplets, BadgeAlert, Receipt, KeyRound, CarFront } from "lucide-react";
// import { BadgeCheck, User, Receipt } from "lucide-react";
import { ROUTES } from "../../constants/routes";
import { useAuth } from "../../context/AuthContext";
import { MODULES, ACTIONS, VEHICLE_SALES_MODULES } from "../../constants/permissions";
import type { LucideIcon } from "lucide-react";
import { SidebarFlyout } from "./SidebarFlyout";
import { ModuleNav } from "../../screens/vehicle-sales/ModuleNav";

interface Props {
  open: boolean;
  setOpen: (val: boolean) => void;
}

interface NavItem {
  route: string;
  icon: LucideIcon;
  label: string;
  resource: string;
  action: string;
  // Shown when the user has `action` on ANY of these (Vehicle Sales modules).
  anyResource?: readonly string[];
}

const NAV_ITEMS: NavItem[] = [
  { route: ROUTES.APPOINTMENT_DASHBOARD, icon: CalendarDays, label: "Appointments", resource: MODULES.APPOINTMENT, action: ACTIONS.VIEW },
  { route: ROUTES.SECURITY_DASHBOARD, icon: ShieldUser, label: "Gate Entry", resource: MODULES.GATE_ENTRY, action: ACTIONS.VIEW },
  { route: ROUTES.QUALITY_CHECK_DASHBOARD, icon: CheckCircle, label: "QC Inspection", resource: MODULES.QC_INSPECTION, action: ACTIONS.VIEW },
  { route: ROUTES.SERVICE_ADVISOR_DASHBOARD, icon: ClipboardList, label: "Job Cards", resource: MODULES.JOB_CARD, action: ACTIONS.VIEW },
  { route: ROUTES.SPARE_PARTS_DASHBOARD, icon: Package, label: "Spare Parts", resource: MODULES.PARTS_MANAGER, action: ACTIONS.VIEW },
  { route: ROUTES.USER_MANAGEMENT, icon: Users, label: "User Management", resource: MODULES.ROLE_MANAGEMENT, action: ACTIONS.VIEW },
  { route: ROUTES.DESIGNATIONS, icon: Tag, label: "Designations", resource: MODULES.ROLE_MANAGEMENT, action: ACTIONS.VIEW },
  // Technician Mapping is now integrated into the Add/Edit User flow under User
  // Management. The standalone screen/route/APIs remain intact for reuse, but the
  // sidebar entry is hidden. (Route: ROUTES.TECHNICIAN_MAPPING)
  // { route: ROUTES.TECHNICIAN_MAPPING, icon: UserCog, label: "Technician Mapping", resource: MODULES.USER_MANAGEMENT, action: ACTIONS.EDIT },
  // "Vehicle Out" sidebar entry is hidden. The route/screen/APIs remain intact
  // and reachable directly (Route: ROUTES.VEHICLE_OUT_DASHBOARD).
  // { route: ROUTES.VEHICLE_OUT_DASHBOARD, icon: CarFront, label: "Vehicle Out", resource: MODULES.VEHICLE_OUT, action: ACTIONS.VIEW },
  { route: ROUTES.VEHICLE_360_DASHBOARD, icon: Globe, label: "Vehicle 360", resource: MODULES.VEHICLE_360, action: ACTIONS.VIEW },
  // Customer Profile — HIDDEN from the sidebar deliberately.
  //
  // The screen loads entirely from ?custSequenceId=, so clicking a plain nav
  // link opened it with no customer: an empty shell showing "—" for every
  // field and a placeholder id (CUST-2024-1847), which reads as a broken page.
  //
  // It is reached instead by selecting a customer (search / appointment /
  // Vehicle 360), which supplies the query parameter. The ROUTE still exists
  // and works — only the nav entry is removed. Restore this line if the screen
  // ever gains a customer picker of its own.
  // { route: ROUTES.CUSTOMER_PROFILE_DASHBOARD, icon: User, label: "Customer Profile", resource: MODULES.CUSTOMER_PROFILE, action: ACTIONS.VIEW },
  { route: ROUTES.MODEL_SERVICE_TYPE, icon: Wrench, label: "Model Service Types", resource: MODULES.ROLE_MANAGEMENT, action: ACTIONS.VIEW },
  { route: ROUTES.LABOUR_MASTER, icon: Wrench, label: "Labour Master", resource: MODULES.ROLE_MANAGEMENT, action: ACTIONS.VIEW },
  { route: ROUTES.TECHNICIAN_DASHBOARD, icon: Wrench, label: "Technician", resource: MODULES.TECHNICIAN, action: ACTIONS.VIEW },
  { route: ROUTES.FOREMAN_DASHBOARD, icon: Wrench, label: "Workshop", resource: MODULES.WORKSHOP, action: ACTIONS.VIEW },
  { route: ROUTES.QC_OUT_INSPECTION_DASHBOARD, icon: ShieldCheck, label: "QC Out", resource: MODULES.QC_OUT, action: ACTIONS.VIEW },
  { route: ROUTES.WASHBAY_DASHBOARD, icon: Droplets, label: "Washbay", resource: MODULES.WASHBAY, action: ACTIONS.VIEW },
  { route: ROUTES.WARRANTY_STORE, icon: BadgeAlert, label: "Warranty Store", resource: MODULES.WARRANTY, action: ACTIONS.VIEW },
  { route: ROUTES.FINANCE_BILLING_DASHBOARD, icon: Receipt, label: "Billing", resource: MODULES.INVOICING, action: ACTIONS.VIEW },
  { route: ROUTES.GATE_RELEASE, icon: KeyRound, label: "Gate Release", resource: MODULES.GATE_RELEASE, action: ACTIONS.VIEW },
  { route: ROUTES.VEHICLE_SALES, icon: CarFront, label: "Vehicle Sales", resource: VEHICLE_SALES_MODULES[0].key, anyResource: VEHICLE_SALES_MODULES.map((m) => m.key), action: ACTIONS.VIEW },
];

export function Sidebar({ open, setOpen }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = useAuth();

  const isActive = (path: string) => location.pathname.startsWith(path);

  const handleNavigation = (path: string) => {
    navigate(path);
    setOpen(false);
    setFlyoutOpen(false);
  };

  // Filter nav items by permission
  const visibleItems = NAV_ITEMS.filter((item) =>
    item.anyResource ? item.anyResource.some((r) => hasPermission(r, item.action)) : hasPermission(item.resource, item.action),
  );

  // Vehicle Sales has 12 modules / 68 screens, so hovering its icon (desktop)
  // opens their list beside the rail. A short close delay lets the pointer
  // cross the gap from the icon into the panel.
  const railRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [flyoutLeft, setFlyoutLeft] = useState(110);
  const openFlyout = () => {
    window.clearTimeout(closeTimer.current);
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    setFlyoutLeft(railRef.current?.getBoundingClientRect().right ?? 110);
    setFlyoutOpen(true);
  };
  const scheduleClose = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setFlyoutOpen(false), 200);
  };
  const closeFlyout = useCallback(() => setFlyoutOpen(false), []);
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  // Sales-only roles (Sales Executive, Sales Manager, F&I) have Vehicle Sales as
  // their only module, so the icon rail + hover flyout adds a step for nothing:
  // their sidebar IS the Vehicle Sales menu, always open.
  if (visibleItems.length === 1 && visibleItems[0].route === ROUTES.VEHICLE_SALES) {
    const settingsActive = isActive(ROUTES.SETTINGS);
    return (
      <>
        {open && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setOpen(false)} />}
        <aside
          className={`
            fixed lg:static z-50 top-0 left-0 h-screen w-[260px] shrink-0
            bg-white border-r border-[#ebebeb] flex flex-col
            transform transition-transform duration-300
            ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
          `}
        >
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#f0f0f0]">
            <img src="/logo.png" alt="ELT Group" className="w-20 h-auto object-contain" />
            <button className="lg:hidden bg-white rounded-lg p-1.5 hover:bg-[#f5f5f5]" onClick={() => setOpen(false)} aria-label="Close menu">
              <X size={18} />
            </button>
          </div>
          <p className="px-5 pt-4 pb-2 text-[15px] font-semibold text-[#333]">Vehicle Sales</p>
          <div className="flex-1 overflow-y-auto px-3 pb-3 scrollbar-hide">
            <ModuleNav onNavigate={() => setOpen(false)} />
          </div>
          <div className="px-3 py-3 border-t border-[#f0f0f0]">
            <button
              type="button"
              onClick={() => handleNavigation(ROUTES.SETTINGS)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium cursor-pointer ${
                settingsActive ? "bg-[#fff1ee] text-[#ff4f31]" : "text-[#333] hover:bg-[#f5f5f5]"
              }`}
            >
              <Settings size={16} className={settingsActive ? "text-[#ff4f31]" : "text-[#999]"} /> Settings
            </button>
          </div>
        </aside>
      </>
    );
  }

  return (
    <>
      {/* Overlay Mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        ref={railRef}
        className={`
          fixed lg:static z-50
          top-0 left-0
          h-screen
          w-22.5 sm:w-25 lg:w-27.5
          bg-white border-r border-[#ebebeb]
          flex flex-col items-center pt-5
          transform transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        <button
          className={`lg:hidden absolute top-4 ${
            open ? "-right-6" : "right-0"
          } bg-white rounded-lg p-2 shadow`}
          onClick={() => setOpen(false)}
        >
          <X />
        </button>

        {/* Company Logo */}
        <img
          src="/logo.png"
          alt="ELT Group"
          className="w-16 sm:w-18 lg:w-20 h-auto object-contain mb-5"
        />

        {!open && (
          <button className="bg-[#fbfbfb] border border-[#ebebeb] rounded-[10px] p-3 w-12.5 h-12.5 flex items-center justify-center mb-5">
            <Menu className="w-6 h-6 text-[#333]" />
          </button>
        )}

        {/* Permission-based nav items — scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden w-full flex flex-col items-center scrollbar-hide">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.route);
            const hasFlyout = item.route === ROUTES.VEHICLE_SALES;
            return (
              <div
                key={item.route}
                className="relative group mb-4 flex flex-col items-center w-full px-2"
                {...(hasFlyout ? { onMouseEnter: openFlyout, onMouseLeave: scheduleClose } : {})}
              >
                <button
                  title={item.label}
                  className={`rounded-[10px] p-3 w-12.5 h-12.5 flex items-center justify-center transition-all cursor-pointer ${
                    active
                      ? "bg-linear-to-b from-[#ff4f31] to-[#fe2b73] shadow-md"
                      : "bg-[#fbfbfb] border border-[#ebebeb] hover:bg-[#f5f5f5]"
                  }`}
                  onClick={() => handleNavigation(item.route)}
                >
                  <Icon className={active ? "text-white" : "text-gray-400"} />
                </button>
                <span
                  className={`mt-1 text-[10px] leading-tight text-center w-full truncate ${
                    active ? "text-[#ff4f31] font-semibold" : "text-gray-500"
                  }`}
                >
                  {item.label}
                </span>
                {/* Hover tooltip (shows full label to the right) — the flyout replaces it for Vehicle Sales */}
                <span className={`${hasFlyout ? "hidden" : ""} pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap bg-[#1f1f1f] text-white text-[11px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-60 shadow-lg`}>
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="relative group mb-5 flex flex-col items-center w-full px-2">
          <button
            title="Settings"
            className={`rounded-[10px] p-3 w-12.5 h-12.5 flex items-center justify-center transition-all cursor-pointer ${
              isActive(ROUTES.SETTINGS)
                ? "bg-linear-to-b from-[#ff4f31] to-[#fe2b73] shadow-md"
                : "bg-[#fbfbfb] border border-[#ebebeb] hover:bg-[#f5f5f5]"
            }`}
            onClick={() => handleNavigation(ROUTES.SETTINGS)}
          >
            <Settings className={isActive(ROUTES.SETTINGS) ? "text-white" : "text-gray-400"} />
          </button>
          <span
            className={`mt-1 text-[10px] leading-tight text-center w-full truncate ${
              isActive(ROUTES.SETTINGS) ? "text-[#ff4f31] font-semibold" : "text-gray-500"
            }`}
          >
            Settings
          </span>
          <span className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap bg-[#1f1f1f] text-white text-[11px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-60 shadow-lg">
            Settings
          </span>
        </div>

        {/* Customer Approval, Customer Profile, Spare Parts, Technician, Finance & Billing — commented out for now
        <button className="..." onClick={() => handleNavigation(ROUTES.CUSTOMER_APPROVAL_DASHBOARD)}><BadgeCheck /></button>
        <button className="..." onClick={() => handleNavigation(ROUTES.CUSTOMER_PROFILE_DASHBOARD)}><User /></button>
        <button className="..." onClick={() => handleNavigation(ROUTES.SPARE_PARTS_DASHBOARD)}><Package /></button>
        <button className="..." onClick={() => handleNavigation(ROUTES.TECHNICIAN_DASHBOARD)}><Wrench /></button>
        <button className="..." onClick={() => handleNavigation(ROUTES.FINANCE_BILLING_DASHBOARD)}><Receipt /></button>
        */}
      </aside>

      <SidebarFlyout
        open={flyoutOpen}
        left={flyoutLeft}
        title="Vehicle Sales"
        onPointerEnter={openFlyout}
        onPointerLeave={scheduleClose}
        onClose={closeFlyout}
      >
        <ModuleNav onNavigate={closeFlyout} />
      </SidebarFlyout>
    </>
  );
}
