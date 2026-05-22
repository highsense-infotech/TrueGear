import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Loader2, ShieldCheck, Printer, Search } from "lucide-react";
import Button from "../../components/common/Button";
import {
  approveWarrantyPart,
  getWarrantyTagUrl,
  listWarrantyParts,
  rejectWarrantyPart,
  scrapWarrantyPart,
  submitWarrantyForApproval,
  type WarrantyListResult,
  type WarrantyPart,
  type WarrantyStatus,
} from "../../api/warranty.api";
import { Pagination } from "../../components/common/Pagination";

type Filter = "ALL" | WarrantyStatus;

const TABS: { key: Filter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "HELD", label: "Held" },
  { key: "PENDING_APPROVAL", label: "Pending Approval" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
  { key: "SCRAPPED", label: "Scrapped" },
];

const STATUS_COLOR: Record<WarrantyStatus, string> = {
  HELD: "bg-amber-100 text-amber-700",
  PENDING_APPROVAL: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  SCRAPPED: "bg-gray-200 text-gray-700",
};

export default function WarrantyStore() {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [q, setQ] = useState("");
  const [data, setData] = useState<WarrantyListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await listWarrantyParts({
        status: filter === "ALL" ? undefined : filter,
        q: q.trim() || undefined,
        page,
        limit: pageSize,
      });
      if (res.success && res.data) {
        setData(res.data);
        setTotal(res.data.pagination?.total ?? res.data.items.length);
        setTotalPages(res.data.pagination?.totalPages ?? 1);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, page, pageSize]);

  // Reset to first page when filter/search changes
  useEffect(() => { setPage(1); }, [filter]);

  const counts = data?.counts ?? ({} as Record<WarrantyStatus, number>);
  const totalCount = useMemo(
    () => Object.values(counts).reduce((s, n) => s + Number(n || 0), 0),
    [counts],
  );

  const runAction = async (
    id: string,
    fn: () => Promise<{ success: any; error?: { message?: string } | null }>,
    successMsg: string,
  ) => {
    setBusyId(id);
    try {
      const res = await fn();
      if (res.success) {
        toast.success(successMsg);
        await fetchAll();
      } else {
        toast.error(res.error?.message ?? "Action failed");
      }
    } catch {
      toast.error("Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const openTag = (id: string) => {
    const url = getWarrantyTagUrl(id);
    const token = localStorage.getItem("token");
    // Fetch as blob so the Authorization header is attached, then open.
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : undefined })
      .then((r) => r.blob())
      .then((b) => {
        const objectUrl = URL.createObjectURL(b);
        window.open(objectUrl, "_blank");
      })
      .catch(() => toast.error("Could not open tag"));
  };

  const renderActions = (row: WarrantyPart) => {
    const busy = busyId === row.id;
    const btns: React.ReactNode[] = [];
    if (row.status === "HELD") {
      btns.push(
        <Button key="submit" variant="gradient" disabled={busy}
          onClick={() => runAction(row.id, () => submitWarrantyForApproval(row.id), "Submitted for OEM approval")}>
          Submit
        </Button>,
      );
      btns.push(
        <Button key="scrap" variant="secondary" disabled={busy}
          onClick={() => runAction(row.id, () => scrapWarrantyPart(row.id), "Scrapped")}>
          Scrap
        </Button>,
      );
    }
    if (row.status === "PENDING_APPROVAL") {
      btns.push(
        <Button key="approve" variant="gradient" disabled={busy}
          onClick={() => {
            const url = window.prompt("Approval doc URL (optional)") ?? undefined;
            runAction(row.id, () => approveWarrantyPart(row.id, { approvalDocUrl: url || null }), "Approved");
          }}>
          Approve
        </Button>,
      );
      btns.push(
        <Button key="reject" variant="secondary" disabled={busy}
          onClick={() => {
            const notes = window.prompt("Reject reason (optional)") ?? undefined;
            runAction(row.id, () => rejectWarrantyPart(row.id, { notes: notes || null }), "Rejected");
          }}>
          Reject
        </Button>,
      );
    }
    if (row.status === "APPROVED") {
      btns.push(
        <Button key="scrap" variant="secondary" disabled={busy}
          onClick={() => runAction(row.id, () => scrapWarrantyPart(row.id), "Scrapped after approval")}>
          Scrap
        </Button>,
      );
    }
    btns.push(
      <button key="print" onClick={() => openTag(row.id)}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] border border-[#e5e7eb] rounded-md hover:bg-[#f5f5f5]">
        <Printer size={14} /> Tag
      </button>,
    );
    return <div className="flex flex-wrap items-center gap-2">{btns}</div>;
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-[#0061FF]" size={20} />
          <h2 className="text-[18px] font-semibold text-[#333]">Warranty Store</h2>
          <span className="text-[12px] text-[#999]">({totalCount} parts)</span>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); setPage(1); fetchAll(); }}
          className="flex items-center gap-2 bg-white border border-[#e5e7eb] rounded-md px-2 py-1">
          <Search size={14} className="text-[#999]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tag / part / claim # / reg"
            className="text-[13px] outline-none w-64 bg-transparent"
          />
          <button type="submit" className="text-[12px] text-[#0061FF] font-semibold">Go</button>
        </form>
      </div>

      <div className="mb-3 flex gap-1 flex-wrap">
        {TABS.map((t) => {
          const count = t.key === "ALL" ? totalCount : Number(counts[t.key as WarrantyStatus] || 0);
          const active = filter === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-3 py-1.5 text-[12px] rounded-full border transition ${
                active
                  ? "bg-[#0061FF] text-white border-[#0061FF]"
                  : "bg-white text-[#666] border-[#e5e7eb] hover:bg-[#f5f5f5]"
              }`}>
              {t.label} <span className="opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[#ff4f31]" />
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-8 text-center text-[14px] text-[#999]">
          No warranty parts in this view.
        </div>
      ) : (
        <div className="space-y-2">
          {data.items.map((row) => (
            <div key={row.id} className="bg-white border border-[#e5e7eb] rounded-xl p-3 flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-[#333]">
                  <span className="text-[#ff4f31]">{row.tagNo}</span>
                  <span className="ml-2">{row.partName}</span>
                  {row.partNumber && <span className="ml-1 text-[12px] text-[#666]">({row.partNumber})</span>}
                </p>
                <p className="text-[12px] text-[#666]">
                  {row.registrationNumber ? `${row.registrationNumber.toUpperCase()} · ` : ""}
                  {row.customerName ?? ""}
                  {row.warrantyClaimNo ? ` · Claim ${row.warrantyClaimNo}` : ""}
                  {row.warrantyOem ? ` · ${row.warrantyOem}` : ""}
                </p>
                <p className="text-[11px] text-[#999] mt-0.5">
                  Removed {row.removedAt ? new Date(row.removedAt).toLocaleString() : "—"}
                </p>
                {row.notes && <p className="text-[11px] text-[#999] mt-0.5">Notes: {row.notes}</p>}
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLOR[row.status]}`}>
                  {row.status.replace("_", " ")}
                </span>
                {renderActions(row)}
              </div>
            </div>
          ))}

          {total > 0 && (
            <div className="mt-3 pt-2 border-t border-[#f0f0f0]">
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
    </>
  );
}
