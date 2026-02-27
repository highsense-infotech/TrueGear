import { useNavigate, useLocation } from "react-router-dom";
import { Menu, X, CheckCircle, ShieldUser, ClipboardList, Settings } from "lucide-react";
// import { BadgeCheck, User, Package, Wrench, Receipt } from "lucide-react";
import { ROUTES } from "../../constants/routes";
import { useAuth } from "../../context/AuthContext";
import type { LucideIcon } from "lucide-react";

interface Props {
  open: boolean;
  setOpen: (val: boolean) => void;
}

interface NavItem {
  route: string;
  icon: LucideIcon;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { route: ROUTES.SECURITY_DASHBOARD, icon: ShieldUser, roles: ['security-gate-keeper'] },
  { route: ROUTES.QUALITY_CHECK_DASHBOARD, icon: CheckCircle, roles: ['qc-inspector'] },
  { route: ROUTES.SERVICE_ADVISOR_DASHBOARD, icon: ClipboardList, roles: ['customer', 'service-advisor'] },
];

export function Sidebar({ open, setOpen }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const roleSlug = user?.role?.slug || '';

  const isActive = (path: string) => location.pathname.startsWith(path);

  const handleNavigation = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  // Filter nav items by user's role (super-admin sees all)
  const visibleItems = NAV_ITEMS.filter(
    (item) => roleSlug === 'super-admin' || item.roles.includes(roleSlug)
  );

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

        {!open && (
          <button className="bg-[#fbfbfb] border border-[#ebebeb] rounded-[10px] p-3 w-12.5 h-12.5 flex items-center justify-center mb-5">
            <Menu className="w-6 h-6 text-[#333]" />
          </button>
        )}

        {/* Role-based nav items */}
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.route);
          return (
            <button
              key={item.route}
              className={`rounded-[10px] p-3 w-12.5 h-12.5 flex items-center justify-center transition-all cursor-pointer mb-5 ${
                active
                  ? "bg-linear-to-b from-[#ff4f31] to-[#fe2b73] shadow-md"
                  : "bg-[#fbfbfb] border border-[#ebebeb] hover:bg-[#f5f5f5]"
              }`}
              onClick={() => handleNavigation(item.route)}
            >
              <Icon className={active ? "text-white" : "text-gray-400"} />
            </button>
          );
        })}

        <div className="flex-1" />
        <button
          className={`rounded-[10px] p-3 w-12.5 h-12.5 flex items-center justify-center transition-all cursor-pointer mb-5 ${
            isActive(ROUTES.SETTINGS)
              ? "bg-linear-to-b from-[#ff4f31] to-[#fe2b73] shadow-md"
              : "bg-[#fbfbfb] border border-[#ebebeb] hover:bg-[#f5f5f5]"
          }`}
          onClick={() => handleNavigation(ROUTES.SETTINGS)}
        >
          <Settings className={isActive(ROUTES.SETTINGS) ? "text-white" : "text-gray-400"} />
        </button>

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
