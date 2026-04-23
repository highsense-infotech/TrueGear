import { Clock, PlusCircle } from "lucide-react";
import truckImg from "../../assets/truck.png";
import Button from "../common/Button";

interface VehicleHeaderProps {
  registration: string;
  model: string;
  customerName: string;
  customerPhone: string;
  status?: string;
}

export function VehicleHeader({
  registration,
  model,
  customerName,
  customerPhone,
  status = "QC Complete",
}: VehicleHeaderProps) {
  return (
    <>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="bg-[#b8ecf0] text-[#0061ff] text-xs font-semibold px-3 py-1.5 rounded-md">
            {status}
          </span>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{registration}</h2>
          <p className="text-sm text-gray-400">{model}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm mb-8">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-linear-to-b from-[#FFC38B] to-[#FF4F31] overflow-hidden shrink-0">
              <img
                src={truckImg}
                alt="Vehicle"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-800">
                {customerName}
              </h3>
              <p className="text-xs text-gray-400">{customerPhone}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <Button
              variant="custom"
              customStyles={{
                background: "white",
                border: "#e5e7eb",
                text: "#1f2937",
                hoverBg: "#f9fafb",
              }}
              icon={<Clock size={16} />}
              className="px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-200 w-full sm:w-auto"
            >
              Call Customer
            </Button>
            <Button
              variant="gradient"
              gradient={{ from: "#ff4f31", to: "#fe2b73", direction: "to-b" }}
              icon={<PlusCircle size={16} />}
              className="px-4 py-2.5 rounded-lg text-sm font-medium shadow-md shadow-red-200 w-full sm:w-auto"
            >
              Create Job Card
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export type { VehicleHeaderProps };

