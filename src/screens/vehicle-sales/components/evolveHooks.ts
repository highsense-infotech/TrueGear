// Hooks for the live Evolve calls (kept out of evolve.tsx so that file only
// exports components, as react-refresh requires).

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ApiResponse } from "../../../api/types";
import { getEvolveStatus, type EvolveStatus } from "../../../api/vehicleSalesEvolve.api";

/** The message to show for a failed Evolve call (backend envelope → axios → generic). */
export function evolveErrorMessage(err: unknown): string {
  const e = err as { response?: { status?: number; data?: { error?: { message?: string } } }; message?: string };
  const fromApi = e?.response?.data?.error?.message;
  if (fromApi) return fromApi;
  if (e?.response?.status === 403) return "Your role does not have permission for this Evolve call. Ask an administrator to grant it in Role & User Management.";
  if (!e?.response) return "The TrueGear server could not be reached, so Evolve was not called.";
  return e?.message || "Evolve request failed.";
}

/** True when the server refused because Evolve writes are switched off (HTTP 409). */
export function isWritesDisabled(err: unknown): boolean {
  return (err as { response?: { status?: number } })?.response?.status === 409;
}

export function unwrap<T>(res: ApiResponse<T>): T {
  if (!res.success || res.data === null) throw new Error(res.error?.message || "Evolve returned no data");
  return res.data;
}

export interface EvolveQuery<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

/**
 * Runs a live Evolve read when `enabled` and re-runs it when `key` changes.
 * Nothing is fetched while disabled, so a screen can offer "Load from Evolve"
 * without calling Evolve on every open.
 */
export function useEvolve<T>(load: () => Promise<ApiResponse<T>>, key: string, enabled = true): EvolveQuery<T> {
  // The result remembers which request it answers; loading = the current
  // request has no answer yet. The previous data stays visible meanwhile.
  const [result, setResult] = useState<{ for: string; data: T | null; error: string | null } | null>(null);
  const [nonce, setNonce] = useState(0);
  const request = `${key}#${nonce}`;
  const loadRef = useRef(load);
  useLayoutEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    loadRef
      .current()
      .then((res) => live && setResult({ for: request, data: unwrap(res), error: null }))
      .catch((err) => live && setResult({ for: request, data: null, error: evolveErrorMessage(err) }));
    return () => {
      live = false;
    };
  }, [request, enabled]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const loading = enabled && result?.for !== request;
  return { data: result?.data ?? null, error: loading ? null : (result?.error ?? null), loading, reload };
}

// One status request per page load — every write button needs it.
let statusPromise: Promise<EvolveStatus | null> | null = null;
function loadStatus(): Promise<EvolveStatus | null> {
  statusPromise ??= getEvolveStatus()
    .then((r) => r.data ?? null)
    .catch(() => {
      statusPromise = null; // retry on the next screen open
      return null;
    });
  return statusPromise;
}

/** Evolve link status from the server; null while loading or when unreachable. */
export function useEvolveStatus(): EvolveStatus | null {
  const [status, setStatus] = useState<EvolveStatus | null>(null);
  useEffect(() => {
    let live = true;
    loadStatus().then((s) => live && setStatus(s));
    return () => {
      live = false;
    };
  }, []);
  return status;
}
