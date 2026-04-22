import React, { useState, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { StatCard } from "../../components/cards/StatCard.tsx";
import { VehicleLookup } from "../../components/cards/VehicleLookup.tsx";
import { Truck } from "lucide-react";
import { VehicleTable } from "../../components/cards/VehicleTable.tsx";
import { ROUTES } from "../../constants/routes.ts";
import type { VehicleStats } from "../../api/vehicle.api";

const SecurityDashboard: React.FC = () => {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [addVehicleSignal, setAddVehicleSignal] = useState(0);
  const [stats, setStats] = useState<VehicleStats>({
    vehiclesEnteredToday: 0,
    vehiclesEnteredYesterday: 0,
    currentlyInside: 0,
    currentlyInsideYesterday: 0,
    pendingInspection: 0,
    pendingExitYesterday: 0,
    inProgress: 0,
    completed: 0,
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

  const isIndexRoute = location.pathname === ROUTES.SECURITY_DASHBOARD;
  const wasOnChildRoute = useRef(false);

  // Clear search query when returning from a child route (e.g. VehicleEntrySuccess)
  useEffect(() => {
    if (isIndexRoute && wasOnChildRoute.current) {
      setSearchQuery("");
      wasOnChildRoute.current = false;
    } else if (!isIndexRoute) {
      wasOnChildRoute.current = true;
    }
  }, [isIndexRoute]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <>
      {/* Dashboard Content - Only show on index route */}
      {isIndexRoute && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-7.5">
            <StatCard
              title="Vehicles Entered Today"
              value={String(stats.vehiclesEnteredToday).padStart(2, "0")}
              change={formatChange(stats.vehiclesEnteredToday, stats.vehiclesEnteredYesterday)}
              icon={<Truck className="w-7 h-7 sm:w-8 sm:h-8 text-[#BFBFBF]" strokeWidth={1.5} />}
            />
            <StatCard
              title="Currently Inside"
              value={String(stats.currentlyInside).padStart(2, "0")}
              change={formatChange(stats.currentlyInside, stats.currentlyInsideYesterday)}
              icon={<Truck className="w-7 h-7 sm:w-8 sm:h-8 text-[#BFBFBF]" strokeWidth={1.5} />}
            />
            <StatCard
              title="Pending Exit"
              value={String(stats.pendingInspection).padStart(2, "0")}
              change={formatChange(stats.pendingInspection, stats.pendingExitYesterday)}
              icon={<Truck className="w-7 h-7 sm:w-8 sm:h-8 text-[#BFBFBF]" strokeWidth={1.5} />}
            />
            <StatCard
              title="Avg. Time Inside"
              value={stats.avgTimeInside}
              change={formatTimeChange(stats.avgTimeInside, stats.avgTimeInsideYesterday)}
              icon={<Truck className="w-7 h-7 sm:w-8 sm:h-8 text-[#BFBFBF]" strokeWidth={1.5} />}
            />
          </div>

          {/* Vehicle Lookup */}
          <div className="mb-6 lg:mb-7.5">
            <VehicleLookup
              value={searchQuery}
              onSearch={handleSearch}
              onAddNewVehicle={() => setAddVehicleSignal((s) => s + 1)}
            />
          </div>

          {/* Vehicle Table */}
          <div className="overflow-x-auto">
            <VehicleTable
              searchQuery={searchQuery}
              onStatsLoaded={setStats}
              addVehicleSignal={addVehicleSignal}
            />
          </div>
        </>
      )}

      {/* Outlet for child routes */}
      <Outlet />
    </>
  );
};

export default SecurityDashboard;
