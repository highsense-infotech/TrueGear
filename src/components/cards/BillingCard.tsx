import { Truck, ChevronRight } from "lucide-react";

interface BillingCardProps {
  vehicleNumber: string;
  vehicleModel: string;
  amount: string;
  jobCount: string;
}

export function BillingCard({
  vehicleNumber,
  vehicleModel,
  amount,
  jobCount,
}: BillingCardProps) {
  return (
    <div className="bg-white rounded-xl border border-[#e5e7eb] p-3 sm:p-4 hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        {/* Left - Vehicle Icon & Info */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center justify-center rounded-full size-10 sm:size-12 bg-[#FFF5F5] border border-[#EBEBEB]">
            <Truck className="size-5 sm:size-6 text-[#FF4F31]" />
          </div>
          <div>
            <h3 className="text-[15px] sm:text-[16px] font-semibold text-[#333] mb-0.5">
              {vehicleNumber}
            </h3>
            <p className="text-[12px] sm:text-[13px] text-[#999]">
              {vehicleModel}
            </p>
          </div>
        </div>

        {/* Right - Amount, Status & Arrow */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Amount & Jobs */}
          <div className="text-right">
            <p className="text-[14px] sm:text-[16px] font-semibold text-[#333] mb-0.5">
              {amount}
            </p>
            <p className="text-[11px] sm:text-[12px] text-[#999]">
              {jobCount}
            </p>
          </div>

          {/* Status Badge */}
          <div className="px-4 sm:px-6 py-1.5 sm:py-2 rounded-[5px] text-[12px] sm:text-[14px] font-medium shadow-[2px_4px_8px_0px_#00000026] bg-[#B3FFBD] text-[#00BF06]">
            <span className="text-[12px] sm:text-[13px] font-semibold whitespace-nowrap">
              Ready
            </span>
          </div>

          {/* Chevron */}
          <ChevronRight className="size-5 sm:size-6 text-[#999] shrink-0" />
        </div>
      </div>
    </div>
  );
}
