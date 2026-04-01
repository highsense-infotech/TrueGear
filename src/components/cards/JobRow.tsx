import { useState } from "react";
import { Trash2, Eye, Package } from "lucide-react";
import toast from "react-hot-toast";
import Button from "../common/Button";
import Modal from "../common/Modal";
import { type DropdownOption } from "../common/SearchableDropdown";
import SearchableDropdown from "../common/SearchableDropdown";
import { useCurrency } from "../../context/CurrencyContext";

export interface AutoPart {
  id: string;
  partCode: string;
  partName: string;
  quantity: string;
  unitPrice: string;
}

export interface Job {
  id: number;
  jobDescription: string;
  partsRequired: string;
  partsCost: number;
  labourCost: number;
  quantity: number;
  serviceType: string;
  serviceCategory: string;
  autoParts?: AutoPart[];
}

export interface JobErrors {
  jobDescription?: string;
  partsCost?: string;
  labourCost?: string;
  quantity?: string;
  serviceType?: string;
  serviceCategory?: string;
}

const SERVICE_CATEGORIES: DropdownOption[] = [
  { id: "B_SERVICE", name: "B Service" },
  { id: "C_SERVICE", name: "C Service" },
  { id: "D_SERVICE", name: "D Service" },
];

interface JobRowProps {
  job: Job;
  index: number;
  onUpdate: (id: number, field: keyof Job, value: string | number) => void;
  onRemove: (id: number) => void;
  calculateLineTotal: (job: Job) => number;
  errors?: JobErrors;
  serviceTypeOptions?: DropdownOption[];
  onServiceCategoryChange?: (jobId: number, categoryCode: string, categoryName: string, serviceTypeId: string) => void;
  totalJobs?: number;
}

export function JobRow({
  job,
  index,
  onUpdate,
  onRemove,
  errors,
  serviceTypeOptions,
  onServiceCategoryChange,
  totalJobs = 1,
}: JobRowProps) {
  const { formatCurrency } = useCurrency();
  const labelClass = "text-gray-400 text-sm md:text-base";
  const hasParts = job.autoParts && job.autoParts.length > 0;
  const [partsModalOpen, setPartsModalOpen] = useState(false);
  const partsTotal = hasParts
    ? job.autoParts!.reduce((sum, p) => sum + (Number(p.quantity) || 1) * (Number(p.unitPrice) || 0), 0)
    : 0;

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
        <span className="text-base font-medium text-gray-400">
          Job #{index + 1}
        </span>
        {totalJobs > 1 && (
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
        )}
      </div>

      {/* Service Type - Radio Options */}
      {serviceTypeOptions && serviceTypeOptions.length > 0 && (
            <div>
              <label className={labelClass}>Service Type</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {serviceTypeOptions.map((st) => {
                  const isSelected = job.serviceType === st.name;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() =>
                        onUpdate(job.id, "serviceType", isSelected ? "" : st.name)
                      }
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all cursor-pointer text-[13px] ${
                        isSelected
                          ? "border-[#ff4f31] bg-[#ff4f31]/5 text-[#ff4f31] font-medium"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? "border-[#ff4f31]" : "border-gray-300"
                        }`}
                      >
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ff4f31]" />
                        )}
                      </span>
                      {st.name}
                    </button>
                  );
                })}
              </div>
              {errors?.serviceType && (
                <p className="text-red-500 text-xs mt-1">{errors.serviceType}</p>
              )}
            </div>
          )}

          {/* Service Category (B/C/D) Dropdown */}
          <div className="max-w-xs">
            <label className={labelClass}>Service Category</label>
            <div className="mt-2">
              <SearchableDropdown
                options={SERVICE_CATEGORIES}
                value={
                  SERVICE_CATEGORIES.find((c) => c.name === job.serviceCategory)?.id ?? ""
                }
                onChange={(id, name) => {
                  if (onServiceCategoryChange && id && job.serviceType) {
                    // Find the service type UUID from the options
                    const stId = serviceTypeOptions?.find((s) => s.name === job.serviceType)?.id ?? "";
                    onServiceCategoryChange(job.id, id, name, stId);
                  } else if (!job.serviceType && id) {
                    onUpdate(job.id, "serviceCategory", name);
                    toast.error("Please select a Service Type first");
                  } else {
                    onUpdate(job.id, "serviceCategory", name);
                  }
                }}
                placeholder="Select B / C / D service"
              />
            </div>
            {errors?.serviceCategory && (
              <p className="text-red-500 text-xs mt-1">{errors.serviceCategory}</p>
            )}
          </div>

      {/* Auto-populated parts — compact summary with view modal */}
      {hasParts && (
        <>
          <div className="flex items-center gap-4 bg-gray-50 rounded-xl border border-gray-200 px-4 py-3.5">
            <div className="w-10 h-10 rounded-lg bg-[#ff4f31]/10 flex items-center justify-center shrink-0">
              <Package size={20} className="text-[#ff4f31]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-gray-800">
                {job.autoParts!.length} Parts
              </p>
              <p className="text-[12px] text-gray-500 mt-0.5">
                Total: <span className="font-semibold text-gray-700">{formatCurrency(partsTotal)}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPartsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[12px] font-medium text-[#ff4f31] hover:bg-[#ff4f31]/5 hover:border-[#ff4f31]/30 transition-colors cursor-pointer shrink-0"
            >
              <Eye size={14} />
              View Parts
            </button>
          </div>

          {/* Parts Detail Modal */}
          <Modal isOpen={partsModalOpen} onClose={() => setPartsModalOpen(false)} title={`Parts — ${job.serviceCategory}`} size="lg">
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#ff4f31]/5 rounded-lg p-3 text-center">
                  <p className="text-[11px] uppercase tracking-wider text-[#ff4f31]/70 font-medium">Total Parts</p>
                  <p className="text-xl font-bold text-[#ff4f31] mt-0.5">{job.autoParts!.length}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-[11px] uppercase tracking-wider text-green-600/70 font-medium">Total Amount</p>
                  <p className="text-xl font-bold text-green-700 mt-0.5">{formatCurrency(partsTotal)}</p>
                </div>
              </div>

              {/* Parts Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto pr-1">
                {job.autoParts!.map((part) => (
                  <div
                    key={part.id}
                    className="flex items-start gap-3 bg-gray-50 rounded-lg px-3.5 py-3 border border-gray-100"
                  >
                    <span className="text-[11px] font-mono bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-500 shrink-0 mt-0.5">
                      {part.partCode}
                    </span>
                    <p className="text-[13px] text-gray-700 leading-snug">{part.partName}</p>
                  </div>
                ))}
              </div>
            </div>
          </Modal>
        </>
      )}

      {/* No parts found message */}
      {!hasParts && job.serviceCategory && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <Package size={18} className="text-amber-500 shrink-0" />
          <p className="text-[13px] text-amber-700">
            No parts found for this combination. Please check the Model Service Type Assignment configuration.
          </p>
        </div>
      )}
    </div>
  );
}

export type { JobRowProps };
