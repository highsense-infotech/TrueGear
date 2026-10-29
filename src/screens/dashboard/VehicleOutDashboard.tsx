import { useState, useMemo } from "react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { Truck, Clock, CheckCircle2, Timer } from "lucide-react";
import { StatCard } from "../../components/cards/StatCard";
import { VehicleOutTable } from "../../components/cards/VehicleOutTable";
import { ROUTES } from "../../constants/routes";

const VehicleOutDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isIndexRoute = location.pathname === ROUTES.VEHICLE_OUT_DASHBOARD;

  const [filter, setFilter] = useState<"ALL" | "URGENT" | "DELAYED" | "COMPLETED">("ALL");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);

  const stats = useMemo(() => ({
    pendingExit: 5,
    pendingExitYesterday: 3,
    inProgress: 2,
    inProgressYesterday: 1,
    completedToday: 8,
    completedYesterday: 6,
    avgTimeInside: "2h 15m",
    avgTimeInsideYesterday: "1h 50m",
  }), []);

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

  const handleStartInspection = (vehicleId: string) => {
    navigate(`${ROUTES.VEHICLE_OUT_DASHBOARD}/inspection/${vehicleId}`);
  };

  const handleResumeInspection = (vehicleId: string) => {
    navigate(`${ROUTES.VEHICLE_OUT_DASHBOARD}/inspection/${vehicleId}`);
  };

  return (
    <>
      {isIndexRoute && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-7.5">
            <StatCard
              title="Pending Exit"
              value={String(stats.pendingExit).padStart(2, "0")}
              change={formatChange(stats.pendingExit, stats.pendingExitYesterday)}
              icon={<Truck className="w-7 h-7 sm:w-8 sm:h-8 text-[#BFBFBF]" strokeWidth={1.5} />}
            />
            <StatCard
              title="In Progress"
              value={String(stats.inProgress).padStart(2, "0")}
              change={formatChange(stats.inProgress, stats.inProgressYesterday)}
              icon={<Clock className="w-7 h-7 sm:w-8 sm:h-8 text-[#BFBFBF]" strokeWidth={1.5} />}
            />
            <StatCard
              title="Completed Today"
              value={String(stats.completedToday).padStart(2, "0")}
              change={formatChange(stats.completedToday, stats.completedYesterday)}
              icon={<CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 text-[#BFBFBF]" strokeWidth={1.5} />}
            />
            <StatCard
              title="Avg. Time Inside"
              value={stats.avgTimeInside}
              change={formatTimeChange(stats.avgTimeInside, stats.avgTimeInsideYesterday)}
              icon={<Timer className="w-7 h-7 sm:w-8 sm:h-8 text-[#BFBFBF]" strokeWidth={1.5} />}
            />
          </div>

          {/* Vehicle Out Table */}
          <div className="overflow-x-auto">
            <VehicleOutTable
              filter={filter}
              onFilterChange={setFilter}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              onStartInspection={handleStartInspection}
              onResumeInspection={handleResumeInspection}
            />
          </div>
        </>
      )}

      <Outlet />
    </>
  );
};

export default VehicleOutDashboard;
