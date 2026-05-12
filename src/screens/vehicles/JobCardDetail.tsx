import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Loader2, Clock, Send, CheckCircle2, Pencil, Package, AlertCircle, Copy, Check, MessageSquareWarning, CheckCircle, XCircle, Eye, UserPlus } from "lucide-react";
import Modal from "../../components/common/Modal";
import { AssignTechnicianModal } from "../../components/common/AssignTechnicianModal";
import { JobCardHeader } from "../../components/cards/JobCardHeader";
import { VehicleSummaryCard } from "../../components/cards/VehicleSummaryCard";
import { TotalsSummary } from "../../components/cards/TotalsSummary";
import { useCurrency } from "../../context/CurrencyContext";
import Button from "../../components/common/Button";
import {
  getJobCardDetail,
  shareEstimate,
  requestPartsConfirmation,
  type SAJobCardDetailData,
} from "../../api/serviceAdvisor.api";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  DRAFT: { label: "Draft", bg: "bg-gray-100", text: "text-gray-600" },
  PENDING_PARTS: { label: "Awaiting Parts Confirmation", bg: "bg-amber-50", text: "text-amber-600" },
  PARTS_CONFIRMED: { label: "Parts Confirmed", bg: "bg-teal-50", text: "text-teal-600" },
  SHARED: { label: "Shared", bg: "bg-blue-50", text: "text-blue-600" },
  MODIFICATION_REQUESTED: { label: "Modification Requested", bg: "bg-amber-50", text: "text-amber-600" },
  APPROVED: { label: "Approved", bg: "bg-green-50", text: "text-green-600" },
  PARTIALLY_APPROVED: { label: "Partially Approved", bg: "bg-amber-50", text: "text-amber-600" },
  IN_PROGRESS: { label: "In Progress", bg: "bg-blue-50", text: "text-blue-600" },
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
  const { formatCurrency, currency } = useCurrency();

  const [data, setData] = useState<SAJobCardDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [requestingParts, setRequestingParts] = useState(false);
  const [approvalUrl, setApprovalUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [partsModalOpen, setPartsModalOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  useEffect(() => {
    if (!jobCardId) return;

    const fetchDetail = async () => {
      try {
        const res = await getJobCardDetail(jobCardId);
        if (res.success && res.data) {
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
      const res = await shareEstimate(jobCardId, currency);
      if (res.success && res.data) {
        const shareData = res.data;
        if (shareData.emailSent) {
          toast.success("Estimate sent to customer via email");
        } else {
          const reason = shareData.emailFailReason || "check SMTP settings";
          toast.error(`Email not sent: ${reason}`);
        }
        if (shareData.whatsappSent) {
          toast.success("Estimate sent to customer via WhatsApp");
        }
        setApprovalUrl(shareData.approvalUrl);
        setData((prev) =>
          prev
            ? {
                ...prev,
                jobCard: {
                  ...prev.jobCard,
                  status: shareData.status,
                  sharedAt: shareData.sharedAt,
                },
              }
            : prev
        );
      }
    } catch (error: any) {
      const msg = error?.response?.data?.error?.message || "Failed to share estimate";
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
      if (res.success && res.data) {
        const partsData = res.data;
        toast.success(`Parts confirmation sent to Parts Manager (${partsData.partsRequestsCreated} part(s))`);
        setData((prev) =>
          prev ? { ...prev, jobCard: { ...prev.jobCard, status: partsData.status } } : prev
        );
      }
    } catch (error: any) {
      const msg = error?.response?.data?.error?.message || "Failed to send parts confirmation request";
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
  const partsTotal = items.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);

  return (
    <div className="flex flex-col gap-6 md:gap-8 w-full pb-8">
      {/* Header */}
      <JobCardHeader detail onBackClick={() => navigate(-1)} label="Back" />

      {/* Status Badge + assign-technicians CTA. Visible while items are still
          unassigned, whether the card is APPROVED or already IN_PROGRESS. */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-semibold text-gray-800">Job Card Details</h2>
        <div className="flex items-center gap-3">
          {(jobCard.status === "APPROVED" || jobCard.status === "IN_PROGRESS") &&
            items.some((i) => !i.assignedTechnicianId) && (
              <Button
                variant="gradient"
                icon={<UserPlus size={18} />}
                onClick={() => setAssignOpen(true)}
              >
                Assign Technicians
              </Button>
          )}
          <span className={`text-xs font-semibold px-3 py-1 rounded-md ${statusConfig.bg} ${statusConfig.text}`}>
            {statusConfig.label}
          </span>
        </div>
      </div>

      <AssignTechnicianModal
        isOpen={assignOpen}
        jobCardId={jobCard.id}
        items={items}
        onClose={() => setAssignOpen(false)}
        onAssigned={() => {
          // Re-fetch to get fresh per-item assignments + updated status.
          if (jobCardId) {
            getJobCardDetail(jobCardId).then((res) => {
              if (res.success && res.data) setData(res.data);
            });
          }
        }}
      />

      {/* Partial Approval Summary */}
      {jobCard.status === "PARTIALLY_APPROVED" && (() => {
        const approvedCount = items.filter((i) => i.isApprovedByCustomer === true).length;
        return (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
            <AlertCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-700 mb-1">
                Customer Partially Approved — {approvedCount} of {items.length} job{items.length !== 1 ? "s" : ""} approved
              </p>
              <ul className="mt-2 space-y-1">
                {items.map((item, idx) => (
                  <li key={item.id} className="flex items-center gap-2 text-xs">
                    {item.isApprovedByCustomer === true ? (
                      <CheckCircle size={13} className="text-green-500 shrink-0" />
                    ) : (
                      <XCircle size={13} className="text-red-400 shrink-0" />
                    )}
                    <span className={item.isApprovedByCustomer === true ? "text-green-700" : "text-red-500"}>
                      Job #{idx + 1} — {item.jobDescription}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      })()}

      {/* Vehicle Summary */}
      {vehicle && (
        <VehicleSummaryCard
          registration={vehicle.registrationNumber?.toUpperCase() ?? ""}
          model={`${vehicle.brand} ${vehicle.model}`}
          customerName={vehicle.customerName || "Unknown Customer"}
          status={statusConfig.label}
          imageUrl={vehicle.imageUrl}
        />
      )}

      {/* Parts Summary Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 shadow-sm">
        <h3 className="text-base font-semibold text-gray-800 mb-4">Job Details</h3>

        <div className="flex items-center gap-4 bg-gray-50 rounded-xl border border-gray-200 px-4 py-3.5">
          <div className="w-10 h-10 rounded-lg bg-[#ff4f31]/10 flex items-center justify-center shrink-0">
            <Package size={20} className="text-[#ff4f31]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-gray-800">
              {items.length} Parts
            </p>
            <p className="text-[12px] text-gray-500 mt-0.5">
              Total: <span className="font-semibold text-gray-700">{formatCurrency(partsTotal)}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPartsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[12px] font-medium text-[#ff4f31] hover:bg-[#ff4f31]/5 hover:border-[#ff4f31]/30 transition-colors cursor-pointer shrink-0"
          >
            <Eye size={14} />
            View Parts
          </button>
        </div>
      </div>

      {/* Parts Detail Modal */}
      <Modal isOpen={partsModalOpen} onClose={() => setPartsModalOpen(false)} title="Job Card Parts" size="lg">
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#ff4f31]/5 rounded-lg p-3 text-center">
              <p className="text-[11px] uppercase tracking-wider text-[#ff4f31]/70 font-medium">Total Parts</p>
              <p className="text-xl font-bold text-[#ff4f31] mt-0.5">{items.length}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-[11px] uppercase tracking-wider text-green-600/70 font-medium">Total Amount</p>
              <p className="text-xl font-bold text-green-700 mt-0.5">{formatCurrency(partsTotal)}</p>
            </div>
          </div>

          {/* Parts Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto pr-1">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 bg-gray-50 rounded-lg px-3.5 py-3 border border-gray-100"
              >
                <span className="text-[11px] font-mono bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-500 shrink-0 mt-0.5">
                  {item.partsRequired || "—"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-gray-700 leading-snug">{item.jobDescription}</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Qty: {item.quantity} · {formatCurrency(Number(item.lineTotal))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

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
