import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Minus } from "lucide-react";
import Modal from "../common/Modal";
import { getQcComparison, type QcComparison } from "../../api/qcOutInspection.api";

interface Props {
  isOpen: boolean;
  checkInId: string | null;
  /** Header subtitle (e.g. "GJ05SV0123 — FAW J6 500"). */
  subtitle?: string;
  onClose: () => void;
}

const RESULT_CLS: Record<string, string> = {
  PASS: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FAIL: "bg-red-50 text-red-700 border-red-200",
  NA:   "bg-slate-50 text-slate-600 border-slate-200",
};

const resultPill = (r: string | null) =>
  r ? <span className={`text-[10px] px-1.5 py-0.5 rounded border ${RESULT_CLS[r] ?? RESULT_CLS.NA}`}>{r}</span>
    : <span className="text-[10px] text-[#bbb]">—</span>;

/**
 * QC In vs QC Out comparison report — surfaces workshop damage (PASS at
 * entry, FAIL at exit) and fixed items. Phase 9 — 3.10 Gap B.
 */
export default function QcDamageReport({ isOpen, checkInId, subtitle, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<QcComparison | null>(null);
  const [filter, setFilter] = useState<"all" | "damage" | "fixed" | "missing">("all");

  useEffect(() => {
    if (!isOpen || !checkInId) {
      setData(null);
      return;
    }
    setLoading(true);
    setData(null);
    getQcComparison(checkInId)
      .then((res) => setData(res.success ? res.data ?? null : null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [isOpen, checkInId]);

  const rows = data?.rows ?? [];
  const visibleRows =
    filter === "damage"  ? rows.filter((r) => r.damage)
    : filter === "fixed" ? rows.filter((r) => r.fixed)
    : filter === "missing" ? rows.filter((r) => r.missingAtOut)
    : rows;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="QC In vs QC Out — Damage Report" size="lg">
      <div className="flex flex-col gap-3">
        {subtitle && <p className="text-[12px] text-[#666]">{subtitle}</p>}

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-[#999]" />
          </div>
        ) : !data || (!data.qcInInspectionId || !data.qcOutInspectionId) ? (
          <p className="text-center text-[#999] text-sm py-8">
            Comparison not available — both QC In and QC Out must be completed.
          </p>
        ) : (
          <>
            {/* Summary chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="border border-[#e5e7eb] rounded-[10px] p-3 bg-[#fafafa]">
                <p className="text-[10px] uppercase tracking-wide text-[#666]">Total items</p>
                <p className="text-[18px] font-semibold text-[#333]">{data.summary.total}</p>
              </div>
              <div className="border border-red-200 rounded-[10px] p-3 bg-red-50">
                <p className="text-[10px] uppercase tracking-wide text-red-700 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Workshop damage
                </p>
                <p className="text-[18px] font-semibold text-red-700">{data.summary.damageCount}</p>
              </div>
              <div className="border border-emerald-200 rounded-[10px] p-3 bg-emerald-50">
                <p className="text-[10px] uppercase tracking-wide text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Fixed during service
                </p>
                <p className="text-[18px] font-semibold text-emerald-700">{data.summary.fixedCount}</p>
              </div>
              <div className="border border-[#e5e7eb] rounded-[10px] p-3 bg-[#fafafa]">
                <p className="text-[10px] uppercase tracking-wide text-[#666] flex items-center gap-1">
                  <Minus className="w-3 h-3" /> Not inspected at out
                </p>
                <p className="text-[18px] font-semibold text-[#666]">{data.summary.missingAtOutCount}</p>
              </div>
            </div>

            {/* Filter chips */}
            <div className="flex gap-1 bg-[#f5f5f5] p-1 rounded-[8px] w-fit">
              {(["all", "damage", "fixed", "missing"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`px-3 h-8 text-xs rounded-md transition-colors ${
                    filter === f ? "bg-white text-[#333] shadow-sm" : "text-[#666] hover:bg-[#eee]"
                  }`}
                >
                  {f === "all" ? "All" : f === "damage" ? "Damage" : f === "fixed" ? "Fixed" : "Missing"}
                </button>
              ))}
            </div>

            {/* Comparison table */}
            {visibleRows.length === 0 ? (
              <p className="text-center text-[#999] text-sm py-8">No items match this filter.</p>
            ) : (
              <div className="overflow-x-auto border border-[#e5e7eb] rounded-[10px]">
                <table className="w-full text-[12px]">
                  <thead className="bg-[#fafafa] border-b border-[#e5e7eb]">
                    <tr className="text-left">
                      <th className="px-3 py-2 font-medium text-[#666]">Category</th>
                      <th className="px-3 py-2 font-medium text-[#666]">Item</th>
                      <th className="px-3 py-2 font-medium text-[#666]">QC In</th>
                      <th className="px-3 py-2 font-medium text-[#666]">QC Out</th>
                      <th className="px-3 py-2 font-medium text-[#666]">Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((r, i) => (
                      <tr
                        key={`${r.qcInItemId ?? "x"}-${r.qcOutItemId ?? "x"}-${i}`}
                        className={`border-b border-[#f0f0f0] ${
                          r.damage ? "bg-red-50/40" : r.fixed ? "bg-emerald-50/40" : ""
                        }`}
                      >
                        <td className="px-3 py-2 text-[#666]">
                          {r.category ?? "—"}
                          {r.subCategory && <div className="text-[10px] text-[#999]">{r.subCategory}</div>}
                        </td>
                        <td className="px-3 py-2 text-[#333]">{r.itemLabel}</td>
                        <td className="px-3 py-2">
                          {resultPill(r.qcInResult)}
                          {r.qcInComment && <div className="text-[10px] text-[#999] mt-1">{r.qcInComment}</div>}
                        </td>
                        <td className="px-3 py-2">
                          {resultPill(r.qcOutResult)}
                          {r.qcOutNotes && <div className="text-[10px] text-[#999] mt-1">{r.qcOutNotes}</div>}
                        </td>
                        <td className="px-3 py-2">
                          {r.damage && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-red-700 inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Damage
                            </span>
                          )}
                          {r.fixed && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Fixed
                            </span>
                          )}
                          {r.missingAtOut && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-[#999]">
                              Not inspected
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
