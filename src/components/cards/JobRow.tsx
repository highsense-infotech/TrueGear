import { useState, useRef, useCallback } from "react";
import { Trash2, Eye, Package, Search, Plus, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import Button from "../common/Button";
import Modal from "../common/Modal";
import { type DropdownOption } from "../common/SearchableDropdown";
import SearchableDropdown from "../common/SearchableDropdown";
import { useCurrency } from "../../context/CurrencyContext";
import api from "../../api/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AutoPart {
  id: string;
  partCode: string;
  partName: string;
  quantity: string;
  unitPrice: string;
}

/** A part added manually under Paid Service flow */
export interface PaidPart {
  id: string;
  partCode: string;
  partName: string;
  unitPrice: number;
  quantity: number;
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
  jobType?: string;
  estimatedHours?: string;
  autoParts?: AutoPart[];
  paidParts?: PaidPart[];
  isWarrantyClaim?: boolean;
  warrantyClaimNo?: string;
  warrantyOem?: string;
}

export interface JobErrors {
  jobDescription?: string;
  partsCost?: string;
  labourCost?: string;
  quantity?: string;
  serviceType?: string;
  serviceCategory?: string;
  jobType?: string;
  paidParts?: string;
}

interface PartSearchResult {
  id: string;
  partCode: string;
  partName: string;
  unitPrice: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAID_SERVICE_NAME = "Repair";

const SERVICE_CATEGORIES: DropdownOption[] = [
  { id: "B_SERVICE", name: "B Service" },
  { id: "C_SERVICE", name: "C Service" },
  { id: "D_SERVICE", name: "D Service" },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface JobRowProps {
  job: Job;
  index: number;
  onUpdate: (id: number, field: keyof Job, value: string | number | boolean) => void;
  onRemove: (id: number) => void;
  calculateLineTotal: (job: Job) => number;
  errors?: JobErrors;
  serviceTypeOptions?: DropdownOption[];
  // Evolve Job Type options (from the job_types lookup); shown per job.
  jobTypeOptions?: { code: string; name: string }[];
  onServiceCategoryChange?: (
    jobId: number,
    categoryCode: string,
    categoryName: string,
    serviceTypeId: string,
  ) => void;
  onAddPaidPart?: (jobId: number, part: PaidPart) => void;
  onRemovePaidPart?: (jobId: number, partId: string) => void;
  onUpdatePaidPart?: (jobId: number, partId: string, quantity: number) => void;
  totalJobs?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function JobRow({
  job,
  index,
  onUpdate,
  onRemove,
  errors,
  serviceTypeOptions,
  jobTypeOptions,
  onServiceCategoryChange,
  onAddPaidPart,
  onRemovePaidPart,
  onUpdatePaidPart,
  totalJobs = 1,
}: JobRowProps) {
  const { formatCurrency } = useCurrency();
  const labelClass = "text-gray-400 text-sm md:text-base";

  // ── Non-paid auto-parts (category-based) ──────────────────────────────────
  const hasCategoryParts = job.autoParts && job.autoParts.length > 0;
  const [partsModalOpen, setPartsModalOpen] = useState(false);
  const categoryPartsTotal = hasCategoryParts
    ? job.autoParts!.reduce(
        (sum, p) => sum + (Number(p.quantity) || 1) * (Number(p.unitPrice) || 0),
        0,
      )
    : 0;

  // ── Paid Service detection ─────────────────────────────────────────────────
  const isPaidService = job.serviceType === PAID_SERVICE_NAME;
  const paidParts = job.paidParts ?? [];
  const paidGrandTotal = paidParts.reduce(
    (sum, p) => sum + p.unitPrice * p.quantity,
    0,
  );

  // ── Paid Service local state (search + add form) ───────────────────────────
  const [partQuery, setPartQuery] = useState("");
  const [partResults, setPartResults] = useState<PartSearchResult[]>([]);
  const [partSearchLoading, setPartSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<PartSearchResult | null>(null);
  const [addQty, setAddQty] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchParts = useCallback(async (q: string) => {
    if (!q.trim()) {
      setPartResults([]);
      setSearchOpen(false);
      return;
    }
    setPartSearchLoading(true);
    setSearchOpen(true);
    try {
      const { data } = await api.get("/parts/search", { params: { query: q } });
      if (data?.success && Array.isArray(data.data)) {
        setPartResults(data.data);
      } else {
        setPartResults([]);
      }
    } catch {
      setPartResults([]);
    } finally {
      setPartSearchLoading(false);
    }
  }, []);

  const handlePartQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setPartQuery(q);
    if (selectedPart) setSelectedPart(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchParts(q), 350);
  };

  const handleSelectPart = (result: PartSearchResult) => {
    setSelectedPart(result);
    setPartQuery(`${result.partCode} — ${result.partName}`);
    setSearchOpen(false);
    setPartResults([]);
  };

  const handleClearSearch = () => {
    setSelectedPart(null);
    setPartQuery("");
    setPartResults([]);
    setSearchOpen(false);
  };

  const handleAddPart = () => {
    if (!selectedPart) {
      toast.error("Please select a part first");
      return;
    }
    if (addQty < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }
    const newPart: PaidPart = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      partCode: selectedPart.partCode,
      partName: selectedPart.partName,
      unitPrice: selectedPart.unitPrice,
      quantity: addQty,
    };
    onAddPaidPart?.(job.id, newPart);
    handleClearSearch();
    setAddQty(1);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 md:gap-6">

      {/* ── Row header ── */}
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

      {/* ── Job Type (Evolve RO <JobType>) — per job ── */}
      {jobTypeOptions && jobTypeOptions.length > 0 && (
        <div>
          <label className={labelClass}>Job Type</label>
          <select
            value={job.jobType || ""}
            onChange={(e) => onUpdate(job.id, "jobType", e.target.value)}
            className={`mt-2 w-full border rounded-lg px-3 py-2 text-[13px] text-[#333] bg-white focus:outline-none focus:border-[#ff4f31] ${errors?.jobType ? "border-red-500" : "border-[#e5e7eb]"}`}
          >
            <option value="">Select job type…</option>
            {jobTypeOptions.map((jt) => (
              <option key={jt.code} value={jt.code}>
                {jt.name}
              </option>
            ))}
          </select>
          {errors?.jobType && (
            <p className="text-red-500 text-xs mt-1">{errors.jobType}</p>
          )}
        </div>
      )}

      {/* ── Estimated Hours (Evolve RO <HoursEstimate>) — per job ── */}
      <div>
        <label className={labelClass}>Estimated Hours</label>
        <input
          type="number"
          min="0"
          max="999.99"
          step="0.25"
          inputMode="decimal"
          placeholder="e.g. 1.0 (optional)"
          value={job.estimatedHours ?? ""}
          onChange={(e) => onUpdate(job.id, "estimatedHours", e.target.value)}
          className="mt-2 w-full border border-[#e5e7eb] rounded-lg px-3 py-2 text-[13px] text-[#333] bg-white focus:outline-none focus:border-[#ff4f31]"
        />
      </div>

      {/* ── Service Type radio buttons ── */}
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

      {/* ── Service Category — hidden for Paid Service ── */}
      {!isPaidService && (
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
                  const stId =
                    serviceTypeOptions?.find((s) => s.name === job.serviceType)?.id ?? "";
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
      )}

      {/* ── Category-based auto-parts (non-Paid Service) ── */}
      {!isPaidService && hasCategoryParts && (
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
                Total:{" "}
                <span className="font-semibold text-gray-700">
                  {formatCurrency(categoryPartsTotal)}
                </span>
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

          <Modal
            isOpen={partsModalOpen}
            onClose={() => setPartsModalOpen(false)}
            title={`Parts — ${job.serviceCategory}`}
            size="lg"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#ff4f31]/5 rounded-lg p-3 text-center">
                  <p className="text-[11px] uppercase tracking-wider text-[#ff4f31]/70 font-medium">
                    Total Parts
                  </p>
                  <p className="text-xl font-bold text-[#ff4f31] mt-0.5">
                    {job.autoParts!.length}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-[11px] uppercase tracking-wider text-green-600/70 font-medium">
                    Total Amount
                  </p>
                  <p className="text-xl font-bold text-green-700 mt-0.5">
                    {formatCurrency(categoryPartsTotal)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto pr-1">
                {job.autoParts!.map((part) => (
                  <div
                    key={part.id}
                    className="flex items-start gap-3 bg-gray-50 rounded-lg px-3.5 py-3 border border-gray-100"
                  >
                    <span className="text-[11px] font-mono bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-500 shrink-0 mt-0.5">
                      {part.partCode}
                    </span>
                    <p className="text-[13px] text-gray-700 leading-snug">
                      {part.partName}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Modal>
        </>
      )}

      {/* No parts found for category (non-Paid Service) */}
      {!isPaidService && !hasCategoryParts && job.serviceCategory && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <Package size={18} className="text-amber-500 shrink-0" />
          <p className="text-[13px] text-amber-700">
            No parts found for this combination. Please check the Model Service
            Type Assignment configuration.
          </p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          Paid Service — Parts Selection Section
          ══════════════════════════════════════════════════════════════════════ */}
      {isPaidService && (
        <div className="flex flex-col gap-5">

          {/* Section heading */}
          <div className="flex items-center gap-2">
            <Package size={16} className="text-[#ff4f31]" />
            <span className="text-sm font-semibold text-gray-700">
              Parts Selection
            </span>
          </div>

          {/* ── Add-part card ── */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 flex flex-col gap-3">

            {/* Single row: Search | Qty | Row Total | Add — stacks on mobile */}
            <div className="flex flex-col md:flex-row md:items-end gap-3">

              {/* Search input — grows to fill available space */}
              <div className="flex-1 min-w-0">
                <label className={labelClass}>Part Code / Name</label>
                <div className="relative mt-2">
                  <div
                    className={`flex items-center h-11 border rounded-[10px] px-3 bg-white transition-colors ${
                      searchOpen
                        ? "border-[#04c397]"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Search size={14} className="text-gray-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      value={partQuery}
                      onChange={handlePartQueryChange}
                      onFocus={() => {
                        if (partResults.length > 0) setSearchOpen(true);
                      }}
                      placeholder="Search by part code or name..."
                      className="flex-1 text-[14px] text-gray-700 outline-none bg-transparent min-w-0"
                    />
                    {partSearchLoading && (
                      <Loader2 size={14} className="animate-spin text-gray-400 shrink-0" />
                    )}
                    {(selectedPart || partQuery) && !partSearchLoading && (
                      <button
                        type="button"
                        onClick={handleClearSearch}
                        className="text-gray-400 hover:text-gray-600 p-0.5 rounded transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Search results dropdown */}
                  {searchOpen && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-[10px] shadow-lg max-h-52 overflow-y-auto">
                      {partSearchLoading ? (
                        <div className="px-4 py-3 text-[13px] text-gray-400 text-center flex items-center justify-center gap-2">
                          <Loader2 size={14} className="animate-spin" />
                          Searching...
                        </div>
                      ) : partResults.length === 0 ? (
                        <div className="px-4 py-3 text-[13px] text-gray-400 text-center">
                          No parts found
                        </div>
                      ) : (
                        partResults.map((r) => (
                          <div
                            key={r.id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectPart(r);
                            }}
                            className="px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
                                  {r.partCode}
                                </span>
                                <span className="text-[13px] text-gray-700 truncate">
                                  {r.partName}
                                </span>
                              </div>
                              <span className="text-[12px] font-semibold text-gray-600 shrink-0">
                                {formatCurrency(r.unitPrice)}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Selected part name shown below input */}
                  {/* {selectedPart && (
                    <p className="mt-1 text-[12px] text-gray-500 truncate px-1">
                      <span className="font-mono text-gray-400 mr-1">{selectedPart.partCode}</span>
                      {selectedPart.partName}
                      <span className="ml-2 font-semibold text-gray-600">{formatCurrency(selectedPart.unitPrice)}</span>
                    </p>
                  )} */}
                </div>
              </div>

              {/* Quantity */}
              <div className="w-full md:w-28 shrink-0">
                <label className={labelClass}>Qty</label>
                <input
                  type="number"
                  min="1"
                  value={addQty}
                  onChange={(e) => setAddQty(Math.max(1, Number(e.target.value)))}
                  className="mt-2 w-full h-11 border border-gray-200 rounded-[10px] px-3 text-[14px] text-gray-700 outline-none focus:border-[#04c397] bg-white"
                />
              </div>

              {/* Row Total */}
              <div className="w-full md:w-32 shrink-0">
                <p className={labelClass}>Total</p>
                <p className="mt-2 h-11 flex items-center text-[15px] font-bold text-gray-800">
                  {selectedPart ? formatCurrency(selectedPart.unitPrice * addQty) : "—"}
                </p>
              </div>

              {/* Add Part button */}
              <div className="shrink-0">
                <Button
                  variant="custom"
                  customStyles={{
                    background: "#ff4f31",
                    border: "#ff4f31",
                    text: "#ffffff",
                    hoverBg: "#e8421e",
                  }}
                  onClick={handleAddPart}
                  icon={<Plus size={16} />}
                  className="px-5 h-11 rounded-[10px] w-full md:w-auto"
                >
                  Add Part
                </Button>
              </div>
            </div>
          </div>

          {/* Paid-parts validation error */}
          {errors?.paidParts && (
            <p className="text-red-500 text-xs -mt-2">{errors.paidParts}</p>
          )}

          {/* ── Added parts table ── */}
          {paidParts.length > 0 ? (
            <div className="rounded-xl border border-gray-200 overflow-hidden">

              {/* Table header (desktop) */}
              <div className="hidden sm:grid grid-cols-[120px_1fr_110px_80px_110px_44px] gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                {["Part Code", "Part Name", "Unit Price", "Qty", "Total", ""].map(
                  (h) => (
                    <span
                      key={h}
                      className="text-[11px] uppercase tracking-wider text-gray-400 font-medium"
                    >
                      {h}
                    </span>
                  ),
                )}
              </div>

              {/* Rows */}
              <div className="divide-y divide-gray-100">
                {paidParts.map((p) => (
                  <div
                    key={p.id}
                    className="grid grid-cols-2 sm:grid-cols-[120px_1fr_110px_80px_110px_44px] gap-2 px-4 py-3 items-center"
                  >
                    {/* Part Code */}
                    <span className="text-[12px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded self-start sm:self-auto w-fit">
                      {p.partCode}
                    </span>

                    {/* Part Name */}
                    <span className="text-[13px] text-gray-700 font-medium">
                      {p.partName}
                    </span>

                    {/* Unit Price — desktop only */}
                    <span className="hidden sm:block text-[13px] text-gray-500">
                      {formatCurrency(p.unitPrice)}
                    </span>

                    {/* Qty input */}
                    <div>
                      <input
                        type="number"
                        min="1"
                        value={p.quantity}
                        onChange={(e) =>
                          onUpdatePaidPart?.(
                            job.id,
                            p.id,
                            Math.max(1, Number(e.target.value)),
                          )
                        }
                        className="w-16 h-8 border border-gray-200 rounded-lg px-2 text-[13px] text-center text-gray-700 outline-none focus:border-[#04c397]"
                      />
                    </div>

                    {/* Row total */}
                    <span className="text-[13px] font-semibold text-gray-800">
                      {formatCurrency(p.unitPrice * p.quantity)}
                    </span>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => onRemovePaidPart?.(job.id, p.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer justify-self-center"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Grand Total footer */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
                <span className="text-[13px] font-semibold text-gray-700">
                  Grand Total
                </span>
                <span className="text-[15px] font-bold text-[#ff4f31]">
                  {formatCurrency(paidGrandTotal)}
                </span>
              </div>
            </div>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <Package size={28} className="text-gray-300 mb-2" />
              <p className="text-[13px] text-gray-400">No parts added yet</p>
              <p className="text-[12px] text-gray-300 mt-0.5">
                Search and add parts above
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Warranty claim toggle ── */}
      <div className="border-t border-gray-100 pt-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!job.isWarrantyClaim}
            onChange={(e) => onUpdate(job.id, "isWarrantyClaim", e.target.checked)}
            className="w-4 h-4 accent-[#ff4f31]"
          />
          <span className="text-sm text-gray-600 font-medium">This is a warranty claim</span>
        </label>
        {job.isWarrantyClaim && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Warranty Claim #</label>
              <input
                type="text"
                value={job.warrantyClaimNo ?? ""}
                onChange={(e) => onUpdate(job.id, "warrantyClaimNo", e.target.value)}
                placeholder="e.g. WCN-2026-0042"
                className="mt-2 w-full h-11 border border-gray-200 rounded-[10px] px-3 text-[14px] text-gray-700 outline-none focus:border-[#04c397] bg-white"
              />
            </div>
            <div>
              <label className={labelClass}>OEM</label>
              <input
                type="text"
                value={job.warrantyOem ?? ""}
                onChange={(e) => onUpdate(job.id, "warrantyOem", e.target.value)}
                placeholder="e.g. Toyota / Bosch"
                className="mt-2 w-full h-11 border border-gray-200 rounded-[10px] px-3 text-[14px] text-gray-700 outline-none focus:border-[#04c397] bg-white"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export type { JobRowProps };
