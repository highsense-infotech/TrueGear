import { Plus, Trash2, Wrench } from "lucide-react";
import Button from "../common/Button";
import SearchableDropdown, {
  type DropdownOption,
} from "../common/SearchableDropdown";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * A single labour line on a job. Amounts/hours are kept as strings (mirroring
 * the raw input values) so the next phase can map them into the job-card save
 * payload / job_card_items without re-parsing UI state.
 */
export interface LabourLine {
  id: string;
  presetLabel: string; // dropdown selection ("" until chosen, "Other" for free text)
  description: string; // editable free text, seeded from the preset
  hours: string;
  amount: string;
  notes: string;
}

/** Factory so id-generation stays consistent wherever a labour line is added. */
export function createEmptyLabourLine(): LabourLine {
  return {
    id: crypto.randomUUID(),
    presetLabel: "",
    description: "",
    hours: "",
    amount: "",
    notes: "",
  };
}

// ─── Shared styles (match existing JobRow inputs) ─────────────────────────────

const labelClass = "text-gray-400 text-xs md:text-sm";
const inputClass =
  "mt-1.5 w-full h-11 border border-gray-200 rounded-[10px] px-3 text-[14px] text-gray-700 outline-none focus:border-[#04c397] bg-white";

// ─── LabourRow ────────────────────────────────────────────────────────────────

interface LabourRowProps {
  line: LabourLine;
  index: number;
  options: DropdownOption[];
  canRemove: boolean;
  onCreateOption?: (name: string) => DropdownOption;
  onUpdate: (field: keyof LabourLine, value: string) => void;
  onRemove: () => void;
}

function LabourRow({ line, index, options, canRemove, onCreateOption, onUpdate, onRemove }: LabourRowProps) {
  // Selecting a Labour Master item prefills the editable description. The
  // description field always stays editable regardless of the selection.
  const handlePreset = (id: string, name: string) => {
    onUpdate("presetLabel", id);
    if (name) onUpdate("description", name);
  };

  // Typed-but-not-in-list value → add it as an option and select it.
  const handleCreate = onCreateOption
    ? (name: string) => {
        const opt = onCreateOption(name);
        handlePreset(opt.id, opt.name);
      }
    : undefined;

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-medium text-gray-500">
          Labour #{index + 1}
        </span>
        {/* At least one labour row must remain — hide delete when it's the only one. */}
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            title="Remove labour line"
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {/* Row 1 — Labour Type | Hours | Amount (single row, like Parts Selection) */}
      <div className="flex flex-col md:flex-row md:items-end gap-3">
        {/* Preset dropdown */}
        <div className="flex-1 min-w-0">
          <label className={labelClass}>Labour Type</label>
          <div className="mt-1.5">
            <SearchableDropdown
              options={options}
              value={line.presetLabel}
              onChange={handlePreset}
              onCreate={handleCreate}
              placeholder={options.length ? "Select labour" : "No labour options"}
            />
          </div>
        </div>

        {/* Hours */}
        <div className="w-full md:w-32 shrink-0">
          <label className={labelClass}>Hours</label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={line.hours}
            onChange={(e) => onUpdate("hours", e.target.value)}
            placeholder="0"
            className={inputClass}
          />
        </div>

        {/* Amount */}
        <div className="w-full md:w-40 shrink-0">
          <label className={labelClass}>Amount</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={line.amount}
            onChange={(e) => onUpdate("amount", e.target.value)}
            placeholder="0.00"
            className={inputClass}
          />
        </div>
      </div>

      {/* Row 2 — Description (full width, like the Parts description below) */}
      <div className="mt-3">
        <label className={labelClass}>Description</label>
        <input
          type="text"
          value={line.description}
          onChange={(e) => onUpdate("description", e.target.value)}
          placeholder="Describe the work performed…"
          className={inputClass}
        />
      </div>
    </div>
  );
}

// ─── LabourSection ──────────────────────────────────────────────────────────

interface LabourSectionProps {
  jobId: number;
  labourLines: LabourLine[];
  // Labour Master options (active labour descriptions). Empty is allowed — the
  // Description textbox is always editable, so the Job Card never breaks.
  options?: DropdownOption[];
  // Add a typed-but-unlisted value as a (session-local) option and return it.
  onCreateOption?: (name: string) => DropdownOption;
  onAdd: (jobId: number) => void;
  onUpdate: (
    jobId: number,
    lineId: string,
    field: keyof LabourLine,
    value: string,
  ) => void;
  onRemove: (jobId: number, lineId: string) => void;
}

export function LabourSection({
  jobId,
  labourLines,
  options = [],
  onCreateOption,
  onAdd,
  onUpdate,
  onRemove,
}: LabourSectionProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Section heading + Add */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench size={16} className="text-[#ff4f31]" />
          <span className="text-sm font-semibold text-gray-700">Labour</span>
        </div>
        <Button
          variant="custom"
          customStyles={{
            background: "white",
            border: "#e5e7eb",
            text: "#1f2937",
            hoverBg: "#f9fafb",
          }}
          onClick={() => onAdd(jobId)}
          icon={<Plus size={16} className="text-gray-800" />}
          className="px-4 py-2 rounded-md"
        >
          <span className="text-sm font-medium text-gray-800">Add Labour</span>
        </Button>
      </div>

      {labourLines.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center">
          <p className="text-[13px] text-gray-400">No labour added yet</p>
          <p className="text-[12px] text-gray-300 mt-0.5">
            Click "Add Labour" to add a line
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {labourLines.map((line, i) => (
            <LabourRow
              key={line.id}
              line={line}
              index={i}
              options={options}
              canRemove={labourLines.length > 1}
              onCreateOption={onCreateOption}
              onUpdate={(field, value) => onUpdate(jobId, line.id, field, value)}
              onRemove={() => onRemove(jobId, line.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export type { LabourSectionProps };
