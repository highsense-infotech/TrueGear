import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { StatCard } from "../../components/cards/StatCard.tsx";
import { Truck, Clock, CheckCircle, Calendar, Loader2 } from "lucide-react";
import { ServiceAdvisorTable } from "../../components/cards/ServiceAdvisorTable.tsx";
import { Outlet, useLocation } from "react-router-dom";
import ROUTES from "../../constants/routes.ts";
import {
  getServiceAdvisorDashboard,
  type SAStats,
  type SAVehicle,
  type SAPagination,
  type SAFilterStatus,
} from "../../api/serviceAdvisor.api";

const ServiceAdvisorDashboard: React.FC = () => {
  const location = useLocation();
  const isIndexRoute = location.pathname === ROUTES.SERVICE_ADVISOR_DASHBOARD;

  const formatChange = (today: number, yesterday: number): string => {
    const diff = today - yesterday;
    if (diff === 0) return "";
    return diff > 0 ? `+${diff}` : `${diff}`;
  };

  const [stats, setStats] = useState<SAStats | null>(null);
  const [vehicles, setVehicles] = useState<SAVehicle[]>([]);
  const [pagination, setPagination] = useState<SAPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SAFilterStatus>("ALL");
  const [page, setPage] = useState(1);
  const limit = 5;

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getServiceAdvisorDashboard({
        page,
        limit,
        filter,
        sortOrder: "desc",
      });
      if (res.status) {
        setStats(res.data.stats);
        setVehicles(res.data.activeVehicles);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error("Failed to fetch SA dashboard:", err);
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    if (isIndexRoute) {
      fetchDashboard();
    }
  }, [isIndexRoute, fetchDashboard]);

  const handleFilterChange = (newFilter: SAFilterStatus) => {
    setFilter(newFilter);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  return (
    <>
      {isIndexRoute && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-7.5">
            <StatCard
              title="QC Complete"
              value={stats ? String(stats.qcComplete).padStart(2, "0") : "--"}
              change={stats ? formatChange(stats.qcComplete, stats.qcCompleteYesterday) : ""}
              icon={
                <CheckCircle
                  className="w-7 h-7 sm:w-8 sm:h-8 text-[#BFBFBF]"
                  strokeWidth={1.5}
                />
              }
            />
            <StatCard
              title="Awaiting Approval"
              value={stats ? String(stats.pendingApproval).padStart(2, "0") : "--"}
              change={stats ? formatChange(stats.pendingApproval, stats.pendingApprovalYesterday) : ""}
              icon={
                <Calendar
                  className="w-7 h-7 sm:w-8 sm:h-8 text-[#BFBFBF]"
                  strokeWidth={1.5}
                />
              }
            />
            <StatCard
              title="In Service"
              value={stats ? String(stats.inService).padStart(2, "0") : "--"}
              change={stats ? formatChange(stats.inService, stats.inServiceYesterday) : ""}
              icon={
                <Truck
                  className="w-7 h-7 sm:w-8 sm:h-8 text-[#BFBFBF]"
                  strokeWidth={1.5}
                />
              }
            />
            <StatCard
              title="Ready for Billing"
              value={stats ? String(stats.readyForBilling).padStart(2, "0") : "--"}
              change={stats ? formatChange(stats.readyForBilling, stats.readyForBillingYesterday) : ""}
              icon={
                <Clock
                  className="w-7 h-7 sm:w-8 sm:h-8 text-[#BFBFBF]"
                  strokeWidth={1.5}
                />
              }
            />
          </div>

          {/* Service Queue Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <ServiceAdvisorTable
                vehicles={vehicles}
                pagination={pagination}
                filter={filter}
                onFilterChange={handleFilterChange}
                onPageChange={handlePageChange}
              />
            )}
          </div>
        </>
      )}

      {/* Render child routes */}
      <Outlet />
    </>
  );
};

export default ServiceAdvisorDashboard;
