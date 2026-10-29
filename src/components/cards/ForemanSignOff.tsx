import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  listJobCardsAwaitingSignOff,
  signOffJobCard,
  rejectJobCard,
  type JobCardAwaitingSignOff,
} from "../../api/workshop.api.ts";
import SignaturePad from "../common/SignaturePad.tsx";
import Modal from "../common/Modal.tsx";
import Button from "../common/Button.tsx";

type Mode = "SIGN" | "REJECT" | null;

export function ForemanSignOff() {
  const [rows, setRows] = useState<JobCardAwaitingSignOff[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [modalMode, setModalMode] = useState<Mode>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    listJobCardsAwaitingSignOff()
      .then((res) => setRows(res.success ? res.data ?? [] : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const close = () => {
    setModalMode(null);
    setActiveId(null);
    setSignatureUrl(null);
    setReason("");
    setSubmitting(false);
  };

  const handleSignSubmit = async () => {
    if (!activeId || !signatureUrl) return;
    setSubmitting(true);
    try {
      const res = await signOffJobCard(activeId, signatureUrl);
      if (res.success) {
        toast.success("Job card signed off — sent to QC Out");
        setRows((prev) => prev.filter((r) => r.id !== activeId));
        close();
      } else {
        toast.error(res.error?.message ?? "Failed to sign off");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to sign off");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!activeId || reason.trim().length < 10) return;
    setSubmitting(true);
    try {
      const res = await rejectJobCard(activeId, reason.trim());
      if (res.success) {
        toast.success("Job card returned to technician");
        setRows((prev) => prev.filter((r) => r.id !== activeId));
        close();
      } else {
        toast.error(res.error?.message ?? "Failed to reject");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to reject");
    } finally {
      setSubmitting(false);
    }
  };

  if (!loading && rows.length === 0) return null;

  return (
    <div className="bg-white rounded-[10px] p-4 sm:p-5 md:p-6 mb-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between w-full text-left"
      >
        <h2 className="text-[#333] text-[15px] sm:text-[16px] font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#ff4f31]" />
          Awaiting Foreman Sign-Off
          <span className="text-[12px] font-normal text-[#999]">({rows.length})</span>
        </h2>
        {expanded ? <ChevronUp className="w-4 h-4 text-[#999]" /> : <ChevronDown className="w-4 h-4 text-[#999]" />}
      </button>

      {expanded && (
        <div className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-[#999]" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {rows.map((r) => (
                <div key={r.id} className="border border-[#e5e7eb] rounded-[10px] p-3 bg-[#fffdfc]">
                  <div className="text-[14px] font-semibold text-[#333] truncate">
                    {r.registrationNumber ?? "—"}
                  </div>
                  <div className="text-[12px] text-[#666] truncate">
                    {[r.brand, r.model].filter(Boolean).join(" ")}
                  </div>
                  <div className="text-[11px] text-[#999] mt-1">
                    Tech: {r.technicianUsername ?? "—"}
                  </div>
                  {r.totalEstimate && (
                    <div className="text-[11px] text-[#666] mt-1">
                      Est: {r.currencyCode ?? "ZAR"} {r.totalEstimate}
                    </div>
                  )}
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => { setActiveId(r.id); setModalMode("SIGN"); }}
                      className="flex-1 h-8 text-[12px] rounded-md bg-[#00C853] text-white hover:bg-[#00b248]"
                    >
                      Sign Off
                    </button>
                    <button
                      type="button"
                      onClick={() => { setActiveId(r.id); setModalMode("REJECT"); }}
                      className="flex-1 h-8 text-[12px] rounded-md border border-[#ff4f31] text-[#ff4f31] hover:bg-[#fff8f6]"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sign-Off Modal */}
      <Modal isOpen={modalMode === "SIGN"} onClose={close} title="Foreman Sign-Off" size="md">
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-[#666]">
            By signing, you confirm the work performed meets workshop standards and
            the vehicle is ready for QC Out.
          </p>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-[#666] mb-1">Foreman Signature *</p>
            <SignaturePad onChange={setSignatureUrl} disabled={submitting} />
          </div>
          <div className="flex gap-3 pt-1">
            <Button onClick={close} variant="secondary" className="flex-1" disabled={submitting}>Cancel</Button>
            <Button onClick={handleSignSubmit} className="flex-1" disabled={submitting || !signatureUrl}>
              {submitting ? "Signing..." : "Sign Off"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={modalMode === "REJECT"} onClose={close} title="Reject — Return to Technician" size="md">
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-[#666]">
            Describe what needs to be reworked. The job card goes back to IN_PROGRESS
            and the technician will see your note.
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Brake noise still present on test drive — re-check bleed."
            rows={4}
            disabled={submitting}
            className="w-full px-3 py-2 rounded-[10px] border border-[#e5e7eb] bg-white text-[14px] text-[#333] focus:outline-none focus:border-[#ff4f31] resize-y"
          />
          <p className="text-[11px] text-[#999]">
            {reason.trim().length}/10 characters{reason.trim().length < 10 && " — minimum not met"}
          </p>
          <div className="flex gap-3 pt-1">
            <Button onClick={close} variant="secondary" className="flex-1" disabled={submitting}>
              <X className="w-4 h-4 mr-1 inline" /> Cancel
            </Button>
            <Button
              onClick={handleRejectSubmit}
              className="flex-1"
              disabled={submitting || reason.trim().length < 10}
            >
              {submitting ? "Rejecting..." : "Reject"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
