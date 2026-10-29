import { useNavigate, useLocation } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { CheckCircle2, Printer, ClipboardList, Plus, Home, ChevronRight, AlertTriangle } from "lucide-react";
import { ROUTES } from "../../constants/routes";
import { useAppointmentWizard } from "../../context/AppointmentWizardContext";
import { TIME_LABELS } from "../../context/AppointmentWizardContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SuccessState {
  bookingRef:       string;
  customerName:     string;
  vehicleName:      string;
  vehicleReg:       string;
  serviceLabel:     string;
  appointmentDate:  string;
  appointmentTime:  string;
  advisorName:      string;
  hasActiveJobCard: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

const AppointmentSuccess: React.FC = () => {
  const navigate      = useNavigate();
  const location      = useLocation();
  const { reset }     = useAppointmentWizard();

  const data = location.state as SuccessState | null;

  // Fallback if navigated here directly (no state)
  const bookingRef      = data?.bookingRef      ?? "—";
  const customerName    = data?.customerName    ?? "—";
  const vehicleDisplay  = data?.vehicleName
    ? `${data.vehicleName}${data.vehicleReg ? ` — ${data.vehicleReg}` : ""}`
    : "—";
  const serviceLabel    = data?.serviceLabel    ?? "—";
  const hasActiveJobCard = data?.hasActiveJobCard ?? false;

  const dateTimeLabel   = data?.appointmentDate && data?.appointmentTime
    ? `${format(parseISO(data.appointmentDate), "EEEE, d MMMM yyyy")} — ${TIME_LABELS[data.appointmentTime] ?? data.appointmentTime}`
    : "—";

  const advisorName = data?.advisorName || "Unassigned";

  const rows = [
    { label: "Booking ID",  value: bookingRef,     highlight: true },
    { label: "Customer",    value: customerName },
    { label: "Vehicle",     value: vehicleDisplay },
    { label: "Service",     value: serviceLabel },
    { label: "Date & Time", value: dateTimeLabel },
    { label: "Advisor",     value: advisorName },
  ];

  const handleBookAnother = () => {
    reset();
    navigate(ROUTES.APPOINTMENT_CREATE_CUSTOMER);
  };

  return (
    <div className="w-full pb-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-[#999]">
          <Home size={15} />
          <span>Home</span>
          <ChevronRight size={13} />
          <span
            className="cursor-pointer hover:text-[#333] transition-colors"
            onClick={() => navigate(ROUTES.APPOINTMENT_DASHBOARD)}
          >
            Appointments
          </span>
          <ChevronRight size={13} />
          <span className="text-[#333] font-medium">Appointment Confirmed</span>
        </nav>

        {/* Active job card warning */}
        {hasActiveJobCard && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle size={15} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-600 font-medium">
              Note: This vehicle currently has an active job order. Please verify with the service team before the appointment date.
            </p>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white border border-[#e5e7eb] rounded-[10px] p-8 md:p-12 flex flex-col items-center text-center shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)]">

          {/* Success Icon */}
          <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-6">
            <CheckCircle2 size={48} className="text-green-600" />
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-bold text-[#333] mb-2">
            Appointment Successfully Booked
          </h1>

          {/* Subheading */}
          <p className="text-sm text-[#999] mb-8">
            A confirmation has been sent to the customer via SMS and email
          </p>

          {/* Booking Reference */}
          <div className="w-full rounded-lg bg-[#f9f9f9] p-5 mb-6">
            <div className="flex flex-col gap-3">
              {rows.map((row) => (
                <div key={row.label} className="flex justify-between text-sm">
                  <span className="text-[#999]">{row.label}</span>
                  <span className={row.highlight ? "font-bold text-[#ff5100]" : "font-medium text-[#333]"}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <hr className="w-full border-[#f0f0f0] mb-6" />

          {/* Action Buttons */}
          <div className="w-full flex flex-col gap-3 mb-6">
            <button
              onClick={() => window.print()}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-[#333] border border-[#e5e7eb] rounded-lg hover:bg-[#f5f5f5] transition-colors"
            >
              <Printer size={16} />
              Print Confirmation
            </button>
            <button
              onClick={() => navigate(ROUTES.APPOINTMENT_DASHBOARD)}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-[#333] border border-[#e5e7eb] rounded-lg hover:bg-[#f5f5f5] transition-colors"
            >
              <ClipboardList size={16} />
              View Appointments
            </button>
            <button
              onClick={handleBookAnother}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-gradient-to-b from-[#ff4f31] to-[#fe2b73] rounded-lg hover:opacity-90 transition-opacity"
            >
              <Plus size={16} />
              Book Another Appointment
            </button>
          </div>

          {/* Footer note */}
          <p className="text-xs text-[#999]">
            Appointment added to today's schedule and assigned advisor notified
          </p>
        </div>
      </div>
    </div>
  );
};

export default AppointmentSuccess;
