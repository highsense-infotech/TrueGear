import { Save, ArrowRight } from "lucide-react";
import Button from "../common/Button";
import { useCurrency } from "../../context/CurrencyContext";

interface JobCardActionsProps {
  jobCount: number;
  total: number;
  onSaveDraft?: () => void;
  onShareEstimate?: () => void;
}

export function JobCardActions({ 
  jobCount, 
  total, 
  onSaveDraft, 
  onShareEstimate 
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
          icon={<Save size={20} className="text-gray-800" />}
          className="px-4 md:px-5 py-3 rounded-md shadow-sm"
        >
          <span className="text-sm md:text-base font-medium text-gray-800">
            Save Draft
          </span>
        </Button>
        <Button
          variant="gradient"
          onClick={onShareEstimate}
          icon={<ArrowRight size={20} className="text-white" />}
        >
          <span className="text-sm md:text-base font-medium">
            Save & Continue
          </span>
        </Button>
      </div>
    </div>
  );
}

export type { JobCardActionsProps };

