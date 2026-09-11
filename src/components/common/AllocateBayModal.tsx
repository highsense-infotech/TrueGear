import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Modal from "./Modal";
import Button from "./Button";
import SearchableDropdown from "./SearchableDropdown";
import {
  allocateToBay,
  reallocateBay,
  listBays,
  PRIORITIES,
  REPAIR_CATEGORIES,
  BAY_CATEGORIES,
  type WorkshopBay,
  type WorkshopPriority,
  type RepairCategory,
  type BayCategory,
  type ReworkAssignment,
} from "../../api/workshop.api";
import { listTechnicians, type Technician } from "../../api/serviceAdvisor.api";
import type { QcOutFailedWork } from "../../api/qcOutInspection.api";
import { useAuth } from "../../context/AuthContext";

type Props = {
  isOpen: boolean;
  checkInId: string | null;
  // Pre-filled values when re-allocating; null/undefined for a fresh allocation.
  existing?: {
    bayId: string;
    // Bay category of the currently-allocated bay, so re-allocation pre-selects
    // the right category. null for legacy bays created before categories.
    category?: BayCategory | null;
    priority: WorkshopPriority;
    repairCategory: RepairCategory;
    notes: string | null;
  } | null;
  // Bay held for this check-in by its appointment. Seeds the bay/category on a
  // FRESH allocation so the foreman can just confirm the booked bay — unlike
  // `existing`, it never switches the modal into re-allocate mode. Ignored when
  // `existing` is set (a live allocation always wins over a reservation).
  prefill?: {
    bayId: string;
    category?: BayCategory | null;
    // Shown as a hint under the Bay field so the foreman knows why it's filled.
    bookingRef?: string;
    time?: string;
  } | null;
  // Rework mode — pass the failed works (from /qc-out/check-ins/:id/failed-works)
  // to surface the tech-assignment step. When undefined or empty, modal behaves
  // exactly as before.
  failedWorks?: QcOutFailedWork[];
  onClose: () => void;
  onAllocated: () => void;
};

export function AllocateBayModal({ isOpen, checkInId, existing, prefill, failedWorks, onClose, onAllocated }: Props) {
  // Shop-scoped foreman (SERVICE/MAJOR) is locked to their shop's bay category;
  // ALL / super-admin choose freely. PDI is never a user scope. UX only — the
  // backend already rejects out-of-shop allocations.
  const { shopScope } = useAuth();
  const lockedCategory: BayCategory | null =
    shopScope === "SERVICE" || shopScope === "MAJOR" ? (shopScope as BayCategory) : null;

  // Callers build `prefill` as an inline literal, so its identity changes on
  // every parent render. Depend on these primitives in effects instead — an
  // object dep would re-seed the form (wiping in-progress edits) and refetch
  // bays whenever the dashboard re-rendered behind the open modal.
  const prefillBayId = prefill?.bayId ?? "";
  const prefillCategory = prefill?.category ?? null;

  const [bays, setBays] = useState<WorkshopBay[]>([]);
  const [category, setCategory] = useState<BayCategory | "">("");
  const [bayId, setBayId] = useState("");
  const [priority, setPriority] = useState<WorkshopPriority>("MEDIUM");
  const [repairCategory, setRepairCategory] = useState<RepairCategory>("OTHER");
  const [notes, setNotes] = useState("");
  const [loadingBays, setLoadingBays] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // ── Rework state ──
  const isRework = (failedWorks?.length ?? 0) > 0;
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [reworkRows, setReworkRows] = useState<Record<string, { technicianId: string; reworkNotes: string }>>({});

  // Reset form fields when the modal opens, seeding the category from the
  // existing allocation's bay (re-allocate) so the right list loads.
  useEffect(() => {
    if (!isOpen) return;
    // Reservation seeds the bay only on a fresh allocation — `existing` wins.
    setBayId(existing?.bayId ?? prefillBayId);
    setPriority(existing?.priority ?? "MEDIUM");
    setRepairCategory(existing?.repairCategory ?? "OTHER");
    setNotes(existing?.notes ?? "");
    // Lock to the foreman's shop category when scoped; otherwise seed from the
    // existing allocation (re-allocate), then the reservation, else empty.
    setCategory(lockedCategory ?? existing?.category ?? prefillCategory ?? "");
    setError(null);
  }, [isOpen, existing, prefillBayId, prefillCategory, lockedCategory]);

  // Load bays for the selected category (filtered server-side). A fresh
  // allocation shows nothing until a category is picked; re-allocating a legacy
  // bay with no category falls back to loading all bays so it still shows.
  useEffect(() => {
    if (!isOpen) return;
    // A reserved bay may have no category (legacy bays), so `prefill` also
    // unblocks the list — otherwise the seeded bay would have nothing to match.
    if (!category && !existing && !prefillBayId) { setBays([]); return; }
    let cancelled = false;
    setLoadingBays(true);
    setError(null);
    listBays(category || undefined)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) setBays(res.data);
        else setError(res.error?.message ?? "Failed to load bays");
      })
      .catch(() => { if (!cancelled) setError("Failed to load bays"); })
      .finally(() => { if (!cancelled) setLoadingBays(false); });
    return () => { cancelled = true; };
  }, [isOpen, category, existing, prefillBayId]);

  // Rework: load techs + seed one row per failed work with the inspector's
  // note pre-filled as the brief.
  useEffect(() => {
    if (!isOpen || !isRework) return;
    listTechnicians().then((res) => {
      if (res.success && res.data) setTechnicians(res.data);
    });
    const seed: Record<string, { technicianId: string; reworkNotes: string }> = {};
    for (const fw of failedWorks!) {
      seed[fw.jobCardItemId] = { technicianId: "", reworkNotes: fw.notes ?? "" };
    }
    setReworkRows(seed);
  }, [isOpen, isRework, failedWorks]);

  // Available bays = active and either unoccupied OR currently holding this
  // check-in (so the re-allocate case still shows the current bay).
  const availableBays = bays.filter(
    (b) => b.isActive && (!b.currentAllocationId || b.id === existing?.bayId),
  );

  // The reserved bay may have been occupied since the appointment was booked.
  // Derived (not an effect) so the seeded selection drops the moment the list
  // confirms it isn't allocatable — submit can never post a bay the foreman
  // was never actually offered.
  const reservedBayTaken =
    !!prefillBayId && !loadingBays && bays.length > 0 &&
    !availableBays.some((b) => b.id === prefillBayId);
  const effectiveBayId = reservedBayTaken && bayId === prefillBayId ? "" : bayId;

  const handleSubmit = async () => {
    if (!checkInId) return;
    if (!effectiveBayId) { setError("Select a bay"); return; }
    let reworkAssignments: ReworkAssignment[] | undefined;
    if (isRework) {
      reworkAssignments = [];
      for (const fw of failedWorks!) {
        const row = reworkRows[fw.jobCardItemId];
        if (!row?.technicianId) {
          setError(`Pick a technician for "${fw.jobDescription}"`);
          return;
        }
        reworkAssignments.push({
          jobCardItemId: fw.jobCardItemId,
          technicianId: row.technicianId,
          reworkNotes: row.reworkNotes.trim() || undefined,
        });
      }
    }
    setSubmitting(true);
    setError(null);
    try {
      const fn = existing ? reallocateBay : allocateToBay;
      const res = await fn(checkInId, { bayId: effectiveBayId, priority, repairCategory, notes: notes.trim() || undefined, reworkAssignments });
      if (res.success) {
        toast.success(isRework ? "Rework allocated" : existing ? "Bay re-allocated" : "Bay allocated");
        onAllocated();
        onClose();
      } else {
        setError(res.error?.message ?? "Allocation failed");
      }
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "response" in e
        ? ((e as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ?? "Allocation failed")
        : "Allocation failed";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isRework ? "Send for Rework" : existing ? "Re-allocate Bay" : "Allocate to Bay"} size={isRework ? "lg" : "md"}>
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-[13px] font-medium text-[#333] mb-1.5">Bay Category</label>
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value as BayCategory | ""); setBayId(""); }}
            disabled={submitting || !!lockedCategory}
            className="w-full h-11 sm:h-12 px-3 sm:px-4 rounded-[10px] border border-[#e5e7eb] bg-white text-[14px] text-[#333] focus:outline-none focus:border-[#ff4f31] disabled:bg-[#f5f5f5] disabled:text-[#888]"
          >
            <option value="">Select category</option>
            {BAY_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          {lockedCategory && (
            <p className="text-[11px] text-gray-400 mt-1">Locked to your shop ({lockedCategory}).</p>
          )}
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#333] mb-1.5">Bay</label>
          <SearchableDropdown
            options={availableBays.map((b) => ({
              id: b.id,
              name: `${b.bayNo}${b.location ? ` · ${b.location}` : ""}${b.capabilities?.length ? ` · ${b.capabilities.join(", ")}` : ""}`,
            }))}
            value={effectiveBayId}
            onChange={(id) => setBayId(id)}
            placeholder={
              !category && !existing && !prefill
                ? "Select a category first"
                : loadingBays
                  ? "Loading bays..."
                  : "Pick an available bay"
            }
            loading={loadingBays}
            disabled={submitting || (!category && !existing && !prefill)}
          />
          {prefill && !existing && (
            reservedBayTaken ? (
              <p className="text-[11px] text-amber-600 mt-1">
                The bay reserved by {prefill.bookingRef ?? "the appointment"} is no longer free — pick another.
              </p>
            ) : (
              <p className="text-[11px] text-gray-400 mt-1">
                Pre-filled from appointment {prefill.bookingRef ?? ""}
                {prefill.time ? ` (${prefill.time})` : ""} — change it if needed.
              </p>
            )
          )}
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#333] mb-1.5">Priority</label>
          <div className="flex gap-2">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                disabled={submitting}
                className={`flex-1 h-11 rounded-[10px] border text-[14px] font-medium transition-colors ${
                  priority === p.value
                    ? "border-[#ff4f31] bg-[#fff5f2] text-[#ff4f31]"
                    : "border-[#e5e7eb] bg-white text-[#555] hover:bg-[#fafafa]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#333] mb-1.5">Repair Category</label>
          <select
            value={repairCategory}
            onChange={(e) => setRepairCategory(e.target.value as RepairCategory)}
            disabled={submitting}
            className="w-full h-11 sm:h-12 px-3 sm:px-4 rounded-[10px] border border-[#e5e7eb] bg-white text-[14px] text-[#333] focus:outline-none focus:border-[#ff4f31]"
          >
            {REPAIR_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#333] mb-1.5">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={submitting}
            placeholder="Any special instructions for the technician"
            rows={3}
            className="w-full px-3 py-2 rounded-[10px] border border-[#e5e7eb] bg-white text-[14px] text-[#333] focus:outline-none focus:border-[#ff4f31] resize-y"
          />
        </div>

        {/* ── Rework: per-failed-item technician assignment ── */}
        {isRework && failedWorks && (
          <div className="rounded-lg border border-red-200 bg-red-50/40 p-3">
            <p className="text-[13px] font-semibold text-red-700 mb-2">
              Rework — assign a technician to each failed item
            </p>
            <div className="space-y-3">
              {failedWorks.map((fw) => {
                const row = reworkRows[fw.jobCardItemId] ?? { technicianId: "", reworkNotes: "" };
                return (
                  <div key={fw.jobCardItemId} className="rounded-md border border-red-200 bg-white p-2.5">
                    <p className="text-[13px] font-medium text-[#333]">{fw.jobDescription}</p>
                    {fw.technicianName && (
                      <p className="text-[11px] text-[#999]">Previous tech: {fw.technicianName} (failed QC)</p>
                    )}
                    <div className="mt-2">
                      <label className="block text-[11px] font-medium text-[#666] mb-1">Reassign to</label>
                      <SearchableDropdown
                        options={technicians.map((t) => ({ id: t.id, name: t.username }))}
                        value={row.technicianId}
                        onChange={(id) => setReworkRows((p) => ({ ...p, [fw.jobCardItemId]: { ...p[fw.jobCardItemId], technicianId: id } }))}
                        placeholder="Pick technician"
                        disabled={submitting}
                      />
                    </div>
                    <div className="mt-2">
                      <label className="block text-[11px] font-medium text-[#666] mb-1">Brief for the technician</label>
                      <textarea
                        value={row.reworkNotes}
                        onChange={(e) => setReworkRows((p) => ({ ...p, [fw.jobCardItemId]: { ...p[fw.jobCardItemId], reworkNotes: e.target.value } }))}
                        rows={2}
                        disabled={submitting}
                        className="w-full px-2.5 py-1.5 rounded-md border border-[#e5e7eb] bg-white text-[13px] focus:outline-none focus:border-[#ff4f31] resize-y"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-[13px] px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button onClick={onClose} variant="secondary" className="flex-1" disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} className="flex-1" disabled={submitting || loadingBays}>
            {submitting
              ? (isRework ? "Sending..." : existing ? "Re-allocating..." : "Allocating...")
              : (isRework ? "Send for Rework" : existing ? "Re-allocate" : "Allocate")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
