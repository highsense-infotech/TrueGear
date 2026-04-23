import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, User, Calendar, Wrench, ClipboardCheck, Image as ImageIcon, Clock } from "lucide-react";
import truck from "../../assets/truck.png";
import { getVehicleDetails, getVehicleVisitHistory } from "../../api/vehicle.api";
import type { VehicleDetailData, VehicleVisit } from "../../api/vehicle.api";
import ROUTES from "../../constants/routes";


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

function maskContact(contact: string | null): string {
  if (!contact) return "—";
  const digits = contact.replace(/\D/g, "");
  if (digits.length < 4) return contact;
  return "●".repeat(digits.length - 4) + digits.slice(-4);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-CA"); // YYYY-MM-DD
}

// ── sub-components ────────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-[#f5f5f5] last:border-0">
      <span className="text-[#999] text-[13px]">{label}</span>
      <span className="text-[#222] text-[13px] font-medium text-right max-w-[60%]">{value ?? "—"}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#f0f0f0] px-5 py-1 mb-4">
      <h3 className="text-[#333] text-[13px] font-semibold py-4 border-b border-[#f0f0f0]">{title}</h3>
      <div>{children}</div>
    </div>
  );
}

// ── main ──────────────────────────────────────────────────────────────────────
type Tab = "overview" | "service" | "docs";

const Vehicle360VehicleDetail: React.FC = () => {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const navigate      = useNavigate();

  const [data,        setData]        = useState<VehicleDetailData | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [tab,         setTab]         = useState<Tab>("overview");
  const [visits,      setVisits]      = useState<VehicleVisit[]>([]);
  const [vLoading,    setVLoading]    = useState(false);
  const [expandedId,  setExpandedId]  = useState<string | null>(null);

  useEffect(() => {
    if (!vehicleId) return;
    setLoading(true);
    getVehicleDetails(vehicleId)
      .then((res) => { if (res.success) setData(res.data); })
      .catch(() => setError("Failed to load vehicle details"))
      .finally(() => setLoading(false));
  }, [vehicleId]);

  useEffect(() => {
    if (tab !== "service" || !vehicleId) return;
    setVLoading(true);
    getVehicleVisitHistory(vehicleId)
      .then((res) => { if (res.success) setVisits(res.data ?? []); })
      .catch(() => setVisits([]))
      .finally(() => setVLoading(false));
  }, [tab, vehicleId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-2">
        <p className="text-[#999] text-sm">{error ?? "Vehicle not found"}</p>
        <button onClick={() => navigate(ROUTES.VEHICLE_360_DASHBOARD)} className="text-[#ff4f31] text-sm hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const { vehicle, customer } = data;
  const badge = getBadge(vehicle.status);
  const frontImage = data.images?.[0]?.imagePath ?? null;

  return (
    <div>
      {/* breadcrumb */}
      <p className="text-[#999] text-xs mb-3">
        Home &rsaquo; Vehicle Details
      </p>

      {/* page header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate(ROUTES.VEHICLE_360_DASHBOARD)}
          className="p-2 rounded-xl hover:bg-[#f5f5f5] transition-colors"
        >
          <ArrowLeft size={18} className="text-[#555]" />
        </button>

        {/* vehicle thumb */}
        <div className="w-11 h-11 rounded-xl bg-linear-to-b from-[#ff4f31] to-[#fe2b73] overflow-hidden shrink-0 flex items-center justify-center">
          {frontImage
            ? <img src={frontImage} alt="Vehicle" className="w-full h-full object-cover" />
            : <img src={truck} alt="Vehicle" className="w-9 object-contain" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-[#222] text-[15px] font-semibold leading-tight">
            {(vehicle.registrationNumber || vehicle.vin || "").toUpperCase()}
          </h1>
          <p className="text-[#999] text-[12px] truncate">
            {vehicle.brand} {vehicle.model}{vehicle.modelVariant ? ` · ${vehicle.modelVariant}` : ""}
            {vehicle.odometerLast ? ` · ${vehicle.odometerLast.toLocaleString()} km` : ""}
          </p>
        </div>

        <span className={`inline-flex items-center px-3.5 py-1 rounded-full text-[11px] font-semibold shrink-0 ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      {/* tabs */}
      <div className="flex gap-1 mb-5 bg-[#f5f5f5] p-1 rounded-xl w-fit">
        {(["overview", "service", "docs"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-[13px] font-medium capitalize transition-all cursor-pointer ${
              tab === t ? "bg-white text-[#333] shadow-sm" : "text-[#999] hover:text-[#555]"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          {/* alert banners */}
          {/* <div className="mb-4 flex flex-col gap-2">
            <div className="flex items-start gap-2.5 px-4 py-3 bg-[#fff7ed] border border-[#fed7aa] rounded-xl">
              <AlertTriangle className="w-4 h-4 text-[#f97316] shrink-0 mt-0.5" />
              <p className="text-[#c2410c] text-[12px]">
                Repeat complaint detected: Brake system issue reported 2 times in last 6 months
              </p>
            </div>
            <div className="flex items-start gap-2.5 px-4 py-3 bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl">
              <Info className="w-4 h-4 text-[#16a34a] shrink-0 mt-0.5" />
              <p className="text-[#15803d] text-[12px]">
                Repeat complaint detected: Brake system issue reported 2 times in last 6 months
              </p>
            </div>
          </div> */}

          {/* Vehicle Identification */}
          <Section title="Vehicle Identification">
            <InfoRow label="Registration"  value={vehicle.registrationNumber?.toUpperCase()} />
            <InfoRow label="VIN"           value={vehicle.vin?.toUpperCase()} />
            <InfoRow label="Engine No."    value={vehicle.engineNumber} />
            <InfoRow label="Make / Model"  value={`${vehicle.brand} ${vehicle.model}`} />
            <InfoRow label="Variant"       value={vehicle.transmissionType} />
            <InfoRow label="Fuel"          value={vehicle.fuelType ? vehicle.fuelType.charAt(0).toUpperCase() + vehicle.fuelType.slice(1) : null} />
            <InfoRow label="Emission"      value={null} />
            <InfoRow label="Odometer"      value={vehicle.odometerLast ? `${vehicle.odometerLast.toLocaleString()} km` : null} />
          </Section>

          {/* Customer */}
          {customer && (
            <Section title="Customer">
              <InfoRow label="Name"      value={customer.fullName} />
              {/* <InfoRow label="Code"      value={customer.crmReferenceNo} /> */}
              <InfoRow label="Fleet"     value={customer.companyName} />
              <InfoRow label="Ownership" value={customer.customerType === "C" ? "Fleet" : "Individual"} />
              <InfoRow label="Contact"   value={maskContact(customer.contactNumber)} />
              <div className="pt-3 pb-1">
                <button
                  onClick={() => navigate(`${ROUTES.CUSTOMER_PROFILE_DASHBOARD}?custSequenceId=${encodeURIComponent(customer.custSequenceId ?? "")}`)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#fff0ed] text-[#ff4f31] text-[13px] font-medium hover:bg-[#ffe4de] transition-colors cursor-pointer"
                >
                  <User size={14} />
                  View Customer Profile
                </button>
              </div>
            </Section>
          )}

          {/* Warranty & Insurance */}
          <Section title="Warranty & Insurance">
            <InfoRow
              label="Warranty"
              value={
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                  vehicle.warrantyActive ? "bg-[#B3FFBD] text-[#00BF06]" : "bg-[#f5f5f5] text-[#999]"
                }`}>
                  {vehicle.warrantyActive ? "Active" : "Inactive"}
                </span>
              }
            />
            <InfoRow
              label="Warranty Period"
              value={
                vehicle.warrantyStartDate && vehicle.oemWarrantyEnd
                  ? `${formatDate(vehicle.warrantyStartDate)} → ${formatDate(vehicle.oemWarrantyEnd)}`
                  : null
              }
            />
            <InfoRow label="Eligible"   value={vehicle.warrantyActive ? "Yes ✓" : "No"} />
            <InfoRow label="AMC"        value={vehicle.certifiedPreOwned ? "Premium AMC - 3 Yea" : null} />
            <InfoRow label="Insurance"  value={null} />
            <InfoRow label="Valid Till" value={formatDate(vehicle.oemWarrantyEnd)} />
          </Section>
        </>
      )}

      {tab === "service" && (
        <>
          {vLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
            </div>
          ) : visits.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#f0f0f0] px-5 py-12 text-center">
              <p className="text-[#999] text-sm">No visit history found</p>
            </div>
          ) : (
            <>
              {/* Summary strip */}
              {(() => {
                const currentVisit = visits.find((v) => v.isCurrentVisit) ?? visits[0];
                const latestOdometer = Math.max(...visits.map((v) => v.odometerReading ?? 0));
                return (
                  <div className="bg-white rounded-2xl border border-[#f0f0f0] px-5 py-1 mb-4">
                    <h3 className="text-[#333] text-[13px] font-semibold py-4 border-b border-[#f0f0f0]">Summary</h3>
                    <InfoRow label="Total Visits"  value={visits.length} />
                    <InfoRow label="Last Visit"    value={new Date(currentVisit.checkInTime).toLocaleDateString("en-CA")} />
                    <InfoRow label="Last Odometer" value={latestOdometer > 0 ? `${latestOdometer.toLocaleString()} km` : "—"} />
                  </div>
                );
              })()}

              {/* Visit cards */}
              <div className="space-y-3">
                {visits.map((v, idx) => {
                  const isOpen    = expandedId === v.id;
                  const dateStr   = new Date(v.checkInTime).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                  const timeStr   = new Date(v.checkInTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
                  const svcLabel  = v.jobCard?.serviceType?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? null;
                  const inspColor = v.inspection?.overallStatus === "PASS" ? "text-[#00BF06]" : v.inspection?.overallStatus === "FAIL" ? "text-[#ff4f31]" : "text-[#E07B00]";
                  const statusColor = v.isCurrentVisit
                    ? "bg-[#B3FFBD] text-[#00BF06]"
                    : v.status === "COMPLETED" ? "bg-[#dbeafe] text-[#2563eb]"
                    : v.status === "CANCELLED" ? "bg-[#FFC0D1] text-[#FF4F31]"
                    : "bg-[#f0f0f0] text-[#777]";
                  const statusLabel = v.isCurrentVisit ? "Current Visit"
                    : v.status.replace("_", " ");

                  return (
                    <div key={v.id} className="bg-white rounded-2xl border border-[#f0f0f0] overflow-hidden">
                      {/* Header row — always visible */}
                      <button
                        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#fafafa] transition-colors"
                        onClick={() => setExpandedId(isOpen ? null : v.id)}
                      >
                        <div className="w-8 h-8 rounded-full bg-[#f5f5f5] flex items-center justify-center shrink-0 text-[#999] text-[12px] font-semibold">
                          {visits.length - idx}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[#222] text-[13px] font-semibold leading-tight">{dateStr} · {timeStr}</p>
                          <p className="text-[#999] text-[11px] mt-0.5">{v.odometerReading.toLocaleString()} km{svcLabel ? ` · ${svcLabel}` : ""}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </button>

                      {/* Expanded detail */}
                      {isOpen && (
                        <div className="border-t border-[#f5f5f5] px-5 pb-5 pt-4 space-y-4">

                          {/* Photos */}
                          {v.photos.length > 0 && (
                            <div>
                              <div className="flex items-center gap-1.5 mb-2">
                                <ImageIcon size={13} className="text-[#999]" />
                                <p className="text-[#999] text-[12px] font-medium">Entry Photos</p>
                              </div>
                              <div className="flex gap-2 overflow-x-auto pb-1">
                                {v.photos.map((p) => (
                                  <div key={p.id} className="shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-[#f0f0f0]">
                                    <img src={p.imageUrl} alt={p.photoType} className="w-full h-full object-cover" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Appointment */}
                          {v.appointment && (
                            <div>
                              <div className="flex items-center gap-1.5 mb-2">
                                <Calendar size={13} className="text-[#999]" />
                                <p className="text-[#999] text-[12px] font-medium">Appointment</p>
                              </div>
                              <div className="bg-[#f9f9f9] rounded-xl px-4 py-3 space-y-1.5">
                                <div className="flex justify-between text-[12px]">
                                  <span className="text-[#999]">Date</span>
                                  <span className="text-[#222] font-medium">{v.appointment.appointmentDate} · {v.appointment.appointmentTime}</span>
                                </div>
                                {v.appointment.serviceType && (
                                  <div className="flex justify-between text-[12px]">
                                    <span className="text-[#999]">Service</span>
                                    <span className="text-[#222] font-medium">{v.appointment.serviceType}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* QC Inspection */}
                          {v.inspection && (
                            <div>
                              <div className="flex items-center gap-1.5 mb-2">
                                <ClipboardCheck size={13} className="text-[#999]" />
                                <p className="text-[#999] text-[12px] font-medium">QC Inspection</p>
                              </div>
                              <div className="bg-[#f9f9f9] rounded-xl px-4 py-3 space-y-1.5">
                                <div className="flex justify-between text-[12px]">
                                  <span className="text-[#999]">Result</span>
                                  <span className={`font-semibold ${inspColor}`}>{v.inspection.overallStatus ?? "—"}</span>
                                </div>
                                {v.inspection.finalRemarks && (
                                  <div className="flex justify-between text-[12px]">
                                    <span className="text-[#999]">Remarks</span>
                                    <span className="text-[#222] font-medium text-right max-w-[60%]">{v.inspection.finalRemarks}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Job Card */}
                          {v.jobCard && (
                            <div>
                              <div className="flex items-center gap-1.5 mb-2">
                                <Wrench size={13} className="text-[#999]" />
                                <p className="text-[#999] text-[12px] font-medium">Job Card</p>
                              </div>
                              <div className="bg-[#f9f9f9] rounded-xl px-4 py-3 space-y-1.5">
                                {v.jobCard.serviceType && (
                                  <div className="flex justify-between text-[12px]">
                                    <span className="text-[#999]">Service</span>
                                    <span className="text-[#222] font-medium">{v.jobCard.serviceType.replace(/_/g, " ")}</span>
                                  </div>
                                )}
                                <div className="flex justify-between text-[12px]">
                                  <span className="text-[#999]">Estimate</span>
                                  <span className="text-[#222] font-medium">{v.jobCard.totalEstimate ? `${parseFloat(v.jobCard.totalEstimate).toLocaleString()}` : "—"}</span>
                                </div>
                                <div className="flex justify-between text-[12px]">
                                  <span className="text-[#999]">Status</span>
                                  <span className="text-[#222] font-medium">{v.jobCard.status.replace(/_/g, " ")}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Timeline */}
                          {v.events && v.events.length > 0 && (
                            <div>
                              <div className="flex items-center gap-1.5 mb-2">
                                <Clock size={13} className="text-[#999]" />
                                <p className="text-[#999] text-[12px] font-medium">Timeline</p>
                              </div>
                              <div className="bg-[#f9f9f9] rounded-xl px-4 py-3">
                                <ol className="relative border-l border-[#e5e5e5] ml-1.5 space-y-3">
                                  {v.events.map((ev, i) => {
                                    const d = new Date(ev.at);
                                    const when = `${d.toLocaleDateString("en-CA")} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
                                    return (
                                      <li key={`${ev.type}-${i}`} className="ml-3">
                                        <span className="absolute -left-[5px] mt-1 w-2.5 h-2.5 rounded-full bg-[#f47920] border-2 border-white" />
                                        <p className="text-[12px] text-[#222] font-medium leading-snug">{ev.label}</p>
                                        <p className="text-[11px] text-[#999] mt-0.5">
                                          {when}
                                          {ev.by && <> · by <span className="text-[#555]">{ev.by}</span></>}
                                        </p>
                                      </li>
                                    );
                                  })}
                                </ol>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {tab === "docs" && (
        <div className="bg-white rounded-2xl border border-[#f0f0f0] px-5 py-8 text-center">
          <p className="text-[#999] text-sm">Documents coming soon</p>
        </div>
      )}
    </div>
  );
};

export default Vehicle360VehicleDetail;
