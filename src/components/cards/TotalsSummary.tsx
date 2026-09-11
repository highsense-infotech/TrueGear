import { useCurrency } from "../../context/CurrencyContext";

interface TotalsSummaryProps {
  // Optional breakdown rows (Phase 2 estimate integration). When provided, the
  // Parts/Labour split is shown above Subtotal. Omitted → backward compatible
  // (e.g. the read-only job-card detail view keeps its original layout).
  partsTotal?: number;
  labourTotal?: number;
  subtotal: number;
  taxAmount: number;
  total: number;
}

export function TotalsSummary({
  partsTotal,
  labourTotal,
  subtotal,
  taxAmount,
  total,
}: TotalsSummaryProps) {
  const { formatCurrency, taxConfig } = useCurrency();
  const showBreakdown = partsTotal !== undefined || labourTotal !== undefined;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 flex flex-col items-end gap-4 md:gap-6 shadow-sm">
      {showBreakdown && (
        <>
          <div className="w-full sm:max-w-xs md:max-w-sm lg:max-w-md xl:max-w-lg flex justify-between items-center text-sm md:text-base">
            <span className="text-gray-400">Parts Total</span>
            <span className="font-semibold text-gray-800">{formatCurrency(partsTotal ?? 0)}</span>
          </div>
          <div className="w-full sm:max-w-xs md:max-w-sm lg:max-w-md xl:max-w-lg flex justify-between items-center text-sm md:text-base">
            <span className="text-gray-400">Labour Total</span>
            <span className="font-semibold text-gray-800">{formatCurrency(labourTotal ?? 0)}</span>
          </div>
        </>
      )}
      <div className="w-full sm:max-w-xs md:max-w-sm lg:max-w-md xl:max-w-lg flex justify-between items-center text-sm md:text-base">
        <span className="text-gray-400">Subtotal</span>
        <span className="font-semibold text-gray-800">{formatCurrency(subtotal)}</span>
      </div>
      <div className="w-full sm:max-w-xs md:max-w-sm lg:max-w-md xl:max-w-lg flex justify-between items-center text-sm md:text-base">
        <span className="text-gray-400">{taxConfig.label} ({taxConfig.percentage}%)</span>
        <span className="font-semibold text-gray-800">{formatCurrency(taxAmount)}</span>
      </div>
      <div className="w-full sm:max-w-xs md:max-w-sm lg:max-w-md xl:max-w-lg border-t border-gray-200 pt-3 flex justify-between items-center text-lg md:text-xl text-gray-800 font-semibold">
        <span>Total Estimate</span>
        <span>{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

export type { TotalsSummaryProps };

