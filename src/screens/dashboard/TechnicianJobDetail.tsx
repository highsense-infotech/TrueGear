import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import { ArrowLeft, Loader2, Play, Pause, CheckCircle2, Circle, History, ClipboardCheck } from "lucide-react";
import { VehicleCard } from "../../components/cards/VehicleCard";
import Modal from "../../components/common/Modal";
import Button from "../../components/common/Button";
import {
  getTechnicianJobDetail,
  startItemWork,
  pauseItemWork,
  completeItemWork,
  type TechnicianJobCardDetailData,
} from "../../api/serviceAdvisor.api";

const TAB_STATUS: Record<string, "pending" | "progress" | "completed"> = {
  IN_PROGRESS: "progress",
  COMPLETED: "completed",
};
const toTabStatus = (s: string) => TAB_STATUS[s] ?? "pending";

const statusConfig = {
  pending: { label: "Pending", bg: "bg-[#ffe1b7]", text: "text-[#e89d00]" },
  progress: { label: "In Progress", bg: "bg-[#b7d4ff]", text: "text-[#0061FF]" },
  completed: { label: "Completed", bg: "bg-[#b3ffbd]", text: "text-[#00bf06]" },
} as const;

const priorityStyle: Record<string, string> = {
  HIGH: "bg-red-50 text-red-600 border-red-200",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
  LOW: "bg-slate-50 text-slate-600 border-slate-200",
};

const pad = (n: number) => n.toString().padStart(2, "0");
const formatDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return hrs > 0 ? `${hrs}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
};

const formatStamp = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const TechnicianJobDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // When the dashboard links here with ?item=<itemId>, scope the detail view
  // to that single item only — the technician clicked a specific task, not
  // the whole card. Omit the param to fall back to the all-items view.
  const focusedItemId = searchParams.get("item");

  const [data, setData] = useState<TechnicianJobCardDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [historyOpenFor, setHistoryOpenFor] = useState<Record<string, boolean>>({});
  // Complete-Job modal state — keyed by the item being completed.
  const [completeForId, setCompleteForId] = useState<string | null>(null);
  const [completeNotes, setCompleteNotes] = useState("");
  const [completeSubmitting, setCompleteSubmitting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  // Local "now" tick — used to advance running-item displays without re-fetching.
  const [nowMs, setNowMs] = useState(() => Date.now());
  const tickRef = useRef<number | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    const res = await getTechnicianJobDetail(id);
    if (res.success && res.data) {
      setData(res.data);
      setError(null);
    } else {
      setError(res.error?.message ?? "Failed to load job");
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    fetchDetail().finally(() => setLoading(false));
  }, [fetchDetail]);

  // Tick once a second whenever any item is running so the live timer updates.
  useEffect(() => {
    const hasRunning = data?.items.some((i) => i.isRunning) ?? false;
    if (hasRunning && tickRef.current === null) {
      tickRef.current = window.setInterval(() => setNowMs(Date.now()), 1000);
    } else if (!hasRunning && tickRef.current !== null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    return () => {
      if (tickRef.current !== null) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [data]);

  const openCompleteModal = (itemId: string) => {
    setCompleteForId(itemId);
    setCompleteNotes("");
    setCompleteError(null);
  };

  const closeCompleteModal = () => {
    if (completeSubmitting) return;
    setCompleteForId(null);
    setCompleteNotes("");
    setCompleteError(null);
  };

  const submitComplete = async () => {
    if (!completeForId) return;
    setCompleteSubmitting(true);
    setCompleteError(null);
    try {
      const res = await completeItemWork(completeForId, completeNotes.trim());
      if (res.success) {
        toast.success("Job completed");
        await fetchDetail();
        setCompleteForId(null);
        setCompleteNotes("");
      } else {
        setCompleteError(res.error?.message ?? "Failed to complete job");
      }
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "response" in e
        ? ((e as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ?? "Failed to complete job")
        : "Failed to complete job";
      setCompleteError(msg);
    } finally {
      setCompleteSubmitting(false);
    }
  };

  const callItemAction = async (
    itemId: string,
    fn: (id: string) => Promise<{ success: { status: true } | null; error: { message: string } | null }>,
    successMsg: string,
  ) => {
    setBusyId(itemId);
    try {
      const res = await fn(itemId);
      if (res.success) {
        toast.success(successMsg);
        await fetchDetail();
      } else {
        toast.error(res.error?.message ?? "Action failed");
      }
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "response" in e
        ? ((e as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ?? "Action failed")
        : "Action failed";
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[#ff4f31]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-5 text-[#999] hover:text-[#333] transition-colors"
        >
          <ArrowLeft size={16} />
          <span className="font-normal text-[14px]">Back to Jobs</span>
        </button>
        <div className="bg-white rounded-xl p-8 text-center mt-4">
          <p className="text-[#333] text-lg">{error ?? "Job not found"}</p>
        </div>
      </>
    );
  }

  const { jobCard, items: allItems, vehicle } = data;
  // Filter to the focused item when one was passed in the URL — otherwise
  // show every item on this job card.
  const items = focusedItemId
    ? allItems.filter((i) => i.id === focusedItemId)
    : allItems;
  const totalSeconds = items.reduce((s, i) => s + i.totalSeconds, 0);

  const tab = toTabStatus(jobCard.status);
  const status = statusConfig[tab];
  const vehicleNumber = vehicle?.registrationNumber?.toUpperCase() ?? "—";
  const vehicleModel = vehicle ? `${vehicle.brand} ${vehicle.model}` : "—";

  const completedCount = items.filter((i) => i.completedAt).length;

  // Compute live seconds for a running item by adding (now - lastStart) to its
  // server-reported total (which only counts closed sessions accurately).
  const liveSeconds = (item: typeof items[number]): number => {
    if (!item.isRunning) return item.totalSeconds;
    const openLog = item.timeLogs.find((l) => l.pausedAt === null);
    if (!openLog) return item.totalSeconds;
    // server total already includes this open log up to its computed-at moment;
    // recompute it precisely from logs to avoid double-counting drift.
    const closedTotal = item.timeLogs
      .filter((l) => l.pausedAt !== null)
      .reduce((sum, l) => sum + l.durationSeconds, 0);
    const liveOpen = Math.max(0, Math.floor((nowMs - new Date(openLog.startedAt).getTime()) / 1000));
    return closedTotal + liveOpen;
  };

  return (
    <>
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 mb-5 text-[#999] hover:text-[#333] transition-colors"
      >
        <ArrowLeft size={16} />
        <span className="font-normal text-[14px]">Back to Jobs</span>
      </button>

      {/* Vehicle Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="font-semibold text-[22px] sm:text-[24px] text-[#333] leading-[1.2] mb-1">
            {vehicleNumber}
          </h2>
          <p className="font-normal text-[15px] sm:text-[16px] text-[#999] leading-[1.2]">
            {vehicleModel}
          </p>
        </div>
        <div className={`${status.bg} px-5 py-2 rounded-lg`}>
          <span className={`font-semibold text-[14px] sm:text-[16px] ${status.text}`}>
            {status.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-6">
        <VehicleCard vehicleNumber={vehicleNumber} vehicleName={vehicleModel} />
      </div>

      {/* Tasks header w/ aggregate total */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-semibold text-[16px] sm:text-[18px] text-[#333]">Tasks</h3>
        <div className="flex items-center gap-3 text-[12px] sm:text-[13px] text-[#666]">
          <span>{completedCount} / {items.length} completed</span>
          <span className="font-mono tabular-nums text-[#333] font-semibold">
            Total: {formatDuration(totalSeconds + items.filter((i) => i.isRunning).reduce((s, i) => s + (liveSeconds(i) - i.totalSeconds), 0))}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {items.map((item) => {
          const isComplete = !!item.completedAt;
          const isRunning = item.isRunning;
          const seconds = liveSeconds(item);
          const priorityCls = priorityStyle[item.priority ?? "MEDIUM"] ?? priorityStyle.MEDIUM;
          const showHistory = !!historyOpenFor[item.id];

          return (
            <div
              key={item.id}
              className={`rounded-xl border p-4 transition-colors ${
                isComplete ? "bg-emerald-50 border-emerald-200" : "bg-white border-[#e5e7eb]"
              }`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {/* Status indicator only — clicking does NOT complete the
                      item. Completion now happens via the explicit "Complete
                      Job" button + comments modal below. */}
                  <div
                    className="shrink-0 mt-0.5 text-[#999]"
                    title={isComplete ? "Completed" : "Not completed"}
                  >
                    {isComplete ? (
                      <CheckCircle2 size={22} className="text-[#04c397]" />
                    ) : (
                      <Circle size={22} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-[14px] sm:text-[15px] font-semibold text-[#333] wrap-break-word ${
                      isComplete ? "line-through text-[#666]" : ""
                    }`}>
                      {item.jobDescription}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {item.estimatedHours && (
                        <span className="text-[11px] sm:text-[12px] text-[#666] bg-[#f5f5f5] px-2 py-0.5 rounded">
                          Est. {item.estimatedHours}h
                        </span>
                      )}
                      {item.priority && (
                        <span className={`text-[11px] sm:text-[12px] font-medium px-2 py-0.5 rounded border ${priorityCls}`}>
                          {item.priority}
                        </span>
                      )}
                      {item.partsRequired && (
                        <span className="text-[11px] sm:text-[12px] text-[#666] bg-[#f5f5f5] px-2 py-0.5 rounded">
                          Parts: {item.partsRequired}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className={`font-mono font-semibold text-[16px] sm:text-[18px] tabular-nums ${
                      isRunning ? "text-[#ff4f31]" : "text-[#333]"
                    }`}>
                      {formatDuration(seconds)}
                    </p>
                    <p className="text-[10px] sm:text-[11px] text-[#999]">
                      {isComplete ? "completed" : isRunning ? "running" : "paused"}
                    </p>
                  </div>
                  {!isComplete && (
                    <button
                      onClick={() =>
                        callItemAction(
                          item.id,
                          isRunning ? pauseItemWork : startItemWork,
                          isRunning ? "Paused" : "Started",
                        )
                      }
                      disabled={busyId === item.id}
                      className={`flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full shadow-md transition-opacity disabled:opacity-40 ${
                        isRunning
                          ? "bg-[#0061FF] text-white"
                          : "bg-linear-to-b from-[#ff4f31] to-[#fe2b73] text-white"
                      }`}
                      title={isRunning ? "Pause" : "Start"}
                    >
                      {busyId === item.id ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : isRunning ? (
                        <Pause size={18} />
                      ) : (
                        <Play size={18} />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Complete Job CTA — opens the comments modal. Hidden once
                  the item is complete. */}
              {!isComplete && (
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="gradient"
                    icon={<ClipboardCheck size={16} />}
                    onClick={() => openCompleteModal(item.id)}
                    disabled={busyId === item.id}
                  >
                    Complete Job
                  </Button>
                </div>
              )}

              {/* Completion notes — only shown once the item is finished. */}
              {isComplete && item.completionNotes && (
                <div className="mt-3 pt-3 border-t border-emerald-200">
                  <p className="text-[11px] uppercase tracking-wide text-[#666] mb-1">
                    Completion notes
                  </p>
                  <p className="text-[13px] text-[#333] whitespace-pre-wrap">
                    {item.completionNotes}
                  </p>
                </div>
              )}

              {/* History toggle + list */}
              {item.timeLogs.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#e5e7eb]">
                  <button
                    onClick={() =>
                      setHistoryOpenFor((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                    }
                    className="flex items-center gap-1.5 text-[12px] text-[#666] hover:text-[#333] transition-colors"
                  >
                    <History size={13} />
                    {showHistory ? "Hide" : "Show"} history ({item.timeLogs.length} session{item.timeLogs.length === 1 ? "" : "s"})
                  </button>
                  {showHistory && (
                    <ul className="mt-2 space-y-1">
                      {item.timeLogs.map((l, idx) => (
                        <li key={l.id} className="flex items-center justify-between text-[12px] text-[#555]">
                          <span>
                            #{idx + 1} · {formatStamp(l.startedAt)} → {formatStamp(l.pausedAt)}
                          </span>
                          <span className="font-mono tabular-nums">
                            {formatDuration(
                              l.pausedAt === null
                                ? Math.max(0, Math.floor((nowMs - new Date(l.startedAt).getTime()) / 1000))
                                : l.durationSeconds,
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Complete Job modal — captures the technician's wrap-up comments. */}
      <Modal
        isOpen={completeForId !== null}
        onClose={closeCompleteModal}
        title="Complete Job"
        size="md"
      >
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-[#666]">
            Add any final comments about the work performed. The job will be
            marked complete and any running timer will stop.
          </p>
          <textarea
            value={completeNotes}
            onChange={(e) => setCompleteNotes(e.target.value)}
            disabled={completeSubmitting}
            placeholder="e.g. Replaced filter, system tested OK."
            rows={5}
            className="w-full px-3 py-2 rounded-[10px] border border-[#e5e7eb] bg-white text-[14px] text-[#333] focus:outline-none focus:border-[#ff4f31] resize-y"
          />
          {completeError && (
            <div className="bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-[13px] px-3 py-2 rounded-lg">
              {completeError}
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <Button
              onClick={closeCompleteModal}
              variant="secondary"
              className="flex-1"
              disabled={completeSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={submitComplete}
              className="flex-1"
              disabled={completeSubmitting}
            >
              {completeSubmitting ? "Completing..." : "Complete Job"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default TechnicianJobDetail;
