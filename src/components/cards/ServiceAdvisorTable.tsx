import { Clock, SlidersHorizontal, FileText } from "lucide-react";
import truck from "../../assets/truck.png";
import Button from '../common/Button';
import { Pagination } from "../common/Pagination";
import { useNavigate } from "react-router-dom";
import type { SAVehicle, SAPagination, SAFilterStatus } from "../../api/serviceAdvisor.api";

// Map API filter enum to display label
const FILTER_OPTIONS: { key: SAFilterStatus; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "INSPECTION_DONE", label: "Inspection Done" },
  { key: "JOB_CARD_DRAFT", label: "Job Card Draft" },
  { key: "PENDING_APPROVAL", label: "Pending Approval" },
  { key: "IN_SERVICE", label: "In Service" },
  { key: "READY_FOR_BILLING", label: "Ready for Billing" },
];

const statusConfig: Record<string, { color: string; bg: string }> = {
  "Inspection Done": { color: "text-[#00BF06]", bg: "bg-[#00BF06]" },
  "Job Card (Draft)": { color: "text-[#607D8B]", bg: "bg-[#607D8B]" },
  "Job Card (Pending Cust. Approval)": { color: "text-[#DA5A00]", bg: "bg-[#DA5A00]" },
  "Job Card (Partial Cust. Approval)": { color: "text-[#E91E63]", bg: "bg-[#E91E63]" },
  "Job Card (Full Cust. Approval)": { color: "text-[#4CAF50]", bg: "bg-[#4CAF50]" },
  "In Service": { color: "text-[#0061FF]", bg: "bg-[#0061FF]" },
  "Ready for Billing": { color: "text-[#FE306C]", bg: "bg-[#FE306C]" },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { color: "text-[#999]", bg: "bg-[#999]" };
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${config.bg}`} />
      <span className={config.color}>{status}</span>
    </div>
  );
}

interface ServiceAdvisorTableProps {
  vehicles: SAVehicle[];
  pagination: SAPagination | null;
  filter: SAFilterStatus;
  onFilterChange: (filter: SAFilterStatus) => void;
  onPageChange: (page: number) => void;
}

export function ServiceAdvisorTable({
  vehicles,
  pagination,
  filter,
  onFilterChange,
  onPageChange,
}: ServiceAdvisorTableProps) {
  const navigate = useNavigate();
  const isEmpty = vehicles.length === 0;

  const handleVehicleClick = (vehicleId: string) => {
    navigate(`vehicle/${vehicleId}`);
  };

  return (
    <div className="bg-white rounded-xl p-4 md:p-5">
      {/* Header */}
      <div className="mb-4 md:mb-5">
        <h2 className="text-[#333] text-[15px] md:text-[16px] font-semibold">Service Queue</h2>
        <p className="text-[#999] text-[12px]">Vehicles currently in service</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4 md:mb-5">
        <div className="flex flex-wrap gap-2 bg-[#f5f5f5] p-1.25 rounded-[10px]">
          {FILTER_OPTIONS.map((opt) => (
            <Button
              key={opt.key}
              onClick={() => onFilterChange(opt.key)}
              variant="secondary"
              className={`rounded-lg px-4 h-10! py-2 text-sm transition-colors focus:outline-none ${
                filter === opt.key
                  ? "bg-white border border-[#e5e7eb] shadow-sm text-gray-700! hover:bg-white"
                  : "bg-[#f5f5f5]! text-gray-700! hover:bg-[#e8e8e8]!"
              }`}
            >
              {opt.label}
            </Button>
          ))}
        </div>
        <Button variant="outline" icon={<SlidersHorizontal className="w-4 h-4" />} className="text-[#333]">
          Filter
        </Button>
      </div>

      {/* Empty State or Table */}
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <p className="text-black text-base">No Vehicle Found!</p>
        </div>
      ) : (
        <>
          {/* Desktop / Tablet Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-225">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <th className="text-left py-3 pr-5 text-[#333] text-[14px] font-normal">Vehicle Details</th>
                  <th className="text-left py-3 px-5 text-[#333] text-[14px] font-normal">Service Type</th>
                  <th className="text-left py-3 px-5 text-[#333] text-[14px] font-normal">Waiting Time</th>
                  <th className="text-left py-3 px-5 text-[#333] text-[14px] font-normal">Status</th>
                  <th className="text-left py-3 px-5 text-[#333] text-[14px] font-normal"></th>
                  <th className="text-left py-3 px-5 text-[#333] text-[14px] font-normal">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((vehicle) => (
                  <tr key={vehicle.vehicleId} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#fafafa]">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        {vehicle.frontImage ? (
                          <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                            <img
                              src={vehicle.frontImage}
                              alt="Vehicle"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-linear-to-b from-[#FFC38B] to-[#FF4F31] overflow-hidden shrink-0">
                            <img
                              src={truck}
                              alt="Vehicle"
                              className="max-w-17.5 object-contain"
                            />
                          </div>
                        )}
                        <div>
                          <p
                            className="text-[16px] mb-0.5 text-[#0061FF] cursor-pointer hover:underline"
                            onClick={() => handleVehicleClick(vehicle.vehicleId)}
                          >
                            {vehicle.registrationNumber.toUpperCase()}
                          </p>
                          <p className="text-[#999] text-[12px]">{vehicle.brand} {vehicle.model}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p className="text-[#333] text-[14px]">{vehicle.serviceType || "—"}</p>
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
                    <td className="px-2">
                      {vehicle.status === "Inspection Done" && !vehicle.hasJobCard && (
                        <Button
                          variant="custom"
                          customStyles={{
                            background: "#DEEBFF66",
                            border: "#0061FF",
                            text: "#0061FF",
                            hoverBg: "#DEEBFF99",
                          }}
                          icon={<FileText size={16} />}
                          className="h-8 px-2 text-xs"
                          onClick={() => navigate(`job-card/${vehicle.vehicleId}`)}
                        >
                          Create Job Card
                        </Button>
                      )}
                    </td>
                    <td>
                      <Button variant="gradient" className="h-8 px-2 text-xs">
                        Call Customer
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="sm:block md:hidden space-y-3 mt-4">
            {vehicles.map((vehicle) => (
              <div key={vehicle.vehicleId} className="border rounded-xl p-3">
                {/* Top Row */}
                <div className="flex justify-between items-start">
                  <div className="flex gap-3">
                    {vehicle.frontImage ? (
                      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                        <img
                          src={vehicle.frontImage}
                          alt="Vehicle"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-linear-to-b from-[#FFC38B] to-[#FF4F31] overflow-hidden shrink-0">
                        <img
                          src={truck}
                          alt="Vehicle"
                          className="max-w-15 object-contain"
                        />
                      </div>
                    )}
                    <div>
                      <p
                        className="text-sm font-medium text-[#0061FF] cursor-pointer hover:underline"
                        onClick={() => handleVehicleClick(vehicle.vehicleId)}
                      >
                        {vehicle.registrationNumber}
                      </p>
                      <p className="text-xs text-[#999]">{vehicle.brand} {vehicle.model}</p>
                    </div>
                  </div>

                  <StatusBadge status={vehicle.status} />
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                  <div>
                    <p className="text-[#999] text-xs">Service Type</p>
                    <p className="text-[#333]">{vehicle.serviceType || "—"}</p>
                  </div>

                  <div>
                    <p className="text-[#999] text-xs">Customer</p>
                    <p className="text-[#333]">{vehicle.customerName || "—"}</p>
                  </div>

                  <div>
                    <p className="text-[#999] text-xs">Waiting Time</p>
                    <div className="flex items-center gap-1.5 text-[#999]">
                      <Clock className="w-3 h-3" />
                      <span>{vehicle.waitingTime}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 flex flex-col gap-2">
                  {vehicle.status === "Inspection Done" && !vehicle.hasJobCard && (
                    <Button
                      variant="custom"
                      customStyles={{
                        background: "#DEEBFF66",
                        border: "#0061FF",
                        text: "#0061FF",
                        hoverBg: "#DEEBFF99",
                      }}
                      icon={<FileText size={16} />}
                      className="w-full h-9 text-sm"
                      onClick={() => navigate(`job-card/${vehicle.vehicleId}`)}
                    >
                      Create Job Card
                    </Button>
                  )}
                  <Button variant="gradient" className="w-full">Call Customer</Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {!isEmpty && pagination && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.total}
          itemsPerPage={pagination.limit}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
