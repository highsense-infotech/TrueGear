import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Loader2, Clock, Send, CheckCircle2, Pencil, Package, AlertCircle, Copy, Check, MessageSquareWarning } from "lucide-react";
import { JobCardHeader } from "../../components/cards/JobCardHeader";
import { VehicleSummaryCard } from "../../components/cards/VehicleSummaryCard";
import { TotalsSummary } from "../../components/cards/TotalsSummary";
import { useCurrency } from "../../context/CurrencyContext";
import Button from "../../components/common/Button";
import {
  getJobCardDetail,
  shareEstimate,
  requestPartsConfirmation,
  type SAJobCardDetailResponse,
} from "../../api/serviceAdvisor.api";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  DRAFT: { label: "Draft", bg: "bg-gray-100", text: "text-gray-600" },
  PENDING_PARTS: { label: "Awaiting Parts Confirmation", bg: "bg-amber-50", text: "text-amber-600" },
  PARTS_CONFIRMED: { label: "Parts Confirmed", bg: "bg-teal-50", text: "text-teal-600" },
  SHARED: { label: "Shared", bg: "bg-blue-50", text: "text-blue-600" },
  MODIFICATION_REQUESTED: { label: "Modification Requested", bg: "bg-amber-50", text: "text-amber-600" },
  APPROVED: { label: "Approved", bg: "bg-green-50", text: "text-green-600" },
  PARTIALLY_APPROVED: { label: "Partially Approved", bg: "bg-amber-50", text: "text-amber-600" },
  IN_SERVICE: { label: "In Service", bg: "bg-orange-50", text: "text-orange-600" },
  COMPLETED: { label: "Completed", bg: "bg-emerald-50", text: "text-emerald-600" },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const JobCardDetail: React.FC = () => {
  const navigate = useNavigate();
  const { jobCardId } = useParams<{ jobCardId: string }>();
  const { formatCurrency } = useCurrency();

  const [data, setData] = useState<SAJobCardDetailResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [requestingParts, setRequestingParts] = useState(false);
  const [approvalUrl, setApprovalUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!jobCardId) return;

    const fetchDetail = async () => {
      try {
        const res = await getJobCardDetail(jobCardId);
        if (res.status) {
          setData(res.data);
          const { jobCard } = res.data;
          if (jobCard.status === 'SHARED' && jobCard.approvalToken) {
            setApprovalUrl(`${window.location.origin}/customer-approval/${jobCard.approvalToken}`);
          }
        }
      } catch (error) {
        console.error("Failed to fetch job card detail:", error);
        toast.error("Failed to load job card details");
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [jobCardId]);

  const handleShareEstimate = async () => {
    if (!jobCardId || sharing) return;
    setSharing(true);
    try {
      const res = await shareEstimate(jobCardId);
      if (res.status) {
        toast.success(
          res.data.whatsappSent
            ? "Estimate sent via WhatsApp"
            : "Estimate shared with customer"
        );
        setApprovalUrl(res.data.approvalUrl);
        setData((prev) =>
          prev
            ? {
                ...prev,
                jobCard: {
                  ...prev.jobCard,
                  status: res.data.status,
                  sharedAt: res.data.sharedAt,
                },
              }
            : prev
        );
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || "Failed to share estimate";
      toast.error(msg);
    } finally {
      setSharing(false);
    }
  };

  const handleRequestPartsConfirmation = async () => {
    if (!jobCardId || requestingParts) return;
    setRequestingParts(true);
    try {
      const res = await requestPartsConfirmation(jobCardId);
      if (res.status) {
        toast.success(`Parts confirmation sent to Parts Manager (${res.data.partsRequestsCreated} part(s))`);
        setData((prev) =>
          prev ? { ...prev, jobCard: { ...prev.jobCard, status: res.data.status } } : prev
        );
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || "Failed to send parts confirmation request";
      toast.error(msg);
    } finally {
      setRequestingParts(false);
    }
  };

  const handleCopy = async () => {
    if (!approvalUrl) return;
    await navigator.clipboard.writeText(approvalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-xl p-8 text-center">
        <p className="text-[#333] text-lg">Job card not found</p>
      </div>
    );
  }

  const { jobCard, items, vehicle } = data;
  const statusConfig = STATUS_CONFIG[jobCard.status] || STATUS_CONFIG.DRAFT;

  return (
    <div className="flex flex-col gap-6 md:gap-8 w-full pb-8">
      {/* Header */}
      <JobCardHeader detail onBackClick={() => navigate(-1)} label="Back" />

      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Job Card Details</h2>
        <span className={`text-xs font-semibold px-3 py-1 rounded-md ${statusConfig.bg} ${statusConfig.text}`}>
          {statusConfig.label}
        </span>
      </div>

      {/* Vehicle Summary */}
      {vehicle && (
        <VehicleSummaryCard
          registration={vehicle.registrationNumber}
          model={`${vehicle.brand} ${vehicle.model}`}
          customerName={vehicle.customerName || "Unknown Customer"}
          status={statusConfig.label}
        />
      )}

      {/* Job Items (Read-Only) */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 shadow-sm">
        <h3 className="text-base font-semibold text-gray-800 mb-6">
          Job Details
        </h3>

        <div className="flex flex-col gap-6 md:gap-8">
          {items.map((item, index) => (
            <div key={item.id} className="flex flex-col gap-4 md:gap-6">
              {/* Job header */}
              <div className="border-b border-gray-100 pb-2">
                <span className="text-base font-medium text-gray-400">
                  Job #{index + 1}
                </span>
              </div>

              {/* Description & Parts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-sm md:text-base font-medium text-gray-400 mb-2">
                    Job Description
                  </label>
                  <div className="w-full h-10 px-4 md:px-5 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-800 text-sm md:text-base font-medium flex items-center">
                    {item.jobDescription}
                  </div>
                </div>
                <div>
                  <label className="block text-sm md:text-base font-medium text-gray-400 mb-2">
                    Parts Required
                  </label>
                  <div className="w-full h-10 px-4 md:px-5 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-800 text-sm md:text-base font-medium flex items-center">
                    {item.partsRequired || "—"}
                  </div>
                </div>
              </div>

              {/* Cost Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <div>
                  <label className="block text-sm md:text-base font-medium text-gray-400 mb-2">
                    Parts Cost
                  </label>
                  <div className="w-full h-10 px-4 md:px-5 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-800 text-sm md:text-base font-semibold flex items-center">
                    {formatCurrency(Number(item.partsCost))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm md:text-base font-medium text-gray-400 mb-2">
                    Labour Cost
                  </label>
                  <div className="w-full h-10 px-4 md:px-5 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-800 text-sm md:text-base font-semibold flex items-center">
                    {formatCurrency(Number(item.labourCost))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm md:text-base font-medium text-gray-400 mb-2">
                    Quantity
                  </label>
                  <div className="w-full h-10 px-4 md:px-5 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-800 text-sm md:text-base font-semibold flex items-center">
                    {item.quantity}
                  </div>
                </div>
                <div>
                  <label className="block text-sm md:text-base font-medium text-gray-400 mb-2">
                    Line Total
                  </label>
                  <div className="w-full h-10 px-4 md:px-5 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-800 text-sm md:text-base font-semibold flex items-center">
                    {formatCurrency(Number(item.lineTotal))}
                  </div>
                </div>
              </div>

              {/* Parts Manager Status */}
              {item.partsRequired && item.partStatus && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-gray-400">Parts Manager:</span>
                  {item.partStatus === "pending" && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
                      <span className="size-1.5 rounded-full bg-amber-500 inline-block" />
                      Pending Review
                    </span>
                  )}
                  {item.partStatus === "available" && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 text-green-700 text-xs font-medium border border-green-200">
                      <span className="size-1.5 rounded-full bg-green-500 inline-block" />
                      Available
                    </span>
                  )}
                  {item.partStatus === "unavailable" && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-50 text-red-700 text-xs font-medium border border-red-200">
                      <span className="size-1.5 rounded-full bg-red-500 inline-block" />
                      Unavailable
                      {item.partExpectedTime && (
                        <span className="text-red-500 font-normal">· ETA: {item.partExpectedTime}</span>
                      )}
                    </span>
                  )}
                  {item.partStatus === "dispatched" && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200">
                      <span className="size-1.5 rounded-full bg-blue-500 inline-block" />
                      Dispatched to Bay
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <TotalsSummary
        subtotal={Number(jobCard.subtotal)}
        taxAmount={Number(jobCard.taxAmount)}
        total={Number(jobCard.totalEstimate)}
      />

      {/* Timeline */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Clock size={16} />
          <span>Created: {formatDate(jobCard.createdAt)}</span>
        </div>
        {jobCard.sharedAt && (
          <div className="flex items-center gap-2 text-sm text-blue-500">
            <Send size={16} />
            <span>Shared: {formatDate(jobCard.sharedAt)}</span>
          </div>
        )}
        {jobCard.approvedAt && (
          <div className="flex items-center gap-2 text-sm text-green-500">
            <CheckCircle2 size={16} />
            <span>Approved: {formatDate(jobCard.approvedAt)}</span>
          </div>
        )}

        {approvalUrl && (
          <div className="pt-1 border-t border-gray-100 space-y-1.5">
            <p className="text-xs font-medium text-gray-400">Approval link — copy and share manually</p>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <span className="flex-1 text-xs text-gray-600 truncate">{approvalUrl}</span>
              <button
                onClick={handleCopy}
                className="shrink-0 p-1 rounded hover:bg-gray-200 transition-colors"
                title="Copy link"
              >
                {copied ? (
                  <Check size={15} className="text-green-500" />
                ) : (
                  <Copy size={15} className="text-gray-400" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modification Request Note + Edit action */}
      {jobCard.status === "MODIFICATION_REQUESTED" && (
        <div className="flex flex-col gap-3">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
            <MessageSquareWarning size={20} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-700 mb-1">Customer Requested Modification</p>
              {jobCard.modificationNote ? (
                <p className="text-sm text-amber-600">{jobCard.modificationNote}</p>
              ) : (
                <p className="text-xs text-amber-500 italic">No additional notes provided.</p>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full md:w-auto"
            icon={<Pencil size={18} />}
            onClick={() => navigate(`/service-advisor-dashboard/job-card/${jobCard.vehicleId}?editJobCardId=${jobCard.id}`)}
          >
            Edit Job Card
          </Button>
        </div>
      )}

      {/* Actions */}
      {jobCard.status === "DRAFT" && (
        <div className="flex flex-col md:flex-row gap-3 md:gap-4">
          <Button
            variant="outline"
            className="w-full md:w-auto"
            icon={<Pencil size={18} />}
            onClick={() => navigate(`/service-advisor-dashboard/job-card/${jobCard.vehicleId}?editJobCardId=${jobCard.id}`)}
          >
            Edit Job Card
          </Button>
          {items.some((item) => item.partsRequired) ? (
            <Button
              variant="gradient"
              className="w-full md:flex-1"
              icon={<Package size={18} />}
              onClick={handleRequestPartsConfirmation}
              disabled={requestingParts}
            >
              {requestingParts ? "Sending..." : "Request Parts Confirmation"}
            </Button>
          ) : (
            <Button
              variant="gradient"
              className="w-full md:flex-1"
              icon={<Send size={18} />}
              onClick={handleShareEstimate}
              disabled={sharing}
            >
              {sharing ? "Sharing..." : "Share Estimate with Customer"}
            </Button>
          )}
        </div>
      )}

      {jobCard.status === "PENDING_PARTS" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-700">Awaiting Parts Confirmation</p>
            <p className="text-xs text-amber-600 mt-0.5">Parts Manager is reviewing availability. You can share the estimate once all parts are confirmed.</p>
          </div>
        </div>
      )}

      {jobCard.status === "PARTS_CONFIRMED" && (
        <div className="flex flex-col gap-3">
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle2 size={20} className="text-teal-500 shrink-0" />
            <p className="text-sm font-medium text-teal-700">Parts confirmed by Parts Manager — ready to share with customer</p>
          </div>
          <Button
            variant="gradient"
            className="w-full"
            icon={<Send size={18} />}
            onClick={handleShareEstimate}
            disabled={sharing}
          >
            {sharing ? "Sharing..." : "Share Estimate with Customer"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default JobCardDetail;
