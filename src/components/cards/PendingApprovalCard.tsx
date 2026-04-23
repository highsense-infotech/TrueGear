import { Truck } from "lucide-react";


interface PendingApprovalCardProps {
  vehicleNumber: string;
  vehicleModel: string;
  customerName: string;
  timeAgo: string;
  status?: string;
  isActive?: boolean;
  onClick?: () => void;
}

export function PendingApprovalCard({ 
  vehicleNumber, 
  vehicleModel, 
  customerName, 
  timeAgo,
  status = "Pending",
  isActive = false,
  onClick
}: PendingApprovalCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-[10px] border border-[#e5e7eb] p-4 sm:p-5 transition-all cursor-pointer hover:shadow-md ${isActive ? 'ring-2 ring-[#ff4f31]' : ''}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
        {/* Vehicle Info */}
        <div className="flex items-center gap-2.5">
          {/* Vehicle Icon */}
          <div className={`${isActive ? 'bg-[#ff4f31]' : 'bg-white'} flex items-center justify-center rounded-full size-12.5 border border-[#ebebeb] shadow-[2px_4px_8px_0px_rgba(0,0,0,0.15)]`}>

            <Truck className={`w-7 h-7 sm:w-8 sm:h-8 ${isActive ? 'text-white' : 'text-[#BFBFBF]'} strokeWidth={1.5} `}/>
          </div>

          {/* Vehicle Details */}
          <div className="flex flex-col gap-1.25">
            <p className="text-[16px] font-semibold text-[#333]">{vehicleNumber}</p>
            <p className="text-[12px] text-[#999]">{vehicleModel}</p>
          </div>
        </div>

        {/* Customer & Status */}
        <div className="flex items-center justify-between sm:gap-8 pl-14 sm:pl-0">
          {/* Customer Info */}
          <div className="flex flex-col gap-1.25 items-start sm:items-center">
            <p className="text-[14px] font-semibold text-[#333]">{customerName}</p>
            <p className="text-[12px] text-[#999]">{timeAgo}</p>
          </div>

          {/* Status Badge */}
          <div className="bg-[#ffe1b7] px-3 sm:px-4 py-1.5 rounded-[5px] shadow-[2px_4px_8px_0px_rgba(0,0,0,0.15)]">
            <p className="text-[14px] sm:text-[16px] font-semibold text-[#e89d00]">{status}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
