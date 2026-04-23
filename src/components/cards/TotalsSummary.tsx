import { useCurrency } from "../../context/CurrencyContext";

interface TotalsSummaryProps {
  subtotal: number;
  taxAmount: number;
  total: number;
}

export function TotalsSummary({ subtotal, taxAmount, total }: TotalsSummaryProps) {
  const { formatCurrency, taxConfig } = useCurrency();

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 flex flex-col items-end gap-4 md:gap-6 shadow-sm">
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

