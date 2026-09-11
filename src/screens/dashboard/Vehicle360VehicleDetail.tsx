import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, User, ClipboardCheck, Wrench, Clock, Image as ImageIcon } from "lucide-react";
import truck from "../../assets/truck.png";
import { getVehicleDetails } from "../../api/vehicle.api";
import type { VehicleDetailData } from "../../api/vehicle.api";
import { getVehicleJobCards } from "../../api/serviceAdvisor.api";
import type { SAJobCard } from "../../api/serviceAdvisor.api";
import { getV360Timeline, type V360Timeline } from "../../api/vehicle360.api";
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
  const [, setJobCards] = useState<SAJobCard[]>([]);
  const [jcLoading,   setJcLoading]   = useState(false);
  const [v360,        setV360]        = useState<V360Timeline | null>(null);
  const [v360Loading, setV360Loading] = useState(false);
  const [expandedVisit, setExpandedVisit] = useState<string | null>(null);

  useEffect(() => {
    if (!vehicleId) return;
    setLoading(true);
    getVehicleDetails(vehicleId)
      .then((res: any) => { if (res?.success?.status && res.data) setData(res.data); })
      .catch(() => setError("Failed to load vehicle details"))
      .finally(() => setLoading(false));
  }, [vehicleId]);

  useEffect(() => {
    if (tab !== "service" || !vehicleId) return;
    setJcLoading(true);
    getVehicleJobCards(vehicleId)
      .then((res: any) => { if (res?.success?.status && res.data) setJobCards(res.data.jobCards); })
      .catch(() => setJobCards([]))
      .finally(() => setJcLoading(false));
    setV360Loading(true);
    getV360Timeline(vehicleId)
      .then((res) => { if (res?.success?.status && res.data) setV360(res.data); })
      .catch(() => setV360(null))
      .finally(() => setV360Loading(false));
  }, [tab, vehicleId]);

  const toggleVisit = (id: string) =>
    setExpandedVisit((prev) => (prev === id ? null : id));

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
            {vehicle.registrationNumber || vehicle.vin}
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
            <InfoRow label="Registration"  value={vehicle.registrationNumber} />
            <InfoRow label="VIN"           value={vehicle.vin} />
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
          {v360Loading || jcLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="bg-white rounded-2xl border border-[#f0f0f0] px-5 py-1 mb-4">
                <h3 className="text-[#333] text-[15px] font-semibold py-4">Summary</h3>
                <div className="flex items-center justify-between py-3.5 border-t border-[#f5f5f5]">
                  <span className="text-[#999] text-[13px]">Total Visits</span>
                  <span className="text-[#222] text-[13px] font-medium">{v360?.summary.visitCount ?? 0}</span>
                </div>
                <div className="flex items-center justify-between py-3.5 border-t border-[#f5f5f5]">
                  <span className="text-[#999] text-[13px]">Last Visit</span>
                  <span className="text-[#222] text-[13px] font-medium">
                    {v360?.visits[0]?.arrivedAt
                      ? new Date(v360.visits[0].arrivedAt).toLocaleDateString("en-CA")
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3.5 border-t border-[#f5f5f5]">
                  <span className="text-[#999] text-[13px]">Last Odometer</span>
                  <span className="text-[#222] text-[13px] font-medium">
                    {vehicle.odometerLast != null
                      ? `${vehicle.odometerLast.toLocaleString()} km`
                      : v360?.visits[0]?.odometerIn != null
                        ? `${v360.visits[0].odometerIn} km`
                        : "—"}
                  </span>
                </div>
              </div>

              {/* Visit list */}
              {!v360 || v360.visits.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#f0f0f0] py-8">
                  <p className="text-[#999] text-sm text-center">No service history found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {v360.visits.map((visit, idx) => {
                    const visitNo = v360.visits.length - idx;
                    const isCurrent = !visit.releasedAt;
                    const isOpen = expandedVisit === visit.checkInId;
                    const date = new Date(visit.arrivedAt);
                    const dateStr = date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                    const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
                    const serviceLabel = visit.jobCard?.serviceType ?? "—";
                    return (
                      <div key={visit.checkInId} className="bg-white rounded-2xl border border-[#f0f0f0] overflow-hidden">
                        <button
                          onClick={() => toggleVisit(visit.checkInId)}
                          className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-[#fafafa]">
                          <div className="w-9 h-9 rounded-full bg-[#f5f5f5] flex items-center justify-center text-[#666] text-[13px] font-semibold shrink-0">
                            {visitNo}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-semibold text-[#333]">
                              {dateStr} · <span className="text-[#222]">{timeStr}</span>
                            </p>
                            <p className="text-[12px] text-[#999] mt-0.5">
                              {visit.odometerIn} km · {serviceLabel}
                            </p>
                          </div>
                          {isCurrent && (
                            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-semibold bg-[#B3FFBD] text-[#00BF06] shrink-0">
                              Current Visit
                            </span>
                          )}
                        </button>

                        {isOpen && (() => {
                          // Per-visit check-in photos if present, else fall back
                          // to the vehicle-level images (gallery on the overview
                          // tab uses the same set).
                          const photos = visit.entryPhotos.length > 0
                            ? visit.entryPhotos
                            : (data.images ?? []).map((im: any) => im.imagePath).filter(Boolean);
                          return (
                          <div className="px-5 pb-5 border-t border-[#f5f5f5]">
                            {/* Entry Photos */}
                            {photos.length > 0 && (
                              <div className="pt-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <ImageIcon size={14} className="text-[#999]" />
                                  <span className="text-[13px] text-[#333] font-medium">Entry Photos</span>
                                </div>
                                <div className="flex gap-3 flex-wrap">
                                  {photos.map((url: string, i: number) => (
                                    <a key={i} href={url} target="_blank" rel="noreferrer"
                                       className="w-20 h-20 rounded-lg overflow-hidden border border-[#f0f0f0] block">
                                      <img src={url} alt="" className="w-full h-full object-cover" />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* QC Inspection */}
                            {visit.qcInspection && (
                              <div className="mt-5">
                                <div className="flex items-center gap-2 mb-2">
                                  <ClipboardCheck size={14} className="text-[#999]" />
                                  <span className="text-[13px] text-[#333] font-medium">QC Inspection</span>
                                </div>
                                <div className="flex items-center justify-between bg-[#fafafa] rounded-lg px-3 py-2.5">
                                  <span className="text-[12px] text-[#999]">Result</span>
                                  <span className={`text-[12px] font-semibold ${
                                    visit.qcInspection.overallStatus === "PASS" ? "text-[#00BF06]"
                                    : visit.qcInspection.overallStatus === "FAIL" ? "text-[#FF4F31]"
                                    : "text-[#E07B00]"
                                  }`}>
                                    {visit.qcInspection.overallStatus ?? "—"}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Job Card */}
                            {visit.jobCard && (
                              <div className="mt-5">
                                <div className="flex items-center gap-2 mb-2">
                                  <Wrench size={14} className="text-[#999]" />
                                  <span className="text-[13px] text-[#333] font-medium">Job Card</span>
                                </div>
                                <div className="bg-[#fafafa] rounded-lg px-3 py-1">
                                  <div className="flex items-center justify-between py-2 border-b border-[#f0f0f0]">
                                    <span className="text-[12px] text-[#999]">Service</span>
                                    <span className="text-[12px] text-[#222] font-medium">{visit.jobCard.serviceType ?? "—"}</span>
                                  </div>
                                  <div className="flex items-center justify-between py-2 border-b border-[#f0f0f0]">
                                    <span className="text-[12px] text-[#999]">Estimate</span>
                                    <span className="text-[12px] text-[#222] font-medium">
                                      {Number(visit.jobCard.totalEstimate ?? 0).toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between py-2">
                                    <span className="text-[12px] text-[#999]">Status</span>
                                    <span className="text-[12px] text-[#222] font-medium">
                                      {visit.jobCard.status.replace(/_/g, " ")}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Timeline */}
                            {visit.events.length > 0 && (
                              <div className="mt-5">
                                <div className="flex items-center gap-2 mb-3">
                                  <Clock size={14} className="text-[#999]" />
                                  <span className="text-[13px] text-[#333] font-medium">Timeline</span>
                                </div>
                                <ol className="space-y-2.5">
                                  {visit.events.map((e, i) => (
                                    <li key={i} className="flex gap-2.5">
                                      <span className="w-2 h-2 rounded-full bg-[#ff4f31] mt-1.5 shrink-0" />
                                      <div className="min-w-0">
                                        <p className="text-[13px] text-[#333] leading-tight">{e.summary}</p>
                                        <p className="text-[11px] text-[#bbb] mt-0.5">
                                          {new Date(e.at).toLocaleString("en-CA", {
                                            year: "numeric", month: "2-digit", day: "2-digit",
                                            hour: "2-digit", minute: "2-digit", hour12: false,
                                          })}
                                          {e.actor ? ` · by ${e.actor}` : ""}
                                        </p>
                                      </div>
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            )}
                          </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              )}
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
