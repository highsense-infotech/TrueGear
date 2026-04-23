import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, ChevronRight, CheckCircle, XCircle, Eraser, X } from 'lucide-react';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import Button from '../../components/common/Button';
import { ROUTES } from '../../constants/routes';

// ─── Types ────────────────────────────────────────────────────────────────────

type YesNo = 'yes' | 'no' | null;

interface SystemCheck {
  id: string;
  label: string;
  value: YesNo;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Reference', number: 1 },
  { label: 'Checklist', number: 2 },
  { label: 'Sign-off', number: 3 },
];

const DUMMY_VEHICLES = [
  { id: 'v1', registration: 'KA 01 MB 1234', model: 'Toyota Camry',  serviceType: 'General Service + Brake Pad' },
  { id: 'v2', registration: 'KA 05 HN 7821', model: 'VW Tiguan',     serviceType: 'Engine Overhaul' },
  { id: 'v3', registration: 'TN 09 AK 3345', model: 'Ford Figo',     serviceType: 'Body Repair + Paint' },
  { id: 'v4', registration: 'MH 02 CX 9900', model: 'BMW 7 Series',  serviceType: 'Suspension + Alignment' },
  { id: 'v5', registration: 'DL 08 RT 5567', model: 'Ford Raptor',   serviceType: 'Transmission Service' },
  { id: 'v6', registration: 'KA 03 PL 2210', model: 'Hyundai Creta', serviceType: 'AC Repair + Gas Refill' },
  { id: 'v7', registration: 'TN 11 MV 8844', model: 'Mercedes Vito', serviceType: 'Electrical Diagnostics' },
  { id: 'v8', registration: 'AP 07 GH 4412', model: 'Buick Encore',  serviceType: 'Clutch Replacement' },
];

const FALLBACK_VEHICLE = { id: '', registration: 'Unknown', model: '', serviceType: '' };

// ─── Sign-off Modal ───────────────────────────────────────────────────────────

type Decision = 'pass' | 'fail' | null;

interface SignOffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { decision: Decision; failureReason: string; notes: string; signature: string | null }) => void;
}

function SignOffModal({ open, onOpenChange, onSubmit }: SignOffModalProps) {
  const [decision, setDecision]           = useState<Decision>(null);
  const [failureReason, setFailureReason] = useState('');
  const [notes, setNotes]                 = useState('');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [isDrawing, setIsDrawing]         = useState(false);
  const [hasSignature, setHasSignature]   = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }, []);

  useEffect(() => {
    if (open) setTimeout(initCanvas, 100);
  }, [open, initCanvas]);

  const getContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth   = 2;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
    }
    return ctx;
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const ctx = getContext();
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const ctx = getContext();
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setHasSignature(true);
    const canvas = canvasRef.current;
    if (canvas) setSignatureData(canvas.toDataURL());
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setSignatureData(null);
  };

  const handleSubmit = () => {
    if (!decision || !signatureData) return;
    if (decision === 'fail' && !failureReason) return;
    onSubmit({ decision, failureReason, notes, signature: signatureData });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0f0f0]">
          <h3 className="text-[18px] font-bold text-[#333]">Final QC Decision &amp; Sign-off</h3>
          <button onClick={() => onOpenChange(false)} className="text-[#999] hover:text-[#333] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-6">
          {/* Decision Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setDecision('pass')}
              className={`flex items-center justify-center gap-2 py-4 rounded-lg text-[13px] font-semibold transition-all border-2
                ${decision === 'pass'
                  ? 'bg-[#04C397] text-white border-[#04C397] shadow-md'
                  : 'bg-[#F0FBF8] text-[#04C397] border-[#04C397] hover:bg-[#e0f7f2]'}`}
            >
              <CheckCircle className="w-5 h-5" />
              Pass - Ready for Exit
            </button>
            <button
              onClick={() => setDecision('fail')}
              className={`flex items-center justify-center gap-2 py-4 rounded-lg text-[13px] font-semibold transition-all border-2
                ${decision === 'fail'
                  ? 'bg-[#DE2020] text-white border-[#DE2020] shadow-md'
                  : 'border-[#DE2020] text-[#DE2020] hover:bg-[#FFEBEE]'}`}
            >
              <XCircle className="w-5 h-5" />
              Fail - Return to Rework
            </button>
          </div>

          {/* Failure Details */}
          {decision === 'fail' && (
            <div className="flex flex-col gap-3 p-4 rounded-lg bg-[#fafafa] border border-[#e5e7eb]">
              <h4 className="text-[13px] font-bold text-[#333]">Failure Details</h4>
              <select
                value={failureReason}
                onChange={(e) => setFailureReason(e.target.value)}
                className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2.5 text-[13px] text-[#333] bg-white focus:outline-none focus:border-[#04C397] transition-colors"
              >
                <option value="">Reason for Failure</option>
                <option value="new_damage">New Damage Detected</option>
                <option value="incomplete_repair">Incomplete Repair</option>
                <option value="quality_below_standard">Quality Below Standard</option>
                <option value="safety_concern">Safety Concern</option>
                <option value="parts_issue">Parts Issue</option>
                <option value="other">Other</option>
              </select>
              <textarea
                placeholder="Inspector Notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2.5 text-[13px] text-[#333] placeholder-[#bbb] bg-white focus:outline-none focus:border-[#04C397] transition-colors resize-none"
              />
            </div>
          )}

          {/* Inspector Authorization — signature pad */}
          <div className="flex flex-col gap-3">
            <h4 className="text-[13px] font-bold text-[#333]">Inspector Authorization</h4>
            <div className="relative border-2 border-dashed border-[#e5e7eb] rounded-lg overflow-hidden bg-[#fafafa]">
              <canvas
                ref={canvasRef}
                className="w-full h-32 cursor-crosshair touch-none"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
              {!hasSignature && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-[13px] text-[#bbb]">Sign here</span>
                </div>
              )}
            </div>
            <button
              onClick={clearSignature}
              disabled={!hasSignature}
              className="self-start flex items-center gap-2 h-9 px-4 rounded-lg border border-[#e5e7eb] text-[12px] text-[#666] font-medium hover:bg-[#fafafa] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Eraser className="w-4 h-4" />
              Clear Signature
            </button>
          </div>

          {/* Submit */}
          <Button
            variant="gradient"
            gradient={{ from: '#04C397', to: '#158E86', direction: 'to-r' }}
            disabled={!decision || !signatureData || (decision === 'fail' && !failureReason)}
            onClick={handleSubmit}
            className="w-full h-12 text-[14px]"
          >
            Submit Final Status
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function QCOutInspection() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const navigate = useNavigate();

  const vehicle = DUMMY_VEHICLES.find((v) => v.id === vehicleId) ?? FALLBACK_VEHICLE;

  const [currentStep, setCurrentStep]             = useState(0);
  const [allRepairsVerified, setAllRepairsVerified] = useState(false);
  const [systemChecks, setSystemChecks]           = useState<SystemCheck[]>([
    { id: 'engine',   label: 'Engine Start',       value: null },
    { id: 'warnings', label: 'No Warning Lights',  value: null },
    { id: 'ac',       label: 'AC Cooling',          value: null },
    { id: 'brakes',   label: 'Brakes Test',         value: null },
  ]);
  const [damageDecision, setDamageDecision]       = useState<'none' | 'incident' | null>(null);
  const [showSignOff, setShowSignOff]             = useState(false);
  const [submitted, setSubmitted]                 = useState(false);

  const updateSystemCheck = (id: string, value: YesNo) => {
    setSystemChecks((prev) => prev.map((c) => (c.id === id ? { ...c, value } : c)));
  };

  const handleSaveAndProceed = () => {
    setCurrentStep(2);
    setShowSignOff(true);
  };

  const handlePrevious = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
    else navigate(ROUTES.QC_OUT_DASHBOARD);
  };

  const handleFinalSubmit = (data: { decision: string | null; failureReason: string; notes: string; signature: string | null }) => {
    setShowSignOff(false);
    setSubmitted(true);
    setCurrentStep(2);
    console.log('QC OUT completed:', data);
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex flex-col gap-5">
        <Breadcrumb
          items={[
            { label: 'QC Out', onClick: () => navigate(ROUTES.QC_OUT_DASHBOARD) },
            { label: 'Final Inspection' },
          ]}
        />
        <div className="bg-white border border-[#e5e7eb] rounded-[10px] p-12 flex flex-col items-center justify-center gap-4 min-h-64 shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)]">
          <div className="w-16 h-16 rounded-full bg-[#E8F5E9] flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-[#2E7D32]" />
          </div>
          <h2 className="text-[18px] font-bold text-[#333]">QC OUT Completed</h2>
          <p className="text-[13px] text-[#999]">Status: QC_OUT_COMPLETED → READY_FOR_EXIT</p>
          <Button
            variant="gradient"
            gradient={{ from: '#04C397', to: '#158E86', direction: 'to-r' }}
            onClick={() => navigate(ROUTES.QC_OUT_DASHBOARD)}
            className="mt-2 h-10 px-8 text-[13px]"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'QC OUT Pending Queue', onClick: () => navigate(ROUTES.QC_OUT_DASHBOARD) },
            { label: 'Vehicle Inspection' },
          ]}
        />

        {/* Vehicle Header */}
        <div className="bg-white border border-[#e5e7eb] rounded-[10px] p-4 flex items-center gap-4 shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)]">
          <div className="w-14 h-14 rounded-lg bg-[#f0f0f0] flex items-center justify-center overflow-hidden shrink-0">
            <svg viewBox="0 0 40 40" className="w-8 h-8 text-[#bfbfbf]" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="6" y="14" width="28" height="16" rx="3" />
              <path d="M10 14 L14 8 H26 L30 14" />
              <circle cx="13" cy="30" r="3" fill="currentColor" />
              <circle cx="27" cy="30" r="3" fill="currentColor" />
            </svg>
          </div>
          <div>
            <h2 className="text-[17px] font-bold text-[#333] tracking-wide">{vehicle.registration}</h2>
            <p className="text-[13px] text-[#999]">{vehicle.model}</p>
          </div>
        </div>

        {/* Stepper */}
        <div className="bg-white border border-[#e5e7eb] rounded-[10px] px-6 py-4 flex items-center justify-center gap-0 shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)]">
          {STEPS.map((step, idx) => {
            const isCompleted = idx < currentStep;
            const isActive    = idx === currentStep;
            const isLast      = idx === STEPS.length - 1;
            return (
              <div key={step.label} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-semibold
                    ${isCompleted ? 'bg-[#04C397] text-white' : ''}
                    ${isActive    ? 'bg-[#04C397] text-white ring-4 ring-[#04C397]/20' : ''}
                    ${!isCompleted && !isActive ? 'bg-[#f0f0f0] text-[#999]' : ''}
                  `}>
                    {isCompleted ? <Check className="w-4 h-4" /> : step.number}
                  </div>
                  <span className={`text-[13px] font-medium
                    ${isCompleted ? 'text-[#04C397]' : ''}
                    ${isActive    ? 'text-[#333]' : ''}
                    ${!isCompleted && !isActive ? 'text-[#999]' : ''}
                  `}>
                    {step.number}. {step.label}
                  </span>
                </div>
                {!isLast && (
                  <div className="flex items-center mx-4">
                    <ChevronRight className="w-4 h-4 text-[#ccc]" />
                    <div className={`w-12 sm:w-16 h-0.5 mx-2 ${isCompleted ? 'bg-[#04C397]' : 'bg-[#e5e7eb]'}`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Split Layout */}
        <div className="flex gap-5 items-start">
          {/* Left Sidebar — Scope & Reference */}
          <div className="w-64 shrink-0">
            <div className="bg-white border border-[#e5e7eb] rounded-[10px] p-5 shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)]">
              <h3 className="text-[14px] font-bold text-[#333] mb-4">Scope &amp; Reference</h3>

              {/* Entry photo placeholders */}
              <div className="grid grid-cols-3 gap-2 mb-2">
                {['Front', 'Interior', 'Engine'].map((label) => (
                  <div key={label} className="aspect-square rounded-lg bg-[#f5f5f5] flex items-center justify-center border border-[#e5e7eb]">
                    <span className="text-[9px] text-[#bbb] text-center leading-tight px-1">{label}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-[#999] mb-5">Entry Photos</p>

              {/* Repair summary */}
              <div>
                <h4 className="text-[12px] font-bold text-[#333] mb-2">Repair Summary:</h4>
                <ul className="flex flex-col gap-1.5 text-[12px] text-[#555]">
                  <li>• Oil Change (Done)</li>
                  <li>• Brake Pads (Done)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Center Content */}
          <div className="flex-1 flex flex-col gap-5">
            {/* 1. Repair Validation */}
            <div className="bg-white border border-[#e5e7eb] rounded-[10px] p-5 shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)]">
              <h3 className="text-[14px] font-bold text-[#333] mb-4">1. Repair Validation</h3>
              <p className="text-[13px] font-semibold text-[#333] mb-3">Technician Completed Jobs</p>
              <div className="flex items-center justify-between py-3 border-t border-[#f0f0f0]">
                <span className="text-[13px] text-[#555]">Verify all listed repairs are satisfactory</span>
                <div className="flex items-center gap-3">
                  {/* Custom toggle (replaces shadcn Switch) */}
                  <button
                    role="switch"
                    aria-checked={allRepairsVerified}
                    onClick={() => setAllRepairsVerified((v) => !v)}
                    className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 focus:outline-none
                      ${allRepairsVerified ? 'bg-[#04C397]' : 'bg-[#d1d5db]'}`}
                  >
                    <span className={`absolute top-0.75 left-0.75 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200
                      ${allRepairsVerified ? 'translate-x-4.5' : 'translate-x-0'}`}
                    />
                  </button>
                  <span className="text-[13px] font-medium text-[#333]">All Repairs Verified</span>
                </div>
              </div>
            </div>

            {/* 2. Critical Systems Check */}
            <div className="bg-white border border-[#e5e7eb] rounded-[10px] p-5 shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)]">
              <h3 className="text-[14px] font-bold text-[#333] mb-4">2. Critical Systems Check</h3>
              <div className="divide-y divide-[#f0f0f0]">
                {systemChecks.map((check) => (
                  <div key={check.id} className="flex items-center justify-between py-3">
                    <span className="text-[13px] text-[#555]">{check.label}</span>
                    <div className="flex rounded-lg border border-[#e5e7eb] overflow-hidden">
                      <button
                        onClick={() => updateSystemCheck(check.id, check.value === 'yes' ? null : 'yes')}
                        className={`px-5 py-2 text-[12px] font-medium transition-colors min-w-16
                          ${check.value === 'yes'
                            ? 'bg-[#04C397] text-white'
                            : 'bg-white text-[#999] hover:bg-[#f5f5f5]'}`}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => updateSystemCheck(check.id, check.value === 'no' ? null : 'no')}
                        className={`px-5 py-2 text-[12px] font-medium transition-colors min-w-16 border-l border-[#e5e7eb]
                          ${check.value === 'no'
                            ? 'bg-[#DE2020] text-white'
                            : 'bg-white text-[#999] hover:bg-[#f5f5f5]'}`}
                      >
                        No
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Damage Audit */}
            <div className="bg-white border border-[#e5e7eb] rounded-[10px] p-5 shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)]">
              <h3 className="text-[14px] font-bold text-[#333] mb-1">3. Damage Audit</h3>
              <p className="text-[13px] font-semibold text-[#333] mb-4">Final 360° Audit</p>

              {/* Car SVG (top-down outline) */}
              <div className="flex items-center justify-center py-6 mb-4">
                <svg viewBox="0 0 400 180" className="w-72 h-auto text-[#bfbfbf]">
                  <ellipse cx="200" cy="90" rx="180" ry="75" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <ellipse cx="200" cy="90" rx="140" ry="55" fill="none" stroke="currentColor" strokeWidth="1" />
                  <line x1="100" y1="55" x2="130" y2="40" stroke="currentColor" strokeWidth="1" />
                  <line x1="300" y1="55" x2="270" y2="40" stroke="currentColor" strokeWidth="1" />
                  <line x1="100" y1="125" x2="130" y2="140" stroke="currentColor" strokeWidth="1" />
                  <line x1="300" y1="125" x2="270" y2="140" stroke="currentColor" strokeWidth="1" />
                  <line x1="200" y1="15" x2="200" y2="165" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" />
                  <rect x="30" y="45" width="30" height="15" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <rect x="30" y="120" width="30" height="15" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <rect x="340" y="45" width="30" height="15" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <rect x="340" y="120" width="30" height="15" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setDamageDecision('none')}
                  className={`py-3 rounded-lg border-2 text-[13px] font-medium transition-all
                    ${damageDecision === 'none'
                      ? 'border-[#04C397] text-[#04C397] bg-[#F0FBF8]'
                      : 'border-[#e5e7eb] text-[#04C397] hover:border-[#04C397]/50'}`}
                >
                  No New Damage
                </button>
                <button
                  onClick={() => setDamageDecision('incident')}
                  className={`py-3 rounded-lg border-2 text-[13px] font-medium transition-all
                    ${damageDecision === 'incident'
                      ? 'border-[#DE2020] text-[#DE2020] bg-[#FFEBEE]'
                      : 'border-[#e5e7eb] text-[#DE2020] hover:border-[#DE2020]/50'}`}
                >
                  Report Incident
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border border-[#e5e7eb] rounded-[10px] px-5 py-4 flex items-center justify-end gap-3 shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)]">
          <button
            onClick={handlePrevious}
            className="h-10 px-5 rounded-lg border border-[#e5e7eb] text-[13px] text-[#666] font-medium hover:bg-[#fafafa] transition-colors"
          >
            Previous
          </button>
          <Button
            variant="gradient"
            gradient={{ from: '#04C397', to: '#158E86', direction: 'to-r' }}
            onClick={handleSaveAndProceed}
            className="h-10 px-8 text-[13px]"
          >
            Save &amp; Proceed to Sign-off
          </Button>
        </div>
      </div>

      {/* Sign-off Modal */}
      <SignOffModal open={showSignOff} onOpenChange={setShowSignOff} onSubmit={handleFinalSubmit} />
    </>
  );
}
