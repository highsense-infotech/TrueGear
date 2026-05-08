import React, { useState, useEffect, useCallback, useRef } from "react";
import { Search, Loader2, AlertTriangle, Eye, Trash2, MoreHorizontal, Car } from "lucide-react";
import truck from "../../assets/truck.png";
import { Pagination } from "../../components/common/Pagination";
import { ConfirmDeleteModal } from "../../components/common/ConfirmDeleteModal";
import { listVehicles, hardDeleteVehicle } from "../../api/vehicle.api";
import type { VehicleItem } from "../../api/vehicle.api";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import ROUTES from "../../constants/routes";
import toast from "react-hot-toast";

// ── helpers ───────────────────────────────────────────────────────────────────
const ACTIVE_STATUSES = [
  "Entry (Draft)", "Vehicle IN", "Inspection (Draft)", "Inspection Done",
  "Job Card (Draft)", "Job Card (Pending Parts Approval)", "Job Card (Parts Approval Done)",
  "Job Card (Pending Cust. Approval)", "Job Card (Partial Cust. Approval)",
  "Job Card (Full Cust. Approval)", "In Service", "Ready for Billing",
];

function getBadge(status: string) {
  if (ACTIVE_STATUSES.includes(status)) return { label: "Active",    cls: "bg-[#B3FFBD] text-[#00BF06]" };
  if (status === "Completed")          return { label: "Completed",  cls: "bg-[#dbeafe] text-[#2563eb]" };
  return                                      { label: "Expired",    cls: "bg-[#FFC0D1] text-[#FF4F31]" };
}

function formatEntryTime(iso: string | null) {
  if (!iso) return { time: "—", date: "—" };
  const d = new Date(iso);
  return {
    time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
    date: d.toLocaleDateString("en-GB",  { day: "2-digit", month: "short", year: "2-digit" }).toUpperCase(),
  };
}

// ── component ─────────────────────────────────────────────────────────────────
const Vehicle360Dashboard: React.FC = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const isIndexRoute = location.pathname === ROUTES.VEHICLE_360_DASHBOARD;

  const goToDetail = (id: string) =>
    navigate(ROUTES.VEHICLE_360_DASHBOARD + "/" + id);

  const [vehicles,      setVehicles]      = useState<VehicleItem[]>([]);
  const [pagination,    setPagination]    = useState<{ page: number; limit: number; total: number; totalPages: number }>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading,       setLoading]       = useState(false);
  const [searchInput,   setSearchInput]   = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [selectedDate]  = useState("");
  const [currentPage,   setCurrentPage]   = useState(1);
  const [deleteTarget,  setDeleteTarget]  = useState<VehicleItem | null>(null);
  const [isDeleting,    setIsDeleting]    = useState(false);
  const [deleteError,   setDeleteError]   = useState<string | null>(null);
  const [openMenuId,    setOpenMenuId]    = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | boolean> = {
        page: currentPage, limit: 10, sortOrder: "desc", includeAll: true,
      };
      if (appliedSearch.trim()) params.vin = appliedSearch.trim();
      if (selectedDate) { params.dateFrom = selectedDate; params.dateTo = selectedDate; }
      const res = await listVehicles(params);
      if (res.success) { setVehicles(res.data?.data ?? []); setPagination({ page: res.data?.page ?? 1, limit: res.data?.limit ?? 10, total: res.data?.total ?? 0, totalPages: Math.ceil((res.data?.total ?? 0) / (res.data?.limit ?? 10)) }); }
    } catch {
      toast.error("Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  }, [currentPage, appliedSearch, selectedDate]);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);
  useEffect(() => { setCurrentPage(1); }, [appliedSearch, selectedDate]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const handleSearch = () => setAppliedSearch(searchInput);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true); setDeleteError(null);
    try {
      const res = await hardDeleteVehicle(deleteTarget.id);
      if (res.success) { setDeleteTarget(null); fetchVehicles(); }
      else setDeleteError(res.error?.message || "Failed to delete vehicle");
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete vehicle");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* ── single white card — only on index route ───────────────────────── */}
      {isIndexRoute && <div >

        {/* search section */}
        <div >
          <h2 className="text-[#333] text-[15px] font-semibold mb-0.5">Vehicle Lookup</h2>
          <p className="text-[#999] text-xs mb-4">Enter the vehicle registration number to search</p>
          <div className="bg-white flex gap-3 p-5 md:p-6 rounded-xl border border-[#ebebeb] shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)]">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#bfbfbf]" />
              <input
                type="text"
                placeholder="Search parts, Vehicles, or part numbers..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full pl-10 pr-4 h-11 text-sm border border-[#ebebeb] rounded-xl bg-[#fbfbfb] text-[#333] placeholder-[#bfbfbf] focus:outline-none focus:border-[#ccc]"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-10 h-11 bg-linear-to-r from-[#ff4f31] to-[#fe2b73] text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity cursor-pointer shrink-0"
            >
              Search
            </button>
          </div>
        </div>

        <div className="border-t border-[#f0f0f0]" />

        {/* list section */}
        <div className="mt-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[#333] text-[15px] font-semibold">Vehicle Lookup</h2>
              {!loading && (
                <p className="text-[#999] text-xs mt-0.5">
                  {pagination.total} vehicle{pagination.total !== 1 ? "s" : ""} found
                </p>
              )}
            </div>
          </div>

          {/* loading */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
            </div>
          )}

          {/* empty */}
          {!loading && vehicles.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Car className="w-10 h-10 text-[#bfbfbf]" strokeWidth={1} />
              <p className="text-[#999] text-sm">No vehicles found</p>
            </div>
          )}

          {/* rows */}
          {!loading && vehicles.length > 0 && (
            <div className="space-y-2.5" ref={menuRef}>
              {vehicles.map((v) => {
                const { time, date } = formatEntryTime(v.entryTime);
                const badge      = getBadge(v.status);
                const isExpired  = v.status === "Cancelled";
                const isMenuOpen = openMenuId === v.id;

                return (
                  <div
                    key={v.id}
                    className="flex items-center gap-4 p-3.5 rounded-2xl border border-[#f0f0f0] bg-white hover:border-[#e5e5e5] hover:shadow-sm transition-all"
                  >
                    {/* icon */}
                    <div className="w-11 h-11 rounded-xl bg-[#f0f0f0] overflow-hidden shrink-0 flex items-center justify-center">
                      {v.frontImage
                        ? <img src={v.frontImage} alt="Vehicle" className="w-full h-full object-cover" />
                        : <img src={truck} alt="Vehicle" className="w-8 object-contain opacity-50" />
                      }
                    </div>

                    {/* registration + model */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#222] text-[13px] font-semibold">
                          {(v.registrationNumber || v.vin || "").toUpperCase()}
                        </span>
                        {isExpired && <AlertTriangle className="w-3.5 h-3.5 text-[#f43f5e] shrink-0" />}
                      </div>
                      <p className="text-[#999] text-[11px] mt-0.5 truncate">
                        {v.brand} {v.model}{v.manufacturingYear ? ` · ${v.manufacturingYear}` : ""}
                      </p>
                    </div>

                    {/* odometer */}
                    <div className="hidden sm:block w-24 shrink-0">
                      <p className="text-[#222] text-[13px] font-semibold">
                        {v.odometerLast ? `${v.odometerLast.toLocaleString()} KM` : "N/A"}
                      </p>
                    </div>

                    {/* customer */}
                    <div className="hidden md:block w-28 shrink-0">
                      <p className="text-[#999] text-[12px] truncate">{v.customerName || "—"}</p>
                    </div>

                    {/* entry time */}
                    <div className="hidden lg:block w-20 shrink-0">
                      <p className="text-[#222] text-[12px] font-medium">{time}</p>
                      <p className="text-[#999] text-[11px]">{date}</p>
                    </div>

                    {/* badge */}
                    <div className="shrink-0 w-20 flex justify-center">
                      <span className={`inline-flex items-center px-3.5 py-1 rounded-full text-[11px] font-semibold ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>

                    {/* actions */}
                    <div className="flex items-center gap-2 shrink-0 relative" ref={isMenuOpen ? menuRef : undefined}>
                      <button
                        onClick={() => goToDetail(v.id)}
                        className="p-2 text-[#c0c0c0] hover:text-[#555] hover:bg-[#f5f5f5] rounded-lg transition-colors border border-[#EBEBEB] cursor-pointer"
                      >
                        <Eye size={15} strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={() => { setDeleteError(null); setDeleteTarget(v); }}
                        className="p-2 text-[#c0c0c0] hover:text-[#ef4444] hover:bg-[#f5f5f5] rounded-lg transition-colors border border-[#EBEBEB] cursor-pointer"
                      >
                        <Trash2 size={15} strokeWidth={1.5} />
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(isMenuOpen ? null : v.id)}
                          className="p-2 text-[#c0c0c0] hover:text-[#555] hover:bg-[#f5f5f5] rounded-lg transition-colors border border-[#EBEBEB] cursor-pointer"
                        >
                          <MoreHorizontal size={15} strokeWidth={1.5} />
                        </button>
                        {isMenuOpen && (
                          <div className="absolute right-0 top-9 z-30 bg-white border border-[#ebebeb] rounded-xl shadow-lg py-1 min-w-32.5">
                            <button
                              onClick={() => { goToDetail(v.id); setOpenMenuId(null); }}
                              className="w-full text-left px-4 py-2 text-sm text-[#333] hover:bg-[#f5f5f5]"
                            >
                              View Details
                            </button>
                            <button
                              onClick={() => { setDeleteError(null); setDeleteTarget(v); setOpenMenuId(null); }}
                              className="w-full text-left px-4 py-2 text-sm text-[#ef4444] hover:bg-[#fff0f0]"
                            >
                              Delete Vehicle
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* pagination */}
          {!loading && pagination.totalPages > 1 && (
            <div className="mt-5 pt-4 border-t border-[#f0f0f0]">
              <Pagination
                currentPage={currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.total}
                itemsPerPage={10}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>}

      <Outlet />

      {/* delete modal */}
      <ConfirmDeleteModal
        variant="delete-vehicle"
        isOpen={!!deleteTarget}
        registration={(deleteTarget?.registrationNumber || deleteTarget?.vin || "").toUpperCase()}
        model={deleteTarget ? `${deleteTarget.brand} ${deleteTarget.model}` : ""}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
        isDeleting={isDeleting}
        error={deleteError}
      />
    </>
  );
};

export default Vehicle360Dashboard;
