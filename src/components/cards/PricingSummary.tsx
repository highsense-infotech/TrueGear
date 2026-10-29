interface PricingSummaryProps {
  selectedCount: number;
  totalCount: number;
  subtotal: number;
  gst: number;
  total: number;
  taxLabel?: string;
  formatAmount?: (n: number) => string;
}

export function PricingSummary({ selectedCount, totalCount, subtotal, gst, total, taxLabel = "GST", formatAmount }: PricingSummaryProps) {
  const fmt = formatAmount ?? ((n: number) => `₹ ${n.toLocaleString()}`);
  return (
    <div className="bg-white rounded-[10px] border border-[#e5e7eb] p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:gap-6">
        {/* Selected Jobs */}
        <div className="flex items-center justify-between text-[14px] sm:text-[16px]">
          <p className="text-[#999]">Selected Jobs</p>
          <p className="font-semibold text-[#333]">{selectedCount} of {totalCount}</p>
        </div>

        {/* Subtotal */}
        <div className="flex items-center justify-between text-[14px] sm:text-[16px]">
          <p className="text-[#999]">Subtotal</p>
          <p className="font-semibold text-[#333]">{fmt(subtotal)}</p>
        </div>

        {/* Tax */}
        <div className="flex items-center justify-between text-[14px] sm:text-[16px]">
          <p className="text-[#999]">{taxLabel}</p>
          <p className="font-semibold text-[#333]">{fmt(gst)}</p>
        </div>

        {/* Total Estimate */}
        <div className="border-t border-[#e5e7eb] pt-2.5">
          <div className="flex items-center justify-between text-[18px] sm:text-[20px] font-semibold text-[#333]">
            <p>Total Estimate</p>
            <p>{fmt(total)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
