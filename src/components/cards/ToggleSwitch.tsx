import { useState } from "react";

interface ToggleSwitchProps {
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
}

export function ToggleSwitch({
  defaultChecked = false,
  onChange,
}: ToggleSwitchProps) {
  const [checked, setChecked] = useState(defaultChecked);

  const handleToggle = () => {
    const newChecked = !checked;
    setChecked(newChecked);
    onChange?.(newChecked);
  };

  return (
    <button
      onClick={handleToggle}
      className={`relative w-11 h-6 rounded-full transition-colors bg-[#d9d9d9]`}
    >
      <div
        className={`absolute top-0 w-6 h-6 rounded-full bg-white shadow-md transition-transform border border-[#EBEBEB] ${
          checked
            ? "translate-x-5 bg-linear-to-r from-[#7CE000] to-[#03A800]"
            : "translate-x-0"
        }`}
      />
    </button>
  );
}
