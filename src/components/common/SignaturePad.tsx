import { useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";

type Props = {
  // Optional starting data URL (e.g. already-saved signature).
  initial?: string | null;
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
};

// Minimal canvas-based signature pad. Returns a PNG data URL via onChange
// whenever the user lifts the pointer; emits null when cleared. Pointer
// events cover both mouse + touch.
export default function SignaturePad({ initial, onChange, disabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const [isEmpty, setIsEmpty] = useState(!initial);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Match the canvas backing store to its CSS size for crisp lines on HiDPI.
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1f2937";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);

    if (initial) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = initial;
    }
  }, [initial]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    e.preventDefault();
    canvasRef.current!.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastRef.current = point(e);
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current!.getContext("2d");
    if (!ctx) return;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(lastRef.current!.x, lastRef.current!.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastRef.current = p;
    if (isEmpty) setIsEmpty(false);
  };

  const onUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current!;
    onChange(canvas.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    setIsEmpty(true);
    onChange(null);
  };

  return (
    <div>
      <div className="relative border border-[#e5e7eb] rounded-[10px] overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={onUp}
          style={{ width: "100%", height: 140, display: "block", touchAction: "none" }}
        />
        {isEmpty && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-[12px] text-[#bbb]">
            Sign here
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={clear}
        disabled={disabled}
        className="mt-1.5 flex items-center gap-1 text-[12px] text-[#666] hover:text-[#ff4f31] transition-colors"
      >
        <Eraser size={12} /> Clear
      </button>
    </div>
  );
}
