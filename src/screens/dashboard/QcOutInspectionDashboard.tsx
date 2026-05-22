import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Camera, X, Check, CheckCircle2, AlertCircle } from "lucide-react";
import Button from "../../components/common/Button";
import SignaturePad from "../../components/common/SignaturePad";
import {
  getQcOutDashboard,
  getQcOutChecklist,
  uploadQcOutPhoto,
  submitQcOut,
  getCompletedWorks,
  type QcOutDashboardData,
  type QcOutChecklistItem,
  type QcOutItemStatus,
  type QcOutCompletedWork,
} from "../../api/qcOutInspection.api";
import { Pagination } from "../../components/common/Pagination";

// Each checklist row's UI state during a live inspection. `photoUrls` are
// S3 keys returned by the upload endpoint; we send them along with submit.
type RowState = {
  status: QcOutItemStatus;
  notes: string;
  photoUrls: string[];
  uploading: boolean;
};

const STATUS_CLS: Record<QcOutItemStatus, string> = {
  PASS: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FAIL: "bg-red-50 text-red-700 border-red-200",
  NA: "bg-slate-50 text-slate-600 border-slate-200",
};

export default function QcOutInspectionDashboard() {
  const [data, setData] = useState<QcOutDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [recentPage, setRecentPage] = useState(1);
  const [recentPageSize, setRecentPageSize] = useState(10);
  const [recentTotalPages, setRecentTotalPages] = useState(1);
  const [recentTotal, setRecentTotal] = useState(0);

  // Inspection mode
  const [activeCheckInId, setActiveCheckInId] = useState<string | null>(null);
  const [activeMeta, setActiveMeta] = useState<{ reg: string; model: string } | null>(null);
  const [checklist, setChecklist] = useState<QcOutChecklistItem[]>([]);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [remarks, setRemarks] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // ── Works Completed tab state ──
  const [activeTab, setActiveTab] = useState<"works" | "checklist">("works");
  const [works, setWorks] = useState<QcOutCompletedWork[]>([]);
  const [worksState, setWorksState] = useState<Record<string, { result: QcOutItemStatus | null; notes: string }>>({});

  const fetchDash = async () => {
    setLoading(true);
    const res = await getQcOutDashboard({ page, limit: pageSize, recentPage, recentLimit: recentPageSize });
    if (res.success && res.data) {
      setData(res.data);
      setTotal(res.data.pagination?.total ?? res.data.awaiting.length);
      setTotalPages(res.data.pagination?.totalPages ?? 1);
      setRecentTotal(res.data.recentPagination?.total ?? res.data.recent.length);
      setRecentTotalPages(res.data.recentPagination?.totalPages ?? 1);
    }
    setLoading(false);
  };

  useEffect(() => { fetchDash(); /* eslint-disable-next-line */ }, [page, pageSize, recentPage, recentPageSize]);

  const startInspection = async (checkInId: string, reg: string, model: string) => {
    setActiveCheckInId(checkInId);
    setActiveMeta({ reg, model });
    setRemarks("");
    setSignatureDataUrl(null);
    setActiveTab("works");
    const [cl, w] = await Promise.all([getQcOutChecklist(), getCompletedWorks(checkInId)]);
    if (cl.success && cl.data) {
      setChecklist(cl.data);
      const seed: Record<string, RowState> = {};
      for (const c of cl.data) {
        seed[c.id] = { status: "PASS", notes: "", photoUrls: [], uploading: false };
      }
      setRows(seed);
    }
    if (w.success && w.data) {
      setWorks(w.data);
      const seedW: Record<string, { result: QcOutItemStatus | null; notes: string }> = {};
      for (const it of w.data) seedW[it.id] = { result: null, notes: "" };
      setWorksState(seedW);
    } else {
      setWorks([]);
      setWorksState({});
    }
  };

  const cancelInspection = () => {
    setActiveCheckInId(null);
    setActiveMeta(null);
    setChecklist([]);
    setRows({});
    setRemarks("");
    setSignatureDataUrl(null);
  };

  const updateRow = (id: string, patch: Partial<RowState>) => {
    setRows((p) => ({ ...p, [id]: { ...p[id], ...patch } }));
  };

  const addPhoto = async (id: string, file: File) => {
    updateRow(id, { uploading: true });
    try {
      const res = await uploadQcOutPhoto(file);
      if (res.success && res.data) {
        setRows((p) => ({
          ...p,
          [id]: { ...p[id], uploading: false, photoUrls: [...p[id].photoUrls, res.data!.imageUrl] },
        }));
      } else {
        updateRow(id, { uploading: false });
        toast.error(res.error?.message ?? "Upload failed");
      }
    } catch {
      updateRow(id, { uploading: false });
      toast.error("Upload failed");
    }
  };

  const removePhoto = (id: string, url: string) => {
    setRows((p) => ({ ...p, [id]: { ...p[id], photoUrls: p[id].photoUrls.filter((u) => u !== url) } }));
  };

  const submit = async () => {
    if (!activeCheckInId) return;
    // Works Completed gate: every completed work must have a verification
    // (PASS/FAIL/NA) before signing out.
    for (const w of works) {
      if (!worksState[w.id]?.result) {
        toast.error(`Verify "${w.jobDescription}" before submitting.`);
        setActiveTab("works");
        return;
      }
    }
    // Client-side guard mirrors the backend rule: every FAIL row needs at
    // least one photo. Surface the error inline so the inspector knows
    // which row to fix without round-tripping.
    for (const c of checklist) {
      const r = rows[c.id];
      if (r.status === "FAIL" && r.photoUrls.length === 0) {
        toast.error(`"${c.label}" failed — add at least one photo.`);
        return;
      }
    }
    if (!signatureDataUrl) {
      toast.error("Please sign before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const anyChecklistFail = checklist.some((c) => rows[c.id]?.status === "FAIL");
      const anyWorkFail = works.some((w) => worksState[w.id]?.result === "FAIL");
      const overallStatus: "PASS" | "FAIL" = (anyChecklistFail || anyWorkFail) ? "FAIL" : "PASS";
      // Upload the signature inline (small endpoint not in scope; we send
      // the data URL via the submit body — server-side we leave the column
      // as-is for now; FE-only validation).
      const items = checklist.map((c, idx) => ({
        itemLabel: c.label,
        status: rows[c.id].status,
        notes: rows[c.id].notes,
        sortOrder: idx,
        photoUrls: rows[c.id].photoUrls,
      }));

      const worksPayload = works.map((w) => ({
        jobCardItemId: w.id,
        result: worksState[w.id].result as QcOutItemStatus,
        notes: worksState[w.id].notes || undefined,
      }));

      const res = await submitQcOut(activeCheckInId, {
        overallStatus,
        finalRemarks: remarks.trim() || undefined,
        signatureImageUrl: signatureDataUrl ?? undefined,
        items,
        works: worksPayload,
      });
      if (res.success) {
        toast.success(`QC ${overallStatus === "PASS" ? "passed → moved to washbay" : "FAILED → returned to workshop"}`);
        cancelInspection();
        await fetchDash();
      } else {
        toast.error(res.error?.message ?? "Submission failed");
      }
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "response" in e
        ? ((e as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ?? "Submission failed")
        : "Submission failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ────────── Inspection mode ──────────
  if (activeCheckInId) {
    const verifiedCount = works.filter((w) => worksState[w.id]?.result).length;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-[18px] font-semibold text-[#333]">QC Out Inspection</h2>
            <p className="text-[13px] text-[#666]">{activeMeta?.reg} · {activeMeta?.model}</p>
          </div>
          <Button variant="secondary" onClick={cancelInspection} disabled={submitting}>Cancel</Button>
        </div>

        {/* ── Tabs: Works Completed (new) + Checklist ── */}
        <div className="flex gap-1 bg-[#f5f5f5] p-1 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("works")}
            className={`px-3 py-1.5 text-[13px] rounded-md transition ${
              activeTab === "works" ? "bg-white text-[#333] shadow-sm font-semibold" : "text-[#666]"
            }`}
          >
            Works Completed ({verifiedCount}/{works.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("checklist")}
            className={`px-3 py-1.5 text-[13px] rounded-md transition ${
              activeTab === "checklist" ? "bg-white text-[#333] shadow-sm font-semibold" : "text-[#666]"
            }`}
          >
            Checklist
          </button>
        </div>

        {/* ── Works Completed tab content ── */}
        {activeTab === "works" && (
          <div className="space-y-3">
            {works.length === 0 ? (
              <div className="bg-white border border-[#e5e7eb] rounded-xl p-6 text-center text-[13px] text-[#999]">
                No completed works on this visit yet.
              </div>
            ) : (
              works.map((w) => {
                const wState = worksState[w.id] ?? { result: null, notes: "" };
                return (
                  <div key={w.id} className="bg-white border border-[#e5e7eb] rounded-xl p-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold text-[#333]">
                          {w.jobDescription}
                          {w.isWarrantyClaim && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-[#fef3c7] text-[#92400e] font-semibold">
                              WARRANTY
                            </span>
                          )}
                        </p>
                        <p className="text-[12px] text-[#666] mt-0.5">
                          {w.partsRequired ? `Parts: ${w.partsRequired} · ` : ""}
                          Tech: {w.technicianName ?? "—"}
                          {w.completedAt ? ` · Done ${new Date(w.completedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}` : ""}
                        </p>
                        {w.completionNotes && (
                          <p className="text-[11px] text-[#999] mt-1 italic">"{w.completionNotes}"</p>
                        )}
                        {w.repairPhotos.length > 0 && (
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {w.repairPhotos.map((url, idx) => (
                              <a
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="w-14 h-14 rounded border border-[#e5e7eb] overflow-hidden bg-[#fafafa]"
                              >
                                <img src={url} alt="" className="w-full h-full object-cover" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {(["PASS", "FAIL", "NA"] as QcOutItemStatus[]).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setWorksState((p) => ({ ...p, [w.id]: { ...p[w.id], result: s } }))}
                            className={`px-3 py-1 rounded-md border text-[12px] font-medium transition-colors ${
                              wState.result === s
                                ? STATUS_CLS[s]
                                : "border-[#e5e7eb] bg-white text-[#666] hover:bg-[#fafafa]"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    {wState.result === "FAIL" && (
                      <textarea
                        value={wState.notes}
                        onChange={(e) => setWorksState((p) => ({ ...p, [w.id]: { ...p[w.id], notes: e.target.value } }))}
                        rows={2}
                        placeholder="What's wrong with this repair?"
                        className="mt-2 w-full px-3 py-2 rounded-md border border-[#e5e7eb] bg-white text-[13px] focus:outline-none focus:border-[#ff4f31] resize-y"
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === "checklist" && (
        <div className="space-y-3">
          {checklist.map((c) => {
            const r = rows[c.id];
            if (!r) return null;
            return (
              <div key={c.id} className="bg-white border border-[#e5e7eb] rounded-xl p-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-[14px] font-medium text-[#333]">{c.label}</p>
                  <div className="flex gap-2">
                    {(["PASS", "FAIL", "NA"] as QcOutItemStatus[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => updateRow(c.id, { status: s })}
                        className={`px-3 py-1 rounded-md border text-[12px] font-medium transition-colors ${
                          r.status === s ? STATUS_CLS[s] : "border-[#e5e7eb] bg-white text-[#666] hover:bg-[#fafafa]"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {r.status === "FAIL" && (
                  <div className="mt-2">
                    <textarea
                      value={r.notes}
                      onChange={(e) => updateRow(c.id, { notes: e.target.value })}
                      rows={2}
                      disabled={submitting}
                      placeholder="What's wrong?"
                      className="w-full px-3 py-2 rounded-md border border-[#e5e7eb] bg-white text-[13px] focus:outline-none focus:border-[#ff4f31] resize-y mb-2"
                    />
                    <div className="flex flex-wrap gap-2">
                      {r.photoUrls.map((url) => (
                        <div key={url} className="relative">
                          <div className="w-14 h-14 rounded border border-[#e5e7eb] bg-[#fafafa] flex items-center justify-center text-[10px] text-[#666] px-1 text-center">
                            photo
                          </div>
                          <button
                            onClick={() => removePhoto(c.id, url)}
                            className="absolute -top-1 -right-1 bg-white border border-[#e5e7eb] rounded-full w-4 h-4 flex items-center justify-center text-[#ef4444]"
                            title="Remove"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                      <label className="cursor-pointer flex items-center gap-1 text-[11px] text-[#666] hover:text-[#ff4f31] border border-dashed border-[#e5e7eb] rounded px-2 py-1">
                        {r.uploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                        Add photo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={r.uploading || submitting}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) addPhoto(c.id, f);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                    <p className="text-[11px] text-red-700 mt-1.5">At least one photo is required when FAIL is selected.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        )}

        <div className="bg-white border border-[#e5e7eb] rounded-xl p-3">
          <label className="block text-[13px] font-medium text-[#333] mb-1">Final remarks</label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={2}
            disabled={submitting}
            placeholder="Anything else to note?"
            className="w-full px-3 py-2 rounded-md border border-[#e5e7eb] bg-white text-[13px] focus:outline-none focus:border-[#ff4f31] resize-y"
          />
          <div className="mt-3">
            <p className="block text-[13px] font-medium text-[#333] mb-1">Inspector signature *</p>
            <SignaturePad onChange={setSignatureDataUrl} disabled={submitting} />
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={cancelInspection} disabled={submitting}>Cancel</Button>
          <Button variant="gradient" className="flex-1" onClick={submit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Inspection"}
          </Button>
        </div>
      </div>
    );
  }

  // ────────── Dashboard mode ──────────
  return (
    <>
      <h2 className="text-[18px] font-semibold text-[#333] mb-4">QC Out</h2>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[#ff4f31]" />
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h3 className="text-[14px] font-semibold text-[#333] mb-2">Awaiting QC Out</h3>
            {data?.awaiting.length === 0 ? (
              <div className="bg-white border border-[#e5e7eb] rounded-xl p-8 text-center text-[14px] text-[#999]">
                No vehicles awaiting QC Out.
              </div>
            ) : (
              <div className="space-y-2">
                {data?.awaiting.map((v) => (
                  <div key={v.checkInId} className="bg-white border border-[#e5e7eb] rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-[#333]">
                        {(v.registrationNumber ?? "—").toUpperCase()}
                        {v.receivingNo && <span className="ml-2 text-[12px] text-[#ff4f31] font-semibold">{v.receivingNo}</span>}
                      </p>
                      <p className="text-[12px] text-[#666]">{v.brand} {v.model}{v.customerName ? ` · ${v.customerName}` : ""}</p>
                    </div>
                    <Button variant="gradient" onClick={() => startInspection(v.checkInId, v.registrationNumber ?? "", `${v.brand} ${v.model}`)}>
                      Start Inspection
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {total > 0 && (
              <div className="mt-3 pt-2 border-t border-[#f0f0f0]">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={total}
                  itemsPerPage={pageSize}
                  onPageChange={setPage}
                  onItemsPerPageChange={(l) => {
                    setPageSize(l);
                    setPage(1);
                  }}
                />
              </div>
            )}
          </div>

          <div>
            <h3 className="text-[14px] font-semibold text-[#333] mb-2">Recent decisions</h3>
            {data?.recent.length === 0 ? (
              <p className="text-[13px] text-[#999]">No inspections yet.</p>
            ) : (
              <div className="space-y-1.5">
                {data?.recent.map((r) => (
                  <div key={r.id} className="bg-white border border-[#e5e7eb] rounded-lg p-2.5 flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-[#333]">
                        {(r.registrationNumber ?? "—").toUpperCase()} · {r.brand} {r.model}
                      </p>
                      <p className="text-[11px] text-[#999]">
                        {new Date(r.completedAt).toLocaleString()}
                        {r.inspectorName && <> · by {r.inspectorName}</>}
                      </p>
                    </div>
                    <span className={`text-[12px] font-semibold px-2.5 py-0.5 rounded border ${r.overallStatus === "PASS" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                      {r.overallStatus === "PASS" ? <span className="inline-flex items-center gap-1"><CheckCircle2 size={12} /> PASS</span> : <span className="inline-flex items-center gap-1"><AlertCircle size={12} /> FAIL</span>}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {recentTotal > 0 && (
              <div className="mt-3 pt-2 border-t border-[#f0f0f0]">
                <Pagination
                  currentPage={recentPage}
                  totalPages={recentTotalPages}
                  totalItems={recentTotal}
                  itemsPerPage={recentPageSize}
                  onPageChange={setRecentPage}
                  onItemsPerPageChange={(l) => {
                    setRecentPageSize(l);
                    setRecentPage(1);
                  }}
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* eslint-disable-next-line @typescript-eslint/no-unused-vars */}
      {/* `Check` import kept for future per-item PASS chip styling */}
      <span style={{ display: "none" }}>{<Check size={0} />}</span>
    </>
  );
}
