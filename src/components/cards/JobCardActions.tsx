import { Save, ArrowRight } from "lucide-react";
import Button from "../common/Button";
import { useCurrency } from "../../context/CurrencyContext";

interface JobCardActionsProps {
  jobCount: number;
  total: number;
  onSaveDraft?: () => void;
  onShareEstimate?: () => void;
  savingType?: 'draft' | 'estimate' | null;
}

export function JobCardActions({
  jobCount,
  total,
  onSaveDraft,
  onShareEstimate,
  savingType = null
}: JobCardActionsProps) {
  const { formatCurrency } = useCurrency();

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
      <div>
        <h3 className="text-base font-semibold text-gray-800">
          Ready to save job card?
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          {jobCount} job(s) - Total: {formatCurrency(total)}
        </p>
      </div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-6 w-full sm:w-auto">
        <Button
          variant="custom"
          customStyles={{
            background: "white",
            border: "#e5e7eb",
            text: "#1f2937",
            hoverBg: "#f9fafb",
          }}
          onClick={onSaveDraft}
          disabled={!!savingType}
          icon={<Save size={20} className="text-gray-800" />}
          className="px-4 md:px-5 py-3 rounded-md shadow-sm"
        >
          <span className="text-sm md:text-base font-medium text-gray-800">
            {savingType === 'draft' ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
                Saving...
              </span>
            ) : "Save Draft"}
          </span>
        </Button>
        <Button
          variant="gradient"
          onClick={onShareEstimate}
          disabled={!!savingType}
          icon={savingType !== 'estimate' ? <ArrowRight size={20} className="text-white" /> : undefined}
        >
          <span className="text-sm md:text-base font-medium">
            {savingType === 'estimate' ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </span>
            ) : "Save & Continue"}
          </span>
        </Button>
      </div>
    </div>
  );
}

export type { JobCardActionsProps };

