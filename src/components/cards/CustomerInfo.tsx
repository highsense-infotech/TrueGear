import { Phone } from "lucide-react";
import truck from "../../assets/truck.png";

interface CustomerInfoProps {
  customerName: string;
  customerPhone: string;
}

export function CustomerInfo({ customerName, customerPhone }: CustomerInfoProps) {
  return (
    <div className="bg-white rounded-[10px] border border-[#e5e7eb] p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
        {/* Customer Details */}
        <div className="flex items-center gap-3">
          {/* Customer Avatar */}
          <div className="w-12 h-12 rounded-lg bg-linear-to-b from-[#FFC38B] to-[#FF4F31] overflow-hidden">
            <img
              src={truck}
              alt="Vehicle"
              className="max-w-17.5 object-contain "
            />
          </div>

          {/* Customer Details */}
          <div className="flex flex-col gap-1.25">
            <p className="text-[16px] font-semibold text-[#333]">
              {customerName}
            </p>
            <p className="text-[12px] text-[#999]">{customerPhone}</p>
          </div>
        </div>

        {/* Call Button */}
        <button className="flex items-center justify-center gap-3 px-2.5 py-3.25 rounded-[10px] border border-[#e5e7eb] hover:bg-[#f9f9f9] transition-colors">
         <Phone size={20} color="#333" />
          <span className="text-[16px] font-medium text-[#333]">Call</span>
        </button>
      </div>
    </div>
  );
}
