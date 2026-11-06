import api from "./axios";
import type { ApiResponse } from "./types";

// Vehicle Sales ↔ Evolve (backend: /api/vehicle-sales/evolve). Reads are live
// Evolve data; writes return 409 until the backend flag
// EVOLVE_VEHICLE_SALES_WRITES_ENABLED is switched on. Every write accepts
// dryRun, which returns the XML that would be sent without sending it.

const BASE = "/vehicle-sales/evolve";

export interface EvolveStatus {
  interfaceCode: string;
  writesEnabled: boolean;
  syncFrozen: boolean;
}

export interface EvolveStockVehicle {
  stockNo: string;
  vin: string;
  engineNo: string;
  vehicleType: string;
  make: string;
  series: string;
  model: string;
  modelCode: string;
  mmCode: string;
  year: number | null;
  extColour: string;
  intColour: string;
  category: string;
  location: string;
  kilometers: number;
  registrationNo: string;
  dateStocked: string | null;
  daysInStock: number;
  retailPrice: number;
  currentPrice: number;
  totalCost: number;
  reservedFor: string;
  reservedBy: string;
  sold: boolean;
  dateInvoiced: string | null;
}

export interface EvolveVehicleDetail extends EvolveStockVehicle {
  accessories: { code: string; description: string; costPrice: number; retailPrice: number }[];
  details: Record<string, string>;
}

export interface EvolveStockSummary {
  stockForSale: { count: number; value: number };
  companyVehicles: { count: number; value: number };
  total: { count: number; value: number };
  locations: { location: string; count: number; value: number }[];
  queryDateTime: string;
}

export interface EvolveSalesSummary {
  count: number;
  value: number;
  categories: { category: string; count: number; value: number }[];
  queryDateTime: string;
}

export type EvolveMasterList =
  | "salesReps"
  | "salesManagers"
  | "fiManagers"
  | "makes"
  | "categories"
  | "colours"
  | "accessories"
  | "fiAccessories"
  | "fiInsurances"
  | "maintenanceContracts"
  | "incentives"
  | "locations"
  | "purchaseTranCodes";

export interface EvolveMasterItem {
  code: string;
  name: string;
  amount?: number;
  fields: Record<string, string>;
}

export interface EvolveModelCode {
  modelCode: string;
  mmCode: string;
  description: string;
  year: number | null;
}

export interface EvolveAccount {
  accountNumber: string;
  name: string;
  accountType: string;
  terms: string;
  stopCredit: boolean;
  currency?: string;
  taxCode?: string;
  fleetContractNo?: string;
}

export interface EvolveAccountSummary {
  accountNumber: string;
  customerName: string;
  creditLimit: number;
  creditAvailable: number;
  balance: number;
  lastInvoice: { number: string; amount: number; date: string };
  ageing: { days0to30: number; days60: number; days90: number; days120: number; days120Plus: number };
}

export interface EvolveDeal {
  dealNo: string;
  status: string;
  type: string;
  customerName: string;
  custSequenceId: string;
  arAccount: string;
  stockNo: string;
  vin: string;
  repNumber: string;
  financeHouse: string;
  created: string | null;
  invoiceNo: string;
  invoiceDate: string | null;
  retailPrice: number;
  discount: number;
  deposit: number;
  tradeIn: number;
  totalDue: number;
  accessories: { code: string; description: string; retailPrice: number }[];
  gp: { vehicle: number; vehiclePct: number; fi: number; total: number; totalPct: number; vehicleCost: number };
}

export interface EvolveDealHistory {
  dealNo: string;
  stockNo: string;
  vin: string;
  documents: { type: string; number: string; date: string | null; time: string }[];
}

export interface EvolveRfcVehicle {
  rfcDate: string | null;
  stockNo: string;
  vin: string;
  registrationNo: string;
  engineNo: string;
  dateStocked: string | null;
}

export interface EvolveDocument {
  documentNumber: string;
  contentType: string;
  base64: string;
}

/** A write either ran in Evolve (sent: true + result) or was a dry run (the XML). */
export type EvolveWriteResult<T> = ({ sent: true } & T) | { sent: false; xml: string };

export interface OnOrderUnit {
  vin: string;
  engineNo: string;
  franchiseCode: string;
  year: number;
  modelCode: string;
  colour: string;
  vendorInvoice?: string;
  vendorInvoiceDate?: string;
  totalPurchaseInvoice: number;
  supplierName: string;
  bookRetail?: number;
  category?: string;
}

export interface StockUnit {
  vin: string;
  engineNo: string;
  category: string;
  franchiseCode: string;
  year: number;
  modelCode: string;
  purchaseTranCode: string;
  dateStocked?: string;
  colour: string;
  location?: string;
  odometer?: number;
  vendorInvoice: string;
  vendorInvoiceDate?: string;
  totalPurchaseInvoice: number;
  supplierName: string;
  comments?: string;
}

export interface OtpDeal {
  crmReferenceNo: string;
  custSequenceId: string;
  salesRepNo: string;
  salesManagerNo: string;
  fiManagerNo?: string;
  whoPays?: "C" | "F";
  customerArAccountNo: string;
  vehicle: { stockNo: string; deliveryDate?: string; registrationNo?: string; retailPrice: number; discount: number; initialDeposit: number };
  accessories?: { code: string; description: string; costPrice: number; retailPrice: number }[];
  tradeIn?: { vin?: string; make: string; modelDescription?: string; year?: number; odometer?: number; registrationNo?: string; standInPrice: number; settlement?: number };
  credit?: { employerName?: string; jobTitle?: string; netMonthlySalary?: number; otherIncome?: number; dependents?: number };
}

export interface FleetDeal {
  salesRep: string;
  oemAccountNumber: string;
  otpNumber: string;
  orderNumber?: string;
  vehicles: { vin: string; retailPrice: number; discount: number }[];
}

type WriteOpts = { dryRun?: boolean };

const get = async <T>(path: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> => {
  const { data } = await api.get(`${BASE}${path}`, { params });
  return data;
};
const post = async <T>(path: string, body: unknown): Promise<ApiResponse<T>> => {
  const { data } = await api.post(`${BASE}${path}`, body);
  return data;
};

export const getEvolveStatus = () => get<EvolveStatus>("/status");

export const listEvolveStock = (includeSold = false) => get<EvolveStockVehicle[]>("/stock", { includeSold });
export const lookupEvolveVehicle = (q: { vin?: string; stockNo?: string }) => get<EvolveVehicleDetail>("/stock/vehicle", q);
export const getEvolveStockSummary = (q: { from?: string; to?: string } = {}) => get<EvolveStockSummary>("/stock/summary", q);
export const getEvolveSalesSummary = (q: { from: string; to: string }) => get<EvolveSalesSummary>("/sales-summary", q);

export const getEvolveMasters = (lists: EvolveMasterList[], fresh = false) =>
  get<Partial<Record<EvolveMasterList, EvolveMasterItem[]>>>("/masters", { lists: lists.join(","), fresh });
export const getEvolveModelCodes = (make: string, series: string) => get<EvolveModelCode[]>("/model-codes", { make, series });
export const listEvolveSuppliers = (accountType?: string) => get<EvolveAccount[]>("/suppliers", { accountType });
export const listEvolveArAccounts = (accountType?: string) => get<EvolveAccount[]>("/ar-accounts", { accountType });
export const getEvolveAccountSummary = (accountNumber: string, accountType?: string) =>
  get<EvolveAccountSummary>("/account-summary", { accountNumber, accountType });

export const listEvolveDeals = (q: { dealNo?: string; status?: string; from?: string; to?: string; max?: number } = {}) =>
  get<EvolveDeal[]>("/deals", q);
export const getEvolveDealHistory = (q: { dealNo?: string; stockNo?: string; vin?: string }) => get<EvolveDealHistory[]>("/deal-history", q);
export const getEvolveDocument = (documentNumber: string) => get<EvolveDocument>(`/documents/${encodeURIComponent(documentNumber)}`);
export const listEvolveReadyForCollection = (q: { from?: string; to?: string } = {}) => get<EvolveRfcVehicle[]>("/ready-for-collection", q);

export const sendEvolveOnOrder = (units: OnOrderUnit[], opts: WriteOpts = {}) =>
  post<EvolveWriteResult<{ rows: { rowStatus: string; message: string; vehicleStockNo: string }[] }>>("/on-order", { units, ...opts });
export const sendEvolveStock = (unit: StockUnit, opts: WriteOpts = {}) =>
  post<EvolveWriteResult<{ vehicleStockNo: string; message: string }>>("/stock", { ...unit, ...opts });
export const sendEvolveOtp = (deal: OtpDeal, opts: WriteOpts = {}) =>
  post<EvolveWriteResult<{ dealNumber: string; crmReferenceNo: string; message: string }>>("/otp", { ...deal, ...opts });
export const sendEvolveFleetDeal = (deal: FleetDeal, opts: WriteOpts = {}) =>
  post<EvolveWriteResult<{ dealNumber: string; message: string }>>("/fleet-deal", { ...deal, ...opts });
