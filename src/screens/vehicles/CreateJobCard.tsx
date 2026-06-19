import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ChevronDown, ChevronRight } from "lucide-react";
import { JobCardActions } from "../../components/cards/JobCardActions";
import { JobCardHeader } from "../../components/cards/JobCardHeader";
import { JobDetails, type Job } from "../../components/cards/JobDetails";
import { type JobErrors, type PaidPart } from "../../components/cards/JobRow";
// import { SuggestedJobsChips } from "../../components/cards/SuggestedJobsChips";
import { TotalsSummary } from "../../components/cards/TotalsSummary";
import { VehicleSummaryCard } from "../../components/cards/VehicleSummaryCard";
import { type DropdownOption } from "../../components/common/SearchableDropdown";
import {
  getVehicleDetail,
  getSuggestedJobs,
  createJobCard,
  getJobCardDetail,
  updateJobCard,
  getVehicleQCReport,
  type SASuggestedJob,
  type SAQCReport,
} from "../../api/serviceAdvisor.api";
import { listServiceTypes } from "../../api/serviceType.api";
import { useCurrency } from "../../context/CurrencyContext";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";

const CreateJobCard: React.FC = () => {
  const navigate = useNavigate();
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const [searchParams] = useSearchParams();
  const editJobCardId = searchParams.get("editJobCardId");
  const isEditMode = !!editJobCardId;
  const { taxConfig, currency } = useCurrency();
  const { warrantyOnly } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([{
    id: Date.now(),
    jobDescription: "",
    partsRequired: "",
    partsCost: 0,
    labourCost: 0,
    quantity: 1,
    serviceType: "",
    serviceCategory: "",
  }]);
  const [, setSuggestedJobs] = useState<string[]>([]);
  const [vehicleData, setVehicleData] = useState<{
    registration: string;
    model: string;
    customerName: string;
    imageUrl: string | null;
  }>({
    registration: "",
    model: "",
    customerName: "",
    imageUrl: null,
  });
  const [inspectionId, setInspectionId] = useState<string | null>(null);
  const [qcReport, setQcReport] = useState<SAQCReport | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [qcReportOpen, setQcReportOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingType, setSavingType] = useState<'draft' | 'estimate' | null>(null);
  const [jobErrors, setJobErrors] = useState<Record<number, JobErrors>>({});

  // Service Type options (passed to each job row)
  const [serviceTypeOptions, setServiceTypeOptions] = useState<DropdownOption[]>([]);


  useEffect(() => {
    if (!vehicleId) return;

    const fetchData = async () => {
      try {
        const [vehicleRes, suggestedRes, stRes] = await Promise.all([
          getVehicleDetail(vehicleId),
          getSuggestedJobs(vehicleId),
          listServiceTypes('service_assignment'),
        ]);

        // Set vehicle info
        if (!vehicleRes.data || !suggestedRes.data) return;
        const v = vehicleRes.data.vehicle;
        const c = vehicleRes.data.customer;
        setVehicleData({
          registration: v.registrationNumber?.toUpperCase() ?? "",
          model: `${v.brand} ${v.model}`,
          customerName: c.name || "",
          imageUrl: v.imageUrl ?? null,
        });

        // Set inspection ID if available
        if (vehicleRes.data.latestInspection?.id) {
          setInspectionId(vehicleRes.data.latestInspection.id);
        }

        // Fetch QC report (complaints + components + workshop rework + items).
        // 404 is expected when QC isn't completed yet — swallow silently.
        try {
          const qcRes = await getVehicleQCReport(vehicleId);
          if (qcRes.success && qcRes.data) {
            setQcReport(qcRes.data);
            // Auto-expand QC Report if there are failed items — advisor must
            // see those before quoting. Clean inspections stay collapsed.
            if (qcRes.data.summary.failCount > 0) {
              setQcReportOpen(true);
            }
          }
        } catch {
          /* no completed QC yet — leave qcReport null */
        }

        // Set suggested jobs from QC failed/NA items
        const suggestions = suggestedRes.data.suggestedJobs;
        setSuggestedJobs(suggestions.map((s: SASuggestedJob) => s.suggestedDescription));

        // Service types
        if (stRes.success && Array.isArray(stRes.data)) {
          setServiceTypeOptions(
            stRes.data.map((s: any) => ({ id: s.id, name: s.name }))
          );
        }

        // Edit mode: reconstruct separate job rows grouped by serviceType + serviceCategory
        if (editJobCardId) {
          const jobCardRes = await getJobCardDetail(editJobCardId);
          if (!jobCardRes.data) return;
          const existingItems = jobCardRes.data.items;
          if (existingItems.length > 0) {
            const reconstructed: Job[] = [];
            let counter = Date.now();

            for (const item of existingItems as any[]) {
              const isPaidService = item.serviceType === "Repair";
              const hasCategory = Boolean(item.serviceCategory);

              if (hasCategory) {
                // Group into an autoParts job row keyed by serviceType + serviceCategory
                const groupKey = `${item.serviceType || ""}||${item.serviceCategory}`;
                const existing = reconstructed.find(
                  (j) => `${j.serviceType}||${j.serviceCategory}` === groupKey && Array.isArray(j.autoParts),
                );
                const autoPart = {
                  id: item.id,
                  partCode: item.partsRequired || "",
                  partName: item.jobDescription || "",
                  quantity: String(item.quantity),
                  unitPrice: String(item.partsCost || 0),
                };
                if (existing) {
                  existing.autoParts = [...(existing.autoParts || []), autoPart];
                } else {
                  reconstructed.push({
                    id: counter++,
                    jobDescription: "",
                    partsRequired: "",
                    partsCost: 0,
                    labourCost: 0,
                    quantity: 1,
                    serviceType: item.serviceType || "",
                    serviceCategory: item.serviceCategory || "",
                    autoParts: [autoPart],
                  });
                }
              } else if (isPaidService) {
                // Group into a paidParts job row
                const existing = reconstructed.find(
                  (j) => j.serviceType === "Repair" && Array.isArray(j.paidParts),
                );
                const paidPart = {
                  id: item.id,
                  partCode: item.partsRequired || "",
                  partName: item.jobDescription || "",
                  unitPrice: Number(item.partsCost) || 0,
                  quantity: item.quantity || 1,
                };
                if (existing) {
                  existing.paidParts = [...(existing.paidParts || []), paidPart];
                } else {
                  reconstructed.push({
                    id: counter++,
                    jobDescription: "",
                    partsRequired: "",
                    partsCost: 0,
                    labourCost: 0,
                    quantity: 1,
                    serviceType: "Repair",
                    serviceCategory: "",
                    paidParts: [paidPart],
                  });
                }
              } else {
                // Manual row — each item is its own job
                reconstructed.push({
                  id: counter++,
                  jobDescription: item.jobDescription || "",
                  partsRequired: item.partsRequired || "",
                  partsCost: Number(item.partsCost) || 0,
                  labourCost: Number(item.labourCost) || 0,
                  quantity: item.quantity || 1,
                  serviceType: item.serviceType || "",
                  serviceCategory: "",
                });
              }
            }

            setJobs(reconstructed);
          }
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast.error("Failed to load job card data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [vehicleId, editJobCardId]);

  const addJob = () => {
    const newJob: Job = {
      id: Date.now(),
      jobDescription: "",
      partsRequired: "",
      partsCost: 0,
      labourCost: 0,
      quantity: 1,
      serviceType: "",
      serviceCategory: "",
    };
    setJobs((prev) => [...prev, newJob]);
  };

  const removeJob = (id: number) => {
    setJobs((prev) => prev.filter((job) => job.id !== id));
  };

  const updateJob = (id: number, field: keyof Job, value: string | number | boolean) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === id ? { ...job, [field]: value } : job
      )
    );
    // Clear error for this field when user types
    if (jobErrors[id]?.[field as keyof JobErrors]) {
      setJobErrors((prev) => {
        const updated = { ...prev };
        if (updated[id]) {
          const { [field as keyof JobErrors]: _, ...rest } = updated[id];
          if (Object.keys(rest).length === 0) {
            delete updated[id];
          } else {
            updated[id] = rest;
          }
        }
        return updated;
      });
    }
  };


  // When user selects a Service Category (B/C/D), fetch parts and replace the
  // triggering row with one auto-populated row per part.
  const handleServiceCategoryChange = async (
    jobId: number,
    categoryCode: string,
    categoryName: string,
    serviceTypeId: string,
  ) => {
    try {
      const params: Record<string, string> = {};
      if (serviceTypeId) params.serviceCategoryId = serviceTypeId;
      if (vehicleId) params.vehicleId = vehicleId;

      const { data } = await api.get(
        `/model-service-type-assignments/by-category/${categoryCode}`,
        { params }
      );
      if (!data?.success || !Array.isArray(data.data) || data.data.length === 0) {
        toast.error("No parts found for this combination");
        // Still update the category name on the row
        setJobs((prev) =>
          prev.map((j) =>
            j.id === jobId ? { ...j, serviceCategory: categoryName, autoParts: [] } : j
          )
        );
        return;
      }

      // Store fetched parts on the job row
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? { ...j, serviceCategory: categoryName, autoParts: data.data }
            : j
        )
      );

      toast.success(`${data.data.length} parts loaded from ${categoryName}`);
    } catch {
      toast.error("Failed to load parts for this category");
    }
  };

  // ── Paid Service part handlers ──────────────────────────────────────────────

  const addPaidPart = (jobId: number, part: PaidPart) => {
    setJobs((prev) =>
      prev.map((job) => {
        if (job.id !== jobId) return job;
        const existing = job.paidParts ?? [];
        // Same part already on the line? Bump qty instead of pushing a
        // duplicate row. Match by partCode (falls back to partName).
        const idx = existing.findIndex(
          (p) => (part.partCode && p.partCode === part.partCode) ||
                 (!part.partCode && p.partName === part.partName),
        );
        if (idx >= 0) {
          const merged = [...existing];
          merged[idx] = { ...merged[idx], quantity: merged[idx].quantity + part.quantity };
          return { ...job, paidParts: merged };
        }
        return { ...job, paidParts: [...existing, part] };
      })
    );
  };

  const removePaidPart = (jobId: number, partId: string) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? { ...job, paidParts: (job.paidParts ?? []).filter((p) => p.id !== partId) }
          : job
      )
    );
  };

  const updatePaidPart = (jobId: number, partId: string, quantity: number) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? {
              ...job,
              paidParts: (job.paidParts ?? []).map((p) =>
                p.id === partId ? { ...p, quantity } : p
              ),
            }
          : job
      )
    );
  };

  const calculateLineTotal = (job: Job) => {
    // Paid Service: sum manually added paid parts
    if (job.serviceType === "Repair") {
      return (job.paidParts ?? []).reduce(
        (sum, p) => sum + p.unitPrice * p.quantity, 0
      );
    }
    // Category-based auto-populated parts
    if (job.autoParts && job.autoParts.length > 0) {
      return job.autoParts.reduce(
        (sum, p) => sum + (Number(p.quantity) || 1) * (Number(p.unitPrice) || 0), 0
      );
    }
    return (job.partsCost * job.quantity) + job.labourCost;
  };

  const subtotal = jobs.reduce((sum, job) => sum + calculateLineTotal(job), 0);
  const taxAmount = subtotal * (taxConfig.percentage / 100);
  const total = subtotal + taxAmount;

  const handleBackClick = () => {
    navigate(-1);
  };

  const validateJobs = (): boolean => {
    if (jobs.length === 0) {
      toast.error("Please add at least one job before saving");
      return false;
    }

    const errors: Record<number, JobErrors> = {};
    let hasError = false;

    jobs.forEach((job) => {
      const err: JobErrors = {};
      const isPaidService = job.serviceType === "Repair";
      const hasAutoParts = job.autoParts && job.autoParts.length > 0;
      const hasPaidParts = job.paidParts && job.paidParts.length > 0;

      if (!job.serviceType) {
        err.serviceType = "Service type is required";
        hasError = true;
      }

      if (isPaidService) {
        // Paid Service: at least one part must be added
        if (!hasPaidParts) {
          err.paidParts = "Please add at least one part";
          hasError = true;
        }
      } else if (!hasAutoParts) {
        // Manual entry validation (non-Paid, no category parts loaded)
        if (!job.jobDescription.trim()) {
          err.jobDescription = "Job description is required";
          hasError = true;
        }
        if (job.partsCost < 0) {
          err.partsCost = "Parts cost cannot be negative";
          hasError = true;
        }
        if (job.labourCost < 0) {
          err.labourCost = "Labour cost cannot be negative";
          hasError = true;
        }
        if (job.quantity < 1) {
          err.quantity = "Quantity must be at least 1";
          hasError = true;
        }
        if (job.partsCost === 0 && job.labourCost === 0) {
          err.partsCost = "Enter parts cost or labour cost";
          err.labourCost = "Enter parts cost or labour cost";
          hasError = true;
        }
      }

      if (Object.keys(err).length > 0) {
        errors[job.id] = err;
      }
    });

    setJobErrors(errors);

    if (hasError) {
      toast.error("Please fix the errors before saving");
    }

    return !hasError;
  };

  const saveAndNavigate = async (type: 'draft' | 'estimate') => {
    if (!vehicleId || savingType) return;
    if (!validateJobs()) return;

    setSavingType(type);
    try {
      // Build one job group per job row — items are nested under their parent job
      const jobsPayload = jobs.map((job) => {
        let items;

        if (job.serviceType === "Repair" && job.paidParts && job.paidParts.length > 0) {
          items = job.paidParts.map((part) => ({
            jobDescription: part.partName,
            partsRequired: part.partCode,
            partsCost: part.unitPrice,
            labourCost: 0,
            quantity: part.quantity,
          }));
        } else if (job.autoParts && job.autoParts.length > 0) {
          items = job.autoParts.map((part) => ({
            jobDescription: part.partName,
            partsRequired: part.partCode,
            partsCost: Number(part.unitPrice) || 0,
            labourCost: 0,
            quantity: Number(part.quantity) || 1,
          }));
        } else {
          items = [{
            jobDescription: job.jobDescription,
            partsRequired: job.partsRequired || null,
            partsCost: job.partsCost,
            labourCost: job.labourCost,
            quantity: job.quantity,
            isWarrantyClaim: !!job.isWarrantyClaim,
            warrantyClaimNo: job.warrantyClaimNo || null,
            warrantyOem: job.warrantyOem || null,
          }];
        }

        return {
          serviceType: job.serviceType || null,
          serviceCategory: job.serviceCategory || null,
          items,
        };
      });

      if (isEditMode) {
        const res = await updateJobCard(editJobCardId, {
          jobs: jobsPayload,
          taxLabel: taxConfig.label,
          taxPercentage: taxConfig.percentage,
          currencyCode: currency,
        });
        if (res.success) {
          toast.success("Job card updated successfully");
          navigate(`/service-advisor-dashboard/job-card-detail/${editJobCardId}`);
        }
      } else {
        const res = await createJobCard(vehicleId, {
          inspectionId,
          jobs: jobsPayload,
          taxLabel: taxConfig.label,
          taxPercentage: taxConfig.percentage,
          currencyCode: currency,
        });
        if (res.success && res.data) {
          toast.success("Job card saved as draft");
          navigate(`/service-advisor-dashboard/job-card-detail/${res.data.jobCard.id}`);
        }
      }
    } catch (error: any) {
      const msg = error?.response?.data?.error?.message || "Failed to save job card";
      toast.error(msg);
    } finally {
      setSavingType(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff4f31]" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 md:gap-5 w-full pb-8">
        {/* Header Section */}
        <JobCardHeader onBackClick={handleBackClick} edit={isEditMode} />

        {warrantyOnly && (
          <div className="rounded-xl border border-[#fed7aa] bg-[#fff7ed] px-4 py-3 text-[13px] text-[#c2410c]">
            Warranty clerk — select <span className="font-semibold">Warranty Service</span> as the
            service type. Only warranty job cards can be created with this account.
          </div>
        )}

        {/* Vehicle Summary Card */}
        <VehicleSummaryCard
          registration={vehicleData.registration}
          model={vehicleData.model}
          customerName={vehicleData.customerName}
          imageUrl={vehicleData.imageUrl}
        />

        {/* Summary card — collapsible. Header shows quick context so the
            advisor can decide whether to expand. */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
          <button
            type="button"
            onClick={() => setSummaryOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-3 p-4 md:p-5 hover:bg-[#fafafa] transition-colors cursor-pointer"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-left">
              {summaryOpen ? (
                <ChevronDown size={16} className="text-[#666]" />
              ) : (
                <ChevronRight size={16} className="text-[#666]" />
              )}
              <h3 className="text-[14px] font-semibold text-[#333]">Summary</h3>
              {qcReport?.appointment?.bookingRef && (
                <span className="text-[11px] font-semibold text-[#FF4F31] bg-[#FFF1EC] px-2 py-0.5 rounded">
                  {qcReport.appointment.bookingRef}
                </span>
              )}
              {!summaryOpen && (
                <span className="text-[11px] text-[#666] truncate">
                  {vehicleData.customerName || "—"} ·{" "}
                  {vehicleData.model || "—"}
                  {qcReport?.appointment?.complaints?.length
                    ? ` · ${qcReport.appointment.complaints.length} complaint${qcReport.appointment.complaints.length > 1 ? "s" : ""}`
                    : ""}
                </span>
              )}
            </div>
          </button>

          {summaryOpen && (
            <div className="px-4 pb-4 md:px-5 md:pb-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#999] mb-1">Customer</p>
              <p className="text-[13px] text-[#333] font-medium">
                {vehicleData.customerName || "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#999] mb-1">Vehicle</p>
              <p className="text-[13px] text-[#333] font-medium">
                {vehicleData.model || "—"}
              </p>
              <p className="text-[11px] text-[#999]">
                {vehicleData.registration || ""}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#999] mb-1">Service Type</p>
              <p className="text-[13px] text-[#333] font-medium">
                {qcReport?.appointment?.serviceType
                  ? qcReport.appointment.serviceType.replace(/_/g, " ")
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#999] mb-1">Appointment</p>
              <p className="text-[13px] text-[#333] font-medium">
                {qcReport?.appointment
                  ? `${qcReport.appointment.appointmentDate} · ${qcReport.appointment.appointmentTime}`
                  : "—"}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-[#FFE0D6] bg-[#FFF7F3] p-3">
            <p className="text-[12px] font-semibold text-[#333] mb-2">
              Customer Complaints
            </p>
            {qcReport?.appointment?.complaints && qcReport.appointment.complaints.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1">
                {qcReport.appointment.complaints.map((c, i) => (
                  <li key={i} className="text-[#444] text-[13px] leading-normal">{c}</li>
                ))}
              </ul>
            ) : (
              <p className="text-[#999] text-[12px] italic">
                No complaints recorded for this appointment.
              </p>
            )}
          </div>
            </div>
          )}
        </div>

        {/* QC Report — collapsible. Auto-expands when there are failed items. */}
        {qcReport && (
          <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
            <button
              type="button"
              onClick={() => setQcReportOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-3 p-4 md:p-5 hover:bg-[#fafafa] transition-colors cursor-pointer"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-left">
                {qcReportOpen ? (
                  <ChevronDown size={16} className="text-[#666]" />
                ) : (
                  <ChevronRight size={16} className="text-[#666]" />
                )}
                <h3 className="text-[14px] font-semibold text-[#333]">QC Inspection Report</h3>
                {qcReport.overallStatus && (
                  <span
                    className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded ${
                      qcReport.overallStatus === "PASS"
                        ? "bg-green-100 text-green-700"
                        : qcReport.overallStatus === "FAIL"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {qcReport.overallStatus}
                  </span>
                )}
                {!qcReportOpen && (
                  <span className="text-[11px] text-[#666]">
                    {qcReport.summary.passCount} pass ·{" "}
                    <span className={qcReport.summary.failCount > 0 ? "text-red-600 font-semibold" : ""}>
                      {qcReport.summary.failCount} fail
                    </span>{" "}
                    · {qcReport.summary.warningCount} N/A
                    {qcReport.components.length > 0
                      ? ` · ${qcReport.components.length} component${qcReport.components.length > 1 ? "s" : ""}`
                      : ""}
                  </span>
                )}
              </div>
            </button>

            {qcReportOpen && (
              <div className="px-4 pb-4 md:px-5 md:pb-5">
            {qcReport.completedAt && (
              <p className="text-[11px] text-[#999] mb-3">
                Completed: {new Date(qcReport.completedAt).toLocaleDateString()}
              </p>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-[#fafafa] rounded-lg p-3">
                <p className="text-[11px] text-[#999] uppercase">Total Items</p>
                <p className="text-[16px] font-semibold text-[#333]">
                  {qcReport.summary.totalItems}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-[11px] text-green-700 uppercase">Pass</p>
                <p className="text-[16px] font-semibold text-green-700">
                  {qcReport.summary.passCount}
                </p>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-[11px] text-red-700 uppercase">Fail</p>
                <p className="text-[16px] font-semibold text-red-700">
                  {qcReport.summary.failCount}
                </p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3">
                <p className="text-[11px] text-yellow-700 uppercase">N/A</p>
                <p className="text-[16px] font-semibold text-yellow-700">
                  {qcReport.summary.warningCount}
                </p>
              </div>
            </div>

            {qcReport.failedItems.length > 0 && (
              <div className="mb-4">
                <p className="text-[12px] font-semibold text-[#333] mb-2">Failed Items</p>
                <ul className="space-y-1">
                  {qcReport.failedItems.map((item) => (
                    <li
                      key={item.id}
                      className="text-[12px] text-[#444] flex flex-wrap items-baseline gap-2"
                    >
                      <span className="font-mono text-red-600">{item.itemCode}</span>
                      <span>{item.itemLabel}</span>
                      {item.comment && (
                        <span className="text-[#999] italic">— {item.comment}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {qcReport.finalRemarks && (
              <div className="mb-4">
                <p className="text-[12px] font-semibold text-[#333] mb-1">Final Remarks</p>
                <p className="text-[12px] text-[#666]">{qcReport.finalRemarks}</p>
              </div>
            )}

            {qcReport.components.length > 0 && (
              <div className="mb-4">
                <p className="text-[12px] font-semibold text-[#333] mb-2">
                  Components ({qcReport.components.length})
                </p>
                <div className="space-y-2">
                  {qcReport.components.map((c, i) => (
                    <div
                      key={c.id}
                      className="border border-[#E5E7EB] rounded-lg p-3 text-[12px]"
                    >
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-1">
                        <span className="text-[#999]">#{i + 1}</span>
                        <span className="font-semibold text-[#333]">
                          {c.majorComponent || "—"}
                        </span>
                        <span className="text-[#666]">
                          Item: {c.itemNumber || "—"}
                        </span>
                      </div>
                      {c.comment && <p className="text-[#444]">{c.comment}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {qcReport.workshopRework &&
              (qcReport.workshopRework.majorComponent ||
                qcReport.workshopRework.technician ||
                qcReport.workshopRework.itemNumber ||
                qcReport.workshopRework.comments) && (
                <div>
                  <p className="text-[12px] font-semibold text-[#333] mb-2">
                    Workshop Rework
                  </p>
                  <div className="border border-[#FFE0D6] bg-[#FFF7F3] rounded-lg p-3 text-[12px]">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                      <div>
                        <span className="text-[#999]">Component: </span>
                        <span className="text-[#333]">
                          {qcReport.workshopRework.majorComponent || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#999]">Technician: </span>
                        <span className="text-[#333]">
                          {qcReport.workshopRework.technician || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#999]">Item No: </span>
                        <span className="text-[#333]">
                          {qcReport.workshopRework.itemNumber || "—"}
                        </span>
                      </div>
                    </div>
                    {qcReport.workshopRework.comments && (
                      <p className="text-[#444]">
                        {qcReport.workshopRework.comments}
                      </p>
                    )}
                  </div>
                </div>
              )}
              </div>
            )}
          </div>
        )}

        {/* Suggested Jobs Chips — commented out for now
        <SuggestedJobsChips
          suggestedJobs={suggestedJobs}
          addedJobs={jobs.map((j) => j.jobDescription)}
          onJobClick={addSuggestedJob}
        />
        */}

        {/* Job Rows Section */}
        <JobDetails
          jobs={jobs}
          onAddJob={addJob}
          onUpdateJob={updateJob}
          onRemoveJob={removeJob}
          calculateLineTotal={calculateLineTotal}
          jobErrors={jobErrors}
          serviceTypeOptions={serviceTypeOptions}
          onServiceCategoryChange={handleServiceCategoryChange}
          onAddPaidPart={addPaidPart}
          onRemovePaidPart={removePaidPart}
          onUpdatePaidPart={updatePaidPart}
        />

        {/* Totals Section */}
        <TotalsSummary
          subtotal={subtotal}
          taxAmount={taxAmount}
          total={total}
        />

        {/* Footer Actions */}
        <JobCardActions
          jobCount={jobs.length}
          total={total}
          onSaveDraft={() => saveAndNavigate('draft')}
          onShareEstimate={() => saveAndNavigate('estimate')}
          savingType={savingType}
        />
      </div>
    </>
  );
};

export default CreateJobCard;
