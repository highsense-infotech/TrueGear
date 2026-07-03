import { useNavigate, useLocation } from "react-router-dom";
import { Menu, X, CheckCircle, ShieldUser, ClipboardList, Settings, Package, Users, Tag, CalendarDays, Globe, Wrench, CarFront, ShieldCheck, Droplets, BadgeAlert, Receipt, KeyRound } from "lucide-react";
// import { BadgeCheck, User, Receipt } from "lucide-react";
import { ROUTES } from "../../constants/routes";
import { useAuth } from "../../context/AuthContext";
import { MODULES, ACTIONS } from "../../constants/permissions";
import type { LucideIcon } from "lucide-react";

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
  { route: ROUTES.VEHICLE_OUT_DASHBOARD, icon: CarFront, label: "Vehicle Out", resource: MODULES.VEHICLE_OUT, action: ACTIONS.VIEW },
  { route: ROUTES.VEHICLE_360_DASHBOARD, icon: Globe, label: "Vehicle 360", resource: MODULES.VEHICLE_360, action: ACTIONS.VIEW },
  { route: ROUTES.MODEL_SERVICE_TYPE, icon: Wrench, label: "Model Service Types", resource: MODULES.ROLE_MANAGEMENT, action: ACTIONS.VIEW },
  { route: ROUTES.TECHNICIAN_DASHBOARD, icon: Wrench, label: "Technician", resource: MODULES.TECHNICIAN, action: ACTIONS.VIEW },
  { route: ROUTES.FOREMAN_DASHBOARD, icon: Wrench, label: "Workshop", resource: MODULES.WORKSHOP, action: ACTIONS.VIEW },
  { route: ROUTES.QC_OUT_INSPECTION_DASHBOARD, icon: ShieldCheck, label: "QC Out", resource: MODULES.QC_OUT, action: ACTIONS.VIEW },
  { route: ROUTES.WASHBAY_DASHBOARD, icon: Droplets, label: "Washbay", resource: MODULES.WASHBAY, action: ACTIONS.VIEW },
  { route: ROUTES.WARRANTY_STORE, icon: BadgeAlert, label: "Warranty Store", resource: MODULES.WARRANTY, action: ACTIONS.VIEW },
  { route: ROUTES.FINANCE_BILLING_DASHBOARD, icon: Receipt, label: "Billing", resource: MODULES.INVOICING, action: ACTIONS.VIEW },
  { route: ROUTES.GATE_RELEASE, icon: KeyRound, label: "Gate Release", resource: MODULES.GATE_RELEASE, action: ACTIONS.VIEW },
];

export function Sidebar({ open, setOpen }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = useAuth();

  const isActive = (path: string) => location.pathname.startsWith(path);

  const handleNavigation = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  // Filter nav items by permission
  const visibleItems = NAV_ITEMS.filter((item) => hasPermission(item.resource, item.action));

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
            return (
              <div key={item.route} className="relative group mb-4 flex flex-col items-center w-full px-2">
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
                {/* Hover tooltip (shows full label to the right) */}
                <span className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap bg-[#1f1f1f] text-white text-[11px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-60 shadow-lg">
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
    </>
  );
}
