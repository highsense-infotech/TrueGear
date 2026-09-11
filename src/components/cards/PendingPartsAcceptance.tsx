import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Package } from "lucide-react";
import toast from "react-hot-toast";
import {
  listPartsPendingAcceptance,
  acceptDispatchedPart,
  rejectDispatchedPart,
  type PendingAcceptanceItem,
} from "../../api/partsManager.api.ts";

export function PendingPartsAcceptance() {
  const [rows, setRows] = useState<PendingAcceptanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = () => {
    setLoading(true);
    listPartsPendingAcceptance()
      .then((res) => setRows(res.success ? res.data ?? [] : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleAccept = async (id: string) => {
    setBusyId(id);
    try {
      const res = await acceptDispatchedPart(id);
      if (res.success) {
        toast.success("Part accepted");
        setRows((prev) => prev.filter((r) => r.id !== id));
      } else {
        toast.error(res.error?.message ?? "Failed to accept part");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to accept part";
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  };

  const handleSubmitReject = async () => {
    if (!rejectingId) return;
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason");
      return;
    }
    setBusyId(rejectingId);
    try {
      const res = await rejectDispatchedPart(rejectingId, rejectReason.trim());
      if (res.success) {
        toast.success("Part rejected — sent back to Parts Manager");
        setRows((prev) => prev.filter((r) => r.id !== rejectingId));
        setRejectingId(null);
        setRejectReason("");
      } else {
        toast.error(res.error?.message ?? "Failed to reject part");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reject part";
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  };

  // Hide the panel entirely when nothing is pending — avoids dead space.
  if (!loading && rows.length === 0) return null;

  return (
    <div className="bg-white rounded-[10px] p-4 sm:p-5 md:p-6 mb-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between w-full text-left"
        aria-expanded={expanded}
      >
        <h2 className="text-[#333] text-[15px] sm:text-[16px] font-semibold flex items-center gap-2">
          <Package className="w-4 h-4 text-[#ff4f31]" />
          Pending Parts Acceptance
          <span className="text-[12px] font-normal text-[#999]">
            ({rows.length})
          </span>
        </h2>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-[#999]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#999]" />
        )}
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
                <div
                  key={r.id}
                  className="border border-[#e5e7eb] rounded-[10px] p-3 bg-[#fffdfc]"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-[#fff4ed] text-[#ff4f31]">
                      Dispatched · awaiting handover
                    </span>
                  </div>
                  <div className="text-[14px] font-semibold text-[#333] truncate">
                    {r.partName}
                  </div>
                  {r.partNumber && (
                    <div className="text-[11px] text-[#666] truncate">
                      P/N: {r.partNumber}
                    </div>
                  )}
                  <div className="text-[11px] text-[#999] mt-1">
                    Qty: {r.quantity}
                  </div>
                  <div className="text-[11px] text-[#666] truncate mt-2">
                    {r.registrationNumber || r.vin || "—"}
                  </div>
                  <div className="text-[11px] text-[#999] truncate">
                    {[r.brand, r.model].filter(Boolean).join(" ")}
                  </div>
                  {r.jobDescription && (
                    <div className="text-[11px] text-[#666] truncate mt-1 italic">
                      {r.jobDescription}
                    </div>
                  )}

                  {rejectingId === r.id ? (
                    <div className="mt-3">
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Reason for rejection (e.g. wrong part, damaged)"
                        rows={2}
                        className="w-full border border-[#e5e7eb] rounded-md px-2 py-1.5 text-[12px] resize-none focus:outline-none focus:border-[#999]"
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={handleSubmitReject}
                          disabled={busyId === r.id || !rejectReason.trim()}
                          className="flex-1 h-8 text-[12px] rounded-md bg-[#ff4f31] text-white disabled:opacity-50"
                        >
                          {busyId === r.id ? "..." : "Confirm"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRejectingId(null);
                            setRejectReason("");
                          }}
                          className="px-3 h-8 text-[12px] rounded-md border border-[#e5e7eb] text-[#666]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => handleAccept(r.id)}
                        disabled={busyId === r.id}
                        className="flex-1 h-8 text-[12px] rounded-md bg-[#00C853] text-white disabled:opacity-50 hover:bg-[#00b248] transition-colors"
                      >
                        {busyId === r.id ? "..." : "Accept"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectingId(r.id)}
                        className="flex-1 h-8 text-[12px] rounded-md border border-[#ff4f31] text-[#ff4f31] hover:bg-[#fff8f6] transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
