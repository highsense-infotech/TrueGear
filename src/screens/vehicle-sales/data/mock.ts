// Master / reference lists for the Vehicle Sales UI (stand-ins for the Evolve
// masters: users, suppliers, model codes, colours, accessories, products).
// Transactional records (stock, customers, enquiries, quotes, deals ...) start
// empty and live in ./store.ts. All names here are fictional.

export const BRANCHES = ["Midrand", "Centurion", "Pretoria East"] as const;
export type Branch = (typeof BRANCHES)[number];

export const FRANCHISES = ["Toyota", "Toyota Commercial", "Pre-Owned"] as const;

export interface SalesUser {
  id: string;
  name: string;
  role: "Sales Executive" | "Sales Manager" | "F&I Manager";
  branch: Branch | ""; // "" = real TrueGear user (no branch on the user record)
  evolveRep?: string;
  email: string;
}

export const SALES_USERS: SalesUser[] = [
  { id: "u1", name: "Thandi Mokoena", role: "Sales Executive", branch: "Midrand", evolveRep: "REP014", email: "thandi.m@example.com" },
  { id: "u2", name: "Pieter van Wyk", role: "Sales Executive", branch: "Midrand", evolveRep: "REP021", email: "pieter.vw@example.com" },
  { id: "u3", name: "Ayesha Patel", role: "Sales Executive", branch: "Centurion", evolveRep: "REP008", email: "ayesha.p@example.com" },
  { id: "u4", name: "Sipho Ndlovu", role: "Sales Executive", branch: "Centurion", email: "sipho.n@example.com" },
  { id: "u5", name: "Lerato Khumalo", role: "Sales Executive", branch: "Pretoria East", evolveRep: "REP033", email: "lerato.k@example.com" },
  { id: "u6", name: "Johan Botha", role: "Sales Manager", branch: "Midrand", evolveRep: "MGR002", email: "johan.b@example.com" },
  { id: "u7", name: "Naledi Dlamini", role: "Sales Manager", branch: "Centurion", evolveRep: "MGR005", email: "naledi.d@example.com" },
  { id: "u8", name: "Ravi Naidoo", role: "F&I Manager", branch: "Midrand", evolveRep: "FI003", email: "ravi.n@example.com" },
];

export const EXECUTIVES = SALES_USERS.filter((u) => u.role === "Sales Executive");
export const MANAGERS = SALES_USERS.filter((u) => u.role === "Sales Manager");
export const FI_MANAGERS = SALES_USERS.filter((u) => u.role === "F&I Manager");

/**
 * Use the real TrueGear sales users (Role & User Management: Sales Executive /
 * Sales Manager / F&I Manager, with the Evolve salesperson linked there) instead
 * of the demo list. Updated in place so every screen importing these lists
 * sees them. An empty list keeps the demo users.
 */
export function setSalesUsers(list: SalesUser[]) {
  if (!list.length) return;
  const replace = (arr: SalesUser[], items: SalesUser[]) => arr.splice(0, arr.length, ...items);
  replace(SALES_USERS, list);
  replace(EXECUTIVES, list.filter((u) => u.role === "Sales Executive"));
  replace(MANAGERS, list.filter((u) => u.role === "Sales Manager"));
  replace(FI_MANAGERS, list.filter((u) => u.role === "F&I Manager"));
}

export interface Supplier {
  account: string;
  name: string;
  terms: string;
}

export const SUPPLIERS: Supplier[] = [
  { account: "AP10021", name: "Toyota SA Motors (Demo Supplier)", terms: "30 days" },
  { account: "AP10034", name: "Highveld Vehicle Distributors", terms: "45 days" },
  { account: "AP10057", name: "Coastal Fleet Imports", terms: "Cash on delivery" },
];

export const MODEL_CODES = [
  { code: "HLX-24-RDR", make: "Toyota", model: "Hilux 2.8 GD-6 Raider D/C", year: 2025, category: "LCV" },
  { code: "HLX-24-LGD", make: "Toyota", model: "Hilux 2.8 GD-6 Legend RS 4x4", year: 2025, category: "LCV" },
  { code: "FTN-24-VX", make: "Toyota", model: "Fortuner 2.8 GD-6 VX 4x4", year: 2025, category: "SUV" },
  { code: "CCR-24-XR", make: "Toyota", model: "Corolla Cross 1.8 Hybrid XR", year: 2025, category: "SUV" },
  { code: "HIA-24-SES", make: "Toyota", model: "HiAce 2.5D Ses'fikile 16-seat", year: 2025, category: "Bus" },
  { code: "LC79-24-SC", make: "Toyota", model: "Land Cruiser 79 4.5D S/C", year: 2025, category: "LCV" },
  { code: "RAV-24-GXR", make: "Toyota", model: "RAV4 2.0 GX-R AWD", year: 2025, category: "SUV" },
  { code: "STL-24-XS", make: "Toyota", model: "Starlet 1.5 XS", year: 2025, category: "Passenger" },
];

export const COLOURS = ["Glacier White", "Silver Metallic", "Graphite Grey", "Attitude Black", "Inferno Red", "Nebula Blue", "Bronze Mica"];

// "On Hold" = physically at the dealership but not sellable (e.g. failed
// arrival QC and the damage claim is not settled yet).
export type StockStatus = "In Stock" | "Reserved" | "Sold" | "In Transit" | "Demo" | "On Hold";

export interface StockVehicle {
  stockNo: string;
  vin: string;
  engineNo: string;
  make: string;
  model: string;
  modelCode: string;
  year: number;
  colour: string;
  branch: Branch;
  type: "New" | "Used" | "Demo";
  retail: number;
  current: number;
  cost: number;
  daysInStock: number;
  status: StockStatus;
  reservedFor?: string;
  registration?: string;
  odometer: number;
}

export interface Customer {
  id: string;
  name: string;
  type: "Individual" | "Company";
  phone: string;
  email: string;
  arAccount?: string;
  idNumber?: string;
  regNumber?: string;
  city: string;
  // Set when the customer was picked from Evolve / the TrueGear customer master
  // (Add Enquiry › Search Existing), so the deal can be sent to Evolve (12).
  custSequenceId?: string;
  crmReferenceNo?: string;
  truegearCustomerId?: string;
  companyId?: string; // company the customer was created / found under (its Evolve id is per company)
  vehicles: { make: string; model: string; year: number; registration: string; odometer: number; lastService: string }[];
}

export const LEAD_SOURCES = ["Walk-in", "Phone", "Website", "Facebook", "OEM Portal", "Referral", "Service Department"];
export const CAMPAIGNS = ["None", "Spring Hilux Drive", "Hybrid Week", "Fleet Renewal 2026", "Service-to-Sales"];

export type EnquiryStatus = "New" | "Contacted" | "Qualified" | "Test Drive" | "Quoted" | "Negotiation" | "Won" | "Lost";

export interface Enquiry {
  id: string;
  customerId: string;
  companyId?: string; // TrueGear company (or Evolve interface code) the enquiry belongs to
  companyName?: string;
  // Vehicle of interest from the catalogue (Make → Model → Evolve model code);
  // `interest` keeps the readable "Make Model" text the lists show.
  make?: string;
  series?: string;
  modelCode?: string;
  modelYear?: number;
  source: string;
  campaign: string;
  interest: string;
  budget: number;
  ownerId: string;
  branch: Branch;
  status: EnquiryStatus;
  created: string;
  priority: "Hot" | "Warm" | "Cold";
  finance: "Cash" | "Bank finance" | "Fleet lease";
  tradeIn: boolean;
  daysInStage: number;
  value: number;
}

export const LOST_REASONS = [
  { id: "lr1", name: "Price too high", active: true },
  { id: "lr2", name: "Bought from competitor", active: true },
  { id: "lr3", name: "Finance declined", active: true },
  { id: "lr4", name: "Vehicle not available in time", active: true },
  { id: "lr5", name: "Trade-in value too low", active: true },
  { id: "lr6", name: "Customer stopped responding", active: true },
  { id: "lr7", name: "Postponed purchase", active: false },
];

export const COMPETITORS = ["Isuzu (D-Max)", "Ford (Ranger)", "Nissan (Navara)", "Suzuki (Swift)", "Volkswagen (Amarok)", "Other / Unknown"];

// Quote / deal items come from Evolve 07 GetLookupDropdownTables (Accessories,
// FIDealInsurances, ExtendedMaintenanceContracts) — filled in place by
// setQuoteCatalogue when Vehicle Sales loads, so every screen that looks items
// up by code (quote, sale, Send Sale 12, handover, reports) uses the Evolve list.
export interface QuoteItem { code: string; name: string; price: number }
export const ACCESSORIES: QuoteItem[] = [];
export const FI_PRODUCTS: QuoteItem[] = [];
// Optional on a quote / deal: "" = no maintenance contract.
export const MAINTENANCE_PLANS: QuoteItem[] = [];

export function setQuoteCatalogue(c: { accessories: QuoteItem[]; fi: QuoteItem[]; plans: QuoteItem[] }) {
  ACCESSORIES.splice(0, ACCESSORIES.length, ...c.accessories);
  FI_PRODUCTS.splice(0, FI_PRODUCTS.length, ...c.fi);
  MAINTENANCE_PLANS.splice(0, MAINTENANCE_PLANS.length, ...c.plans);
}

export const ON_ROAD = [
  { name: "Licence & registration", price: 2350 },
  { name: "Number plates", price: 450 },
  { name: "Delivery & fuel", price: 1950 },
];

export const OEM_INCENTIVES = [
  { code: "INC-HLX-SPR", name: "Hilux Spring Cash Back", amount: 15000 },
  { code: "INC-HYB-25", name: "Hybrid Loyalty Rebate", amount: 10000 },
  { code: "INC-FLT-3", name: "Fleet 3+ Unit Support", amount: 20000 },
];

// One purchase order can hold several vehicle lines (different models,
// colours or specs), each with its own quantity and received count.
export interface POLine {
  id: string;
  // Make, series and year of the ordered model (from the vehicle catalogue /
  // Evolve 28); absent on lines raised from the built-in model list.
  make?: string;
  series?: string;
  year?: number;
  modelCode: string;
  model: string;
  colour: string;
  spec?: string;
  qty: number;
  received: number;
  unitCost: number;
}

export interface PurchaseOrder {
  id: string;
  supplier: string;
  branch?: string;
  lines: POLine[];
  expected: string; // original ETA
  revisedEta?: string; // after a supplier delay
  etaHistory?: { from: string; to: string; reason: string; by: string; at: string }[];
  createdBy: string;
  created: string;
  notes?: string;
  status: "Draft" | "Approval" | "Ordered" | "Partially Received" | "Received" | "Rejected";
}

/** The current ETA: the revised one after a supplier delay, else the original. */
export const poEta = (p: PurchaseOrder) => p.revisedEta || p.expected;
export const poQty = (p: PurchaseOrder) => p.lines.reduce((n, l) => n + l.qty, 0);
export const poReceived = (p: PurchaseOrder) => p.lines.reduce((n, l) => n + l.received, 0);
export const poTotal = (p: PurchaseOrder) => p.lines.reduce((n, l) => n + l.qty * l.unitCost, 0);
export const poSummary = (p: PurchaseOrder) =>
  p.lines.length === 1 ? `${p.lines[0].qty} × ${p.lines[0].model}` : `${p.lines.length} models · ${poQty(p)} units`;

export const PDI_STAGES = ["Technician", "Foreman", "QC-Out", "Washbay"] as const;

export const MONTHS = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"];

export const fmtDate = (iso: string) =>
  new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export const stockLabel = (v: StockVehicle) => `${v.stockNo} · ${v.model}`;

