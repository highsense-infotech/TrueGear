import { AlertTriangle, Check, Clock } from "lucide-react";

type PartStatus = 'pending' | 'available' | 'unavailable' | 'dispatched';

interface JobCardProps {
  title: string;
  description: string;
  details: string;
  price: string;
  isSelected: boolean;
  onToggle: () => void;
  partStatus?: PartStatus | null;
  partExpectedTime?: string | null;
  // Mandatory items (e.g. Labour) are always included and cannot be toggled.
  mandatory?: boolean;
}

function PartStatusBadge({ status, expectedTime }: { status: PartStatus; expectedTime: string | null }) {
  if (status === 'unavailable') {
    return (
      <div className="mt-2 inline-flex items-center gap-2 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] rounded-[6px] px-2.5 py-1.5 text-[12px] font-medium">
        <AlertTriangle size={14} />
        <span>Part not in stock{expectedTime ? ` · ETA: ${expectedTime}` : ''}</span>
      </div>
    );
  }
  if (status === 'pending') {
    return (
      <div className="mt-2 inline-flex items-center gap-2 bg-[#fff8e6] border border-[#fde68a] text-[#a16207] rounded-[6px] px-2.5 py-1.5 text-[12px] font-medium">
        <Clock size={14} />
        <span>Part availability pending</span>
      </div>
    );
  }
  return null;
}

export function JobCard({ title, description, details, price, isSelected, onToggle, partStatus, partExpectedTime, mandatory = false }: JobCardProps) {
  // Mandatory items are always shown as included and are not clickable.
  const shown = isSelected || mandatory;
  return (
    <button
      type="button"
      onClick={mandatory ? undefined : onToggle}
      disabled={mandatory}
      className={`bg-white rounded-[10px] border border-[#e5e7eb] p-4 sm:p-5 w-full transition-all ${
        mandatory ? 'cursor-default' : 'hover:shadow-md'
      } ${shown ? 'ring-2 ring-[#ff4f31]' : ''}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
        {/* Job Info */}
        <div className="flex items-start gap-3">
          {/* Checkbox Icon */}
          <div className={`${
            shown
              ? 'bg-[#ff4f31] border-[#ebebeb]'
              : 'bg-white border-[#ebebeb]'
            } flex items-center justify-center rounded-full size-12.5 border shadow-[2px_4px_8px_0px_rgba(0,0,0,0.15)] transition-all shrink-0`}>
            {shown ? (
              <Check size={24} color="#fff"/>
            ) : (
              <div className="size-6" />
            )}
          </div>

          {/* Job Details */}
          <div className="flex flex-col gap-1.5 text-left">
            <div className="flex items-center gap-2">
              <p className="text-[16px] font-semibold text-[#333]">{title}</p>
              {mandatory && (
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[#ff4f31] bg-[#fff0ed] rounded-[5px] px-1.5 py-0.5">
                  Mandatory
                </span>
              )}
            </div>
            <p className="text-[12px] text-[#999]">{description}</p>
            <p className="text-[12px] text-[#999]">{details}</p>
            {partStatus && (partStatus === 'unavailable' || partStatus === 'pending') && (
              <PartStatusBadge status={partStatus} expectedTime={partExpectedTime ?? null} />
            )}
          </div>
        </div>

        {/* Price */}
        <div className="text-[16px] font-semibold text-[#333] text-left sm:text-right mt-2 sm:mt-0 pl-14 sm:pl-0">
          {price}
        </div>
      </div>
    </button>
  );
}
