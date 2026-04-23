import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Loader2, Search } from "lucide-react";

export interface DropdownOption {
  id: string;
  name: string;
}

interface SearchableDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (id: string, name: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  hasError?: boolean;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  disabled = false,
  loading = false,
  hasError = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.id === value);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? options.filter((o) => o.name.toLowerCase().includes(query.toLowerCase()))
    : options;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const open = () => {
    if (disabled || loading) return;
    setIsOpen(true);
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const select = (option: DropdownOption) => {
    onChange(option.id, option.name);
    setIsOpen(false);
    setQuery("");
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("", "");
    setIsOpen(false);
    setQuery("");
  };

  const borderClass = hasError
    ? "border-red-500 focus-within:border-red-500"
    : isOpen
      ? "border-[#04c397]"
      : "border-[#e5e7eb] hover:border-[#d1d5db]";

  const disabledClass = disabled || loading ? "bg-[#f9f9f9] cursor-not-allowed" : "bg-white cursor-pointer";

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger */}
      <div
        onClick={open}
        className={`flex items-center w-full h-11 sm:h-12 border rounded-[10px] px-3 sm:px-4 transition-colors ${borderClass} ${disabledClass}`}
      >
        {isOpen ? (
          <>
            <Search size={14} className="text-[#9ca3af] mr-2 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="Search..."
              className="flex-1 text-[14px] text-[#333] outline-none bg-transparent min-w-0"
            />
          </>
        ) : (
          <span
            className={`flex-1 text-[14px] truncate select-none ${
              selectedOption ? "text-[#333]" : "text-[#bfbfbf]"
            }`}
          >
            {loading
              ? "Loading..."
              : selectedOption
                ? selectedOption.name
                : placeholder}
          </span>
        )}

        <div className="flex items-center gap-1 ml-2 shrink-0">
          {loading && <Loader2 size={14} className="animate-spin text-[#9ca3af]" />}
          {!loading && selectedOption && !disabled && (
            <button
              type="button"
              onClick={clear}
              className="text-[#9ca3af] hover:text-[#6b7280] p-0.5 rounded transition-colors"
              tabIndex={-1}
            >
              ×
            </button>
          )}
          <ChevronDown
            size={15}
            className={`text-[#9ca3af] transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {/* Dropdown list */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-[#e5e7eb] rounded-[10px] shadow-lg max-h-56 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-[13px] text-[#9ca3af] text-center">
              {query ? "No results found" : "No options available"}
            </div>
          ) : (
            filtered.map((option) => (
              <div
                key={option.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(option);
                }}
                className={`px-4 py-2.5 text-[14px] cursor-pointer transition-colors ${
                  option.id === value
                    ? "bg-[#04c397]/10 text-[#04c397] font-medium"
                    : "text-[#333] hover:bg-[#f9f9f9]"
                }`}
              >
                {option.name}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableDropdown;
