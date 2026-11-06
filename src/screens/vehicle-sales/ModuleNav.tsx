import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { CarFront, ChevronDown } from "lucide-react";
import { cn } from "../../components/utils/cn";
import { VEHICLE_SALES_BASE, screenPath } from "./registry";
import { useVisibleModules } from "./access";

// Secondary navigation for the Vehicle Sales module: the 12 modules and their
// screens (CRM / Enquiry split under sub-headings). Detail / step screens
// (navHidden) are reached from other screens, so they are not listed. The main TrueGear sidebar
// is a flat icon rail, so this opens as a flyout when the Vehicle Sales icon is
// hovered (desktop) and as the "Browse screens" drawer on smaller screens.
export function ModuleNav({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const activeModule = pathname.startsWith(VEHICLE_SALES_BASE) ? pathname.split("/")[2] : undefined;
  const [open, setOpen] = useState<string[]>(() => (activeModule ? [activeModule] : []));
  // Role-based: only modules / screens this user may open are listed.
  const modules = useVisibleModules();

  const toggle = (slug: string) => setOpen((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));

  return (
    <nav aria-label="Vehicle Sales modules" className="text-[13px]">
      <NavLink
        to={VEHICLE_SALES_BASE}
        end
        onClick={onNavigate}
        className={({ isActive }) =>
          cn("flex items-center gap-2 px-3 py-2 rounded-lg mb-1 font-medium", isActive ? "bg-[#fff1ee] text-[#ff4f31]" : "text-[#333] hover:bg-[#f5f5f5]")
        }
      >
        <CarFront size={16} /> Overview
      </NavLink>
      {modules.map((m) => {
        const expanded = open.includes(m.slug);
        const isActive = activeModule === m.slug;
        const screens = m.screens.filter((s) => !s.navHidden);
        return (
          <div key={m.slug} className="mb-0.5">
            <button
              type="button"
              onClick={() => toggle(m.slug)}
              aria-expanded={expanded}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left cursor-pointer",
                isActive ? "text-[#ff4f31] font-semibold" : "text-[#333] hover:bg-[#f5f5f5]",
              )}
            >
              <m.icon size={16} className={isActive ? "text-[#ff4f31]" : "text-[#999]"} />
              <span className="flex-1 truncate">{m.label}</span>
              <ChevronDown size={14} className={cn("text-[#bbb] transition-transform", expanded && "rotate-180")} />
            </button>
            {expanded && (
              <ul className="ml-[22px] pl-3 border-l border-[#eee] my-1">
                {screens.map((s, i) => (
                  <li key={s.slug}>
                    {s.group && s.group !== screens[i - 1]?.group && (
                      <p className="px-2 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[#aaa]">{s.group}</p>
                    )}
                    <NavLink
                      to={screenPath(m.slug, s.slug)}
                      onClick={onNavigate}
                      className={({ isActive: a }) =>
                        cn("flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[12px]", a ? "text-[#ff4f31] font-medium bg-[#fff1ee]" : "text-[#555] hover:text-[#333] hover:bg-[#fafafa]")
                      }
                    >
                      <span className="truncate flex-1">{s.label}</span>
                      {s.status !== "ready" && (
                        <span
                          className={cn("w-1.5 h-1.5 rounded-full shrink-0", s.status === "uat" ? "bg-amber-500" : "bg-red-500")}
                          title={s.status === "uat" ? "Evolve link pending UAT" : "Partly – no Evolve API"}
                        />
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}
