import { BackButton } from "./BackButton";

interface JobCardHeaderProps {
  onBackClick?: () => void;
  label?: string;
  detail?: boolean;
  edit?: boolean;
}

export function JobCardHeader({ onBackClick, detail, edit, label = "Back to Service Advisor" }: JobCardHeaderProps) {
  const title = detail ? "Job Card Details" : edit ? "Edit Job Card" : "Create Job Card";
  const subtitle = detail ? "View job card details" : edit ? "Update service and parts for the estimate" : "Add service and parts for the estimate";

  return (
    <div className="flex flex-col gap-3">
      <BackButton onClick={onBackClick} label={label} />
      <div>
        <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
        <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

export type { JobCardHeaderProps };

