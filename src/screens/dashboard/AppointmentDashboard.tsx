import { useState, useEffect, useMemo } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  ChevronRight,
  Calendar,
  CalendarDays,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Search,
  Plus,
  Loader2,
  X,
  AlertTriangle,
} from "lucide-react";
import Button from "../../components/common/Button";
import { Pagination } from "../../components/common/Pagination";
import { ROUTES } from "../../constants/routes";
import { listAppointments, updateAppointmentStatus, getSlotAvailability, rescheduleAppointment, type AppointmentRecord, type AppointmentStats } from "../../api/appointment.api";
import { useAppointmentWizard } from "../../context/AppointmentWizardContext";
import BaySchedulePicker from "../appointments/BaySchedulePicker";

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

  const [searchQuery,    setSearchQuery]    = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateFilter,     setDateFilter]     = useState("all");
  const [advisorFilter,  setAdvisorFilter]  = useState("all");
  const [statusFilter,   setStatusFilter]   = useState("all");

  // Pagination state
  const [pageSize, setPageSize] = useState(10);
  const [page,       setPage]       = useState(1);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Debounce search input so we don't hammer the API on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Reset to page 1 whenever any filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, dateFilter, statusFilter, advisorFilter]);

  // Cancel modal state
  const [cancelTarget,   setCancelTarget]   = useState<AppointmentRecord | null>(null);
  const [cancelReason,   setCancelReason]   = useState("");
  const [cancelling,     setCancelling]     = useState(false);
  const [cancelError,    setCancelError]    = useState("");

  // Reschedule modal state
  const [rescheduleTarget, setRescheduleTarget] = useState<AppointmentRecord | null>(null);
  const [rescheduleStep,   setRescheduleStep]   = useState<"date" | "confirm">("date");
  const [rescheduleDate,   setRescheduleDate]   = useState("");
  const [rescheduleTime,   setRescheduleTime]   = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  // Bay chosen in the reschedule modal (bay-scheduled appointments only).
  const [rescheduleBayId,  setRescheduleBayId]  = useState<string | null>(null);
  const [rescheduleSlots,  setRescheduleSlots]  = useState<{ time: string; booked: number; capacity: number; status: string }[]>([]);
  const [slotsLoading,     setSlotsLoading]     = useState(false);
  const [rescheduling,     setRescheduling]     = useState(false);
  const [rescheduleError,  setRescheduleError]  = useState("");
  const [calendarMonth,    setCalendarMonth]    = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  // Fetch appointments whenever filters or page change
  useEffect(() => {
    if (!isIndexRoute) return;
    setLoading(true);
    const params: Record<string, string | number> = { page, limit: pageSize };
    if (dateFilter === "today")    params.date = toDateString(0);
    if (dateFilter === "tomorrow") params.date = toDateString(1);
    if (statusFilter !== "all")    params.status = statusFilter;
    if (debouncedSearch)           params.search = debouncedSearch;

    listAppointments(params as any)
      .then((res) => {
        setAppointments(res.data?.data ?? []);
        setTotal(res.data?.total ?? 0);
        setTotalPages(res.data?.totalPages ?? 1);
        if (res.data?.stats) setStats(res.data.stats);
      })
      .catch(() => {
        setAppointments([]);
        setTotal(0);
        setTotalPages(1);
      })
      .finally(() => setLoading(false));
  }, [dateFilter, statusFilter, debouncedSearch, page, pageSize, isIndexRoute]);

  // Unique advisors derived from loaded data (current page only)
  const advisors = useMemo(() => {
    const names = appointments
      .map((a) => a.advisorUsername)
      .filter((n): n is string => !!n);
    return [...new Set(names)].sort();
  }, [appointments]);

  // Advisor filter is still client-side (applied on top of the paginated page)
  const filtered = useMemo(() => {
    if (advisorFilter === "all") return appointments;
    return appointments.filter((a) => a.advisorUsername === advisorFilter);
  }, [appointments, advisorFilter]);

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

  // ─── Reschedule handlers ─────────────────────────────────────────────────────

  const openRescheduleModal = (appt: AppointmentRecord) => {
    setRescheduleTarget(appt);
    setRescheduleStep("date");
    setRescheduleDate("");
    setRescheduleTime("");
    setRescheduleReason("");
    setRescheduleBayId(appt.bayId ?? null);
    setRescheduleSlots([]);
    setRescheduleError("");
    const d = new Date();
    setCalendarMonth({ year: d.getFullYear(), month: d.getMonth() });
  };

  const closeRescheduleModal = () => {
    if (rescheduling) return;
    setRescheduleTarget(null);
  };

  const handleDateSelect = async (dateStr: string) => {
    setRescheduleDate(dateStr);
    setRescheduleTime("");
    setRescheduleError("");
    setSlotsLoading(true);
    try {
      const res = await getSlotAvailability(dateStr);
      setRescheduleSlots(res.data?.slots ?? []);
    } catch {
      setRescheduleSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleTarget || !rescheduleDate || !rescheduleTime) return;
    setRescheduling(true);
    setRescheduleError("");
    try {
      const res = await rescheduleAppointment(rescheduleTarget.id, {
        newDate: rescheduleDate,
        newTime: rescheduleTime,
        reason: rescheduleReason.trim() || undefined,
        // Only sent for bay-scheduled appointments; omitted otherwise so the
        // backend leaves the (absent) bay untouched.
        ...(rescheduleTarget.bayId && rescheduleBayId ? { bayId: rescheduleBayId } : {}),
      });
      if (res.success) {
        setAppointments((prev) =>
          prev.map((a) =>
            a.id === rescheduleTarget.id
              ? { ...a, appointmentDate: rescheduleDate, appointmentTime: rescheduleTime, status: "BOOKED", rescheduleCount: (a.rescheduleCount ?? 0) + 1 }
              : a,
          ),
        );
        closeRescheduleModal();
      }
    } catch (err: any) {
      setRescheduleError(err?.response?.data?.error?.message ?? "Failed to reschedule. Please try again.");
    } finally {
      setRescheduling(false);
    }
  };

  // Calendar helpers for reschedule modal
  const calendarDays = useMemo(() => {
    const { year, month } = calendarMonth;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = new Date().toISOString().split("T")[0];
    const days: { date: string; day: number; isPast: boolean }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ date: dateStr, day: d, isPast: dateStr < todayStr });
    }
    return { days, offset: firstDay };
  }, [calendarMonth]);

  const isSlotPast = (time: string): boolean => {
    if (!rescheduleDate) return false;
    const todayStr = new Date().toISOString().split("T")[0];
    if (rescheduleDate !== todayStr) return false;
    const [hh, mm] = time.split(":").map(Number);
    const now = new Date();
    return hh * 60 + mm <= now.getHours() * 60 + now.getMinutes();
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
              {["Booking ID", "Customer", "Vehicle", "Date & Time", "Service Type", "Advisor", "Created By", "Status", ""].map((h, i) => (
                <th key={i} className="px-5 py-3 text-left text-[11px] font-semibold text-[#999] uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-5 py-10 text-center">
                  <div className="flex items-center justify-center gap-2 text-[#999]">
                    <Loader2 size={18} className="animate-spin" />
                    <span className="text-sm">Loading appointments...</span>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-10 text-center text-sm text-[#999]">
                  No appointments match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((appt) => {
                const statusKey    = (appt.status?.toUpperCase() ?? "BOOKED") as KnownStatus;
                const badge        = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.BOOKED;
                const customer     = appt.customerCompanyName?.trim() || [appt.customerFirstName, appt.customerLastName].filter(Boolean).join(" ") || "—";
                const vehicle      = [appt.vehicleBrand, appt.vehicleModel, appt.vehicleYear].filter(Boolean).join(" ") || "—";
                const canCancel    = CANCELLABLE_STATUSES.includes(statusKey);
                return (
                  <tr key={appt.id} className="border-b border-[#f5f5f5] last:border-0 hover:bg-[#fafafa] transition-colors">
                    <td className="px-5 py-4 text-sm font-bold text-[#333] whitespace-nowrap">
                      {appt.bookingRef}
                      {(appt.rescheduleCount ?? 0) > 0 && (
                        <span className="ml-1.5 text-[10px] font-semibold text-[#ff5100] bg-[#ff5100]/10 border border-[#ff5100]/20 rounded px-1 py-0.5">
                          R{appt.rescheduleCount}
                        </span>
                      )}
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
                    <td className="px-5 py-4 text-sm text-[#333] whitespace-nowrap">
                      {appt.createdByName ?? "—"}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${badge.badge}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {canCancel && (
                        <div className="flex items-center gap-2">
                          {(appt.rescheduleCount ?? 0) < 3 && (
                            <button
                              onClick={() => openRescheduleModal(appt)}
                              title="Reschedule appointment"
                              className="text-xs font-medium text-[#ff5100] border border-[#ff5100]/20 bg-[#ff5100]/5 hover:bg-[#ff5100]/10 rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap flex items-center gap-1.5"
                            >
                              <CalendarDays size={13} />
                              Reschedule
                            </button>
                          )}
                          <button
                            onClick={() => openCancelModal(appt)}
                            title="Cancel appointment"
                            className="text-xs font-medium text-red-500 border border-red-200 bg-red-50 hover:bg-red-100 rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap flex items-center gap-1.5"
                          >
                            <XCircle size={13} />
                            Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="px-5 border-t border-[#f0f0f0] bg-[#fafafa]">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={total}
              itemsPerPage={pageSize}
              onPageChange={setPage}
              onItemsPerPageChange={(limit) => {
                setPageSize(limit);
                setPage(1);
              }}
            />
          </div>
        )}
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
                {cancelTarget.customerCompanyName?.trim() || [cancelTarget.customerFirstName, cancelTarget.customerLastName].filter(Boolean).join(" ") || "—"}
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

      {/* Reschedule Modal */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-6">
          {/* Height-capped and internally scrollable: the bay picker is far
              taller than the old date/slot content, and without this the modal
              overflowed the viewport with no way to reach the actions. Wider
              only when the bay grid is shown, so the slot-only modal is
              unchanged. */}
          <div
            className={`bg-white rounded-xl shadow-2xl w-full ${
              rescheduleTarget.bayId ? "max-w-3xl" : "max-w-lg"
            } max-h-[90vh] overflow-y-auto overscroll-contain p-6`}
          >

            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#ff5100]/10 flex items-center justify-center shrink-0">
                  <CalendarDays size={18} className="text-[#ff5100]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#333]">Reschedule Appointment</h3>
                  <p className="text-xs text-[#999] mt-0.5">{rescheduleTarget.bookingRef}</p>
                </div>
              </div>
              <button
                onClick={closeRescheduleModal}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f5f5f5] transition-colors"
              >
                <X size={16} className="text-[#999]" />
              </button>
            </div>

            {/* Appointment summary */}
            <div className="bg-[#fafafa] border border-[#f0f0f0] rounded-lg p-3 mb-4 text-sm text-[#333]">
              <p className="font-medium">
                {rescheduleTarget.customerCompanyName?.trim() || [rescheduleTarget.customerFirstName, rescheduleTarget.customerLastName].filter(Boolean).join(" ") || "—"}
              </p>
              <p className="text-xs text-[#999] mt-0.5">
                {[rescheduleTarget.vehicleBrand, rescheduleTarget.vehicleModel, rescheduleTarget.vehicleYear].filter(Boolean).join(" ") || "—"}
                {" · Current: "}
                {formatDateTime(rescheduleTarget.appointmentDate, rescheduleTarget.appointmentTime)}
              </p>
            </div>

            {rescheduleStep === "date" ? (
              <>
                {/* Mini Calendar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={() => setCalendarMonth((prev) => {
                        const d = new Date(prev.year, prev.month - 1, 1);
                        return { year: d.getFullYear(), month: d.getMonth() };
                      })}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#f5f5f5]"
                    >
                      <ChevronLeft size={14} className="text-[#999]" />
                    </button>
                    <span className="text-sm font-semibold text-[#333]">
                      {new Date(calendarMonth.year, calendarMonth.month).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </span>
                    <button
                      onClick={() => setCalendarMonth((prev) => {
                        const d = new Date(prev.year, prev.month + 1, 1);
                        return { year: d.getFullYear(), month: d.getMonth() };
                      })}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#f5f5f5]"
                    >
                      <ChevronRight size={14} className="text-[#999]" />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                      <span key={d} className="text-[10px] font-semibold text-[#999] py-1">{d}</span>
                    ))}
                    {Array.from({ length: calendarDays.offset }).map((_, i) => (
                      <span key={`e-${i}`} />
                    ))}
                    {calendarDays.days.map(({ date, day, isPast }) => (
                      <button
                        key={date}
                        disabled={isPast}
                        onClick={() => handleDateSelect(date)}
                        className={`text-xs py-1.5 rounded-lg transition-colors ${
                          isPast
                            ? "text-[#ccc] cursor-not-allowed"
                            : date === rescheduleDate
                              ? "bg-[#ff5100] text-white font-bold"
                              : "text-[#333] hover:bg-[#ff5100]/10"
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bay & time picker — for appointments that hold a physical bay.
                    Same component the booking wizard uses, with this appointment
                    excluded from its own occupation so its current bay reads as
                    free. Capacity-slot appointments (no bay) keep the slot grid
                    below, so their scheduling model is not silently changed. */}
                {rescheduleDate && rescheduleTarget.bayId && (
                  <div className="mb-4">
                    <BaySchedulePicker
                      date={rescheduleDate}
                      durationMinutes={rescheduleTarget.estimatedDurationMinutes ?? 150}
                      value={{ bayId: rescheduleBayId, time: rescheduleTime || null }}
                      excludeAppointmentId={rescheduleTarget.id}
                      currentSlot={{ bayId: rescheduleTarget.bayId, time: rescheduleTarget.appointmentTime }}
                      onChange={(sel) => {
                        setRescheduleBayId(sel.bayId);
                        setRescheduleTime(sel.time ?? "");
                        setRescheduleError("");
                      }}
                    />
                  </div>
                )}

                {/* Slot Grid */}
                {rescheduleDate && !rescheduleTarget.bayId && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-[#999] uppercase mb-2">Available Slots</p>
                    {slotsLoading ? (
                      <div className="flex items-center justify-center py-4 text-[#999]">
                        <Loader2 size={16} className="animate-spin mr-2" />
                        <span className="text-xs">Loading slots...</span>
                      </div>
                    ) : rescheduleSlots.length === 0 ? (
                      <p className="text-xs text-[#999] text-center py-4">No slots configured for this date.</p>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {rescheduleSlots.map((slot) => {
                          const isFull  = slot.status === "full";
                          const isPast  = isSlotPast(slot.time);
                          const isSame  = rescheduleTarget.appointmentDate === rescheduleDate && rescheduleTarget.appointmentTime === slot.time;
                          const disabled = isFull || isPast || isSame;
                          const selected = rescheduleTime === slot.time;
                          const [hh, mm] = slot.time.split(":").map(Number);
                          const ampm = hh >= 12 ? "PM" : "AM";
                          const h12 = hh % 12 || 12;
                          const label = `${h12}:${String(mm).padStart(2, "0")} ${ampm}`;

                          return (
                            <button
                              key={slot.time}
                              disabled={disabled}
                              onClick={() => { setRescheduleTime(slot.time); setRescheduleError(""); }}
                              className={`py-2 rounded-lg text-xs font-medium transition-colors border ${
                                disabled
                                  ? "border-[#f0f0f0] text-[#ccc] bg-[#fafafa] cursor-not-allowed"
                                  : selected
                                    ? "border-[#ff5100] bg-[#ff5100] text-white"
                                    : slot.status === "limited"
                                      ? "border-[#ff5100]/20 text-[#ff5100] bg-[#ff5100]/5 hover:bg-[#ff5100]/10"
                                      : "border-[#e5e7eb] text-[#333] hover:border-[#ff5100]/30 hover:bg-[#ff5100]/5"
                              }`}
                            >
                              {label}
                              {!disabled && slot.status === "limited" && (
                                <span className="block text-[9px] opacity-75">{slot.capacity - slot.booked} left</span>
                              )}
                              {isSame && <span className="block text-[9px]">Current</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {rescheduleError && (
                  <p className="text-xs text-red-500 mb-3">{rescheduleError}</p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 justify-end">
                  <button
                    onClick={closeRescheduleModal}
                    className="px-4 py-2 text-sm font-medium text-[#333] border border-[#e5e7eb] rounded-lg hover:bg-[#f5f5f5] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!rescheduleDate || !rescheduleTime}
                    onClick={() => setRescheduleStep("confirm")}
                    className="px-4 py-2 text-sm font-medium text-white bg-[#ff5100] hover:bg-[#e04800] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Confirm step — old vs new summary */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-[10px] font-semibold text-red-400 uppercase mb-1">Previous</p>
                    <p className="text-sm font-bold text-red-600 line-through">
                      {formatDateTime(rescheduleTarget.appointmentDate, rescheduleTarget.appointmentTime)}
                    </p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-[10px] font-semibold text-green-500 uppercase mb-1">New</p>
                    <p className="text-sm font-bold text-green-700">
                      {formatDateTime(rescheduleDate, rescheduleTime)}
                    </p>
                  </div>
                </div>

                {/* Reason */}
                <div className="mb-4">
                  <label className="text-sm font-medium text-[#333]">Reason (optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Enter reason for rescheduling..."
                    value={rescheduleReason}
                    onChange={(e) => { setRescheduleReason(e.target.value); setRescheduleError(""); }}
                    className="w-full mt-1.5 px-3 py-2 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:border-[#ff5100] resize-none text-[#333] placeholder-[#bbb]"
                  />
                </div>

                <p className="text-xs text-[#999] mb-4">
                  A reschedule notification email will be sent to the customer.
                </p>

                {rescheduleError && (
                  <p className="text-xs text-red-500 mb-3">{rescheduleError}</p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 justify-end">
                  <button
                    onClick={() => setRescheduleStep("date")}
                    disabled={rescheduling}
                    className="px-4 py-2 text-sm font-medium text-[#333] border border-[#e5e7eb] rounded-lg hover:bg-[#f5f5f5] transition-colors disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleConfirmReschedule}
                    disabled={rescheduling}
                    className="px-4 py-2 text-sm font-medium text-white bg-[#ff5100] hover:bg-[#e04800] rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2"
                  >
                    {rescheduling && <Loader2 size={13} className="animate-spin" />}
                    {rescheduling ? "Rescheduling..." : "Confirm Reschedule"}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default AppointmentDashboard;
