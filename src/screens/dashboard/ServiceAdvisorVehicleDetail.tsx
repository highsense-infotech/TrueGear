import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { Breadcrumb } from "../../components/common/Breadcrumb";
import Button from "../../components/common/Button";
import { BackButton } from "../../components/cards/BackButton";
import { VehicleInfoBar } from "../../components/cards/VehicleInfoBar";
import { ServiceProgress } from "../../components/cards/ServiceProgress";
import { TabNavigation } from "../../components/cards/TabNavigation";
import { QCReport } from "../../components/cards/QCReport";
import { VehicleHistory } from "../../components/cards/VehicleHistory";
import { JobCardEmpty } from "../../components/cards/JobCardEmpty";
import { JobCardSummary } from "../../components/cards/JobCardSummary";
import ROUTES from "../../constants/routes";
import { useCurrency } from "../../context/CurrencyContext";
import {
  getVehicleDetail,
  getVehicleQCReport,
  getVehicleHistory,
  getVehicleJobCards,
  type SAVehicleDetail,
  type SAQCReport,
  type SAHistoryItem,
  type SAJobCard,
} from "../../api/serviceAdvisor.api";
import type { Step, StepStatus } from "../../components/cards/ServiceProgress";
import { Truck, ClipboardCheck, Check, AlertCircle, FileText } from "lucide-react";

const ServiceAdvisorVehicleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>("qcReport");
  const { formatCurrency } = useCurrency();

  const [vehicleDetail, setVehicleDetail] = useState<SAVehicleDetail | null>(null);
  const [qcReport, setQcReport] = useState<SAQCReport | null>(null);
  const [history, setHistory] = useState<SAHistoryItem[]>([]);
  const [jobCards, setJobCards] = useState<SAJobCard[]>([]);

  const [loading, setLoading] = useState(true);
  const [qcLoading, setQcLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [jobCardsLoading, setJobCardsLoading] = useState(false);

  // Fetch vehicle details on mount
  const fetchVehicleDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await getVehicleDetail(id);
      if (res.success) {
        setVehicleDetail(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch vehicle detail:", err);
      toast.error("Failed to load vehicle details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Fetch QC report
  const fetchQCReport = useCallback(async () => {
    if (!id) return;
    setQcLoading(true);
    try {
      const res = await getVehicleQCReport(id);
      if (res.success) {
        setQcReport(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch QC report:", err);
      toast.error("Failed to load QC report");
    } finally {
      setQcLoading(false);
    }
  }, [id]);

  // Fetch vehicle history
  const fetchHistory = useCallback(async () => {
    if (!id) return;
    setHistoryLoading(true);
    try {
      const res = await getVehicleHistory(id);
      if (res.success) {
        setHistory(res.data.history);
      }
    } catch (err) {
      console.error("Failed to fetch vehicle history:", err);
      toast.error("Failed to load vehicle history");
    } finally {
      setHistoryLoading(false);
    }
  }, [id]);

  // Fetch job cards
  const fetchJobCards = useCallback(async () => {
    if (!id) return;
    setJobCardsLoading(true);
    try {
      const res = await getVehicleJobCards(id);
      if (res.success) {
        setJobCards(res.data.jobCards);
      }
    } catch (err) {
      console.error("Failed to fetch job cards:", err);
      toast.error("Failed to load job cards");
    } finally {
      setJobCardsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchVehicleDetail();
  }, [fetchVehicleDetail]);

  // Fetch tab data when tab changes
  useEffect(() => {
    if (activeTab === "qcReport" && !qcReport) {
      fetchQCReport();
    } else if (activeTab === "vehicleHistory" && history.length === 0) {
      fetchHistory();
    } else if (activeTab === "jobCard" && jobCards.length === 0) {
      fetchJobCards();
    }
  }, [activeTab, qcReport, history.length, jobCards.length, fetchQCReport, fetchHistory, fetchJobCards]);

  // Map API service progress to ServiceProgress steps
  const buildProgressSteps = (): Step[] => {
    if (!vehicleDetail) return [];
    const sp = vehicleDetail.serviceProgress;
    const mapStatus = (s: string): StepStatus => {
      if (s === "completed") return "completed";
      if (s === "in_progress") return "current";
      return "pending";
    };
    return [
      { label: "Entry", icon: Truck, status: mapStatus(sp.entry.status) },
      { label: "QC", icon: ClipboardCheck, status: mapStatus(sp.qc.status) },
      { label: "Approval", icon: Check, status: mapStatus(sp.approval.status) },
      { label: "Service", icon: AlertCircle, status: mapStatus(sp.service.status) },
      { label: "Billing", icon: FileText, status: mapStatus(sp.billing.status) },
    ];
  };

  // Map QC report items to component format
  const mapQCResult = (result: string): "pass" | "fail" | "warning" | "na" => {
    if (result === "PASS") return "pass";
    if (result === "FAIL") return "fail";
    if (result === "NA") return "na";
    return "warning";
  };

  const handleTabChange = (tabKey: string) => {
    setActiveTab(tabKey);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!vehicleDetail) {
    return (
      <>
        <Breadcrumb
          items={[{ label: "Service Advisor" }, { label: "Vehicle Details" }]}
        />
        <div className="bg-white rounded-xl p-8 text-center">
          <p className="text-[#333] text-lg">Vehicle not found</p>
          <Button
            variant="gradient"
            className="mt-4"
            onClick={() => navigate(-1)}
          >
            Go Back
          </Button>
        </div>
      </>
    );
  }

  const { vehicle, customer } = vehicleDetail;

  const renderTabContent = () => {
    switch (activeTab) {
      case "qcReport":
        if (qcLoading) {
          return (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          );
        }
        if (!qcReport) {
          return (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
              <p className="text-[#999] text-sm">No QC report available</p>
            </div>
          );
        }
        return (
          <QCReport
            exteriorItems={qcReport.categories.EXTERIOR.map((item) => ({
              label: item.itemLabel,
              subLabel: item.comment || undefined,
              status: mapQCResult(item.result),
            }))}
            interiorEngineItems={qcReport.categories.INTERIOR.map((item) => ({
              label: item.itemLabel,
              subLabel: item.comment || undefined,
              status: mapQCResult(item.result),
            }))}
            brakeItems={qcReport.categories.BRAKE.map((item) => ({
              label: item.itemLabel,
              subLabel: item.comment || undefined,
              status: mapQCResult(item.result),
            }))}
          />
        );

      case "vehicleHistory":
        if (historyLoading) {
          return (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          );
        }
        if (history.length === 0) {
          return (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
              <p className="text-[#999] text-sm">No service history available</p>
            </div>
          );
        }
        return (
          <VehicleHistory
            historyItems={history.map((h) => ({
              title: h.serviceType,
              date: new Date(h.serviceDate).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }),
              advisor: h.technicianName || "—",
              price: h.totalCost ? formatCurrency(Number(h.totalCost)) : "—",
              duration: h.duration || "—",
            }))}
          />
        );

      case "jobCard":
        if (jobCardsLoading) {
          return (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          );
        }
        if (jobCards.length === 0) {
          return (
            <JobCardEmpty
              onButtonClick={() =>
                navigate(`${ROUTES.SERVICE_ADVISOR_DASHBOARD}/job-card/${id}`)
              }
            />
          );
        }
        return (
          <div className="flex flex-col gap-4">
            {jobCards.map((jobCard) => (
              <JobCardSummary
                key={jobCard.id}
                jobCard={jobCard}
                onViewClick={() =>
                  navigate(`${ROUTES.SERVICE_ADVISOR_DASHBOARD}/job-card-detail/${jobCard.id}`)
                }
              />
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <BackButton onClick={() => navigate(-1)} />
          <span className="bg-[#b8ecf0] text-[#0061ff] text-xs font-semibold px-3 py-1.5 rounded-md">
            {vehicle.status}
          </span>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{vehicle.registrationNumber?.toUpperCase()}</h2>
          <p className="text-sm text-gray-400">
            {vehicle.brand} {vehicle.model}
            {vehicle.modelVariant ? ` ${vehicle.modelVariant}` : ""}
          </p>
        </div>

        <VehicleInfoBar
          customerName={customer.name || "Unknown Customer"}
          customerPhone={customer.phone || "—"}
          onCreateJobCard={() =>
            navigate(`${ROUTES.SERVICE_ADVISOR_DASHBOARD}/job-card/${id}`)
          }
        />

        <ServiceProgress steps={buildProgressSteps()} />

        <TabNavigation
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />

        {renderTabContent()}
      </div>
    </>
  );
};

export default ServiceAdvisorVehicleDetail;
