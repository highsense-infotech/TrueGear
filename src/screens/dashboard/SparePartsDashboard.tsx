import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { JobCardPartsGroup } from "../../components/cards/JobCardPartsGroup.tsx";
import { StatCard } from "../../components/cards/StatCard.tsx";
import Modal from "../../components/common/Modal.tsx";
import { AlertTriangle, Clock, Check, Loader2, Send } from "lucide-react";
import {
  getPartsDashboard,
  markPartAvailable,
  markPartUnavailable,
  markPartDispatched,
  type JobCardGroup,
} from "../../api/partsManager.api.ts";
import Button from "../../components/common/Button.tsx";

interface Stats {
  pending: number;
  available: number;
  unavailable: number;
  dispatched: number;
}

const SparePartsDashboard = () => {
  const [jobCardGroups, setJobCardGroups] = useState<JobCardGroup[]>([]);
  const [stats, setStats] = useState<Stats>({
    pending: 0,
    available: 0,
    unavailable: 0,
    dispatched: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Track whether this is the initial load (to auto-expand) vs a refresh (preserve state)
  const isInitialLoad = useRef(true);

  // Action loading state: maps requestId -> action type
  const [actionLoading, setActionLoading] = useState<
    Record<string, "markAvailable" | "eta" | "dispatch">
  >({});

  // ETA modal state
  const [etaModalOpen, setEtaModalOpen] = useState(false);
  const [etaPartId, setEtaPartId] = useState<string | null>(null);
  const [etaValue, setEtaValue] = useState("");
  const [submittingETA, setSubmittingETA] = useState(false);

  const fetchDashboard = async () => {
    try {
      const res = await getPartsDashboard();
      if (!res.data) return;
      setStats(res.data.stats);
      setJobCardGroups(res.data.jobCardGroups);

      // Auto-expand groups with actionable parts only on initial load
      if (isInitialLoad.current) {
        const initialExpanded = new Set(
          res.data.jobCardGroups
            .filter((g) =>
              g.partRequests.some(
                (p) => p.status === "pending" || p.status === "available"
              )
            )
            .map((g) => g.jobCardId)
        );
        setExpandedGroups(initialExpanded);
        isInitialLoad.current = false;
      }
    } catch {
      toast.error("Failed to load parts dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleMarkAvailable = async (id: string) => {
    setActionLoading((prev) => ({ ...prev, [id]: "markAvailable" }));
    try {
      await markPartAvailable(id);
      toast.success("Part marked as available");
      await fetchDashboard();
    } catch {
      toast.error("Failed to update part status");
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleDispatch = async (id: string) => {
    setActionLoading((prev) => ({ ...prev, [id]: "dispatch" }));
    try {
      await markPartDispatched(id);
      toast.success("Part dispatched to bay");
      await fetchDashboard();
    } catch {
      toast.error("Failed to dispatch part");
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const openETAModal = (id: string) => {
    setEtaPartId(id);
    setEtaValue("");
    setEtaModalOpen(true);
  };

  const closeETAModal = () => {
    setEtaModalOpen(false);
    setEtaPartId(null);
    setEtaValue("");
  };

  const formatETA = (datetimeLocal: string): string => {
    const date = new Date(datetimeLocal);
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const minDateTime = new Date(Date.now() + 60 * 1000)
    .toISOString()
    .slice(0, 16);

  const handleSubmitETA = async () => {
    if (!etaPartId || !etaValue) return;
    setSubmittingETA(true);
    try {
      await markPartUnavailable(etaPartId, formatETA(etaValue));
      toast.success("Part marked as unavailable with ETA");
      closeETAModal();
      await fetchDashboard();
    } catch {
      toast.error("Failed to update part status");
    } finally {
      setSubmittingETA(false);
    }
  };

  const toggleGroup = (jobCardId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(jobCardId)) next.delete(jobCardId);
      else next.add(jobCardId);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedGroups(new Set(filteredGroups.map((g) => g.jobCardId)));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  // Two-level filtering: filter parts within each group, then hide empty groups
  const filteredGroups = jobCardGroups
    .map((group) => ({
      ...group,
      partRequests: group.partRequests.filter((req) => {
        const matchesStatus =
          filterStatus === "all" || req.status === filterStatus;
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          !q ||
          req.partName.toLowerCase().includes(q) ||
          group.vehicleNumber.toLowerCase().includes(q) ||
          group.vehicleModel.toLowerCase().includes(q);
        return matchesStatus && matchesSearch;
      }),
    }))
    .filter((group) => group.partRequests.length > 0);

  const totalParts = filteredGroups.reduce(
    (sum, g) => sum + g.partRequests.length,
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-7.5">
        <StatCard
          title="Pending"
          value={String(stats.pending).padStart(2, "0")}
          change=""
          icon={
            <Clock
              className="w-7 h-7 sm:w-8 sm:h-8 text-[#E89D00]"
              strokeWidth={1.5}
            />
          }
        />
        <StatCard
          title="Available"
          value={String(stats.available).padStart(2, "0")}
          change=""
          icon={
            <Check
              className="w-7 h-7 sm:w-8 sm:h-8 text-[#1DB401]"
              strokeWidth={1.5}
            />
          }
        />
        <StatCard
          title="Unavailable"
          value={String(stats.unavailable).padStart(2, "0")}
          change=""
          icon={
            <AlertTriangle
              className="w-7 h-7 sm:w-8 sm:h-8 text-[#FE2B73]"
              strokeWidth={1.5}
            />
          }
        />
        <StatCard
          title="Dispatched"
          value={String(stats.dispatched).padStart(2, "0")}
          change=""
          icon={
            <Send
              className="w-7 h-7 sm:w-8 sm:h-8 text-[#0061FF]"
              strokeWidth={1.5}
            />
          }
        />
      </div>

      <div className="bg-white rounded-[10px] border border-[#e5e7eb] p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex-1 relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-[#999]"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                cx="11"
                cy="11"
                r="8"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M21 21L16.65 16.65"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2"
              />
            </svg>
            <input
              type="text"
              placeholder="Search parts, vehicles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 sm:py-3 border border-[#e5e7eb] rounded-lg text-[13px] sm:text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff4f31] focus:border-transparent"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-3 border border-[#e5e7eb] rounded-lg text-[13px] sm:text-[14px] font-medium text-[#333] focus:outline-none focus:ring-2 focus:ring-[#ff4f31] focus:border-transparent"
          >
            <option value="all">All Requests</option>
            <option value="pending">Pending</option>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
            <option value="dispatched">Dispatched</option>
          </select>
        </div>
      </div>

      {/* Part Requests grouped by Job Card */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[14px] sm:text-[16px] font-semibold text-[#333]">
            Part Requests
          </h2>
          {filteredGroups.length > 0 && (
            <div className="flex items-center gap-3 text-[12px] sm:text-[13px]">
              <button
                type="button"
                onClick={expandAll}
                className="text-[#ff4f31] hover:underline cursor-pointer"
              >
                Expand All
              </button>
              <span className="text-[#ccc]">|</span>
              <button
                type="button"
                onClick={collapseAll}
                className="text-[#ff4f31] hover:underline cursor-pointer"
              >
                Collapse All
              </button>
            </div>
          )}
        </div>
        <p className="text-[12px] sm:text-[14px] text-[#999] mb-3 sm:mb-4">
          {filteredGroups.length} job card{filteredGroups.length !== 1 ? "s" : ""}, {totalParts} request{totalParts !== 1 ? "s" : ""}
        </p>

        {filteredGroups.length === 0 ? (
          <div className="bg-white rounded-[10px] border border-[#e5e7eb] p-8 text-center">
            <p className="text-[#999] text-[14px]">No part requests found</p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {filteredGroups.map((group) => (
              <JobCardPartsGroup
                key={group.jobCardId}
                jobCardId={group.jobCardId}
                vehicleNumber={group.vehicleNumber}
                vehicleModel={group.vehicleModel}
                partRequests={group.partRequests}
                isExpanded={expandedGroups.has(group.jobCardId)}
                onToggle={() => toggleGroup(group.jobCardId)}
                onMarkAvailable={handleMarkAvailable}
                onSetETA={openETAModal}
                onDispatch={handleDispatch}
                actionLoading={actionLoading}
              />
            ))}
          </div>
        )}
      </div>

      {/* ETA Modal */}
      <Modal
        isOpen={etaModalOpen}
        onClose={closeETAModal}
        title="Set Expected Availability Time"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-[#666]">
            Enter when this part is expected to be available. This will mark the
            part as unavailable with an ETA.
          </p>
          <div>
            <label className="block text-[13px] font-medium text-[#333] mb-1.5">
              Expected availability time
            </label>
            <input
              type="datetime-local"
              min={minDateTime}
              value={etaValue}
              onChange={(e) => setEtaValue(e.target.value)}
              autoFocus
              className="w-full px-3 py-2.5 border border-[#e5e7eb] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#ff4f31] focus:border-transparent"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              onClick={closeETAModal}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="gradient"
              onClick={handleSubmitETA}
              disabled={!etaValue || submittingETA}
              className="flex-1"
            >
              {submittingETA ? "Saving..." : "Confirm ETA"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default SparePartsDashboard;
