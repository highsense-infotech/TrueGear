import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import toast from "react-hot-toast";
import { StatCard } from "../../components/cards/StatCard.tsx";
import { Truck } from "lucide-react";
import { QCTable } from "../../components/cards/QCTable.tsx";
import { ROUTES } from "../../constants/routes.ts";
import { getQCDashboard, startInspection, type QCStats, type QCQueueItem, type QCPagination } from "../../api/qc.api";

const QualityCheckDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isIndexRoute = location.pathname === ROUTES.QUALITY_CHECK_DASHBOARD;

  const [stats, setStats] = useState<QCStats>({
    pendingInspection: 0,
    pendingInspectionYesterday: 0,
    inProgress: 0,
    inProgressYesterday: 0,
    completed: 0,
    completedYesterday: 0,
    avgTimeInside: "0h 0m",
    avgTimeInsideYesterday: "0h 0m",
  });

  const formatChange = (today: number, yesterday: number): string => {
    const diff = today - yesterday;
    if (diff === 0) return "";
    return diff > 0 ? `+${diff}` : `${diff}`;
  };

  const formatTimeChange = (today: string, yesterday: string): string => {
    const parseMinutes = (t: string) => {
      const hMatch = t.match(/(\d+)h/);
      const mMatch = t.match(/(\d+)m/);
      return (hMatch ? parseInt(hMatch[1]) * 60 : 0) + (mMatch ? parseInt(mMatch[1]) : 0);
    };
    const diff = parseMinutes(today) - parseMinutes(yesterday);
    if (diff === 0) return "";
    const sign = diff > 0 ? "+" : "-";
    const absDiff = Math.abs(diff);
    const h = Math.floor(absDiff / 60);
    const m = absDiff % 60;
    return h > 0 ? `${sign}${h}h ${m}m` : `${sign}${m}m`;
  };
  const [queue, setQueue] = useState<QCQueueItem[]>([]);
  const [pagination, setPagination] = useState<QCPagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "URGENT" | "DELAYED" | "COMPLETED">("ALL");
  const [page, setPage] = useState(1);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getQCDashboard({ page, limit: 10, filter, sortOrder: "asc" });
      if (res.status) {
        setStats(res.data.stats);
        setQueue(res.data.queue);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error("Failed to fetch QC dashboard:", err);
      toast.error("Failed to load QC dashboard");
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    if (isIndexRoute) {
      fetchDashboard();
    }
  }, [isIndexRoute, fetchDashboard]);

  const handleFilterChange = (newFilter: "ALL" | "URGENT" | "DELAYED" | "COMPLETED") => {
    setFilter(newFilter);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleStartInspection = async (vehicle: QCQueueItem) => {
    try {
      const res = await startInspection({
        vehicleId: vehicle.vehicleId,
        serviceType: vehicle.serviceType || undefined,
        priority: vehicle.priority,
      });
      if (res.status) {
        navigate(ROUTES.QUALITY_CHECK_INSPECTION.replace(':inspectionId', res.data.inspection.id));
      }
    } catch (err) {
      console.error("Failed to start inspection:", err);
      toast.error("Failed to start inspection");
    }
  };

  const handleResumeInspection = (vehicle: QCQueueItem) => {
    navigate(ROUTES.QUALITY_CHECK_INSPECTION.replace(':inspectionId', vehicle.inspectionId!));
  };

  return (
    <>
      {/* Dashboard Content - Only show on index route */}
      {isIndexRoute && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-7.5">
            <StatCard
              title="Pending Inspection"
              value={String(stats.pendingInspection).padStart(2, "0")}
              change={formatChange(stats.pendingInspection, stats.pendingInspectionYesterday)}
              icon={<Truck className="w-7 h-7 sm:w-8 sm:h-8 text-[#BFBFBF]" strokeWidth={1.5} />}
            />
            <StatCard
              title="In Progress"
              value={String(stats.inProgress).padStart(2, "0")}
              change={formatChange(stats.inProgress, stats.inProgressYesterday)}
              icon={<Truck className="w-7 h-7 sm:w-8 sm:h-8 text-[#BFBFBF]" strokeWidth={1.5} />}
            />
            <StatCard
              title="Completed Today"
              value={String(stats.completed).padStart(2, "0")}
              change={formatChange(stats.completed, stats.completedYesterday)}
              icon={<Truck className="w-7 h-7 sm:w-8 sm:h-8 text-[#BFBFBF]" strokeWidth={1.5} />}
            />
            <StatCard
              title="Avg. Time Inside"
              value={stats.avgTimeInside}
              change={formatTimeChange(stats.avgTimeInside, stats.avgTimeInsideYesterday)}
              icon={<Truck className="w-7 h-7 sm:w-8 sm:h-8 text-[#BFBFBF]" strokeWidth={1.5} />}
            />
          </div>

          {/* QC Table */}
          <div className="overflow-x-auto">
            <QCTable
              queue={queue}
              pagination={pagination}
              loading={loading}
              filter={filter}
              onFilterChange={handleFilterChange}
              onPageChange={handlePageChange}
              onStartInspection={handleStartInspection}
              onResumeInspection={handleResumeInspection}
            />
          </div>
        </>
      )}

      {/* Outlet for child routes */}
      <Outlet />
    </>
  );
};

export default QualityCheckDashboard;
