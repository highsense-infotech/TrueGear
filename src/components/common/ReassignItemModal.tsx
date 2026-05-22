import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { History, AlertTriangle } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";
import SearchableDropdown from "./SearchableDropdown";
import {
  reassignItemTechnician,
  listTechnicians,
  type Technician,
} from "../../api/serviceAdvisor.api";

type Props = {
  isOpen: boolean;
  // The item being reassigned.
  itemId: string | null;
  itemDescription: string;
  currentTechId: string | null;
  currentTechUsername?: string | null;
  // Optional context surfaced in the modal so the SA / Foreman has full
  // picture before swapping.
  priorWork?: {
    totalSeconds?: number;
    diagnosisPhotos?: number;
    repairPhotos?: number;
    hasDiagnosisNotes?: boolean;
  };
  onClose: () => void;
  onReassigned: () => void;
};

function formatDuration(sec: number): string {
  if (!sec || sec < 60) return `${sec}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function ReassignItemModal({
  isOpen,
  itemId,
  itemDescription,
  currentTechId,
  currentTechUsername,
  priorWork,
  onClose,
  onReassigned,
}: Props) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [targetTechId, setTargetTechId] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setTargetTechId("");
      setReason("");
      setError(null);
      return;
    }
    setLoadingList(true);
    listTechnicians()
      .then((res) => {
        if (res.success && res.data) setTechnicians(res.data);
        else setError(res.error?.message ?? "Failed to load technicians");
      })
      .catch(() => setError("Failed to load technicians"))
      .finally(() => setLoadingList(false));
  }, [isOpen]);

  // Exclude the current tech from the picker (same-tech swap is a BE error).
  const techOptions = useMemo(
    () => technicians
      .filter((t) => t.id !== currentTechId)
      .map((t) => ({ id: t.id, name: t.username })),
    [technicians, currentTechId],
  );

  const hasWork =
    (priorWork?.totalSeconds ?? 0) > 0 ||
    (priorWork?.diagnosisPhotos ?? 0) > 0 ||
    (priorWork?.repairPhotos ?? 0) > 0 ||
    !!priorWork?.hasDiagnosisNotes;
  const reasonRequired = hasWork;
  const canSubmit = !!targetTechId && (!reasonRequired || reason.trim().length > 0);

  const handleSubmit = async () => {
    if (!itemId || !targetTechId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await reassignItemTechnician(itemId, {
        technicianId: targetTechId,
        reason: reason.trim() || undefined,
      });
      if (res.success && res.data) {
        const d = res.data;
        toast.success(
          `Reassigned to ${d.toTech.username}` +
          (d.priorSeconds > 0 ? ` · ${formatDuration(d.priorSeconds)} preserved` : "") +
          (d.wasTimerPaused ? " · timer paused" : ""),
        );
        onReassigned();
        onClose();
      } else {
        setError(res.error?.message ?? "Reassignment failed");
      }
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "response" in e
        ? ((e as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ?? "Reassignment failed")
        : "Reassignment failed";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reassign technician" size="md">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-[12px] text-[#999]">Item</p>
          <p className="text-[14px] font-semibold text-[#333]">{itemDescription}</p>
        </div>

        {/* Current tech + work-in-progress summary */}
        <div className="rounded-xl border border-[#e5e7eb] bg-[#fafafa] p-3">
          <div className="flex items-center gap-2 mb-1">
            <History size={14} className="text-[#666]" />
            <p className="text-[12px] font-semibold text-[#333]">
              Currently assigned to {currentTechUsername ?? "—"}
            </p>
          </div>
          {hasWork ? (
            <div className="text-[12px] text-[#666] space-y-0.5">
              {(priorWork?.totalSeconds ?? 0) > 0 && (
                <p>· Clocked: {formatDuration(priorWork!.totalSeconds!)}</p>
              )}
              {priorWork?.hasDiagnosisNotes && <p>· Has diagnosis notes</p>}
              {(priorWork?.diagnosisPhotos ?? 0) > 0 && (
                <p>· Diagnosis photos: {priorWork!.diagnosisPhotos}</p>
              )}
              {(priorWork?.repairPhotos ?? 0) > 0 && (
                <p>· Repair photos: {priorWork!.repairPhotos}</p>
              )}
              <p className="text-[11px] text-[#999] mt-1 italic">
                All prior work is preserved and visible to the new technician.
              </p>
            </div>
          ) : (
            <p className="text-[12px] text-[#999]">No work logged yet — clean handover.</p>
          )}
        </div>

        {/* Target tech picker */}
        <div>
          <label className="block text-[12px] text-[#666] mb-1">
            Reassign to <span className="text-red-500">*</span>
          </label>
          <SearchableDropdown
            options={techOptions}
            value={targetTechId}
            onChange={(id) => setTargetTechId(id)}
            placeholder={loadingList ? "Loading technicians…" : "Search technician…"}
          />
        </div>

        {/* Reason */}
        <div>
          <label className="block text-[12px] text-[#666] mb-1">
            Reason {reasonRequired && <span className="text-red-500">*</span>}
            {!reasonRequired && <span className="text-[#999]"> (optional)</span>}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            disabled={submitting}
            placeholder={reasonRequired
              ? "Why is this being reassigned? (e.g. customer request, skill match, availability)"
              : "Optional context for the audit log"}
            className="w-full px-3 py-2 rounded-md border border-[#e5e7eb] bg-white text-[13px] focus:outline-none focus:border-[#ff4f31] resize-y"
          />
          {reasonRequired && (
            <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
              <AlertTriangle size={11} />
              Reason required — this item has work-in-progress.
            </p>
          )}
        </div>

        {error && (
          <div className="bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-[13px] px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="gradient" className="flex-1" onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? "Reassigning…" : "Confirm reassignment"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
