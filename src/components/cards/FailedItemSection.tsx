import { AlertCircle } from "lucide-react";

interface FailedItemData {
  itemCode: string;
  itemLabel: string;
  category: string;
  comment: string | null;
}

interface FailedItemSectionProps {
  title: string;
  description: string;
  items?: FailedItemData[];
}

export function FailedItemSection({ title, description, items = [] }: FailedItemSectionProps) {
  return (
    <div className="bg-white border border-[#ebebeb] rounded-[10px] mb-5">
      {/* Section Header */}
      <div className="bg-[#EDEDED] flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 px-5 gap-2 sm:gap-0 rounded-tr-[10px] rounded-tl-[10px]">
        <div>
          <h3 className="text-[#333] text-[16px] mb-0.5">{title}</h3>
          <p className="text-[#999] text-[12px]">{description}</p>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="p-4 text-center text-[#999] text-sm">No failed items</div>
      ) : (
        items.map((item, index) => (
          <div key={item.itemCode + index} className={`bg-white border border-gray-200 border-t-0 p-4 flex justify-between items-center shadow-sm ${index === items.length - 1 ? 'rounded-b-xl' : ''}`}>
            <div>
              <h5 className="font-semibold text-gray-800 text-sm">{item.itemLabel}</h5>
              <p className="text-xs text-gray-400">{item.comment || item.category}</p>
            </div>
            <div className="flex items-center gap-2 text-red-500 bg-red-50 px-3 py-1.5 rounded-full border border-red-100">
              <AlertCircle size={16} />
              <span className="text-xs font-semibold">Fail</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
