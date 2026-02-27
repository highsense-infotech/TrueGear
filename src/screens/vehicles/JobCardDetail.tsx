import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Loader2, Clock, Send, CheckCircle2, Pencil } from "lucide-react";
import { JobCardHeader } from "../../components/cards/JobCardHeader";
import { VehicleSummaryCard } from "../../components/cards/VehicleSummaryCard";
import { TotalsSummary } from "../../components/cards/TotalsSummary";
import { useCurrency } from "../../context/CurrencyContext";
import Button from "../../components/common/Button";
import {
  getJobCardDetail,
  shareEstimate,
  type SAJobCardDetailResponse,
} from "../../api/serviceAdvisor.api";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  DRAFT: { label: "Draft", bg: "bg-gray-100", text: "text-gray-600" },
  SHARED: { label: "Shared", bg: "bg-blue-50", text: "text-blue-600" },
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

  useEffect(() => {
    if (!jobCardId) return;

    const fetchDetail = async () => {
      try {
        const res = await getJobCardDetail(jobCardId);
        if (res.status) {
          setData(res.data);
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
    } catch (error) {
      console.error("Failed to share estimate:", error);
      toast.error("Failed to share estimate");
    } finally {
      setSharing(false);
    }
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
      </div>

      {/* Actions - Only for DRAFT */}
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
          <Button
            variant="gradient"
            className="w-full md:flex-1"
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
