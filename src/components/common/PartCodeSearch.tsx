import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Loader2, X } from "lucide-react";
import api from "../../api/axios";

// Result shape returned by GET /parts/search (Evolve IRM_PartInfoLookup with a
// local parts_master fallback). Reuses the exact same endpoint the Job Card
// paid-parts search uses — no duplicate lookup logic.
export interface PartSearchResult {
  id: string;
  partCode: string;
  partName: string;
  unitPrice?: number;
}

interface PartCodeSearchProps {
  partCode: string;
  partName: string;
  onSelect: (part: PartSearchResult) => void;
  onClear: () => void;
  hasError?: boolean;
  placeholder?: string;
}

// Debounce interval matches the Job Card part search (JobRow.tsx).
const DEBOUNCE_MS = 350;

/**
 * Autocomplete that searches part codes directly from Evolve via the shared
 * /parts/search endpoint. Same behaviour as the Job Card lookup (debounce,
 * loading, dropdown), plus keyboard navigation. Once a part is selected the
 * field shows "CODE — Name" read-only; the parent stores partCode + partName.
 */
export default function PartCodeSearch({
  partCode,
  partName,
  onSelect,
  onClear,
  hasError = false,
  placeholder = "Search part code…",
}: PartCodeSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PartSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const selected = !!partCode;

  // Close on outside click.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    // Cancel any in-flight request so a slow earlier response can't overwrite.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setOpen(true);
    try {
      const { data } = await api.get("/parts/search", {
        params: { query: q },
        signal: controller.signal,
      });
      if (data?.success && Array.isArray(data.data)) {
        setResults(data.data);
      } else {
        setResults([]);
      }
      setHighlight(-1);
    } catch (err) {
      // Ignore aborted requests; only clear on a real failure.
      if (!(err as { code?: string })?.code?.includes?.("CANCEL") && (err as Error)?.name !== "CanceledError") {
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(q), DEBOUNCE_MS);
  };

  const choose = (r: PartSearchResult) => {
    onSelect(r);
    setQuery("");
    setResults([]);
    setOpen(false);
    setHighlight(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h <= 0 ? results.length - 1 : h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = results[highlight >= 0 ? highlight : 0];
      if (pick) choose(pick);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // ── Selected state: show read-only "CODE — Name" with a clear button ──
  if (selected) {
    return (
      <div className="flex items-center gap-2 w-full h-11 border border-[#e5e7eb] rounded-lg px-3 bg-[#f9fafb]">
        <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
          {partCode}
        </span>
        <span className="text-[13px] text-gray-700 truncate flex-1">{partName}</span>
        <button
          type="button"
          onClick={onClear}
          title="Clear part"
          className="text-gray-400 hover:text-gray-600 shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  // ── Search state ──
  return (
    <div ref={boxRef} className="relative w-full">
      <div
        className={`flex items-center h-11 border rounded-lg px-3 bg-white transition-colors ${
          hasError ? "border-[#FE2B73]" : open ? "border-[#ff4f31]" : "border-[#e5e7eb] hover:border-gray-300"
        }`}
      >
        <Search size={14} className="text-gray-400 mr-2 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          placeholder={placeholder}
          className="flex-1 text-[13px] text-gray-700 outline-none bg-transparent min-w-0"
        />
        {loading && <Loader2 size={14} className="animate-spin text-gray-400 shrink-0" />}
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-3 text-[13px] text-gray-400 text-center flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Searching…
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-[13px] text-gray-400 text-center">No parts found</div>
          ) : (
            results.map((r, i) => (
              <div
                key={r.id}
                onMouseDown={(e) => { e.preventDefault(); choose(r); }}
                onMouseEnter={() => setHighlight(i)}
                className={`px-4 py-2.5 cursor-pointer transition-colors border-b border-gray-50 last:border-0 ${
                  i === highlight ? "bg-[#fff7f5]" : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
                    {r.partCode}
                  </span>
                  <span className="text-[13px] text-gray-700 truncate">{r.partName}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
