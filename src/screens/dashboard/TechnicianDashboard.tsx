import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StatCard } from "../../components/cards/StatCard.tsx";
import { Wrench, Clock, Loader2 } from "lucide-react";
import { ROUTES } from "../../constants/routes";
import { getMyTechnicianJobs, type TechnicianItem } from "../../api/serviceAdvisor.api";

const statusConfig = {
  pending: { label: "Pending", bg: "bg-[#FFE1B7]", text: "text-[#E89D00]" },
  progress: { label: "In Progress", bg: "bg-[#e3f2fd]", text: "text-[#1976d2]" },
  completed: { label: "Completed", bg: "bg-[#e8f5e9]", text: "text-[#388e3c]" },
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

const TechnicianDashboard = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<TechnicianItem[]>([]);
  const [stats, setStats] = useState({ pending: 0, inProgress: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "progress" | "completed">("pending");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getMyTechnicianJobs()
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          setItems(res.data.items);
          setStats(res.data.stats);
        } else {
          setError(res.error?.message ?? "Failed to load jobs");
        }
      })
      .catch(() => { if (!cancelled) setError("Failed to load jobs"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const pad2 = (n: number) => n.toString().padStart(2, "0");
  const visible = items.filter((i) => i.status === activeTab);

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-7.5">
        <StatCard
          title="Pending"
          value={pad2(stats.pending)}
          change=""
          icon={<Clock className="w-7 h-7 sm:w-8 sm:h-8 text-[#E89D00]" strokeWidth={3} />}
        />
        <StatCard
          title="In Progress"
          value={pad2(stats.inProgress)}
          change=""
          icon={<Wrench className="w-7 h-7 sm:w-8 sm:h-8 text-[#0061FF]" strokeWidth={3} />}
        />
        <StatCard
          title="Completed"
          value={pad2(stats.completed)}
          change=""
          icon={<Clock className="w-7 h-7 sm:w-8 sm:h-8 text-[#00BF06]" strokeWidth={3} />}
        />
      </div>

      <div className="mb-3 sm:mb-4">
        <h2 className="text-[16px] sm:text-[18px] font-semibold text-[#333] mb-0.5 sm:mb-1">
          Today's job
        </h2>
        <p className="text-[13px] sm:text-[14px] text-[#999]">
          {items.length} task{items.length === 1 ? "" : "s"} assigned
        </p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 mb-4 bg-white border border-[#e5e7eb] rounded-xl p-1 w-fit">
        {(
          [
            { key: "pending", label: "Pending", count: stats.pending },
            { key: "progress", label: "In Progress", count: stats.inProgress },
            { key: "completed", label: "Completed", count: stats.completed },
          ] as const
        ).map((t) => {
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                active
                  ? "bg-linear-to-b from-[#ff4f31] to-[#fe2b73] text-white shadow"
                  : "text-[#666] hover:bg-[#fafafa]"
              }`}
            >
              {t.label} ({pad2(t.count)})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[#ff4f31]" />
        </div>
      ) : error ? (
        <div className="bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-[14px] px-4 py-3 rounded-lg">
          {error}
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-8 text-center text-[14px] text-[#999]">
          No {activeTab === "progress" ? "in-progress" : activeTab} tasks.
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {visible.map((item) => {
            const s = statusConfig[item.status];
            const priorityCls = priorityStyle[item.priority ?? "MEDIUM"] ?? priorityStyle.MEDIUM;
            return (
              <div
                key={item.itemId}
                onClick={() => navigate(`${ROUTES.TECHNICIAN_DASHBOARD}/job/${item.jobCardId}?item=${item.itemId}`)}
                className="bg-white rounded-xl border border-[#e5e7eb] p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] sm:text-[15px] font-semibold text-[#333] wrap-break-word">
                      {item.jobDescription}
                    </p>
                    <p className="text-[12px] sm:text-[13px] text-[#666] mt-0.5">
                      {item.vehicleNumber} · {item.vehicleModel}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
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
                      {item.totalSeconds > 0 && (
                        <span className="text-[11px] sm:text-[12px] text-[#666] bg-[#f5f5f5] px-2 py-0.5 rounded font-mono tabular-nums">
                          {formatDuration(item.totalSeconds)}
                          {item.isRunning && <span className="text-[#ff4f31] ml-1">• live</span>}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`${s.bg} px-4 py-1.5 rounded-md shrink-0`}>
                    <span className={`text-[12px] sm:text-[13px] font-semibold ${s.text}`}>
                      {s.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default TechnicianDashboard;
