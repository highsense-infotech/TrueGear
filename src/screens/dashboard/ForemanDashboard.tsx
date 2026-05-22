import { useEffect, useState } from "react";
import { Loader2, Wrench, Clock } from "lucide-react";
import toast from "react-hot-toast";
import { StatCard } from "../../components/cards/StatCard";
import Button from "../../components/common/Button";
import { AllocateBayModal } from "../../components/common/AllocateBayModal";
import { getFailedWorks, type QcOutFailedWork } from "../../api/qcOutInspection.api";
import {
  getForemanDashboard,
  listBays,
  type ForemanDashboardItem,
  type WorkshopBay,
} from "../../api/workshop.api";
import { Pagination } from "../../components/common/Pagination";

const REPAIR_LABEL: Record<string, string> = {
  ENGINE: "Engine",
  TRANSMISSION: "Transmission",
  ELECTRICAL: "Electrical",
  BRAKES: "Brakes",
  BODY: "Body",
  AC: "A/C",
  OTHER: "Other",
};
const PRIORITY_COLOUR: Record<string, string> = {
  LOW: "bg-slate-50 text-slate-600 border-slate-200",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
  HIGH: "bg-orange-50 text-orange-700 border-orange-200",
  URGENT: "bg-red-50 text-red-700 border-red-200",
};

const ForemanDashboard = () => {
  const [items, setItems] = useState<ForemanDashboardItem[]>([]);
  const [bays, setBays] = useState<WorkshopBay[]>([]);
  const [stats, setStats] = useState({ awaiting: 0, inWorkshop: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"awaiting" | "inWorkshop" | "rework">("awaiting");
  const [failedWorksByCheckIn, setFailedWorksByCheckIn] = useState<Record<string, QcOutFailedWork[]>>({});

  const [allocateOpen, setAllocateOpen] = useState(false);
  const [allocateTarget, setAllocateTarget] = useState<ForemanDashboardItem | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [reworkCount, setReworkCount] = useState(0);

  const fetchAll = async () => {
    setError(null);
    const [dashRes, baysRes] = await Promise.all([
      getForemanDashboard({ page, limit: pageSize, tab }),
      listBays(),
    ]);
    if (dashRes.success && dashRes.data) {
      setItems(dashRes.data.items);
      setStats(dashRes.data.stats);
      setTotal(dashRes.data.pagination?.total ?? dashRes.data.items.length);
      setTotalPages(dashRes.data.pagination?.totalPages ?? 1);
    } else {
      setError(dashRes.error?.message ?? "Failed to load dashboard");
    }
    if (baysRes.success && baysRes.data) setBays(baysRes.data);
  };

  // Separate one-shot fetch to know the rework tab count (without forcing a
  // second list query each tab change). Reuses the rework page metadata.
  const fetchReworkCount = async () => {
    const res = await getForemanDashboard({ page: 1, limit: 1, tab: 'rework' });
    if (res.success && res.data) setReworkCount(res.data.pagination?.total ?? 0);
  };

  useEffect(() => {
    setLoading(true);
    fetchAll().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, tab]);

  useEffect(() => {
    fetchReworkCount();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  const visible = items;

  // Lazy-load failed-works for any QC_FAILED row we haven't fetched yet.
  useEffect(() => {
    const failedItems = items.filter((i) => i.roStatus === "QC_FAILED" && !failedWorksByCheckIn[i.checkInId]);
    if (failedItems.length === 0) return;
    failedItems.forEach(async (it) => {
      const res = await getFailedWorks(it.checkInId);
      if (res.success && res.data) {
        setFailedWorksByCheckIn((prev) => ({ ...prev, [it.checkInId]: res.data!.failedWorks }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const pad2 = (n: number) => n.toString().padStart(2, "0");

  const openAllocate = async (item: ForemanDashboardItem) => {
    // For QC_FAILED, ensure the failed-works list is loaded BEFORE opening
    // the modal — otherwise the modal sees failedWorks=undefined, treats it
    // as a normal allocation, and never sends reworkAssignments → items
    // stay marked complete and the tech never sees the rework.
    if (item.roStatus === "QC_FAILED" && !failedWorksByCheckIn[item.checkInId]) {
      const res = await getFailedWorks(item.checkInId);
      if (res.success && res.data) {
        setFailedWorksByCheckIn((prev) => ({ ...prev, [item.checkInId]: res.data!.failedWorks }));
      }
    }
    setAllocateTarget(item);
    setAllocateOpen(true);
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-6">
        <StatCard
          title="Awaiting Allocation"
          value={pad2(stats.awaiting)}
          change=""
          icon={<Clock className="w-7 h-7 text-[#E89D00]" strokeWidth={3} />}
        />
        <StatCard
          title="In Workshop"
          value={pad2(stats.inWorkshop)}
          change=""
          icon={<Wrench className="w-7 h-7 text-[#0061FF]" strokeWidth={3} />}
        />
        <StatCard
          title="Bays Free"
          value={pad2(bays.filter((b) => b.isActive && !b.currentAllocationId).length)}
          change={`of ${bays.filter((b) => b.isActive).length}`}
          icon={<Wrench className="w-7 h-7 text-[#00BF06]" strokeWidth={3} />}
        />
      </div>

      {/* Bay Occupancy strip */}
      <div className="mb-6">
        <h3 className="text-[14px] sm:text-[15px] font-semibold text-[#333] mb-2">Bay Occupancy</h3>
        <div className="flex flex-wrap gap-2">
          {bays.length === 0 ? (
            <p className="text-[13px] text-[#999]">No bays configured.</p>
          ) : (
            bays.map((b) => {
              const isOcc = !!b.currentAllocationId;
              return (
                <div
                  key={b.id}
                  className={`px-3 py-1.5 rounded-lg border text-[12px] font-medium ${
                    !b.isActive
                      ? "bg-[#fafafa] border-[#e5e7eb] text-[#999]"
                      : isOcc
                        ? "bg-amber-50 border-amber-200 text-amber-700"
                        : "bg-emerald-50 border-emerald-200 text-emerald-700"
                  }`}
                  title={b.location ?? ""}
                >
                  {b.bayNo}
                  {isOcc && b.occupant && (
                    <span className="ml-1.5 text-[11px] font-normal">
                      · {b.occupant.vehicleReg ?? "—"}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 bg-white border border-[#e5e7eb] rounded-xl p-1 w-fit">
        {(
          [
            { key: "awaiting", label: "Awaiting Allocation", count: stats.awaiting },
            { key: "inWorkshop", label: "In Workshop", count: stats.inWorkshop },
            { key: "rework", label: "Rework (QC Failed)", count: reworkCount },
          ] as const
        ).map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
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
        <div className="bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-[14px] px-4 py-3 rounded-lg">{error}</div>
      ) : visible.length === 0 ? (
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-8 text-center text-[14px] text-[#999]">
          No vehicles in this tab.
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((it) => {
            const inWorkshop = it.roStatus === "IN_WORKSHOP" || it.roStatus === "DIAGNOSING";
            const isRework = it.roStatus === "QC_FAILED";
            const failed = failedWorksByCheckIn[it.checkInId] ?? [];
            return (
              <div key={it.checkInId} className={`bg-white rounded-xl border ${isRework ? "border-red-300" : "border-[#e5e7eb]"} p-4`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-[#333]">
                      {(it.registrationNumber ?? "—").toUpperCase()}
                      {it.receivingNo && (
                        <span className="ml-2 text-[12px] text-[#ff4f31] font-semibold tracking-wide">
                          {it.receivingNo}
                        </span>
                      )}
                    </p>
                    <p className="text-[13px] text-[#666] mt-0.5">
                      {it.brand} {it.model}{it.customerName ? ` · ${it.customerName}` : ""}
                    </p>
                    {it.complaintText && (
                      <p className="text-[12px] text-[#888] mt-1.5 line-clamp-2">
                        <span className="text-[#666] font-medium">Complaint:</span> {it.complaintText}
                      </p>
                    )}
                    {it.allocation && (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700">
                          {it.allocation.bayNo}
                        </span>
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${PRIORITY_COLOUR[it.allocation.priority] ?? PRIORITY_COLOUR.MEDIUM}`}>
                          {it.allocation.priority}
                        </span>
                        <span className="text-[11px] text-[#666] bg-[#f5f5f5] px-2 py-0.5 rounded">
                          {REPAIR_LABEL[it.allocation.repairCategory] ?? it.allocation.repairCategory}
                        </span>
                        {it.allocation.allocatedByName && (
                          <span className="text-[11px] text-[#999]">by {it.allocation.allocatedByName}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0">
                    <Button
                      variant={inWorkshop || isRework ? "outline" : "gradient"}
                      icon={<Wrench size={16} />}
                      onClick={() => openAllocate(it)}
                    >
                      {isRework ? "Send for Rework" : inWorkshop ? "Re-allocate" : "Allocate Bay"}
                    </Button>
                  </div>
                </div>

                {isRework && (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-[13px] font-semibold text-red-700 mb-1.5">
                      QC Out FAILED — {failed.length} repair{failed.length === 1 ? "" : "s"} need rework
                    </p>
                    {failed.length === 0 ? (
                      <p className="text-[12px] text-red-600/80">Loading details…</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {failed.map((w) => (
                          <li key={w.id} className="text-[12px] text-red-900">
                            <span className="font-medium">• {w.jobDescription}</span>
                            {w.technicianName && <span className="text-red-700/80"> · prev tech {w.technicianName}</span>}
                            {w.notes && (
                              <p className="ml-3 mt-0.5 text-[11px] text-red-700 italic">"{w.notes}"</p>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {total > 0 && (
            <div className="mt-4 pt-2 border-t border-[#f0f0f0]">
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
      )}

      <AllocateBayModal
        isOpen={allocateOpen}
        checkInId={allocateTarget?.checkInId ?? null}
        existing={
          allocateTarget?.allocation
            ? {
                bayId: allocateTarget.allocation.bayId,
                priority: allocateTarget.allocation.priority,
                repairCategory: allocateTarget.allocation.repairCategory,
                notes: allocateTarget.allocation.notes,
              }
            : null
        }
        failedWorks={
          allocateTarget && allocateTarget.roStatus === "QC_FAILED"
            ? failedWorksByCheckIn[allocateTarget.checkInId]
            : undefined
        }
        onClose={() => setAllocateOpen(false)}
        onAllocated={async () => {
          await fetchAll();
          toast.success("Dashboard refreshed");
        }}
      />
    </>
  );
};

export default ForemanDashboard;
