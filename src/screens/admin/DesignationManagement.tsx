import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Plus, Pencil, Search, BadgeCheck, Ban, Tag } from "lucide-react";
import Modal from "../../components/common/Modal.tsx";
import Button from "../../components/common/Button.tsx";
import { Pagination } from "../../components/common/Pagination.tsx";
import {
  listDesignationsPaginated,
  createDesignation,
  updateDesignation,
  type Designation,
  type DesignationStatusFilter,
} from "../../api/designation.api.ts";

const inputClass =
  "w-full px-3 py-2.5 border border-[#e5e7eb] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#ff4f31] focus:border-transparent";
const inputErrorClass =
  "w-full px-3 py-2.5 border border-[#FE2B73] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#FE2B73] focus:border-transparent";
const labelClass = "block text-[13px] font-medium text-[#333] mb-1.5";

// Extract a backend error message from an axios error without using `any`.
const errMessage = (err: unknown, fallback: string): string =>
  (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? fallback;

const DesignationManagement: React.FC = () => {
  const [rows, setRows] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<DesignationStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Add / Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Designation | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [nameError, setNameError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Deactivate confirm
  const [confirmTarget, setConfirmTarget] = useState<Designation | null>(null);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [debouncedSearch, status]);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const res = await listDesignationsPaginated({
        page,
        limit: pageSize,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        status,
      });
      setRows(res.data?.data ?? []);
      setTotalPages(res.data?.pagination?.totalPages ?? 1);
      setTotal(res.data?.pagination?.total ?? 0);
    } catch {
      toast.error("Failed to load designations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, debouncedSearch, status]);

  const openCreate = () => {
    setEditTarget(null);
    setFormName("");
    setFormDescription("");
    setNameError("");
    setModalOpen(true);
  };

  const openEdit = (d: Designation) => {
    setEditTarget(d);
    setFormName(d.name);
    setFormDescription(d.description ?? "");
    setNameError("");
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const name = formName.trim();
    if (!name) {
      setNameError("Name is required");
      return;
    }
    setSubmitting(true);
    try {
      const description = formDescription.trim() || null;
      const res = editTarget
        ? await updateDesignation(editTarget.id, { name, description })
        : await createDesignation({ name, description });
      if (res.error) {
        toast.error(res.error.message ?? "Failed to save designation");
        return;
      }
      toast.success(editTarget ? "Designation updated" : "Designation created");
      setModalOpen(false);
      await fetchRows();
    } catch (err) {
      toast.error(errMessage(err, "Failed to save designation"));
    } finally {
      setSubmitting(false);
    }
  };

  // Both activate and deactivate go through a confirmation dialog.
  const handleToggle = (d: Designation) => {
    setConfirmTarget(d);
  };

  const applyToggle = async (d: Designation) => {
    setToggling(true);
    try {
      const res = await updateDesignation(d.id, { isActive: !d.isActive });
      if (res.error) {
        toast.error(res.error.message ?? "Failed to update designation");
        return;
      }
      toast.success(d.isActive ? "Designation deactivated" : "Designation activated");
      setConfirmTarget(null);
      await fetchRows();
    } catch (err) {
      toast.error(errMessage(err, "Failed to update designation"));
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-[#ff4f31]" />
          <h1 className="text-[18px] font-semibold text-[#222]">Designations</h1>
        </div>
        <Button variant="gradient" onClick={openCreate} icon={<Plus className="w-4 h-4" />}>
          Add Designation
        </Button>
      </div>
      <p className="text-[13px] text-[#666] mb-4">
        Technician job grades. Used by User Management (technician users). {total} total.
      </p>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#999] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search designations"
            className={`${inputClass} pl-9`}
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as DesignationStatusFilter)}
          className={`${inputClass} sm:w-48`}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#ff4f31]" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-[13px] text-[#666] py-10 text-center">No designations found.</p>
      ) : (
        <div className="border border-[#e5e7eb] rounded-lg overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-[#fafafa] text-[#666]">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Name</th>
                <th className="text-left px-4 py-2.5 font-medium">Description</th>
                <th className="text-left px-4 py-2.5 font-medium">Assigned</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
                <th className="text-right px-4 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} className="border-t border-[#f0f0f0]">
                  <td className="px-4 py-2.5 font-medium text-[#333]">{d.name}</td>
                  <td className="px-4 py-2.5 text-[#666]">{d.description || "—"}</td>
                  <td className="px-4 py-2.5 text-[#666]">{d.assignedUserCount ?? 0}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`px-2 py-0.5 rounded-[5px] text-[11px] font-medium ${
                        d.isActive ? "bg-[#e7f7e7] text-[#1DB401]" : "bg-[#f3f4f6] text-[#888]"
                      }`}
                    >
                      {d.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(d)}
                        title="Edit"
                        className="p-1.5 rounded hover:bg-[#f3f4f6] text-[#555]"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggle(d)}
                        title={d.isActive ? "Deactivate" : "Activate"}
                        className={`p-1.5 rounded hover:bg-[#f3f4f6] ${d.isActive ? "text-[#b45309]" : "text-[#1DB401]"}`}
                      >
                        {d.isActive ? <Ban className="w-4 h-4" /> : <BadgeCheck className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && total > 0 && (
        <div className="mt-4 border border-[#e5e7eb] rounded-lg px-3 sm:px-5 bg-[#fafafa]">
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

      {/* Add / Edit modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? "Edit Designation" : "Add Designation"} size="sm">
        <div className="flex flex-col gap-4">
          <div>
            <label className={labelClass}>Name</label>
            <input
              value={formName}
              autoFocus
              onChange={(e) => {
                setFormName(e.target.value);
                if (nameError) setNameError("");
              }}
              placeholder="e.g. Service Mechanic"
              className={nameError ? inputErrorClass : inputClass}
            />
            {nameError && <p className="text-[11px] text-[#FE2B73] mt-1">{nameError}</p>}
          </div>
          <div>
            <label className={labelClass}>Description (optional)</label>
            <input
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Short description"
              className={inputClass}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={() => setModalOpen(false)} className="flex-1" disabled={submitting}>
              Cancel
            </Button>
            <Button variant="gradient" onClick={handleSubmit} className="flex-1" disabled={submitting || !formName.trim()}>
              {submitting ? "Saving..." : editTarget ? "Save Changes" : "Create"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Activate / Deactivate confirmation */}
      <Modal
        isOpen={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        title={confirmTarget?.isActive ? "Deactivate Designation" : "Activate Designation"}
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-[#666]">
            {confirmTarget?.isActive ? (
              (confirmTarget?.assignedUserCount ?? 0) > 0 ? (
                <>
                  <span className="font-semibold text-[#333]">{confirmTarget?.name}</span> is currently assigned to{" "}
                  <span className="font-semibold text-[#333]">{confirmTarget?.assignedUserCount}</span> technician
                  {(confirmTarget?.assignedUserCount ?? 0) === 1 ? "" : "s"}. Deactivating hides it from new selections,
                  but those technicians keep it until changed. Continue?
                </>
              ) : (
                <>
                  Deactivate <span className="font-semibold text-[#333]">{confirmTarget?.name}</span>? It will be hidden
                  from the technician designation dropdown.
                </>
              )
            ) : (
              <>
                Activate <span className="font-semibold text-[#333]">{confirmTarget?.name}</span>? It will become
                selectable again in the technician designation dropdown.
              </>
            )}
          </p>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={() => setConfirmTarget(null)} className="flex-1" disabled={toggling}>
              Cancel
            </Button>
            <Button
              variant="gradient"
              onClick={() => confirmTarget && applyToggle(confirmTarget)}
              className="flex-1"
              disabled={toggling}
            >
              {toggling
                ? confirmTarget?.isActive
                  ? "Deactivating..."
                  : "Activating..."
                : confirmTarget?.isActive
                  ? "Deactivate"
                  : "Activate"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DesignationManagement;
