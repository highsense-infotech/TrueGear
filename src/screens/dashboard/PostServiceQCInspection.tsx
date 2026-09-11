import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Truck, Check, X } from "lucide-react";
import { ROUTES } from "../../constants/routes";

interface ChecklistItem {
  id: number;
  label: string;
  status: "pass" | "fail" | null;
}

// Mock data - replace with API call
const mockJobData: Record<
  string,
  {
    vehicleNumber: string;
    vehicleModel: string;
    technicianName: string;
    completedTime: string;
    jobsCompleted: string;
  }
> = {
  "1": {
    vehicleNumber: "KA-05-EF-9012",
    vehicleModel: "Maruti Swift",
    technicianName: "Ramesh K.",
    completedTime: "11:45 AM",
    jobsCompleted: "Brake pad replacement, fluid top-up",
  },
  "2": {
    vehicleNumber: "DL-03-GH-3456",
    vehicleModel: "Hyundai Creta",
    technicianName: "Sunil M.",
    completedTime: "12:30 PM",
    jobsCompleted: "Oil change, filter replacement",
  },
};

const PostServiceQCInspection: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const job = id ? mockJobData[id] : null;

  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: 1, label: "AC Gas Refill & Cooling Check", status: null },
    { id: 2, label: "Vehicle cleaned after service", status: null },
    { id: 3, label: "No tools left inside vehicle", status: null },
    { id: 4, label: "Test drive completed (if required)", status: null },
    { id: 5, label: "Dashboard warning lights cleared", status: null },
    { id: 6, label: "Odometer reading recorded", status: null },
  ]);

  const [notes, setNotes] = useState("");

  const handleStatusChange = (itemId: number, status: "pass" | "fail") => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, status: item.status === status ? null : status }
          : item
      )
    );
  };

  const passCount = checklist.filter((item) => item.status === "pass").length;
  const failCount = checklist.filter((item) => item.status === "fail").length;
  const allChecked = checklist.every((item) => item.status !== null);

  if (!job) {
    return (
      <div className="bg-white rounded-xl p-8 text-center mt-4">
        <p className="text-[#333] text-lg">Job not found</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 text-[#FF4F31] text-sm hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Back to Queue */}
      <button
        onClick={() => navigate(ROUTES.POST_SERVICE_QC_DASHBOARD)}
        className="flex items-center gap-1.5 mb-4 text-[#999] hover:text-[#333] transition-colors cursor-pointer"
      >
        <ArrowLeft size={14} />
        <span className="font-normal text-[13px]">Back to Queue</span>
      </button>

      {/* Page Title */}
      <div className="mb-5">
        <h1 className="text-[#333] text-[20px] md:text-[24px] font-bold leading-[1.2]">
          Post-Service Inspection
        </h1>
        <p className="text-[#999] text-[13px] mt-0.5">
          {job.vehicleNumber} · {job.vehicleModel}
        </p>
      </div>

      {/* Vehicle Info Card */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] p-4 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-full size-10 bg-[#FFF5F5] border border-[#EBEBEB]">
              <Truck className="size-5 text-[#FF4F31]" />
            </div>
            <div>
              <p className="text-[#333] text-[15px] font-semibold">
                {job.vehicleNumber}
              </p>
              <p className="text-[#999] text-[12px]">{job.vehicleModel}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[#333] text-[14px] font-semibold">
              {job.technicianName}
            </p>
            <p className="text-[#999] text-[12px]">
              Completed: {job.completedTime}
            </p>
          </div>
        </div>
      </div>

      {/* Jobs Completed */}
      <div className="bg-[#F9F9F9] rounded-xl border border-[#e5e7eb] p-4 mb-6">
        <p className="text-[#333] text-[14px] font-semibold mb-0.5">
          Jobs completed:
        </p>
        <p className="text-[#666] text-[13px]">{job.jobsCompleted}</p>
      </div>

      {/* Quality Checklist */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] p-5 md:p-6 mb-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[#333] text-[18px] md:text-[20px] font-bold">
            Quality Checklist
          </h2>
          <div className="flex items-center gap-3 text-[13px] font-medium">
            <span className="text-[#22C55E]">{passCount} Pass</span>
            <span className="text-[#FF4F31]">{failCount} Fail</span>
          </div>
        </div>
        <p className="text-[#999] text-[13px] mb-5">
          Verify each item before approving for billing
        </p>

        <div className="space-y-3">
          {checklist.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between border border-[#e5e7eb] rounded-xl px-4 py-4"
            >
              <span className="text-[#333] text-[14px] font-medium">
                {item.label}
              </span>
              <div className="flex items-center gap-2">
                {/* Pass Button */}
                <button
                  onClick={() => handleStatusChange(item.id, "pass")}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-all cursor-pointer ${
                    item.status === "pass"
                      ? "bg-[#22C55E] border-[#22C55E] text-white"
                      : "border-[#E0E0E0] text-[#22C55E] hover:bg-[#f0fdf4]"
                  }`}
                >
                  <Check size={18} strokeWidth={2.5} />
                </button>
                {/* Fail Button */}
                <button
                  onClick={() => handleStatusChange(item.id, "fail")}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-all cursor-pointer ${
                    item.status === "fail"
                      ? "bg-[#FF4F31] border-[#FF4F31] text-white"
                      : "border-[#E0E0E0] text-[#FF4F31] hover:bg-[#fff5f5]"
                  }`}
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Inspection Notes */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] p-5 md:p-6 mb-6">
        <h2 className="text-[#333] text-[16px] font-bold mb-0.5">
          Inspection Notes
        </h2>
        <p className="text-[#999] text-[13px] mb-4">
          Add any observations or issues found
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Enter notes here"
          className="w-full border border-[#e5e7eb] rounded-xl p-4 text-[14px] text-[#333] placeholder:text-[#999] resize-none focus:outline-none focus:border-[#ccc] min-h-[100px]"
        />
      </div>

      {/* Bottom Action Bar */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-[#333] text-[15px] font-bold">
            {allChecked
              ? "All checks completed"
              : "Complete all checks to proceed"}
          </p>
          <p className="text-[#999] text-[13px]">
            {passCount} passed, {failCount} failed
          </p>
        </div>
        <button
          disabled={!allChecked}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold transition-all cursor-pointer ${
            allChecked
              ? "bg-[#22C55E] text-white hover:bg-[#16A34A] shadow-[2px_4px_8px_0px_rgba(0,0,0,0.15)]"
              : "bg-[#E0E0E0] text-[#999] cursor-not-allowed"
          }`}
        >
          <Check size={18} />
          Approve for Billing
        </button>
      </div>
    </>
  );
};

export default PostServiceQCInspection;
