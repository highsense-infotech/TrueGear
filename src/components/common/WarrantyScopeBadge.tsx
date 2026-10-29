import { BadgeAlert } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

// Shown on the job-card dashboard for a warranty-only clerk so it's clear the
// list is filtered to warranty jobs. Renders nothing for other users.
// Presentation only — the backend does the filtering.
export function WarrantyScopeBadge({ className = "" }: { className?: string }) {
  const { warrantyOnly } = useAuth();
  if (!warrantyOnly) return null;
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full bg-[#fff7ed] border border-[#fed7aa] px-3 py-1 text-[12px] font-medium text-[#c2410c] ${className}`}
    >
      <BadgeAlert className="w-3.5 h-3.5" />
      Showing Warranty jobs only
    </div>
  );
}
