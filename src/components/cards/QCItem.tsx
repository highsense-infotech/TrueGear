import { cn } from "../utils/cn";

type Status = "pass" | "fail" | "warning" | "na";

interface QCItemProps {
  label: string;
  subLabel?: string;
  status: Status;
  statusText?: string;
}

export function QCItem({ label, subLabel, status, statusText }: QCItemProps) {
  const getStatusColor = (s: Status) => {
    switch (s) {
      case "pass":
        return "bg-[#B3FFBD] text-[#347308] border-[#fff]";
      case "fail":
        return "bg-[#FFC7C7] text-[#D40920] border-[#fff]";
      case "warning":
        return "bg-[#FFE1B7] text-[#E89D00] border-[#fff]";
      case "na":
        return "bg-gray-100 text-gray-500 border-[#fff]";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const getStatusLabel = (s: Status) => {
    if (statusText) return statusText;
    switch (s) {
      case "pass":
        return "Pass";
      case "fail":
        return "Fail";
      case "warning":
        return "Warning";
      case "na":
        return "NA";
      default:
        return "";
    }
  };

  return (
    <div className="bg-[#F6F6F6] rounded-lg p-3 flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {subLabel && <p className="text-xs text-gray-400 mt-0.5">{subLabel}</p>}
      </div>
      <span
        className={cn(
          "text-[10px] font-bold px-2.5 py-1.25 rounded border uppercase tracking-wide",
          getStatusColor(status),
        )}
      >
        {getStatusLabel(status)}
      </span>
    </div>
  );
}

export type { QCItemProps, Status };

