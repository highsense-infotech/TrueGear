import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Plus, Pencil, Trash2, X, Package, Search } from "lucide-react";
import Modal from "../../components/common/Modal.tsx";
import SearchableDropdown, {
  type DropdownOption,
} from "../../components/common/SearchableDropdown.tsx";
import Button from "../../components/common/Button.tsx";
import { Pagination } from "../../components/common/Pagination.tsx";
import { listMakes, listModelsByMake } from "../../api/vehicle.api.ts";
import { listServiceTypes } from "../../api/serviceType.api.ts";
import api from "../../api/axios.ts";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Assignment {
  id: string;
  makeId: string;
  makeName: string;
  modelId: string;
  modelName: string;
  serviceTypeId: string;
  serviceTypeName: string;
  serviceTypeCode: string;
  serviceCategoryId: string | null;
  serviceCategoryName: string | null;
  partCode: string;
  partName: string;
  quantity: string;
  unitPrice: number;
}

// ─── Inline API helpers ─────────────────────────────────────────────────────
const createAssignments = (data: any) =>
  api.post("/model-service-type-assignments", data);
const updateAssignment = (id: string, data: any) =>
  api.put(`/model-service-type-assignments/${id}`, data);
const deleteAssignment = (id: string) =>
  api.delete(`/model-service-type-assignments/${id}`);

// ─── Styles ─────────────────────────────────────────────────────────────────

const inputClass =
  "w-full px-3 py-2.5 border border-[#e5e7eb] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#ff4f31] focus:border-transparent";

const labelClass = "block text-[13px] font-medium text-[#333] mb-1.5";

// ─── Component ──────────────────────────────────────────────────────────────

const ModelServiceTypeAssignment: React.FC = () => {
  // Dropdown options
  const [makes, setMakes] = useState<DropdownOption[]>([]);
  const [models, setModels] = useState<DropdownOption[]>([]);
  const [serviceTypes, setServiceTypes] = useState<DropdownOption[]>([]);

  // Selected values
  const [selectedMake, setSelectedMake] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedServiceType, setSelectedServiceType] = useState("");
  const [selectedServiceCategory, setSelectedServiceCategory] = useState("");
  const [serviceCategoryOptions, setServiceCategoryOptions] = useState<DropdownOption[]>([]);


  // Parts rows — each row has a unique key for React rendering
  const [partKeyCounter, setPartKeyCounter] = useState(1);
  const [parts, setParts] = useState<{ key: number; partId: string; partName: string; partCode: string; quantity: string }[]>(
    [{ key: 0, partId: "", partName: "", partCode: "", quantity: "1" }]
  );

  // Filter state
  const [filterMakeId, setFilterMakeId] = useState("");
  const [filterServiceTypeId, setFilterServiceTypeId] = useState("");
  const [filterServiceCategoryId, setFilterServiceCategoryId] = useState("");
  const [searchText, setSearchText] = useState("");

  // Assignments table + pagination
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 10;

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);

  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPartName, setEditPartName] = useState("");
  const [editPartCode, setEditPartCode] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // ─── Data fetching ──────────────────────────────────────────────────────

  const loadAssignments = async (
    p: number,
    makeId = filterMakeId,
    serviceTypeId = filterServiceTypeId,
    serviceCategoryId = filterServiceCategoryId,
    search = searchText,
  ) => {
    setTableLoading(true);
    try {
      const params: Record<string, any> = { page: p, limit };
      if (makeId) params.makeId = makeId;
      if (serviceTypeId) params.serviceTypeId = serviceTypeId;
      if (serviceCategoryId) params.serviceCategoryId = serviceCategoryId;
      if (search.trim()) params.search = search.trim();
      const { data } = await api.get("/model-service-type-assignments", { params });
      if (data?.success) {
        setAssignments(Array.isArray(data.data) ? data.data : []);
        setTotalPages(data.totalPages ?? 1);
        setTotalItems(data.total ?? 0);
      }
    } catch {
      toast.error("Failed to load assignments");
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [makesRes, stRes, scRes] = await Promise.all([
          listMakes(),
          listServiceTypes('service_assignment'),
          listServiceTypes('service_category'),
        ]);

        if (makesRes.success && Array.isArray(makesRes.data)) {
          setMakes(
            makesRes.data.map((m: any) => ({ id: m.id ?? m._id, name: m.name }))
          );
        }

        if (stRes.success && Array.isArray(stRes.data)) {
          setServiceTypes(
            stRes.data.map((s: any) => ({ id: s.id ?? s._id, name: s.name }))
          );
        }

        if (scRes.success && Array.isArray(scRes.data)) {
          // Match the job-card page: only offer B / C / D Service.
          const allowedCodes = ["B_SERVICE", "C_SERVICE", "D_SERVICE"];
          setServiceCategoryOptions(
            scRes.data
              .filter((s: any) => allowedCodes.includes(s.code))
              .map((s: any) => ({ id: s.id ?? s._id, name: s.name }))
          );
        }

        await loadAssignments(1);
      } catch {
        toast.error("Failed to load initial data");
      } finally {
        setLoading(false);
      }
    };

    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when page changes
  useEffect(() => {
    if (!loading) loadAssignments(page);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Reset to page 1 and reload when dropdown filters change
  useEffect(() => {
    if (!loading) {
      setPage(1);
      loadAssignments(1, filterMakeId, filterServiceTypeId, filterServiceCategoryId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMakeId, filterServiceTypeId, filterServiceCategoryId]);

  // Debounced reload when search text changes
  useEffect(() => {
    if (loading) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setPage(1);
      loadAssignments(1, filterMakeId, filterServiceTypeId, filterServiceCategoryId, searchText);
    }, 350);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  // Fetch models when make changes
  useEffect(() => {
    if (!selectedMake) {
      setModels([]);
      return;
    }

    const fetchModels = async () => {
      setModelsLoading(true);
      try {
        const res = await listModelsByMake(selectedMake);
        if (res.success && Array.isArray(res.data)) {
          setModels(
            res.data.map((m: any) => ({ id: m.id ?? m._id, name: m.name }))
          );
        }
      } catch {
        toast.error("Failed to load models");
        setModels([]);
      } finally {
        setModelsLoading(false);
      }
    };

    fetchModels();
  }, [selectedMake]);

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleMakeChange = (id: string, _name: string) => {
    setSelectedMake(id);
    setSelectedModel("");
    setModels([]);
  };

  const handleModelChange = (id: string, _name: string) => {
    setSelectedModel(id);
  };

  const handleServiceTypeChange = (id: string, _name: string) => {
    setSelectedServiceType(id);
  };

  // Parts management
  const handlePartFieldChange = (index: number, field: "partName" | "partCode" | "quantity", value: string) => {
    setParts((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  };

  const addPartRow = () => {
    setParts((prev) => [...prev, { key: partKeyCounter, partId: "", partName: "", partCode: "", quantity: "1" }]);
    setPartKeyCounter((c) => c + 1);
  };

  const removePartRow = (index: number) => {
    setParts((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  // Submit assignment
  const handleAddAssignment = async () => {
    if (!selectedMake) {
      toast.error("Please select a make");
      return;
    }
    if (!selectedModel) {
      toast.error("Please select a model");
      return;
    }
    if (!selectedServiceType) {
      toast.error("Please select a service type");
      return;
    }
    if (!selectedServiceCategory) {
      toast.error("Please select a service category");
      return;
    }

    const validParts = parts.filter(
      (p) => p.partName.trim() && p.partCode.trim() && p.quantity.trim()
    );
    if (validParts.length === 0) {
      toast.error("Please add at least one part with name, code and quantity");
      return;
    }

    setSaving(true);
    try {
      await createAssignments({
        makeId: selectedMake,
        modelId: selectedModel,
        serviceTypeId: selectedServiceCategory,
        serviceCategoryId: selectedServiceType,
        parts: validParts.map((p) => ({
          partCode: p.partCode.trim(),
          partName: p.partName.trim(),
          quantity: parseFloat(p.quantity),
          unitPrice: 0,
        })),
      });

      toast.success("Assignment created successfully");
      setSelectedMake("");
      setSelectedModel("");
      setSelectedServiceType("");
      setSelectedServiceCategory("");
      setModels([]);
      setPartKeyCounter((c) => c + 1);
      setParts([{ key: partKeyCounter, partId: "", partName: "", partCode: "", quantity: "1" }]);
      setPage(1);
      await loadAssignments(1);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message ?? "Failed to create assignment"
      );
    } finally {
      setSaving(false);
    }
  };

  // Edit modal
  const openEditModal = (a: Assignment) => {
    setEditingId(a.id);
    setEditPartName(a.partName);
    setEditPartCode(a.partCode ?? "");
    setEditQuantity(String(a.quantity ?? "1"));
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingId(null);
    setEditPartName("");
    setEditPartCode("");
    setEditQuantity("");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (!editPartName.trim()) {
      toast.error("Part name is required");
      return;
    }
    if (!editPartCode.trim()) {
      toast.error("Part code is required");
      return;
    }
    if (!editQuantity.trim() || isNaN(parseFloat(editQuantity))) {
      toast.error("Valid quantity is required");
      return;
    }

    setEditSaving(true);
    try {
      await updateAssignment(editingId, {
        partName: editPartName.trim(),
        partCode: editPartCode.trim(),
        quantity: parseFloat(editQuantity),
      });
      toast.success("Assignment updated");
      closeEditModal();
      setPage(1);
      await loadAssignments(1);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message ?? "Failed to update assignment"
      );
    } finally {
      setEditSaving(false);
    }
  };

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState("");
  const [deleting, setDeleting] = useState(false);

  const openDeleteModal = (a: Assignment) => {
    setDeletingId(a.id);
    setDeletingName(a.partName);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeletingId(null);
    setDeletingName("");
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    setDeleting(true);
    try {
      await deleteAssignment(deletingId);
      toast.success("Assignment deleted");
      closeDeleteModal();
      setPage(1);
      await loadAssignments(1);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message ?? "Failed to delete assignment"
      );
    } finally {
      setDeleting(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#ff4f31]" />
      </div>
    );
  }

  return (
    <div className=" max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#1a1a1a]">
          Model Service Type Assignment
        </h1>
        <p className="text-[13px] sm:text-sm text-[#6b7280] mt-1">
          Assign parts and pricing to model &amp; service type combinations
        </p>
      </div>

      {/* ── Form Card ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 space-y-5">
        {/* Row 1: Dropdowns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={labelClass}>Make</label>
            <SearchableDropdown
              options={makes}
              value={selectedMake}
              onChange={handleMakeChange}
              placeholder="Select make"
            />
          </div>

          <div>
            <label className={labelClass}>Model</label>
            <SearchableDropdown
              options={models}
              value={selectedModel}
              onChange={handleModelChange}
              placeholder={
                selectedMake ? "Select model" : "Select a make first"
              }
              disabled={!selectedMake}
              loading={modelsLoading}
            />
          </div>

          <div>
            <label className={labelClass}>Service Type</label>
            <SearchableDropdown
              options={serviceTypes}
              value={selectedServiceType}
              onChange={handleServiceTypeChange}
              placeholder="Select service type"
            />
          </div>

          <div>
            <label className={labelClass}>Service Category</label>
            <SearchableDropdown
              options={serviceCategoryOptions}
              value={selectedServiceCategory}
              onChange={(id) => setSelectedServiceCategory(id)}
              placeholder="Select B / C / D"
            />
          </div>
        </div>

        {/* Row 2: Parts */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Package size={16} className="text-[#ff4f31]" />
              <span className="text-[14px] font-semibold text-[#333]">
                Parts
              </span>
            </div>
            <button
              type="button"
              onClick={addPartRow}
              className="flex items-center gap-1 text-[12px] font-medium text-[#ff4f31] hover:text-[#e6452b] transition-colors cursor-pointer"
            >
              <Plus size={14} />
              Add Part
            </button>
          </div>

          <div className="space-y-3">
            {parts.map((part, idx) => (
              <div
                key={part.key}
                className="flex items-center gap-3"
              >
                <div className="flex-1">
                  {idx === 0 && (
                    <label className={labelClass}>Part Name</label>
                  )}
                  <input
                    type="text"
                    value={part.partName}
                    onChange={(e) =>
                      handlePartFieldChange(idx, "partName", e.target.value)
                    }
                    placeholder="Enter part name"
                    className={inputClass}
                  />
                </div>

                <div className="w-36 sm:w-44">
                  {idx === 0 && (
                    <label className={labelClass}>Part Code</label>
                  )}
                  <input
                    type="text"
                    value={part.partCode}
                    onChange={(e) =>
                      handlePartFieldChange(idx, "partCode", e.target.value)
                    }
                    placeholder="Enter part code"
                    className={inputClass}
                  />
                </div>

                <div className="w-24 sm:w-28">
                  {idx === 0 && (
                    <label className={labelClass}>Quantity</label>
                  )}
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={part.quantity}
                    onChange={(e) =>
                      handlePartFieldChange(idx, "quantity", e.target.value)
                    }
                    placeholder="1"
                    className={inputClass}
                  />
                </div>

                <div className={`shrink-0 ${idx === 0 ? "mt-6" : ""}`}>
                  <button
                    type="button"
                    onClick={() => removePartRow(idx)}
                    disabled={parts.length === 1}
                    className="p-2 rounded-lg text-[#9ca3af] hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Row 3: Submit */}
        <div className="flex justify-end pt-2">
          <Button
            variant="gradient"
            onClick={handleAddAssignment}
            disabled={saving}
            className="text-[14px]"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Plus size={16} />
                Add Assignment
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Table Card ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] sm:text-base font-semibold text-[#1a1a1a]">
              Assignments
            </h2>
            <p className="text-[12px] text-[#9ca3af]">
              {assignments.length} record{assignments.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="w-full sm:w-44">
              <SearchableDropdown
                options={[{ id: "", name: "All Makes" }, ...makes]}
                value={filterMakeId}
                onChange={(id) => setFilterMakeId(id)}
                placeholder="All Makes"
              />
            </div>
            <div className="w-full sm:w-48">
              <SearchableDropdown
                options={[{ id: "", name: "All Types" }, ...serviceTypes]}
                value={filterServiceTypeId}
                onChange={(id) => setFilterServiceTypeId(id)}
                placeholder="All Types"
              />
            </div>
            <div className="w-full sm:w-48">
              <SearchableDropdown
                options={[{ id: "", name: "All Categories" }, ...serviceCategoryOptions]}
                value={filterServiceCategoryId}
                onChange={(id) => setFilterServiceCategoryId(id)}
                placeholder="All Categories"
              />
            </div>
            <div className="flex items-center flex-1 h-11 sm:h-12 border border-gray-200 rounded-[10px] px-3 sm:px-4 gap-2 focus-within:border-[#ff4f31] bg-white">
              <Search size={14} className="text-gray-400 shrink-0" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search part name, code, make..."
                className="flex-1 text-[13px] outline-none bg-transparent"
              />
              {searchText && (
                <button
                  onClick={() => setSearchText("")}
                  className="text-gray-400 hover:text-gray-600 shrink-0"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-gray-100">
                <th className="px-4 sm:px-6 py-3 text-[12px] font-semibold text-[#6b7280] uppercase tracking-wider">
                  Make
                </th>
                <th className="px-4 sm:px-6 py-3 text-[12px] font-semibold text-[#6b7280] uppercase tracking-wider">
                  Model
                </th>
                <th className="px-4 sm:px-6 py-3 text-[12px] font-semibold text-[#6b7280] uppercase tracking-wider">
                  Service Type
                </th>
                <th className="px-4 sm:px-6 py-3 text-[12px] font-semibold text-[#6b7280] uppercase tracking-wider">
                  Service Category
                </th>
                <th className="px-4 sm:px-6 py-3 text-[12px] font-semibold text-[#6b7280] uppercase tracking-wider">
                  Part Name
                </th>
                <th className="px-4 sm:px-6 py-3 text-[12px] font-semibold text-[#6b7280] uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tableLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-[#ff4f31] mx-auto" />
                  </td>
                </tr>
              ) : assignments.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-[13px] text-[#9ca3af]"
                  >
                    {assignments.length === 0
                      ? "No assignments found. Create one above."
                      : "No results match your filters."}
                  </td>
                </tr>
              ) : (
                assignments.map((a, idx) => (
                  <tr
                    key={a.id}
                    className={`${
                      idx % 2 === 0 ? "bg-white" : "bg-[#f9fafb]"
                    } hover:bg-[#fff7f5] transition-colors`}
                  >
                    <td className="px-4 sm:px-6 py-3 text-[13px] text-[#333] whitespace-nowrap">
                      {a.makeName}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-[13px] text-[#333] whitespace-nowrap">
                      {a.modelName}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-[13px] text-[#333] whitespace-nowrap">
                      <span className="inline-block bg-[#fff0ed] text-[#ff4f31] px-2 py-0.5 rounded text-[12px] font-medium">
                        {a.serviceTypeName}
                      </span>
                    </td>

                    {/* Service Category */}
                    <td className="px-4 sm:px-6 py-3 text-[13px] text-[#333] whitespace-nowrap">
                      {a.serviceCategoryName ? (
                        <span className="inline-block bg-[#f0f7ff] text-[#0066ff] px-2 py-0.5 rounded text-[12px] font-medium">
                          {a.serviceCategoryName}
                        </span>
                      ) : (
                        <span className="text-[#9ca3af]">—</span>
                      )}
                    </td>

                    {/* Part Name */}
                    <td className="px-4 sm:px-6 py-3 text-[13px] text-[#333] whitespace-nowrap">
                      {a.partName}
                    </td>

                    {/* Actions */}
                    <td className="px-4 sm:px-6 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(a)}
                          className="p-1.5 rounded-lg text-[#6b7280] hover:text-[#ff4f31] hover:bg-[#fff0ed] transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => openDeleteModal(a)}
                          className="p-1.5 rounded-lg text-[#6b7280] hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalItems > 0 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={limit}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* ── Delete Confirmation Modal ────────────────────────────────── */}
      <Modal isOpen={deleteModalOpen} onClose={closeDeleteModal} title="Delete Assignment" size="sm">
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <div>
              <p className="text-[14px] text-[#333]">
                Are you sure you want to delete this assignment?
              </p>
              <p className="text-[13px] text-[#6b7280] mt-0.5">
                {deletingName}
              </p>
            </div>
          </div>

          <p className="text-[12px] text-[#9ca3af]">
            This action cannot be undone.
          </p>

          <div className="flex justify-end gap-3 pt-1">
            <Button
              variant="outline"
              onClick={closeDeleteModal}
              disabled={deleting}
              className="text-[13px]"
            >
              Cancel
            </Button>
            <Button
              variant="custom"
              customStyles={{ background: "#ef4444", border: "#ef4444", text: "#fff", hoverBg: "#dc2626" }}
              onClick={confirmDelete}
              disabled={deleting}
              className="text-[13px]"
            >
              {deleting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Delete"
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Edit Modal ──────────────────────────────────────────────── */}
      <Modal isOpen={editModalOpen} onClose={closeEditModal} title="Edit Assignment" size="sm">
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Part Name</label>
            <input
              type="text"
              value={editPartName}
              onChange={(e) => setEditPartName(e.target.value)}
              placeholder="Enter part name"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Part Code</label>
            <input
              type="text"
              value={editPartCode}
              onChange={(e) => setEditPartCode(e.target.value)}
              placeholder="Enter part code"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Quantity</label>
            <input
              type="number"
              min="1"
              step="1"
              value={editQuantity}
              onChange={(e) => setEditQuantity(e.target.value)}
              placeholder="1"
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={closeEditModal}
              className="text-[13px]"
            >
              Cancel
            </Button>
            <Button
              variant="gradient"
              onClick={saveEdit}
              disabled={editSaving}
              className="text-[13px]"
            >
              {editSaving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Update"
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ModelServiceTypeAssignment;
