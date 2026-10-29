import {
  CreditCard,
  BadgeDollarSign,
  ReceiptText,
  Calendar,
  Landmark,
  Shield,
  FileText,
  Stamp,
  CircleQuestionMark,
} from "lucide-react";

export function FinancialTab() {
  return (
    <>
      <div className="bg-white rounded-[10px] border border-[#e5e7eb] mb-6">
        <div className="p-3 sm:p-4 md:p-5">
          <h3 className="text-[13px] sm:text-[14px] md:text-[16px] font-semibold text-[#333] mb-3 sm:mb-4">
            Financial Information
          </h3>
          <div className="space-y-2 sm:space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 sm:py-3 border-b border-[#f0f0f0] gap-1.5 sm:gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
                <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 shrink-0" />
                <span className="text-[12px] sm:text-[14px] md:text-[16px] text-[#999999]">
                  Preferred Payment Method
                </span>
              </div>
              <span className="text-[12px] sm:text-[14px] md:text-[16px] font-medium text-[#333] ml-5 sm:ml-0">
                Direct Debit (Monthly)
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 sm:py-3 border-b border-[#f0f0f0] gap-1.5 sm:gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
                <BadgeDollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 shrink-0" />
                <span className="text-[12px] sm:text-[14px] md:text-[16px] text-[#999999]">
                  $Total Lifetime Value (LTV)
                </span>
              </div>
              <span className="text-[11px] sm:text-[12px] md:text-[14px] font-medium text-[#00BF06] ml-5 sm:ml-0">
                $47,823.00
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 sm:py-3 border-b border-[#f0f0f0] gap-1.5 sm:gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
                <ReceiptText className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 shrink-0" />
                <span className="text-[12px] sm:text-[14px] md:text-[16px] text-[#999999]">
                  Tax ID/VAT No.
                </span>
              </div>
              <span className="text-[12px] sm:text-[14px] md:text-[16px] font-medium text-[#333] ml-5 sm:ml-0">
                US-VAT-987654321
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 sm:py-3 border-b border-[#f0f0f0] gap-1.5 sm:gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 shrink-0" />
                <span className="text-[12px] sm:text-[14px] md:text-[16px] text-[#999999]">
                  Last Invoice Date
                </span>
              </div>
              <span className="text-[12px] sm:text-[14px] md:text-[16px] font-medium text-[#333] ml-5 sm:ml-0">
                November 1, 2024
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 sm:py-3 border-b border-[#f0f0f0] gap-1.5 sm:gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 shrink-0" />
                <span className="text-[12px] sm:text-[14px] md:text-[16px] text-[#999999]">
                  Last Payment Date
                </span>
              </div>
              <span className="text-[12px] sm:text-[14px] md:text-[16px] font-medium text-[#333] ml-5 sm:ml-0">
                November 5, 2024
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 sm:py-3 gap-1.5 sm:gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
                <Landmark className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 shrink-0" />
                <span className="text-[12px] sm:text-[14px] md:text-[16px] text-[#999999]">
                  Payment Status
                </span>
              </div>
              <p className="text-[11px] sm:text-[12px] md:text-[14px] inline-block border bg-[#00BF061A] border-[#00BF06] rounded-[25px] px-2.5 sm:px-3 md:px-5 py-1.5 md:py-2.5 text-[#00BF06] font-medium ml-5 sm:ml-0 w-fit">
                Up to Date
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-[10px] border border-[#e5e7eb] mb-6">
        <div className="p-3 sm:p-4 md:p-5">
          <div className="mb-4 sm:mb-6 md:mb-8">
            <h3 className="text-[13px] sm:text-[14px] md:text-[16px] font-semibold text-[#333] mb-1 sm:mb-1.5">
              Insurance & Agreements
            </h3>
            <p className="text-[#999999] text-[10px] sm:text-[11px] md:text-[12px]">
              Policy details auto-populated from DMS
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6 md:gap-x-8 gap-y-4 sm:gap-y-5 mb-4 sm:mb-6 border-b border-[#E5E7EB] pb-4 sm:pb-6">
            <div>
              <span className="text-[12px] sm:text-[14px] md:text-[16px] font-medium text-[#999] flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-6 md:h-6 shrink-0" color="#999999" />
                Insurance Provider
              </span>
              <p className="text-[11px] sm:text-[12px] md:text-[14px] bg-[#F6F6F6] border border-[#E5E7EB] rounded-[5px] px-2.5 sm:px-3 md:px-5 py-2 sm:py-2.5 text-[#333] font-medium">
                State Farm Insurance
              </p>
            </div>
            <div>
              <span className="text-[12px] sm:text-[14px] md:text-[16px] font-medium text-[#999] flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                <FileText
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-6 md:h-6 shrink-0"
                  color="#999999"
                />
                Policy Number
              </span>
              <p className="text-[11px] sm:text-[12px] md:text-[14px] bg-[#F6F6F6] border border-[#E5E7EB] rounded-[5px] px-2.5 sm:px-3 md:px-5 py-2 sm:py-2.5 text-[#333] font-medium">
                SF-AUTO-987654321
              </p>
            </div>
            <div>
              <span className="text-[12px] sm:text-[14px] md:text-[16px] font-medium text-[#999] flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                <Calendar
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-6 md:h-6 shrink-0"
                  color="#999999"
                />
                Policy Expiry
              </span>
              <p className="text-[11px] sm:text-[12px] md:text-[14px] bg-[#F6F6F6] border border-[#E5E7EB] rounded-[5px] px-2.5 sm:px-3 md:px-5 py-2 sm:py-2.5 text-[#333] font-medium">
                December 31, 2025
              </p>
            </div>
            <div>
              <span className="text-[12px] sm:text-[14px] md:text-[16px] font-medium text-[#999] flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                <Stamp className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-6 md:h-6 shrink-0" color="#999999" />
                Fleet Agreement ID
              </span>
              <p className="text-[11px] sm:text-[12px] md:text-[14px] bg-[#F6F6F6] border border-[#E5E7EB] rounded-[5px] px-2.5 sm:px-3 md:px-5 py-2 sm:py-2.5 text-[#333] font-medium">
                FLEET-CONTRACT-2024-789
              </p>
            </div>
            <div>
              <span className="text-[12px] sm:text-[14px] md:text-[16px] font-medium text-[#999] flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                <CircleQuestionMark
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-6 md:h-6 shrink-0"
                  color="#999999"
                />
                SLA/Response Time
              </span>
              <p className="text-[11px] sm:text-[12px] md:text-[14px] bg-[#F6F6F6] border border-[#E5E7EB] rounded-[5px] px-2.5 sm:px-3 md:px-5 py-2 sm:py-2.5 text-[#333] font-medium">
                24 hours
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
