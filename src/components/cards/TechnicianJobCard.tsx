interface TechnicianJobCardProps {
  vehicleNumber: string;
  vehicleModel: string;
  bayNumber: string;
  completedTasks: number;
  totalTasks: number;
  status: "pending" | "progress" | "completed";
  statusIcon: React.ReactNode;
}

export function TechnicianJobCard({
  vehicleNumber,
  vehicleModel,
  bayNumber,
  completedTasks,
  totalTasks,
  status,
  statusIcon,
}: TechnicianJobCardProps) {
  const getStatusStyles = () => {
    switch (status) {
      case "pending":
        return {
          bg: "bg-[#FFE1B7]",
          text: "text-[#E89D00]",
        };
      case "progress":
        return {
          bg: "bg-[#e3f2fd]",
          text: "text-[#1976d2]",
        };
      case "completed":
        return {
          bg: "bg-[#e8f5e9]",
          text: "text-[#388e3c]",
        };
    }
  };

  const statusStyles = getStatusStyles();

  return (
    <div className="bg-white rounded-xl border border-[#e5e7eb] p-3 sm:p-4 hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        {/* Left Side - Status Icon & Vehicle Info */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Status Icon */}
          <div className={`flex items-center justify-center rounded-full size-9 sm:size-10 border border-[#EBEBEB]`}>
            {statusIcon}
          </div>

          {/* Vehicle Details */}
          <div>
            <h3 className="text-[15px] sm:text-[16px] font-semibold text-[#333] mb-0.5 sm:mb-1">
              {vehicleNumber}
            </h3>
            <p className="text-[12px] sm:text-[13px] text-[#999]">{vehicleModel}</p>
          </div>
        </div>

        {/* Right Side - Bay & Status */}
        <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 ml-11 sm:ml-0">
          {/* Bay & Tasks */}
          <div className="text-left sm:text-right">
            <p className="text-[13px] sm:text-[14px] font-semibold text-[#333] mb-0.5 sm:mb-1">
              {bayNumber}
            </p>
            <p className="text-[11px] sm:text-[12px] text-[#999]">
              {completedTasks}/{totalTasks} tasks
            </p>
          </div>

          {/* Status Badge */}
          <div className={`px-5 sm:px-10.5 py-1.5 sm:py-2 rounded-[5px] text-[12px] sm:text-[14px] font-medium sm:mb-2 shadow-[2px_4px_8px_0px_#00000026] ${statusStyles.bg} ${statusStyles.text}`}>
            <span className="text-[12px] sm:text-[13px] font-semibold">{status}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
