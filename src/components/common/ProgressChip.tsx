type Props = {
  totalSeconds: number;
  estimatedHours: string | number | null;
};

const pad = (n: number) => n.toString().padStart(2, "0");
const fmt = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${pad(m)}m` : `${pad(m)}m`;
};

// Green ≤ 80% · amber 80–100% · red > 100% of estimated hours. Hidden
// entirely when there's no estimate to compare against.
export default function ProgressChip({ totalSeconds, estimatedHours }: Props) {
  const est = typeof estimatedHours === "string" ? Number(estimatedHours) : estimatedHours;
  if (!est || est <= 0) return null;
  const ratio = totalSeconds / (est * 3600);
  const cls =
    ratio <= 0.8 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
    ratio <= 1.0 ? "bg-amber-50 text-amber-700 border-amber-200" :
                   "bg-red-50 text-red-700 border-red-200";
  const pct = Math.round(ratio * 100);
  return (
    <span className={`text-[11px] sm:text-[12px] font-medium px-2 py-0.5 rounded border ${cls} font-mono tabular-nums`}>
      {fmt(totalSeconds)} / {est}h · {pct}%
    </span>
  );
}
