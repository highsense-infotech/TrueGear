import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home,
  ChevronRight,
  User,
  Car,
  Wrench,
  CalendarDays,
  CheckSquare,
  Check,
  Clock,
  X,
} from "lucide-react";
import Button from "../../components/common/Button";
import { ROUTES } from "../../constants/routes";
import {
  useAppointmentWizard,
  SERVICE_TYPE_MAP,
  SERVICE_LABEL_MAP,
  SERVICE_DURATION_MAP,
} from "../../context/AppointmentWizardContext";
import { listComplaints } from "../../api/complaint.api";
import { listServiceTypes, type ServiceTypeItem } from "../../api/serviceType.api";

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Customer", icon: User },
  { label: "Vehicle",  icon: Car },
  { label: "Service",  icon: Wrench },
  { label: "Slot",     icon: CalendarDays },
  { label: "Review",   icon: CheckSquare },
];

// ─── Component ────────────────────────────────────────────────────────────────

const AppointmentServiceDetails: React.FC = () => {
  const navigate            = useNavigate();
  const { state, setState } = useAppointmentWizard();
  const currentStep         = 2;

  // Dynamic service types from DB
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeItem[]>([]);

  // Suggested complaints from DB
  const [suggestedComplaints, setSuggestedComplaints] = useState<string[]>([]);

  useEffect(() => {
    listServiceTypes()
      .then((res) => setServiceTypes(res.data ?? []))
      .catch(() => {/* optional */});
    listComplaints()
      .then((res) => setSuggestedComplaints((res.data ?? []).map((c) => c.name)))
      .catch(() => {/* optional */});
  }, []);

  // Pre-fill from context
  const [selectedService, setSelectedService] = useState(state.serviceType || "periodic");
  const [complaints,      setComplaints]      = useState<string[]>(state.complaints.length ? state.complaints : []);
  const [complaintText,   setComplaintText]   = useState("");
  const [overrideEnabled, setOverrideEnabled] = useState(state.isOverrideEnabled);

  // Override hours/mins derived from context duration if override was on, else from service map
  const initDuration = state.isOverrideEnabled
    ? state.estimatedDurationMinutes
    : (SERVICE_DURATION_MAP[state.serviceType] ?? 150);

  const [overrideHours,   setOverrideHours]   = useState(String(Math.floor(initDuration / 60)));
  const [overrideMinutes, setOverrideMinutes] = useState(String(initDuration % 60));

  // Auto-duration from selected service
  const autoDurationMinutes = SERVICE_DURATION_MAP[selectedService] ?? 150;
  const autoHours           = Math.floor(autoDurationMinutes / 60);
  const autoMins            = autoDurationMinutes % 60;

  const effectiveDurationMinutes = overrideEnabled
    ? (Number(overrideHours) * 60 + Number(overrideMinutes))
    : autoDurationMinutes;

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleServiceChange = (id: string) => {
    setSelectedService(id);
    if (!overrideEnabled) {
      const d = SERVICE_DURATION_MAP[id] ?? 150;
      setOverrideHours(String(Math.floor(d / 60)));
      setOverrideMinutes(String(d % 60));
    }
  };

  const addComplaint = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !complaints.includes(trimmed)) setComplaints([...complaints, trimmed]);
  };

  const removeComplaint = (tag: string) => setComplaints(complaints.filter(c => c !== tag));

  const handleAddCustomComplaint = () => {
    const parts = complaintText.split(/[,\n]+/).map(s => s.trim()).filter(s => s && !complaints.includes(s));
    if (parts.length > 0) { setComplaints([...complaints, ...parts]); setComplaintText(""); }
  };

  const handleResetOverride = () => {
    setOverrideEnabled(false);
    const d = SERVICE_DURATION_MAP[selectedService] ?? 150;
    setOverrideHours(String(Math.floor(d / 60)));
    setOverrideMinutes(String(d % 60));
  };

  const selectedServiceLabel: string = serviceTypes.find((t) => t.code === selectedService)?.name
    || SERVICE_LABEL_MAP[selectedService] || selectedService;

  const handleNext = () => {
    setState({
      serviceType:              selectedService,
      serviceTypeBackend:       SERVICE_TYPE_MAP[selectedService] || selectedService.toUpperCase(),
      serviceLabel:             selectedServiceLabel,
      complaints,
      estimatedDurationMinutes: effectiveDurationMinutes,
      isOverrideEnabled:        overrideEnabled,
    });
    navigate(ROUTES.APPOINTMENT_CREATE_SLOT);
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
        <span className="text-[#333] font-medium">Service Details</span>
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

          {/* Service Type */}
          <div className="bg-white border border-[#e5e7eb] rounded-[10px] p-6 shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)]">
            <h3 className="text-base font-bold text-[#333] mb-1">Service Type</h3>
            <p className="text-sm text-[#999] mb-4">Select the type of service required</p>
            <div className="grid grid-cols-3 gap-3">
              {serviceTypes.map((type) => {
                const isSelected = selectedService === type.code;
                return (
                  <div
                    key={type.code}
                    onClick={() => handleServiceChange(type.code)}
                    className={`border rounded-lg p-4 cursor-pointer transition-all flex flex-col items-center gap-2 text-center ${
                      isSelected ? "border-[#ff5100] bg-[#ff5100]/5" : "border-[#e5e7eb] hover:border-[#999]"
                    }`}
                  >
                    <span className="text-2xl">{type.emoji}</span>
                    <span className={`text-sm font-medium ${isSelected ? "text-[#333]" : "text-[#999]"}`}>
                      {type.name}
                    </span>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? "border-[#ff5100]" : "border-[#ccc]"
                    }`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-[#ff5100]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Customer Complaints */}
          <div className="bg-white border border-[#e5e7eb] rounded-[10px] p-6 shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)]">
            <h3 className="text-base font-bold text-[#333] mb-1">Customer Complaints</h3>
            <p className="text-sm text-[#999] mb-4">Describe issues reported by the customer</p>

            {complaints.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {complaints.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#ff5100] text-white">
                    {tag}
                    <button onClick={() => removeComplaint(tag)} className="ml-0.5 hover:opacity-70">
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <textarea
                placeholder="Type a complaint and press Enter to add, or use comma to add multiple..."
                rows={3}
                value={complaintText}
                onChange={(e) => setComplaintText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddCustomComplaint(); } }}
                className="w-full px-3 py-2 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:border-[#ff5100] text-[#333] resize-none"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#999]">Press Enter to add, or comma-separate multiple complaints</p>
                <button
                  disabled={!complaintText.trim()}
                  onClick={handleAddCustomComplaint}
                  className="text-xs px-3 py-1.5 border border-[#e5e7eb] rounded-lg text-[#333] hover:bg-[#f5f5f5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Add Complaint
                </button>
              </div>
            </div>

            <div className="mt-3">
              <p className="text-xs font-medium text-[#999] mb-2">Common Complaints</p>
              <div className="flex flex-wrap gap-2">
                {suggestedComplaints.map(tag => (
                  <button
                    key={tag}
                    onClick={() => addComplaint(tag)}
                    disabled={complaints.includes(tag)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      complaints.includes(tag)
                        ? "border-[#e5e7eb] text-[#ccc] cursor-not-allowed opacity-50"
                        : "border-[#e5e7eb] text-[#999] hover:border-[#333] hover:text-[#333]"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Estimated Service Time */}
          <div className="bg-white border border-[#e5e7eb] rounded-[10px] p-6 shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)]">
            <h3 className="text-base font-bold text-[#333] mb-1">Estimated Service Time</h3>
            <p className="text-sm text-[#999] mb-4">Auto-calculated based on service type selected</p>

            {!overrideEnabled ? (
              <div className="bg-[#f5f5f5] rounded-lg px-4 py-3">
                <p className="text-lg font-bold text-[#333]">
                  {autoHours > 0 ? `${autoHours} Hour${autoHours > 1 ? "s" : ""} ` : ""}
                  {autoMins > 0 ? `${autoMins} Minutes` : ""}
                </p>
                <p className="text-xs text-[#999] mt-0.5">
                  Based on: {selectedServiceLabel} — Standard
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-[#333]">Hours</label>
                    <input
                      type="number" min="0" max="24"
                      value={overrideHours}
                      onChange={(e) => setOverrideHours(e.target.value)}
                      className="w-full px-3 py-2 mt-1 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:border-[#ff5100] text-[#333]"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#333]">Minutes</label>
                    <input
                      type="number" min="0" max="59"
                      value={overrideMinutes}
                      onChange={(e) => setOverrideMinutes(e.target.value)}
                      className="w-full px-3 py-2 mt-1 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:border-[#ff5100] text-[#333]"
                    />
                  </div>
                </div>
                <p className="text-xs text-[#999]">
                  Original estimate: {autoHours}h {autoMins}m ({selectedServiceLabel} — Standard)
                </p>
              </div>
            )}

            <div className="flex justify-end mt-2">
              <button
                className="text-xs text-[#ff5100] hover:opacity-80 underline"
                onClick={() => overrideEnabled ? handleResetOverride() : setOverrideEnabled(true)}
              >
                {overrideEnabled ? "Reset to auto" : "Override"}
              </button>
            </div>

            <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <Clock size={15} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-600 font-medium">
                Duration: {Math.floor(effectiveDurationMinutes / 60)}h {effectiveDurationMinutes % 60}m — slot selection may vary
              </p>
            </div>
          </div>
        </div>

        {/* Right panel — Booking Summary */}
        <div className="w-72 shrink-0">
          <div className="bg-white border border-[#e5e7eb] rounded-[10px] p-6 shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)] sticky top-6">
            <h3 className="text-base font-bold text-[#333] mb-4">Booking Summary</h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#999]">Customer</span>
                <span className="text-sm font-medium text-[#333]">{state.customerName || "—"}</span>
              </div>
              <hr className="border-[#f0f0f0]" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#999]">Phone</span>
                <span className="text-sm text-[#333]">{state.customerPhone || "—"}</span>
              </div>
              <hr className="border-[#f0f0f0]" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#999]">Vehicle</span>
                <span className="text-sm font-medium text-[#333]">{state.vehicleName || "—"}</span>
              </div>
              <hr className="border-[#f0f0f0]" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#999]">Reg</span>
                <span className="text-sm text-[#333]">{state.vehicleReg || "—"}</span>
              </div>
              <hr className="border-[#f0f0f0]" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#999]">Service Type</span>
                <span className="text-sm font-medium text-[#333]">
                  {selectedServiceLabel}
                </span>
              </div>
              <hr className="border-[#f0f0f0]" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#999]">Est. Duration</span>
                <span className="text-sm text-[#333]">
                  {Math.floor(effectiveDurationMinutes / 60)}h {effectiveDurationMinutes % 60}m
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
            <div className="h-full bg-green-600 rounded-full" style={{ width: "60%" }} />
          </div>
          <span className="text-xs text-[#999] whitespace-nowrap">Step 3 of 5 — Service Details</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate(ROUTES.APPOINTMENT_CREATE_VEHICLE)}>
            Previous
          </Button>
          <Button variant="gradient" onClick={handleNext}>
            Next
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

    </div>
  );
};

export default AppointmentServiceDetails;
