import { SuccessIcon } from "../../assets/SuccessIcon";

interface Job {
  id: number;
  title: string;
  description: string;
  details: string;
  price: number;
  selected: boolean;
}

interface ApproveScreenProps {
  selectedJobs: Job[];
  total: number;
  formatAmount?: (n: number) => string;
}

export function ApproveScreen({ selectedJobs, total, formatAmount }: ApproveScreenProps) {
  const fmt = formatAmount ?? ((n: number) => `₹${n.toLocaleString()}`);
  return (
    <div className="bg-white min-h-screen flex items-center justify-center p-4 sm:p-8">
      <div className="flex flex-col items-center max-w-292 w-full">
        {/* Success Icon */}
        <div className="mb-8 sm:mb-12">
          <SuccessIcon />
        </div>

        {/* Heading */}
        <div className="text-center mb-2">
          <h1 className="text-[20px] sm:text-[24px] font-semibold text-[#333]">
            Approval confirmed
          </h1>
        </div>

        {/* Description */}
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-[16px] sm:text-[18px] text-[#999] leading-[1.3]">
            Thank you for approving the service.
          </p>
          <p className="text-[16px] sm:text-[18px] text-[#999] leading-[1.3]">
            Your vehicle service will begin shortly.
          </p>
        </div>

        {/* Jobs Approved Button */}
        <div className="bg-[#1db401] px-6 sm:px-8 py-3 sm:py-3.25 rounded-[10px] shadow-[2px_4px_8px_0px_rgba(0,0,0,0.15)] mb-8 sm:mb-12">
          <p className="text-[14px] sm:text-[16px] font-medium text-white">
            {selectedJobs.length} Jobs Approved
          </p>
        </div>

        {/* Approved Total */}
        <div className="flex items-center justify-between w-full max-w-83.5 mb-8 sm:mb-10">
          <p className="text-[14px] sm:text-[16px] font-medium text-[#333]">
            Approved Total
          </p>
          <p className="text-[14px] sm:text-[16px] font-medium text-[#333]">
            {fmt(total)}
          </p>
        </div>

        {/* SMS Updates Message */}
        <div className="text-center">
          <p className="text-[16px] sm:text-[18px] text-[#999] leading-[1.3]">
            You will receive updates on your service progress via SMS
          </p>
        </div>
      </div>
    </div>
  );
}

