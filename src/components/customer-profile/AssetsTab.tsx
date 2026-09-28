import {
  Truck,
  CarIcon,
  CalendarDays,
  Home,
  Pencil,
  SquareArrowOutUpRight,
} from "lucide-react";
import Button from "../common/Button";
import { StatCard } from "../cards/StatCard";
import { Pagination } from "../common/Pagination";
import type { VehicleListItem } from "../../api/appointment.api";

interface AssetsTabProps {
  vehicles: VehicleListItem[];
  lastService?: string | null;
  nextService?: string | null;
  /**
   * Opens the vehicle editor. Optional so the Edit action only appears where
   * the parent actually wires it — the tab stays usable read-only elsewhere.
   */
  onEditVehicle?: (vehicle: VehicleListItem) => void;
  /**
   * Paging, owned by the parent because it does the fetching. All optional so
   * callers that pass a complete list (no paging) render exactly as before —
   * the controls are hidden unless there is more than one page.
   *
   * `total` is the count across ALL pages, which is what the Total Vehicles
   * card must show: `vehicles.length` is only the current page, so a customer
   * with 23 vehicles read "10".
   */
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (limit: number) => void;
}

export function AssetsTab({
  vehicles,
  lastService,
  nextService,
  onEditVehicle,
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: AssetsTabProps) {
  // Fall back to the list length when the parent does not page.
  const vehicleCount = total ?? vehicles.length;
  const showPager =
    page !== undefined &&
    pageSize !== undefined &&
    onPageChange !== undefined &&
    (totalPages ?? 1) > 1;
  return (
    <div className="bg-white rounded-[10px] border border-[#e5e7eb]">
      <div className="p-3 sm:p-4 md:p-5 lg:p-6">
        <h3 className="text-[13px] sm:text-[14px] md:text-[16px] font-semibold text-[#333] mb-3 sm:mb-4">
          Asset Management
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-7.5">
          <StatCard
            title="Total Vehicles"
            value={vehicleCount > 0 ? String(vehicleCount) : "—"}
            icon={
              <Truck
                className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-[#BFBFBF]"
                strokeWidth={1.5}
              />
            }
          />
          <StatCard
            title="Last Service"
            value={lastService || "—"}
            icon={
              <CalendarDays
                className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-[#BFBFBF]"
                strokeWidth={1.5}
              />
            }
          />
          <StatCard
            title="Next Service"
            value={nextService || "—"}
            icon={
              <Home
                className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-[#BFBFBF]"
                strokeWidth={1.5}
              />
            }
          />
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
          <h3 className="text-[13px] sm:text-[14px] md:text-[16px] font-semibold text-[#333]">
            Owned Vehicles
          </h3>
          <Button variant="outline" className="text-[11px] sm:text-xs md:text-sm self-start sm:self-auto">
            + Add Vehicle
          </Button>
        </div>
        {vehicles.length === 0 ? (
          <p className="text-sm text-[#999] py-6 text-center">No vehicles found for this customer.</p>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shadow-sm"
              >
                <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-linear-to-b from-[#ff4f31] to-[#fe2b73] flex items-center justify-center text-white shadow-md shadow-red-100 shrink-0">
                    <CarIcon
                      size={16}
                      strokeWidth={2}
                      className="sm:w-4.5 sm:h-4.5 md:w-5 md:h-5"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm md:text-base font-semibold text-gray-800">
                        {vehicle.manufacturingYear ? `${vehicle.manufacturingYear} ` : ""}{vehicle.brand} {vehicle.model}
                      </h4>
                    </div>
                    <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 md:mt-1">
                      VIN: {(vehicle.vin || vehicle.registrationNumber || "—").toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Rendered only when a handler is supplied, so a parent that
                      does not support editing is unchanged. */}
                  {onEditVehicle && (
                    <Button
                      variant="outline"
                      onClick={() => onEditVehicle(vehicle)}
                      className="text-[11px] sm:text-xs md:text-sm h-auto py-1 sm:py-1.5 px-2.5 sm:px-3 border-0!"
                    >
                      <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Edit
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="text-[11px] sm:text-xs md:text-sm h-auto py-1 sm:py-1.5 px-2.5 sm:px-3 border-0!"
                  >
                    <SquareArrowOutUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    View History
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paging. Hidden on a single page so short lists look unchanged. */}
        {showPager && (
          <div className="mt-4 border border-[#e5e7eb] rounded-lg px-3 sm:px-5 bg-[#fafafa]">
            <Pagination
              currentPage={page!}
              totalPages={totalPages ?? 1}
              totalItems={vehicleCount}
              itemsPerPage={pageSize!}
              onPageChange={onPageChange!}
              onItemsPerPageChange={onPageSizeChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
