import { FileText } from "lucide-react";

interface ServiceHistoryItemProps {
  title: string;
  date: string;
  advisor: string;
  price: string;
  duration: string;
}

export function ServiceHistoryItem({
  title,
  date,
  advisor,
  price,
  duration,
}: ServiceHistoryItemProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
      <div className="flex items-center gap-3 md:gap-4">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-linear-to-b from-[#ff4f31] to-[#fe2b73] flex items-center justify-center text-white shadow-md shadow-red-100 shrink-0">
          <FileText size={18} strokeWidth={2} className="md:w-5 md:h-5" />
        </div>
        <div>
          <h4 className="text-sm md:text-base font-semibold text-gray-800">{title}</h4>
          <p className="text-xs text-gray-400 mt-0.5 md:mt-1">
            {date} - {advisor}
          </p>
        </div>
      </div>

      <div className="text-left sm:text-right">
        <p className="text-sm md:text-base font-semibold text-gray-800">{price}</p>
        <p className="text-xs text-gray-400 mt-0.5 md:mt-1">{duration}</p>
      </div>
    </div>
  );
}

export type { ServiceHistoryItemProps };

