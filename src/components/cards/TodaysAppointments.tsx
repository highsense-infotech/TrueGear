import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, ChevronDown, ChevronUp, Clock, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { listTodaysAppointmentsForGate, type TodaysAppointment } from "../../api/appointment.api.ts";
import { ROUTES } from "../../constants/routes.ts";

type FilterMode = "ALL" | "PENDING" | "CHECKED_IN";

function formatTime(t: string | null): string {
  if (!t) return "—";
  // Backend returns HH:MM:SS; show HH:MM in 12h.
  const [h, m] = t.split(":");
  const hh = Number(h);
  const period = hh >= 12 ? "PM" : "AM";
  const display = hh % 12 || 12;
  return `${display}:${m} ${period}`;
}

export function TodaysAppointments() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<TodaysAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>("ALL");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listTodaysAppointmentsForGate()
      .then((res) => {
        if (!alive) return;
        if (res.success) {
          setRows(res.data ?? []);
        } else {
          setRows([]);
        }
      })
      .catch(() => alive && setRows([]))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const filtered = rows.filter((r) => {
    if (filter === "PENDING")    return !r.hasActiveCheckIn;
    if (filter === "CHECKED_IN") return r.hasActiveCheckIn;
    return true;
  });

  const handleSelect = (a: TodaysAppointment) => {
    if (a.hasActiveCheckIn) {
      toast.error(`${a.registrationNumber ?? a.vin ?? "Vehicle"} is already inside the workshop`);
      return;
    }
    if (!a.vehicleId) {
      toast.error("Appointment has no vehicle linked");
      return;
    }
    // Same target as VehicleTable's appointment-first navigation.
    navigate(`${ROUTES.ADD_VEHICLE}?vehicleId=${a.vehicleId}&reentry=true&appointmentId=${a.id}`);
  };

  const pendingCount = rows.filter((r) => !r.hasActiveCheckIn).length;

  return (
    <div className="bg-white rounded-[10px] p-4 sm:p-5 md:p-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-start gap-2 text-left flex-1 min-w-0"
          aria-expanded={expanded}
        >
          <div className="flex-1 min-w-0">
            <h2 className="text-[#333] text-[15px] sm:text-[16px] font-semibold mb-1 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Today's Appointments
              <span className="text-[12px] font-normal text-[#999]">
                ({pendingCount} pending / {rows.length} total)
              </span>
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-[#999]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#999]" />
              )}
            </h2>
            <p className="text-[#999] text-[12px] sm:text-[13px]">
              Select a booked vehicle to skip manual entry
            </p>
          </div>
        </button>
        {expanded && (
          <div className="flex gap-1 bg-[#f5f5f5] p-1 rounded-[8px]">
            {(["ALL", "PENDING", "CHECKED_IN"] as FilterMode[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 h-8 text-xs rounded-md transition-colors ${
                  filter === f
                    ? "bg-white text-[#333] shadow-sm"
                    : "text-[#666] hover:bg-[#eee]"
                }`}
              >
                {f === "ALL" ? "All" : f === "PENDING" ? "Pending" : "Checked-in"}
              </button>
            ))}
          </div>
        )}
      </div>

      {expanded && (
        <div className="mt-4">
          {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-[#999]" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-[#999] text-sm py-8">
          {filter === "ALL"
            ? "No appointments booked for today"
            : filter === "PENDING"
            ? "No pending arrivals"
            : "No vehicles checked in yet"}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((a) => {
            const blocked = a.hasActiveCheckIn;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => handleSelect(a)}
                disabled={blocked}
                className={`text-left border rounded-[10px] p-3 transition-colors ${
                  blocked
                    ? "border-[#e5e7eb] bg-[#fafafa] cursor-not-allowed opacity-60"
                    : "border-[#e5e7eb] hover:border-[#ff4f31] hover:bg-[#fff8f6] cursor-pointer"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1 text-[12px] font-medium text-[#666]">
                    <Clock className="w-3 h-3" />
                    {formatTime(a.appointmentTime)}
                  </span>
                  {blocked && (
                    <span className="text-[10px] font-semibold text-[#00C853] uppercase">Inside</span>
                  )}
                </div>
                <div className="text-[14px] font-semibold text-[#333] truncate">
                  {a.registrationNumber || a.vin || "—"}
                </div>
                <div className="text-[12px] text-[#666] truncate">
                  {[a.brand, a.model, a.manufacturingYear].filter(Boolean).join(" ")}
                </div>
                <div className="text-[12px] text-[#999] truncate mt-1">
                  {a.customerName ?? "Unknown customer"}
                </div>
                <div className="text-[10px] text-[#bfbfbf] uppercase mt-1">
                  {a.serviceType.replace(/_/g, " ")}
                </div>
              </button>
            );
          })}
        </div>
      )}
        </div>
      )}
    </div>
  );
}
