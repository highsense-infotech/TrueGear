import { useState } from "react";
import { Clock } from "lucide-react";
import truck from "../../assets/truck.png";
import Button from "../common/Button";
import { DatePicker } from "../common/DatePicker";
import toast from "react-hot-toast";

type StatusFilter = "All" | "Urgent" | "Delayed" | "Completed";

const statusFilterToApi: Record<StatusFilter, "ALL" | "URGENT" | "DELAYED" | "COMPLETED"> = {
  All: "ALL",
  Urgent: "URGENT",
  Delayed: "DELAYED",
  Completed: "COMPLETED",
};

type DisplayStatus = "Pending" | "Inspection (Draft)" | "Inspection Done" | "Ready for Exit" | "Exited";
type DisplayPriority = "Standard" | "Urgent" | "Express" | "Basic";

interface VehicleOutItem {
  id: string;
  registrationNumber: string;
  brand: string;
  model: string;
  serviceType: string;
  waitingTime: string;
  status: DisplayStatus;
  priority: DisplayPriority;
  frontImage?: string | null;
}

const mockVehicles: VehicleOutItem[] = [
  { id: "v1", registrationNumber: "GP 123 ABC", brand: "FAW", model: "J6 500", serviceType: "Scheduled Service", waitingTime: "45 Mins", status: "Pending", priority: "Standard" },
  { id: "v2", registrationNumber: "GP 456 DEF", brand: "FAW", model: "J5P 350", serviceType: "AMC Service", waitingTime: "60 Mins", status: "Pending", priority: "Urgent" },
  { id: "v3", registrationNumber: "GP 789 GHI", brand: "HINO", model: "500", serviceType: "Warranty Service", waitingTime: "30 Mins", status: "Exited", priority: "Standard" },
  { id: "v4", registrationNumber: "GP 321 JKL", brand: "UD", model: "Quester", serviceType: "Paid Service", waitingTime: "20 Mins", status: "Inspection (Draft)", priority: "Express" },
  { id: "v5", registrationNumber: "GP 654 MNO", brand: "FAW", model: "Tiger V", serviceType: "Scheduled Service", waitingTime: "90 Mins", status: "Inspection Done", priority: "Urgent" },
  { id: "v6", registrationNumber: "GP 987 PQR", brand: "HINO", model: "300", serviceType: "Scheduled Service", waitingTime: "25 Mins", status: "Ready for Exit", priority: "Basic" },
  { id: "v7", registrationNumber: "GP 147 STU", brand: "FAW", model: "J6 500", serviceType: "AMC Service", waitingTime: "35 Mins", status: "Inspection (Draft)", priority: "Standard" },
  { id: "v8", registrationNumber: "GP 258 VWX", brand: "UD", model: "Croner", serviceType: "Warranty Service", waitingTime: "50 Mins", status: "Exited", priority: "Express" },
];

function StatusBadge({ status }: { status: DisplayStatus }) {
  const dotColors: Record<DisplayStatus, string> = {
    "Pending": "bg-[#ff0000]",
    "Inspection (Draft)": "bg-[#F97316]",
    "Inspection Done": "bg-[#0066cc]",
    "Ready for Exit": "bg-[#ff9500]",
    "Exited": "bg-[#00a651]",
  };

  const textColors: Record<DisplayStatus, string> = {
    "Pending": "text-[#ff0000]",
    "Inspection (Draft)": "text-[#F97316]",
    "Inspection Done": "text-[#0066cc]",
    "Ready for Exit": "text-[#ff9500]",
    "Exited": "text-[#00a651]",
  };

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] ${textColors[status]}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${dotColors[status]}`} />
      <span className="text-[14px]">{status}</span>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: DisplayPriority }) {
  const styles: Record<DisplayPriority, string> = {
    Standard: "bg-[#e8f4ff] text-[#0066cc] border-[#b3d9ff]",
    Urgent: "bg-[#FFDEDE66] text-[#ff0000] border-[#FF0000]",
    Express: "bg-[#FFC38B3D] text-[#FF7A00] border-[#FFC38B]",
    Basic: "bg-[#BFBFBF1F] text-[#999999] border-[#CACACA]",
  };

  return (
    <div className={`inline-flex items-center px-3 py-1.5 rounded-[20px] border ${styles[priority]}`}>
      <span className="text-[14px]">{priority}</span>
    </div>
  );
}

interface VehicleOutTableProps {
  filter: "ALL" | "URGENT" | "DELAYED" | "COMPLETED";
  onFilterChange: (filter: "ALL" | "URGENT" | "DELAYED" | "COMPLETED") => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onStartInspection: (vehicleId: string) => void;
  onResumeInspection: (vehicleId: string) => void;
}

export function VehicleOutTable({ filter, onFilterChange, selectedDate, onDateChange, onStartInspection, onResumeInspection }: VehicleOutTableProps) {
  const statusFilter: StatusFilter = filter === "ALL" ? "All" : filter === "URGENT" ? "Urgent" : filter === "COMPLETED" ? "Completed" : "Delayed";
  const [vehicles, setVehicles] = useState(mockVehicles);

  const handleStatusFilterChange = (f: StatusFilter) => {
    onFilterChange(statusFilterToApi[f]);
  };

  const filtered = (() => {
    if (statusFilter === "All") return vehicles;
    if (statusFilter === "Urgent") return vehicles.filter((v) => v.priority === "Urgent");
    if (statusFilter === "Delayed") return vehicles.filter((v) => parseInt(v.waitingTime) > 45);
    if (statusFilter === "Completed") return vehicles.filter((v) => v.status === "Exited");
    return vehicles;
  })();

  const handleStartInspection = (id: string) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: "Inspection (Draft)" as DisplayStatus } : v))
    );
    onStartInspection(id);
  };

  const handleResumeInspection = (id: string) => {
    onResumeInspection(id);
  };

  const handleMarkOut = (id: string) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: "Exited" as DisplayStatus } : v))
    );
    toast.success("Vehicle marked as OUT");
  };

  const isEmpty = filtered.length === 0;

  return (
    <div className="bg-white rounded-xl p-4 md:p-5">
      {/* Header */}
      <div className="mb-4 md:mb-5">
        <h2 className="text-[#333] text-[15px] md:text-[16px] font-semibold">Vehicle Queue</h2>
        <p className="text-[#999] text-[12px]">Vehicles ready for exit</p>
      </div>

      {/* Tabs and Filter */}
      <div className="flex flex-wrap items-center mb-5 gap-3">
        <div className="flex flex-wrap gap-2 bg-[#f5f5f5] p-1.25 rounded-[10px]">
          {(["All", "Urgent", "Delayed", "Completed"] as StatusFilter[]).map((tab) => (
            <Button
              key={tab}
              onClick={() => handleStatusFilterChange(tab)}
              variant="secondary"
              className={`rounded-lg px-4 h-10! py-2 text-sm transition-colors focus:outline-none ${
                statusFilter === tab
                  ? "bg-white border border-[#e5e7eb] shadow-sm text-gray-700! hover:bg-white"
                  : "bg-[#f5f5f5]! text-gray-700! hover:bg-[#e8e8e8]!"
              }`}
            >
              {tab}
            </Button>
          ))}
        </div>
        <DatePicker
          value={selectedDate}
          onChange={onDateChange}
          label="Date"
          className="cursor-pointer"
        />
      </div>

      {/* Empty State */}
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <p className="text-black text-base">No Vehicle Found!</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-225">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <th className="text-left py-3 pr-5 text-[#333] text-[14px] font-normal">Vehicle Details</th>
                  <th className="text-left py-3 px-5 text-[#333] text-[14px] font-normal">Service Type</th>
                  <th className="text-left py-3 px-5 text-[#333] text-[14px] font-normal">Waiting Time</th>
                  <th className="text-left py-3 px-5 text-[#333] text-[14px] font-normal">Status</th>
                  <th className="text-left py-3 px-5 text-[#333] text-[14px] font-normal">Priority</th>
                  <th className="text-left py-3 pl-5 text-[#333] text-[14px] font-normal">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((vehicle) => (
                  <tr key={vehicle.id} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#fafafa]">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-linear-to-b from-[#FFC38B] to-[#FF4F31] overflow-hidden shrink-0">
                          <img src={truck} alt="Vehicle" className="max-w-17.5 object-contain" />
                        </div>
                        <div>
                          <p className="text-[#333] text-[16px] mb-0.5">{vehicle.registrationNumber}</p>
                          <p className="text-[#999] text-[12px]">{vehicle.brand} {vehicle.model}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p className="text-[#333] text-[14px]">{vehicle.serviceType}</p>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-[#999] text-[14px]">
                        <Clock className="w-4 h-4" />
                        <span>{vehicle.waitingTime}</span>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={vehicle.status} />
                    </td>
                    <td>
                      <PriorityBadge priority={vehicle.priority} />
                    </td>
                    <td>
                      {vehicle.status === "Pending" ? (
                        <Button variant="gradient" onClick={() => handleStartInspection(vehicle.id)}>
                          Start Inspection
                        </Button>
                      ) : vehicle.status === "Inspection (Draft)" ? (
                        <Button variant="gradient" onClick={() => handleResumeInspection(vehicle.id)}>
                          Resume Inspection
                        </Button>
                      ) : vehicle.status === "Inspection Done" || vehicle.status === "Ready for Exit" ? (
                        <Button variant="gradient" onClick={() => handleMarkOut(vehicle.id)}>
                          Mark Vehicle OUT
                        </Button>
                      ) : (
                        <span className="text-[#999] text-[13px]">--</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="sm:block md:hidden space-y-3 mt-4">
            {filtered.map((vehicle) => (
              <div key={vehicle.id} className="border rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-linear-to-b from-[#FFC38B] to-[#FF4F31] overflow-hidden shrink-0">
                    <img src={truck} alt="Vehicle" className="max-w-15 object-contain" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#333]">{vehicle.registrationNumber}</p>
                    <p className="text-xs text-[#999]">{vehicle.brand} {vehicle.model}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                  <div>
                    <p className="text-[#999] text-xs">Service Type</p>
                    <p className="text-[#333]">{vehicle.serviceType}</p>
                  </div>
                  <div>
                    <p className="text-[#999] text-xs">Waiting Time</p>
                    <div className="flex items-center gap-1.5 text-[#999]">
                      <Clock className="w-3 h-3" />
                      <span>{vehicle.waitingTime}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[#999] text-xs">Status</p>
                    <StatusBadge status={vehicle.status} />
                  </div>
                  <div>
                    <p className="text-[#999] text-xs">Priority</p>
                    <PriorityBadge priority={vehicle.priority} />
                  </div>
                </div>

                <div className="mt-4">
                  {vehicle.status === "Pending" ? (
                    <Button variant="gradient" onClick={() => handleStartInspection(vehicle.id)}>
                      Start Inspection
                    </Button>
                  ) : vehicle.status === "Inspection (Draft)" ? (
                    <Button variant="gradient" onClick={() => handleResumeInspection(vehicle.id)}>
                      Resume Inspection
                    </Button>
                  ) : vehicle.status === "Inspection Done" || vehicle.status === "Ready for Exit" ? (
                    <Button variant="gradient" onClick={() => handleMarkOut(vehicle.id)}>
                      Mark Vehicle OUT
                    </Button>
                  ) : (
                    <StatusBadge status={vehicle.status} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
