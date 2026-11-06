import api from "./axios";
import type { ApiResponse } from "./types";
import type { PurchaseOrder, StockVehicle } from "../screens/vehicle-sales/data/mock";

// Vehicle Sales records saved on the TrueGear server. Backend: /api/vehicle-sales.
// Phase 2: purchase orders, goods receipt, stock (dedicated endpoints).
// Phase 3: every other module as JSON records / settings + server-issued numbers.

export interface VehicleSalesServerData {
  purchaseOrders: PurchaseOrder[];
  stock: StockVehicle[];
  receipts: Record<string, Record<string, unknown>>;
  onOrderManual: Record<string, boolean>;
  onOrderEvolve: Record<string, string>;
  approvalHistory: { id: string; action: "Approved" | "Rejected"; by: string; at: string; reason?: string }[];
  records: Record<string, unknown[]>; // customers, enquiries, quotes, deals …
  salesUsers?: { id: string; name: string; role: "Sales Executive" | "Sales Manager" | "F&I Manager"; email: string; evolveRep?: string }[];
  settings: Record<string, unknown>; // module settings / lists by key
}

export interface NewPurchaseOrder {
  supplier: string;
  supplierAccount?: string;
  branch?: string;
  expected?: string;
  requestedBy: string;
  notes?: string;
  status: "Draft" | "Approval";
  lines: { make?: string; series?: string; modelCode: string; model: string; modelYear?: number; colour: string; spec?: string; qty: number; unitCost: number }[];
}

export interface ReceiveVehicleInput {
  poNo?: string;
  lineKey?: string;
  supplier?: string;
  supplierInvoice?: string;
  vehicle: {
    vin: string;
    engineNo: string;
    make: string;
    model: string;
    modelCode: string;
    year: number;
    colour: string;
    branch: string;
    type: "New" | "Used" | "Demo";
    retail: number;
    cost: number;
    odometer: number;
    registration?: string;
  };
}

export interface ReceiveVehicleResult {
  vehicle: StockVehicle;
  receipt: Record<string, unknown>;
  purchaseOrder?: PurchaseOrder;
}

export type StockPatch = Partial<Pick<StockVehicle, "status" | "current" | "retail" | "odometer">> & {
  reservedFor?: string | null;
  registration?: string | null;
};

const BASE = "/vehicle-sales";

export const getVehicleSalesData = async (): Promise<ApiResponse<VehicleSalesServerData>> => (await api.get(`${BASE}/data`)).data;

export const createPurchaseOrder = async (po: NewPurchaseOrder): Promise<ApiResponse<PurchaseOrder>> =>
  (await api.post(`${BASE}/purchase-orders`, po)).data;
export const submitPurchaseOrder = async (poNo: string): Promise<ApiResponse<PurchaseOrder>> =>
  (await api.post(`${BASE}/purchase-orders/${encodeURIComponent(poNo)}/submit`)).data;
/** Supplier delay: record a revised ETA (the original stays on the PO). */
export const revisePoEta = async (poNo: string, revisedEta: string, reason: string): Promise<ApiResponse<PurchaseOrder>> =>
  (await api.post(`${BASE}/purchase-orders/${encodeURIComponent(poNo)}/eta`, { revisedEta, reason })).data;

export const decidePurchaseOrder = async (poNo: string, action: "Approved" | "Rejected", reason?: string): Promise<ApiResponse<PurchaseOrder>> =>
  (await api.post(`${BASE}/purchase-orders/${encodeURIComponent(poNo)}/decision`, { action, reason })).data;
export const savePoUnit = async (unitKey: string, body: { manual?: boolean; evolveStockNo?: string | null }): Promise<ApiResponse<unknown>> =>
  (await api.put(`${BASE}/po-units/${encodeURIComponent(unitKey)}`, body)).data;

export const receiveVehicle = async (input: ReceiveVehicleInput): Promise<ApiResponse<ReceiveVehicleResult>> =>
  (await api.post(`${BASE}/stock/receive`, input)).data;
export const patchStockVehicle = async (stockNo: string, patch: StockPatch): Promise<ApiResponse<StockVehicle>> =>
  (await api.patch(`${BASE}/stock/${encodeURIComponent(stockNo)}`, patch)).data;
export const saveReceipt = async (stockNo: string, data: Record<string, unknown>): Promise<ApiResponse<unknown>> =>
  (await api.put(`${BASE}/receipts/${encodeURIComponent(stockNo)}`, { data })).data;

/** Add Enquiry › + Add New: creates the customer in the TrueGear customer master
 *  (linked to the company) and starts the Evolve push, like Create Appointment.
 *  An existing TrueGear customer with the same phone / email is reused. */
export const createSalesCustomer = async (body: {
  type: "Individual" | "Company";
  firstName?: string; lastName?: string; companyName?: string; regNo?: string;
  phone?: string; email?: string; companyId?: string;
}): Promise<ApiResponse<{ truegearCustomerId: string; reused: boolean; custSequenceId?: string; crmReferenceNo?: string }>> =>
  (await api.post(`${BASE}/customers`, body)).data;

/** An arrival photo stored on the server; `url` is a short-lived signed link. */
export interface ReceiptPhoto {
  path: string;
  url: string | null;
  capturedAt: string | null;
  gpsLat: number | null;
  gpsLng: number | null;
  address: string | null;
  uploadedAt: string;
}

/** Saves one live-camera (geo-stamped) photo into a receipt slot, replacing any earlier one. */
export const uploadReceiptPhoto = async (
  stockNo: string,
  slot: string,
  file: File,
  meta: { capturedAt: string; gpsLat: number | null; gpsLng: number | null; gpsAccuracyM: number | null; addressText: string | null },
): Promise<ApiResponse<{ stockNo: string; slot: string; photo: ReceiptPhoto }>> => {
  const form = new FormData();
  form.append("capturedAt", meta.capturedAt);
  if (meta.gpsLat != null) form.append("gpsLat", String(meta.gpsLat));
  if (meta.gpsLng != null) form.append("gpsLng", String(meta.gpsLng));
  if (meta.gpsAccuracyM != null) form.append("gpsAccuracyM", String(meta.gpsAccuracyM));
  if (meta.addressText) form.append("addressText", meta.addressText);
  form.append("image", file);
  return (await api.post(`${BASE}/receipts/${encodeURIComponent(stockNo)}/photos/${encodeURIComponent(slot)}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  })).data;
};

// Phase 3 — generic records and settings.
export const saveRecord = async (collection: string, key: string, data: object): Promise<ApiResponse<unknown>> =>
  (await api.put(`${BASE}/records/${collection}/${encodeURIComponent(key)}`, { data })).data;
export const deleteRecord = async (collection: string, key: string): Promise<ApiResponse<unknown>> =>
  (await api.delete(`${BASE}/records/${collection}/${encodeURIComponent(key)}`)).data;
export const saveSetting = async (key: string, value: unknown): Promise<ApiResponse<unknown>> =>
  (await api.put(`${BASE}/settings/${encodeURIComponent(key)}`, { value })).data;
export const allocateNumbers = async (prefix: string, count = 1): Promise<ApiResponse<{ numbers: string[] }>> =>
  (await api.post(`${BASE}/numbers/${prefix}`, { count })).data;
