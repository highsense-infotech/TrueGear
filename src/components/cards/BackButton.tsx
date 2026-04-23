import { ChevronLeft } from "lucide-react";

interface BackButtonProps {
  onClick?: () => void;
  label?: string;
}

export function BackButton({ onClick, label = "Back to List" }: BackButtonProps) {
  return (
    <button 
      className="flex items-center text-xs text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <ChevronLeft size={16} />
      <span>{label}</span>
    </button>
  );
}

export type { BackButtonProps };

