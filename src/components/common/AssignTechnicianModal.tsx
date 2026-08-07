import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Modal from "./Modal";
import Button from "./Button";
import SearchableDropdown from "./SearchableDropdown";
import {
  assignTechnician,
  listTechnicians,
  type AssignTechnicianPriority,
  type AssignTechnicianItem,
  type SAJobCardItem,
  type Technician,
} from "../../api/serviceAdvisor.api";

type Props = {
  isOpen: boolean;
  jobCardId: string | null;
  items: SAJobCardItem[];
  onClose: () => void;
  onAssigned: () => void;
};

const PRIORITIES: { value: AssignTechnicianPriority; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
];

interface RowState {
  technicianId: string;
  estimatedHours: string;
  priority: AssignTechnicianPriority;
}

export function AssignTechnicianModal({ isOpen, jobCardId, items, onClose, onAssigned }: Props) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [loadingList, setLoadingList] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bulk Technician Allocation ("Assign All") — one technician for every
  // editable (unassigned) labour line, with optional shared hours/priority.
  const [bulkTech, setBulkTech] = useState("");
  const [bulkHours, setBulkHours] = useState("");
  const [bulkPriority, setBulkPriority] = useState<AssignTechnicianPriority>("MEDIUM");
  const [bulkUsed, setBulkUsed] = useState(false);

  // Costing-only labour lines are never technician work — exclude them entirely
  // from assignment. (no part + no parts cost)
  const assignableItems = useMemo(
    () => items.filter((i) => !i.isLabourOnly),
    [items],
  );
  // Only items not yet assigned are editable; already-assigned ones display as read-only.
  const unassignedItems = useMemo(() => assignableItems.filter((i) => !i.assignedTechnicianId), [assignableItems]);
  const assignedItems = useMemo(() => assignableItems.filter((i) => i.assignedTechnicianId), [assignableItems]);

  useEffect(() => {
    if (!isOpen) return;
    setLoadingList(true);
    setError(null);
    listTechnicians()
      .then((res) => {
        if (res.success && res.data) setTechnicians(res.data);
        else setError(res.error?.message ?? "Failed to load technicians");
      })
      .catch(() => setError("Failed to load technicians"))
      .finally(() => setLoadingList(false));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    // Seed fresh row state for every unassigned item + reset the Assign-All form.
    setRows(
      Object.fromEntries(
        unassignedItems.map((item) => [
          item.id,
          { technicianId: "", estimatedHours: "", priority: "MEDIUM" as AssignTechnicianPriority },
        ]),
      ),
    );
    setBulkTech("");
    setBulkHours("");
    setBulkPriority("MEDIUM");
    setBulkUsed(false);
  }, [isOpen, unassignedItems]);

  // Assign All — apply the chosen technician (and optional hours/priority) to
  // every editable row at once. Rows can still be edited individually after.
  const handleAssignAll = () => {
    if (!bulkTech || unassignedItems.length === 0) return;
    setRows((prev) => {
      const next = { ...prev };
      for (const item of unassignedItems) {
        next[item.id] = {
          technicianId: bulkTech,
          estimatedHours: bulkHours || prev[item.id]?.estimatedHours || "",
          priority: bulkPriority,
        };
      }
      return next;
    });
    setBulkUsed(true);
    setError(null);
  };

  const updateRow = (itemId: string, patch: Partial<RowState>) => {
    setRows((prev) => ({ ...prev, [itemId]: { ...prev[itemId], ...patch } }));
  };

  const technicianName = (id: string | null) =>
    id ? technicians.find((t) => t.id === id)?.username ?? "Unknown" : "—";

  const handleSubmit = async () => {
    if (!jobCardId) return;

    const assignments: AssignTechnicianItem[] = [];
    for (const item of unassignedItems) {
      const r = rows[item.id];
      if (!r) continue;
      const filledAny = r.technicianId || r.estimatedHours;
      if (!filledAny) continue; // skip rows the user left blank — they can be assigned later

      if (!r.technicianId) {
        setError(`Select a technician for "${item.jobDescription}" or clear the row`);
        return;
      }
      const hours = Number(r.estimatedHours);
      if (!r.estimatedHours || isNaN(hours) || hours <= 0) {
        setError(`Enter valid estimated hours for "${item.jobDescription}"`);
        return;
      }
      // Estimated Hours = the billed (Hours Sold) value in Evolve. Hours Worked
      // is captured automatically from the technician's time logs at completion,
      // so it is not entered here.
      assignments.push({
        itemId: item.id,
        technicianId: r.technicianId,
        estimatedHours: hours,
        priority: r.priority,
      });
    }

    if (assignments.length === 0) {
      setError("Fill in at least one item to assign");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await assignTechnician(jobCardId, assignments, bulkUsed);
      // Treat the response as success only when the BE sent its wrapped
      // success envelope. Defensively check for both shapes — a stale FE
      // bundle that returns the raw axios response would lack res.success.
      if (res && res.success && res.success.status === true) {
        toast.success(`Assigned ${assignments.length} item${assignments.length === 1 ? '' : 's'} successfully.`);
        try { onAssigned(); } catch (cbErr) { console.error('[AssignTech] onAssigned threw:', cbErr); }
        onClose();
      } else {
        setError(res?.error?.message ?? "Failed to assign technicians");
      }
    } catch (e: unknown) {
      console.error('[AssignTech] assign failed:', e);
      const msg =
        e && typeof e === "object" && "response" in e
          ? ((e as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ?? "Failed to assign technicians")
          : "Failed to assign technicians";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign Technicians" size="lg">
      <div className="flex flex-col gap-4">
        {assignedItems.length > 0 && (
          <div className="border border-[#e5e7eb] rounded-lg p-3 bg-[#fafafa]">
            <p className="text-[12px] font-semibold text-[#666] mb-2">Already assigned</p>
            <ul className="space-y-1.5">
              {assignedItems.map((item) => (
                <li key={item.id} className="text-[13px] text-[#333] flex items-center justify-between gap-3">
                  <span className="truncate">{item.jobDescription}</span>
                  <span className="text-[12px] text-[#666] shrink-0">
                    {technicianName(item.assignedTechnicianId)} · {item.estimatedHours ?? "?"}h · {item.priority ?? "-"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {unassignedItems.length > 0 && (
          <div className="border border-[#e5e7eb] rounded-lg p-3 bg-[#fff7f5]">
            <p className="text-[12px] font-semibold text-[#666] mb-2">
              Assign all lines to one technician
            </p>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2.5 md:items-end">
              <div>
                <label className="block text-[11px] font-medium text-[#666] mb-1">Technician</label>
                <SearchableDropdown
                  options={technicians.map((t) => {
                    const skills = t.skills && t.skills.length > 0 ? t.skills.join(", ") : "—";
                    const load = t.activeItemCount ?? 0;
                    return { id: t.id, name: `${t.username} · ${skills} · ${load} active` };
                  })}
                  value={bulkTech}
                  onChange={(id) => setBulkTech(id)}
                  placeholder="Search technician"
                  loading={loadingList}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#666] mb-1">Hours (optional)</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={bulkHours}
                  onChange={(e) => setBulkHours(e.target.value)}
                  disabled={submitting}
                  placeholder="all"
                  className="w-full md:w-24 h-11 sm:h-12 px-3 rounded-[10px] border border-[#e5e7eb] bg-white text-[14px] text-[#333] focus:outline-none focus:border-[#ff4f31]"
                />
              </div>
              <Button
                onClick={handleAssignAll}
                variant="secondary"
                className="h-11 sm:h-12"
                disabled={submitting || loadingList || !bulkTech}
              >
                Assign All
              </Button>
            </div>
          </div>
        )}

        {unassignedItems.length === 0 ? (
          <p className="text-[13px] text-[#666]">All items have already been assigned.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {unassignedItems.map((item) => {
              const r = rows[item.id] ?? { technicianId: "", estimatedHours: "", priority: "MEDIUM" as AssignTechnicianPriority };
              return (
                <div key={item.id} className="border border-[#e5e7eb] rounded-lg p-3">
                  <p className="text-[13px] font-semibold text-[#333] mb-2.5">{item.jobDescription}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-[#666] mb-1">Technician</label>
                      <SearchableDropdown
                        options={technicians.map((t) => {
                          // Phase 3 — surface skills + workload alongside the
                          // technician name so the SA can make an informed
                          // pick without strict skill matching.
                          const skills = t.skills && t.skills.length > 0 ? t.skills.join(", ") : "—";
                          const load = t.activeItemCount ?? 0;
                          return {
                            id: t.id,
                            name: `${t.username} · ${skills} · ${load} active`,
                          };
                        })}
                        value={r.technicianId}
                        onChange={(id) => updateRow(item.id, { technicianId: id })}
                        placeholder="Search technician"
                        loading={loadingList}
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#666] mb-1">Estimated Hours</label>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={r.estimatedHours}
                        onChange={(e) => updateRow(item.id, { estimatedHours: e.target.value })}
                        disabled={submitting}
                        placeholder="e.g. 2"
                        className="w-full h-11 sm:h-12 px-3 sm:px-4 rounded-[10px] border border-[#e5e7eb] bg-white text-[14px] text-[#333] focus:outline-none focus:border-[#ff4f31]"
                      />
                    </div>
                  </div>
                  <div className="mt-2.5">
                    <label className="block text-[11px] font-medium text-[#666] mb-1">Priority</label>
                    <div className="flex gap-2">
                      {PRIORITIES.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => updateRow(item.id, { priority: p.value })}
                          disabled={submitting}
                          className={`flex-1 h-11 sm:h-12 rounded-[10px] border text-[14px] font-medium transition-colors ${
                            r.priority === p.value
                              ? "border-[#ff4f31] bg-[#fff5f2] text-[#ff4f31]"
                              : "border-[#e5e7eb] bg-white text-[#555] hover:bg-[#fafafa]"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {error && (
          <div className="bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-[13px] px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button onClick={onClose} variant="secondary" className="flex-1" disabled={submitting}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            className="flex-1"
            disabled={submitting || loadingList || unassignedItems.length === 0}
          >
            {submitting ? "Assigning..." : "Assign"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
