// Shared building blocks for the Vehicle Sales static UI. Styling follows the
// existing TrueGear screens (Labour Master, Warranty Store, Settings): white
// cards on the #f5f5f5 shell, #e5e7eb borders, 13px tables, the orange→pink
// primary gradient and the existing Button / Modal / Pagination components.

import React, { useMemo, useState } from "react";
import {
  Search, ArrowUp, ArrowDown, Info, TriangleAlert, CircleCheck,
  CircleAlert, Camera, Inbox, PlugZap, Unplug, Database, ImageIcon, Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Modal from "../../../components/common/Modal";
import Button from "../../../components/common/Button";
import { Pagination } from "../../../components/common/Pagination";
import { cn } from "../../../components/utils/cn";
import type { IntegrationStatus, SalesScreen } from "../registry";
import { inputClass, inputErrorClass, labelClass, useCurrentScreen } from "./helpers";
import { useEvolveStatus } from "./evolveHooks";

// ── badges ────────────────────────────────────────────────────────────────────
export type Tone = "green" | "blue" | "amber" | "red" | "gray" | "violet" | "brand";

const TONE_CLASS: Record<Tone, string> = {
  green: "bg-green-100 text-green-700",
  blue: "bg-blue-100 text-blue-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
  gray: "bg-gray-200 text-gray-700",
  violet: "bg-violet-100 text-violet-700",
  brand: "bg-[#ffe9e4] text-[#e8432a]",
};

export function Badge({ tone = "gray", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap", TONE_CLASS[tone], className)}>
      {children}
    </span>
  );
}

// Common business statuses → tone, so the same word is the same colour on
// every screen.
const STATUS_TONES: Record<string, Tone> = {
  draft: "gray", approval: "amber", "pending approval": "amber", pending: "amber", ordered: "blue",
  received: "green", "partially received": "violet", approved: "green", rejected: "red",
  active: "green", inactive: "gray", enabled: "green", disabled: "gray", scheduled: "blue",
  new: "blue", contacted: "violet", qualified: "violet", "test drive": "blue", quoted: "amber",
  negotiation: "amber", won: "green", lost: "red", reopened: "violet", booked: "blue",
  "in stock": "green", available: "green", reserved: "amber", sold: "gray", "on order": "blue",
  "in transit": "blue", "order required": "red", demo: "violet",
  pass: "green", passed: "green", conditional: "amber", fail: "red", failed: "red",
  open: "amber", submitted: "blue", "claim submitted": "blue", settled: "green", closed: "gray",
  accepted: "green", sent: "blue", viewed: "violet", "changes requested": "amber", expired: "gray", superseded: "gray",
  paid: "green", "part paid": "amber", unpaid: "red", overdue: "red", recorded: "blue",
  issued: "blue", redeemed: "green", cancelled: "gray", ready: "green", "not ready": "red", "awaiting pdi": "amber",
  mapped: "green", unmapped: "red", "needs review": "amber", completed: "green", "in progress": "blue",
  hot: "red", warm: "amber", cold: "blue", invoiced: "green", "awaiting invoice": "amber",
  "pending uat": "amber", "manual in evolve": "violet", "not sent": "gray", "on hold": "red",
  "at body builder": "violet", rework: "red", returned: "violet", "sent to evolve": "green",
};

export function StatusBadge({ status, tone }: { status: string; tone?: Tone }) {
  return <Badge tone={tone ?? STATUS_TONES[status.toLowerCase()] ?? "gray"}>{status}</Badge>;
}

// ── layout primitives ────────────────────────────────────────────────────────
export function Card({
  title, subtitle, actions, children, className, bodyClassName, icon: Icon,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  icon?: LucideIcon;
}) {
  return (
    <section className={cn("bg-white border border-[#e5e7eb] rounded-xl shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)]", className)}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 px-4 sm:px-5 pt-4 flex-wrap">
          <div className="min-w-0">
            {title && (
              <h3 className="text-[15px] font-semibold text-[#333] flex items-center gap-2">
                {Icon && <Icon className="w-4 h-4 text-[#ff4f31] shrink-0" />}
                {title}
              </h3>
            )}
            {subtitle && <p className="text-[12px] text-[#999] mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
        </div>
      )}
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

// Compact button for toolbars / table rows — the shared Button is sized for
// primary page actions (h-12), matching how Warranty Store mixes the two.
export function SmallButton({
  children, icon: Icon, variant = "outline", className, ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: LucideIcon; variant?: "outline" | "primary" | "danger" | "ghost" }) {
  const variants = {
    outline: "border border-[#e5e7eb] text-[#444] bg-white hover:bg-[#f5f5f5]",
    primary: "bg-linear-to-b from-[#ff4f31] to-[#fe2b73] text-white hover:opacity-90 border border-transparent",
    danger: "border border-[#ffc0d1] bg-[#faedee] text-[#FE306C] hover:bg-[#ffe5ed]",
    ghost: "text-[#555] hover:bg-[#f3f4f6] border border-transparent",
  };
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4f31]",
        variants[variant],
        className,
      )}
      {...rest}
    >
      {Icon && <Icon size={14} className="shrink-0" />}
      {children}
    </button>
  );
}

// Primary page action, using the shared Button at a toolbar-friendly height.
export function PrimaryButton({ icon: Icon, children, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: LucideIcon }) {
  return (
    <Button variant="gradient" icon={Icon ? <Icon className="w-4 h-4" /> : undefined} className={cn("h-10! sm:h-10! text-[13px] px-5! w-auto!", className)} {...rest}>
      {children}
    </Button>
  );
}

export function SecondaryButton({ icon: Icon, children, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: LucideIcon }) {
  return (
    <Button variant="outline" icon={Icon ? <Icon className="w-4 h-4" /> : undefined} className={cn("h-10! sm:h-10! text-[13px] px-4! bg-white text-[#555]", className)} {...rest}>
      {children}
    </Button>
  );
}

// ── page header (title/description come from the registry) ───────────────────
const INTEGRATION_META: Record<IntegrationStatus, { label: string; tone: Tone; icon: LucideIcon }> = {
  ready: { label: "Ready", tone: "green", icon: CircleCheck },
  uat: { label: "Evolve link pending UAT", tone: "amber", icon: PlugZap },
  partial: { label: "Partly – no Evolve API", tone: "red", icon: Unplug },
};

export function IntegrationChip({ screen }: { screen: SalesScreen }) {
  const meta = INTEGRATION_META[screen.status];
  const usesEvolve = screen.evolveApi !== "None" && !screen.evolveApi.startsWith("None");
  return (
    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
      <Badge tone={meta.tone}>
        <meta.icon size={12} /> {meta.label}
      </Badge>
      {/* API lists can be long ("07 … · 28 … · 35 …"), so this badge may wrap
          instead of pushing the page wider than a phone screen. */}
      <Badge tone={usesEvolve ? "blue" : "gray"} className="whitespace-normal max-w-full rounded-xl">
        <Database size={12} className="shrink-0" /> {usesEvolve ? `Evolve: ${screen.evolveApi}` : "TrueGear only"}
      </Badge>
    </div>
  );
}

export function PageHeader({
  title, description, actions, icon: Icon,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  icon?: LucideIcon;
}) {
  // Screens show only their title; the workbook summary and the Evolve
  // integration badges / notes are no longer shown to users. A description a
  // screen passes in explicitly is still shown.
  const screen = useCurrentScreen();
  return (
    <div className="mb-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5 text-[#ff4f31]" />}
            <h1 className="text-[18px] font-semibold text-[#222]">{title ?? screen?.label}</h1>
          </div>
          {description && <p className="text-[13px] text-[#666] mt-0.5">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
    </div>
  );
}

// ── notices ───────────────────────────────────────────────────────────────────
const NOTICE_STYLE = {
  info: { cls: "bg-blue-50 border-blue-200 text-blue-800", icon: Info },
  warning: { cls: "bg-amber-50 border-amber-200 text-amber-800", icon: TriangleAlert },
  danger: { cls: "bg-red-50 border-red-200 text-red-800", icon: CircleAlert },
  success: { cls: "bg-green-50 border-green-200 text-green-800", icon: CircleCheck },
};

export function Notice({
  tone = "info", title, children, className, action,
}: {
  tone?: keyof typeof NOTICE_STYLE;
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  const s = NOTICE_STYLE[tone];
  return (
    <div role={tone === "danger" || tone === "warning" ? "alert" : "status"} className={cn("flex items-start gap-3 border rounded-lg px-4 py-3", s.cls, className)}>
      <s.icon size={18} className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 text-[12px] leading-relaxed">
        {title && <p className="text-[13px] font-semibold mb-0.5">{title}</p>}
        {children}
      </div>
      {action}
    </div>
  );
}

// Standard banner for screens with an Evolve write. The server decides whether
// the write is on (EVOLVE_VEHICLE_SALES_WRITES_ENABLED); until it is, nothing
// is sent and the manual workaround applies.
export function PendingUatNotice({ api, workaround }: { api: string; workaround: string }) {
  const status = useEvolveStatus();
  if (status?.writesEnabled) {
    return (
      <Notice tone="info" title={`Evolve link live — ${api}`}>
        “Send to Evolve” sends this record to Evolve ({status.interfaceCode}) and stores the number Evolve returns.
        <span className="block mt-1"><span className="font-semibold">If Evolve rejects it:</span> {workaround}</span>
      </Notice>
    );
  }
  return (
    <Notice tone="warning" title={`Evolve link pending UAT — ${api}`}>
      The API is built but switched off on the server until it passes Evolve UAT, so “Send to Evolve” is locked. “Preview XML” shows what would be sent, without sending it.
      <span className="block mt-1"><span className="font-semibold">Manual workaround:</span> {workaround}</span>
    </Notice>
  );
}

export function NoApiNotice({ children }: { children: React.ReactNode }) {
  return (
    <Notice tone="danger" title="No Evolve API available">
      {children}
    </Notice>
  );
}

// ── stats ─────────────────────────────────────────────────────────────────────
export function KpiCard({
  label, value, hint, icon: Icon, tone,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: "up" | "down" | "neutral";
}) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-[10px] px-4 py-3.5 shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)] flex items-center justify-between gap-3 min-w-0">
      <div className="min-w-0">
        <p className="text-[#999] text-[12px] truncate">{label}</p>
        <p className="text-[#333] text-[22px] sm:text-[24px] leading-tight mt-0.5 truncate">{value}</p>
        {hint && (
          <p className={cn("text-[11px] mt-0.5 truncate", tone === "up" ? "text-[#3aa400]" : tone === "down" ? "text-[#e53e3e]" : "text-[#999]")}>
            {hint}
          </p>
        )}
      </div>
      {Icon && (
        <div className="bg-[#fbfbfb] border border-[#e5e7eb] rounded-[10px] w-10 h-10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-[#999]" />
        </div>
      )}
    </div>
  );
}

export function KpiGrid({ children, cols = 4 }: { children: React.ReactNode; cols?: 2 | 3 | 4 | 5 }) {
  const map = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 xl:grid-cols-4", 5: "sm:grid-cols-3 xl:grid-cols-5" };
  return <div className={cn("grid grid-cols-1 gap-3 mb-5", map[cols])}>{children}</div>;
}

export function KeyValueGrid({ items, cols = 3 }: { items: { label: string; value: React.ReactNode }[]; cols?: 2 | 3 | 4 }) {
  const map = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" };
  return (
    <dl className={cn("grid grid-cols-1 gap-x-6 gap-y-3", map[cols])}>
      {items.map((it) => (
        <div key={it.label} className="min-w-0">
          <dt className="text-[11px] text-[#999] uppercase tracking-wide">{it.label}</dt>
          <dd className="text-[13px] text-[#333] mt-0.5 break-words">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ProgressBar({ value, max = 100, tone = "brand", label }: { value: number; max?: number; tone?: "brand" | "green" | "amber" | "red" | "blue"; label?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const fill = {
    brand: "bg-linear-to-r from-[#ff4f31] to-[#fe2b73]",
    green: "bg-green-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
    blue: "bg-[#2a78d6]",
  }[tone];
  return (
    <div className="w-full h-2 bg-[#f0f0f0] rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cn("h-full rounded-full", fill)} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── toolbar / filters ────────────────────────────────────────────────────────
export function Toolbar({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-col md:flex-row md:items-center gap-3 mb-4 flex-wrap", className)}>{children}</div>;
}

export function SearchInput({ value, onChange, placeholder = "Search", className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cn("relative flex-1 min-w-[200px]", className)}>
      <Search className="w-4 h-4 text-[#999] absolute left-3 top-1/2 -translate-y-1/2" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className={`${inputClass} pl-9`} />
    </div>
  );
}

export function FilterSelect({
  value, onChange, options, label, className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: (string | { value: string; label: string })[];
  label: string;
  className?: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className={cn(inputClass, "md:w-44", className)}>
      {options.map((o) => {
        const opt = typeof o === "string" ? { value: o, label: o } : o;
        return <option key={opt.value} value={opt.value}>{opt.label}</option>;
      })}
    </select>
  );
}

export function FilterPills<T extends string>({
  options, value, onChange,
}: {
  options: { key: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="mb-3 flex gap-1 flex-wrap" role="tablist">
      {options.map((t) => {
        const active = value === t.key;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={cn(
              "px-3 py-1.5 text-[12px] rounded-full border transition cursor-pointer",
              active ? "bg-[#0061FF] text-white border-[#0061FF]" : "bg-white text-[#666] border-[#e5e7eb] hover:bg-[#f5f5f5]",
            )}
          >
            {t.label}
            {t.count !== undefined && <span className="opacity-70"> ({t.count})</span>}
          </button>
        );
      })}
    </div>
  );
}

// Generic tab bar in the TabNavigation pill style (TabNavigation itself
// hard-codes its mobile labels, so it can't be reused for arbitrary tabs).
export function Tabs<T extends string>({
  tabs, value, onChange, className,
}: {
  tabs: { key: T; label: string; icon?: LucideIcon }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={cn("flex items-center gap-2 mb-5 bg-[#EFEFEF] p-1.5 rounded-xl w-full md:w-max overflow-x-auto scrollbar-hide", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={value === tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            "flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer",
            value === tab.key ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-200",
          )}
        >
          {tab.icon && <tab.icon size={14} />}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// Controlled switch styled like the existing ToggleSwitch (which is
// uncontrolled and has no accessible role).
export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative w-11 h-6 rounded-full transition-colors bg-[#d9d9d9] shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4f31]"
    >
      <span
        className={cn(
          "absolute top-0 left-0 w-6 h-6 rounded-full shadow-md transition-transform border border-[#EBEBEB]",
          checked ? "translate-x-5 bg-linear-to-r from-[#7CE000] to-[#03A800]" : "translate-x-0 bg-white",
        )}
      />
    </button>
  );
}

// ── data table ───────────────────────────────────────────────────────────────
export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (row: T) => React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  // Return a primitive to enable client-side sorting on this column.
  sortValue?: (row: T) => string | number;
}

export function DataTable<T>({
  columns, rows, rowKey, onRowClick, empty, selectable, selected, onSelectedChange, pageSize = 10, paginate = true, dense,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  empty?: React.ReactNode;
  selectable?: boolean;
  selected?: string[];
  onSelectedChange?: (keys: string[]) => void;
  pageSize?: number;
  paginate?: boolean;
  dense?: boolean;
}) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(pageSize);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const get = col.sortValue;
    return [...rows].sort((a, b) => {
      const av = get(a), bv = get(b);
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [rows, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / limit));
  const safePage = Math.min(page, totalPages);
  const visible = paginate ? sorted.slice((safePage - 1) * limit, safePage * limit) : sorted;
  const sel = selected ?? [];
  const allVisibleSelected = visible.length > 0 && visible.every((r) => sel.includes(rowKey(r)));

  const toggleAll = () => {
    if (!onSelectedChange) return;
    const keys = visible.map(rowKey);
    onSelectedChange(allVisibleSelected ? sel.filter((k) => !keys.includes(k)) : Array.from(new Set([...sel, ...keys])));
  };
  const toggleOne = (k: string) => onSelectedChange?.(sel.includes(k) ? sel.filter((x) => x !== k) : [...sel, k]);

  const cellPad = dense ? "px-3 py-2" : "px-4 py-2.5";

  if (rows.length === 0) {
    return <>{empty ?? <EmptyState title="No records found" message="Try adjusting the search or filters." />}</>;
  }

  return (
    <div>
      <div className="border border-[#e5e7eb] rounded-lg overflow-x-auto bg-white">
        <table className="w-full text-[13px] min-w-max">
          <thead className="bg-[#fafafa] text-[#666]">
            <tr>
              {selectable && (
                <th className={cn(cellPad, "w-10")}>
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} aria-label="Select all rows on this page" className="accent-[#ff4f31] w-4 h-4 cursor-pointer" />
                </th>
              )}
              {columns.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <th key={c.key} scope="col" className={cn(cellPad, "font-medium whitespace-nowrap", c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left", c.className)}>
                    {c.sortValue ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 hover:text-[#333] cursor-pointer"
                        onClick={() => setSort(active && sort?.dir === "asc" ? { key: c.key, dir: "desc" } : { key: c.key, dir: "asc" })}
                        aria-label={`Sort by ${typeof c.header === "string" ? c.header : c.key}`}
                      >
                        {c.header}
                        {active ? (sort?.dir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowDown size={12} className="opacity-25" />}
                      </button>
                    ) : c.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const k = rowKey(row);
              return (
                <tr
                  key={k}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn("border-t border-[#f0f0f0]", onRowClick && "cursor-pointer hover:bg-[#fafafa]", sel.includes(k) && "bg-[#fff6f4]")}
                >
                  {selectable && (
                    <td className={cellPad} onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={sel.includes(k)} onChange={() => toggleOne(k)} aria-label={`Select ${k}`} className="accent-[#ff4f31] w-4 h-4 cursor-pointer" />
                    </td>
                  )}
                  {columns.map((c) => (
                    <td key={c.key} className={cn(cellPad, "text-[#444] whitespace-nowrap", c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left", c.className)}>
                      {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {paginate && sorted.length > limit && (
        <div className="mt-3 border border-[#e5e7eb] rounded-lg px-3 sm:px-5 bg-[#fafafa]">
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={sorted.length}
            itemsPerPage={limit}
            onPageChange={setPage}
            onItemsPerPageChange={(l) => { setLimit(l); setPage(1); }}
            pageSizeOptions={[5, 10, 25, 50]}
          />
        </div>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, message, action }: { icon?: LucideIcon; title: string; message?: string; action?: React.ReactNode }) {
  return (
    <div className="bg-white border border-dashed border-[#e5e7eb] rounded-xl p-8 text-center">
      <div className="w-12 h-12 rounded-full bg-[#f5f5f5] flex items-center justify-center mx-auto mb-3">
        <Icon className="w-6 h-6 text-[#bbb]" />
      </div>
      <p className="text-[14px] font-medium text-[#333]">{title}</p>
      {message && <p className="text-[12px] text-[#999] mt-1">{message}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

// ── forms ─────────────────────────────────────────────────────────────────────
export function Field({
  label, required, error, hint, children, className, htmlFor,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={className}>
      <label className={labelClass} htmlFor={htmlFor}>
        {label}
        {required && <span className="text-[#FE2B73] ml-0.5" aria-hidden>*</span>}
      </label>
      {children}
      {error ? <p className="text-[11px] text-[#FE2B73] mt-1" role="alert">{error}</p> : hint ? <p className="text-[11px] text-[#999] mt-1">{hint}</p> : null}
    </div>
  );
}

export function TextInput({ error, className, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return <input className={cn(error ? inputErrorClass : inputClass, className)} aria-invalid={error || undefined} {...rest} />;
}

export function SelectInput({
  options, placeholder, error, className, ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { options: (string | { value: string; label: string })[]; placeholder?: string; error?: boolean }) {
  return (
    <select className={cn(error ? inputErrorClass : inputClass, className)} aria-invalid={error || undefined} {...rest}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => {
        const opt = typeof o === "string" ? { value: o, label: o } : o;
        return <option key={opt.value} value={opt.value}>{opt.label}</option>;
      })}
    </select>
  );
}

export function TextArea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputClass, "min-h-[88px] resize-y", className)} {...rest} />;
}

export function FormGrid({ children, cols = 2 }: { children: React.ReactNode; cols?: 1 | 2 | 3 }) {
  const map = { 1: "", 2: "md:grid-cols-2", 3: "md:grid-cols-2 lg:grid-cols-3" };
  return <div className={cn("grid grid-cols-1 gap-4", map[cols])}>{children}</div>;
}

export function RadioCards<T extends string>({
  options, value, onChange, name,
}: {
  options: { value: T; label: string; description?: string }[];
  value: T;
  onChange: (v: T) => void;
  name: string;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup">
      {options.map((o) => (
        <label
          key={o.value}
          className={cn(
            "flex items-start gap-2.5 border rounded-lg px-3 py-2.5 cursor-pointer transition-colors",
            value === o.value ? "border-[#ff4f31] bg-[#fff6f4]" : "border-[#e5e7eb] bg-white hover:bg-[#fafafa]",
          )}
        >
          <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="mt-0.5 accent-[#ff4f31]" />
          <span>
            <span className="block text-[13px] font-medium text-[#333]">{o.label}</span>
            {o.description && <span className="block text-[11px] text-[#999]">{o.description}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}

// ── dialogs (wrap the shared Modal) ──────────────────────────────────────────
export function ConfirmDialog({
  open, onClose, onConfirm, title, message, confirmLabel = "Confirm", danger, children, confirmDisabled,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  children?: React.ReactNode;
  confirmDisabled?: boolean;
}) {
  return (
    <Modal isOpen={open} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col gap-4">
        {message && <div className="text-[13px] text-[#666]">{message}</div>}
        {children}
        <div className="flex gap-3 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1 h-11!">Cancel</Button>
          <Button
            variant={danger ? "custom" : "gradient"}
            customStyles={danger ? { background: "#FE306C", text: "#fff" } : undefined}
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="flex-1 h-11!"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── media placeholders ───────────────────────────────────────────────────────
export function PhotoSlot({ label, captured, onCapture, meta, imageUrl, busy }: {
  label: string; captured?: boolean; onCapture?: () => void; meta?: string;
  /** Thumbnail of the captured photo; without it a captured slot shows an icon. */
  imageUrl?: string | null;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onCapture}
      disabled={busy}
      className={cn(
        "relative aspect-[4/3] w-full overflow-hidden rounded-lg border flex flex-col items-center justify-center gap-1 text-center px-2 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4f31] disabled:cursor-wait",
        captured ? "border-green-300 bg-linear-to-br from-slate-200 to-slate-300" : "border-dashed border-[#d9d9d9] bg-[#fafafa] hover:bg-[#f3f3f3]",
      )}
      aria-label={captured ? `${label} captured — retake` : `Capture ${label}`}
    >
      {captured && imageUrl && <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      {busy ? <Loader2 className="relative w-6 h-6 text-[#ff4f31] animate-spin" />
        : captured ? (!imageUrl && <ImageIcon className="w-6 h-6 text-slate-500" />) : <Camera className="w-6 h-6 text-[#bbb]" />}
      <span className={cn("relative text-[11px] font-medium", captured && imageUrl ? "text-white bg-black/50 rounded px-1" : "text-[#555]")}>{label}</span>
      {captured && meta && <span className="absolute bottom-1 left-1 right-1 text-[9px] text-white bg-black/50 rounded px-1 py-0.5 truncate">{meta}</span>}
      {captured && <CircleCheck className="absolute top-1.5 right-1.5 w-4 h-4 text-green-600" />}
    </button>
  );
}

// ── timeline ─────────────────────────────────────────────────────────────────
export function Timeline({ items }: { items: { id: string; icon: LucideIcon; title: React.ReactNode; meta: React.ReactNode; body?: React.ReactNode; tone?: Tone }[] }) {
  return (
    <ol className="relative">
      {items.map((it, i) => (
        <li key={it.id} className="flex gap-3 pb-5 last:pb-0 relative">
          {i < items.length - 1 && <span className="absolute left-4 top-9 bottom-0 w-px bg-[#e5e7eb]" aria-hidden />}
          <span className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", TONE_CLASS[it.tone ?? "gray"])}>
            <it.icon size={15} />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[13px] font-medium text-[#333]">{it.title}</p>
            <p className="text-[11px] text-[#999]">{it.meta}</p>
            {it.body && <div className="text-[12px] text-[#555] mt-1">{it.body}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}

// Simple summary row list (label · value) used in totals panels.
export function SummaryRows({ rows, total }: { rows: { label: React.ReactNode; value: React.ReactNode; muted?: boolean; negative?: boolean }[]; total?: { label: React.ReactNode; value: React.ReactNode } }) {
  return (
    <div className="text-[13px]">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center justify-between gap-3 py-1.5">
          <span className={r.muted ? "text-[#999]" : "text-[#555]"}>{r.label}</span>
          <span className={cn("tabular-nums", r.negative ? "text-[#e53e3e]" : "text-[#333]")}>{r.value}</span>
        </div>
      ))}
      {total && (
        <div className="flex items-center justify-between gap-3 pt-2.5 mt-1.5 border-t border-[#e5e7eb]">
          <span className="font-semibold text-[#333]">{total.label}</span>
          <span className="font-semibold text-[16px] text-[#333] tabular-nums">{total.value}</span>
        </div>
      )}
    </div>
  );
}
