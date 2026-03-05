import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { JobCard } from "../../components/cards/JobCard";
import { PricingSummary } from "../../components/cards/PricingSummary";
import { ActionButtons } from "../../components/cards/ActionButtons";
import { RequestModificationScreen } from "../../components/cards/RequestModificationScreen";
import { ApproveScreen } from "../../components/cards/ApproveScreen";
import { Clock, Loader2, XCircle } from "lucide-react";
import {
  getEstimateByToken,
  approveEstimate,
  requestModification,
  type EstimateData,
} from "../../api/customerApproval.api";

interface Job {
  id: number;
  title: string;
  description: string;
  details: string;
  price: number;
  selected: boolean;
}

type ScreenType = "dashboard" | "requestModification" | "approve" | "modificationSubmitted";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const date = d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${date} at ${time}`;
}

function CustomerApprovalDashboard() {
  const { token } = useParams<{ token: string }>();
  const [estimateData, setEstimateData] = useState<EstimateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [currentScreen, setCurrentScreen] = useState<ScreenType>("dashboard");
  const [approving, setApproving] = useState(false);
  const [submittingModification, setSubmittingModification] = useState(false);

  useEffect(() => {
    if (!token) return;

    const fetchEstimate = async () => {
      try {
        const res = await getEstimateByToken(token);
        if (res.status) {
          setEstimateData(res.data);

          // Map API items to Job format
          const mappedJobs: Job[] = res.data.items.map((item, idx) => ({
            id: idx + 1,
            title: item.jobDescription,
            description: item.partsRequired || "—",
            details: `Parts: ₹${Number(item.partsCost).toLocaleString("en-IN")} | Labour: ₹${Number(item.labourCost).toLocaleString("en-IN")}`,
            price: Number(item.lineTotal),
            selected: true,
          }));
          setJobs(mappedJobs);

          // If already approved/rejected, show the appropriate screen
          if (res.data.jobCard.status === "APPROVED") {
            setCurrentScreen("approve");
          }
        }
      } catch (err: any) {
        setError(
          err.response?.data?.message ||
            "Unable to load estimate. The link may be invalid or expired."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchEstimate();
  }, [token]);

  function toggleJob(jobId: number) {
    setJobs(
      jobs.map(function (job) {
        if (job.id === jobId) {
          return Object.assign({}, job, { selected: !job.selected });
        }
        return job;
      })
    );
  }

  const selectedJobs = jobs.filter(function (job) {
    return job.selected;
  });
  const selectedCount = selectedJobs.length;
  const subtotal = selectedJobs.reduce(function (sum, job) {
    return sum + job.price;
  }, 0);
  const taxPercentage = estimateData
    ? Number(estimateData.jobCard.taxPercentage)
    : 18;
  const gst = Math.round(subtotal * (taxPercentage / 100));
  const total = subtotal + gst;

  function handleRequestModification() {
    if (selectedCount > 0) {
      setCurrentScreen("requestModification");
    }
  }

  async function handleApprove() {
    if (selectedCount === 0 || !token || approving) return;
    setApproving(true);
    try {
      const res = await approveEstimate(token);
      if (res.status) {
        setCurrentScreen("approve");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to approve estimate");
    } finally {
      setApproving(false);
    }
  }

  async function handleModificationSubmit(notes: string) {
    if (!token || submittingModification) return;
    setSubmittingModification(true);
    try {
      const res = await requestModification(token, notes);
      if (res.status) {
        setCurrentScreen("modificationSubmitted");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to submit modification request");
    } finally {
      setSubmittingModification(false);
    }
  }

  function handleBackToDashboard() {
    setCurrentScreen("dashboard");
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Error state
  if (error && !estimateData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
        <div className="bg-white rounded-[10px] border border-[#e5e7eb] p-8 text-center max-w-md w-full">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-[20px] font-semibold text-[#333] mb-2">
            Link Invalid
          </h1>
          <p className="text-[14px] text-[#999]">{error}</p>
        </div>
      </div>
    );
  }

  if (!estimateData) return null;

  const { jobCard, vehicle } = estimateData;
  const vehicleNumber = vehicle?.registrationNumber || "—";
  const vehicleModel = vehicle ? `${vehicle.brand} ${vehicle.model}` : "—";

  // Modification submitted success screen
  if (currentScreen === "modificationSubmitted") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
        <div className="bg-white rounded-[10px] border border-[#e5e7eb] p-8 sm:p-10 max-w-sm w-full text-center shadow-sm">
          <div className="flex justify-center mb-5">
            <div className="bg-[#fff8e6] rounded-full w-16 h-16 flex items-center justify-center">
              <Clock className="w-8 h-8 text-[#e89d00]" />
            </div>
          </div>
          <h1 className="text-[18px] font-bold text-[#333] mb-2">Modification Requested</h1>
          <p className="text-[13px] text-[#999]">
            Your modification request has been submitted. The service advisor will review and get back to you.
          </p>
        </div>
      </div>
    );
  }

  // Request Modification screen
  if (currentScreen === "requestModification") {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
          <RequestModificationScreen
            onBack={handleBackToDashboard}
            onSubmit={handleModificationSubmit}
            submitting={submittingModification}
          />
        </div>
      </div>
    );
  }

  // Approve success screen
  if (currentScreen === "approve") {
    return (
      <ApproveScreen selectedJobs={selectedJobs} total={total} />
    );
  }

  // Main estimate view
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-0">
          <div className="mb-3">
            <h2 className="text-[16px] font-semibold text-[#333] mb-1">
              Service Estimate
            </h2>
            <p className="text-[12px] text-[#999]">
              {vehicleNumber} – {vehicleModel}
            </p>
          </div>
          <div className="bg-[#ffe1b7] inline-block px-4 sm:px-6 py-2 rounded-[5px] shadow-[2px_4px_8px_0px_rgba(0,0,0,0.15)] mb-3 sm:mb-0">
            <p className="text-[14px] sm:text-[16px] font-semibold text-[#e89d00]">
              Pending Approval
            </p>
          </div>
        </div>
        {/* Sent Time */}
        {jobCard.sharedAt && (
          <div className="flex items-center gap-3 text-[12px] sm:text-[14px] text-[#999]">
            <Clock size={20} color="#999999" />
            <p>Estimate sent on: {formatDate(jobCard.sharedAt)}</p>
          </div>
        )}

        {/* Job Cards */}
        <div className="bg-white rounded-[10px] border border-[#e5e7eb] p-4 sm:p-5">
          <h3 className="text-[14px] sm:text-[16px] font-semibold text-[#333] mb-6 sm:mb-8">
            Select jobs to approve:
          </h3>
          <div className="space-y-4 sm:space-y-8">
            {jobs.map(function (job) {
              return (
                <JobCard
                  key={job.id}
                  title={job.title}
                  description={job.description}
                  details={job.details}
                  price={"₹" + job.price.toLocaleString("en-IN")}
                  isSelected={job.selected}
                  onToggle={function () {
                    toggleJob(job.id);
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Pricing Summary */}
        <PricingSummary
          selectedCount={selectedCount}
          totalCount={jobs.length}
          subtotal={subtotal}
          gst={gst}
          total={total}
        />

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-[10px] p-3 text-center">
            <p className="text-[14px] text-red-600">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <ActionButtons
          selectedCount={selectedCount}
          total={total}
          onRequestModification={handleRequestModification}
          onApprove={handleApprove}
          approving={approving}
        />
      </div>
    </div>
  );
}

export default CustomerApprovalDashboard;
