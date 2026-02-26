import { Trash2 } from "lucide-react";
import Button from "../common/Button";
import Input from "../common/Input";
import { useCurrency } from "../../context/CurrencyContext";

export interface Job {
  id: number;
  jobDescription: string;
  partsRequired: string;
  partsCost: number;
  labourCost: number;
  quantity: number;
}

export interface JobErrors {
  jobDescription?: string;
  partsCost?: string;
  labourCost?: string;
  quantity?: string;
}

interface JobRowProps {
  job: Job;
  index: number;
  onUpdate: (id: number, field: keyof Job, value: string | number) => void;
  onRemove: (id: number) => void;
  calculateLineTotal: (job: Job) => number;
  errors?: JobErrors;
}

export function JobRow({ job, index, onUpdate, onRemove, calculateLineTotal, errors }: JobRowProps) {
  const { formatCurrency, currencyOption } = useCurrency();
  const symbol = currencyOption.symbol;

  const labelClass = "text-gray-400 text-sm md:text-base";

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
        <span className="text-base font-medium text-gray-400">
          Job #{index + 1}
        </span>
        <Button
          variant="custom"
          customStyles={{
            background: "transparent",
            border: "transparent",
            text: "#ef4444",
            hoverBg: "#fef2f2",
          }}
          onClick={() => onRemove(job.id)}
          className="p-2"
        >
          <Trash2 size={20} />
        </Button>
      </div>

      {/* Job Description and Parts Required - Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="w-full">
          <Input
            label="Job Description"
            labelClassName={labelClass}
            type="text"
            value={job.jobDescription}
            onChange={(e) => onUpdate(job.id, "jobDescription", e.target.value)}
            placeholder="Enter job description"
            error={errors?.jobDescription}
            className="w-full h-10 px-4 md:px-5 py-2 bg-white border border-gray-200 rounded-md text-gray-800 text-sm md:text-base font-medium"
          />
        </div>
        <div className="w-full">
          <Input
            label="Parts Required"
            labelClassName={labelClass}
            type="text"
            value={job.partsRequired}
            onChange={(e) => onUpdate(job.id, "partsRequired", e.target.value)}
            placeholder="Enter parts required"
            className="w-full h-10 px-4 md:px-5 py-2 bg-white border border-gray-200 rounded-md text-gray-800 text-sm md:text-base font-medium"
          />
        </div>
      </div>

      {/* Cost Fields - Grid Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="w-full">
          <Input
            label="Parts Cost"
            labelClassName={labelClass}
            type="number"
            prefix={symbol}
            value={job.partsCost}
            onChange={(e) => onUpdate(job.id, "partsCost", Number(e.target.value))}
            placeholder="0"
            error={errors?.partsCost}
            className="w-full h-10 px-4 md:px-5 py-2 bg-white border border-gray-200 rounded-md text-gray-800 text-sm md:text-base font-semibold"
          />
        </div>
        <div className="w-full">
          <Input
            label="Labour Cost"
            labelClassName={labelClass}
            type="number"
            prefix={symbol}
            value={job.labourCost}
            onChange={(e) => onUpdate(job.id, "labourCost", Number(e.target.value))}
            placeholder="0"
            error={errors?.labourCost}
            className="w-full h-10 px-4 md:px-5 py-2 bg-white border border-gray-200 rounded-md text-gray-800 text-sm md:text-base font-semibold"
          />
        </div>
        <div className="w-full">
          <Input
            label="Quantity"
            labelClassName={labelClass}
            type="number"
            value={job.quantity}
            onChange={(e) => onUpdate(job.id, "quantity", Number(e.target.value))}
            min={1}
            error={errors?.quantity}
            className="w-full h-10 px-4 md:px-5 py-2 bg-white border border-gray-200 rounded-md text-gray-800 text-sm md:text-base font-semibold"
          />
        </div>
        <div className="w-full">
          <label className="block text-sm md:text-base font-medium text-gray-400 mb-2 md:mb-3">
            Line Total
          </label>
          <div className="w-full h-10 px-4 md:px-5 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-800 text-sm md:text-base font-semibold flex items-center">
            {formatCurrency(calculateLineTotal(job))}
          </div>
        </div>
      </div>
    </div>
  );
}

export type { JobRowProps };

