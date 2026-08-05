import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ChevronDown, ChevronRight } from "lucide-react";
import { JobCardActions } from "../../components/cards/JobCardActions";
import { JobCardHeader } from "../../components/cards/JobCardHeader";
import { JobDetails, type Job } from "../../components/cards/JobDetails";
import { type JobErrors, type PaidPart } from "../../components/cards/JobRow";
import {
  type LabourLine,
  createEmptyLabourLine,
} from "../../components/cards/LabourSection";
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
import { listJobTypes, type JobTypeItem } from "../../api/jobType.api";
import {
  listActiveLabourDescriptions,
  createLabourDescription,
} from "../../api/labourDescription.api";
import {
  listFranchiseServiceDepts,
  type FranchiseServiceDeptItem,
} from "../../api/franchise.api";
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
  const [jobs, setJobs] = useState<Job[]>([
    {
      id: Date.now(),
      jobDescription: "",
      partsRequired: "",
      partsCost: 0,
      labourCost: 0,
      quantity: 1,
      serviceType: "",
      serviceCategory: "",
      labourLines: [createEmptyLabourLine()],
    },
  ]);
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
  const [savingType, setSavingType] = useState<"draft" | "estimate" | null>(
    null,
  );
  const [jobErrors, setJobErrors] = useState<Record<number, JobErrors>>({});

  // Service Type options (passed to each job row)
  const [serviceTypeOptions, setServiceTypeOptions] = useState<
    DropdownOption[]
  >([]);

  // Evolve Job Type (AI-1) — now selected PER JOB (see JobRow). Options come
  // from the backend job-types lookup; empty until the Evolve lookup is
  // configured (client-dependent), in which case each job's Job Type control is
  // hidden and the RO push falls back to the 'INT' default.
  const [jobTypeOptions, setJobTypeOptions] = useState<JobTypeItem[]>([]);
  // Labour Master options (Phase 3). Best-effort: empty falls back to a
  // free-text-only Labour dropdown so the Job Card never breaks.
  const [labourOptions, setLabourOptions] = useState<DropdownOption[]>([]);

  // Evolve Franchise / Service Dept (AI-3) — two dependent dropdowns mirroring
  // the Evolve RO screen. Options are the labeled franchise_service_departments
  // pairs; empty until an admin labels them (client-dependent), in which case
  // the UI shows "No Franchises configured." and the RO falls back to '1'/'1'.
  // The selected pair's id is stored on the job card.
  const [fsdOptions, setFsdOptions] = useState<FranchiseServiceDeptItem[]>([]);
  const [franchiseLabel, setFranchiseLabel] = useState<string>("");
  const [franchiseServiceDeptId, setFranchiseServiceDeptId] =
    useState<string>("");

  // Derive the Franchise dropdown value from a stored pair id (edit-mode
  // prefill): once the options load, resolve which franchise the saved pair
  // belongs to so the dependent Service Dept dropdown shows the right list.
  useEffect(() => {
    if (!franchiseServiceDeptId || franchiseLabel || fsdOptions.length === 0)
      return;
    const match = fsdOptions.find((o) => o.id === franchiseServiceDeptId);
    if (match?.franchiseLabel) setFranchiseLabel(match.franchiseLabel);
  }, [franchiseServiceDeptId, franchiseLabel, fsdOptions]);

  // Distinct franchise labels (first dropdown) and the service-dept options for
  // the currently selected franchise (second dropdown).
  const franchiseNames = Array.from(
    new Set(
      fsdOptions.map((o) => o.franchiseLabel).filter((l): l is string => !!l),
    ),
  );
  const serviceDeptOptions = fsdOptions.filter(
    (o) => o.franchiseLabel === franchiseLabel,
  );

  useEffect(() => {
    if (!vehicleId) return;

    const fetchData = async () => {
      try {
        const [vehicleRes, suggestedRes, stRes, jtRes, fsdRes, labourRes] =
          await Promise.all([
            getVehicleDetail(vehicleId),
            getSuggestedJobs(vehicleId),
            listServiceTypes("service_assignment"),
            // Job Types (AI-1). Best-effort: on any failure the dropdown falls back
            // to the empty "No Job Types configured." state and booking proceeds.
            listJobTypes().catch(() => null),
            // Franchise / Service Dept pairs (AI-3). Best-effort — empty falls back
            // to "No Franchises configured." and the RO keeps its '1'/'1' default.
            listFranchiseServiceDepts().catch(() => null),
            // Labour Master (Phase 3). Best-effort — empty leaves the Labour
            // dropdown blank while the Description textbox stays fully editable.
            listActiveLabourDescriptions().catch(() => null),
          ]);

        // Populate the Job Type dropdown from the backend lookup (may be empty).
        if (jtRes?.success && Array.isArray(jtRes.data)) {
          setJobTypeOptions(jtRes.data);
        }

        // Populate the Labour dropdown from the Labour Master (may be empty).
        if (labourRes?.success && Array.isArray(labourRes.data)) {
          setLabourOptions(
            labourRes.data.map((l) => ({ id: l.id, name: l.name })),
          );
        }

        // Populate the Franchise / Service Dept dropdowns (may be empty).
        if (fsdRes?.success && Array.isArray(fsdRes.data)) {
          setFsdOptions(fsdRes.data);
        }

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
        setSuggestedJobs(
          suggestions.map((s: SASuggestedJob) => s.suggestedDescription),
        );

        // Service types
        if (stRes.success && Array.isArray(stRes.data)) {
          setServiceTypeOptions(
            stRes.data.map((s: any) => ({ id: s.id, name: s.name })),
          );
        }

        // Edit mode: reconstruct separate job rows grouped by jobGroup (the job
        // each item belonged to at creation). Grouping by serviceType/category
        // used to merge two jobs that shared a service type (e.g. two "Repair"
        // jobs) into one; jobGroup keeps them separate.
        if (editJobCardId) {
          const jobCardRes = await getJobCardDetail(editJobCardId);
          if (!jobCardRes.data) return;
          // Job Type is prefilled per job during item reconstruction below.
          // Prefill the Franchise / Service Dept (AI-3) selection if present;
          // the dependent franchiseLabel is derived from the options via effect.
          if (jobCardRes.data.jobCard?.franchiseServiceDeptId) {
            setFranchiseServiceDeptId(
              jobCardRes.data.jobCard.franchiseServiceDeptId,
            );
          }
          const existingItems = jobCardRes.data.items;
          if (existingItems.length > 0) {
            const reconstructed: Job[] = [];
            let counter = Date.now();
            // Labour items (partsRequired='LABOUR') are collected per jobGroup and
            // attached to their job's Labour section — never shown as parts.
            const labourByGroup = new Map<number, LabourLine[]>();

            for (const item of existingItems as any[]) {
              // The job this item belonged to at creation. Items only merge into
              // the same reconstructed row when they share this group.
              const jobGroup = Number(item.jobGroup ?? 1);

              // Labour line → Labour section (skip the parts reconstruction).
              if (String(item.partsRequired ?? "").trim().toUpperCase() === "LABOUR") {
                const line: LabourLine = {
                  id: item.id ? String(item.id) : crypto.randomUUID(),
                  presetLabel: "",
                  description: item.jobDescription || "",
                  hours: item.estimatedHours != null ? String(item.estimatedHours) : "",
                  amount: item.labourCost != null ? String(item.labourCost) : "",
                  notes: item.notes ?? "",
                };
                labourByGroup.set(jobGroup, [
                  ...(labourByGroup.get(jobGroup) ?? []),
                  line,
                ]);
                continue;
              }

              const isPaidService = item.serviceType === "Repair";
              const hasCategory = Boolean(item.serviceCategory);

              if (hasCategory) {
                // Group into an autoParts job row scoped to its jobGroup.
                const existing = reconstructed.find(
                  (j) =>
                    (j as any).__jobGroup === jobGroup &&
                    Array.isArray(j.autoParts),
                );
                const autoPart = {
                  id: item.id,
                  partCode: item.partsRequired || "",
                  partName: item.jobDescription || "",
                  quantity: String(item.quantity),
                  unitPrice: String(item.partsCost || 0),
                };
                if (existing) {
                  existing.autoParts = [
                    ...(existing.autoParts || []),
                    autoPart,
                  ];
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
                    jobType: item.jobType || "",
                    estimatedHours: item.estimatedHours != null ? String(item.estimatedHours) : "",
                    __jobGroup: jobGroup,
                  } as any);
                }
              } else if (isPaidService) {
                // Group into a paidParts job row scoped to its jobGroup, so two
                // separate "Repair" jobs stay as two rows.
                const existing = reconstructed.find(
                  (j) =>
                    (j as any).__jobGroup === jobGroup &&
                    j.serviceType === "Repair" &&
                    Array.isArray(j.paidParts),
                );
                const paidPart = {
                  id: item.id,
                  partCode: item.partsRequired || "",
                  partName: item.jobDescription || "",
                  unitPrice: Number(item.partsCost) || 0,
                  quantity: item.quantity || 1,
                };
                if (existing) {
                  existing.paidParts = [
                    ...(existing.paidParts || []),
                    paidPart,
                  ];
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
                    jobType: item.jobType || "",
                    estimatedHours: item.estimatedHours != null ? String(item.estimatedHours) : "",
                    __jobGroup: jobGroup,
                  } as any);
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
                  jobType: item.jobType || "",
                  estimatedHours: item.estimatedHours != null ? String(item.estimatedHours) : "",
                  __jobGroup: jobGroup,
                } as any);
              }
            }

            // Attach reconstructed labour lines to their job (by jobGroup). A
            // labour-only group (no parts) still gets its own row so nothing is lost.
            labourByGroup.forEach((lines, group) => {
              const target = reconstructed.find(
                (j) => (j as any).__jobGroup === group,
              );
              if (target) {
                target.labourLines = lines;
              } else {
                reconstructed.push({
                  id: counter++,
                  jobDescription: "",
                  partsRequired: "",
                  partsCost: 0,
                  labourCost: 0,
                  quantity: 1,
                  serviceType: "",
                  serviceCategory: "",
                  jobType: "",
                  estimatedHours: "",
                  __jobGroup: group,
                  labourLines: lines,
                } as any);
              }
            });

            // Ensure every job shows at least one labour row — reconstructed
            // labour when present, otherwise a single empty default row.
            setJobs(
              reconstructed.map((j) => ({
                ...j,
                labourLines: j.labourLines?.length
                  ? j.labourLines
                  : [createEmptyLabourLine()],
              })),
            );
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
      labourLines: [createEmptyLabourLine()],
    };
    setJobs((prev) => [...prev, newJob]);
  };

  const removeJob = (id: number) => {
    setJobs((prev) => prev.filter((job) => job.id !== id));
  };

  const updateJob = (
    id: number,
    field: keyof Job,
    value: string | number | boolean,
  ) => {
    setJobs((prev) =>
      prev.map((job) => (job.id === id ? { ...job, [field]: value } : job)),
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
    // Show a loader on the row while parts + their (live Evolve) prices load.
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId ? { ...j, serviceCategory: categoryName, autoPartsLoading: true } : j,
      ),
    );
    try {
      const params: Record<string, string> = {};
      if (serviceTypeId) params.serviceCategoryId = serviceTypeId;
      if (vehicleId) params.vehicleId = vehicleId;

      const { data } = await api.get(
        `/model-service-type-assignments/by-category/${categoryCode}`,
        { params },
      );
      if (
        !data?.success ||
        !Array.isArray(data.data) ||
        data.data.length === 0
      ) {
        toast.error("No parts found for this combination");
        // Still update the category name on the row
        setJobs((prev) =>
          prev.map((j) =>
            j.id === jobId
              ? { ...j, serviceCategory: categoryName, autoParts: [] }
              : j,
          ),
        );
        return;
      }

      // Store fetched parts on the job row
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? { ...j, serviceCategory: categoryName, autoParts: data.data }
            : j,
        ),
      );

      toast.success(`${data.data.length} parts loaded from ${categoryName}`);
    } catch {
      toast.error("Failed to load parts for this category");
    } finally {
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, autoPartsLoading: false } : j)),
      );
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
          (p) =>
            (part.partCode && p.partCode === part.partCode) ||
            (!part.partCode && p.partName === part.partName),
        );
        if (idx >= 0) {
          const merged = [...existing];
          merged[idx] = {
            ...merged[idx],
            quantity: merged[idx].quantity + part.quantity,
          };
          return { ...job, paidParts: merged };
        }
        return { ...job, paidParts: [...existing, part] };
      }),
    );
  };

  const removePaidPart = (jobId: number, partId: string) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? {
              ...job,
              paidParts: (job.paidParts ?? []).filter((p) => p.id !== partId),
            }
          : job,
      ),
    );
  };

  const updatePaidPart = (jobId: number, partId: string, quantity: number) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? {
              ...job,
              paidParts: (job.paidParts ?? []).map((p) =>
                p.id === partId ? { ...p, quantity } : p,
              ),
            }
          : job,
      ),
    );
  };

  // ── Labour handlers (Phase 1 — local state only; not persisted / not summed) ──

  const addLabourLine = (jobId: number) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? { ...job, labourLines: [...(job.labourLines ?? []), createEmptyLabourLine()] }
          : job,
      ),
    );
  };

  const updateLabourLine = (
    jobId: number,
    lineId: string,
    field: keyof LabourLine,
    value: string,
  ) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? {
              ...job,
              labourLines: (job.labourLines ?? []).map((l) =>
                l.id === lineId ? { ...l, [field]: value } : l,
              ),
            }
          : job,
      ),
    );
  };

  // Add a typed-but-unlisted labour value. Returns a dropdown option immediately
  // (optimistic, so selection is instant) and persists it to the Labour Master in
  // the background so it's reusable next time. On success the temp id is swapped
  // for the real DB id; on failure (e.g. duplicate) the local option still works
  // and the value is saved on the job card regardless. De-dupes case-insensitively.
  const addLabourOption = (name: string): DropdownOption => {
    const trimmed = name.trim();
    const existing = labourOptions.find(
      (o) => o.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing) return existing;

    const tempOpt: DropdownOption = { id: crypto.randomUUID(), name: trimmed };
    setLabourOptions((prev) => [...prev, tempOpt]);

    void createLabourDescription({ name: trimmed })
      .then((res) => {
        if (res.success && res.data) {
          const saved = { id: res.data.id, name: res.data.name };
          // Swap the temp option for the persisted record.
          setLabourOptions((prev) =>
            prev.map((o) => (o.id === tempOpt.id ? saved : o)),
          );
          // Repoint any labour line that selected the temp option at the real id.
          setJobs((prev) =>
            prev.map((job) => ({
              ...job,
              labourLines: (job.labourLines ?? []).map((l) =>
                l.presetLabel === tempOpt.id ? { ...l, presetLabel: saved.id } : l,
              ),
            })),
          );
        }
      })
      .catch(() => {
        /* keep the local option — value is still saved on the job card */
      });

    return tempOpt;
  };

  const removeLabourLine = (jobId: number, lineId: string) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? {
              ...job,
              labourLines: (job.labourLines ?? []).filter((l) => l.id !== lineId),
            }
          : job,
      ),
    );
  };

  const calculateLineTotal = (job: Job) => {
    // Paid Service: sum manually added paid parts
    if (job.serviceType === "Repair") {
      return (job.paidParts ?? []).reduce(
        (sum, p) => sum + p.unitPrice * p.quantity,
        0,
      );
    }
    // Category-based auto-populated parts
    if (job.autoParts && job.autoParts.length > 0) {
      return job.autoParts.reduce(
        (sum, p) =>
          sum + (Number(p.quantity) || 1) * (Number(p.unitPrice) || 0),
        0,
      );
    }
    return job.partsCost * job.quantity + job.labourCost;
  };

  // Estimate breakdown — mirrors the backend exactly so the preview matches
  // what gets saved. Backend subtotal = Σ(parts-item lineTotals) + Σ(labour
  // lineTotals), where a labour item's lineTotal = 0*qty + amount = amount.
  //   partsTotal  = existing per-job parts/base total (paid / auto / manual)
  //   labourTotal = sum of the Labour-section line amounts
  const partsTotal = jobs.reduce((sum, job) => sum + calculateLineTotal(job), 0);
  const labourTotal = jobs.reduce(
    (sum, job) =>
      sum +
      (job.labourLines ?? []).reduce((s, l) => s + (Number(l.amount) || 0), 0),
    0,
  );
  const subtotal = partsTotal + labourTotal;
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

      // Job Type is mandatory per job whenever job types are configured (skipped
      // only when the lookup is empty, so an unseeded deployment isn't blocked).
      if (jobTypeOptions.length > 0 && !job.jobType) {
        err.jobType = "Job type is required";
        hasError = true;
      }

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

  const saveAndNavigate = async (type: "draft" | "estimate") => {
    if (!vehicleId || savingType) return;
    if (!validateJobs()) return;

    setSavingType(type);
    try {
      // Build one job group per job row — items are nested under their parent job
      const jobsPayload = jobs.map((job) => {
        let items;

        if (
          job.serviceType === "Repair" &&
          job.paidParts &&
          job.paidParts.length > 0
        ) {
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
          items = [
            {
              jobDescription: job.jobDescription,
              partsRequired: job.partsRequired || null,
              partsCost: job.partsCost,
              labourCost: job.labourCost,
              quantity: job.quantity,
              isWarrantyClaim: !!job.isWarrantyClaim,
              warrantyClaimNo: job.warrantyClaimNo || null,
              warrantyOem: job.warrantyOem || null,
            },
          ];
        }

        // Labour lines → items (Phase 2). Reuses the existing job_card_items
        // table + the partsRequired='LABOUR' convention. Blank rows (no
        // description) are skipped so the default empty row isn't persisted.
        const labourItems = (job.labourLines ?? [])
          .filter((l) => l.description.trim())
          .map((l) => ({
            jobDescription: l.description.trim(),
            partsRequired: "LABOUR",
            partsCost: 0,
            labourCost: Number(l.amount) || 0,
            quantity: 1,
            estimatedHours: l.hours ? Number(l.hours) : null,
            notes: l.notes.trim() || null,
          }));

        return {
          serviceType: job.serviceType || null,
          serviceCategory: job.serviceCategory || null,
          jobType: job.jobType || null,
          estimatedHours: job.estimatedHours ? Number(job.estimatedHours) : null,
          items: [...items, ...labourItems],
        };
      });

      // Card-level jobType kept for backward compatibility = first job's type.
      const cardJobType = jobsPayload.find((j) => j.jobType)?.jobType || undefined;

      if (isEditMode) {
        const res = await updateJobCard(editJobCardId, {
          jobs: jobsPayload,
          taxLabel: taxConfig.label,
          taxPercentage: taxConfig.percentage,
          currencyCode: currency,
          // Empty → undefined so an unset selection preserves the existing value.
          jobType: cardJobType,
          // Franchise / Service Dept selection (AI-3). Empty → undefined preserves.
          franchiseServiceDeptId: franchiseServiceDeptId || undefined,
        });
        if (res.success) {
          toast.success("Job card updated successfully");
          navigate(
            `/service-advisor-dashboard/job-card-detail/${editJobCardId}`,
          );
        }
      } else {
        const res = await createJobCard(vehicleId, {
          inspectionId,
          jobs: jobsPayload,
          taxLabel: taxConfig.label,
          taxPercentage: taxConfig.percentage,
          currencyCode: currency,
          // Empty → undefined → backend stores NULL → 'INT' default at RO push.
          jobType: cardJobType,
          // Franchise / Service Dept selection (AI-3). Empty → NULL → '1'/'1'.
          franchiseServiceDeptId: franchiseServiceDeptId || undefined,
        });
        if (res.success && res.data) {
          toast.success("Job card saved as draft");
          navigate(
            `/service-advisor-dashboard/job-card-detail/${res.data.jobCard.id}`,
          );
        }
      }
    } catch (error: any) {
      const msg =
        error?.response?.data?.error?.message || "Failed to save job card";
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
            Warranty clerk — select{" "}
            <span className="font-semibold">Warranty Service</span> as the
            service type. Only warranty job cards can be created with this
            account.
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
                  {vehicleData.customerName || "—"} · {vehicleData.model || "—"}
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
                  <p className="text-[10px] uppercase tracking-wider text-[#999] mb-1">
                    Customer
                  </p>
                  <p className="text-[13px] text-[#333] font-medium">
                    {vehicleData.customerName || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#999] mb-1">
                    Vehicle
                  </p>
                  <p className="text-[13px] text-[#333] font-medium">
                    {vehicleData.model || "—"}
                  </p>
                  <p className="text-[11px] text-[#999]">
                    {vehicleData.registration || ""}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#999] mb-1">
                    Service Type
                  </p>
                  <p className="text-[13px] text-[#333] font-medium">
                    {qcReport?.appointment?.serviceType
                      ? qcReport.appointment.serviceType.replace(/_/g, " ")
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#999] mb-1">
                    Appointment
                  </p>
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
                {qcReport?.appointment?.complaints &&
                qcReport.appointment.complaints.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1">
                    {qcReport.appointment.complaints.map((c, i) => (
                      <li
                        key={i}
                        className="text-[#444] text-[13px] leading-normal"
                      >
                        {c}
                      </li>
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
                <h3 className="text-[14px] font-semibold text-[#333]">
                  QC Inspection Report
                </h3>
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
                    <span
                      className={
                        qcReport.summary.failCount > 0
                          ? "text-red-600 font-semibold"
                          : ""
                      }
                    >
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
                    Completed:{" "}
                    {new Date(qcReport.completedAt).toLocaleDateString()}
                  </p>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="bg-[#fafafa] rounded-lg p-3">
                    <p className="text-[11px] text-[#999] uppercase">
                      Total Items
                    </p>
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
                    <p className="text-[12px] font-semibold text-[#333] mb-2">
                      Failed Items
                    </p>
                    <ul className="space-y-1">
                      {qcReport.failedItems.map((item) => (
                        <li
                          key={item.id}
                          className="text-[12px] text-[#444] flex flex-wrap items-baseline gap-2"
                        >
                          <span className="font-mono text-red-600">
                            {item.itemCode}
                          </span>
                          <span>{item.itemLabel}</span>
                          {item.comment && (
                            <span className="text-[#999] italic">
                              — {item.comment}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {qcReport.finalRemarks && (
                  <div className="mb-4">
                    <p className="text-[12px] font-semibold text-[#333] mb-1">
                      Final Remarks
                    </p>
                    <p className="text-[12px] text-[#666]">
                      {qcReport.finalRemarks}
                    </p>
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
                          {c.comment && (
                            <p className="text-[#444]">{c.comment}</p>
                          )}
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

        {/* Job Type moved to per-job (see each Job row in Job Details below). */}

        {/* Franchise / Service Dept (AI-3) — two dependent dropdowns mirroring
            Evolve's RO screen (Franchise → Service Dept). Optional: when empty
            or unselected the RO push falls back to the existing default. */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 md:p-5">
          <label className="block text-[13px] font-semibold text-[#333] mb-1.5">
            Franchise / Service Dept
          </label>
          {franchiseNames.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select
                value={franchiseLabel}
                onChange={(e) => {
                  setFranchiseLabel(e.target.value);
                  setFranchiseServiceDeptId("");
                }}
                className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2 text-[13px] text-[#333] bg-white focus:outline-none focus:border-[#ff4f31]"
              >
                <option value="">Select franchise…</option>
                {franchiseNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                value={franchiseServiceDeptId}
                onChange={(e) => setFranchiseServiceDeptId(e.target.value)}
                disabled={!franchiseLabel}
                className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2 text-[13px] text-[#333] bg-white focus:outline-none focus:border-[#ff4f31] disabled:bg-[#f5f5f5] disabled:text-[#999]"
              >
                <option value="">
                  {franchiseLabel
                    ? "Select service dept…"
                    : "Select franchise first"}
                </option>
                {serviceDeptOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.serviceDeptLabel}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="w-full border border-dashed border-[#e5e7eb] rounded-lg px-3 py-2 text-[13px] text-[#999] bg-[#fafafa]">
              No Franchises configured.
            </div>
          )}
        </div>

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
          jobTypeOptions={jobTypeOptions.map((jt) => ({ code: jt.code, name: jt.name }))}
          onServiceCategoryChange={handleServiceCategoryChange}
          onAddPaidPart={addPaidPart}
          onRemovePaidPart={removePaidPart}
          onUpdatePaidPart={updatePaidPart}
          onAddLabour={addLabourLine}
          onUpdateLabour={updateLabourLine}
          onRemoveLabour={removeLabourLine}
          labourOptions={labourOptions}
          onCreateLabourOption={addLabourOption}
        />

        {/* Totals Section */}
        <TotalsSummary
          partsTotal={partsTotal}
          labourTotal={labourTotal}
          subtotal={subtotal}
          taxAmount={taxAmount}
          total={total}
        />

        {/* Footer Actions */}
        <JobCardActions
          jobCount={jobs.length}
          total={total}
          onSaveDraft={() => saveAndNavigate("draft")}
          onShareEstimate={() => saveAndNavigate("estimate")}
          savingType={savingType}
        />
      </div>
    </>
  );
};

export default CreateJobCard;
