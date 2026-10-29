import { useEffect, useMemo, useState } from "react";
import { Loader2, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import Modal from "../common/Modal";
import {
  getInspectionDetails,
  type InspectionDetailsData,
  type InspectionItem,
} from "../../api/qc.api";

type Props = {
  isOpen: boolean;
  /** Inspection to report on. Null renders nothing. */
  inspectionId: string | null;
  onClose: () => void;
};

const CATEGORY_LABEL: Record<string, string> = {
  EXTERIOR: "Exterior",
  INTERIOR: "Interior",
  BRAKE: "Brake",
};

const RESULT_STYLE: Record<string, string> = {
  PASS: "bg-emerald-50 border-emerald-200 text-emerald-700",
  FAIL: "bg-red-50 border-red-200 text-red-600",
  NA: "bg-[#f5f5f5] border-[#e5e7eb] text-[#888]",
};

function ResultChip({ result }: { result: string | null }) {
  const key = result ?? "PENDING";
  const Icon = key === "PASS" ? CheckCircle2 : key === "FAIL" ? XCircle : MinusCircle;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border shrink-0 ${
        RESULT_STYLE[key] ?? "bg-amber-50 border-amber-200 text-amber-700"
      }`}
    >
      <Icon size={12} />
      {key === "NA" ? "N/A" : key === "PENDING" ? "Not checked" : key}
    </span>
  );
}

// "24 May 2026, 09:14 PM" — locale-formatted, or an em dash when absent.
function fmt(ts: string | null | undefined) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// Elapsed time between start and finish, e.g. "3m 57s".
function duration(from: string | null | undefined, to: string | null | undefined) {
  if (!from || !to) return null;
  const ms = new Date(to).getTime() - new Date(from).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="bg-[#f9f9f9] rounded-lg px-3 py-2">
      <p className="text-[11px] text-[#999]">{label}</p>
      <p className={`text-[15px] font-semibold ${tone ?? "text-[#333]"}`}>{value}</p>
    </div>
  );
}

export function QCReportModal({ isOpen, inspectionId, onClose }: Props) {
  const [data, setData] = useState<InspectionDetailsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 93 of 115 items are typically N/A, so the checked ones are the signal.
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!isOpen || !inspectionId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    setShowAll(false);
    getInspectionDetails(inspectionId)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) setData(res.data);
        else setError(res.error?.message ?? "Failed to load the QC report");
      })
      .catch(() => { if (!cancelled) setError("Failed to load the QC report"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, inspectionId]);

  const sections = useMemo(() => {
    if (!data) return [];
    // Categories are dynamic (truck sheet uses Engine, Cooling System, …), so
    // derive them from the payload. Empty buckets are dropped — the API always
    // returns the three legacy car keys even when the inspection has no items
    // in them, and rendering three permanently-empty sections is just noise.
    return Object.entries(data.categories)
      .filter(([, all]) => all.length > 0)
      .map(([key, all]) => {
        const checked = all.filter((i) => i.result === "PASS" || i.result === "FAIL");
        return { key, all, checked, items: showAll ? all : checked };
      });
  }, [data, showAll]);

  const insp = data?.inspection;
  const took = duration(insp?.startedAt, insp?.completedAt);
  const overall = insp?.overallStatus ?? data?.findings.overallStatus ?? null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="QC Inspection Report" size="lg">
      {loading ? (
        <div className="flex items-center justify-center py-12 text-[#888]">
          <Loader2 className="animate-spin mr-2" size={18} /> Loading report…
        </div>
      ) : error ? (
        <p className="text-[13px] text-red-600 py-8 text-center">{error}</p>
      ) : !data ? null : (
        <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Vehicle + overall verdict */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[16px] font-semibold text-[#333]">
                {data.vehicle?.registrationNumber?.toUpperCase()}
              </p>
              <p className="text-[13px] text-[#666]">
                {data.vehicle?.brand} {data.vehicle?.model}
                {data.vehicle?.customerName ? ` · ${data.vehicle.customerName}` : ""}
              </p>
            </div>
            {overall && (
              <span
                className={`text-[12px] font-semibold px-3 py-1 rounded-md border ${
                  overall === "PASS"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-red-50 border-red-200 text-red-600"
                }`}
              >
                Overall: {overall}
              </span>
            )}
          </div>

          {/* When it was done, and by whom */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Started" value={fmt(insp?.startedAt)} />
            <Stat label="Completed" value={fmt(insp?.completedAt)} />
            <Stat label="Took" value={took ?? "—"} />
            <Stat label="Inspected by" value={insp?.completedByName ?? insp?.createdByName ?? "—"} />
          </div>

          {/* Result tally */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Checked" value={data.summary.passCount + data.summary.failCount} />
            <Stat label="Passed" value={data.summary.passCount} tone="text-emerald-700" />
            <Stat label="Failed" value={data.summary.failCount} tone="text-red-600" />
            <Stat label="Not applicable" value={data.summary.naCount} tone="text-[#888]" />
          </div>

          {/* Brake test — only meaningful when the inspector recorded it */}
          {(data.findings.brakeTestSummary.performance ||
            data.findings.brakeTestSummary.noise ||
            data.findings.brakeTestSummary.vibration) && (
            <div>
              <h4 className="text-[13px] font-semibold text-[#333] mb-1.5">Brake Test</h4>
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Performance" value={data.findings.brakeTestSummary.performance ?? "—"} />
                <Stat label="Noise" value={data.findings.brakeTestSummary.noise ?? "—"} />
                <Stat label="Vibration" value={data.findings.brakeTestSummary.vibration ?? "—"} />
              </div>
            </div>
          )}

          {/* Failures first — the part anyone reading the report cares about */}
          {data.findings.failedItems.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-[13px] font-semibold text-red-700 mb-1.5">
                {data.findings.failedItems.length} item
                {data.findings.failedItems.length === 1 ? "" : "s"} failed
              </p>
              <ul className="space-y-1">
                {data.findings.failedItems.map((f) => (
                  <li key={f.itemCode} className="text-[12px] text-red-900">
                    • {f.itemLabel}
                    <span className="text-red-700/70"> ({CATEGORY_LABEL[f.category] ?? f.category})</span>
                    {f.comment && <span className="italic text-red-700"> — "{f.comment}"</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Checklist */}
          <div className="flex items-center justify-between">
            <h4 className="text-[13px] font-semibold text-[#333]">Checklist</h4>
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="text-[12px] text-[#ff4f31] hover:underline"
            >
              {showAll
                ? "Show only checked items"
                : `Show all ${data.summary.totalItems} items (incl. N/A)`}
            </button>
          </div>

          {sections.map((s) => (
            <div key={s.key}>
              <p className="text-[12px] font-semibold text-[#555] mb-1.5">
                {/* Truck categories are already human-readable ("Cooling
                    System"); only the legacy SHOUTY keys need mapping. */}
                {CATEGORY_LABEL[s.key] ?? s.key}{" "}
                <span className="font-normal text-[#999]">
                  ({s.checked.length} checked of {s.all.length})
                </span>
              </p>
              {s.items.length === 0 ? (
                <p className="text-[12px] text-[#999] mb-2">Nothing checked in this section.</p>
              ) : (
                <ul className="divide-y divide-[#f0f0f0] border border-[#eee] rounded-lg mb-2">
                  {s.items.map((item: InspectionItem) => (
                    <li key={item.id} className="flex items-start gap-2 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] text-[#333]">{item.itemLabel}</p>
                        <p className="text-[11px] text-[#999]">
                          {item.itemCode}
                          {item.subCategory ? ` · ${item.subCategory}` : ""}
                        </p>
                        {item.comment && (
                          <p className="text-[11px] text-[#666] italic mt-0.5">"{item.comment}"</p>
                        )}
                        {item.photos.length > 0 && (
                          <div className="flex gap-1.5 mt-1.5 flex-wrap">
                            {item.photos.map((ph) => (
                              <a key={ph.id} href={ph.imageUrl} target="_blank" rel="noreferrer">
                                <img
                                  src={ph.imageUrl}
                                  alt={item.itemLabel}
                                  className="w-12 h-12 object-cover rounded border border-[#e5e7eb]"
                                />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                      <ResultChip result={item.result} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {/* Sign-off */}
          {(data.findings.finalRemarks || insp?.signatureUrl) && (
            <div className="border-t border-[#eee] pt-3">
              {data.findings.finalRemarks && (
                <>
                  <h4 className="text-[13px] font-semibold text-[#333] mb-1">Final Remarks</h4>
                  <p className="text-[13px] text-[#555] mb-2">{data.findings.finalRemarks}</p>
                </>
              )}
              {insp?.signatureUrl && (
                <>
                  <h4 className="text-[13px] font-semibold text-[#333] mb-1">Signature</h4>
                  <img
                    src={insp.signatureUrl}
                    alt="Inspector signature"
                    className="h-16 object-contain border border-[#e5e7eb] rounded bg-white"
                  />
                </>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default QCReportModal;
