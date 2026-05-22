import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Droplets } from "lucide-react";
import Button from "../../components/common/Button";
import { getWashbayQueue, markReadyForRelease, type WashbayItem } from "../../api/washbay.api";

function formatWaitTime(roStatusAt: string | null): string {
  if (!roStatusAt) return "";
  const diff = Date.now() - new Date(roStatusAt).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export default function WashbayDashboard() {
  const [items, setItems] = useState<WashbayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const res = await getWashbayQueue();
    if (res.success && res.data) setItems(res.data);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const markReady = async (checkInId: string) => {
    setBusyId(checkInId);
    try {
      const res = await markReadyForRelease(checkInId);
      if (res.success) {
        toast.success("Marked ready for release — customer notified");
        await fetchAll();
      } else {
        toast.error(res.error?.message ?? "Failed");
      }
    } catch {
      toast.error("Failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <Droplets className="text-[#0061FF]" size={20} />
        <h2 className="text-[18px] font-semibold text-[#333]">Washbay queue</h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[#ff4f31]" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-8 text-center text-[14px] text-[#999]">
          No vehicles in the washbay.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((v) => (
            <div key={v.checkInId} className="bg-white border border-[#e5e7eb] rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-[#333]">
                  {(v.registrationNumber ?? "—").toUpperCase()}
                  {v.receivingNo && <span className="ml-2 text-[12px] text-[#ff4f31] font-semibold">{v.receivingNo}</span>}
                </p>
                <p className="text-[12px] text-[#666]">
                  {v.brand} {v.model}{v.customerName ? ` · ${v.customerName}` : ""}
                </p>
                {v.roStatusAt && (
                  <p className="text-[11px] text-[#999] mt-0.5">In washbay for {formatWaitTime(v.roStatusAt)}</p>
                )}
              </div>
              <Button variant="gradient" onClick={() => markReady(v.checkInId)} disabled={busyId === v.checkInId}>
                {busyId === v.checkInId ? "Marking..." : "Mark Ready for Release"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
