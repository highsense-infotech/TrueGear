import { useState, useEffect } from "react";

interface RatingButtonsProps {
  options: string[];
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
}

export function RatingButtons({
  options,
  defaultValue,
  value: externalValue,
  onChange,
}: RatingButtonsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue || "");

  // Sync internal state with external value prop
  useEffect(() => {
    if (externalValue !== undefined) {
      setInternalValue(externalValue);
    }
  }, [externalValue]);

  // Determine which value to display
  const currentValue = externalValue !== undefined ? externalValue : internalValue;

  const handleSelect = (val: string) => {
    setInternalValue(val);
    onChange?.(val);
  };

  return (
    <div className="flex gap-3  px-5">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => handleSelect(option)}
          className={`px-8 h-12.5 rounded-[10px] text-[14px] font-medium transition-all cursor-pointer ${
            currentValue === option
              ? "bg-linear-to-r from-[#7CE000] to-[#03A800] text-white shadow-[2px_4px_8px_0px_rgba(58,164,0,0.3)]"
              : "bg-white border border-[#e5e7eb] text-[#333] hover:bg-gray-50"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
