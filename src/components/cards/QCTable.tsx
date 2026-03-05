import { Clock, SlidersHorizontal } from "lucide-react";
import truck from "../../assets/truck.png";
import Button from '../common/Button';
import { Pagination } from "../common/Pagination";
import type { QCQueueItem, QCPagination } from '../../api/qc.api';

type StatusFilter = "All" | "Urgent" | "Delayed" | "Completed";

const statusFilterToApi: Record<StatusFilter, "ALL" | "URGENT" | "DELAYED" | "COMPLETED"> = {
  All: "ALL",
  Urgent: "URGENT",
  Delayed: "DELAYED",
  Completed: "COMPLETED",
};

type DisplayStatus = 'Inspection (Draft)' | 'Inspection Done' | 'Ready' | 'Pending';
type DisplayPriority = 'Standard' | 'Urgent' | 'Express' | 'Basic';

function mapStatus(apiStatus: string): DisplayStatus {
  switch (apiStatus) {
    case 'Inspection (Draft)': return 'Inspection (Draft)';
    case 'Inspection Done':
    case 'Job Card (Draft)':
    case 'Job Card (Pending Cust. Approval)':
    case 'Job Card (Partial Cust. Approval)':
    case 'Job Card (Full Cust. Approval)':
    case 'In Service':
    case 'Ready for Billing':
    case 'Completed':
      return 'Inspection Done';
    case 'Vehicle IN':
    case 'Entry (Draft)': return 'Ready';
    default: return 'Pending';
  }
}

function mapPriority(apiPriority: string): DisplayPriority {
  switch (apiPriority.toUpperCase()) {
    case 'URGENT': return 'Urgent';
    case 'EXPRESS': return 'Express';
    case 'BASIC': return 'Basic';
    case 'STANDARD':
    default: return 'Standard';
  }
}

function StatusBadge({ status }: { status: DisplayStatus }) {
  const styles = {
    'Inspection (Draft)': ' text-[#0066cc] ',
    'Inspection Done': ' text-[#00a651]',
    'Ready': ' text-[#ff9500] ',
    'Pending': ' text-[#ff0000] ',
  };

  const dotColors = {
    'Inspection (Draft)': 'bg-[#0066cc]',
    'Inspection Done': 'bg-[#00a651]',
    'Ready': 'bg-[#ff9500]',
    'Pending': 'bg-[#ff0000]',
  };

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[20px]  ${styles[status]}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${dotColors[status]}`} />
      <span className="text-[14px]">{status}</span>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: DisplayPriority }) {
  const styles = {
    'Standard': 'bg-[#e8f4ff] text-[#0066cc] border-[#b3d9ff]',
    'Urgent': 'bg-[#FFDEDE66] text-[#ff0000] border-[#FF0000]',
    'Express': 'bg-[#FFC38B3D] text-[#FF7A00] border-[#FFC38B]',
    'Basic': 'bg-[#BFBFBF1F] text-[#999999] border-[#CACACA]',
  };

  return (
    <div className={`inline-flex items-center px-3 py-1.5 rounded-[20px] border ${styles[priority]}`}>
      <span className="text-[14px]">{priority}</span>
    </div>
  );
}

interface QCTableProps {
  queue: QCQueueItem[];
  pagination: QCPagination;
  loading: boolean;
  filter: "ALL" | "URGENT" | "DELAYED" | "COMPLETED";
  onFilterChange: (filter: "ALL" | "URGENT" | "DELAYED" | "COMPLETED") => void;
  onPageChange: (page: number) => void;
  onStartInspection: (vehicle: QCQueueItem) => void;
  onResumeInspection: (vehicle: QCQueueItem) => void;
}

export function QCTable({ queue, pagination, loading, filter, onFilterChange, onPageChange, onStartInspection, onResumeInspection }: QCTableProps) {
  const statusFilter: StatusFilter = filter === "ALL" ? "All" : filter === "URGENT" ? "Urgent" : filter === "COMPLETED" ? "Completed" : "Delayed";

  const handleStatusFilterChange = (f: StatusFilter) => {
    onFilterChange(statusFilterToApi[f]);
  };

  const isEmpty = queue.length === 0;

  return (
    <div className="bg-white rounded-xl p-4 md:p-5">
      {/* Header */}
      <div className="mb-4 md:mb-5">
        <h2 className="text-[#333] text-[15px] md:text-[16px] font-semibold">Vehicle Queue</h2>
        <p className="text-[#999] text-[12px]">Vehicles awaiting quality inspection</p>
      </div>

      {/* Tabs and Filter */}
      <div className="flex flex-wrap items-center mb-5 gap-3">
        <div className="flex flex-wrap gap-2 bg-[#f5f5f5] p-1.25 rounded-[10px]">
          <Button
            onClick={() => handleStatusFilterChange("All")}
            variant="secondary"
            className={`rounded-lg px-4 h-10! py-2 text-sm transition-colors focus:outline-none ${
              statusFilter === "All"
                ? "bg-white border border-[#e5e7eb] shadow-sm text-gray-700! hover:bg-white"
                : "bg-[#f5f5f5]! text-gray-700! hover:bg-[#e8e8e8]!"
          }`}
          >
            All
          </Button>
          <Button
            onClick={() => handleStatusFilterChange("Urgent")}
            variant="secondary"
            className={`rounded-lg px-4 h-10! py-2 text-sm transition-colors focus:outline-none ${
              statusFilter === "Urgent"
                ? "bg-white border border-[#e5e7eb] shadow-sm text-gray-700! hover:bg-white"
                : "bg-[#f5f5f5]! text-gray-700! hover:bg-[#e8e8e8]!"
          }`}
          >
            Urgent
          </Button>
          <Button
            onClick={() => handleStatusFilterChange("Delayed")}
            variant="secondary"
            className={`rounded-lg px-4 h-10! py-2 text-sm transition-colors focus:outline-none ${
              statusFilter === "Delayed"
                ? "bg-white border border-[#e5e7eb] shadow-sm text-gray-700! hover:bg-white"
                : "bg-[#f5f5f5]! text-gray-700! hover:bg-[#e8e8e8]!"
          }`}
          >
            Delayed
          </Button>
          <Button
            onClick={() => handleStatusFilterChange("Completed")}
            variant="secondary"
            className={`rounded-lg px-4 h-10! py-2 text-sm transition-colors focus:outline-none ${
              statusFilter === "Completed"
                ? "bg-white border border-[#e5e7eb] shadow-sm text-gray-700! hover:bg-white"
                : "bg-[#f5f5f5]! text-gray-700! hover:bg-[#e8e8e8]!"
          }`}
          >
            Completed
          </Button>
        </div>
        <Button variant="outline" icon={<SlidersHorizontal className="w-4 h-4" />} className="text-[#333]">
          Filter
        </Button>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <p className="text-[#999] text-base">Loading...</p>
        </div>
      ) : isEmpty ? (
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
                {queue.map((vehicle) => (
                  <tr key={vehicle.vehicleCheckInId} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#fafafa]">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
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
                          <p className="text-[#333] text-[16px] mb-0.5">{vehicle.registrationNumber.toUpperCase()}</p>
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
                      <StatusBadge status={mapStatus(vehicle.status)} />
                    </td>
                    <td>
                      <PriorityBadge priority={mapPriority(vehicle.priority)} />
                    </td>
                    <td>
                      {vehicle.status === 'Vehicle IN' ? (
                        <Button variant="gradient" onClick={() => onStartInspection(vehicle)}>
                          Start Inspection
                        </Button>
                      ) : vehicle.status === 'Inspection (Draft)' && vehicle.inspectionId ? (
                        <Button variant="gradient" onClick={() => onResumeInspection(vehicle)}>
                          Resume Inspection
                        </Button>
                      ) : (
                        ""
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile / Tablet Card Layout */}
          <div className="sm:block md:hidden space-y-3 mt-4">
            {queue.map((vehicle) => (
              <div key={vehicle.vehicleCheckInId} className="border rounded-xl p-3">
                {/* Top Row */}
                <div className="flex items-center gap-3">
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
                    <p className="text-sm font-medium text-[#333]">{vehicle.registrationNumber}</p>
                    <p className="text-xs text-[#999]">{vehicle.brand} {vehicle.model}</p>
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                  <div>
                    <p className="text-[#999] text-xs">Service Type</p>
                    <p className="text-[#333]">{vehicle.serviceType || "—"}</p>
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
                    <StatusBadge status={mapStatus(vehicle.status)} />
                  </div>

                  <div>
                    <p className="text-[#999] text-xs">Priority</p>
                    <PriorityBadge priority={mapPriority(vehicle.priority)} />
                  </div>
                </div>

                {/* Action Button */}
                <div className="mt-4">
                  {vehicle.status === 'Vehicle IN' ? (
                    <Button variant="gradient" onClick={() => onStartInspection(vehicle)}>
                      Start Inspection
                    </Button>
                  ) : vehicle.status === 'Inspection (Draft)' && vehicle.inspectionId ? (
                    <Button variant="gradient" onClick={() => onResumeInspection(vehicle)}>
                      Resume Inspection
                    </Button>
                  ) : (
                    <StatusBadge status={mapStatus(vehicle.status)} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {!isEmpty && !loading && (
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
