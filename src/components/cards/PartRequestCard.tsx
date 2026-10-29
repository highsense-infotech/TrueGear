interface PartRequestCardProps {
  partName: string;
  partNumber: string;
  vehicleNumber: string;
  vehicleModel: string;
  serviceDescription: string;
  status: "pending" | "available" | "unavailable" | "dispatched" | "accepted" | "rejected";
  requestTime: string;
  onMarkAvailable?: () => void;
  onSetETA?: () => void;
  onDispatch?: () => void;
  showDispatchInfo?: boolean;
  expectedTime?: string;
  loadingAction?: 'markAvailable' | 'eta' | 'dispatch' | null;
  hideVehicleInfo?: boolean;
}

const statusConfig = {
  pending: {
    label: "Pending",
    bgColor: "bg-[#FFE1B7]",
    textColor: "text-[#E89D00]",
  },
  available: {
    label: "Available",
    bgColor: "bg-[#1DB401]",
    textColor: "text-white",
  },
  unavailable: {
    label: "Unavailable",
    bgColor: "bg-[#fe306c]",
    textColor: "text-white",
  },
  dispatched: {
    label: "Dispatched",
    bgColor: "bg-[#0061FF]",
    textColor: "text-white",
  },
  accepted: {
    label: "Accepted",
    bgColor: "bg-[#00C853]",
    textColor: "text-white",
  },
  rejected: {
    label: "Rejected",
    bgColor: "bg-[#ff4f31]",
    textColor: "text-white",
  },
};

export function PartRequestCard({
  partName,
  partNumber,
  vehicleNumber,
  vehicleModel,
  serviceDescription,
  status,
  requestTime,
  onMarkAvailable,
  onSetETA,
  onDispatch,
  showDispatchInfo,
  expectedTime,
  loadingAction = null,
  hideVehicleInfo = false,
}: PartRequestCardProps) {
  const statusStyle = statusConfig[status];

  // ETA-exceeded safety-net signal — the cron flips unavailable→pending
  // every 5 min, but this client-side check renders the red marker the
  // instant the deadline passes (covers the cron gap + cron crashes).
  let etaExceeded = false;
  let etaExceededLabel = "";
  if (status === "unavailable" && expectedTime) {
    const eta = new Date(expectedTime);
    if (!isNaN(eta.getTime()) && eta.getTime() < Date.now()) {
      etaExceeded = true;
      const diffMin = Math.floor((Date.now() - eta.getTime()) / 60000);
      etaExceededLabel = diffMin < 60
        ? `${diffMin}m`
        : diffMin < 1440
          ? `${Math.floor(diffMin / 60)}h ${diffMin % 60}m`
          : `${Math.floor(diffMin / 1440)}d`;
    }
  }

  return (
    <div className={`bg-white rounded-[10px] border p-3.5 sm:p-5 ${etaExceeded ? "border-red-400 border-l-4 border-l-red-500" : "border-[#e5e7eb]"}`}>
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Part Icon */}
        <div className="bg-[#ff4f31] rounded-full size-10 sm:size-12.5 flex items-center justify-center shrink-0">
          <svg className="size-5 sm:size-6" fill="none" viewBox="0 0 24 24">
            <path d="M12 21L19.794 16.5V7.5M12 21L4.206 16.5V7.5M12 21V12M19.794 7.5L12 3L4.206 7.5M19.794 7.5L12 12M4.206 7.5L12 12" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
          </svg>
        </div>

        {/* Part Details */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 gap-2 sm:gap-4">
            <div className="min-w-0">
              <h3 className="text-[14px] sm:text-[16px] font-semibold text-[#333] mb-1 truncate">{partName}</h3>
              <p className="text-[11px] sm:text-[12px] text-[#999] mb-2">{partNumber}</p>
              {etaExceeded && (
                <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full mb-2">
                  ⚠ ETA exceeded · {etaExceededLabel} ago
                </span>
              )}
              {!hideVehicleInfo && (
                <div className="flex items-center gap-2 text-[11px] sm:text-[12px] text-[#666]">
                  <svg className="size-3.5 sm:size-4 shrink-0" fill="none" viewBox="0 0 16 16">
                    <path d="M2 3H14V11C14 11.2652 13.8946 11.5196 13.7071 11.7071C13.5196 11.8946 13.2652 12 13 12H3C2.73478 12 2.48043 11.8946 2.29289 11.7071C2.10536 11.5196 2 11.2652 2 11V3Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"/>
                    <path d="M11 1V5M5 1V5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"/>
                  </svg>
                  <span className="truncate">{vehicleNumber} – {vehicleModel}</span>
                </div>
              )}
              <p className="text-[11px] sm:text-[12px] text-[#999] mt-1 truncate">For: {serviceDescription}</p>
            </div>

            {/* Status & Time */}
            <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-0 sm:text-right shrink-0">
              <div className={`${statusStyle.bgColor} ${statusStyle.textColor} px-3 sm:px-4 py-1.5 sm:py-2 rounded-[5px] text-[12px] sm:text-[14px] font-medium sm:mb-2 shadow-[2px_4px_8px_0px_#00000026]`}>
                {statusStyle.label}
              </div>
              <p className="text-[10px] sm:text-[11px] text-[#999]">Requested: {requestTime}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 justify-between">
            {status === "pending" && onMarkAvailable && (
              <>
                <button
                  onClick={onMarkAvailable}
                  disabled={!!loadingAction}
                  className="bg-white border border-[#e5e7eb] text-[#333] px-3 sm:px-4 py-2 rounded-[5px] text-[12px] sm:text-[14px] font-medium hover:bg-gray-50 transition-colors shadow-[2px_4px_8px_0px_#00000026] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loadingAction === 'markAvailable' && (
                    <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
                  )}
                  {loadingAction === 'markAvailable' ? 'Updating...' : 'Mark as Available'}
                </button>
                {onSetETA && (
                  <button
                    onClick={onSetETA}
                    disabled={!!loadingAction}
                    className="bg-[#E5E7EB] border border-[#e5e7eb] text-[#555] px-3 sm:px-4 py-2 rounded-[5px] text-[12px] sm:text-[14px] font-medium hover:bg-gray-200 transition-colors shadow-[2px_4px_8px_0px_#00000026] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loadingAction === 'eta' && (
                      <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                    )}
                    {loadingAction === 'eta' ? 'Setting...' : 'ETA if available'}
                  </button>
                )}
              </>
            )}

            {(status === "available" || status === "unavailable") && onDispatch && (
              <button
                onClick={onDispatch}
                disabled={!!loadingAction}
                className="bg-[#1DB401] ml-auto text-white px-4 sm:px-6 py-2 rounded-[5px] text-[12px] sm:text-[14px] font-medium hover:bg-[#45a049] transition-colors flex items-center justify-center gap-2 shadow-[2px_4px_8px_0px_#00000026] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {loadingAction === 'dispatch' ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="size-4" fill="none" viewBox="0 0 16 16">
                    <path d="M2.66667 9.33333L9.33333 2.66667L12.6667 6L6 12.6667L2.66667 14L4 10.6667L2.66667 9.33333Z" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"/>
                  </svg>
                )}
                {loadingAction === 'dispatch' ? 'Dispatching...' : 'Dispatch to Bay'}
              </button>
            )}
          </div>

          {/* Special Messages */}
          {(showDispatchInfo || status === "dispatched") && (
            <div className="bg-[#F6F6F6] px-5 py-1.5 mt-2.5 sm:mt-3 flex items-center gap-2 text-[11px] sm:text-[12px] text-[#0061FF] shadow-[2px_4px_8px_0px_#00000026]">
              <svg className="size-3.5 sm:size-4 shrink-0" fill="none" viewBox="0 0 16 16">
                <path d="M13.3333 5.33333L6 12.6667L2.66667 9.33333" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
              </svg>
              <span className="font-medium">Dispatched to service Bay</span>
            </div>
          )}

          {expectedTime && (
            <div className="bg-[#F6F6F6] px-5 py-1.5 mt-2.5 sm:mt-3 flex items-center gap-2 text-[11px] sm:text-[12px] text-[#FE2B73] shadow-[2px_4px_8px_0px_#00000026]">
              <svg className="size-3.5 sm:size-4 shrink-0" fill="none" viewBox="0 0 16 16">
                <path d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"/>
                <path d="M8 4V8L10.6667 9.33333" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"/>
              </svg>
              <span className="font-medium">Expected {expectedTime}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
