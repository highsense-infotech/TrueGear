import { Wrench } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

// Small indicator shown on scoped dashboards so a Service/Major-shop user knows
// the list is filtered to their shop. Renders nothing for unrestricted (ALL)
// users and super-admins. Presentation only — the backend does the filtering.
export function ShopScopeBadge({ className = "" }: { className?: string }) {
  const { shopScope } = useAuth();
  if (shopScope === "ALL") return null;
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full bg-[#fff5f2] border border-[#ffd9cc] px-3 py-1 text-[12px] font-medium text-[#ff4f31] ${className}`}
    >
      <Wrench className="w-3.5 h-3.5" />
      Showing {shopScope === "MAJOR" ? "Major" : "Service"} Shop only
    </div>
  );
}
