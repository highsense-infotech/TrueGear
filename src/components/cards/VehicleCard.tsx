import { Car } from "lucide-react";


interface VehicleCardProps {
  vehicleNumber: string;
  vehicleName: string;
}

export function VehicleCard({ vehicleNumber, vehicleName }: VehicleCardProps) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-[10px] shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)] p-5 flex items-center gap-3">
      {/* Icon */}
      <div className="bg-[#ff4f31] rounded-full w-12.5 h-12.5 flex items-center justify-center shadow-[2px_4px_8px_0px_rgba(0,0,0,0.15)]">
        <Car className="w-6 h-6 text-white" strokeWidth={1.5} />
      </div>

      {/* Details */}
      <div className="flex flex-col gap-0.75">
        <h3 className="font-semibold text-[16px] text-[#333] leading-[1.2]">
          {vehicleNumber}
        </h3>
        <p className="font-normal text-[12px] text-[#999] leading-[1.2]">
          {vehicleName}
        </p>
      </div>
    </div>
  );
}
