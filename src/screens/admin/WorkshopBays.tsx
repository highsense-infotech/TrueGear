import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import {
  listBays,
  createBay,
  updateBay,
  deleteBay,
  REPAIR_CATEGORIES,
  BAY_CATEGORIES,
  type WorkshopBay,
  type RepairCategory,
  type BayCategory,
} from "../../api/workshop.api";

const WorkshopBays = () => {
  const [bays, setBays] = useState<WorkshopBay[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ bayNo: string; category: BayCategory | ""; location: string; capabilities: RepairCategory[]; isActive: boolean }>(
    { bayNo: "", category: "", location: "", capabilities: [], isActive: true },
  );
  const [deleteTarget, setDeleteTarget] = useState<WorkshopBay | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const reset = () => {
    setForm({ bayNo: "", category: "", location: "", capabilities: [], isActive: true });
    setEditingId(null);
    setCreating(false);
  };

  const fetchAll = async () => {
    const res = await listBays();
    if (res.success && res.data) setBays(res.data);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const startEdit = (b: WorkshopBay) => {
    setCreating(false);
    setEditingId(b.id);
    setForm({
      bayNo: b.bayNo,
      category: b.category ?? "",
      location: b.location ?? "",
      capabilities: (b.capabilities ?? []) as RepairCategory[],
      isActive: b.isActive,
    });
  };

  const toggleCap = (c: RepairCategory) => {
    setForm((f) => ({
      ...f,
      capabilities: f.capabilities.includes(c)
        ? f.capabilities.filter((x) => x !== c)
        : [...f.capabilities, c],
    }));
  };

  const save = async () => {
    if (!form.bayNo.trim()) { toast.error("Bay number is required"); return; }
    const payload = {
      bayNo: form.bayNo.trim(),
      category: form.category || null,
      location: form.location.trim() || undefined,
      capabilities: form.capabilities,
      isActive: form.isActive,
    };
    try {
      const res = editingId ? await updateBay(editingId, payload) : await createBay(payload);
      if (res.success) {
        toast.success(editingId ? "Bay updated" : "Bay created");
        reset();
        await fetchAll();
      } else {
        toast.error(res.error?.message ?? "Save failed");
      }
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "response" in e
        ? ((e as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ?? "Save failed")
        : "Save failed";
      toast.error(msg);
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await deleteBay(deleteTarget.id);
      if (res.success) {
        toast.success("Bay deleted");
        setDeleteTarget(null);
        await fetchAll();
      } else {
        setDeleteError(res.error?.message ?? "Delete failed");
      }
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "response" in e
        ? ((e as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ?? "Delete failed")
        : "Delete failed";
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-[18px] font-semibold text-[#333]">Workshop Bays</h2>
          <p className="text-[13px] text-[#999]">Manage the bays your foreman can allocate vehicles to.</p>
        </div>
        {!creating && !editingId && (
          <Button variant="gradient" icon={<Plus size={16} />} onClick={() => { reset(); setCreating(true); }}>
            New Bay
          </Button>
        )}
      </div>

      {(creating || editingId) && (
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] text-[#666] mb-1">Bay Number *</label>
              <input
                type="text"
                value={form.bayNo}
                onChange={(e) => setForm((f) => ({ ...f, bayNo: e.target.value }))}
                placeholder="e.g. Bay 6"
                className="w-full h-11 px-3 rounded-[10px] border border-[#e5e7eb] bg-white text-[14px] focus:outline-none focus:border-[#ff4f31]"
              />
            </div>
            <div>
              <label className="block text-[12px] text-[#666] mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as BayCategory | "" }))}
                className="w-full h-11 px-3 rounded-[10px] border border-[#e5e7eb] bg-white text-[14px] focus:outline-none focus:border-[#ff4f31]"
              >
                <option value="">Uncategorised</option>
                {BAY_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] text-[#666] mb-1">Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="e.g. Block A · Lift 2"
                className="w-full h-11 px-3 rounded-[10px] border border-[#e5e7eb] bg-white text-[14px] focus:outline-none focus:border-[#ff4f31]"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-[12px] text-[#666] mb-1.5">Capabilities</label>
            <div className="flex flex-wrap gap-2">
              {REPAIR_CATEGORIES.map((c) => {
                const on = form.capabilities.includes(c.value);
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => toggleCap(c.value)}
                    className={`px-3 py-1.5 rounded-md border text-[13px] font-medium transition-colors ${
                      on
                        ? "border-[#ff4f31] bg-[#fff5f2] text-[#ff4f31]"
                        : "border-[#e5e7eb] bg-white text-[#555] hover:bg-[#fafafa]"
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              id="bay-active"
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            <label htmlFor="bay-active" className="text-[13px] text-[#333]">Active</label>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="secondary" onClick={reset}>Cancel</Button>
            <Button variant="gradient" onClick={save} icon={<Check size={16} />}>
              {editingId ? "Save Changes" : "Create Bay"}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[#ff4f31]" />
        </div>
      ) : bays.length === 0 ? (
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-8 text-center text-[14px] text-[#999]">
          No bays configured yet. Click "New Bay" to add one.
        </div>
      ) : (
        <div className="space-y-2">
          {bays.map((b) => (
            <div key={b.id} className="bg-white border border-[#e5e7eb] rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-[#333]">
                  {b.bayNo}
                  {b.category && <span className="ml-2 text-[11px] text-[#ff4f31] bg-[#fff5f2] px-2 py-0.5 rounded font-medium">{BAY_CATEGORIES.find((c) => c.value === b.category)?.label ?? b.category}</span>}
                  {!b.isActive && <span className="ml-2 text-[11px] text-[#999] font-normal">(inactive)</span>}
                  {b.currentAllocationId && <span className="ml-2 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded">occupied</span>}
                </p>
                <p className="text-[12px] text-[#666]">
                  {b.location ?? "—"}
                  {b.capabilities && b.capabilities.length > 0 && (
                    <span className="ml-2 text-[#999]">· {b.capabilities.join(", ")}</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => startEdit(b)} className="p-2 text-[#555] hover:text-[#ff4f31] border border-[#e5e7eb] rounded-lg">
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => { setDeleteError(null); setDeleteTarget(b); }}
                  disabled={!!b.currentAllocationId}
                  className="p-2 text-[#555] hover:text-[#ef4444] border border-[#e5e7eb] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                  title={b.currentAllocationId ? "Cannot delete an occupied bay" : "Delete bay"}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => { if (!deleting) setDeleteTarget(null); }}
        title="Delete Bay"
        size="sm"
      >
        <div className="flex flex-col gap-3">
          <p className="text-[14px] text-[#333]">
            Delete {deleteTarget?.bayNo}? This cannot be undone.
          </p>
          {deleteError && (
            <div className="bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-[13px] px-3 py-2 rounded-lg">
              {deleteError}
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button variant="gradient" className="flex-1" onClick={doDelete} disabled={deleting} icon={<X size={16} />}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default WorkshopBays;
