import { useState, useEffect, useMemo } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  ChevronRight,
  Calendar,
  CheckCircle2,
  XCircle,
  Search,
  Plus,
  Loader2,
  X,
  AlertTriangle,
} from "lucide-react";
import Button from "../../components/common/Button";
import { ROUTES } from "../../constants/routes";
import { listAppointments, updateAppointmentStatus, type AppointmentRecord, type AppointmentStats } from "../../api/appointment.api";
import { useAppointmentWizard } from "../../context/AppointmentWizardContext";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateString(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split("T")[0];
}

function formatDateTime(date: string, time: string): string {
  const [y, m, day] = date.split("-").map(Number);
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const [hh, mm] = time.split(":");
  const hour = Number(hh);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12  = hour % 12 || 12;
  return `${day} ${monthNames[m - 1]} ${y}, ${h12}:${mm} ${ampm}`;
}

function formatServiceType(raw: string): string {
  return raw.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Status config ────────────────────────────────────────────────────────────

type KnownStatus = "BOOKED" | "CONFIRMED" | "CHECKED_IN" | "IN_SERVICE" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

const STATUS_CONFIG: Record<KnownStatus, { label: string; badge: string }> = {
  BOOKED:     { label: "Booked",      badge: "border border-[#ff5100] text-[#ff5100] bg-[#ff5100]/10" },
  CONFIRMED:  { label: "Confirmed",   badge: "border border-green-600 text-green-600 bg-green-50" },
  CHECKED_IN: { label: "Checked In",  badge: "border border-blue-500 text-blue-500 bg-blue-50" },
  IN_SERVICE: { label: "In Service",  badge: "border border-purple-500 text-purple-500 bg-purple-50" },
  COMPLETED:  { label: "Completed",   badge: "border border-[#999] text-[#999] bg-[#f5f5f5]" },
  CANCELLED:  { label: "Cancelled",   badge: "border border-red-500 text-red-500 bg-red-50" },
  NO_SHOW:    { label: "No Show",     badge: "border border-amber-500 text-amber-500 bg-amber-50" },
};

const CANCELLABLE_STATUSES: KnownStatus[] = ["BOOKED", "CONFIRMED"];

// ─── Component ────────────────────────────────────────────────────────────────

const AppointmentDashboard: React.FC = () => {
  const location     = useLocation();
  const navigate     = useNavigate();
  const { reset }    = useAppointmentWizard();
  const isIndexRoute = location.pathname === ROUTES.APPOINTMENT_DASHBOARD;

  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [stats,        setStats]        = useState<AppointmentStats>({ todayTotal: 0, todayConfirmed: 0, todayCancelled: 0 });
  const [loading,      setLoading]      = useState(false);

  const [searchQuery,   setSearchQuery]   = useState("");
  const [dateFilter,    setDateFilter]    = useState("all");
  const [advisorFilter, setAdvisorFilter] = useState("all");
  const [statusFilter,  setStatusFilter]  = useState("all");

  // Cancel modal state
  const [cancelTarget,   setCancelTarget]   = useState<AppointmentRecord | null>(null);
  const [cancelReason,   setCancelReason]   = useState("");
  const [cancelling,     setCancelling]     = useState(false);
  const [cancelError,    setCancelError]    = useState("");

  // Fetch appointments whenever date/status filter changes
  useEffect(() => {
    if (!isIndexRoute) return;
    setLoading(true);
    const params: Record<string, string | number> = { limit: 200, page: 1 };
    if (dateFilter === "today")    params.date = toDateString(0);
    if (dateFilter === "tomorrow") params.date = toDateString(1);
    if (statusFilter !== "all")    params.status = statusFilter;

    listAppointments(params as any)
      .then((res) => {
        setAppointments(res.data ?? []);
        if (res.stats) setStats(res.stats);
      })
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  }, [dateFilter, statusFilter, isIndexRoute]);

  // Unique advisors derived from loaded data
  const advisors = useMemo(() => {
    const names = appointments
      .map((a) => a.advisorUsername)
      .filter((n): n is string => !!n);
    return [...new Set(names)].sort();
  }, [appointments]);

  // Client-side filter for search + advisor
  const filtered = useMemo(() => {
    return appointments.filter((appt) => {
      const q    = searchQuery.toLowerCase();
      const name = `${appt.customerFirstName ?? ""} ${appt.customerLastName ?? ""}`.trim().toLowerCase();
      const veh  = `${appt.vehicleBrand ?? ""} ${appt.vehicleModel ?? ""}`.trim().toLowerCase();
      const matchesSearch =
        !q ||
        appt.bookingRef.toLowerCase().includes(q) ||
        name.includes(q) ||
        veh.includes(q) ||
        (appt.vehicleReg ?? "").toLowerCase().includes(q);
      const matchesAdvisor =
        advisorFilter === "all" || appt.advisorUsername === advisorFilter;
      return matchesSearch && matchesAdvisor;
    });
  }, [appointments, searchQuery, advisorFilter]);

  // ─── Cancel handlers ─────────────────────────────────────────────────────────

  const openCancelModal = (appt: AppointmentRecord) => {
    setCancelTarget(appt);
    setCancelReason("");
    setCancelError("");
  };

  const closeCancelModal = () => {
    if (cancelling) return;
    setCancelTarget(null);
    setCancelReason("");
    setCancelError("");
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    if (!cancelReason.trim()) {
      setCancelError("Please enter a cancellation reason.");
      return;
    }
    setCancelling(true);
    setCancelError("");
    try {
      await updateAppointmentStatus(cancelTarget.id, "CANCELLED", cancelReason.trim());
      setAppointments((prev) =>
        prev.map((a) => a.id === cancelTarget.id ? { ...a, status: "CANCELLED" } : a),
      );
      setStats((prev) => ({ ...prev, todayCancelled: prev.todayCancelled + 1 }));
      closeCancelModal();
    } catch {
      setCancelError("Failed to cancel appointment. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  if (!isIndexRoute) return <Outlet />;

  return (
    <div className="flex flex-col gap-6 md:gap-8 w-full pb-8">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-[#999]">
        <Home size={15} />
        <span>Home</span>
        <ChevronRight size={13} />
        <span className="text-[#333] font-medium">Appointments</span>
      </nav>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-[#e5e7eb] rounded-[10px] p-5 flex items-center justify-between shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)]">
          <div>
            <p className="text-sm font-medium text-[#333]">Today's Appointments</p>
            <p className="text-4xl font-bold text-[#333] mt-1">{stats.todayTotal}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#ff5100]/10 flex items-center justify-center">
            <Calendar size={20} className="text-[#ff5100]" />
          </div>
        </div>

        <div className="bg-white border border-[#e5e7eb] rounded-[10px] p-5 flex items-center justify-between shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)]">
          <div>
            <p className="text-sm font-medium text-[#333]">Booked / Confirmed</p>
            <p className="text-4xl font-bold text-[#333] mt-1">{stats.todayConfirmed}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle2 size={20} className="text-green-600" />
          </div>
        </div>

        <div className="bg-red-600 border border-red-600 rounded-[10px] p-5 flex items-center justify-between shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)]">
          <div>
            <p className="text-sm font-medium text-white/90">Cancelled</p>
            <p className="text-4xl font-bold text-white mt-1">{stats.todayCancelled}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <XCircle size={20} className="text-white" />
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white border border-[#e5e7eb] rounded-[10px] p-5 shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)]">
        <div className="flex items-start sm:items-center justify-between gap-4 mb-4 flex-col sm:flex-row">
          <div>
            <h2 className="text-base font-bold text-[#333]">Appointments</h2>
            <p className="text-sm text-[#999]">Manage service appointment bookings</p>
          </div>
          <Button variant="gradient" icon={<Plus size={16} />} onClick={() => { reset(); navigate(ROUTES.APPOINTMENT_CREATE_CUSTOMER); }}>
            Create Appointment
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
            <input
              type="text"
              placeholder="Search by Booking ID, Customer, or Vehicle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:border-[#ff5100] text-[#333]"
            />
          </div>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:border-[#ff5100] text-[#333] bg-white min-w-35"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow</option>
          </select>

          <select
            value={advisorFilter}
            onChange={(e) => setAdvisorFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:border-[#ff5100] text-[#333] bg-white min-w-40"
          >
            <option value="all">All Advisors</option>
            {advisors.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:border-[#ff5100] text-[#333] bg-white min-w-35"
          >
            <option value="all">All Status</option>
            <option value="BOOKED">Booked</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CHECKED_IN">Checked In</option>
            <option value="IN_SERVICE">In Service</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="NO_SHOW">No Show</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#e5e7eb] rounded-[10px] shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)] overflow-x-auto">
        <table className="w-full min-w-200">
          <thead>
            <tr className="border-b border-[#f0f0f0] bg-[#fafafa]">
              {["Booking ID", "Customer", "Vehicle", "Date & Time", "Service Type", "Advisor", "Status", ""].map((h, i) => (
                <th key={i} className="px-5 py-3 text-left text-[11px] font-semibold text-[#999] uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center">
                  <div className="flex items-center justify-center gap-2 text-[#999]">
                    <Loader2 size={18} className="animate-spin" />
                    <span className="text-sm">Loading appointments...</span>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-sm text-[#999]">
                  No appointments match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((appt) => {
                const statusKey    = (appt.status?.toUpperCase() ?? "BOOKED") as KnownStatus;
                const badge        = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.BOOKED;
                const customer     = [appt.customerFirstName, appt.customerLastName].filter(Boolean).join(" ") || "—";
                const vehicle      = [appt.vehicleBrand, appt.vehicleModel, appt.vehicleYear].filter(Boolean).join(" ") || "—";
                const canCancel    = CANCELLABLE_STATUSES.includes(statusKey);
                return (
                  <tr key={appt.id} className="border-b border-[#f5f5f5] last:border-0 hover:bg-[#fafafa] transition-colors">
                    <td className="px-5 py-4 text-sm font-bold text-[#333] whitespace-nowrap">
                      {appt.bookingRef}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-[#333]">{customer}</p>
                      <p className="text-xs text-[#999]">{(appt as any).customerPhone ?? "—"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-[#333]">{vehicle}</p>
                      <p className="text-xs text-[#999]">{appt.vehicleReg ?? "—"}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-[#333] whitespace-nowrap">
                      {formatDateTime(appt.appointmentDate, appt.appointmentTime)}
                    </td>
                    <td className="px-5 py-4 text-sm text-[#333] whitespace-nowrap">
                      {formatServiceType(appt.serviceType)}
                    </td>
                    <td className="px-5 py-4 text-sm text-[#333] whitespace-nowrap">
                      {appt.advisorUsername ?? "—"}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${badge.badge}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {canCancel && (
                        <button
                          onClick={() => openCancelModal(appt)}
                          title="Cancel appointment"
                          className="text-xs font-medium text-red-500 border border-red-200 bg-red-50 hover:bg-red-100 rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap flex items-center gap-1.5"
                        >
                          <XCircle size={13} />
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Cancel Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">

            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                  <AlertTriangle size={18} className="text-red-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#333]">Cancel Appointment</h3>
                  <p className="text-xs text-[#999] mt-0.5">{cancelTarget.bookingRef}</p>
                </div>
              </div>
              <button
                onClick={closeCancelModal}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f5f5f5] transition-colors"
              >
                <X size={16} className="text-[#999]" />
              </button>
            </div>

            {/* Appointment summary */}
            <div className="bg-[#fafafa] border border-[#f0f0f0] rounded-lg p-3 mb-4 text-sm text-[#333]">
              <p className="font-medium">
                {[cancelTarget.customerFirstName, cancelTarget.customerLastName].filter(Boolean).join(" ") || "—"}
              </p>
              <p className="text-xs text-[#999] mt-0.5">
                {[cancelTarget.vehicleBrand, cancelTarget.vehicleModel, cancelTarget.vehicleYear].filter(Boolean).join(" ") || "—"}
                {" · "}
                {formatDateTime(cancelTarget.appointmentDate, cancelTarget.appointmentTime)}
              </p>
            </div>

            {/* Reason input */}
            <div className="mb-4">
              <label className="text-sm font-medium text-[#333]">
                Cancellation Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Enter reason for cancellation..."
                value={cancelReason}
                onChange={(e) => { setCancelReason(e.target.value); setCancelError(""); }}
                className="w-full mt-1.5 px-3 py-2 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:border-red-400 resize-none text-[#333] placeholder-[#bbb]"
              />
              {cancelError && (
                <p className="text-xs text-red-500 mt-1">{cancelError}</p>
              )}
            </div>

            <p className="text-xs text-[#999] mb-5">
              A cancellation email will be sent to the customer with this reason.
            </p>

            {/* Actions */}
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={closeCancelModal}
                disabled={cancelling}
                className="px-4 py-2 text-sm font-medium text-[#333] border border-[#e5e7eb] rounded-lg hover:bg-[#f5f5f5] transition-colors disabled:opacity-50"
              >
                Keep Appointment
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={cancelling}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {cancelling && <Loader2 size={13} className="animate-spin" />}
                {cancelling ? "Cancelling..." : "Confirm Cancel"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default AppointmentDashboard;
