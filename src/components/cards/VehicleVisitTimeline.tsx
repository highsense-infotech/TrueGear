import { LogIn, LogOut, Circle } from "lucide-react";
import type { VehicleVisit, VisitEvent } from "../../api/vehicle.api";

/**
 * Full in/out history for a vehicle: one block per visit, each showing the
 * chronological event timeline from gate ENTRY through to the gate EXIT.
 *
 * Replaces the old "service history" list, which read a separate
 * vehicle_service_history table that is only populated by Evolve imports and is
 * empty for locally-created vehicles.
 */

/**
 * Only the gate events are shown: when the vehicle came IN and when it went
 * OUT. The endpoint also returns QC / job-card / technician events, which are
 * deliberately filtered out here — add their types below to surface them.
 */
const SHOWN_EVENTS = ["ENTRY", "EXIT"] as const;

const EVENT_STYLE: Record<string, { icon: React.ReactNode; dot: string }> = {
  ENTRY: { icon: <LogIn size={13} />,  dot: "bg-emerald-500" },
  EXIT:  { icon: <LogOut size={13} />, dot: "bg-[#ff4f31]" },
};

const fallbackStyle = { icon: <Circle size={13} />, dot: "bg-[#bbb]" };

function fmt(ts: string | null | undefined) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/** Elapsed time between entry and exit, e.g. "2d 4h" or "3h 20m". */
function duration(from: string | null | undefined, to: string | null | undefined) {
  if (!from || !to) return null;
  const ms = new Date(to).getTime() - new Date(from).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const mins = Math.floor(ms / 60000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  return hours > 0 ? `${hours}h ${mins % 60}m` : `${mins}m`;
}

function EventRow({ ev, last }: { ev: VisitEvent; last: boolean }) {
  const style = EVENT_STYLE[ev.type] ?? fallbackStyle;
  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      {/* Connector line — omitted on the final row so it doesn't dangle. */}
      {!last && <span className="absolute left-[11px] top-6 bottom-0 w-px bg-[#e5e7eb]" />}
      <span
        className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white ${style.dot}`}
      >
        {style.icon}
      </span>
      <div className="min-w-0 flex-1 -mt-0.5">
        <p className="text-[13px] text-[#333]">{ev.label}</p>
        <p className="text-[11px] text-[#999]">
          {fmt(ev.at)}
          {ev.by ? ` · ${ev.by}` : ""}
        </p>
      </div>
    </li>
  );
}

export function VehicleVisitTimeline({ visits }: { visits: VehicleVisit[] }) {
  if (visits.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
        <p className="text-[#999] text-sm">No visits recorded for this vehicle yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {visits.map((visit, vi) => {
        const entry = visit.events.find((e) => e.type === "ENTRY")?.at ?? visit.checkInTime;
        const exit = visit.events.find((e) => e.type === "EXIT")?.at ?? null;
        const stay = duration(entry, exit);
        const gateEvents = visit.events.filter((e) =>
          (SHOWN_EVENTS as readonly string[]).includes(e.type),
        );

        return (
          <div key={visit.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            {/* Visit header — in / out at a glance */}
            <div className="flex items-start justify-between gap-3 flex-wrap mb-4 pb-3 border-b border-[#f0f0f0]">
              <div>
                <p className="text-[14px] font-semibold text-[#333]">
                  Visit {visits.length - vi}
                  {visit.isCurrentVisit && (
                    <span className="ml-2 text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700">
                      Current
                    </span>
                  )}
                </p>
                <p className="text-[12px] text-[#666] mt-0.5">
                  In {fmt(entry)} · Out {exit ? fmt(exit) : "still inside"}
                  {stay ? ` · ${stay}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-[#999]">Odometer</p>
                <p className="text-[13px] font-medium text-[#333]">
                  {visit.odometerReading ? `${visit.odometerReading.toLocaleString()} km` : "—"}
                </p>
              </div>
            </div>

            {gateEvents.length === 0 ? (
              <p className="text-[12px] text-[#999]">No gate events recorded for this visit.</p>
            ) : (
              <ul className="relative">
                {gateEvents.map((ev, i) => (
                  <EventRow
                    key={`${ev.type}-${ev.at}-${i}`}
                    ev={ev}
                    last={i === gateEvents.length - 1}
                  />
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default VehicleVisitTimeline;
