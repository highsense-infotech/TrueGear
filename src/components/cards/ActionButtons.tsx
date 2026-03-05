import { SquarePen } from "lucide-react";

interface ActionButtonsProps {
  selectedCount: number;
  total: number;
  onRequestModification: () => void;
  onApprove: () => void;
  approving?: boolean;
}

export function ActionButtons({ selectedCount, total, onRequestModification, onApprove, approving = false }: ActionButtonsProps) {
  return (
    <div className="bg-white rounded-[10px] border border-[#e5e7eb] p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
        <div className="flex flex-col gap-1.5">
          <p className="text-[14px] sm:text-[16px] font-semibold text-[#333]">{selectedCount} job(s) selected</p>
          <p className="text-[12px] text-[#999]">Total: ₹{total.toLocaleString()}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-6 w-full sm:w-auto">
          <button
            onClick={onRequestModification}
            className="bg-white flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2.5 rounded-[5px] border border-[#e5e7eb] hover:bg-gray-50 transition-colors"
          >
            <SquarePen size={20} color="#333" />
            <span className="text-[14px] sm:text-[16px] font-medium text-[#333]">Request Modification</span>
          </button>
          <button
            onClick={onApprove}
            disabled={selectedCount === 0 || approving}
            className={`bg-[#1db401] flex items-center justify-center gap-2.5 px-5 sm:px-8 py-3 sm:py-3.25 rounded-[10px] shadow-[2px_4px_8px_0px_rgba(0,0,0,0.15)] transition-all cursor-pointer ${
              selectedCount === 0 || approving ? "opacity-50 cursor-not-allowed" : "hover:bg-[#19a001]"
            }`}
          >
            {approving ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            )}
            <span className="text-[14px] sm:text-[16px] font-medium text-white">
              {approving ? 'Approving...' : 'Approve Selected Jobs'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

