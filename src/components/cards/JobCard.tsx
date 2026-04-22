import { Check, Clock } from "lucide-react";

export type AvailabilityState = "delayed" | "none";

export interface AvailabilityBadge {
  state: AvailabilityState;
  label: string;
}

interface JobCardProps {
  title: string;
  description: string;
  details: string;
  price: string;
  isSelected: boolean;
  onToggle: () => void;
  availability?: AvailabilityBadge;
}

export function JobCard({ title, description, details, price, isSelected, onToggle, availability }: JobCardProps) {
  const showDelayBadge = availability?.state === "delayed";
  return (
    <button
      onClick={onToggle}
      className={`bg-white rounded-[10px] border border-[#e5e7eb] p-4 sm:p-5 w-full transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-[#ff4f31]' : ''
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
        {/* Job Info */}
        <div className="flex items-start gap-3">
          {/* Checkbox Icon */}
          <div className={`${
            isSelected 
              ? 'bg-[#ff4f31] border-[#ebebeb]' 
              : 'bg-white border-[#ebebeb]'
            } flex items-center justify-center rounded-full size-12.5 border shadow-[2px_4px_8px_0px_rgba(0,0,0,0.15)] transition-all shrink-0`}>
            {isSelected ? (
              <Check size={24} color="#fff"/>
            ) : (
              <div className="size-6" />
            )}
          </div>

          {/* Job Details */}
          <div className="flex flex-col gap-1.5 text-left">
            <p className="text-[16px] font-semibold text-[#333]">{title}</p>
            <p className="text-[12px] text-[#999]">{description}</p>
            <p className="text-[12px] text-[#999]">{details}</p>
            {showDelayBadge && (
              <span className="inline-flex items-center gap-1.5 self-start px-2 py-1 rounded-full text-[11px] font-medium bg-[#FFF1E0] text-[#DA5A00]">
                <Clock size={12} />
                {availability!.label}
              </span>
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
