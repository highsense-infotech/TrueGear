import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  CheckCircle2,
  Clock,
  Ban,
  XCircle,
  AlertTriangle,
  CalendarClock,
  Check,
  ChevronRight,
  Loader2,
  Minus,
  Plus,
} from "lucide-react";
import {
  getBayAvailability,
  type BayAvailabilityInfo,
  type BayAvailabilityStatus,
} from "../../api/appointment.api";

// ─── Time helpers (client-side; the backend re-validates authoritatively) ──────
const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const fromMin = (mins: number) =>
  `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
const fmt12 = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
};
const startSlots = (bay: BayAvailabilityInfo, interval: number): string[] => {
  const out: string[] = [];
  for (const w of bay.available) {
    for (let t = toMin(w.start); t + interval <= toMin(w.end); t += interval) out.push(fromMin(t));
  }
  return out;
};
const fits = (bay: BayAvailabilityInfo, start: string, durationMin: number): boolean => {
  const s = toMin(start);
  const e = s + durationMin;
  return bay.available.some((w) => s >= toMin(w.start) && e <= toMin(w.end));
};

// ─── Status presentation ──────────────────────────────────────────────────────
const STATUS_STYLE: Record<
  BayAvailabilityStatus,
  { chip: string; dot: string; icon: ReactNode; label: string; selectable: boolean }
> = {
  AVAILABLE: {
    chip: "bg-green-50 text-green-600 border-green-200", dot: "bg-green-600",
    icon: <CheckCircle2 size={16} className="text-green-600" />, label: "Available", selectable: true,
  },
  PARTIALLY_AVAILABLE: {
    chip: "bg-amber-50 text-amber-600 border-amber-200", dot: "bg-amber-500",
    icon: <Clock size={16} className="text-amber-500" />, label: "Partially Available", selectable: true,
  },
  FULLY_BOOKED: {
    chip: "bg-red-50 text-red-500 border-red-200", dot: "bg-red-500",
    icon: <XCircle size={16} className="text-red-500" />, label: "Fully Booked", selectable: false,
  },
  OUT_OF_SERVICE: {
    chip: "bg-[#f5f5f5] text-[#999] border-[#e5e7eb]", dot: "bg-[#999]",
    icon: <Ban size={16} className="text-[#999]" />, label: "Out of Service", selectable: false,
  },
};

type SlotState = "available" | "selected" | "booked" | "past";
const SLOT_STATE_STYLE: Record<SlotState, string> = {
  available: "border-[#e5e7eb] bg-white text-[#333] hover:border-[#ff5100] cursor-pointer",
  selected: "border-[#ff5100] bg-[#ff5100] text-white cursor-pointer",
  booked: "border-red-200 bg-red-50 text-red-400 cursor-not-allowed",
  past: "border-[#e5e7eb] bg-[#f5f5f5] text-[#bbb] cursor-not-allowed line-through",
};

/**
 * Classify every interval start across operating hours for the selected bay:
 *  - past      → earlier than "now" (only when the date is today)
 *  - selected  → the chosen start
 *  - available → the FULL requested duration fits a free window from here
 *  - booked    → overlaps a booking, or the duration doesn't fit before close
 */
function buildSlotGrid(
  bay: BayAvailabilityInfo,
  openHHMM: string,
  closeHHMM: string,
  interval: number,
  durationMin: number,
  selected: string | null,
  nowMin: number,
): { time: string; state: SlotState }[] {
  const out: { time: string; state: SlotState }[] = [];
  // Only iterate start times where the FULL duration can still finish before
  // closing — so we never render starts that are impossible by definition
  // (e.g. a 2.5h job can't start at 4pm when the shop closes at 6pm). Red then
  // only ever means a genuine booking conflict.
  for (let t = toMin(openHHMM); t + durationMin <= toMin(closeHHMM); t += interval) {
    const time = fromMin(t);
    let state: SlotState;
    if (selected === time) state = "selected";
    else if (nowMin >= 0 && t <= nowMin) state = "past";
    else if (fits(bay, time, durationMin)) state = "available";
    else state = "booked";
    out.push({ time, state });
  }
  return out;
}

const CARD = "bg-white border border-[#e5e7eb] rounded-[10px] p-5 sm:p-6 shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)]";

// Selectable estimated durations (minutes) — matches the appointment DTO bounds.
const DURATION_OPTIONS: { minutes: number; label: string }[] = [
  { minutes: 30, label: "30 Minutes" },
  { minutes: 60, label: "1 Hour" },
  { minutes: 90, label: "1.5 Hours" },
  { minutes: 120, label: "2 Hours" },
  { minutes: 150, label: "2.5 Hours" },
  { minutes: 180, label: "3 Hours" },
  { minutes: 240, label: "4 Hours" },
  { minutes: 300, label: "5 Hours" },
  { minutes: 360, label: "6 Hours" },
  { minutes: 480, label: "8 Hours" },
];
const durationLabel = (mins: number) =>
  DURATION_OPTIONS.find((o) => o.minutes === mins)?.label ?? `${Math.floor(mins / 60)}h ${mins % 60}m`;

function SectionTitle({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-6 h-6 rounded-full bg-linear-to-b from-[#ff4f31] to-[#fe2b73] text-white text-xs font-bold flex items-center justify-center">
        {n}
      </span>
      <h3 className="text-base font-bold text-[#333]">{title}</h3>
    </div>
  );
}

export interface BaySelection {
  bayId: string | null;
  bayNo: string;
  time: string | null;
  endTime: string | null;
  durationMinutes: number;
  valid: boolean;
}

interface Props {
  /** Selected date "YYYY-MM-DD", or null. */
  date: string | null;
  /** Initial estimated duration (seeded from the Service step; editable here). */
  durationMinutes: number;
  /** Currently selected bay/time (controlled by the wizard). */
  value: { bayId: string | null; time: string | null };
  onChange: (sel: BaySelection) => void;
  /**
   * When rescheduling, omit this appointment from its own bay occupation —
   * otherwise the bay it currently sits in shows as booked against itself.
   */
  excludeAppointmentId?: string;
  /**
   * Where the appointment being rescheduled currently sits. It is excluded from
   * the blocked set (so it can keep its own slot), which otherwise makes it look
   * merely "free" — this labels it "Current" so the move is visibly reflected.
   */
  currentSlot?: { bayId: string | null; time: string | null };
}

/**
 * Bay & Time-Slot picker — prototype-style card UI wired to the real
 * per-bay availability API. Used inside the appointment wizard's Slot step.
 * The estimated duration is editable here and drives slot availability live.
 */
const BaySchedulePicker: React.FC<Props> = ({ date, durationMinutes: initialDuration, value, onChange, excludeAppointmentId, currentSlot }) => {
  const [dur, setDur] = useState<number>(initialDuration);
  const [bays, setBays] = useState<BayAvailabilityInfo[]>([]);
  const [operating, setOperating] = useState<{ start: string; end: string }>({ start: "07:00", end: "20:00" });
  const [interval, setIntervalMin] = useState(30);
  const [loading, setLoading] = useState(false);

  // Last date we actually loaded for. Null until the first load completes, so
  // the reset below can tell "first mount" from "user picked another date".
  const loadedForDate = useRef<string | null>(null);

  useEffect(() => {
    if (!date) { setBays([]); return; }
    setLoading(true);
    getBayAvailability(date, excludeAppointmentId)
      .then((res) => {
        setBays(res.data?.bays ?? []);
        if (res.data?.operating) setOperating(res.data.operating);
        if (res.data?.slotIntervalMinutes) setIntervalMin(res.data.slotIntervalMinutes);
      })
      .catch(() => setBays([]))
      .finally(() => setLoading(false));

    // Clear the selection ONLY when the user moves to a different date — a bay
    ///time chosen for one day is meaningless on another. Deliberately NOT on
    // mount: the wizard remounts this step on Previous → Next, and resetting
    // there wiped the selection the parent had just restored from wizard state.
    if (loadedForDate.current !== null && loadedForDate.current !== date) {
      onChange({ bayId: null, bayNo: "", time: null, endTime: null, durationMinutes: dur, valid: false });
    }
    loadedForDate.current = date;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, excludeAppointmentId]);

  // "Now" cut-off — only when the chosen date is today (local), so past start
  // times are disabled. -1 means "not today" → nothing is past.
  const nowMin = useMemo(() => {
    if (!date) return -1;
    const now = new Date();
    const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return date === localToday ? now.getHours() * 60 + now.getMinutes() : -1;
  }, [date]);

  const selectedBay = bays.find((b) => b.id === value.bayId) ?? null;

  // A bay is bookable if it has at least one start where the full duration fits
  // AND that start isn't in the past.
  const hasBookableSlot = (bay: BayAvailabilityInfo) =>
    STATUS_STYLE[bay.status].selectable &&
    startSlots(bay, interval).some((t) => fits(bay, t, dur) && !(nowMin >= 0 && toMin(t) <= nowMin));

  const anyBookable = bays.some(hasBookableSlot);

  const slotGrid = useMemo(
    () => (selectedBay ? buildSlotGrid(selectedBay, operating.start, operating.end, interval, dur, value.time, nowMin) : []),
    [selectedBay, operating, interval, dur, value.time, nowMin],
  );

  const endTime = value.time ? fromMin(toMin(value.time) + dur) : null;
  const isValid = !!(
    selectedBay && value.time &&
    fits(selectedBay, value.time, dur) &&
    !(nowMin >= 0 && toMin(value.time) <= nowMin)
  );

  const pickBay = (bay: BayAvailabilityInfo) => {
    if (!hasBookableSlot(bay)) return;
    onChange({ bayId: bay.id, bayNo: bay.bayNo, time: null, endTime: null, durationMinutes: dur, valid: false });
  };

  const pickTime = (time: string) => {
    if (!selectedBay) return;
    const ok = fits(selectedBay, time, dur) && !(nowMin >= 0 && toMin(time) <= nowMin);
    onChange({
      bayId: selectedBay.id,
      bayNo: selectedBay.bayNo,
      time,
      endTime: fromMin(toMin(time) + dur),
      durationMinutes: dur,
      valid: ok,
    });
  };

  // Change the estimated duration → clears the picked time (it may no longer
  // fit) and re-reports so the wizard persists the new duration.
  const changeDuration = (next: number) => {
    setDur(next);
    onChange({
      bayId: selectedBay?.id ?? null,
      bayNo: selectedBay?.bayNo ?? "",
      time: null,
      endTime: null,
      durationMinutes: next,
      valid: false,
    });
  };
  const stepDuration = (dir: 1 | -1) => {
    const idx = DURATION_OPTIONS.findIndex((o) => o.minutes === dur);
    const base = idx === -1 ? DURATION_OPTIONS.findIndex((o) => o.minutes >= dur) : idx;
    const next = Math.min(Math.max(base + dir, 0), DURATION_OPTIONS.length - 1);
    changeDuration(DURATION_OPTIONS[next].minutes);
  };

  const durLabel = durationLabel(dur);

  return (
    <div className="flex flex-col gap-4">
      {/* ── Estimated duration (drives availability) ── */}
      <section className={CARD}>
        <SectionTitle n={1} title="Estimated Workshop Time" />
        <p className="text-xs text-[#999] mt-1 mb-3">Set the duration first — it drives which bays and slots are bookable.</p>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => stepDuration(-1)}
              disabled={dur <= DURATION_OPTIONS[0].minutes}
              className="w-9 h-9 flex items-center justify-center border border-[#e5e7eb] rounded-lg hover:bg-[#f5f5f5] transition-colors disabled:opacity-40"
            >
              <Minus size={16} />
            </button>
            <span className="min-w-[96px] text-center text-sm font-semibold text-[#333]">{durLabel}</span>
            <button
              type="button"
              onClick={() => stepDuration(1)}
              disabled={dur >= DURATION_OPTIONS[DURATION_OPTIONS.length - 1].minutes}
              className="w-9 h-9 flex items-center justify-center border border-[#e5e7eb] rounded-lg hover:bg-[#f5f5f5] transition-colors disabled:opacity-40"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {DURATION_OPTIONS.map((o) => (
              <button
                key={o.minutes}
                type="button"
                onClick={() => changeDuration(o.minutes)}
                className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                  dur === o.minutes ? "border-[#ff5100] bg-[#ff5100]/5 text-[#ff5100]" : "border-[#e5e7eb] text-[#555] hover:bg-[#f5f5f5]"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bay availability ── */}
      <section className={CARD}>
        <SectionTitle n={2} title="Bay Availability" />
        <p className="text-xs text-[#999] mt-1 mb-4">
          {date ? `Duration ${durLabel} · pick a bay with a continuous free window` : "Select a date first"}
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-[#999]">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Loading bay availability...</span>
          </div>
        ) : !date ? (
          <p className="text-sm text-[#999] py-6 text-center">Choose a date to see bay availability.</p>
        ) : !anyBookable ? (
          <div className="flex flex-col items-center text-center py-8">
            <div className="w-14 h-14 rounded-full bg-[#f5f5f5] flex items-center justify-center mb-3">
              <Ban size={24} className="text-[#999]" />
            </div>
            <p className="text-base font-bold text-[#333]">No Bay is available</p>
            <p className="text-sm text-[#999] mt-1 max-w-xs">
              No bay has a continuous free window for the estimated duration on this date. Try another date or reduce the duration.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {bays
              // Hide out-of-service (inactive) bays — a receptionist can only
              // book an active bay, so there's no reason to show them.
              .filter((bay) => bay.status !== "OUT_OF_SERVICE")
              .map((bay) => {
              const style = STATUS_STYLE[bay.status];
              const canFit = hasBookableSlot(bay);
              const selected = bay.id === value.bayId;
              return (
                <div
                  key={bay.id}
                  className={`rounded-[10px] border p-4 flex flex-col transition-all ${
                    selected ? "border-[#ff5100] ring-1 ring-[#ff5100] bg-[#ff5100]/5" : "border-[#e5e7eb] bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#333]">{bay.bayNo}</span>
                    {selected ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-[#ff5100]">
                        <Check size={14} /> Selected
                      </span>
                    ) : (
                      style.icon
                    )}
                  </div>

                  <span className={`inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full border text-[11px] font-medium w-fit ${style.chip}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                    {style.label}
                  </span>

                  <div className="mt-3 text-xs text-[#555] flex-1">
                    {bay.available.length > 0 ? (
                      <>
                        <p className="text-[#999] mb-0.5">Available:</p>
                        {bay.available.map((w, i) => (
                          <p key={i} className="font-medium text-[#333]">
                            {fmt12(w.start)} – {fmt12(w.end)}
                          </p>
                        ))}
                      </>
                    ) : (
                      <p className="text-[#999]">No availability</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => pickBay(bay)}
                    disabled={!canFit}
                    className={`mt-3 w-full py-2 rounded-lg text-sm font-medium transition-all ${
                      selected
                        ? "bg-[#ff5100] text-white"
                        : canFit
                          ? "border border-[#ff5100] text-[#ff5100] hover:bg-[#ff5100]/5"
                          : "bg-[#f5f5f5] text-[#bbb] cursor-not-allowed"
                    }`}
                  >
                    {selected ? "Selected" : canFit ? "Select Bay" : "Unavailable"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Time slot ── */}
      {selectedBay && (
        <section className={CARD}>
          <SectionTitle n={3} title="Select Time Slot" />
          <p className="text-xs text-[#999] mt-1 mb-4">
            Selected Bay: <span className="font-semibold text-[#333]">{selectedBay.bayNo}</span>
          </p>
          {slotGrid.filter((s) => s.state === "available" || s.state === "selected").length === 0 && (
            <p className="text-sm text-[#999] py-2 mb-2">
              No start time fits the estimated duration ({durLabel}) on this bay for the day.
            </p>
          )}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {slotGrid.map((s) => {
              const clickable = s.state === "available" || s.state === "selected";
              // Name the booking that occupies this start, so a red slot reads
              // "held by GJ05SK4764" instead of an unexplained block — the usual
              // misreading is that it is your own just-moved appointment.
              const holder =
                s.state === "booked" && selectedBay
                  ? selectedBay.blocked.find(
                      (b) => toMin(s.time) < toMin(b.end) && toMin(s.time) + dur > toMin(b.start),
                    )
                  : undefined;
              const title =
                s.state === "past"
                  ? "Time already passed"
                  : holder
                    ? `Held by ${holder.vehicleReg ?? "another vehicle"}${holder.bookingRef ? ` (${holder.bookingRef})` : ""}, ${fmt12(holder.start)}–${fmt12(holder.end)}`
                    : s.state === "booked"
                      ? `Doesn't fit the estimated duration (${durLabel}) before closing`
                      : undefined;
              return (
                <button
                  key={s.time}
                  type="button"
                  disabled={!clickable}
                  title={title}
                  onClick={() => clickable && pickTime(s.time)}
                  className={`py-2 rounded-lg border text-xs font-semibold transition-all ${SLOT_STATE_STYLE[s.state]}`}
                >
                  {fmt12(s.time)}
                  {holder?.vehicleReg && (
                    <span className="block text-[9px] font-normal opacity-80 truncate px-1">
                      {holder.vehicleReg}
                    </span>
                  )}
                  {!holder &&
                    currentSlot?.time === s.time &&
                    currentSlot?.bayId === selectedBay?.id && (
                      <span className="block text-[9px] font-normal opacity-80">Current</span>
                    )}
                </button>
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-[#f0f0f0]">
            {[
              { label: "Available", cls: "bg-white border border-[#e5e7eb]" },
              { label: "Selected", cls: "bg-[#ff5100]" },
              { label: "Unavailable", cls: "bg-red-100 border border-red-200" },
              { label: "Past", cls: "bg-[#f5f5f5] border border-[#e5e7eb]" },
            ].map((i) => (
              <div key={i.label} className="flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded ${i.cls}`} />
                <span className="text-xs text-[#999]">{i.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Estimated time + validation ── */}
      {selectedBay && value.time && (
        <section className={CARD}>
          <SectionTitle n={4} title="Appointment Window" />
          <div className="mt-4 rounded-lg bg-[#fafafa] border border-[#f0f0f0] px-4 py-3">
            <div className="flex items-center gap-2 text-[#999] text-xs mb-1">
              <CalendarClock size={14} /> Appointment Time
            </div>
            <div className="flex items-center gap-2 text-lg font-bold text-[#333]">
              <span>{fmt12(value.time)}</span>
              <ChevronRight size={18} className="text-[#ff5100]" />
              <span>{endTime ? fmt12(endTime) : "--"}</span>
            </div>
            <p className="text-xs text-[#999] mt-0.5">Duration: {durLabel}</p>
          </div>

          <div className={`mt-4 rounded-lg border px-4 py-3 flex items-start gap-3 ${isValid ? "border-green-200 bg-green-50/50" : "border-amber-300 bg-amber-50/50"}`}>
            {isValid ? (
              <>
                <CheckCircle2 size={20} className="text-green-600 shrink-0 mt-0.5" />
                <p className="text-sm font-semibold text-green-700">
                  {selectedBay.bayNo} available for the complete duration · {fmt12(value.time)} → {endTime ? fmt12(endTime) : ""}
                </p>
              </>
            ) : (
              <>
                <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm font-semibold text-amber-700">
                  This Bay is not available for the complete estimated duration. Pick another start time or Bay.
                </p>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default BaySchedulePicker;
