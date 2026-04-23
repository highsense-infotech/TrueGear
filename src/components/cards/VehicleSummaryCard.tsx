import truckImg from "../../assets/truck.png";

interface VehicleSummaryCardProps {
  registration: string;
  model: string;
  customerName: string;
  status?: string;
}

export function VehicleSummaryCard({
  registration,
  model,
  customerName,
  status = "Job Card Draft",
}: VehicleSummaryCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-linear-to-b from-[#FFC38B] to-[#FF4F31] overflow-hidden">
          <img
            src={truckImg}
            alt="Vehicle"
            className="max-w-17.5 object-contain "
          />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-800">
            {registration}
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            {model} - {customerName}
          </p>
        </div>
      </div>
      <div className="bg-[#ffe1b7] text-[#e89d00] px-4 py-1.5 rounded-md text-sm font-semibold border border-white shadow-sm whitespace-nowrap">
        {status}
      </div>
    </div>
  );
}

export type { VehicleSummaryCardProps };
