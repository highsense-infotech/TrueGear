import { FileText, Clock, Send, CheckCircle2 } from "lucide-react";
import Button from "../common/Button";
import { useCurrency } from "../../context/CurrencyContext";
import type { SAJobCard } from "../../api/serviceAdvisor.api";

interface JobCardSummaryProps {
  jobCard: SAJobCard;
  onViewClick: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  DRAFT: { label: "Draft", bg: "bg-gray-100", text: "text-gray-600" },
  SHARED: { label: "Shared", bg: "bg-blue-50", text: "text-blue-600" },
  APPROVED: { label: "Approved", bg: "bg-green-50", text: "text-green-600" },
  PARTIALLY_APPROVED: { label: "Partially Approved", bg: "bg-amber-50", text: "text-amber-600" },
  IN_SERVICE: { label: "In Service", bg: "bg-orange-50", text: "text-orange-600" },
  COMPLETED: { label: "Completed", bg: "bg-emerald-50", text: "text-emerald-600" },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function JobCardSummary({ jobCard, onViewClick }: JobCardSummaryProps) {
  const { formatCurrency } = useCurrency();
  const statusConfig = STATUS_CONFIG[jobCard.status] || STATUS_CONFIG.DRAFT;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-b from-[#ff4f31] to-[#fe2b73] flex items-center justify-center">
            <FileText size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Job Card</h3>
            <p className="text-xs text-gray-400 truncate max-w-[180px]">
              {jobCard.id.slice(0, 8)}...
            </p>
          </div>
        </div>
        <span className={`text-xs font-semibold px-3 py-1 rounded-md ${statusConfig.bg} ${statusConfig.text}`}>
          {statusConfig.label}
        </span>
      </div>

      {/* Financial Summary */}
      <div className="px-5 py-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Subtotal</span>
          <span className="font-medium text-gray-800">
            {formatCurrency(Number(jobCard.subtotal))}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">
            {jobCard.taxLabel} ({Number(jobCard.taxPercentage)}%)
          </span>
          <span className="font-medium text-gray-800">
            {formatCurrency(Number(jobCard.taxAmount))}
          </span>
        </div>
        <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
          <span className="font-semibold text-gray-800">Total Estimate</span>
          <span className="font-bold text-gray-800">
            {formatCurrency(Number(jobCard.totalEstimate))}
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="px-5 py-4 border-t border-gray-100 space-y-2">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Clock size={14} />
          <span>Created: {formatDate(jobCard.createdAt)}</span>
        </div>
        {jobCard.sharedAt && (
          <div className="flex items-center gap-2 text-xs text-blue-500">
            <Send size={14} />
            <span>Shared: {formatDate(jobCard.sharedAt)}</span>
          </div>
        )}
        {jobCard.approvedAt && (
          <div className="flex items-center gap-2 text-xs text-green-500">
            <CheckCircle2 size={14} />
            <span>Approved: {formatDate(jobCard.approvedAt)}</span>
          </div>
        )}
      </div>

      {/* Action */}
      <div className="px-5 py-4 border-t border-gray-100">
        <Button variant="gradient" className="w-full" onClick={onViewClick}>
          View Job Card
        </Button>
      </div>
    </div>
  );
}
