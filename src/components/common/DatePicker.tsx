import React, { useRef } from "react";
import { ChevronDown } from "lucide-react";
import { formatDateForDisplay } from "../../utils/formatDate";

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  label = "Date",
  className = "",
}: DatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleChevronClick = () => {
    // Focus and show the date picker
    inputRef.current?.showPicker?.();
    // Fallback for browsers that don't support showPicker
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleChevronClick();
    }
  };

  // Format the date for display (e.g., "30 Jan 26")
  const displayDate = formatDateForDisplay(value);

  return (
    <div
      className={`relative inline-flex items-center gap-2 bg-[#f5f5f5] rounded-lg px-[18.5px] py-3.25 text-sm ${className}`}
    >
      <span>{label}:</span>
      <div className="relative flex items-center cursor-pointer" onClick={handleChevronClick}>
        {/* Hidden native date input for picker functionality - covers entire click area */}
        <input
          ref={inputRef}
          type="date"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className="date-picker-input cursor-pointer absolute inset-0 opacity-0 z-10"
        />
        
        {/* Visible formatted date display */}
        <span className="select-none">
          {displayDate}
        </span>

        <ChevronDown
          className="w-4 h-4 text-gray-500 hover:text-gray-700 ml-1"
        />
      </div>
    </div>
  );
}

export default DatePicker;

