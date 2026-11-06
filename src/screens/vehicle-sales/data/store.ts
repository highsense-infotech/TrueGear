// Store for the Vehicle Sales UI. Everything is saved on the TrueGear server
// and shared by all users; hydrate() loads it when Vehicle Sales opens.
//
// - Purchase orders, stock and goods receipts use their own endpoints (Phase 2).
//   New POs and received vehicles are created through the API directly.
// - Every other list (customers, enquiries, quotes, deals, activities, test
//   drives, lost deals, handovers) is saved as one record per item, and every
//   other `extra` key as a module setting (Phase 3). Screens just call
//   add / update / remove / setExtra; syncToServer() sends the difference.
// - Document numbers come from the server: await salesStore.allocate("DL").

import { useSyncExternalStore } from "react";
import toast from "react-hot-toast";
import {
  getVehicleSalesData, patchStockVehicle, saveReceipt, savePoUnit, saveRecord, deleteRecord, saveSetting, allocateNumbers,
  type StockPatch,
} from "../../../api/vehicleSales.api";
import type { Branch, Customer, Enquiry, PurchaseOrder, SalesUser, StockVehicle } from "./mock";
import { SALES_USERS, setSalesUsers, setQuoteCatalogue, type QuoteItem } from "./mock";
import { getEvolveMasters, type EvolveMasterItem } from "../../../api/vehicleSalesEvolve.api";

export type QuoteStatus = "Draft" | "Awaiting approval" | "Sent" | "Viewed" | "Accepted" | "Changes requested" | "Rejected" | "Superseded";

export interface Quote {
  id: string;
  version: number;
  enquiryId: string;
  customerId: string;
  stockNo: string;
  date: string;
  vehiclePrice: number;
  discount: number;
  accessories: string[];
  fi: string[];
  maintenance: string;
  tradeIn: TradeIn | null;
  deposit: number;
  total: number;
  status: QuoteStatus;
  createdBy: string;
}

export interface TradeIn {
  make: string;
  model: string;
  year: number;
  registration: string;
  value: number;
  settlement: number;
}

export interface Payment {
  id: string;
  date: string;
  method: string;
  reference: string;
  amount: number;
  evolve: "Pending manual entry" | "Manual in Evolve";
}

export type DealStatus = "Draft" | "Awaiting finance" | "Awaiting invoice" | "Invoiced" | "Delivered" | "Cancellation requested" | "Cancelled";

export interface Deal {
  id: string;
  quoteId: string;
  quoteVersion: number;
  enquiryId: string;
  customerId: string;
  stockNo: string;
  repId: string;
  managerId: string;
  fiId: string;
  arAccount: string;
  vehiclePrice: number;
  discount: number;
  accessories: string[];
  fi: string[];
  maintenance: string;
  tradeIn: TradeIn | null;
  deposit: number;
  status: DealStatus;
  created: string;
  payments: Payment[];
  financeStatus?: "Not started" | "Captured" | "Submitted to bank" | "Approved" | "Declined";
  evolveDealNo?: string;
  invoiceNo?: string;
  fleet?: boolean;
}

export interface LostDeal {
  enquiryId: string;
  reason: string;
  competitor: string;
  date: string;
  note: string;
}

export interface Activity {
  id: string;
  customerId: string;
  enquiryId?: string;
  type: string;
  date: string;
  note: string;
  by: string;
}

export interface TestDrive {
  id: string;
  enquiryId: string;
  customerId: string;
  stockNo: string;
  date: string;
  time: string;
  execId: string;
  status: "Booked" | "In progress" | "Completed" | "Cancelled";
  startOdo?: number;
  endOdo?: number;
  feedback?: string;
  // Driving licence read by the AI scan before the drive (images are not kept).
  licenceNo?: string;
  licenceName?: string;
  licenceScannedAt?: string;
}

export interface Handover {
  stockNo: string;
  dealId: string;
  pdiStage: number; // 0..4, 4 = all PDI stages passed
  checklistDone: boolean;
  registration: string;
  gatePass?: { no: string; issued: string; redeemed?: string };
}

// Body building (module 7). Masters and jobs live in `extra` via
// usePersistentState; the helpers below let Handover read them.
export interface BodyBuilder {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  location: string;
  bodyTypeIds: string[];
  active: boolean;
}

export interface BodyType {
  id: string;
  name: string;
  buildDays: number;
  description: string;
}

export type BodyJobStatus = "Sent" | "In progress" | "Returned" | "Rework" | "Completed";

export interface BodyJob {
  id: string;
  dealId: string;
  stockNo: string;
  builderId: string;
  bodyTypeId: string;
  sentOn: string;
  expectedReturn: string;
  returnedOn?: string;
  status: BodyJobStatus;
  updates: { at: string; status: BodyJobStatus; note: string; by: string }[];
  returnCheck?: { items: Record<string, "pass" | "fail">; notes: string; at: string; passed: boolean };
}

export const BODY_KEYS = { builders: "body.builders", types: "body.types", jobs: "body.jobs" } as const;

export interface SalesData {
  purchaseOrders: PurchaseOrder[];
  stock: StockVehicle[];
  customers: Customer[];
  enquiries: Enquiry[];
  lostDeals: LostDeal[];
  quotes: Quote[];
  deals: Deal[];
  activities: Activity[];
  testDrives: TestDrive[];
  handovers: Handover[];
  counters: Record<string, number>;
  // Module-local lists/settings kept via usePersistentState().
  extra: Record<string, unknown>;
}

type ListKey = Exclude<keyof SalesData, "counters" | "extra">;
type Item<K extends ListKey> = SalesData[K][number];

// `extra` keys with their own Phase 2 endpoints (PO / goods receipt). Every
// other `extra` key is a module setting saved with saveSetting().
export const SERVER_EXTRAS = {
  receipts: "receiving.receipts",
  onOrderManual: "buying.onOrderManual",
  onOrderEvolve: "buying.onOrderEvolve",
  approvalHistory: "buying.approvalHistory",
} as const;
const PHASE2_EXTRAS: string[] = Object.values(SERVER_EXTRAS);

// Phase 3 collections saved as records; the key identifies a record on the server.
const RECORD_KEYS = {
  customers: (c: Customer) => c.id,
  enquiries: (e: Enquiry) => e.id,
  lostDeals: (l: LostDeal) => l.enquiryId,
  quotes: (q: Quote) => `${q.id}-v${q.version}`,
  deals: (d: Deal) => d.id,
  activities: (a: Activity) => a.id,
  testDrives: (t: TestDrive) => t.id,
  handovers: (h: Handover) => h.dealId,
} as const;
type RecordList = keyof typeof RECORD_KEYS;
const RECORD_LISTS = Object.keys(RECORD_KEYS) as RecordList[];
const recordKey = (list: RecordList, item: unknown) => (RECORD_KEYS[list] as (x: unknown) => string)(item);

const empty = (): SalesData => ({
  purchaseOrders: [],
  stock: [],
  customers: [],
  enquiries: [],
  lostDeals: [],
  quotes: [],
  deals: [],
  activities: [],
  testDrives: [],
  handovers: [],
  counters: {},
  extra: {},
});

// Test data kept in localStorage before everything moved to the server is no
// longer read; clear it once so it cannot be mistaken for live data.
try {
  localStorage.removeItem("truegear.vehicleSales.testData.v1");
} catch {
  // Storage blocked — nothing to clear.
}

let state: SalesData = empty();
const listeners = new Set<() => void>();

function commit(next: SalesData) {
  const prev = state;
  state = next;
  listeners.forEach((l) => l());
  if (hydration.status === "ready") syncToServer(prev, next);
}

// ── Server sync ──────────────────────────────────────────────────────────────
type Hydration = { status: "idle" | "loading" | "ready" | "error"; error?: string };
let hydration: Hydration = { status: "idle" };
const hydrationListeners = new Set<() => void>();
const setHydration = (h: Hydration) => {
  hydration = h;
  hydrationListeners.forEach((l) => l());
};

const errorMessage = (err: unknown) =>
  (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
  ((err as { response?: unknown })?.response ? "The server refused the change." : "The TrueGear server could not be reached.");

// Saves for one record run one at a time, and each sends the record as it is
// when its turn comes — so quick successive edits can't arrive out of order
// and overwrite a newer copy with an older one. Several changes queued while a
// save is in flight collapse into one save of the latest state.
const queues = new Map<string, { running: Promise<void>; pending: boolean }>();
function queued(key: string, what: string, save: () => Promise<unknown> | null) {
  const q = queues.get(key);
  if (q?.pending) return; // a save of the latest state is already queued
  const run = async () => {
    const entry = queues.get(key);
    if (entry) entry.pending = false;
    const p = save();
    if (!p) return;
    try {
      await p;
    } catch (err) {
      // A failed save is shown, then the server copy is reloaded so the screen
      // never keeps showing a change that was not stored.
      toast.error(`${what} was not saved: ${errorMessage(err)}`);
      void salesStore.hydrate();
    }
  };
  const running = (q?.running ?? Promise.resolve()).then(run);
  queues.set(key, { running, pending: true });
  void running.finally(() => {
    if (queues.get(key)?.running === running) queues.delete(key);
  });
}

const STOCK_FIELDS = ["status", "reservedFor", "current", "retail", "registration", "odometer"] as const;

function syncToServer(prev: SalesData, next: SalesData) {
  // Stock: send the changed fields of each changed vehicle (QC hold, reserve, sold …).
  if (prev.stock !== next.stock) {
    const before = new Map(prev.stock.map((v) => [v.stockNo, v]));
    for (const v of next.stock) {
      const old = before.get(v.stockNo);
      if (!old || old === v) continue;
      if (!STOCK_FIELDS.some((f) => old[f] !== v[f])) continue;
      queued(`stock:${v.stockNo}`, v.stockNo, () => {
        const cur = state.stock.find((x) => x.stockNo === v.stockNo);
        if (!cur) return null;
        const patch: Record<string, unknown> = {};
        for (const f of STOCK_FIELDS) patch[f] = cur[f] ?? null;
        return patchStockVehicle(v.stockNo, patch as StockPatch);
      });
    }
  }

  // Phase 3 records: save added / changed ones, delete removed ones.
  for (const list of RECORD_LISTS) {
    if (prev[list] === next[list]) continue;
    const before = new Map((prev[list] as unknown[]).map((it) => [recordKey(list, it), it]));
    const after = new Map((next[list] as unknown[]).map((it) => [recordKey(list, it), it]));
    for (const [key, it] of after) {
      if (before.get(key) === it) continue;
      queued(`rec:${list}:${key}`, `${key}`, () => {
        const cur = (state[list] as unknown[]).find((x) => recordKey(list, x) === key);
        return cur ? saveRecord(list, key, cur as object) : deleteRecord(list, key);
      });
    }
    for (const key of before.keys()) {
      if (!after.has(key)) queued(`rec:${list}:${key}`, `${key}`, () => deleteRecord(list, key));
    }
  }

  if (prev.extra === next.extra) return;
  // Goods receipts: send each changed receipt in full.
  const rk = SERVER_EXTRAS.receipts;
  if (prev.extra[rk] !== next.extra[rk]) {
    const a = (prev.extra[rk] ?? {}) as Record<string, unknown>;
    const b = (next.extra[rk] ?? {}) as Record<string, Record<string, unknown>>;
    for (const [stockNo, r] of Object.entries(b)) {
      if (a[stockNo] === r) continue;
      queued(`receipt:${stockNo}`, `Receipt for ${stockNo}`, () => {
        const cur = ((state.extra[rk] ?? {}) as Record<string, Record<string, unknown>>)[stockNo];
        return cur ? saveReceipt(stockNo, cur) : null;
      });
    }
  }
  // On-order units entered manually in Evolve / sent with 23.
  const unitMaps = [[SERVER_EXTRAS.onOrderManual, "manual"], [SERVER_EXTRAS.onOrderEvolve, "evolveStockNo"]] as const;
  for (const [key, field] of unitMaps) {
    if (prev.extra[key] === next.extra[key]) continue;
    const a = (prev.extra[key] ?? {}) as Record<string, unknown>;
    const b = (next.extra[key] ?? {}) as Record<string, boolean | string>;
    for (const [unitKey, val] of Object.entries(b)) {
      if (a[unitKey] !== val) queued(`unit:${field}:${unitKey}`, `Unit ${unitKey}`, () => savePoUnit(unitKey, { [field]: val }));
    }
  }
  // Every other changed key is a module setting (rules, templates, body jobs …).
  for (const [key, value] of Object.entries(next.extra)) {
    if (PHASE2_EXTRAS.includes(key) || prev.extra[key] === value) continue;
    queued(`setting:${key}`, `Setting ${key}`, () => saveSetting(key, state.extra[key] ?? null));
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// ── Quote items from Evolve (07 Accessories / FIDealInsurances /
// ExtendedMaintenanceContracts) ────────────────────────────────────────────────
// Loaded beside the data (never blocks it); screens re-render via the listeners.
let quoteCatalogue: "loading" | "ready" | "failed" = "loading";
let quoteCatalogueLoad: Promise<void> | null = null;
export const quoteCatalogueStatus = () => quoteCatalogue;

function loadQuoteCatalogue(): Promise<void> {
  if (quoteCatalogueLoad && quoteCatalogue !== "failed") return quoteCatalogueLoad;
  quoteCatalogue = "loading";
  const toItems = (list?: EvolveMasterItem[]): QuoteItem[] =>
    (list ?? []).map((m) => ({ code: m.code, name: m.name || m.code, price: m.amount ?? 0 })).filter((m) => m.code);
  quoteCatalogueLoad = getEvolveMasters(["accessories", "fiInsurances", "maintenanceContracts"])
    .then((res) => {
      if (!res.success || !res.data) throw new Error("No data");
      setQuoteCatalogue({ accessories: toItems(res.data.accessories), fi: toItems(res.data.fiInsurances), plans: toItems(res.data.maintenanceContracts) });
      quoteCatalogue = "ready";
    })
    .catch(() => { quoteCatalogue = "failed"; })
    .finally(() => { state = { ...state }; listeners.forEach((l) => l()); }); // new snapshot → subscribers re-render
  return quoteCatalogueLoad;
}

export const salesStore = {
  get: () => state,

  add<K extends ListKey>(key: K, item: Item<K>) {
    commit({ ...state, [key]: [item, ...(state[key] as Item<K>[])] });
  },

  update<K extends ListKey>(key: K, match: (item: Item<K>) => boolean, patch: Partial<Item<K>> | ((item: Item<K>) => Item<K>)) {
    const list = (state[key] as Item<K>[]).map((it) => (match(it) ? (typeof patch === "function" ? patch(it) : { ...it, ...patch }) : it));
    commit({ ...state, [key]: list });
  },

  remove<K extends ListKey>(key: K, match: (item: Item<K>) => boolean) {
    commit({ ...state, [key]: (state[key] as Item<K>[]).filter((it) => !match(it)) });
  },

  /**
   * Next document number(s) from the server, e.g. allocate("DL") → ["DL-2026-0007"].
   * The server counter makes them unique across all users.
   */
  async allocate(prefix: string, count = 1): Promise<string[]> {
    try {
      const res = await allocateNumbers(prefix, count);
      if (!res.success || !res.data?.numbers?.length) throw new Error(res.error?.message || `No ${prefix} number returned`);
      return res.data.numbers;
    } catch (err) {
      // Shown here so every caller gets feedback; the caller's action stops.
      toast.error(`Could not get a ${prefix} number: ${errorMessage(err)}`);
      throw err;
    }
  },

  /** One document number from the server (see allocate). */
  async nextNumber(prefix: string): Promise<string> {
    return (await salesStore.allocate(prefix))[0];
  },

  /** Internal id for records nobody refers to by number (activity log entries). */
  localId(prefix: string) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
  },

  setExtra(key: string, value: unknown) {
    commit({ ...state, extra: { ...state.extra, [key]: value } });
  },

  /** Load (or reload) everything from the server. Called when Vehicle Sales opens. */
  async hydrate() {
    if (hydration.status !== "ready") setHydration({ status: "loading" });
    void loadQuoteCatalogue();
    try {
      const res = await getVehicleSalesData();
      if (!res.success || !res.data) throw new Error(res.error?.message || "No data returned");
      const d = res.data;
      const list = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
      setSalesUsers(list<{ id: string; name: string; role: SalesUser["role"]; email: string; evolveRep?: string }>(d.salesUsers)
        .map((u) => ({ ...u, branch: "" as const })));
      const recs = d.records ?? {};
      state = {
        ...empty(),
        purchaseOrders: list(d.purchaseOrders),
        stock: list(d.stock),
        customers: list(recs.customers),
        enquiries: list(recs.enquiries),
        lostDeals: list(recs.lostDeals),
        quotes: list(recs.quotes),
        deals: list(recs.deals),
        activities: list(recs.activities),
        testDrives: list(recs.testDrives),
        handovers: list(recs.handovers),
        extra: {
          ...(d.settings ?? {}),
          [SERVER_EXTRAS.receipts]: d.receipts ?? {},
          [SERVER_EXTRAS.onOrderManual]: d.onOrderManual ?? {},
          [SERVER_EXTRAS.onOrderEvolve]: d.onOrderEvolve ?? {},
          [SERVER_EXTRAS.approvalHistory]: list(d.approvalHistory),
        },
      };
      listeners.forEach((l) => l());
      setHydration({ status: "ready" });
    } catch (err) {
      setHydration({ status: "error", error: errorMessage(err) });
    }
  },

  /** True while any change is still being saved (used to avoid reloading over it). */
  saving: () => queues.size > 0,

  /** Put records the server returned (new PO, received vehicle …) into the store without sending them back. */
  applyServer(patch: { purchaseOrder?: PurchaseOrder; vehicle?: StockVehicle; receipt?: { stockNo: string; data: Record<string, unknown> } }) {
    let next = state;
    const po = patch.purchaseOrder;
    if (po) {
      const exists = next.purchaseOrders.some((p) => p.id === po.id);
      next = { ...next, purchaseOrders: exists ? next.purchaseOrders.map((p) => (p.id === po.id ? po : p)) : [po, ...next.purchaseOrders] };
    }
    const vehicle = patch.vehicle;
    if (vehicle) next = { ...next, stock: [vehicle, ...next.stock.filter((v) => v.stockNo !== vehicle.stockNo)] };
    if (patch.receipt) {
      const rk = SERVER_EXTRAS.receipts;
      next = { ...next, extra: { ...next.extra, [rk]: { ...((next.extra[rk] ?? {}) as object), [patch.receipt.stockNo]: patch.receipt.data } } };
    }
    state = next;
    listeners.forEach((l) => l());
  },
};

/** Loading state of the server records (for the module banner). */
export function useServerRecords(): Hydration {
  return useSyncExternalStore(
    (l) => {
      hydrationListeners.add(l);
      return () => {
        hydrationListeners.delete(l);
      };
    },
    () => hydration,
    () => hydration,
  );
}

/** Subscribe a component to the test store; it re-renders on every change. */
export function useSalesData(): SalesData {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

/**
 * useState that survives navigation and reloads (until "Reset test data").
 * Use for module-local lists such as calendar tasks or assignment rules.
 */
export function usePersistentState<T>(key: string, initial: T): [T, (next: T | ((prev: T) => T)) => void] {
  const data = useSalesData();
  const value = (key in data.extra ? data.extra[key] : initial) as T;
  const set = (next: T | ((prev: T) => T)) => {
    const prev = (key in state.extra ? state.extra[key] : initial) as T;
    salesStore.setExtra(key, typeof next === "function" ? (next as (p: T) => T)(prev) : next);
  };
  return [value, set];
}

// ── Lookups (read the current snapshot; call useSalesData() in the component
//    so it re-renders when these change) ────────────────────────────────────
export const stockByNo = (no: string | null | undefined) => state.stock.find((v) => v.stockNo === no);
export const customerById = (id: string | null | undefined) => state.customers.find((c) => c.id === id);
export const enquiryById = (id: string | null | undefined) => state.enquiries.find((e) => e.id === id);
export const dealById = (id: string | null | undefined) => state.deals.find((d) => d.id === id);
export const userById = (id: string | null | undefined) => SALES_USERS.find((u) => u.id === id);

export const today = () => new Date().toISOString().slice(0, 10);

export const bodyJobs = (data: SalesData = state) => (data.extra[BODY_KEYS.jobs] ?? []) as BodyJob[];
// The open (not completed) body building job for a vehicle, if any — it blocks PDI and release.
export const openBodyJobFor = (stockNo: string, data: SalesData = state) =>
  bodyJobs(data).find((j) => j.stockNo === stockNo && j.status !== "Completed");

export type { Branch };
