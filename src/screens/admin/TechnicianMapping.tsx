import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Wrench, Check, X } from "lucide-react";
import SearchableDropdown from "../../components/common/SearchableDropdown.tsx";
import Button from "../../components/common/Button.tsx";
import {
  listEvolveTechnicians,
  listTechnicianMappings,
  setUserEvolveTechnicianNo,
  type EvolveTechnician,
  type TechnicianMapping as TechMapping,
} from "../../api/userManagement.api.ts";

// Admin-only screen: maps local technician users to their Evolve TechnicianNo.
// The Service Advisor never sees this — it only writes users.evolveTechnicianNo,
// which the backend later resolves into <TechNo> on RO labour sync.

const TechnicianMapping: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [mappings, setMappings] = useState<TechMapping[]>([]);
  const [evolveTechs, setEvolveTechs] = useState<EvolveTechnician[]>([]);
  // Pending (unsaved) selection per user row.
  const [selection, setSelection] = useState<Record<string, number | null>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [mapRes, techRes] = await Promise.all([
        listTechnicianMappings(),
        listEvolveTechnicians(),
      ]);
      const maps = mapRes.data ?? [];
      setMappings(maps);
      setEvolveTechs(techRes.data ?? []);
      setSelection(
        Object.fromEntries(maps.map((m) => [m.id, m.evolveTechnicianNo])),
      );
    } catch {
      toast.error("Failed to load technician mappings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Dropdown options: id is the stringified TechnicianNo (SearchableDropdown is id-based).
  const techOptions = useMemo(
    () =>
      evolveTechs.map((t) => ({
        id: String(t.technicianNo),
        name: `${t.displayName} · #${t.technicianNo}`,
      })),
    [evolveTechs],
  );

  const handleSave = async (userId: string) => {
    const value = selection[userId] ?? null;
    setSavingId(userId);
    try {
      const res = await setUserEvolveTechnicianNo(userId, value);
      if ((res as any)?.error) {
        toast.error((res as any).error.message ?? "Failed to save mapping");
        return;
      }
      toast.success("Mapping saved");
      setMappings((prev) =>
        prev.map((m) => (m.id === userId ? { ...m, evolveTechnicianNo: value } : m)),
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Failed to save mapping");
    } finally {
      setSavingId(null);
    }
  };

  const isDirty = (m: TechMapping) =>
    (selection[m.id] ?? null) !== (m.evolveTechnicianNo ?? null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#ff4f31]" />
      </div>
    );
  }

  const unmappedCount = mappings.filter((m) => m.evolveTechnicianNo == null).length;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <Wrench className="w-5 h-5 text-[#ff4f31]" />
        <h1 className="text-[18px] font-semibold text-[#222]">Evolve Technician Mapping</h1>
      </div>
      <p className="text-[13px] text-[#666] mb-4">
        Map each local technician to their Evolve technician so labour hours post to the
        correct person. {unmappedCount > 0 && (
          <span className="text-[#E89D00] font-medium">{unmappedCount} unmapped.</span>
        )}
      </p>

      {mappings.length === 0 ? (
        <p className="text-[13px] text-[#666] py-8 text-center">No technician users found.</p>
      ) : (
        <div className="space-y-3">
          {mappings.map((m) => (
            <div
              key={m.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border border-[#e5e7eb] rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium text-[#222] truncate">{m.username}</div>
                <div className="text-[12px] text-[#888] truncate">{m.email}</div>
              </div>
              <div className="flex items-center gap-2">
                {m.evolveTechnicianNo != null ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#1DB401] font-medium">
                    <Check className="w-3.5 h-3.5" /> Mapped
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#E89D00] font-medium">
                    <X className="w-3.5 h-3.5" /> Unmapped
                  </span>
                )}
              </div>
              <div className="w-full sm:w-64">
                <SearchableDropdown
                  options={techOptions}
                  value={selection[m.id] != null ? String(selection[m.id]) : ""}
                  onChange={(id) =>
                    setSelection((prev) => ({ ...prev, [m.id]: id ? Number(id) : null }))
                  }
                  placeholder="Select Evolve technician"
                  disabled={savingId === m.id}
                />
              </div>
              <Button
                onClick={() => handleSave(m.id)}
                disabled={!isDirty(m) || savingId === m.id}
              >
                {savingId === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TechnicianMapping;
