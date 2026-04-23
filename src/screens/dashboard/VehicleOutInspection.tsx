import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import SignatureCanvas from "react-signature-canvas";
import { Plus, Trash2, RotateCcw, CheckSquare, Check, MoveRight } from "lucide-react";
import truck from "../../assets/truck.png";
import { InspectionSection } from "../../components/cards/InspectionSection";
import ProgressSteps from "../../components/cards/ProgressSteps";
import { Breadcrumb } from "../../components/common/Breadcrumb";
import Button from "../../components/common/Button";
import { ROUTES } from "../../constants/routes";

function VehicleOutSuccess({ reg, onNext }: { reg: string; onNext: () => void }) {
  return (
    <div className="inset-0 flex items-center justify-center z-50 mb-5">
      <div className="bg-white flex flex-col items-start p-7.5 rounded-[10px] w-110 border border-[#e5e7eb] shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-7.5 items-center justify-end w-full">
          <div className="flex flex-col gap-5.25 items-center w-full">
            <div className="bg-[rgba(40,183,0,0.2)] flex gap-2.5 items-center justify-center p-5.5 rounded-[36px] size-18">
              <div className="bg-[#3AA400] flex items-center justify-center rounded-[100px] shrink-0 size-9">
                <Check size={16} color="white" />
              </div>
            </div>
            <div className="flex flex-col gap-7.5 items-center w-full">
              <div className="flex flex-col gap-2.5 items-start justify-center text-center w-full">
                <div className="font-bold text-[#28b700] text-[24px] leading-[1.2] w-full">
                  Vehicle Out Report Submitted
                </div>
                <div className="font-medium text-[#333] text-[16px] leading-[1.2] w-full">
                  Vehicle {reg} has been cleared for exit
                </div>
              </div>
              <div className="bg-[rgba(77,0,193,0.1)] flex items-center justify-center px-4 py-2 rounded-[40px] border border-[rgba(77,0,193,0.4)]">
                <p className="text-[#4d00c1] text-[12px]">
                  <span className="font-bold">Status:</span>
                  <span className="font-medium"> Ready for Exit</span>
                </p>
              </div>
            </div>
          </div>
          <Button
            onClick={onNext}
            variant="secondary"
            icon={<MoveRight size={18} color="white" />}
            className="bg-[#136dec] shadow-[3px_4px_10px_0px_rgba(88,146,239,0.4)] hover:scale-105 w-full md:w-71 h-12.5"
          >
            Inspect Next Vehicle
          </Button>
        </div>
      </div>
    </div>
  );
}

type ChecklistStatus = "pass" | "fail" | "na" | null;

// Static checklist items
const exteriorItems = [
  { id: "e1", label: "Body / Paint Condition", subCategory: "Body & Paint" },
  { id: "e2", label: "Windscreen / Windows", subCategory: "Body & Paint" },
  { id: "e3", label: "Headlights / Taillights", subCategory: "Lights" },
  { id: "e4", label: "Mirrors / Indicators", subCategory: "Lights" },
  { id: "e5", label: "Tyres / Wheels", subCategory: "Tyres" },
  { id: "e6", label: "Wiper Blades", subCategory: "Body & Paint" },
];

const interiorItems = [
  { id: "i1", label: "Seats / Upholstery", subCategory: "Cabin" },
  { id: "i2", label: "Dashboard / Instruments", subCategory: "Cabin" },
  { id: "i3", label: "Air Conditioning", subCategory: "Climate" },
  { id: "i4", label: "Horn / Hooter", subCategory: "Safety" },
  { id: "i5", label: "Seatbelts", subCategory: "Safety" },
];

const brakeItems = [
  { id: "b1", label: "Brake Pads / Discs", subCategory: "Brake System" },
  { id: "b2", label: "Brake Fluid Level", subCategory: "Brake System" },
  { id: "b3", label: "Handbrake / Parking Brake", subCategory: "Brake System" },
  { id: "b4", label: "Brake Performance Test", subCategory: "Brake System" },
];

const vehicleMap: Record<string, { reg: string; brand: string; model: string }> = {
  v1: { reg: "GP 123 ABC", brand: "FAW", model: "J6 500" },
  v2: { reg: "GP 456 DEF", brand: "FAW", model: "J5P 350" },
  v4: { reg: "GP 321 JKL", brand: "UD", model: "Quester" },
  v5: { reg: "GP 654 MNO", brand: "FAW", model: "Tiger V" },
  v7: { reg: "GP 147 STU", brand: "FAW", model: "J6 500" },
};

interface ConfirmationComponent {
  majorComponent: string;
  itemNumber: string;
  comment: string;
}

const VehicleOutInspection: React.FC = () => {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const navigate = useNavigate();

  const vehicle = vehicleMap[vehicleId ?? ""] ?? { reg: "GP XXX XXX", brand: "FAW", model: "J6 500" };

  const [currentStep, setCurrentStep] = useState(1);
  const [maxStep, setMaxStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [bodyPaintStatus, setBodyPaintStatus] = useState<Record<number, ChecklistStatus>>({});
  const [seatsStatus, setSeatsStatus] = useState<Record<number, ChecklistStatus>>({});
  const [brakeStatus, setBrakeStatus] = useState<Record<number, ChecklistStatus>>({});

  const [components, setComponents] = useState<ConfirmationComponent[]>([{ majorComponent: "", itemNumber: "", comment: "" }]);
  const [checkout, setCheckout] = useState({ driverName: "", date: "", time: "", odometerBefore: "", odometerAfter: "", distanceDriven: "", comments: "" });
  const sigCanvasRef = useRef<SignatureCanvas>(null);

  const exteriorCompleted = Object.values(bodyPaintStatus).filter(Boolean).length;
  const interiorCompleted = Object.values(seatsStatus).filter(Boolean).length;
  const brakeCompleted = Object.values(brakeStatus).filter(Boolean).length;

  const handleSaveAndContinue = async () => {
    setSaving(true);
    try {
      if (currentStep < 5) {
        const nextStep = currentStep + 1;
        setCurrentStep(nextStep);
        setMaxStep((prev) => Math.max(prev, nextStep));
        toast.success(`Step ${currentStep} saved`);
      } else {
        // Submit
        setSubmitted(true);
        toast.success("Vehicle Out inspection submitted!");
      }
    } finally {
      setSaving(false);
    }
  };

  // Findings helper
  const getGroupBreakdown = (items: typeof exteriorItems, statuses: Record<number, ChecklistStatus>) => {
    const groups: Record<string, { pass: number; fail: number; na: number; failLabels: string[] }> = {};
    items.forEach((item, i) => {
      const group = item.subCategory || "General";
      if (!groups[group]) groups[group] = { pass: 0, fail: 0, na: 0, failLabels: [] };
      const s = statuses[i];
      if (s === "pass") groups[group].pass++;
      else if (s === "fail") { groups[group].fail++; groups[group].failLabels.push(item.label); }
      else if (s === "na") groups[group].na++;
    });
    return groups;
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-[#333] text-[18px] md:text-[20px] font-semibold">Exterior Inspection</h1>
                <p className="text-[#999] text-[12px]">Check exterior condition of the vehicle before exit</p>
              </div>
            </div>
            <InspectionSection
              title="Body & Paint"
              description="Scratches, Cracks or impact inspection"
              progress={`${exteriorCompleted}/${exteriorItems.length}`}
              items={exteriorItems}
              status={bodyPaintStatus}
              onStatusChange={setBodyPaintStatus}
            />
          </>
        );
      case 2:
        return (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-[#333] text-[18px] md:text-[20px] font-semibold">Interior Inspection</h1>
                <p className="text-[#999] text-[12px]">Check interior condition of the vehicle before exit</p>
              </div>
            </div>
            <InspectionSection
              title="Seats & Upholstery"
              description="Interior condition inspection"
              progress={`${interiorCompleted}/${interiorItems.length}`}
              items={interiorItems}
              status={seatsStatus}
              onStatusChange={setSeatsStatus}
            />
          </>
        );
      case 3:
        return (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-[#333] text-[18px] md:text-[20px] font-semibold">Brake Inspection</h1>
                <p className="text-[#999] text-[12px]">Brake system inspection</p>
              </div>
            </div>
            <InspectionSection
              title="Brake System"
              description="Brake system inspection"
              progress={`${brakeCompleted}/${brakeItems.length}`}
              items={brakeItems}
              status={brakeStatus}
              onStatusChange={setBrakeStatus}
            />
          </>
        );
      case 4: {
        const allSections = [
          { label: "Exterior", items: exteriorItems, statuses: bodyPaintStatus },
          { label: "Interior", items: interiorItems, statuses: seatsStatus },
          { label: "Brake", items: brakeItems, statuses: brakeStatus },
        ];

        return (
          <>
            <div className="mb-6">
              <div className="mb-4" style={{ borderBottom: "1px solid #F3F4F6", paddingBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>Findings Summary</h3>
                <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>Review all inspection findings before submitting</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {allSections.map((section) => {
                  const passCount = section.items.filter((_, i) => section.statuses[i] === "pass").length;
                  const failCount = section.items.filter((_, i) => section.statuses[i] === "fail").length;
                  const naCount = section.items.filter((_, i) => section.statuses[i] === "na").length;
                  const groupBreakdown = getGroupBreakdown(section.items, section.statuses);

                  return (
                    <div key={section.label} className="rounded-xl" style={{ padding: 20, border: "1px solid #E5E7EB" }}>
                      <h4 style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 12 }}>{section.label} Inspection</h4>
                      <div className="flex items-center gap-4 mb-3">
                        <span style={{ fontSize: 13, color: "#22C55E", fontWeight: 600 }}>&#10003; {passCount} Pass</span>
                        <span style={{ fontSize: 13, color: "#EF4444", fontWeight: 600 }}>&#10007; {failCount} Fail</span>
                        <span style={{ fontSize: 13, color: "#6B7280", fontWeight: 600 }}>&#8212; {naCount} N/A</span>
                      </div>
                      <div className="space-y-2" style={{ borderTop: "1px solid #F3F4F6", paddingTop: 10 }}>
                        {Object.entries(groupBreakdown).map(([group, counts]) => (
                          <div key={group}>
                            <p style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>{group}</p>
                            <div className="flex items-center gap-3">
                              <span style={{ fontSize: 12, color: "#22C55E" }}>{counts.pass} Pass</span>
                              <span style={{ fontSize: 12, color: "#EF4444" }}>{counts.fail} Fail</span>
                              <span style={{ fontSize: 12, color: "#6B7280" }}>{counts.na} N/A</span>
                            </div>
                            {counts.failLabels.length > 0 && (
                              <div className="mt-1">
                                {counts.failLabels.map((l) => (
                                  <p key={l} style={{ fontSize: 12, color: "#EF4444" }}>&#8226; {l}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        );
      }
      case 5:
        if (submitted) return (
          <VehicleOutSuccess reg={vehicle.reg} onNext={() => navigate(ROUTES.VEHICLE_OUT_DASHBOARD)} />
        );
        return (
          <>
            <div className="mb-6">
              <h1 className="text-[#333] text-[18px] md:text-[20px] font-semibold">Final Confirmation</h1>
              <p className="text-[#999] text-[12px]">Complete the details below before submitting the Vehicle Out report</p>
            </div>

            {/* Dynamic Component Cards */}
            {components.map((comp, idx) => (
              <div key={idx} className="border border-[#E5E7EB] rounded-xl p-5 mb-4 relative">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Component {idx + 1}</p>
                  {components.length > 1 && (
                    <button
                      onClick={() => setComponents(components.filter((_, i) => i !== idx))}
                      className="text-red-400 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="text-[12px] font-bold text-[#333] uppercase mb-1 block">Major Component</label>
                    <input
                      className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-[#333] placeholder-[#bbb] focus:outline-none focus:border-[#ff5100]"
                      placeholder="Enter major component"
                      value={comp.majorComponent}
                      onChange={(e) => {
                        const updated = [...components];
                        updated[idx] = { ...updated[idx], majorComponent: e.target.value };
                        setComponents(updated);
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-bold text-[#333] uppercase mb-1 block">Item Number</label>
                    <input
                      className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-[#333] placeholder-[#bbb] focus:outline-none focus:border-[#ff5100]"
                      placeholder="Enter item number"
                      value={comp.itemNumber}
                      onChange={(e) => {
                        const updated = [...components];
                        updated[idx] = { ...updated[idx], itemNumber: e.target.value };
                        setComponents(updated);
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[12px] font-bold text-[#333] uppercase mb-1 block">Comment</label>
                  <textarea
                    className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-[#333] placeholder-[#bbb] focus:outline-none focus:border-[#ff5100] resize-none"
                    rows={3}
                    placeholder="Enter detailed comments about this component..."
                    value={comp.comment}
                    onChange={(e) => {
                      const updated = [...components];
                      updated[idx] = { ...updated[idx], comment: e.target.value };
                      setComponents(updated);
                    }}
                  />
                </div>
              </div>
            ))}

            <button
              onClick={() => setComponents([...components, { majorComponent: "", itemNumber: "", comment: "" }])}
              className="flex items-center gap-2 text-sm font-medium text-[#ff5100] hover:text-[#e04800] mb-6 transition-colors cursor-pointer"
            >
              <Plus size={16} /> Add Component
            </button>

            {/* Vehicle Checkout */}
            <div className="border border-[#E5E7EB] rounded-xl p-5 mb-6">
              <h4 className="text-[16px] font-bold text-[#333] mb-1">Vehicle Checkout</h4>
              <p className="text-[13px] text-[#9CA3AF] italic mb-5">Record driver details, odometer readings, and distance driven during intake</p>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-[12px] font-bold text-[#333] uppercase mb-1 block">Driver Name</label>
                  <input
                    className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-sm text-[#333] placeholder-[#bbb] bg-[#f9fafb] focus:outline-none focus:border-[#ff5100]"
                    placeholder="Enter driver / technician name"
                    value={checkout.driverName}
                    onChange={(e) => setCheckout({ ...checkout, driverName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-[#333] uppercase mb-1 block">Date</label>
                  <input
                    type="date"
                    className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-sm text-[#333] bg-[#f9fafb] focus:outline-none focus:border-[#ff5100]"
                    value={checkout.date}
                    onChange={(e) => setCheckout({ ...checkout, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-[#333] uppercase mb-1 block">Time</label>
                  <input
                    type="time"
                    className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-sm text-[#333] bg-[#f9fafb] focus:outline-none focus:border-[#ff5100]"
                    value={checkout.time}
                    onChange={(e) => setCheckout({ ...checkout, time: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-[12px] font-bold text-[#333] uppercase mb-1 block">Odometer (Before)</label>
                  <input
                    type="number"
                    className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-sm text-[#333] placeholder-[#bbb] bg-[#f9fafb] focus:outline-none focus:border-[#ff5100]"
                    placeholder="e.g. 45,320 km"
                    value={checkout.odometerBefore}
                    onChange={(e) => setCheckout({ ...checkout, odometerBefore: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-[#333] uppercase mb-1 block">Odometer (After)</label>
                  <input
                    type="number"
                    className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-sm text-[#333] placeholder-[#bbb] bg-[#f9fafb] focus:outline-none focus:border-[#ff5100]"
                    placeholder="e.g. 45,325 km"
                    value={checkout.odometerAfter}
                    onChange={(e) => setCheckout({ ...checkout, odometerAfter: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-[#333] uppercase mb-1 block">Distance Driven</label>
                  <input
                    type="text"
                    className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-sm text-[#333] placeholder-[#bbb] bg-[#f9fafb] focus:outline-none focus:border-[#ff5100]"
                    placeholder="e.g. 5 km"
                    value={checkout.distanceDriven}
                    onChange={(e) => setCheckout({ ...checkout, distanceDriven: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-[12px] font-bold text-[#333] uppercase mb-1 block">Comments</label>
                <textarea
                  className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-sm text-[#333] placeholder-[#bbb] bg-[#f9fafb] focus:outline-none focus:border-[#ff5100]"
                  rows={4}
                  placeholder="Enter any additional notes about the vehicle intake..."
                  value={checkout.comments}
                  onChange={(e) => setCheckout({ ...checkout, comments: e.target.value })}
                />
              </div>
            </div>

            {/* Technician Signature */}
            <div className="border border-[#E5E7EB] rounded-xl p-5 mb-6">
              <h4 className="text-[13px] font-bold text-[#333] uppercase mb-3">Technician Signature</h4>
              <div className="border border-[#E5E7EB] rounded-lg overflow-hidden mb-2" style={{ height: 150 }}>
                <SignatureCanvas
                  ref={sigCanvasRef}
                  canvasProps={{ className: "w-full h-full", style: { width: "100%", height: "100%" } }}
                  backgroundColor="#fff"
                />
              </div>
              <button
                onClick={() => sigCanvasRef.current?.clear()}
                className="flex items-center gap-1.5 text-xs text-[#9CA3AF] hover:text-[#333] transition-colors cursor-pointer"
              >
                <RotateCcw size={14} /> Clear Signature
              </button>

              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="text-[12px] font-bold text-[#333] uppercase mb-1 block">Date</label>
                  <input className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-[#333] bg-[#fafafa]" value={new Date().toISOString().split("T")[0]} readOnly />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-[#333] uppercase mb-1 block">Time In</label>
                  <input className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-[#333] bg-[#fafafa]" value={new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })} readOnly />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-[#333] uppercase mb-1 block">Time Out</label>
                  <input className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-[#333] bg-[#fafafa]" value={new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })} readOnly />
                </div>
              </div>

              <p className="text-[13px] text-[#ff5100] italic mt-4">
                I certify that the Vehicle Out inspection was carried out satisfactorily.
              </p>
            </div>

            {/* Submit button */}
            <button
              onClick={handleSaveAndContinue}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-medium text-sm transition-colors disabled:opacity-50 cursor-pointer"
              style={{ background: "linear-gradient(135deg, #ff4f31, #fe2b73)" }}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </span>
              ) : (
                <>
                  <CheckSquare size={18} /> Submit Vehicle Out Report
                </>
              )}
            </button>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Vehicle Out", onClick: () => navigate(ROUTES.VEHICLE_OUT_DASHBOARD) },
          { label: "Vehicle Details" },
        ]}
      />
      <div className="bg-white rounded-xl p-4 md:p-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-linear-to-b from-[#FFC38B] to-[#FF4F31] overflow-hidden">
            <img src={truck} alt="Vehicle" className="max-w-17.5 object-contain" />
          </div>
          <div>
            <p className="text-[#333] text-[16px] mb-0.5">{vehicle.reg}</p>
            <p className="text-[#999] text-[12px]">{vehicle.brand} {vehicle.model}</p>
          </div>
        </div>

        <div className="border-b border-[#CACACA] my-4"></div>
        <div className="p-8">
          <ProgressSteps
            currentStep={currentStep}
            maxStep={maxStep}
            onStepClick={(step) => {
              if (step <= maxStep && step !== currentStep && !submitted) {
                setCurrentStep(step);
              }
            }}
          />
        </div>
        <div className="border-b border-[#CACACA] my-4"></div>

        {renderStepContent()}

        {/* Progress Bar */}
        <div className="bg-white border border-[#ebebeb] rounded-[10px] p-5 mb-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-3">
          <div className="w-full md:w-[50%]">
            <p className="text-[#333333] text-[14px] font-semibold leading-[120%] align-middle mb-1.25">Progress</p>
            <div className="w-full h-2 bg-[#f5f5f5] rounded-full">
              <div
                className="h-full bg-linear-to-r from-[#7CE000] to-[#03A800] rounded-full"
                style={{ width: `${(currentStep / 5) * 100}%` }}
              />
            </div>
          </div>
          {!submitted && currentStep !== 5 && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 w-full md:w-auto">
              <Button variant="outline" onClick={() => navigate(ROUTES.VEHICLE_OUT_DASHBOARD)}>Cancel</Button>
              <Button
                variant="gradient"
                gradient={{ from: "#ff4f31", to: "#fe2b73" }}
                onClick={handleSaveAndContinue}
                disabled={saving}
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : "Save & Continue"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default VehicleOutInspection;
