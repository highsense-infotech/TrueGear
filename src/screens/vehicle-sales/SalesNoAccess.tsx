import { Link, useLocation } from "react-router-dom";
import { Lock } from "lucide-react";
import { ACTIONS } from "../../constants/permissions";
import { findScreen, findModule, VEHICLE_SALES_BASE } from "./registry";
import { salesResource, screenAction } from "./access";

// Shown in place of a Vehicle Sales module or screen the user's role can't
// open. Names the permission needed so an admin can grant it.
export function SalesNoAccess() {
  const { pathname } = useLocation();
  const [, , moduleSlug, screenSlug] = pathname.split("/");
  const module = findModule(moduleSlug);
  const found = findScreen(moduleSlug, screenSlug);
  const action = found ? screenAction(moduleSlug, screenSlug) : ACTIONS.VIEW;
  const needed = [`${salesResource(moduleSlug)}:view`, ...(action !== ACTIONS.VIEW ? [`${salesResource(moduleSlug)}:${action}`] : [])];

  return (
    <div className="bg-white border border-[#e5e7eb] rounded-xl px-6 py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-[#fff1ee] flex items-center justify-center mx-auto mb-3">
        <Lock className="w-6 h-6 text-[#ff4f31]" />
      </div>
      <p className="text-[16px] font-semibold text-[#333]">You don't have access to {found?.screen.label ?? module?.label ?? "this page"}</p>
      <p className="text-[13px] text-[#666] mt-1">
        Your role needs <span className="font-mono text-[12px]">{needed.join(" + ")}</span>. Ask an administrator to grant it in Role &amp; User Management.
      </p>
      <Link to={VEHICLE_SALES_BASE} className="inline-block mt-5 text-[13px] text-[#ff4f31] font-medium hover:underline">Back to Vehicle Sales</Link>
    </div>
  );
}
