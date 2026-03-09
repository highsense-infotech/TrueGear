import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Users,
  Shield,
} from "lucide-react";
import Modal from "../../components/common/Modal.tsx";
import Button from "../../components/common/Button.tsx";
import { StatCard } from "../../components/cards/StatCard.tsx";
import {
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  getRolePermissions,
  updateRolePermissions,
  type ManagedRole,
  type ManagedUser,
  type RolePermission,
} from "../../api/userManagement.api.ts";
import { MODULES, ACTIONS } from "../../constants/permissions.ts";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  "super-admin": "Super Admin",
  "security-gate-keeper": "Security",
  "qc-inspector": "QC Inspector",
  "service-advisor": "Service Advisor",
  "parts-manager": "Parts Manager",
  customer: "Customer",
};

const ROLE_BG_COLORS: Record<string, string> = {
  "super-admin": "#ff4f31",
  "security-gate-keeper": "#0061FF",
  "qc-inspector": "#7C3AED",
  "service-advisor": "#1DB401",
  "parts-manager": "#E89D00",
  customer: "#6B7280",
};

function getRoleBadge(slug: string, name: string) {
  const bgColor = ROLE_BG_COLORS[slug] || "#6B7280";
  const label = ROLE_LABELS[slug] || name;
  return (
    <span
      style={{ backgroundColor: bgColor }}
      className="text-white px-2.5 py-1 rounded-[5px] text-[11px] sm:text-[12px] font-medium shadow-[2px_4px_8px_0px_#00000026]"
    >
      {label}
    </span>
  );
}

function getInitials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

const inputClass =
  "w-full px-3 py-2.5 border border-[#e5e7eb] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#ff4f31] focus:border-transparent";

const labelClass = "block text-[13px] font-medium text-[#333] mb-1.5";

// Permission grid constants
const ALL_MODULES = [
  { key: MODULES.GATE_ENTRY, label: "Gate Entry" },
  { key: MODULES.QC_INSPECTION, label: "QC Inspection" },
  { key: MODULES.JOB_CARD, label: "Job Card" },
  { key: MODULES.PARTS_MANAGER, label: "Parts Manager" },
  { key: MODULES.USER_MANAGEMENT, label: "User Management" },
  { key: MODULES.ROLE_MANAGEMENT, label: "Role Management" },
  { key: MODULES.DASHBOARD, label: "Dashboard" },
];

const ALL_ACTIONS = [
  { key: ACTIONS.VIEW, label: "View" },
  { key: ACTIONS.CREATE, label: "Create" },
  { key: ACTIONS.EDIT, label: "Edit" },
  { key: ACTIONS.DELETE, label: "Delete" },
  { key: ACTIONS.APPROVE, label: "Approve" },
];

// ─── Permissions Grid (reusable inside modals) ────────────────────────────────

interface PermissionsGridProps {
  checkedPerms: Set<string>;
  onToggle: (resource: string, action: string) => void;
  loading?: boolean;
  isSuperAdmin?: boolean;
}

function PermissionsGrid({ checkedPerms, onToggle, loading, isSuperAdmin }: PermissionsGridProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (isSuperAdmin) {
    return (
      <p className="text-[12px] text-[#999] text-center py-4">
        Super Admin bypasses all permission checks — no configuration needed.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[#e5e7eb]">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="bg-[#f9fafb] border-b border-[#e5e7eb]">
            <th className="text-left px-3 py-2.5 font-semibold text-[#333] w-36">Module</th>
            {ALL_ACTIONS.map((a) => (
              <th key={a.key} className="text-center px-2 py-2.5 font-semibold text-[#555] min-w-16">
                {a.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ALL_MODULES.map((mod, idx) => (
            <tr
              key={mod.key}
              className={`border-b border-[#f0f0f0] last:border-0 ${idx % 2 === 0 ? "bg-white" : "bg-[#fafafa]"}`}
            >
              <td className="px-3 py-2.5 font-medium text-[#333]">{mod.label}</td>
              {ALL_ACTIONS.map((act) => {
                const key = `${mod.key}:${act.key}`;
                return (
                  <td key={act.key} className="text-center px-2 py-2.5">
                    <input
                      type="checkbox"
                      checked={checkedPerms.has(key)}
                      onChange={() => onToggle(mod.key, act.key)}
                      className="w-3.5 h-3.5 accent-[#ff4f31] cursor-pointer"
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = "roles" | "users";

const UserManagement = () => {
  const [activeTab, setActiveTab] = useState<Tab>("roles");

  return (
    <>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-[18px] sm:text-[22px] font-bold text-[#333]">
          Role &amp; User Management
        </h1>
        <p className="text-[12px] sm:text-[14px] text-[#999] mt-1">
          Manage system roles and user accounts
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setActiveTab("roles")}
          className={`flex items-center gap-2 px-4 py-2 rounded-[8px] text-[13px] sm:text-[14px] font-medium transition-colors cursor-pointer ${
            activeTab === "roles"
              ? "bg-linear-to-b from-[#ff4f31] to-[#fe2b73] text-white shadow-md"
              : "bg-white border border-[#e5e7eb] text-[#555] hover:bg-gray-50"
          }`}
        >
          <Shield className="w-4 h-4" />
          Role &amp; Permission
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-4 py-2 rounded-[8px] text-[13px] sm:text-[14px] font-medium transition-colors cursor-pointer ${
            activeTab === "users"
              ? "bg-linear-to-b from-[#ff4f31] to-[#fe2b73] text-white shadow-md"
              : "bg-white border border-[#e5e7eb] text-[#555] hover:bg-gray-50"
          }`}
        >
          <Users className="w-4 h-4" />
          Users
        </button>
      </div>

      {activeTab === "roles" ? <RolesTab /> : <UsersTab />}
    </>
  );
};

// ─── Roles Tab ────────────────────────────────────────────────────────────────

function RolesTab() {
  const [roles, setRoles] = useState<ManagedRole[]>([]);
  const [loading, setLoading] = useState(true);

  // Create / Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editRole, setEditRole] = useState<ManagedRole | null>(null);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [checkedPerms, setCheckedPerms] = useState<Set<string>>(new Set());
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Delete state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ManagedRole | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRoles = async () => {
    try {
      const res = await listRoles();
      setRoles(res.data);
    } catch {
      toast.error("Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const openCreate = () => {
    setEditRole(null);
    setFormName("");
    setFormSlug("");
    setCheckedPerms(new Set());
    setModalOpen(true);
  };

  const openEdit = async (role: ManagedRole) => {
    setEditRole(role);
    setFormName(role.name);
    setFormSlug(role.slug);
    setCheckedPerms(new Set());
    setModalOpen(true);

    if (role.slug !== "super-admin") {
      setLoadingPerms(true);
      try {
        const res = await getRolePermissions(role.id);
        setCheckedPerms(new Set(res.data.map((p: RolePermission) => `${p.resource}:${p.action}`)));
      } catch {
        toast.error("Failed to load permissions");
      } finally {
        setLoadingPerms(false);
      }
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditRole(null);
    setCheckedPerms(new Set());
  };

  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!editRole) {
      setFormSlug(val.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
    }
  };

  const togglePerm = (resource: string, action: string) => {
    const key = `${resource}:${action}`;
    setCheckedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!formName.trim() || !formSlug.trim()) {
      toast.error("Name and slug are required");
      return;
    }
    setSubmitting(true);
    try {
      const permsPayload: RolePermission[] = Array.from(checkedPerms).map((key) => {
        const [resource, action] = key.split(":");
        return { resource, action };
      });

      if (editRole) {
        await updateRole(editRole.id, { name: formName, slug: formSlug });
        await updateRolePermissions(editRole.id, permsPayload);
        toast.success("Role updated");
      } else {
        const res = await createRole({ name: formName, slug: formSlug });
        if (permsPayload.length > 0) {
          await updateRolePermissions(res.data.id, permsPayload);
        }
        toast.success("Role created");
      }
      closeModal();
      await fetchRoles();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save role");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (role: ManagedRole) => {
    try {
      await updateRole(role.id, { isActive: !role.isActive });
      toast.success(`Role ${role.isActive ? "deactivated" : "activated"}`);
      await fetchRoles();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update role");
    }
  };

  const openDelete = (role: ManagedRole) => {
    setDeleteTarget(role);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteRole(deleteTarget.id);
      toast.success("Role deleted");
      setDeleteModalOpen(false);
      await fetchRoles();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete role");
    } finally {
      setDeleting(false);
    }
  };

  const totalRoles = roles.length;
  const activeRoles = roles.filter((r) => r.isActive).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:gap-6 mb-6">
        <StatCard
          title="Total Roles"
          value={String(totalRoles).padStart(2, "0")}
          change=""
          icon={<Shield className="w-7 h-7 sm:w-8 sm:h-8 text-[#ff4f31]" strokeWidth={1.5} />}
        />
        <StatCard
          title="Active Roles"
          value={String(activeRoles).padStart(2, "0")}
          change=""
          icon={<Shield className="w-7 h-7 sm:w-8 sm:h-8 text-[#1DB401]" strokeWidth={1.5} />}
        />
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[14px] sm:text-[16px] font-semibold text-[#333]">All Roles</h2>
          <p className="text-[12px] sm:text-[14px] text-[#999]">{totalRoles} role(s)</p>
        </div>
        <Button variant="gradient" onClick={openCreate}>
          <span className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Role
          </span>
        </Button>
      </div>

      {/* Roles list */}
      {roles.length === 0 ? (
        <div className="bg-white rounded-[10px] border border-[#e5e7eb] p-8 text-center">
          <p className="text-[#999] text-[14px]">No roles found</p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {roles.map((role) => (
            <div
              key={role.id}
              className="bg-white rounded-[10px] border border-[#e5e7eb] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
            >
              {/* Icon */}
              <div className="bg-[#ff4f31] rounded-full size-10 sm:size-12 flex items-center justify-center shrink-0">
                <Shield className="size-5 sm:size-6 text-white" strokeWidth={1.5} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="text-[14px] sm:text-[16px] font-semibold text-[#333]">
                    {role.name}
                  </h3>
                  {getRoleBadge(role.slug, role.name)}
                  <span
                    className={`px-2.5 py-1 rounded-[5px] text-[11px] font-medium shadow-[2px_4px_8px_0px_#00000026] ${
                      role.isActive
                        ? "bg-[#E5F8E5] text-[#1DB401]"
                        : "bg-[#FFE5E5] text-[#FE2B73]"
                    }`}
                  >
                    {role.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-[11px] sm:text-[12px] text-[#999]">
                  Slug: <span className="font-mono">{role.slug}</span> &middot;{" "}
                  {role.userCount} user{role.userCount !== 1 ? "s" : ""}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleToggleActive(role)}
                  disabled={role.slug === "super-admin"}
                  title={role.isActive ? "Deactivate" : "Activate"}
                  className={`px-3 py-1.5 rounded-[5px] text-[12px] font-medium border transition-colors shadow-[2px_4px_8px_0px_#00000026] ${
                    role.isActive
                      ? "border-[#FE2B73] text-[#FE2B73] hover:bg-[#fff0f4]"
                      : "border-[#1DB401] text-[#1DB401] hover:bg-[#f0fff0]"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {role.isActive ? "Deactivate" : "Activate"}
                </button>
                <button
                  onClick={() => openEdit(role)}
                  className="p-2 rounded-[5px] border border-[#e5e7eb] text-[#555] hover:bg-gray-50 transition-colors shadow-[2px_4px_8px_0px_#00000026]"
                  title="Edit role & permissions"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openDelete(role)}
                  disabled={role.slug === "super-admin" || role.userCount > 0}
                  className="p-2 rounded-[5px] border border-[#e5e7eb] text-[#FE2B73] hover:bg-[#fff0f4] transition-colors shadow-[2px_4px_8px_0px_#00000026] disabled:opacity-40 disabled:cursor-not-allowed"
                  title={
                    role.userCount > 0
                      ? `Cannot delete: ${role.userCount} user(s) assigned`
                      : "Delete role"
                  }
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editRole ? "Edit Role & Permissions" : "Create New Role"}
        size="lg"
      >
        <div className="flex flex-col gap-4">
          {/* Role details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Role Name</label>
              <input
                type="text"
                placeholder="e.g. Technician"
                value={formName}
                onChange={(e) => handleNameChange(e.target.value)}
                autoFocus
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Slug</label>
              <input
                type="text"
                placeholder="e.g. technician"
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value)}
                disabled={!!editRole && editRole.slug === "super-admin"}
                className={inputClass}
              />
              {!editRole && (
                <p className="text-[11px] text-[#999] mt-1">
                  Lowercase letters, numbers, and hyphens only
                </p>
              )}
            </div>
          </div>

          {/* Permissions section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[13px] font-semibold text-[#333]">Permissions</span>
              <div className="flex-1 h-px bg-[#e5e7eb]" />
            </div>
            <PermissionsGrid
              checkedPerms={checkedPerms}
              onToggle={togglePerm}
              loading={loadingPerms}
              isSuperAdmin={editRole?.slug === "super-admin"}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={closeModal} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="gradient"
              onClick={handleSubmit}
              disabled={submitting || loadingPerms || !formName.trim() || !formSlug.trim()}
              className="flex-1"
            >
              {submitting ? "Saving..." : editRole ? "Save Changes" : "Create Role"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Role"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-[#666]">
            Are you sure you want to delete the role{" "}
            <span className="font-semibold text-[#333]">{deleteTarget?.name}</span>? This action
            cannot be undone.
          </p>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="gradient"
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 !from-[#FE2B73] !to-[#ff4f31]"
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [roles, setRoles] = useState<ManagedRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  // Create modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: "",
    email: "",
    password: "",
    roleSlug: "",
  });
  const [creating, setCreating] = useState(false);

  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ManagedUser | null>(null);
  const [editForm, setEditForm] = useState({
    username: "",
    email: "",
    roleSlug: "",
  });
  const [editing, setEditing] = useState(false);

  // Delete state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([listUsers(), listRoles()]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredUsers = users.filter((u) => {
    const matchesRole = filterRole === "all" || u.role.slug === filterRole;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.name.toLowerCase().includes(q);
    return matchesRole && matchesSearch;
  });

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.isActive).length;

  // ── Create ────────────────────────────────────────────────────────────────
  const openCreate = () => {
    setCreateForm({ username: "", email: "", password: "", roleSlug: roles[0]?.slug || "" });
    setCreateModalOpen(true);
  };

  const handleCreate = async () => {
    const { username, email, password, roleSlug } = createForm;
    if (!username || !email || !password || !roleSlug) {
      toast.error("All fields are required");
      return;
    }
    setCreating(true);
    try {
      await createUser(createForm);
      toast.success("User created");
      setCreateModalOpen(false);
      await fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  // ── Edit ─────────────────────────────────────────────────────────────────
  const openEdit = (user: ManagedUser) => {
    setEditTarget(user);
    setEditForm({
      username: user.username,
      email: user.email,
      roleSlug: user.role.slug,
    });
    setEditModalOpen(true);
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    setEditing(true);
    try {
      await updateUser(editTarget.id, editForm);
      toast.success("User updated");
      setEditModalOpen(false);
      await fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update user");
    } finally {
      setEditing(false);
    }
  };

  // ── Toggle Active ─────────────────────────────────────────────────────────
  const handleToggleActive = async (user: ManagedUser) => {
    try {
      await updateUser(user.id, { isActive: !user.isActive });
      toast.success(`User ${user.isActive ? "deactivated" : "activated"}`);
      await fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update user");
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const openDelete = (user: ManagedUser) => {
    setDeleteTarget(user);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUser(deleteTarget.id);
      toast.success("User deleted");
      setDeleteModalOpen(false);
      await fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete user");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:gap-6 mb-6">
        <StatCard
          title="Total Users"
          value={String(totalUsers).padStart(2, "0")}
          change=""
          icon={<Users className="w-7 h-7 sm:w-8 sm:h-8 text-[#0061FF]" strokeWidth={1.5} />}
        />
        <StatCard
          title="Active Users"
          value={String(activeUsers).padStart(2, "0")}
          change=""
          icon={<Users className="w-7 h-7 sm:w-8 sm:h-8 text-[#1DB401]" strokeWidth={1.5} />}
        />
      </div>

      {/* Search + Filter + Add */}
      <div className="bg-white rounded-[10px] border border-[#e5e7eb] p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex-1 relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-[#999]"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
              <path
                d="M21 21L16.65 16.65"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2"
              />
            </svg>
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 sm:py-3 border border-[#e5e7eb] rounded-lg text-[13px] sm:text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff4f31] focus:border-transparent"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-3 border border-[#e5e7eb] rounded-lg text-[13px] sm:text-[14px] font-medium text-[#333] focus:outline-none focus:ring-2 focus:ring-[#ff4f31] focus:border-transparent"
          >
            <option value="all">All Roles</option>
            {roles.map((r) => (
              <option key={r.slug} value={r.slug}>
                {r.name}
              </option>
            ))}
          </select>
          <Button variant="gradient" onClick={openCreate}>
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add User
            </span>
          </Button>
        </div>
      </div>

      {/* Header */}
      <div className="mb-4">
        <h2 className="text-[14px] sm:text-[16px] font-semibold text-[#333]">All Users</h2>
        <p className="text-[12px] sm:text-[14px] text-[#999]">
          {filteredUsers.length} user(s)
        </p>
      </div>

      {/* Users list */}
      {filteredUsers.length === 0 ? (
        <div className="bg-white rounded-[10px] border border-[#e5e7eb] p-8 text-center">
          <p className="text-[#999] text-[14px]">No users found</p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className="bg-white rounded-[10px] border border-[#e5e7eb] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
            >
              {/* Avatar */}
              <div className="bg-linear-to-b from-[#ff4f31] to-[#fe2b73] rounded-full size-10 sm:size-12 flex items-center justify-center shrink-0">
                <span className="text-white text-[14px] sm:text-[16px] font-semibold">
                  {getInitials(user.username)}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="text-[14px] sm:text-[15px] font-semibold text-[#333] truncate">
                    {user.username}
                  </h3>
                  {getRoleBadge(user.role.slug, user.role.name)}
                  <span
                    className={`px-2.5 py-1 rounded-[5px] text-[11px] font-medium shadow-[2px_4px_8px_0px_#00000026] ${
                      user.isActive
                        ? "bg-[#E5F8E5] text-[#1DB401]"
                        : "bg-[#FFE5E5] text-[#FE2B73]"
                    }`}
                  >
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-[11px] sm:text-[12px] text-[#999] truncate">{user.email}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleToggleActive(user)}
                  title={user.isActive ? "Deactivate" : "Activate"}
                  className={`px-3 py-1.5 rounded-[5px] text-[12px] font-medium border transition-colors shadow-[2px_4px_8px_0px_#00000026] ${
                    user.isActive
                      ? "border-[#FE2B73] text-[#FE2B73] hover:bg-[#fff0f4]"
                      : "border-[#1DB401] text-[#1DB401] hover:bg-[#f0fff0]"
                  }`}
                >
                  {user.isActive ? "Deactivate" : "Activate"}
                </button>
                <button
                  onClick={() => openEdit(user)}
                  className="p-2 rounded-[5px] border border-[#e5e7eb] text-[#555] hover:bg-gray-50 transition-colors shadow-[2px_4px_8px_0px_#00000026]"
                  title="Edit user"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openDelete(user)}
                  className="p-2 rounded-[5px] border border-[#e5e7eb] text-[#FE2B73] hover:bg-[#fff0f4] transition-colors shadow-[2px_4px_8px_0px_#00000026]"
                  title="Delete user"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create User Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New User"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className={labelClass}>Username</label>
            <input
              type="text"
              placeholder="e.g. john_doe"
              value={createForm.username}
              onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))}
              autoFocus
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              placeholder="e.g. john@example.com"
              value={createForm.email}
              onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Password</label>
            <input
              type="password"
              placeholder="Min. 6 characters"
              value={createForm.password}
              onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Role</label>
            <select
              value={createForm.roleSlug}
              onChange={(e) => setCreateForm((f) => ({ ...f, roleSlug: e.target.value }))}
              className={inputClass}
            >
              {roles.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={() => setCreateModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="gradient"
              onClick={handleCreate}
              disabled={
                creating ||
                !createForm.username ||
                !createForm.email ||
                !createForm.password ||
                !createForm.roleSlug
              }
              className="flex-1"
            >
              {creating ? "Creating..." : "Create User"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit User"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className={labelClass}>Username</label>
            <input
              type="text"
              value={editForm.username}
              onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))}
              autoFocus
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Role</label>
            <select
              value={editForm.roleSlug}
              onChange={(e) => setEditForm((f) => ({ ...f, roleSlug: e.target.value }))}
              className={inputClass}
            >
              {roles.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={() => setEditModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="gradient"
              onClick={handleEdit}
              disabled={editing}
              className="flex-1"
            >
              {editing ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete User"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-[#666]">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-[#333]">{deleteTarget?.username}</span> (
            {deleteTarget?.email})? This action cannot be undone.
          </p>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="gradient"
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 !from-[#FE2B73] !to-[#ff4f31]"
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default UserManagement;
