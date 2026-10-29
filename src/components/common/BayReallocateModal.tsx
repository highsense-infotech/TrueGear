import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Loader2, ArrowRight, CheckCircle2, Clock, Ban, AlertTriangle } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";
import {
  getAppointmentBayAlternatives,
  reallocateAppointmentBay,
  type BayAlternativesData,
  type BayAlternativeInfo,
} from "../../api/appointment.api";

const fmt12 = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Appointment being moved (Appointment A). */
  appointmentId: string | null;
  /** Called after a successful move/swap so the board can refresh. */
  onDone: () => void;
}

/**
 * Foreman bay reallocation / displacement swap (Model A). Move an appointment to
 * a target bay; if that bay is occupied, pick a replacement bay for the occupant
 * and the backend performs the atomic swap.
 */
const BayReallocateModal: React.FC<Props> = ({ isOpen, onClose, appointmentId, onDone }) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<BayAlternativesData | null>(null);

  const [targetBayId, setTargetBayId] = useState<string | null>(null);
  // Alternatives for the displaced occupant (fetched when target is occupied).
  const [displacedAlts, setDisplacedAlts] = useState<BayAlternativesData | null>(null);
  const [replacementBayId, setReplacementBayId] = useState<string | null>(null);
  const [altsLoading, setAltsLoading] = useState(false);

  // Load the appointment's per-bay fit/occupancy when opened.
  useEffect(() => {
    if (!isOpen || !appointmentId) return;
    setLoading(true);
    setData(null);
    setTargetBayId(null);
    setDisplacedAlts(null);
    setReplacementBayId(null);
    getAppointmentBayAlternatives(appointmentId)
      .then((res) => setData(res.data ?? null))
      .catch(() => toast.error("Failed to load bay availability"))
      .finally(() => setLoading(false));
  }, [isOpen, appointmentId]);

  const targetBay = data?.bays.find((b) => b.id === targetBayId) ?? null;
  const targetOccupied = !!targetBay?.occupiedBy;

  // When an occupied target is chosen, load replacement bays for the occupant.
  const selectTarget = async (bay: BayAlternativeInfo) => {
    setTargetBayId(bay.id);
    setReplacementBayId(null);
    setDisplacedAlts(null);
    if (bay.occupiedBy) {
      setAltsLoading(true);
      try {
        // Alternatives for the occupant's own interval, excluding the target bay.
        const res = await getAppointmentBayAlternatives(bay.occupiedBy.appointmentId, [bay.id]);
        setDisplacedAlts(res.data ?? null);
      } catch {
        toast.error("Failed to load alternative bays");
      } finally {
        setAltsLoading(false);
      }
    }
  };

  const replacementCandidates = (displacedAlts?.bays ?? []).filter(
    (b) => b.fitsInterval && b.id !== targetBayId,
  );

  const canConfirm =
    !!targetBayId && (!targetOccupied || (!!replacementBayId && replacementCandidates.length > 0));

  const handleConfirm = async () => {
    if (!appointmentId || !targetBayId) return;
    setSubmitting(true);
    try {
      const res = await reallocateAppointmentBay(appointmentId, {
        targetBayId,
        ...(targetOccupied && replacementBayId ? { replacementBayId } : {}),
      });
      const mode = res.data?.mode;
      toast.success(mode === "SWAP" ? "Bays swapped" : "Appointment moved");
      onDone();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? "Failed to change bay";
      // 409 = availability changed since load.
      if (err?.response?.status === 409) {
        toast.error("Bay availability has changed. Please refresh and select the bays again.");
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const appt = data?.appointment;
  const replacementBay = replacementCandidates.find((b) => b.id === replacementBayId) ?? null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Change Bay" size="lg">
      {loading || !appt ? (
        <div className="flex items-center justify-center py-10 gap-2 text-[#999]">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* A — current appointment */}
          <div className="rounded-lg bg-[#fafafa] border border-[#f0f0f0] px-4 py-3">
            <p className="text-xs text-[#999] mb-1">Appointment</p>
            <p className="text-sm font-semibold text-[#333]">
              {appt.vehicleReg ?? "—"} {appt.vehicleName ? `· ${appt.vehicleName}` : ""}
            </p>
            <p className="text-[13px] text-[#555] mt-0.5">
              {fmt12(appt.appointmentTime)} – {fmt12(appt.endTime)} ({appt.estimatedDurationMinutes} min) ·
              current bay <span className="font-medium text-[#333]">{appt.currentBayNo ?? "—"}</span>
            </p>
          </div>

          {/* B — target bay selection */}
          <div>
            <p className="text-sm font-semibold text-[#333] mb-2">Select target bay</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {data!.bays
                // Exclude the current bay and any out-of-service (inactive) bays —
                // a foreman can only move to an active bay.
                .filter((b) => b.id !== appt.currentBayId && b.isActive)
                .map((b) => {
                  const selectable = b.isActive && (b.fitsInterval || !!b.occupiedBy);
                  const isSel = b.id === targetBayId;
                  const tone = !b.isActive
                    ? "border-[#e5e7eb] bg-[#f5f5f5] text-[#bbb]"
                    : b.fitsInterval
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : b.occupiedBy
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-red-200 bg-red-50 text-red-500";
                  return (
                    <button
                      key={b.id}
                      type="button"
                      disabled={!selectable}
                      onClick={() => selectTarget(b)}
                      className={`text-left rounded-lg border p-2.5 text-[12px] transition-all ${
                        isSel ? "border-[#ff5100] ring-1 ring-[#ff5100] bg-[#ff5100]/5" : tone
                      } ${selectable ? "cursor-pointer" : "cursor-not-allowed"}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#333]">{b.bayNo}</span>
                        {!b.isActive ? <Ban size={13} /> : b.fitsInterval ? <CheckCircle2 size={13} className="text-emerald-600" /> : <Clock size={13} className="text-amber-500" />}
                      </div>
                      <p className="mt-0.5">
                        {!b.isActive ? "Out of service" : b.fitsInterval ? "Available" : b.occupiedBy ? `Occupied · ${b.occupiedBy.vehicleReg ?? "—"}` : "Unavailable"}
                      </p>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* C/D — occupied target → replacement selection */}
          {targetOccupied && targetBay?.occupiedBy && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-700">
                    {targetBay.bayNo} is occupied by {targetBay.occupiedBy.vehicleReg ?? "another vehicle"} ({fmt12(targetBay.occupiedBy.appointmentTime)}–{fmt12(targetBay.occupiedBy.endTime)})
                  </p>
                  <p className="text-[13px] text-[#555] mt-0.5">This vehicle must be moved to another suitable bay.</p>

                  {altsLoading ? (
                    <div className="flex items-center gap-2 text-[#999] py-3">
                      <Loader2 size={16} className="animate-spin" /> <span className="text-sm">Finding alternative bays…</span>
                    </div>
                  ) : replacementCandidates.length === 0 ? (
                    <p className="text-sm text-red-600 mt-2">
                      No alternative bay is available for the displaced appointment’s full duration.
                    </p>
                  ) : (
                    <div className="mt-2">
                      <p className="text-xs text-[#999] mb-1.5">Select a replacement bay</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {replacementCandidates.map((b) => {
                          const isSel = b.id === replacementBayId;
                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => setReplacementBayId(b.id)}
                              className={`text-left rounded-lg border p-2.5 text-[12px] transition-all ${
                                isSel ? "border-[#ff5100] ring-1 ring-[#ff5100] bg-[#ff5100]/5" : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:shadow-sm"
                              }`}
                            >
                              <span className="font-bold text-[#333]">{b.bayNo}</span>
                              <p className="mt-0.5">Available</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* E — confirmation summary */}
          {canConfirm && (
            <div className="rounded-lg border border-[#e5e7eb] px-4 py-3">
              <p className="text-sm font-semibold text-[#333] mb-2">Confirm bay change</p>
              <div className="flex items-center gap-2 text-[13px] text-[#333]">
                <span className="font-medium">{appt.vehicleReg ?? "Vehicle A"}</span>
                <span className="text-[#999]">{appt.currentBayNo ?? "—"}</span>
                <ArrowRight size={14} className="text-[#ff5100]" />
                <span className="font-medium">{targetBay?.bayNo}</span>
              </div>
              {targetOccupied && replacementBay && targetBay?.occupiedBy && (
                <div className="flex items-center gap-2 text-[13px] text-[#333] mt-1">
                  <span className="font-medium">{targetBay.occupiedBy.vehicleReg ?? "Vehicle B"}</span>
                  <span className="text-[#999]">{targetBay.bayNo}</span>
                  <ArrowRight size={14} className="text-[#ff5100]" />
                  <span className="font-medium">{replacementBay.bayNo}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button variant="gradient" onClick={handleConfirm} disabled={!canConfirm || submitting}>
              {submitting ? "Saving…" : "Confirm Bay Change"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default BayReallocateModal;
