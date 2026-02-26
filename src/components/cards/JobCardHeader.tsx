import { BackButton } from "./BackButton";

interface JobCardHeaderProps {
  onBackClick?: () => void;
  label?: string;
  detail?: boolean;
}

export function JobCardHeader({ onBackClick,detail, label = "Back to Service Advisor" }: JobCardHeaderProps) {
  return (
    <div className="flex flex-col gap-3">
      <BackButton onClick={onBackClick} label={label} />
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          {detail ? "Job Card Details" : "Create Job Card"}
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          {detail ? "View job card details" : "Add service and parts for the estimate"}
        </p>
      </div>
    </div>
  );
}

export type { JobCardHeaderProps };

