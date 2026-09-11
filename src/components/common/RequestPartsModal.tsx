import { useState, useEffect, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import { Search, Loader2, X } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";
import api from "../../api/axios";
import { requestExtraParts } from "../../api/serviceAdvisor.api";

type Props = {
  isOpen: boolean;
  itemId: string | null;
  itemDescription?: string;
  onClose: () => void;
  onRequested: () => void;
};

interface PartSearchResult {
  id: string;
  partCode: string;
  partName: string;
  unitPrice: number;
}

export default function RequestPartsModal({ isOpen, itemId, itemDescription, onClose, onRequested }: Props) {
  const [partName, setPartName] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Searchable-dropdown state — mirrors the Repair-flow picker in JobRow.tsx.
  const [partQuery, setPartQuery] = useState("");
  const [partResults, setPartResults] = useState<PartSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<PartSearchResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPartName(""); setPartNumber(""); setQuantity("1"); setError(null);
      setPartQuery(""); setPartResults([]); setSearchOpen(false); setSelectedPart(null);
    }
  }, [isOpen]);

  const searchParts = useCallback(async (q: string) => {
    if (!q.trim()) {
      setPartResults([]);
      setSearchOpen(false);
      return;
    }
    setSearchLoading(true);
    setSearchOpen(true);
    try {
      const { data } = await api.get("/parts/search", { params: { query: q } });
      if (data?.success && Array.isArray(data.data)) {
        setPartResults(data.data);
      } else {
        setPartResults([]);
      }
    } catch {
      setPartResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setPartQuery(q);
    if (selectedPart) {
      setSelectedPart(null);
      setPartName("");
      setPartNumber("");
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchParts(q), 350);
  };

  const handleSelectPart = (result: PartSearchResult) => {
    setSelectedPart(result);
    setPartQuery(`${result.partCode} — ${result.partName}`);
    setPartName(result.partName);
    setPartNumber(result.partCode);
    setSearchOpen(false);
    setPartResults([]);
  };

  const clearSelection = () => {
    setSelectedPart(null);
    setPartQuery("");
    setPartName("");
    setPartNumber("");
    setPartResults([]);
    setSearchOpen(false);
  };

  const submit = async () => {
    if (!itemId) return;
    if (!partName.trim()) { setError("Part name is required"); return; }
    const qty = Number(quantity);
    if (!qty || qty < 1) { setError("Quantity must be at least 1"); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await requestExtraParts(itemId, {
        partName: partName.trim(),
        partNumber: partNumber.trim() || undefined,
        quantity: qty,
      });
      if (res.success) {
        toast.success("Parts request submitted to Parts Manager");
        onRequested();
        onClose();
      } else {
        setError(res.error?.message ?? "Request failed");
      }
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "response" in e
        ? ((e as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ?? "Request failed")
        : "Request failed";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request Additional Parts" size="md">
      <div className="flex flex-col gap-3">
        {itemDescription && (
          <p className="text-[12px] text-[#666]">For task: <span className="font-medium text-[#333]">{itemDescription}</span></p>
        )}
        <div>
          <label className="block text-[12px] text-[#666] mb-1">Part Name *</label>
          <div className="relative">
            <div
              className={`flex items-center h-11 border rounded-[10px] px-3 bg-white transition-colors ${
                searchOpen ? "border-[#04c397]" : "border-[#e5e7eb] hover:border-[#ccc]"
              }`}
            >
              <Search size={14} className="text-gray-400 mr-2 shrink-0" />
              <input
                type="text"
                value={partQuery}
                onChange={handleQueryChange}
                onFocus={() => { if (partResults.length > 0) setSearchOpen(true); }}
                disabled={submitting}
                placeholder="Search by part code or name..."
                className="flex-1 text-[14px] text-gray-700 outline-none bg-transparent min-w-0"
              />
              {searchLoading && (
                <Loader2 size={14} className="animate-spin text-gray-400 shrink-0" />
              )}
              {(selectedPart || partQuery) && !searchLoading && (
                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={submitting}
                  className="text-gray-400 hover:text-gray-600 p-0.5 rounded transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {searchOpen && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-[10px] shadow-lg max-h-52 overflow-y-auto">
                {searchLoading ? (
                  <div className="px-4 py-3 text-[13px] text-gray-400 text-center flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    Searching...
                  </div>
                ) : partResults.length === 0 ? (
                  <div className="px-4 py-3 text-[13px] text-gray-400 text-center">
                    No parts found
                  </div>
                ) : (
                  partResults.map((r) => (
                    <div
                      key={r.id}
                      onMouseDown={(e) => { e.preventDefault(); handleSelectPart(r); }}
                      className="px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
                            {r.partCode}
                          </span>
                          <span className="text-[13px] text-gray-700 truncate">
                            {r.partName}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
        <div>
          <label className="block text-[12px] text-[#666] mb-1">Part Number</label>
          <input
            type="text"
            value={partNumber}
            onChange={(e) => setPartNumber(e.target.value)}
            disabled={submitting || !!selectedPart}
            placeholder="(auto-filled when you pick a part)"
            className="w-full h-11 px-3 rounded-[10px] border border-[#e5e7eb] bg-white text-[14px] focus:outline-none focus:border-[#ff4f31] disabled:bg-[#fafafa]"
          />
        </div>
        <div>
          <label className="block text-[12px] text-[#666] mb-1">Quantity *</label>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            disabled={submitting}
            className="w-full h-11 px-3 rounded-[10px] border border-[#e5e7eb] bg-white text-[14px] focus:outline-none focus:border-[#ff4f31]"
          />
        </div>
        {error && (
          <div className="bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-[13px] px-3 py-2 rounded-lg">
            {error}
          </div>
        )}
        <div className="flex gap-3 pt-1">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="gradient" className="flex-1" onClick={submit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Request"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
