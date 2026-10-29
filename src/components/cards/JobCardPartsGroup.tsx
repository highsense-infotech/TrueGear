import { ChevronDown, ChevronUp } from "lucide-react";
import { PartRequestCard } from "./PartRequestCard.tsx";
import type { PartRequest } from "../../api/partsManager.api.ts";

interface JobCardPartsGroupProps {
  jobCardId: string;
  vehicleNumber: string;
  vehicleModel: string;
  partRequests: PartRequest[];
  isExpanded: boolean;
  onToggle: () => void;
  onMarkAvailable: (partId: string, requestedByTechnician: boolean) => void;
  onSetETA: (partId: string) => void;
  onDispatch: (partId: string) => void;
  actionLoading: Record<string, "markAvailable" | "eta" | "dispatch">;
}

export function JobCardPartsGroup({
  vehicleNumber,
  vehicleModel,
  partRequests,
  isExpanded,
  onToggle,
  onMarkAvailable,
  onSetETA,
  onDispatch,
  actionLoading,
}: JobCardPartsGroupProps) {
  const pendingCount = partRequests.filter(
    (p) => p.status === "pending"
  ).length;
  const availableCount = partRequests.filter(
    (p) => p.status === "available"
  ).length;
  const allDispatched = partRequests.every((p) => p.status === "dispatched");

  const summaryParts: string[] = [];
  if (pendingCount > 0) summaryParts.push(`${pendingCount} pending`);
  if (availableCount > 0) summaryParts.push(`${availableCount} available`);
  const summaryText = `${partRequests.length} part${partRequests.length !== 1 ? "s" : ""}${summaryParts.length > 0 ? ` (${summaryParts.join(", ")})` : ""}`;

  return (
    <div className="bg-white rounded-[10px] border border-[#e5e7eb] overflow-hidden">
      {/* Clickable Header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 sm:gap-4 p-3.5 sm:p-5 cursor-pointer hover:bg-gray-50 transition-colors"
      >
        {/* Vehicle Icon */}
        <div className="bg-[#ff4f31] rounded-full size-10 sm:size-12 flex items-center justify-center shrink-0">
          <svg className="size-5 sm:size-6" fill="none" viewBox="0 0 24 24">
            <path
              d="M5 17H3V15L5.67 8.67C5.86 8.27 6.27 8 6.71 8H17.29C17.73 8 18.14 8.27 18.33 8.67L21 15V17H19M5 17C5 17.5304 5.21071 18.0391 5.58579 18.4142C5.96086 18.7893 6.46957 19 7 19C7.53043 19 8.03914 18.7893 8.41421 18.4142C8.78929 18.0391 9 17.5304 9 17M5 17C5 16.4696 5.21071 15.9609 5.58579 15.5858C5.96086 15.2107 6.46957 15 7 15C7.53043 15 8.03914 15.2107 8.41421 15.5858C8.78929 15.9609 9 16.4696 9 17M19 17C19 17.5304 18.7893 18.0391 18.4142 18.4142C18.0391 18.7893 17.5304 19 17 19C16.4696 19 15.9609 18.7893 15.5858 18.4142C15.2107 18.0391 15 17.5304 15 17M19 17C19 16.4696 18.7893 15.9609 18.4142 15.5858C18.0391 15.2107 17.5304 15 17 15C16.4696 15 15.9609 15.2107 15.5858 15.5858C15.2107 15.9609 15 16.4696 15 17"
              stroke="white"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
          </svg>
        </div>

        {/* Vehicle Info */}
        <div className="flex-1 min-w-0 text-left">
          <h3 className="text-[14px] sm:text-[16px] font-semibold text-[#333] truncate">
            {vehicleNumber}
          </h3>
          <p className="text-[11px] sm:text-[12px] text-[#666] truncate">
            {vehicleModel}
          </p>
        </div>

        {/* Summary + Status */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-[12px] text-[#999]">{summaryText}</p>
            {allDispatched && (
              <span className="text-[11px] text-[#1DB401] font-medium">
                All Dispatched
              </span>
            )}
          </div>
          {pendingCount > 0 && (
            <span className="bg-[#FFE1B7] text-[#E89D00] px-2.5 py-1 rounded-[5px] text-[11px] sm:text-[12px] font-medium">
              {pendingCount} pending
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="size-5 text-[#999]" />
          ) : (
            <ChevronDown className="size-5 text-[#999]" />
          )}
        </div>
      </button>

      {/* Mobile summary (below header, visible on small screens only) */}
      <div className="px-3.5 pb-2 -mt-1 sm:hidden">
        <p className="text-[11px] text-[#999]">{summaryText}</p>
      </div>

      {/* Expanded Body */}
      {isExpanded && (
        <div className="border-t border-[#e5e7eb] px-3 pb-3 sm:px-5 sm:pb-5 pt-3 sm:pt-4 space-y-3">
          {partRequests.map((request) => (
            <PartRequestCard
              key={request.id}
              partName={request.partName}
              partNumber={request.partNumber}
              vehicleNumber={request.vehicleNumber}
              vehicleModel={request.vehicleModel}
              serviceDescription={request.serviceDescription}
              status={request.status}
              requestTime={request.requestTime}
              onMarkAvailable={
                request.status === "pending"
                  ? () => onMarkAvailable(request.id, !!request.requestedByTechnician)
                  : undefined
              }
              onSetETA={
                request.status === "pending"
                  ? () => onSetETA(request.id)
                  : undefined
              }
              onDispatch={
                // ETA is an estimate, not a guarantee — PM can dispatch
                // directly from 'unavailable' once the part physically
                // arrives, without first re-marking it 'available'.
                request.status === "available" || request.status === "unavailable"
                  ? () => onDispatch(request.id)
                  : undefined
              }
              showDispatchInfo={request.showDispatchInfo}
              expectedTime={request.expectedTime ?? undefined}
              loadingAction={actionLoading[request.id] || null}
              hideVehicleInfo
            />
          ))}
        </div>
      )}
    </div>
  );
}
