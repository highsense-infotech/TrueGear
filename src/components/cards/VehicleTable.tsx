import { Edit2, Trash2, MoreHorizontal, Loader2 } from "lucide-react";
import truck from "../../assets/truck.png";
import { Pagination } from "../common/Pagination";
import Button from "../common/Button";
import { DatePicker } from "../common/DatePicker";
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ROUTES from "../../constants/routes";
import toast from "react-hot-toast";
import {
  listVehicles,
  searchVehicles,
  deleteVehicle,
  vinLookup,
  reEntryVehicle,
  type VehicleItem,
  type VehicleStats,
} from "../../api/vehicle.api";
import { ConfirmDeleteModal } from "../common/ConfirmDeleteModal";
interface DisplayVehicle {
  id: string;
  vehicleId: string;
  registration: string;
  model: string;
  odometer: string;
  brand: string;
  entryTime: string;
  date: string;
  status: string;
  customerName?: string;
  frontImage?: string | null;
  receivingNo?: string | null;
  roStatus?: string | null;
  bayNo?: string | null;
  allocationPriority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | null;
  repairCategory?: string | null;
}

// Statuses where gate keeper may still edit/delete the vehicle entry.
// Once QC inspection starts (or later stages), the record is locked.
const EDITABLE_STATUSES = new Set(["Entry (Draft)", "Vehicle IN"]);
const isEditable = (status: string) => EDITABLE_STATUSES.has(status);

const statusConfig: Record<string, { color: string; bg: string }> = {
  "Entry (Draft)": { color: "text-[#0066FF]", bg: "bg-[#0066FF]" },
  "Vehicle IN": { color: "text-[#FF8800]", bg: "bg-[#FF8800]" },
  "Inspection (Draft)": { color: "text-[#9C27B0]", bg: "bg-[#9C27B0]" },
  "Inspection Done": { color: "text-[#00BF06]", bg: "bg-[#00BF06]" },
  "Job Card (Draft)": { color: "text-[#607D8B]", bg: "bg-[#607D8B]" },
  "Job Card (Pending Cust. Approval)": { color: "text-[#DA5A00]", bg: "bg-[#DA5A00]" },
  "Job Card (Partial Cust. Approval)": { color: "text-[#E91E63]", bg: "bg-[#E91E63]" },
  "Job Card (Full Cust. Approval)": { color: "text-[#4CAF50]", bg: "bg-[#4CAF50]" },
  "In Service": { color: "text-[#0061FF]", bg: "bg-[#0061FF]" },
  "Ready for Billing": { color: "text-[#FE306C]", bg: "bg-[#FE306C]" },
  "Completed": { color: "text-[#00C853]", bg: "bg-[#00C853]" },
};

type StatusFilter = "All" | "Inside" | "Pending Exit";

interface VehicleTableProps {
  searchQuery?: string;
  onStatsLoaded?: (stats: VehicleStats) => void;
  includeAll?: boolean;
  readOnly?: boolean;
  /** Increment this value from a parent to open the "Add New Vehicle" input. */
  addVehicleSignal?: number;
}

function formatEntryTime(isoString: string | null | undefined): { time: string; date: string } {
  if (!isoString) return { time: "-", date: "-" };
  const d = new Date(isoString);
  const time = d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const date = d
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    })
    .toUpperCase();
  return { time, date };
}

function mapVehicleItem(v: VehicleItem): DisplayVehicle {
  const { time, date } = formatEntryTime(v.entryTime);
  return {
    id: v.id,
    vehicleId: v.vehicleId ?? v.id,
    registration: (v.registrationNumber || v.vin || "").toUpperCase(),
    model: `${v.brand} ${v.model}`,
    odometer: v.odometerLast ? `${v.odometerLast.toLocaleString()} KM` : "N/A",
    brand: v.brand,
    entryTime: time,
    date,
    status: v.status,
    customerName: v.customerName,
    frontImage: v.frontImage || null,
    receivingNo: v.receivingNo ?? null,
    roStatus: v.roStatus ?? null,
    bayNo: v.bayNo ?? null,
    allocationPriority: v.allocationPriority ?? null,
    repairCategory: v.repairCategory ?? null,
  };
}

// Maps canonical RO status (15-state flow) to a friendly label.
const RO_STATUS_LABEL: Record<string, string> = {
  ARRIVED: "Arrived",
  QC_CHECK_IN: "QC Check-In",
  IN_WORKSHOP: "In Workshop",
  DIAGNOSING: "Diagnosing",
  AWAITING_APPROVAL: "Awaiting Approval",
  APPROVED: "Approved",
  WAITING_FOR_PARTS: "Waiting for Parts",
  REPAIRS_STARTED: "Repairs Started",
  QC_OUT: "QC Out",
  QC_FAILED: "QC Failed",
  QC_PASSED: "QC Passed",
  WASHBAY: "Washbay",
  READY_FOR_RELEASE: "Ready for Release",
  RELEASED: "Released",
  CLOSED: "Closed",
};


export function VehicleTable({ searchQuery = "", onStatsLoaded: _onStatsLoaded, includeAll = false, readOnly = false, addVehicleSignal }: VehicleTableProps) {
  const [vehicles, setVehicles] = useState<DisplayVehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  // Use local date (en-CA gives YYYY-MM-DD), not UTC, so the picker matches what
  // the user calls "today" regardless of timezone.
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toLocaleDateString("en-CA"),
  );
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const navigate = useNavigate();
  const [showVehicleInput, setShowVehicleInput] = useState(false);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);

  // When a parent increments addVehicleSignal, open the Add New Vehicle input.
  // Skip the first render so mounting with the initial value doesn't auto-open it.
  const didMountAddSignal = useRef(false);
  useEffect(() => {
    if (!didMountAddSignal.current) {
      didMountAddSignal.current = true;
      return;
    }
    if (addVehicleSignal === undefined) return;
    setShowVehicleInput(true);
    setVehicleNumber("");
  }, [addVehicleSignal]);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {
        page: currentPage,
        limit: itemsPerPage,
        sortOrder: "desc",
      };

      if (searchQuery.trim()) {
        params.vin = searchQuery.trim();
      }

      // Status filter mapping
      if (statusFilter === "Pending Exit") {
        params.filter = "PENDING_EXIT";
      } else if (statusFilter === "Inside") {
        params.filter = "INSIDE";
      }

      // Date filter — skip when searching by VIN
      if (selectedDate && !searchQuery.trim()) {
        params.dateFrom = selectedDate;
        params.dateTo = selectedDate;
      }

      if (includeAll) params.includeAll = "true";

      const res = await listVehicles(params);
      if (res.success) {
        setVehicles((res.data?.data ?? []).map(mapVehicleItem));
        setTotalPages(res.data?.pagination?.totalPages ?? 1);
        setTotalItems(res.data?.pagination?.total ?? 0);
      } else {
        setVehicles([]);
        setTotalPages(1);
        setTotalItems(0);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch vehicles";
      setError(message);
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, selectedDate, searchQuery, itemsPerPage]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, selectedDate]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleStatusFilterChange = (filter: StatusFilter) => {
    setStatusFilter(filter);
  };
  const handleAddVehicle = () => {
    setShowVehicleInput(true);
  };

  const handleVinSubmit = async () => {
    const vin = vehicleNumber.trim();
    if (!vin) return;

    setIsLookingUp(true);
    try {
      const res = await vinLookup(vin);
      const hasData = res.data?.found && res.data && (
        Object.keys(res.data.CustomerDetail).length > 0 || Object.keys(res.data.Vehicles).length > 0
      );
      if (hasData) {
        // Step 1: Found in third-party — pre-fill from external data
        sessionStorage.setItem("vinLookupData", JSON.stringify(res.data));
        toast.success("Vehicle data found! Pre-filling details...");
        navigate(`${ROUTES.ADD_CUSTOMER}?vinLookup=true`);
        return;
      }

      // Step 2: Not in third-party — search local DB
      const localRes = await searchVehicles(vin);
      if (localRes.success && (localRes.data ?? []).length > 0) {
        const found = (localRes.data ?? [])[0];

        // Block re-entry if the vehicle is already inside the workshop with
        // an active check-in. The guard must complete or cancel that entry
        // before re-checking the same vehicle in.
        if (found.activeCheckIn) {
          toast.error(
            `${found.registrationNumber || found.vin} is already inside the workshop`,
            { duration: 6000 },
          );
          return;
        }

        // Block re-entry while the technician hasn't finished the previous
        // visit's work. Surfaces the BE workshop guard in the UI before the
        // user even tries the re-entry call.
        if (found.inWorkshop) {
          toast.error(
            `${found.registrationNumber || found.vin} is in workshop — ${found.pendingJobItems} job${found.pendingJobItems === 1 ? "" : "s"} pending. Wait for the technician to finish.`,
            { duration: 6000 },
          );
          return;
        }

        const reEntryRes = await reEntryVehicle(found.id);
        if (!reEntryRes.success) {
          // Backend refused — show the message (e.g. workshop guard).
          toast.error(reEntryRes.error?.message ?? "Re-entry not allowed", { duration: 6000 });
          return;
        }
        const newVehicleId = reEntryRes.data?.id ?? found.id;
        toast.success("Vehicle found! New entry created for this visit.");
        navigate(`${ROUTES.ADD_VEHICLE}?vehicleId=${newVehicleId}&reentry=true`);
        return;
      }

      // Step 3: Not found anywhere — manual Add New Vehicle flow
      navigate(`${ROUTES.ADD_CUSTOMER}?vehicleNumber=${encodeURIComponent(vin)}`);
    } catch (err: unknown) {
      // Surface workshop-guard 409 with its message; otherwise fall back to manual.
      const msg = err && typeof err === "object" && "response" in err
        ? ((err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ?? "")
        : "";
      if (msg.toLowerCase().includes("workshop")) {
        toast.error(msg, { duration: 6000 });
      } else {
        navigate(`${ROUTES.ADD_CUSTOMER}?vehicleNumber=${encodeURIComponent(vin)}`);
      }
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleEditVehicle = (vehicle: DisplayVehicle) => {
    navigate(`${ROUTES.ADD_VEHICLE}?vehicleId=${vehicle.vehicleId}`);
  };

  const [deleteTarget, setDeleteTarget] = useState<DisplayVehicle | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteVehicle = (vehicle: DisplayVehicle) => {
    setDeleteError(null);
    setDeleteTarget(vehicle);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await deleteVehicle(deleteTarget.vehicleId);
      if (res.success) {
        setDeleteTarget(null);
        fetchVehicles();
      } else {
        setDeleteError(res.error?.message || "Failed to delete vehicle");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete vehicle";
      setDeleteError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const isEmpty = vehicles.length === 0 && !loading;
  return (
    <div className="bg-white rounded-xl p-4 md:p-5">
      {/* Header */}
      <div className="mb-4 md:mb-5">
        <h2 className="text-[#333] text-[15px] md:text-[16px] font-semibold">
          Vehicle Lookup
        </h2>
        <p className="text-[#999] text-[12px]">
          Enter the vehicle registration number to search
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
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
            onClick={() => handleStatusFilterChange("Inside")}
            variant="secondary"
            className={`rounded-lg px-4 h-10! py-2 text-sm transition-colors focus:outline-none ${
              statusFilter === "Inside"
                ? "bg-white border border-[#e5e7eb] shadow-sm text-gray-700! hover:bg-white"
                : "bg-[#f5f5f5]! text-gray-700! hover:bg-[#e8e8e8]!"
            }`}
          >
            Inside
          </Button>
          <Button
            onClick={() => handleStatusFilterChange("Pending Exit")}
            variant="secondary"
            className={`rounded-lg px-4 h-10! py-2 text-sm transition-colors focus:outline-none ${
              statusFilter === "Pending Exit"
                ? "bg-white border border-[#e5e7eb] shadow-sm text-gray-700! hover:bg-white"
                : "bg-[#f5f5f5]! text-gray-700! hover:bg-[#e8e8e8]!"
            }`}
          >
            Pending Exit
          </Button>
        </div>
        <DatePicker
          value={selectedDate}
          onChange={setSelectedDate}
          label="Date"
          className="cursor-pointer"
        />
      </div>
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <p className="text-red-500 text-sm">{error}</p>
          <Button variant="secondary" onClick={fetchVehicles}>
            Retry
          </Button>
        </div>
      )}

      {/* Empty State */}
      {isEmpty && !error && !showVehicleInput && (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <p className="text-black text-base">No Vehicle Found!</p>
          {!readOnly && (
            <Button variant="secondary" onClick={handleAddVehicle}>
              + Add New Vehicle
            </Button>
          )}
        </div>
      )}

      {/* Vehicle Number Input */}
      {showVehicleInput && (
        <div className="mt-4">
          <div className="border-l-4 border-[#333] pl-3 mb-4">
            <h3 className="text-[#333] text-[15px] font-semibold">Vehicle Details</h3>
          </div>
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <p className="text-[#333] text-base font-semibold">Enter the vehicle number</p>
            <input
              type="text"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              placeholder="Vehicle number"
              disabled={isLookingUp}
              className="w-full max-w-sm border border-[#e5e7eb] rounded-lg px-4 py-3 text-sm text-[#333] placeholder-[#999] focus:outline-none focus:border-[#999] transition-colors"
              onKeyDown={(e) => {
                if (e.key === "Enter" && vehicleNumber.trim()) {
                  handleVinSubmit();
                }
              }}
            />
            <Button
              variant="gradient"
              onClick={handleVinSubmit}
              disabled={!vehicleNumber.trim() || isLookingUp}
            >
              {isLookingUp ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Looking up...
                </span>
              ) : (
                "Search & Continue"
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Table Content */}
      {!loading && !error && vehicles.length > 0 && (
        <>
          {/* ===== Desktop Table ===== */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-175">
              <thead>
                <tr className="border-b border-[#e5e7eb] text-sm text-[#666]">
                  <th className="text-left py-3">Vehicle Details</th>
                  <th className="text-left py-3">Odometer</th>
                  <th className="text-left py-3">Customer</th>
                  <th className="text-left py-3">Entry Time</th>
                  <th className="text-left py-3">Status</th>
                  <th className="text-left py-3">Actions</th>
                </tr>
              </thead>

              <tbody>
                {vehicles.map((vehicle) => (
                  <tr
                    key={vehicle.id}
                    className="border-b border-[#E5E7EB] hover:bg-gray-50 text-sm"
                  >
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
                          <p className="text-[#333]">{vehicle.registration.toUpperCase()}</p>
                          <p className="text-[#999] text-xs">{vehicle.model}</p>
                          {vehicle.receivingNo && (
                            <p className="text-[#ff4f31] text-[10px] font-semibold tracking-wide mt-0.5">
                              {vehicle.receivingNo}
                              {vehicle.roStatus && (
                                <span className="ml-1.5 text-[#555] font-normal">
                                  · {RO_STATUS_LABEL[vehicle.roStatus] ?? vehicle.roStatus}
                                </span>
                              )}
                            </p>
                          )}
                          {vehicle.bayNo && (
                            <p className="text-[10px] mt-0.5 flex items-center gap-1 flex-wrap">
                              <span className="bg-blue-50 border border-blue-200 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                                {vehicle.bayNo}
                              </span>
                              {vehicle.allocationPriority && (
                                <span className="text-[#666]">· {vehicle.allocationPriority}</span>
                              )}
                              {vehicle.repairCategory && (
                                <span className="text-[#666]">· {vehicle.repairCategory}</span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>{vehicle.odometer}</td>
                    <td>{vehicle.customerName || "-"}</td>

                    <td>
                      <p>{vehicle.entryTime}</p>
                      <p className="text-xs text-[#999]">{vehicle.date}</p>
                    </td>

                    <td>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div
                          className={`w-2 h-2 rounded-full ${statusConfig[vehicle.status]?.bg || "bg-gray-400"}`}
                        />
                        <span className={statusConfig[vehicle.status]?.color || "text-gray-500"}>
                          {vehicle.status}
                        </span>
                        {vehicle.status === "Entry (Draft)" && (
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#FFF1EC] text-[#FF4F31] border border-[#FFD3C2]"
                            title="This entry is incomplete. Click the pencil to resume, or the trash to discard."
                          >
                            Draft · Resume / Discard
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="flex gap-2">
                        {!readOnly && isEditable(vehicle.status) && (
                          <>
                            <Button
                              variant="custom"
                              className="p-2! h-10! hover:bg-gray-100 bg-[#FBFBFB] border border-[#EBEBEB] rounded-md"
                              onClick={() => handleEditVehicle(vehicle)}
                            >
                              <Edit2 size={16} />
                            </Button>
                            <Button
                              variant="custom"
                              className="p-2! h-10! hover:bg-gray-100 bg-[#FBFBFB] border border-[#EBEBEB] rounded-md"
                              onClick={() => handleDeleteVehicle(vehicle)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="custom"
                          className="p-2! h-10! hover:bg-gray-100 rounded-md"
                        >
                          <MoreHorizontal size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ===== Mobile / Tablet Card Layout ===== */}
          <div className="sm:block md:hidden space-y-3 mt-4">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="border rounded-xl p-3">
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
                      <p className="text-sm font-medium">
                        {vehicle.registration}
                      </p>
                      <p className="text-xs text-[#999]">{vehicle.model}</p>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    {!readOnly && isEditable(vehicle.status) && (
                      <>
                        <button
                          onClick={() => handleEditVehicle(vehicle)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="p-1 hover:bg-gray-100 rounded"
                          onClick={() => handleDeleteVehicle(vehicle)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                    <button className="p-1 hover:bg-gray-100 rounded">
                      <MoreHorizontal size={16} />
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                  <div>
                    <p className="text-[#999] text-xs">Odometer</p>
                    <p>{vehicle.odometer}</p>
                  </div>

                  <div>
                    <p className="text-[#999] text-xs">Customer</p>
                    <p>{vehicle.customerName || "-"}</p>
                  </div>

                  <div>
                    <p className="text-[#999] text-xs">Entry</p>
                    <p>{vehicle.entryTime}</p>
                    <p className="text-xs text-[#999]">{vehicle.date}</p>
                  </div>

                  <div>
                    <p className="text-[#999] text-xs">Status</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div
                        className={`w-2 h-2 rounded-full ${statusConfig[vehicle.status]?.bg || "bg-gray-400"}`}
                      />
                      <span
                        className={`text-sm ${statusConfig[vehicle.status]?.color || "text-gray-500"}`}
                      >
                        {vehicle.status}
                      </span>
                      {vehicle.status === "Entry (Draft)" && (
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#FFF1EC] text-[#FF4F31] border border-[#FFD3C2]"
                          title="This entry is incomplete. Tap edit to resume, or delete to discard."
                        >
                          Draft
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagination - only show for list mode (not search) */}
      {!loading && !error && vehicles.length > 0 && !searchQuery.trim() && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={(limit) => {
            setItemsPerPage(limit);
            setCurrentPage(1);
          }}
        />
      )}
      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        registration={deleteTarget?.registration || ""}
        model={deleteTarget?.model || ""}
        isDeleting={isDeleting}
        error={deleteError}
      />
    </div>
  );
}
