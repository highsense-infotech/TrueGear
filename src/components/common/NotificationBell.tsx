import { useEffect, useRef, useState } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import {
  listMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type InAppNotification,
} from "../../api/notifications.api";

const POLL_MS = 30_000;

function formatAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const LEVEL_DOT: Record<string, string> = {
  INFO: "bg-blue-500",
  WARN: "bg-amber-500",
  CRIT: "bg-red-500",
};

// Topbar bell — polls /notifications every 30s. Click pops a dropdown of
// the last 50 (server-paginated). Mark-as-read on individual click; "all
// read" link in the header. Stops polling when the tab is hidden.
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<InAppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const fetchOnce = async () => {
    try {
      const res = await listMyNotifications();
      if (res.success && res.data) {
        setItems(res.data.items);
        setUnread(res.data.unread);
      }
    } catch {
      // silent — bell is best-effort
    }
  };

  useEffect(() => {
    fetchOnce();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") fetchOnce();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, []);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const handleRead = async (n: InAppNotification) => {
    if (n.readAt) return;
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
    setUnread((u) => Math.max(0, u - 1));
    await markNotificationRead(n.id).catch(() => undefined);
  };

  const handleReadAll = async () => {
    setItems((prev) => prev.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })));
    setUnread(0);
    await markAllNotificationsRead().catch(() => undefined);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-10 h-10 rounded-full bg-white border border-[#e5e7eb] flex items-center justify-center hover:bg-[#fafafa] transition-colors"
        title="Notifications"
      >
        <Bell size={18} className="text-[#555]" />
        {unread > 0 && (
          <span className="absolute top-0 right-0 -mt-1 -mr-1 min-w-4 h-4 px-1 rounded-full bg-[#ff4f31] text-white text-[10px] font-semibold flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-[420px] overflow-y-auto bg-white border border-[#e5e7eb] rounded-xl shadow-lg z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#e5e7eb]">
            <p className="text-[13px] font-semibold text-[#333]">Notifications</p>
            {unread > 0 && (
              <button onClick={handleReadAll} className="flex items-center gap-1 text-[11px] text-[#ff4f31] hover:underline">
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-3 py-6 text-[13px] text-[#999] text-center">No notifications yet.</p>
          ) : (
            <ul>
              {items.map((n) => (
                <li
                  key={n.id}
                  onClick={() => handleRead(n)}
                  className={`px-3 py-2 border-b border-[#f1f1f1] last:border-b-0 cursor-pointer hover:bg-[#fafafa] ${
                    n.readAt ? "opacity-70" : "bg-[#fffaf8]"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${LEVEL_DOT[n.level] ?? "bg-blue-500"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-[#333] truncate">{n.title}</p>
                      <p className="text-[12px] text-[#666] line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-[#999] mt-0.5">{formatAgo(n.createdAt)}</p>
                    </div>
                    {!n.readAt && <Check size={12} className="text-[#ff4f31] mt-1 shrink-0" />}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
