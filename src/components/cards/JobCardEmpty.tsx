import { FileText } from "lucide-react";
import Button from "../common/Button";

interface JobCardEmptyProps {
  title?: string;
  buttonText?: string;
  onButtonClick?: () => void;
}

export function JobCardEmpty({
  title = "No job card created yet",
  buttonText = "Create Job Card",
  onButtonClick,
}: JobCardEmptyProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl min-h-55 md:h-87.5 flex flex-col items-center justify-center gap-4 md:gap-6 shadow-sm w-full p-4 md:p-0">
      <div className="w-12 h-12 md:w-15 md:h-15 rounded-full bg-[#fbfbfb] border border-[#bfbfbf] flex items-center justify-center">
        <FileText
          size={24}
          className="text-[#cacaca]"
          strokeWidth={1.5}
        />
      </div>

      <p className="text-sm md:text-base font-medium text-[#333]">{title}</p>

      <Button variant="gradient" className="w-full sm:w-auto" onClick={onButtonClick}>
        {buttonText}
      </Button>
    </div>
  );
}

export type { JobCardEmptyProps };

