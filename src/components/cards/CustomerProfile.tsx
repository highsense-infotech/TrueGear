import { CircleUser, EllipsisVertical, Mail, Pen, Phone } from "lucide-react";
import Button from "../common/Button";

interface ProfileHeaderProps {
  companyName: string;
  customerId: string;
  accountNumber: string;
  address1: string;
  phone1: string;
  onEditClick?: () => void;
}

export function CustomerProfile({
  companyName,
  customerId,
  accountNumber,
  address1,
  phone1,
  onEditClick,
}: ProfileHeaderProps) {
  return (
    <div className="bg-white rounded-[10px] border border-[#e5e7eb] p-3 sm:p-4 md:p-5">
      <div className="flex flex-col lg:flex-row sm:items-start justify-between gap-3 sm:gap-4">
        {/* Left Side - Company Info */}
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Logo */}
          <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-lg bg-linear-to-b from-[#FFC38B] to-[#FF4F31] overflow-hidden shadow-[0px_2px_4px_0px_#0000001A] flex items-center justify-center shrink-0">
            <CircleUser color="#fff" className="w-5 h-5 sm:w-[22px] sm:h-[22px] md:w-[30px] md:h-[30px]" />
          </div>

          {/* Company Details */}
          <div className="flex flex-col gap-1 sm:gap-1.5 md:gap-2 min-w-0">
            <h2 className="text-[13px] sm:text-[14px] md:text-[16px] font-semibold text-[#333] truncate">
              {companyName}
            </h2>
            <div className="flex flex-wrap items-center gap-x-1.5 sm:gap-x-2 md:gap-x-4 text-[10px] sm:text-[11px] md:text-[12px] text-[#999]">
              <p className="truncate">{customerId}</p>
              <span className="hidden sm:inline">•</span>
              <p className="truncate">{accountNumber}</p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 md:gap-6 text-[10px] sm:text-[11px] md:text-[12px] text-[#999] mt-0.5 sm:mt-1">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Mail size={14} className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" color="#8C8C8C" />
                <p className="truncate max-w-[150px] sm:max-w-[200px] md:max-w-none">{address1}</p>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Phone size={14} className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" color="#8C8C8C" />
                <p className="truncate">{phone1}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 md:gap-3 mt-1.5 sm:mt-2">
              <span className="bg-[#e8f5e9] px-2 sm:px-2.5 md:px-3 py-0.5 sm:py-1 rounded-[4px] text-[10px] sm:text-[11px] md:text-[12px] font-medium text-[#2e7d32] whitespace-nowrap">
                Fleet/Commercial
              </span>
              <span className="bg-[#fff3e0] px-2 sm:px-2.5 md:px-3 py-0.5 sm:py-1 rounded-[4px] text-[10px] sm:text-[11px] md:text-[12px] font-medium text-[#f57c00] whitespace-nowrap">
                Gold Member
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 mt-3 sm:mt-0">
          {/* Right Side - Edit Button */}
        <button
          className="bg-[#FF4F31] flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 md:px-6 py-2 rounded-[10px] text-white hover:bg-[#e64528] transition-colors cursor-pointer whitespace-nowrap text-[11px] sm:text-[12px] md:text-[14px] min-w-[100px] sm:min-w-[110px] md:min-w-auto"
          onClick={onEditClick}
        >
          <Pen color="#fff" className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
          <span className="font-medium">Edit Profile</span>
        </button>
        <Button
          variant="custom"
          className="p-2 md:p-2 h-auto! lg:p-3 hover:bg-gray-100 bg-[#FBFBFB] border border-[#EBEBEB] rounded-md"
        >
          <EllipsisVertical className="w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5" />
        </Button>
        </div>
      </div>
    </div>
  );
}
