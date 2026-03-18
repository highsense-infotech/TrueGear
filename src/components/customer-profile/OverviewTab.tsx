import {
  Lock,
  Pen,
  Mail,
  Globe,
  History,
  FileText,
} from "lucide-react";
import Button from "../common/Button";

interface AddressField {
  label: string;
  value: string;
  icon: React.ReactNode;
}

interface RelationshipField {
  label: string;
  value: string;
  icon: React.ReactNode;
}

interface MarketingConsent {
  email: boolean;
  sms: boolean;
  marketing: boolean;
}

interface OverviewTabProps {
  addressFields: AddressField[];
  relationshipFields: RelationshipField[];
  marketingConsent: MarketingConsent;
  onEditAddresses: () => void;
  onAddNotes: () => void;
  internalNotes?: string | null;
  // Identity fields
  customerId?: string;
  accountNumber?: string;
  fullName?: string;
  primaryContact?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  preferredLanguage?: string;
}

const dash = (v: string | null | undefined) => (v && v.trim() ? v.trim() : "—");

export function OverviewTab({
  addressFields,
  relationshipFields,
  marketingConsent,
  onEditAddresses,
  onAddNotes,
  internalNotes,
  customerId,
  accountNumber,
  fullName,
  email,
  phone,
  preferredLanguage,
}: OverviewTabProps) {
  return (
    <>
      <div className="bg-white rounded-[10px] border border-[#e5e7eb] mb-6">
        <div className="p-4 md:p-5 sm:p-6">
          <h3 className="text-[14px] md:text-[16px] font-semibold text-[#333] mb-4">
            Identity & Contact Information
          </h3>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center py-2 sm:py-3 border-b border-[#E5E7EB] gap-0.5 sm:gap-0">
              <span className="sm:w-1/2 text-[12px] sm:text-[14px] md:text-[16px] text-[#999999]">
                Customer ID
              </span>
              <span className="sm:w-1/2 text-[12px] sm:text-[14px] md:text-[16px] font-medium text-[#333] flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-6 md:h-6 shrink-0" color="#999999" />
                {dash(customerId)}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center py-2 sm:py-3 border-b border-[#E5E7EB] gap-0.5 sm:gap-0">
              <span className="sm:w-1/2 text-[12px] sm:text-[14px] md:text-[16px] text-[#999999]">
                Account Number
              </span>
              <span className="sm:w-1/2 text-[12px] sm:text-[14px] md:text-[16px] font-medium text-[#333] flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-6 md:h-6 shrink-0" color="#999999" />
                {dash(accountNumber)}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center py-2 sm:py-3 border-b border-[#E5E7EB] gap-0.5 sm:gap-0">
              <span className="sm:w-1/2 text-[12px] sm:text-[14px] md:text-[16px] text-[#999999]">
                Full Name/Business
              </span>
              <span className="sm:w-1/2 text-[12px] sm:text-[14px] md:text-[16px] font-medium text-[#333] flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-6 md:h-6 shrink-0" color="#999999" />
                {dash(fullName)}
              </span>
            </div>
            {/* <div className="flex flex-col sm:flex-row sm:items-center py-2 sm:py-3 border-b border-[#E5E7EB] gap-0.5 sm:gap-0">
              <span className="sm:w-1/2 text-[12px] sm:text-[14px] md:text-[16px] text-[#999999]">
                Primary Contact
              </span>
              <span className="sm:w-1/2 text-[12px] sm:text-[14px] md:text-[16px] font-medium text-[#333] flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-6 md:h-6 shrink-0" color="#999999" />
                {dash(primaryContact)}
              </span>
            </div> */}
            <div className="flex flex-col sm:flex-row sm:items-center py-2 sm:py-3 border-b border-[#E5E7EB] gap-0.5 sm:gap-0">
              <span className="sm:w-1/2 text-[12px] sm:text-[14px] md:text-[16px] text-[#999999]">
                Email (Primary)
              </span>
              <span className="sm:w-1/2 text-[12px] sm:text-[14px] md:text-[16px] font-medium text-[#333] flex items-center gap-1 break-all">
                <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-6 md:h-6 shrink-0" color="#999999" />
                {dash(email)}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center py-2 sm:py-3 gap-0.5 sm:gap-0">
              <span className="sm:w-1/2 text-[12px] sm:text-[14px] md:text-[16px] text-[#999999]">
                Phone (Primary)
              </span>
              <span className="sm:w-1/2 text-[12px] sm:text-[14px] md:text-[16px] font-medium text-[#333] flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-6 md:h-6 shrink-0" color="#999999" />
                {dash(phone)}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-[10px] border border-[#e5e7eb] mb-6">
        <div className="p-4 md:p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-3 mb-4">
            <h3 className="text-[14px] md:text-[16px] font-semibold text-[#333]">
              Addresses & Location
            </h3>
            <Button
              variant="outline"
              onClick={onEditAddresses}
              className="text-xs md:text-sm self-start sm:self-auto"
            >
              <Pen className="w-4 h-4 md:w-6 md:h-6" />
              <span className="hidden sm:inline">Edit Addresses</span>
              <span className="sm:hidden">Edit</span>
            </Button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              {addressFields.map((field, index) => (
                <div key={index}>
                  <span className="text-[11px] sm:text-[12px] md:text-[14px] text-[#333] flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 md:mb-3">
                    {field.icon}
                    {field.label}
                  </span>
                  <span className="text-[11px] sm:text-[12px] md:text-[14px] font-medium text-[#999999] block wrap-break-word">
                    {dash(field.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-[10px] border border-[#e5e7eb] mb-6">
        <div className="p-4 md:p-5 sm:p-6">
          <div className="flex justify-between">
            <h3 className="text-[14px] md:text-[16px] font-semibold text-[#333] mb-4">
              Relationship & Marketing
            </h3>
          </div>
          <div className="space-y-4">
            {relationshipFields.map((field, index) => (
              <div
                key={index}
                className="py-2 sm:py-3 border-b border-[#E5E7EB] flex flex-col sm:flex-row sm:gap-3 gap-1.5"
              >
                <span className="text-[12px] sm:text-[14px] md:text-[16px] text-[#999999]">
                  {field.icon}
                </span>
                <div className="flex flex-col">
                  <span className="text-[11px] sm:text-[12px] md:text-[16px] font-medium text-[#999999] mb-1.5 sm:mb-2 md:mb-3">
                    {field.label}
                  </span>
                  <span className="text-[11px] sm:text-[12px] md:text-[14px] font-medium text-[#333]">
                    {field.label === "Customer Type / Segment" ||
                    field.label === "Loyalty Program Status" ? (
                      <span className="px-2 sm:px-2.5 py-1 sm:py-1.5 bg-[#F6F6F6] text-[#333] rounded-[5px] text-[10px] sm:text-[11px] md:text-[12px] font-medium inline-block">
                        {dash(field.value)}
                      </span>
                    ) : (
                      dash(field.value)
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="py-2 sm:py-3 border-b border-[#E5E7EB] last:border-b-0 flex flex-col sm:flex-row sm:gap-3 gap-1.5">
            <span className="text-[12px] sm:text-[14px] md:text-[16px] text-[#999999]">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </span>
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-2 mb-2 sm:mb-3">
                <span className="text-[11px] sm:text-[12px] md:text-[16px] font-medium text-[#999999] mb-1 sm:mb-3">
                  Internal Notes
                </span>
                <Button
                  variant="outline"
                  onClick={onAddNotes}
                  className="text-[10px] sm:text-xs self-start"
                >
                  + Add Notes
                </Button>
              </div>
              {internalNotes ? (
                <div className="bg-[#F6F6F6] border border-[#E5E7EB] rounded-[5px] p-2 sm:p-2.5">
                  <p className="text-[#333333] text-[11px] sm:text-[12px] md:text-[14px]">
                    {internalNotes}
                  </p>
                </div>
              ) : (
                <p className="text-[11px] sm:text-[12px] text-[#999]">No notes added yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-[10px] border border-[#e5e7eb] mb-6">
        <div className="p-4 md:p-5 sm:p-6">
          <div className="mb-4 sm:mb-6 md:mb-8">
            <h3 className="text-[13px] sm:text-[14px] md:text-[16px] font-semibold text-[#333] mb-1 sm:mb-1.5">
              Communication Preferences & Consent
            </h3>
            <p className="text-[#999999] text-[10px] sm:text-[11px] md:text-[12px]">
              Communication Preferences & Consent
            </p>
          </div>
          {/* First Row - Communication Preferences */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6 md:gap-x-8 gap-y-4 sm:gap-y-5 mb-4 sm:mb-6 border-b border-[#E5E7EB] pb-4 sm:pb-6">
            <div>
              <span className="text-[12px] sm:text-[14px] md:text-[16px] font-medium text-[#999] flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-6 md:h-6 shrink-0" color="#999999" />
                Preferred Contact Method
              </span>
              <p className="text-[11px] sm:text-[12px] md:text-[14px] bg-[#F6F6F6] border border-[#E5E7EB] rounded-[5px] px-2.5 sm:px-3 md:px-5 py-2 sm:py-2.5 text-[#333] font-medium">
                Email
              </p>
            </div>
            <div>
              <span className="text-[12px] sm:text-[14px] md:text-[16px] font-medium text-[#999] flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-6 md:h-6 shrink-0" color="#999999" />
                Preferred Language
              </span>
              <p className="text-[11px] sm:text-[12px] md:text-[14px] bg-[#F6F6F6] border border-[#E5E7EB] rounded-[5px] px-2.5 sm:px-3 md:px-5 py-2 sm:py-2.5 text-[#333] font-medium">
                {dash(preferredLanguage)}
              </p>
            </div>
            <div>
              <span className="text-[12px] sm:text-[14px] md:text-[16px] font-medium text-[#999] flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                <History
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-6 md:h-6 shrink-0"
                  color="#999999"
                />
                Best Time to Contact
              </span>
              <p className="text-[11px] sm:text-[12px] md:text-[14px] bg-[#F6F6F6] border border-[#E5E7EB] rounded-[5px] px-2.5 sm:px-3 md:px-5 py-2 sm:py-2.5 text-[#333] font-medium">
                9 AM - 5 PM (Business Hours)
              </p>
            </div>
            <div>
              <span className="text-[12px] sm:text-[14px] md:text-[16px] font-medium text-[#999] flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                <History
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-6 md:h-6 shrink-0"
                  color="#999999"
                />
                Consent Source
              </span>
              <div className="flex gap-1.5 sm:gap-2 md:gap-3">
                <p className="text-[11px] sm:text-[12px] md:text-[14px] inline-block bg-[#F6F6F6] border border-[#E5E7EB] rounded-[25px] px-2.5 sm:px-3 md:px-5 py-2 sm:py-2.5 text-[#333] font-medium">
                  UI
                </p>
                <p className="text-[11px] sm:text-[12px] md:text-[14px] inline-block bg-[#F6F6F6] border border-[#E5E7EB] rounded-[25px] px-2.5 sm:px-3 md:px-5 py-2 sm:py-2.5 text-[#333] font-medium">
                  v2.1
                </p>
              </div>
            </div>
          </div>
          {/* Second Row - Marketing Consent */}
          <div>
            <p className="text-[10px] sm:text-[11px] md:text-[12px] text-[#999] mb-2 sm:mb-3">
              Marketing Consent
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="flex-col">
                <div
                  className={`flex items-start gap-1.5 sm:gap-2 px-2.5 sm:px-3 md:px-4 py-2.5 sm:py-3 rounded-[5px] border ${
                    marketingConsent.email
                      ? "bg-[#e8f5e9] border-[#4caf50]"
                      : "bg-[#f5f5f5] border-[#e0e0e0]"
                  }`}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <svg
                      className="size-3.5 sm:size-4 md:size-5"
                      fill="none"
                      viewBox="0 0 20 20"
                    >
                      <path
                        d="M3.33333 5.83333H16.6667V14.1667C16.6667 14.6087 16.4911 15.0326 16.1785 15.3452C15.866 15.6577 15.442 15.8333 15 15.8333H5C4.55797 15.8333 4.13405 15.6577 3.82149 15.3452C3.50893 15.0326 3.33333 14.6087 3.33333 14.1667V5.83333Z"
                        stroke={marketingConsent.email ? "#4caf50" : "#999"}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M16.6667 5.83333L10 10.8333L3.33333 5.83333"
                        stroke={marketingConsent.email ? "#4caf50" : "#999"}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                      />
                    </svg>
                    <span
                      className={`text-[11px] sm:text-[12px] md:text-[14px] font-medium ${marketingConsent.email ? "text-[#2e7d32]" : "text-[#999]"}`}
                    >
                      Email
                    </span>
                  </div>
                </div>
                <span className="text-[10px] sm:text-[11px] md:text-[12px] text-[#666]">
                  Email Consent: 2024-01-15
                </span>
              </div>

              <div className="flex-col">
                <div
                  className={`flex items-start gap-1.5 sm:gap-2 px-2.5 sm:px-3 md:px-4 py-2.5 sm:py-3 rounded-[5px] border ${
                    marketingConsent.sms
                      ? "bg-[#e8f5e9] border-[#4caf50]"
                      : "bg-[#f5f5f5] border-[#e0e0e0]"
                  }`}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <svg
                      className="size-3.5 sm:size-4 md:size-5"
                      fill="none"
                      viewBox="0 0 20 20"
                    >
                      <path
                        d="M5.83333 3.33333H14.1667C15.0871 3.33333 15.8333 4.07953 15.8333 5V12.5C15.8333 13.4205 15.0871 14.1667 14.1667 14.1667H7.5L3.33333 16.6667V5C3.33333 4.07953 4.07953 3.33333 5 3.33333H5.83333Z"
                        stroke={marketingConsent.sms ? "#4caf50" : "#999"}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                      />
                    </svg>
                    <span
                      className={`text-[11px] sm:text-[12px] md:text-[14px] font-medium ${marketingConsent.sms ? "text-[#2e7d32]" : "text-[#999]"}`}
                    >
                      SMS
                    </span>
                  </div>
                </div>
                <span className="text-[10px] sm:text-[11px] md:text-[12px] text-[#666]">
                  SMS Consent: 2024-01-15
                </span>
              </div>
              <div className="flex-col">
                <div
                  className={`flex items-start gap-1.5 sm:gap-2 px-2.5 sm:px-3 md:px-4 py-2.5 sm:py-3 rounded-[5px] border ${
                    marketingConsent.marketing
                      ? "bg-[#e8f5e9] border-[#4caf50]"
                      : "bg-[#f5f5f5] border-[#e0e0e0]"
                  }`}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <svg
                      className="size-3.5 sm:size-4 md:size-5"
                      fill="none"
                      viewBox="0 0 20 20"
                    >
                      <path
                        d="M15 5.83333L9.16667 10L15 14.1667"
                        stroke={
                          marketingConsent.marketing ? "#4caf50" : "#999"
                        }
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M5 5.83333V14.1667"
                        stroke={
                          marketingConsent.marketing ? "#4caf50" : "#999"
                        }
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                      />
                    </svg>
                    <span
                      className={`text-[11px] sm:text-[12px] md:text-[14px] font-medium ${marketingConsent.marketing ? "text-[#2e7d32]" : "text-[#999]"}`}
                    >
                      Marketing
                    </span>
                  </div>
                </div>
                <span className="text-[10px] sm:text-[11px] md:text-[12px] text-[#666]">
                  Marketing Consent: 2024-01-15
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
