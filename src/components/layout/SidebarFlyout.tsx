import { useEffect } from "react";
import { createPortal } from "react-dom";

interface Props {
  open: boolean;
  left: number; // px from the viewport's left edge (the rail's right edge)
  title: string;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onClose: () => void;
  children: React.ReactNode;
}

// Full-height panel that slides out beside the icon rail, for modules whose
// screens don't fit a flat icon list (Vehicle Sales). Rendered in a portal: the
// rail's transform and overflow would otherwise clip a fixed child.
export function SidebarFlyout({ open, left, title, onPointerEnter, onPointerLeave, onClose, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div
      role="dialog"
      aria-label={title}
      style={{ left }}
      onMouseEnter={onPointerEnter}
      onMouseLeave={onPointerLeave}
      className="fixed top-0 z-50 h-screen w-72 bg-white border-r border-[#ebebeb] shadow-[8px_0_24px_rgba(0,0,0,0.08)] flex flex-col"
    >
      <p className="px-5 pt-6 pb-3 text-[15px] font-semibold text-[#222] border-b border-[#f0f0f0]">{title}</p>
      <div className="flex-1 overflow-y-auto scrollbar-hide p-3">{children}</div>
    </div>,
    document.body,
  );
}
