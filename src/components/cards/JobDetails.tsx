import { Plus } from "lucide-react";
import Button from "../common/Button";
import { type DropdownOption } from "../common/SearchableDropdown";
import { type Job, type JobErrors, type PaidPart, JobRow } from "./JobRow";
import { type LabourLine } from "./LabourSection";

interface JobDetailsProps {
  jobs: Job[];
  onAddJob: () => void;
  onUpdateJob: (id: number, field: keyof Job, value: string | number | boolean) => void;
  onRemoveJob: (id: number) => void;
  calculateLineTotal: (job: Job) => number;
  jobErrors?: Record<number, JobErrors>;
  serviceTypeOptions?: DropdownOption[];
  jobTypeOptions?: { code: string; name: string }[];
  onServiceCategoryChange?: (
    jobId: number,
    categoryCode: string,
    categoryName: string,
    serviceTypeId: string,
  ) => void;
  onAddPaidPart?: (jobId: number, part: PaidPart) => void;
  onRemovePaidPart?: (jobId: number, partId: string) => void;
  onUpdatePaidPart?: (jobId: number, partId: string, quantity: number) => void;
  onUpdateAutoPartPrice?: (jobId: number, partId: string, unitPrice: string) => void;
  onResetAutoPartPrice?: (jobId: number, partId: string) => void;
  onUpdatePaidPartPrice?: (jobId: number, partId: string, unitPrice: number) => void;
  onResetPaidPartPrice?: (jobId: number, partId: string) => void;
  onAddLabour?: (jobId: number) => void;
  onUpdateLabour?: (
    jobId: number,
    lineId: string,
    field: keyof LabourLine,
    value: string,
  ) => void;
  onRemoveLabour?: (jobId: number, lineId: string) => void;
  labourOptions?: DropdownOption[];
  onCreateLabourOption?: (name: string) => DropdownOption;
}

export function JobDetails({
  jobs,
  onAddJob,
  onUpdateJob,
  onRemoveJob,
  calculateLineTotal,
  jobErrors,
  serviceTypeOptions,
  jobTypeOptions,
  onServiceCategoryChange,
  onAddPaidPart,
  onRemovePaidPart,
  onUpdatePaidPart,
  onUpdateAutoPartPrice,
  onResetAutoPartPrice,
  onUpdatePaidPartPrice,
  onResetPaidPartPrice,
  onAddLabour,
  onUpdateLabour,
  onRemoveLabour,
  labourOptions,
  onCreateLabourOption,
}: JobDetailsProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h3 className="text-base font-semibold text-gray-800">
            Job Details
          </h3>
          <p className="text-xs text-gray-400 mt-1">Add jobs and their costs</p>
        </div>
        <Button
          variant="custom"
          customStyles={{
            background: "white",
            border: "#e5e7eb",
            text: "#1f2937",
            hoverBg: "#f9fafb",
          }}
          onClick={onAddJob}
          icon={<Plus size={16} className="text-gray-800" />}
          className="px-4 md:px-5 py-2 md:py-2.5 rounded-md w-full sm:w-auto justify-center"
        >
          <span className="text-sm md:text-base font-medium text-gray-800">
            Add Row
          </span>
        </Button>
      </div>

      <div className="flex flex-col gap-6 md:gap-8">
        {jobs.map((job, index) => (
          <JobRow
            key={job.id}
            job={job}
            index={index}
            onUpdate={onUpdateJob}
            onRemove={onRemoveJob}
            calculateLineTotal={calculateLineTotal}
            errors={jobErrors?.[job.id]}
            serviceTypeOptions={serviceTypeOptions}
            jobTypeOptions={jobTypeOptions}
            onServiceCategoryChange={onServiceCategoryChange}
            onAddPaidPart={onAddPaidPart}
            onRemovePaidPart={onRemovePaidPart}
            onUpdatePaidPart={onUpdatePaidPart}
            onUpdateAutoPartPrice={onUpdateAutoPartPrice}
            onResetAutoPartPrice={onResetAutoPartPrice}
            onUpdatePaidPartPrice={onUpdatePaidPartPrice}
            onResetPaidPartPrice={onResetPaidPartPrice}
            onAddLabour={onAddLabour}
            onUpdateLabour={onUpdateLabour}
            onRemoveLabour={onRemoveLabour}
            labourOptions={labourOptions}
            onCreateLabourOption={onCreateLabourOption}
            totalJobs={jobs.length}
          />
        ))}
      </div>
    </div>
  );
}

export type { JobDetailsProps };
export type { Job };
