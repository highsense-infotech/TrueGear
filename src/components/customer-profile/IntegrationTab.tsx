import {
  Database,
  GitFork,
  Rows3,
  History,
  SquareCode,
} from "lucide-react";

export function IntegrationTab() {
  return (
    <div className="bg-white rounded-[10px] border border-[#e5e7eb]">
      <div className="p-3 sm:p-4 md:p-5">
        <h3 className="text-[13px] sm:text-[14px] md:text-[16px] font-semibold text-[#333] mb-3 sm:mb-4">
          Integration
        </h3>
        <div className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 sm:gap-y-0">
            <div className="py-1.5 sm:py-2 md:py-3 flex gap-1.5 sm:gap-2 md:gap-3">
              <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 shrink-0 mt-0.5" />
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] sm:text-[12px] md:text-[16px] font-medium text-[#999999] mb-0.5 sm:mb-1">
                  DMS System
                </span>
                <span className="text-[11px] sm:text-[12px] md:text-[14px] font-medium text-[#333] truncate">
                  CDK Global
                </span>
              </div>
            </div>
            <div className="py-1.5 sm:py-2 md:py-3 flex gap-1.5 sm:gap-2 md:gap-3">
              <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 shrink-0 mt-0.5" />
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] sm:text-[12px] md:text-[16px] font-medium text-[#999999] mb-0.5 sm:mb-1">
                  Sync Status
                </span>
                <p className="text-[11px] sm:text-[12px] md:text-[14px] inline-block border bg-[#00BF061A] border-[#00BF06] rounded-[25px] px-2.5 sm:px-3 md:px-5 py-1 sm:py-1.5 md:py-2.5 text-[#00BF06] font-medium w-fit">
                  Synced
                </p>
              </div>
            </div>
            <div className="py-1.5 sm:py-2 md:py-3 flex gap-1.5 sm:gap-2 md:gap-3">
              <GitFork className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 shrink-0 mt-0.5" />
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] sm:text-[12px] md:text-[16px] font-medium text-[#999999] mb-0.5 sm:mb-1">
                  Branch/Dealer Code
                </span>
                <span className="text-[11px] sm:text-[12px] md:text-[14px] font-medium text-[#333] truncate">
                  SF-MAIN-001
                </span>
              </div>
            </div>
            <div className="py-1.5 sm:py-2 md:py-3 flex gap-1.5 sm:gap-2 md:gap-3">
              <Rows3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 shrink-0 mt-0.5" />
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] sm:text-[12px] md:text-[16px] font-medium text-[#999999] mb-0.5 sm:mb-1">
                  Source of Truth
                </span>
                <p className="w-fit self-start text-[11px] sm:text-[12px] md:text-[14px] bg-[#F6F6F6] rounded-[25px] px-2.5 sm:px-3 md:px-5 py-1 sm:py-1.5 md:py-2.5 text-[#333] font-medium">
                  DMS
                </p>
              </div>
            </div>
            <div className="py-1.5 sm:py-2 md:py-3 flex gap-1.5 sm:gap-2 md:gap-3">
              <History className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 shrink-0 mt-0.5" />
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] sm:text-[12px] md:text-[16px] font-medium text-[#999999] mb-0.5 sm:mb-1">
                  Last Sync Timestamp
                </span>
                <span className="text-[11px] sm:text-[12px] md:text-[14px] font-medium text-[#333] truncate">
                  2024-11-14 09:23:45 UTC
                </span>
              </div>
            </div>
            <div className="py-1.5 sm:py-2 md:py-3 flex gap-1.5 sm:gap-2 md:gap-3">
              <SquareCode className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 shrink-0 mt-0.5" />
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] sm:text-[12px] md:text-[16px] font-medium text-[#999999] mb-0.5 sm:mb-1">
                  Integration Version
                </span>
                <span className="text-[11px] sm:text-[12px] md:text-[14px] font-medium text-[#333]">
                  v2.4.1
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
