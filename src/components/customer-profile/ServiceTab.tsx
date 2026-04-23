import {
  History,
  Calendar,
  TriangleAlert,
  Car,
  BellRing,
  FileText,
} from "lucide-react";

export function ServiceTab() {
  return (
    <>
      <div className="bg-white rounded-[10px] border border-[#e5e7eb] mb-6">
        <div className="p-3 sm:p-4 md:p-5">
          <div className="mb-4 sm:mb-6 md:mb-8">
            <h3 className="text-[13px] sm:text-[14px] md:text-[16px] font-semibold text-[#333] mb-1 sm:mb-1.5">
              Service History
            </h3>
            <p className="text-[#999999] text-[10px] sm:text-[11px] md:text-[12px]">
              Complete service and maintenance records
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6 md:gap-x-8 gap-y-4 sm:gap-y-5 mb-4 sm:mb-6 border-b border-[#E5E7EB] pb-4 sm:pb-6">
            <div>
              <span className="text-[12px] sm:text-[14px] md:text-[16px] font-medium text-[#999] mb-2 sm:mb-3 block">
                Service History
              </span>
              <p className="text-[11px] sm:text-[12px] md:text-[14px] bg-[#F6F6F6] border border-[#E5E7EB] rounded-[5px] px-2.5 sm:px-3 md:px-5 py-2 sm:py-2.5 text-[#333] font-medium">
                47 Service Records
              </p>
            </div>
            <div>
              <span className="text-[12px] sm:text-[14px] md:text-[16px] font-medium text-[#999] mb-2 sm:mb-3 block">
                Last Visit Reason
              </span>
              <p className="text-[11px] sm:text-[12px] md:text-[14px] bg-[#F6F6F6] border border-[#E5E7EB] rounded-[5px] px-2.5 sm:px-3 md:px-5 py-2 sm:py-2.5 text-[#333] font-medium">
                Warranty Claim Engine Diagnostics
              </p>
            </div>
            <div>
              <span className="text-[12px] sm:text-[14px] md:text-[16px] font-medium text-[#999] mb-2 sm:mb-3 block">
                Last Service Advisor
              </span>
              <p className="text-[11px] sm:text-[12px] md:text-[14px] bg-[#F6F6F6] border border-[#E5E7EB] rounded-[5px] px-2.5 sm:px-3 md:px-5 py-2 sm:py-2.5 text-[#333] font-medium">
                Sarah Mitchell
              </p>
            </div>
            <div>
              <span className="text-[12px] sm:text-[14px] md:text-[16px] font-medium text-[#999] mb-2 sm:mb-3 block">
                Visit Advisor
              </span>
              <p className="text-[11px] sm:text-[12px] md:text-[14px] bg-[#F6F6F6] border border-[#E5E7EB] rounded-[5px] px-2.5 sm:px-3 md:px-5 py-2 sm:py-2.5 text-[#333] font-medium">
                Sarah Mitchell
              </p>
            </div>
            <div>
              <span className="text-[12px] sm:text-[14px] md:text-[16px] font-medium text-[#999] mb-2 sm:mb-3 block">
                Preferred Technician
              </span>
              <p className="text-[11px] sm:text-[12px] md:text-[14px] bg-[#F6F6F6] border border-[#E5E7EB] rounded-[5px] px-2.5 sm:px-3 md:px-5 py-2 sm:py-2.5 text-[#333] font-medium">
                David Chen
              </p>
            </div>
            <div></div>
            <div className="col-span-1 sm:col-span-2">
              <span className="text-[12px] sm:text-[14px] md:text-[16px] font-medium text-[#999] flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                <History
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-6 md:h-6 shrink-0"
                  color="#999999"
                />
                Active Job Cards
              </span>
              <div className="flex flex-wrap gap-1.5 sm:gap-2 md:gap-3">
                <p className="text-[11px] sm:text-[12px] md:text-[14px] inline-block bg-[#F6F6F6] border border-[#E5E7EB] rounded-[25px] px-2.5 sm:px-3 md:px-5 py-2 sm:py-2.5 text-[#333] font-medium">
                  JOB-2024-001
                </p>
                <p className="text-[11px] sm:text-[12px] md:text-[14px] inline-block bg-[#F6F6F6] border border-[#E5E7EB] rounded-[25px] px-2.5 sm:px-3 md:px-5 py-2 sm:py-2.5 text-[#333] font-medium">
                  JOB-2024-001
                </p>
              </div>
            </div>
            <div></div>
            <div className="col-span-1 sm:col-span-2">
              <span className="text-[12px] sm:text-[14px] md:text-[16px] font-medium text-[#999] flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                <Calendar
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-6 md:h-6 shrink-0"
                  color="#999999"
                />
                Next Recommended Services
              </span>
              <div className="flex flex-wrap gap-1.5 sm:gap-2 md:gap-3">
                <p className="text-[11px] sm:text-[12px] md:text-[14px] inline-block border border-[#E5E7EB] rounded-[25px] px-2.5 sm:px-3 md:px-5 py-2 sm:py-2.5 text-[#333] font-medium">
                  Oil Change
                </p>
                <p className="text-[11px] sm:text-[12px] md:text-[14px] inline-block border border-[#E5E7EB] rounded-[25px] px-2.5 sm:px-3 md:px-5 py-2 sm:py-2.5 text-[#333] font-medium">
                  Tire Rotation
                </p>
                <p className="text-[11px] sm:text-[12px] md:text-[14px] inline-block border border-[#E5E7EB] rounded-[25px] px-2.5 sm:px-3 md:px-5 py-2 sm:py-2.5 text-[#333] font-medium">
                  Brake Inspection
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-[10px] border border-[#e5e7eb] mb-6">
        <div className="p-3 sm:p-4 md:p-5">
          <div className="mb-4 sm:mb-6 md:mb-8">
            <h3 className="text-[13px] sm:text-[14px] md:text-[16px] font-semibold text-[#333] mb-1 sm:mb-1.5">
              Service Preferences
            </h3>
            <p className="text-[#999999] text-[10px] sm:text-[11px] md:text-[12px]">
              Complete service and maintenance records
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6 md:gap-x-8 gap-y-4 sm:gap-y-5 mb-4 sm:mb-6 border-b border-[#E5E7EB] pb-4 sm:pb-6">
            <div>
              <span className="text-[12px] sm:text-[14px] md:text-[16px] font-medium text-[#999] flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                <TriangleAlert
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-6 md:h-6 shrink-0"
                  color="#999999"
                />
                Priority Level
              </span>
              <div className="flex gap-1.5 sm:gap-2 md:gap-3">
                <p className="text-[11px] sm:text-[12px] md:text-[14px] inline-block border bg-[#FE3066] border-[#E5E7EB] rounded-[25px] px-2.5 sm:px-3 md:px-5 py-2 sm:py-2.5 text-white font-medium">
                  High
                </p>
              </div>
            </div>
            <div>
              <span className="text-[12px] sm:text-[14px] md:text-[16px] font-medium text-[#999] flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                <Car className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-6 md:h-6 shrink-0" color="#999999" />
                Loaner Car Required
              </span>
              <div className="flex gap-1.5 sm:gap-2 md:gap-3">
                <p className="text-[11px] sm:text-[12px] md:text-[14px] inline-block border bg-[#0061FF] border-[#E5E7EB] rounded-[25px] px-2.5 sm:px-3 md:px-5 py-2 sm:py-2.5 text-white font-medium">
                  Yes
                </p>
              </div>
            </div>
            <div>
              <span className="text-[12px] sm:text-[14px] md:text-[16px] font-medium text-[#999] flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                <Car className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-6 md:h-6 shrink-0" color="#999999" />
                Courtesy Vehicle Entitlement
              </span>
              <div className="flex flex-wrap gap-1.5 sm:gap-2 md:gap-3">
                <p className="text-[11px] sm:text-[12px] md:text-[14px] inline-block border bg-[#0061FF] border-[#E5E7EB] rounded-[25px] px-2.5 sm:px-3 md:px-5 py-2 sm:py-2.5 text-white font-medium">
                  Eligible
                </p>
                <p className="text-[11px] sm:text-[12px] md:text-[14px] inline-block border bg-white border-[#E5E7EB] rounded-[25px] px-2.5 sm:px-3 md:px-5 py-2 sm:py-2.5 text-[#333] font-medium">
                  Premium SUV
                </p>
              </div>
            </div>
            <div>
              <span className="text-[12px] sm:text-[14px] md:text-[16px] font-medium text-[#999] flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                <Calendar
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-6 md:h-6 shrink-0"
                  color="#999999"
                />
                Appointment Preference
              </span>
              <p className="text-[11px] sm:text-[12px] md:text-[14px] bg-[#F6F6F6] border border-[#E5E7EB] rounded-[5px] px-2.5 sm:px-3 md:px-5 py-2 sm:py-2.5 text-[#333] font-medium">
                Drop-off (Morning 8-10 AM)
              </p>
            </div>
            <div className="col-span-1 sm:col-span-2">
              <span className="text-[12px] sm:text-[14px] md:text-[16px] font-medium text-[#999] flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                <BellRing
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-6 md:h-6 shrink-0"
                  color="#999999"
                />
                Service Reminder Opt-in
              </span>
              <div className="flex gap-1.5 sm:gap-2 md:gap-3">
                <p className="text-[11px] sm:text-[12px] md:text-[14px] inline-block border bg-[#0061FF] border-[#E5E7EB] rounded-[25px] px-2.5 sm:px-3 md:px-5 py-2 sm:py-2.5 text-white font-medium">
                  Enabled
                </p>
              </div>
            </div>
            <div></div>
            <div className="col-span-1 sm:col-span-2">
              <span className="text-[12px] sm:text-[14px] md:text-[16px] font-medium text-[#999] flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                <FileText
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-6 md:h-6 shrink-0"
                  color="#999999"
                />
                Special Handling Notes
              </span>
              <p className="text-[11px] sm:text-[12px] md:text-[14px] bg-[#F6F6F6] border border-[#E5E7EB] rounded-[5px] px-2.5 sm:px-3 md:px-5 py-2 sm:py-2.5 text-[#333] font-medium">
                Customer requires wheelchair accessible facility. Prefers
                morning appointments
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
