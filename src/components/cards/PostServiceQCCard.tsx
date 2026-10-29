import { Truck, ChevronRight } from "lucide-react";

interface PostServiceQCCardProps {
  vehicleNumber: string;
  vehicleModel: string;
  technicianName: string;
  completedTime: string;
  status: "pending" | "approved" | "sent_back";
}

export function PostServiceQCCard({
  vehicleNumber,
  vehicleModel,
  technicianName,
  completedTime,
  status,
}: PostServiceQCCardProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "pending":
        return {
          bg: "bg-[#FFE1B7]",
          text: "text-[#E89D00]",
          label: "Pending Review",
        };
      case "approved":
        return {
          bg: "bg-[#e8f5e9]",
          text: "text-[#388e3c]",
          label: "Approved",
        };
      case "sent_back":
        return {
          bg: "bg-[#ffeaea]",
          text: "text-[#FF4F31]",
          label: "Sent Back",
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="bg-white rounded-xl border border-[#e5e7eb] p-3 sm:p-4 hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        {/* Left Side - Vehicle Icon & Info */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Vehicle Icon */}
          <div className="flex items-center justify-center rounded-full size-10 sm:size-12 bg-[#FFF5F5] border border-[#EBEBEB]">
            <Truck className="size-5 sm:size-6 text-[#FF4F31]" />
          </div>

          {/* Vehicle Details */}
          <div>
            <h3 className="text-[15px] sm:text-[16px] font-semibold text-[#333] mb-0.5">
              {vehicleNumber}
            </h3>
            <p className="text-[12px] sm:text-[13px] text-[#999]">
              {vehicleModel}
            </p>
          </div>
        </div>

        {/* Right Side - Technician, Status & Arrow */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Technician & Time */}
          <div className="text-right hidden sm:block">
            <p className="text-[13px] sm:text-[14px] font-semibold text-[#333] mb-0.5">
              {technicianName}
            </p>
            <p className="text-[11px] sm:text-[12px] text-[#999]">
              Completed: {completedTime}
            </p>
          </div>

          {/* Status Badge */}
          <div
            className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-[5px] text-[12px] sm:text-[14px] font-medium shadow-[2px_4px_8px_0px_#00000026] ${statusConfig.bg} ${statusConfig.text}`}
          >
            <span className="text-[12px] sm:text-[13px] font-semibold whitespace-nowrap">
              {statusConfig.label}
            </span>
          </div>

          {/* Chevron Arrow */}
          <ChevronRight className="size-5 sm:size-6 text-[#999] shrink-0" />
        </div>
      </div>

      {/* Technician info on mobile (below main row) */}
      <div className="flex items-center justify-between mt-2 ml-13 sm:hidden">
        <p className="text-[12px] font-medium text-[#333]">
          {technicianName}
        </p>
        <p className="text-[11px] text-[#999]">
          Completed: {completedTime}
        </p>
      </div>
    </div>
  );
}
