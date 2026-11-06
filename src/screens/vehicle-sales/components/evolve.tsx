// Live Evolve building blocks: a card that loads an Evolve read on demand, and
// the Send / Preview buttons for Evolve writes. Writes stay refused by the
// server until EVOLVE_VEHICLE_SALES_WRITES_ENABLED is on; Preview (dryRun) works
// either way and shows the exact XML that would be sent.

import React, { useState } from "react";
import { RefreshCw, CloudDownload, Send, Code2, Lock, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Modal from "../../../components/common/Modal";
import type { ApiResponse } from "../../../api/types";
import type { EvolveWriteResult } from "../../../api/vehicleSalesEvolve.api";
import { Badge, Card, Notice, SmallButton } from "./ui";
import { evolveErrorMessage, isWritesDisabled, unwrap, useEvolve, useEvolveStatus } from "./evolveHooks";

export function EvolveLiveBadge({ api }: { api: string }) {
  return (
    <Badge tone="blue">
      <CloudDownload size={12} /> Live Evolve · {api}
    </Badge>
  );
}

/**
 * Card that runs one Evolve read. With `autoLoad` it loads on open; otherwise
 * the user presses "Load from Evolve" first, so the screen never calls Evolve
 * unless asked.
 */
export function EvolveLiveCard<T>({
  title, api, load, loadKey = "", autoLoad = false, icon, empty, children, className,
}: {
  title: React.ReactNode;
  api: string;
  load: () => Promise<ApiResponse<T>>;
  loadKey?: string;
  autoLoad?: boolean;
  icon?: LucideIcon;
  empty?: (data: T) => boolean;
  children: (data: T) => React.ReactNode;
  className?: string;
}) {
  const [requested, setRequested] = useState(autoLoad);
  const q = useEvolve(load, loadKey, requested);
  return (
    <Card
      title={title}
      icon={icon}
      className={className}
      subtitle={<EvolveLiveBadge api={api} />}
      actions={
        requested ? (
          <SmallButton icon={q.loading ? Loader2 : RefreshCw} onClick={q.reload} disabled={q.loading}>
            {q.loading ? "Loading…" : "Refresh"}
          </SmallButton>
        ) : (
          <SmallButton variant="primary" icon={CloudDownload} onClick={() => setRequested(true)}>
            Load from Evolve
          </SmallButton>
        )
      }
    >
      {!requested && <p className="text-[12px] text-[#999]">Not loaded yet. Press “Load from Evolve” to read the live data.</p>}
      {requested && q.loading && !q.data && <p className="text-[12px] text-[#999]">Reading from Evolve…</p>}
      {q.error && (
        <Notice tone="danger" title="Evolve did not answer">
          {q.error}
        </Notice>
      )}
      {q.data !== null && !q.error && (empty?.(q.data) ? <p className="text-[12px] text-[#999]">Evolve returned no rows.</p> : children(q.data))}
    </Card>
  );
}

/**
 * Send-to-Evolve and Preview-XML buttons for one write. `build` returns the
 * payload, or a string explaining what is missing. `onSent` gets the Evolve
 * result (e.g. the new deal number) so the screen can record it.
 */
export function EvolveWriteActions<P, R>({
  label, build, send, onSent, className,
}: {
  label: string;
  build: () => P | string;
  send: (payload: P, opts: { dryRun?: boolean }) => Promise<ApiResponse<EvolveWriteResult<R>>>;
  onSent: (result: R) => void;
  className?: string;
}) {
  const status = useEvolveStatus();
  const [busy, setBusy] = useState<"send" | "preview" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [xml, setXml] = useState<string | null>(null);

  const run = async (dryRun: boolean) => {
    const payload = build();
    if (typeof payload === "string") {
      setError(payload);
      return;
    }
    setError(null);
    setBusy(dryRun ? "preview" : "send");
    try {
      const result = unwrap(await send(payload, { dryRun }));
      if (result.sent) onSent(result as R);
      else setXml(result.xml);
    } catch (err) {
      setError(
        isWritesDisabled(err)
          ? `${evolveErrorMessage(err)} Use “Preview XML” to check the payload.`
          : evolveErrorMessage(err),
      );
    } finally {
      setBusy(null);
    }
  };

  const enabled = status?.writesEnabled === true;
  return (
    <div className={className}>
      <div className="flex flex-col gap-2">
        <span title={enabled ? undefined : "Switched off on the server until the Evolve API passes UAT"} className="block">
          <SmallButton
            variant="primary"
            icon={busy === "send" ? Loader2 : enabled ? Send : Lock}
            disabled={!enabled || busy !== null}
            onClick={() => run(false)}
            className="w-full"
          >
            {label}
          </SmallButton>
        </span>
        <SmallButton icon={busy === "preview" ? Loader2 : Code2} disabled={busy !== null} onClick={() => run(true)} className="w-full">
          Preview XML (nothing sent)
        </SmallButton>
      </div>
      {status && (
        <p className="text-[11px] text-[#999] mt-2">
          Evolve {status.interfaceCode} · writes {enabled ? "ON — this sends to Evolve" : "OFF on the server"}
        </p>
      )}
      {error && (
        <Notice tone="danger" className="mt-2">
          {error}
        </Notice>
      )}
      <Modal isOpen={xml !== null} onClose={() => setXml(null)} title="XML that would be sent to Evolve" size="lg">
        <p className="text-[12px] text-[#666] mb-2">Dry run — nothing was sent to Evolve.</p>
        <pre className="text-[11px] leading-snug bg-[#f9fafb] border border-[#e5e7eb] rounded-lg p-3 overflow-x-auto whitespace-pre max-h-[60vh]">{xml}</pre>
      </Modal>
    </div>
  );
}
