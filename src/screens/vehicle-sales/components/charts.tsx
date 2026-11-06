// Lightweight chart primitives for the Vehicle Sales reports. The app has no
// charting library, so these are plain HTML/CSS (no new dependency). Colours
// are a validated categorical/ordinal set; every bar carries a visible value
// label so identity and magnitude never rely on colour alone.

import React, { useState } from "react";
import { cn } from "../../../components/utils/cn";

export const SERIES = ["#2a78d6", "#eb6834", "#1baf7a"] as const;
// Ordinal blue ramp (lightest step still clears 2:1 on white).
export const ORDINAL = ["#86b6ef", "#5598e7", "#2a78d6", "#1c5cab", "#0d366b"] as const;

function Tooltip({ text }: { text: string }) {
  return (
    <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#1f1f1f] text-white text-[11px] px-2 py-1 rounded-md shadow-lg z-20">
      {text}
    </span>
  );
}

// Horizontal bars — magnitude by category. Optional per-row target tick.
export function BarList({
  data, format = (n) => n.toLocaleString(), color = SERIES[0], max,
}: {
  data: { label: string; value: number; target?: number; sub?: string }[];
  format?: (n: number) => string;
  color?: string;
  max?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const top = max ?? Math.max(1, ...data.map((d) => Math.max(d.value, d.target ?? 0)));
  return (
    <ul className="space-y-3">
      {data.map((d, i) => (
        <li key={d.label} className="grid grid-cols-[minmax(90px,30%)_1fr_auto] items-center gap-3 text-[12px]">
          <span className="text-[#555] truncate" title={d.label}>{d.label}</span>
          <div
            className="relative h-5 bg-[#f3f3f3] rounded-sm"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            title={`${d.label}: ${format(d.value)}${d.target !== undefined ? ` (target ${format(d.target)})` : ""}`}
          >
            <div
              className="h-full rounded-r-[4px] transition-opacity"
              style={{ width: `${(d.value / top) * 100}%`, background: color, opacity: hover === null || hover === i ? 1 : 0.55 }}
            />
            {d.target !== undefined && (
              <span className="absolute -top-0.5 -bottom-0.5 w-0.5 bg-[#333]" style={{ left: `${(d.target / top) * 100}%` }} aria-hidden />
            )}
            {hover === i && <Tooltip text={`${d.label}: ${format(d.value)}${d.target !== undefined ? ` / target ${format(d.target)}` : ""}`} />}
          </div>
          <span className="text-[#333] tabular-nums text-right min-w-[64px]">
            {format(d.value)}
            {d.sub && <span className="block text-[10px] text-[#999]">{d.sub}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

// Vertical columns over time with an optional target marker per column.
export function ColumnChart({
  data, format = (n) => n.toLocaleString(), height = 180, color = SERIES[0],
}: {
  data: { label: string; value: number; target?: number }[];
  format?: (n: number) => string;
  height?: number;
  color?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const top = Math.max(1, ...data.map((d) => Math.max(d.value, d.target ?? 0))) * 1.1;
  return (
    <div>
      <div className="flex items-end gap-1.5 sm:gap-3 border-b border-[#e5e7eb]" style={{ height }}>
        {data.map((d, i) => (
          <div
            key={d.label}
            className="relative flex-1 h-full flex items-end justify-center"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            title={`${d.label}: ${format(d.value)}${d.target !== undefined ? ` (target ${format(d.target)})` : ""}`}
          >
            <div
              className="w-full max-w-[36px] rounded-t-[4px] transition-opacity"
              style={{ height: `${(d.value / top) * 100}%`, background: color, opacity: hover === null || hover === i ? 1 : 0.55 }}
            />
            {d.target !== undefined && (
              <span className="absolute left-1/2 -translate-x-1/2 w-full max-w-[44px] h-0.5 bg-[#333]" style={{ bottom: `${(d.target / top) * 100}%` }} aria-hidden />
            )}
            {hover === i && <Tooltip text={`${d.label}: ${format(d.value)}${d.target !== undefined ? ` / target ${format(d.target)}` : ""}`} />}
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 sm:gap-3 mt-1.5">
        {data.map((d) => (
          <div key={d.label} className="flex-1 text-center min-w-0">
            <p className="text-[10px] text-[#999] truncate">{d.label}</p>
            <p className="text-[11px] text-[#333] tabular-nums truncate">{format(d.value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// One 100% bar split into ordered buckets (e.g. stock age), with legend.
export function StackedBar({
  data, format = (n) => n.toLocaleString(), colors = ORDINAL,
}: {
  data: { label: string; value: number }[];
  format?: (n: number) => string;
  colors?: readonly string[];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <div>
      <div className="flex h-6 rounded-[4px] overflow-hidden gap-0.5 bg-white">
        {data.map((d, i) => (
          <div
            key={d.label}
            className="relative h-full transition-opacity"
            style={{ width: `${(d.value / total) * 100}%`, background: colors[i % colors.length], opacity: hover === null || hover === i ? 1 : 0.55 }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            title={`${d.label}: ${format(d.value)} (${Math.round((d.value / total) * 100)}%)`}
          >
            {hover === i && <Tooltip text={`${d.label}: ${format(d.value)}`} />}
          </div>
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-1.5 text-[12px] text-[#555]">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: colors[i % colors.length] }} aria-hidden />
            {d.label}
            <span className="text-[#333] tabular-nums">{format(d.value)}</span>
            <span className="text-[#999]">({Math.round((d.value / total) * 100)}%)</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Funnel: one row per stage, bar width = count, with step conversion.
export function Funnel({ stages }: { stages: { label: string; value: number }[] }) {
  const top = Math.max(1, stages[0]?.value ?? 1);
  return (
    <ol className="space-y-2">
      {stages.map((s, i) => {
        const prev = i > 0 ? stages[i - 1].value : null;
        const conv = prev ? Math.round((s.value / prev) * 100) : null;
        return (
          <li key={s.label} className="grid grid-cols-[minmax(90px,25%)_1fr_auto] items-center gap-3 text-[12px]">
            <span className="text-[#555] truncate">{s.label}</span>
            <div className="h-7 flex justify-center bg-[#f7f7f7] rounded-sm" title={`${s.label}: ${s.value}`}>
              <div className="h-full rounded-[4px]" style={{ width: `${(s.value / top) * 100}%`, background: ORDINAL[Math.min(i, ORDINAL.length - 1)] }} />
            </div>
            <span className="tabular-nums text-right min-w-[84px]">
              <span className="text-[#333] font-medium">{s.value.toLocaleString()}</span>
              {conv !== null && <span className={cn("ml-1.5 text-[11px]", conv < 40 ? "text-[#e53e3e]" : "text-[#999]")}>{conv}%</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function ChartLegend({ items }: { items: { label: string; color?: string; marker?: "bar" | "line" }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#555]">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5">
          {it.marker === "line" ? <span className="w-3 h-0.5 bg-[#333]" aria-hidden /> : <span className="w-2.5 h-2.5 rounded-sm" style={{ background: it.color }} aria-hidden />}
          {it.label}
        </li>
      ))}
    </ul>
  );
}

export function ChartFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("pt-2", className)}>{children}</div>;
}
