import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import {
  Home,
  ChevronRight,
  User,
  Car,
  Wrench,
  CalendarDays,
  CheckSquare,
  Check,
  Ban,
  Info,
  Pencil,
  Loader2,
} from "lucide-react";
import Button from "../../components/common/Button";
import { ROUTES } from "../../constants/routes";
import { createAppointment } from "../../api/appointment.api";
import { useAppointmentWizard, TIME_LABELS } from "../../context/AppointmentWizardContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Customer", icon: User },
  { label: "Vehicle",  icon: Car },
  { label: "Service",  icon: Wrench },
  { label: "Slot",     icon: CalendarDays },
  { label: "Review",   icon: CheckSquare },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionCard = ({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) => (
  <div className="bg-white border border-[#e5e7eb] rounded-[10px] p-6 shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)]">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-base font-bold text-[#333]">{title}</h3>
      <button
        onClick={onEdit}
        className="flex items-center gap-1 text-xs text-[#999] hover:text-[#333] transition-colors"
      >
        <Pencil size={12} /> Edit
      </button>
    </div>
    <div className="flex flex-col gap-3">{children}</div>
  </div>
);

const Row = ({ label, value, bold }: { label: string; value: React.ReactNode; bold?: boolean }) => (
  <div>
    <div className="flex items-center justify-between">
      <span className="text-sm text-[#999]">{label}</span>
      <span className={`text-sm text-right ${bold ? "font-medium text-[#333]" : "text-[#333]"}`}>{value}</span>
    </div>
    <hr className="border-[#f0f0f0] mt-3" />
  </div>
);

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
      checked ? "bg-[#ff5100]" : "bg-[#e5e7eb]"
    }`}
  >
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
      checked ? "translate-x-6" : "translate-x-1"
    }`} />
  </button>
);

// ─── Component ────────────────────────────────────────────────────────────────

const AppointmentReview: React.FC = () => {
  const navigate            = useNavigate();
  const { state, setState, reset } = useAppointmentWizard();
  const currentStep         = 4;

  // Local state for fields editable on this page
  const [internalNotes, setInternalNotes] = useState(state.internalNotes);
  const [sendWhatsApp,  setSendWhatsApp]  = useState(state.sendWhatsApp);
  const [sendEmail,     setSendEmail]     = useState(state.sendEmail);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError,  setSubmitError]  = useState<string | null>(null);

  // ─── Derived display values ──────────────────────────────────────────────
  const estHours   = Math.floor(state.estimatedDurationMinutes / 60);
  const estMinutes = state.estimatedDurationMinutes % 60;
  const timeLabel  = state.appointmentTime ? (TIME_LABELS[state.appointmentTime] ?? state.appointmentTime) : "—";

  const slotDateLabel = state.appointmentDate
    ? format(parseISO(state.appointmentDate), "EEEE, d MMMM yyyy")
    : "—";

  // ─── Submit ──────────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!state.appointmentDate || !state.appointmentTime) return;

    setIsSubmitting(true);
    setSubmitError(null);

    // Save review-page fields to context first
    setState({ internalNotes, sendWhatsApp, sendEmail });

    try {
      const res = await createAppointment({
        customerId:               state.customerId ?? undefined,
        vehicleId:                state.vehicleId  ?? undefined,
        serviceAdvisorId:         state.serviceAdvisorId ?? undefined,
        serviceType:              state.serviceTypeBackend,
        complaints:               state.complaints,
        estimatedDurationMinutes: state.estimatedDurationMinutes,
        appointmentDate:          state.appointmentDate,
        appointmentTime:          state.appointmentTime,
        pickupRequired:           state.pickupRequired,
        pickupAddress:            state.pickupAddress || undefined,
        internalNotes:            internalNotes || undefined,
        sendWhatsApp,
        sendEmail,
        newCustomer:              state.isNewCustomer && state.newCustomerData ? state.newCustomerData : undefined,
        newVehicle:               state.isNewVehicle  && state.newVehicleData  ? {
          brand:              state.newVehicleData.brand,
          model:              state.newVehicleData.model,
          manufacturingYear:  state.newVehicleData.manufacturingYear,
          registrationNumber: state.newVehicleData.registrationNumber,
          vin:                state.newVehicleData.vin,
          fuelType:           state.newVehicleData.fuelType        || undefined,
          transmissionType:   state.newVehicleData.transmissionType || undefined,
          odometerLast:       state.newVehicleData.odometerLast,
          engineNumber:       state.newVehicleData.engineNumber     || undefined,
          seriesDescription:  state.newVehicleData.seriesDescription || undefined,
          modelDescription:   state.newVehicleData.modelDescription  || undefined,
          extColour:          state.newVehicleData.extColour         || undefined,
          registrationDate:   state.newVehicleData.registrationDate  || undefined,
          sellingDate:        state.newVehicleData.sellingDate        || undefined,
        } : undefined,
      });

      if (!res.data) {
        throw new Error(res.error?.message || "Failed to create appointment");
      }

      reset();

      navigate(ROUTES.APPOINTMENT_CREATE_SUCCESS, {
        replace: true,
        state: {
          bookingRef:       res.data.bookingRef,
          customerName:     state.customerName,
          vehicleName:      state.vehicleName,
          vehicleReg:       state.vehicleReg,
          serviceLabel:     state.serviceLabel,
          appointmentDate:  state.appointmentDate,
          appointmentTime:  state.appointmentTime,
          advisorName:      state.serviceAdvisorName,
          hasActiveJobCard: res.data.hasActiveJobCard ?? false,
        },
      });
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? "Failed to create appointment. Please try again.";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
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
        <span className="text-[#333] font-medium">Review & Confirm</span>
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

          {/* Customer Details */}
          <SectionCard title="Customer Details" onEdit={() => navigate(ROUTES.APPOINTMENT_CREATE_CUSTOMER)}>
            <Row label="Full Name" value={state.customerName}  bold />
            <Row label="Phone"     value={state.customerPhone || "—"} />
            <Row label="Email"     value={state.customerEmail || "—"} />
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#999]">Type</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                state.isNewCustomer
                  ? "border-blue-400 text-blue-600 bg-blue-50"
                  : "border-green-600 text-green-600 bg-green-50"
              }`}>
                {state.isNewCustomer ? "New Customer" : "Existing Customer"}
              </span>
            </div>
          </SectionCard>

          {/* Vehicle Details */}
          <SectionCard title="Vehicle Details" onEdit={() => navigate(ROUTES.APPOINTMENT_CREATE_VEHICLE)}>
            <Row label="Registration"  value={state.vehicleReg       || "—"} bold />
            <Row label="Make & Model"  value={state.vehicleMakeModel || "—"} />
            <Row label="Year"          value={state.vehicleYear       || "—"} />
            <Row label="Fuel Type"     value={state.vehicleFuel       || "—"} />
            <Row label="Transmission"  value={state.vehicleTransmission || "—"} />
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#999]">Odometer</span>
              <span className="text-sm text-[#333]">
                {state.vehicleOdometer ? `${Number(state.vehicleOdometer).toLocaleString()} KM` : "—"}
              </span>
            </div>
          </SectionCard>

          {/* Service Details */}
          <SectionCard title="Service Details" onEdit={() => navigate(ROUTES.APPOINTMENT_CREATE_SERVICE)}>
            <Row label="Service Type"       value={state.serviceLabel} bold />
            <Row label="Pickup/Drop"        value={state.pickupRequired ? "Yes" : "No"} />
            <Row label="Estimated Duration" value={`${estHours} hrs ${estMinutes} mins`} />
            <div className="flex items-start justify-between">
              <span className="text-sm text-[#999]">Complaints</span>
              <div className="flex flex-wrap gap-1 justify-end">
                {state.complaints.length > 0
                  ? state.complaints.map(c => (
                      <span key={c} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border border-[#e5e7eb] text-[#333]">
                        {c}
                      </span>
                    ))
                  : <span className="text-sm text-[#999]">—</span>
                }
              </div>
            </div>
          </SectionCard>

          {/* Appointment Slot */}
          <SectionCard title="Appointment Slot" onEdit={() => navigate(ROUTES.APPOINTMENT_CREATE_SLOT)}>
            <Row label="Date"            value={slotDateLabel}              bold />
            <Row label="Time"            value={timeLabel} />
            <Row label="Service Advisor" value={state.serviceAdvisorName || "Unassigned"} />
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#999]">Pickup Address</span>
              <span className="text-sm text-[#333] max-w-[200px] text-right truncate">
                {state.pickupRequired ? (state.pickupAddress || "Not provided") : "N/A"}
              </span>
            </div>
          </SectionCard>

          {/* Additional Options */}
          <div className="bg-white border border-[#e5e7eb] rounded-[10px] p-6 shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)]">
            <h3 className="text-base font-bold text-[#333] mb-4">Additional Options</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium text-[#333]">Internal Notes</label>
                <p className="text-xs text-[#999] mt-0.5 mb-2">Visible to workshop staff only</p>
                <textarea
                  rows={3}
                  placeholder="Add any special instructions..."
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:border-[#ff5100] text-[#333] resize-none"
                />
              </div>
              <hr className="border-[#f0f0f0]" />
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[#333]">Send WhatsApp Confirmation to Customer</p>
                <Toggle checked={sendWhatsApp} onChange={setSendWhatsApp} />
              </div>
              <hr className="border-[#f0f0f0]" />
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[#333]">Send Email Confirmation to Customer</p>
                <Toggle checked={sendEmail} onChange={setSendEmail} />
              </div>
            </div>
          </div>

          {/* Error / info banners */}
          <div className="flex flex-col gap-3">
            {submitError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                <Ban size={15} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-600 font-medium">{submitError}</p>
              </div>
            )}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-[#ff5100]/5 border border-[#ff5100]/20">
              <Info size={15} className="text-[#ff5100] mt-0.5 shrink-0" />
              <p className="text-xs text-[#999]">
                Service due reminder will be sent automatically 3 days before appointment
              </p>
            </div>
          </div>
        </div>

        {/* Right panel — Final Summary */}
        <div className="w-72 shrink-0">
          <div className="bg-white border border-[#e5e7eb] rounded-[10px] p-6 shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)] sticky top-6">
            <h3 className="text-base font-bold text-[#333] mb-4">Final Summary</h3>
            <div className="flex flex-col gap-3">
              {[
                { label: "Customer", value: state.customerName  || "—", bold: true },
                { label: "Phone",    value: state.customerPhone || "—" },
                { label: "Service",  value: state.serviceLabel  || "—" },
                { label: "Date",     value: slotDateLabel,               bold: true },
                { label: "Time",     value: timeLabel },
                { label: "Duration", value: `${estHours}h ${estMinutes}m` },
                { label: "Advisor",  value: state.serviceAdvisorName || "Unassigned" },
                { label: "Pickup",   value: state.pickupRequired ? "Yes" : "No" },
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
              <div className="flex items-start justify-between">
                <span className="text-sm text-[#999]">Vehicle</span>
                <div className="text-right">
                  <p className="text-sm font-medium text-[#333]">{state.vehicleName || "—"}</p>
                  {state.vehicleReg && <p className="text-xs text-[#999]">{state.vehicleReg}</p>}
                </div>
              </div>
              <hr className="border-[#f0f0f0]" />
              <p className="text-xs text-[#999] italic pt-1">Booking ID will be generated on confirmation</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bottom-0 -mx-4 sm:-mx-6 lg:-mx-8 -mb-4 sm:-mb-6 lg:-mb-8 mt-2 bg-white border-t border-[#e5e7eb] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-32 h-2 bg-[#f0f0f0] rounded-full overflow-hidden">
            <div className="h-full bg-green-600 rounded-full" style={{ width: "100%" }} />
          </div>
          <span className="text-xs text-[#999] whitespace-nowrap">Step 5 of 5 — Review & Confirm</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate(ROUTES.APPOINTMENT_CREATE_SLOT)} disabled={isSubmitting}>
            Previous
          </Button>
          <Button
            variant="gradient"
            icon={isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Confirming..." : "Confirm Appointment"}
          </Button>
        </div>
      </div>

    </div>
  );
};

export default AppointmentReview;
