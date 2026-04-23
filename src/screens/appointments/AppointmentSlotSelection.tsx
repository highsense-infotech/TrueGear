import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  format, startOfMonth, endOfMonth,
  eachDayOfInterval, getDay, isBefore, isToday, isSameDay, parseISO,
} from "date-fns";
import {
  Home,
  ChevronRight,
  ChevronLeft,
  User,
  Car,
  Wrench,
  CalendarDays,
  CheckSquare,
  Check,
  Info,
  Pencil,
  Loader2,
} from "lucide-react";
import Button from "../../components/common/Button";
import { ROUTES } from "../../constants/routes";
import {
  getSlotAvailability,
  listServiceAdvisors,
  type SlotInfo,
  type ServiceAdvisorUser,
} from "../../api/appointment.api";
import { useAppointmentWizard, TIME_LABELS } from "../../context/AppointmentWizardContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Customer", icon: User },
  { label: "Vehicle",  icon: Car },
  { label: "Service",  icon: Wrench },
  { label: "Slot",     icon: CalendarDays },
  { label: "Review",   icon: CheckSquare },
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type SlotStatus = "available" | "limited" | "full" | "closed";

const SLOT_COLORS: Record<SlotStatus, { bg: string; border: string; text: string }> = {
  available: { bg: "bg-green-50",  border: "border-green-200", text: "text-green-600" },
  limited:   { bg: "bg-amber-50",  border: "border-amber-200", text: "text-amber-500" },
  full:      { bg: "bg-red-50",    border: "border-red-200",   text: "text-red-500"   },
  closed:    { bg: "bg-[#f5f5f5]", border: "border-[#e5e7eb]", text: "text-[#999]"    },
};

// ─── Component ────────────────────────────────────────────────────────────────

const AppointmentSlotSelection: React.FC = () => {
  const navigate            = useNavigate();
  const { state, setState } = useAppointmentWizard();
  const currentStep         = 3;
  const today               = new Date();

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (state.appointmentDate) {
      const d = parseISO(state.appointmentDate);
      return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    return state.appointmentDate ? parseISO(state.appointmentDate) : null;
  });

  const [selectedTime, setSelectedTime] = useState<string | null>(state.appointmentTime);

  // Slot data
  const [slots,        setSlots]        = useState<SlotInfo[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Pickup state
  const [pickupEnabled,  setPickupEnabled]  = useState(state.pickupRequired);
  const [pickupAddress,  setPickupAddress]  = useState(state.pickupAddress);
  const [editingAddress, setEditingAddress] = useState(false);

  // Service advisors
  const [advisors,        setAdvisors]        = useState<ServiceAdvisorUser[]>([]);
  const [selectedAdvisor, setSelectedAdvisor] = useState<string>(state.serviceAdvisorId ?? "");

  // ─── Fetch advisors once ──────────────────────────────────────────────────
  useEffect(() => {
    listServiceAdvisors().then((list) => {
      setAdvisors(list);
      // If context has a previous selection, keep it; otherwise default to first advisor
      if (!state.serviceAdvisorId && list.length > 0) {
        setSelectedAdvisor(list[0].id);
      }
    });
  }, []);

  // ─── Fetch slots when date changes ────────────────────────────────────────
  useEffect(() => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    setSlotsLoading(true);
    getSlotAvailability(dateStr)
      .then((res) => setSlots(res.data?.slots ?? []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
    // Reset time when date changes
    setSelectedTime(null);
  }, [selectedDate?.toDateString()]);

  const canProceed       = selectedDate && selectedTime;
  const selectedSlot     = slots.find((s) => s.time === selectedTime);
  const advisorName      = advisors.find((a) => a.id === selectedAdvisor)?.username ?? "";

  // Returns true if the slot time has already passed (only relevant when date = today)
  const isSlotPast = (slotTime: string): boolean => {
    if (!selectedDate || !isToday(selectedDate)) return false;
    const now = new Date();
    const [sh, sm] = slotTime.split(":").map(Number);
    return sh < now.getHours() || (sh === now.getHours() && sm <= now.getMinutes());
  };

  const monthStart     = startOfMonth(currentMonth);
  const monthEnd       = endOfMonth(currentMonth);
  const daysInMonth    = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleNext = () => {
    if (!selectedDate || !selectedTime) return;
    setState({
      appointmentDate:    format(selectedDate, "yyyy-MM-dd"),
      appointmentTime:    selectedTime,
      pickupRequired:     pickupEnabled,
      pickupAddress:      pickupEnabled ? pickupAddress : "",
      serviceAdvisorId:   selectedAdvisor || null,
      serviceAdvisorName: advisorName,
    });
    navigate(ROUTES.APPOINTMENT_CREATE_REVIEW);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 w-full">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-[#999]">
        <Home size={15} />
        <span>Home</span>
        <ChevronRight size={13} />
        <span className="cursor-pointer hover:text-[#333] transition-colors" onClick={() => navigate(ROUTES.APPOINTMENT_DASHBOARD)}>
          Appointments
        </span>
        <ChevronRight size={13} />
        <span className="text-[#333] font-medium">Slot Selection</span>
      </nav>

      {/* Stepper */}
      <div className="bg-white border border-[#e5e7eb] rounded-[10px] p-5 shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const Icon        = step.icon;
            const isActive    = index === currentStep;
            const isCompleted = index < currentStep;
            const isLast      = index === STEPS.length - 1;
            return (
              <div key={step.label} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isCompleted ? "bg-green-600 text-white" :
                    isActive    ? "bg-gradient-to-b from-[#ff4f31] to-[#fe2b73] text-white" :
                                  "bg-[#f5f5f5] text-[#999]"
                  }`}>
                    {isCompleted ? <Check size={20} /> : <Icon size={20} />}
                  </div>
                  <span className={`text-xs font-medium text-center whitespace-nowrap ${isActive ? "text-[#333]" : "text-[#999]"}`}>
                    {step.label}
                  </span>
                </div>
                {!isLast && (
                  <div className={`flex-1 h-0.5 mx-2 mb-5 ${isCompleted ? "bg-green-600" : "bg-[#e5e7eb]"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Body: left form + right summary */}
      <div className="flex gap-6 items-start">

        {/* Left panel */}
        <div className="flex-[2] flex flex-col gap-5">

          {/* ── Card 1: Calendar ── */}
          <div className="bg-white border border-[#e5e7eb] rounded-[10px] p-6 shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)]">
            <h3 className="text-base font-bold text-[#333] mb-1">Select Appointment Date</h3>
            <p className="text-sm text-[#999] mb-4">Choose a date for the service appointment</p>

            {/* Month nav */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                className="w-8 h-8 flex items-center justify-center border border-[#e5e7eb] rounded-lg hover:bg-[#f5f5f5] transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-bold text-[#333]">{format(currentMonth, "MMMM yyyy")}</span>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                className="w-8 h-8 flex items-center justify-center border border-[#e5e7eb] rounded-lg hover:bg-[#f5f5f5] transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map(day => (
                <div key={day} className="text-center text-xs font-medium text-[#999] py-1">{day}</div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="h-10" />
              ))}
              {daysInMonth.map(day => {
                const isPast       = isBefore(day, today) && !isToday(day);
                const isTodayDate  = isSameDay(day, today);
                const isSelected   = selectedDate ? isSameDay(day, selectedDate) : false;
                const isSelectable = !isPast;

                let cls = "h-10 rounded-lg text-sm font-medium transition-all flex flex-col items-center justify-center ";
                if (isSelected) {
                  cls += "bg-[#ff5100] text-white ";
                } else if (isPast) {
                  cls += "text-[#ccc] cursor-not-allowed ";
                } else {
                  cls += "text-[#333] hover:bg-[#f5f5f5] cursor-pointer ";
                }
                if (isTodayDate && !isSelected) cls += "ring-2 ring-[#ff5100] ring-inset ";

                return (
                  <button
                    key={day.toISOString()}
                    disabled={!isSelectable}
                    onClick={() => isSelectable && setSelectedDate(day)}
                    className={cls}
                  >
                    <span>{day.getDate()}</span>
                  </button>
                );
              })}
            </div>

            {/* Time Slots */}
            <div className="mt-5">
              <p className="text-sm font-semibold text-[#333] mb-1">Available Time Slots</p>
              <p className="text-xs text-[#999] mb-3">
                {selectedDate ? format(selectedDate, "EEEE, d MMMM yyyy") : "Select a date first"}
              </p>

              {slotsLoading ? (
                <div className="flex items-center justify-center py-6 gap-2 text-[#999]">
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-sm">Loading slots...</span>
                </div>
              ) : slots.length === 0 && selectedDate ? (
                <p className="text-sm text-[#999] py-4 text-center">No slot data available for this date.</p>
              ) : (
                <div className="grid grid-cols-5 gap-2">
                  {slots.map(slot => {
                    const past         = isSlotPast(slot.time);
                    const isSelected   = selectedTime === slot.time;
                    const isSelectable = !past && (slot.status === "available" || slot.status === "limited");
                    const colors       = past ? SLOT_COLORS.closed : SLOT_COLORS[slot.status];
                    const label        = TIME_LABELS[slot.time] ?? slot.time;
                    const statusLabel  = past ? "past" : slot.status === "limited" ? `${slot.capacity - slot.booked} left` : slot.status;
                    return (
                      <button
                        key={slot.time}
                        disabled={!isSelectable}
                        onClick={() => isSelectable && setSelectedTime(slot.time)}
                        className={`border rounded-lg p-2.5 text-center transition-all ${
                          isSelected
                            ? "border-[#ff5100] bg-[#ff5100]/5"
                            : `${colors.border} ${colors.bg} ${isSelectable ? "cursor-pointer hover:shadow-sm" : "cursor-not-allowed opacity-70"}`
                        }`}
                      >
                        <p className={`text-xs font-bold ${isSelected ? "text-[#333]" : colors.text}`}>{label}</p>
                        <p className={`text-[9px] mt-0.5 capitalize ${isSelected ? "text-[#999]" : colors.text}`}>
                          {statusLabel}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[#f0f0f0]">
              {[
                { label: "Available", cls: "bg-green-600" },
                { label: "Limited",   cls: "bg-amber-500" },
                { label: "Full",      cls: "bg-red-500" },
                { label: "Closed",    cls: "bg-[#999]" },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${item.cls}`} />
                  <span className="text-xs text-[#999]">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Card 2: Pickup & Drop ── */}
          {/* <div className="bg-white border border-[#e5e7eb] rounded-[10px] p-6 shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h3 className="text-base font-bold text-[#333]">Pickup & Drop</h3>
                <p className="text-sm text-[#999] mt-0.5">Does the customer require vehicle collection?</p>
              </div>
              <button
                onClick={() => setPickupEnabled(!pickupEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  pickupEnabled ? "bg-[#ff5100]" : "bg-[#e5e7eb]"
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                  pickupEnabled ? "translate-x-6" : "translate-x-1"
                }`} />
              </button>
            </div>

            {pickupEnabled && (
              <div className="mt-4 flex flex-col gap-4 pt-4 border-t border-[#f0f0f0]">
                <div>
                  <label className="text-sm font-medium text-[#333]">Pickup Address</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      value={pickupAddress}
                      onChange={(e) => setPickupAddress(e.target.value)}
                      readOnly={!editingAddress}
                      className={`flex-1 px-3 py-2 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:border-[#ff5100] text-[#333] ${
                        !editingAddress ? "bg-[#f5f5f5]" : "bg-white"
                      }`}
                    />
                    <button
                      onClick={() => setEditingAddress(!editingAddress)}
                      className="w-9 h-9 flex items-center justify-center border border-[#e5e7eb] rounded-lg hover:bg-[#f5f5f5] transition-colors shrink-0"
                    >
                      {editingAddress ? <Check size={15} /> : <Pencil size={15} />}
                    </button>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-[#ff5100]/5 border border-[#ff5100]/20">
                  <Info size={15} className="text-[#ff5100] mt-0.5 shrink-0" />
                  <p className="text-xs text-[#999]">Driver will be assigned after confirmation</p>
                </div>
              </div>
            )}
          </div> */}

          {/* ── Card 3: Assignment ── */}
          <div className="bg-white border border-[#e5e7eb] rounded-[10px] p-6 shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#333]">Assignment</h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border border-[#e5e7eb] text-[#999]">
                Optional
              </span>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium text-[#333]">Service Advisor</label>
                <select
                  value={selectedAdvisor}
                  onChange={(e) => setSelectedAdvisor(e.target.value)}
                  className="w-full px-3 py-2 mt-1 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:border-[#ff5100] text-[#333] bg-white"
                >
                  <option value="">Unassigned</option>
                  {advisors.map((a) => (
                    <option key={a.id} value={a.id}>{a.username}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-[#ff5100]/5 border border-[#ff5100]/20">
                <Info size={15} className="text-[#ff5100] mt-0.5 shrink-0" />
                <p className="text-xs text-[#999]">Advisor can be reassigned after booking if needed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel — Booking Summary */}
        <div className="w-72 shrink-0">
          <div className="bg-white border border-[#e5e7eb] rounded-[10px] p-6 shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)] sticky top-6">
            <h3 className="text-base font-bold text-[#333] mb-4">Booking Summary</h3>
            <div className="flex flex-col gap-3">
              {[
                { label: "Customer",     value: state.customerName  || "—",   bold: true },
                { label: "Phone",        value: state.customerPhone || "—" },
                { label: "Vehicle",      value: state.vehicleName   || "—",   bold: true },
                { label: "Reg",          value: state.vehicleReg    || "—" },
                { label: "Service",      value: state.serviceLabel  || "—",   bold: true },
                { label: "Complaints",   value: state.complaints.join(", ") || "—" },
                { label: "Pickup/Drop",  value: pickupEnabled ? "Yes" : "No" },
                { label: "Est. Duration", value: `${Math.floor(state.estimatedDurationMinutes / 60)}h ${state.estimatedDurationMinutes % 60}m` },
              ].map(({ label, value, bold }, i, arr) => (
                <div key={label}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#999]">{label}</span>
                    <span className={`text-sm text-right max-w-[160px] truncate ${bold ? "font-medium text-[#333]" : "text-[#333]"}`}>{value}</span>
                  </div>
                  {i < arr.length - 1 && <hr className="border-[#f0f0f0] mt-3" />}
                </div>
              ))}
              <hr className="border-[#f0f0f0]" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#999]">Date</span>
                <span className={`text-sm ${selectedDate ? "font-medium text-[#333]" : "text-[#999]"}`}>
                  {selectedDate ? format(selectedDate, "d MMM yyyy") : "Not selected"}
                </span>
              </div>
              <hr className="border-[#f0f0f0]" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#999]">Time</span>
                <span className={`text-sm ${selectedSlot ? "font-medium text-[#333]" : "text-[#999]"}`}>
                  {selectedSlot ? (TIME_LABELS[selectedSlot.time] ?? selectedSlot.time) : "Not selected"}
                </span>
              </div>
              <hr className="border-[#f0f0f0]" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#999]">Advisor</span>
                <span className={`text-sm ${advisorName ? "text-[#333]" : "text-[#999]"}`}>
                  {advisorName || "Unassigned"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bottom-0 -mx-4 sm:-mx-6 lg:-mx-8 -mb-4 sm:-mb-6 lg:-mb-8 mt-2 bg-white border-t border-[#e5e7eb] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-32 h-2 bg-[#f0f0f0] rounded-full overflow-hidden">
            <div className="h-full bg-green-600 rounded-full" style={{ width: "80%" }} />
          </div>
          <span className="text-xs text-[#999] whitespace-nowrap">Step 4 of 5 — Slot Selection</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate(ROUTES.APPOINTMENT_CREATE_SERVICE)}>
            Previous
          </Button>
          <Button
            variant="gradient"
            disabled={!canProceed}
            onClick={handleNext}
          >
            Next
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

    </div>
  );
};

export default AppointmentSlotSelection;
