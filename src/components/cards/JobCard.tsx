import { Check } from "lucide-react";


interface JobCardProps {
  title: string;
  description: string;
  details: string;
  price: string;
  isSelected: boolean;
  onToggle: () => void;
}

export function JobCard({ title, description, details, price, isSelected, onToggle }: JobCardProps) {
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
