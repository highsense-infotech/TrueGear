import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { JobCardActions } from "../../components/cards/JobCardActions";
import { JobCardHeader } from "../../components/cards/JobCardHeader";
import { JobDetails, type Job } from "../../components/cards/JobDetails";
import { type JobErrors } from "../../components/cards/JobRow";
import { SuggestedJobsChips } from "../../components/cards/SuggestedJobsChips";
import { TotalsSummary } from "../../components/cards/TotalsSummary";
import { VehicleSummaryCard } from "../../components/cards/VehicleSummaryCard";
import {
  getVehicleDetail,
  getSuggestedJobs,
  createJobCard,
  type SASuggestedJob,
} from "../../api/serviceAdvisor.api";
import { useCurrency } from "../../context/CurrencyContext";

const CreateJobCard: React.FC = () => {
  const navigate = useNavigate();
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const { taxConfig } = useCurrency();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [suggestedJobs, setSuggestedJobs] = useState<string[]>([]);
  const [vehicleData, setVehicleData] = useState({
    registration: "",
    model: "",
    customerName: "",
  });
  const [inspectionId, setInspectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [jobErrors, setJobErrors] = useState<Record<number, JobErrors>>({});

  useEffect(() => {
    if (!vehicleId) return;

    const fetchData = async () => {
      try {
        const [vehicleRes, suggestedRes] = await Promise.all([
          getVehicleDetail(vehicleId),
          getSuggestedJobs(vehicleId),
        ]);

        // Set vehicle info
        const v = vehicleRes.data.vehicle;
        const c = vehicleRes.data.customer;
        setVehicleData({
          registration: v.registrationNumber,
          model: `${v.brand} ${v.model}`,
          customerName: c.name || "",
        });

        // Set inspection ID if available
        if (vehicleRes.data.latestInspection?.id) {
          setInspectionId(vehicleRes.data.latestInspection.id);
        }

        // Set suggested jobs from QC failed/NA items
        const suggestions = suggestedRes.data.suggestedJobs;
        setSuggestedJobs(suggestions.map((s: SASuggestedJob) => s.suggestedDescription));

        // Pre-populate jobs from failed QC items
        if (suggestions.length > 0) {
          const prefilledJobs: Job[] = suggestions.map((s: SASuggestedJob, idx: number) => ({
            id: Date.now() + idx,
            jobDescription: s.suggestedDescription,
            partsRequired: "",
            partsCost: 0,
            labourCost: 0,
            quantity: 1,
          }));
          setJobs(prefilledJobs);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast.error("Failed to load job card data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [vehicleId]);

  const addJob = () => {
    const newJob: Job = {
      id: Date.now(),
      jobDescription: "",
      partsRequired: "",
      partsCost: 0,
      labourCost: 0,
      quantity: 1,
    };
    setJobs([...jobs, newJob]);
  };

  const removeJob = (id: number) => {
    setJobs(jobs.filter((job) => job.id !== id));
  };

  const updateJob = (id: number, field: keyof Job, value: string | number) => {
    setJobs(
      jobs.map((job) =>
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

  const addSuggestedJob = (jobName: string) => {
    // Prevent adding the same suggested job twice
    if (jobs.some((j) => j.jobDescription === jobName)) return;

    const newJob: Job = {
      id: Date.now(),
      jobDescription: jobName,
      partsRequired: "",
      partsCost: 0,
      labourCost: 0,
      quantity: 1,
    };
    setJobs([...jobs, newJob]);
  };

  const calculateLineTotal = (job: Job) => {
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

  const handleSaveDraft = async () => {
    if (!vehicleId || saving) return;
    if (!validateJobs()) return;

    setSaving(true);
    try {
      const payload = {
        inspectionId: inspectionId,
        items: jobs.map((job) => ({
          jobDescription: job.jobDescription,
          partsRequired: job.partsRequired || null,
          partsCost: job.partsCost,
          labourCost: job.labourCost,
          quantity: job.quantity,
        })),
        taxLabel: taxConfig.label,
        taxPercentage: taxConfig.percentage,
      };

      const res = await createJobCard(vehicleId, payload);
      if (res.status) {
        toast.success("Job card saved as draft");
        navigate(`../send-estimate/${vehicleId}`);
      }
    } catch (error) {
      console.error("Failed to create job card:", error);
      toast.error("Failed to save job card");
    } finally {
      setSaving(false);
    }
  };

  const handleShareEstimate = async () => {
    if (!vehicleId || saving) return;
    if (!validateJobs()) return;

    setSaving(true);
    try {
      const payload = {
        inspectionId: inspectionId,
        items: jobs.map((job) => ({
          jobDescription: job.jobDescription,
          partsRequired: job.partsRequired || null,
          partsCost: job.partsCost,
          labourCost: job.labourCost,
          quantity: job.quantity,
        })),
        taxLabel: taxConfig.label,
        taxPercentage: taxConfig.percentage,
      };

      const res = await createJobCard(vehicleId, payload);
      if (res.status) {
        toast.success("Job card created successfully");
        navigate(`../send-estimate/${vehicleId}`);
      }
    } catch (error) {
      console.error("Failed to create job card:", error);
      toast.error("Failed to create job card");
    } finally {
      setSaving(false);
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
      <div className="flex flex-col gap-6 md:gap-8 w-full pb-8">
        {/* Header Section */}
        <JobCardHeader onBackClick={handleBackClick} />

        {/* Vehicle Summary Card */}
        <VehicleSummaryCard
          registration={vehicleData.registration}
          model={vehicleData.model}
          customerName={vehicleData.customerName}
        />

        {/* Suggested Jobs Chips */}
        <SuggestedJobsChips
          suggestedJobs={suggestedJobs}
          addedJobs={jobs.map((j) => j.jobDescription)}
          onJobClick={addSuggestedJob}
        />

        {/* Job Rows Section */}
        <JobDetails
          jobs={jobs}
          onAddJob={addJob}
          onUpdateJob={updateJob}
          onRemoveJob={removeJob}
          calculateLineTotal={calculateLineTotal}
          jobErrors={jobErrors}
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
          onSaveDraft={handleSaveDraft}
          onShareEstimate={handleShareEstimate}
        />
      </div>
    </>
  );
};

export default CreateJobCard;
