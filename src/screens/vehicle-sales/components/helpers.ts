// Non-component helpers for the Vehicle Sales UI kit (kept out of ui.tsx so
// that file only exports components, as react-refresh requires).

import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { SALES_MODULES, type SalesScreen } from "../registry";

// Form styling, mirrors LabourMaster.
export const inputClass =
  "w-full px-3 py-2.5 border border-[#e5e7eb] rounded-lg text-[13px] text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#ff4f31] focus:border-transparent disabled:bg-[#f9f9f9] disabled:text-[#999]";
export const inputErrorClass =
  "w-full px-3 py-2.5 border border-[#FE2B73] rounded-lg text-[13px] text-[#333] bg-white focus:outline-none focus:ring-2 focus:ring-[#FE2B73] focus:border-transparent";
export const labelClass = "block text-[13px] font-medium text-[#333] mb-1.5";

// Confirmation toast for a saved action (the change is synced to the server
// by data/store.ts; a failed save shows its own error).
export function previewToast(message: string) {
  toast.success(message);
}

/** Name of the logged-in user, for activity logs and approvals. */
export function currentUserName(): string {
  try {
    const user = JSON.parse(localStorage.getItem("tg_auth") ?? "{}")?.user;
    return user?.fullName || user?.username || "Unknown user";
  } catch {
    return "Unknown user";
  }
}

export function useCurrentScreen(): SalesScreen | undefined {
  const { pathname } = useLocation();
  const [, , moduleSlug, screenSlug] = pathname.split("/");
  return SALES_MODULES.find((m) => m.slug === moduleSlug)?.screens.find((s) => s.slug === screenSlug);
}
