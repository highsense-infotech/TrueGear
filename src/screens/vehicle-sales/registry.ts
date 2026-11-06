// Vehicle Sales module registry — the single source of truth for the 12
// modules and 66 screens, transcribed from
// "Vehicle_Sales_Module_Screens_vs_Evolve_API_v1.xlsx" (Santosh review, 29 Oct 2026). Navigation, breadcrumbs,
// page titles and the per-screen Evolve integration notes all read from here.
//
// PHASE 1 IS STATIC UI ONLY. `evolveApi` / `note` describe the planned
// integration for reference; nothing in this module calls Evolve.

import type { LucideIcon } from "lucide-react";
import {
  ShoppingCart, PackageCheck, Warehouse, Inbox, Calculator, ClipboardList,
  Hammer, Receipt, Wallet, Handshake, ChartColumn, Settings2,
} from "lucide-react";

// Workbook "Status" column, normalised:
//   ready   → "Ready"
//   uat     → "Ready – Evolve link after UAT test"
//   partial → "Partly – no Evolve API"
export type IntegrationStatus = "ready" | "uat" | "partial";

export interface SalesScreen {
  slug: string;
  label: string;
  summary: string;
  evolveApi: string;
  status: IntegrationStatus;
  note: string;
  // Sub-heading in the navigation (CRM / Enquiry groups its 21 screens).
  group?: string;
  // Workbook column "Change after Santosh review, 29 Oct 2026".
  change?: string;
  // Left out of the sidebar: a detail / step screen that needs a selected
  // record and is opened from a button or row on another screen. The route
  // still works (links, bookmarks).
  navHidden?: boolean;
}

export interface SalesModule {
  slug: string;
  number: number;
  label: string;
  icon: LucideIcon;
  description: string;
  screens: SalesScreen[];
}

export const VEHICLE_SALES_BASE = "/vehicle-sales";

export const SALES_MODULES: SalesModule[] = [
  {
    slug: "purchase-order",
    number: 1,
    label: "Purchase Order",
    icon: ShoppingCart,
    description: "Raise, approve and track vehicle purchase orders with suppliers.",
    screens: [
      { slug: "purchase-orders", label: "Purchase Orders", summary: "All vehicle purchase orders with status: Draft, Approval, Ordered, Received.", evolveApi: "None", status: "ready", note: "No Evolve API for purchase orders. TrueGear keeps its own PO register and status flow (same pattern as job cards). Only \"on order\" and \"in stock\" are sent to Evolve (see \"Send Order to Evolve\" and \"Send to Evolve Stock\")." },
      { slug: "new-purchase-order", navHidden: true, label: "New Purchase Order", summary: "Make, model, model code, colour, specification, quantity, agreed cost, expected date, supplier.", evolveApi: "07 GetLookupDropdownTables ✅ · 28 GetModelCodes ✅ · 35 GetAPAccounts ✅", status: "ready", note: "From 07 we get Makes, Categories and colours; from 28 we get ModelCode, ModelDescription and ModelYear; from 35 we get supplier AccountNumber, AccountName and Terms. With this the buyer picks the vehicle and supplier from Evolve masters, so codes match Evolve. 27 GetSeriesData fails on live, so series is taken from the model-code list instead." },
      { slug: "approve-purchase-order", label: "Approve Purchase Order", summary: "Manager approves or rejects the purchase order.", evolveApi: "None", status: "ready", note: "No Evolve API needed. Approval, approver and time are recorded in TrueGear with role-based permission, like job card approval." },
      { slug: "send-order-to-evolve", navHidden: true, label: "Send Order to Evolve", summary: "Sends ordered vehicles to Evolve as incoming stock.", evolveApi: "23 VehicleStockOnOrderMaintenance ⚪", status: "uat", note: "With 23 we send VIN, engine no, make, model code, colour, supplier and invoice value; Evolve returns the new VehicleStockNo. This makes the DMS and TrueGear show the same. Until tested on UAT, the button stays off and staff enter on-order stock in Evolve by hand." },
    ],
  },
  {
    slug: "goods-receipt",
    number: 2,
    label: "Vehicle Goods Receipt",
    icon: PackageCheck,
    description: "Receive vehicles against POs, capture arrival evidence and run receipt QC.",
    screens: [
      { slug: "receive-vehicle", label: "Receive Vehicle", summary: "Select the PO and match VIN, engine number, colour and model code; partial receipts keep the PO open.", evolveApi: "None", status: "ready", note: "No Evolve API for goods receipt. TrueGear matches the arrived vehicle to its own PO and keeps the PO open for remaining units." },
      { slug: "arrival-photos", label: "Arrival Photos & Scans", summary: "Geo-stamped photos and AI scans for VIN, odometer and fuel.", evolveApi: "None", status: "ready", note: "No Evolve API needed. Reuses TrueGear Gate Entry: GPS/time-stamped photos and OpenAI scans already in the app." },
      { slug: "arrival-quality-check", label: "Arrival Quality Check", summary: "ELT \"New Vehicle Receipt\" checklist with photos, signature and pass / conditional / fail.", evolveApi: "None", status: "ready", note: "No Evolve API needed. Reuses the QC-In inspection wizard; admin adds the new checklist (categories are free text now)." },
      { slug: "damage-report", label: "Damage Report", summary: "Recorded automatically when the receipt QC fails.", evolveApi: "None", status: "ready", note: "No Evolve API. TrueGear records the claim with QC photos and keeps the vehicle out of sellable stock. Claim to the supplier is handled manually." },
      { slug: "send-to-evolve-stock", label: "Send to Evolve Stock", summary: "On QC pass, puts the vehicle into Evolve stock with supplier invoice and cost.", evolveApi: "18 VehicleStockMaintenance ⚪ · 06 / 16 ✅ (to confirm)", status: "uat", note: "With 18 we send VIN, engine no, category, model, purchase code, colour, supplier, vendor invoice and cost; then 06 / 16 confirm the vehicle and its VehStockNo in Evolve. Until 18 is tested on UAT, staff add the stock in Evolve and TrueGear picks it up via 06." },
    ],
  },
  {
    slug: "stock",
    number: 3,
    label: "Vehicle Stock",
    icon: Warehouse,
    description: "Live stock list, single-vehicle detail and stock value by location.",
    screens: [
      { slug: "vehicles-in-stock", label: "Vehicles in Stock", summary: "All stock with price, colour, location, days in stock, reserved / sold.", evolveApi: "06 GetAllStockedVehicles ✅", status: "ready", note: "From 06 we get VehStockNo, VIN, make, model, year, colours, location, RetailPriceAmount, CurrentPriceAmount, TotalAccountingCost, DaysStocked (branch/group), ReservedFor, VehicleSold and DateInvoiced. With this we show live stock with price and stock age and flag reserved or sold units." },
      { slug: "vehicle-details", navHidden: true, label: "Vehicle Details", summary: "One vehicle: costs, prices, accessories, deal history.", evolveApi: "16 VehicleLookup ✅ · 26 GetVehicleDealHistory ✅", status: "ready", note: "From 16 we get the full vehicle record incl. factory-fitted accessories; from 26 we get its deals and document numbers. With this the sales team sees everything about one unit in one screen." },
      { slug: "stock-totals", label: "Stock Totals", summary: "Count and value of stock by location.", evolveApi: "19 VehicleStockSummary ✅", status: "ready", note: "From 19 we get stock count and value in total and per location. With this managers see stock value at a glance." },
    ],
  },
  {
    slug: "crm",
    number: 4,
    label: "CRM / Enquiry",
    icon: Inbox,
    description: "Leads, sales board, follow-ups, test drives and offers in one place.",
    screens: [
      { slug: "all-enquiries", label: "All Enquiries", summary: "All leads with source, campaign, status and owner.", evolveApi: "None", status: "ready", note: "Evolve has no lead / CRM API. TrueGear keeps the full lead register.", group: "Enquiries" },
      { slug: "add-enquiry", navHidden: true, label: "Add Enquiry", summary: "Walk-in / phone lead using the Individual / Company form; duplicate check.", evolveApi: "02 Customer_VehicleLookup ✅ · 03 CustomerLookup ✅ · 04 CustomerMaintenance ⚪", status: "ready", note: "From 02 / 03 we get existing customers, their vehicles and AR accounts. With this we link the lead to an existing customer instead of creating a duplicate. New customers are created in TrueGear; pushing them to Evolve uses 04 (already built, switched off until tested).", group: "Enquiries" },
      { slug: "enquiry-details", navHidden: true, label: "Enquiry Details", summary: "Requirements, budget, finance, trade-in, vehicle wanted; matching stock shown.", evolveApi: "06 GetAllStockedVehicles ✅", status: "ready", note: "From 06 we get live stock with price and colour. With this the screen shows if a matching vehicle is in stock, on order or must be ordered. Requirements and trade-in details are stored in TrueGear.", group: "Enquiries" },
      { slug: "auto-assign-rules", label: "Auto-Assign Rules", summary: "Auto-assign by source, branch, franchise; round-robin.", evolveApi: "07 GetLookupDropdownTables ✅ (SalesReps, SalesManagers)", status: "ready", note: "From 07 we get the Evolve SalesReps and SalesManagers lists. With this TrueGear sales users are mapped to Evolve rep numbers, so deals sent later carry the right rep. Routing rules are TrueGear only.", group: "Enquiries" },
      { slug: "reassign-enquiries", label: "Reassign Enquiries", summary: "Manager moves one or many leads to another executive.", evolveApi: "None", status: "ready", note: "No Evolve API needed. Same pattern as Bulk Technician Allocation, with history kept.", group: "Enquiries" },
      { slug: "priority-settings", label: "Enquiry Priority Settings", summary: "Weights that rank leads hot / warm / cold.", evolveApi: "None", status: "ready", note: "No Evolve API needed. Scoring factors are configured and calculated in TrueGear.", group: "Enquiries" },
      { slug: "sales-board", label: "Sales Board", summary: "Drag-and-drop funnel; count and value per stage; days in stage.", evolveApi: "None", status: "ready", note: "No Evolve API. TrueGear stores every stage move with time, like the RO status pipeline.", group: "Sales board & lost deals" },
      { slug: "sales-stages-setup", label: "Sales Stages Setup", summary: "Rename, add, reorder stages per franchise.", evolveApi: "None", status: "ready", note: "No Evolve API needed. Configured in TrueGear.", group: "Sales board & lost deals" },
      { slug: "close-as-lost", navHidden: true, label: "Close as Lost", summary: "Lost reason, competitor and note.", evolveApi: "None", status: "ready", note: "Evolve has no lost-sales API. TrueGear records lost deals and reasons.", group: "Sales board & lost deals" },
      { slug: "lost-reasons-setup", label: "Lost Reasons Setup", summary: "Admin list of lost reasons.", evolveApi: "None", status: "ready", note: "No Evolve API needed. Managed like Labour Master.", group: "Sales board & lost deals" },
      { slug: "lost-enquiries", label: "Lost Enquiries", summary: "Search, reopen, or add to a campaign.", evolveApi: "None", status: "ready", note: "No Evolve API needed. TrueGear data.", group: "Sales board & lost deals" },
      { slug: "customer-history", navHidden: true, label: "Customer History", summary: "Calls, emails, WhatsApp, visits, test drives, notes in time order.", evolveApi: "None", status: "ready", note: "No Evolve API. TrueGear logs every activity, like the Vehicle 360 visit timeline.", group: "Follow-ups & test drives" },
      { slug: "message-templates", label: "Message Templates", summary: "Email / WhatsApp / SMS templates with merge fields.", evolveApi: "None", status: "ready", note: "No Evolve API. Reuses TrueGear notification templates. Email and WhatsApp work today; SMS needs a gateway chosen with ELT.", group: "Follow-ups & test drives" },
      { slug: "reminder-rules", label: "Reminder Rules", summary: "E.g. call within 1 hour; chase quote after 2 days; escalate when overdue.", evolveApi: "None", status: "ready", note: "No Evolve API. Reuses TrueGear notification rules and in-app inbox.", group: "Follow-ups & test drives" },
      { slug: "followup-calendar", label: "FollowUp Calendar", summary: "Day / week / team view of tasks and follow-ups.", evolveApi: "None", status: "ready", note: "No Evolve API. TrueGear task calendar; completing a task writes to the activity log.", group: "Follow-ups & test drives" },
      { slug: "demo-vehicles", label: "Demo Vehicles", summary: "Choose which stock units are demo cars.", evolveApi: "06 GetAllStockedVehicles ✅", status: "ready", note: "From 06 we get stock units and their VehicleType (demo / new / used). With this admin marks demo cars for test drives.", group: "Follow-ups & test drives" },
      { slug: "book-test-drive", navHidden: true, label: "Book Test Drive", summary: "Book a demo vehicle and time slot; no double booking.", evolveApi: "None", status: "ready", note: "No Evolve API. Reuses the TrueGear bay-scheduling engine, with demo vehicles treated like bays.", group: "Follow-ups & test drives" },
      { slug: "start-test-drive", label: "Start Test Drive", summary: "Driving licence AI scan and signed indemnity.", evolveApi: "None", status: "ready", note: "No Evolve API. Reuses the TrueGear licence scan and signature capture.", group: "Follow-ups & test drives" },
      { slug: "offers", label: "Offers", summary: "Name, dates, eligible models / stock, offer, budget cap.", evolveApi: "07 VehicleIncentives ✅", status: "ready", note: "From 07 we get Evolve VehicleIncentives. With this OEM incentives can be linked to a campaign. Campaigns and offers are stored in TrueGear.", group: "Offers & promotions" },
      { slug: "choose-customers", navHidden: true, label: "Choose Customers for Offer", summary: "Pick service customers, e.g. vehicles older than X years.", evolveApi: "None", status: "ready", note: "No Evolve API needed. Uses TrueGear customer and vehicle data (and Vehicle 360 history).", group: "Offers & promotions" },
      { slug: "send-offer", navHidden: true, label: "Send Offer", summary: "Email / WhatsApp blast using templates.", evolveApi: "None", status: "ready", note: "No Evolve API. Reuses TrueGear email and WhatsApp channels.", group: "Offers & promotions" },
    ],
  },
  {
    slug: "quotation",
    number: 5,
    label: "Quotation",
    icon: Calculator,
    description: "Build, approve, version, share and print vehicle quotes.",
    screens: [
      { slug: "all-quotations", label: "All Quotations", summary: "Every quote with its latest version, status and total; open one to see its revisions.", evolveApi: "None", status: "ready", note: "No Evolve API. Quotes stored in TrueGear." },
      { slug: "new-quote", navHidden: true, label: "New Quote", summary: "Vehicle price, accessories, F&I insurance, maintenance plan, on-road costs, trade-in, discount, promotion, VAT.", evolveApi: "06 GetAllStockedVehicles ✅ · 07 GetLookupDropdownTables ✅", status: "ready", note: "From 06 we get the vehicle RetailPriceAmount and CurrentPriceAmount; from 07 we get Accessories, FIAccessories, FIDealInsurances, ExtendedMaintenanceContracts and VehicleIncentives. With this the quote uses Evolve prices and codes, so it can later be sent to Evolve as a deal without re-keying. VAT is calculated as on job cards." },
      { slug: "trade-in-value", navHidden: true, label: "Trade-in Value", summary: "Trade-in vehicle details and value; service history.", evolveApi: "02 Customer_VehicleLookup ✅", status: "ready", note: "From 02 we get the customer's vehicles in Evolve. With this the trade-in is picked, not typed. Its service history comes from TrueGear Vehicle 360. The trade-in goes to Evolve inside the deal (12 OTP, TradeIns section)." },
      { slug: "approve-discount", label: "Approve Discount", summary: "Manager approves a discount above the executive's limit.", evolveApi: "None", status: "ready", note: "No Evolve API. TrueGear approval with limits per role." },
      { slug: "quote-history", label: "Quote History", summary: "Every revision kept; accepted version drives the deal.", evolveApi: "None", status: "ready", note: "No Evolve API. Versions stored in TrueGear." },
      { slug: "customer-quote-link", navHidden: true, label: "Customer Quote Link", summary: "Customer views, accepts or requests changes.", evolveApi: "None", status: "ready", note: "No Evolve API. Reuses the TrueGear login-free estimate approval portal, sent by email / WhatsApp." },
      { slug: "print-quote", navHidden: true, label: "Print Quote", summary: "Printable quote in the same style as estimates and invoices.", evolveApi: "None", status: "ready", note: "No Evolve API. Reuses TrueGear PDF / HTML print." },
    ],
  },
  {
    slug: "sales-order",
    number: 6,
    label: "Sales Order",
    icon: ClipboardList,
    description: "Turn an accepted quote into a sales order, reserve the unit and push it to Evolve.",
    screens: [
      { slug: "sale-details", label: "Sale Details", summary: "Accepted quote becomes a deal: rep, manager, F&I, AR account, deposit, accessories, insurance, trade-in.", evolveApi: "07 ✅ (SalesReps, SalesManagers, FIManagers) · 36 GetARAccounts ✅", status: "ready", note: "From 07 we get rep / manager / F&I numbers; from 36 and the customer lookup we get the customer AR accounts. With this the deal is filled with Evolve codes ready to send." },
      { slug: "finance-application", navHidden: true, label: "Finance Application", summary: "Employment, income, previous address, existing insurance.", evolveApi: "None (sent with \"Send Sale to Evolve\")", status: "ready", note: "No separate Evolve API. TrueGear captures the details; they are sent to Evolve inside the deal (12 OTP, CreditInfo section)." },
      { slug: "reserve-vehicle", navHidden: true, label: "Reserve Vehicle", summary: "Reserve the stock unit against the deposit.", evolveApi: "None", status: "ready", note: "Handled in TrueGear; no need to reserve in Evolve. TrueGear blocks the unit against the deposit so no other quote can take it. Evolve marks it reserved later when the deal (12) is created.", change: "Moved to Ready: reserve in TrueGear only" },
      { slug: "send-sale-to-evolve", navHidden: true, label: "Send Sale to Evolve", summary: "Sends the full deal to Evolve.", evolveApi: "12 OTPMaintenance ⚪", status: "uat", note: "Agreed flow: TrueGear pushes the sales order (deal) to Evolve with 12, Evolve creates the invoice, and TrueGear downloads that invoice by document number (see Download Invoice). With 12 we send header (customer, rep, manager, F&I, AR accounts), vehicle (stock no, price, discount, initial deposit), accessories, F&I insurance, maintenance contracts, trade-in vehicle and credit application; Evolve returns the deal number. Until tested on UAT, staff create the deal in Evolve and TrueGear reads it back via 09.", change: "Confirmed flow: push sales order → Evolve invoices → TrueGear downloads the invoice. Santosh: good enough. Moved here from \"Sale, Payment & Invoice\", which is split across the flow." },
      { slug: "fleet-sale", label: "Fleet Sale", summary: "Several vehicles to one buyer.", evolveApi: "25 MaintenanceVehicleDeals ⚪", status: "uat", note: "With 25 we send rep, OEM account, OTP number and the VINs with price and discount; Evolve returns the deal number. Until tested on UAT, fleet deals are created in Evolve by hand." },
    ],
  },
  {
    slug: "body-building",
    number: 7,
    label: "Body Building",
    icon: Hammer,
    description: "Send sold vehicles to body builders, track the build and check them on return.",
    screens: [
      { slug: "body-builders", label: "Body Builder Master", summary: "Body builders with contact details and the body types each one builds.", evolveApi: "None", status: "ready", note: "No Evolve API. Evolve has no body builder master, so it is built in TrueGear and synced with the PDI app.", change: "New: Body Building step added to the flow." },
      { slug: "body-types", label: "Body Type Master", summary: "Body types with their standard build time.", evolveApi: "None", status: "ready", note: "No Evolve API. Built in TrueGear and synced with the PDI app.", change: "New: Body Building step added to the flow." },
      { slug: "body-building-job", label: "Body Building Job", summary: "Send the sold vehicle to the body builder, track progress and expected return, check it on return.", evolveApi: "None", status: "ready", note: "No Evolve API. Brings the PDI app's screens and flow into this module, synced both ways so an update in either place shows in the other. Build time is added to the revised ETA before delivery is promised to the customer.", change: "New: Body Building step added to the flow." },
    ],
  },
  {
    slug: "sales-invoice",
    number: 8,
    label: "Sales Invoice",
    icon: Receipt,
    description: "Evolve invoices the pushed sales order; TrueGear shows the status and downloads the invoice.",
    screens: [
      { slug: "sale-status-invoice", label: "Sale Status & Invoice", summary: "Shows Evolve deal status, invoice number and date, totals, gross profit.", evolveApi: "09 GetVehicleDealInfo ✅ · 26 GetVehicleDealHistory ✅", status: "ready", note: "From 09 we get DealStatus, InvoiceNumber, InvoiceDate, totals and DealSummary (GP); from 26 we get document numbers. With this TrueGear shows when Evolve has invoiced the deal. Evolve raises the invoice from the pushed sales order, so no invoice API is needed.", change: "Moved to Ready: Evolve creates the invoice from the pushed sales order; no invoice API needed." },
      { slug: "download-invoice", navHidden: true, label: "Download Invoice", summary: "Download the Evolve invoice.", evolveApi: "20 GetDocument ⏸", status: "uat", note: "With 20 we get the document as a Base64 PDF using the DocumentNumber from 26. With this the customer gets the real Evolve invoice by email / WhatsApp. Needs a test with a real document number. To re-check: confirm 20 returns vehicle sales invoices. The earlier invoice discussion was about parts." },
    ],
  },
  {
    slug: "payment",
    number: 9,
    label: "Payment",
    icon: Wallet,
    description: "Customer payments, receipts, balance due and cancellations.",
    screens: [
      { slug: "customer-payments", label: "Customer Payments", summary: "Record payments and receipts, instalments, balance due.", evolveApi: "None", status: "ready", note: "Handled in TrueGear. TrueGear records payments, receipts, instalments and balance due using the existing invoice-payment flow. The deposit amount goes to Evolve inside the deal (12); finance enters the receipt in Evolve.", change: "Moved to Ready: customer payment is handled in TrueGear, no Evolve API needed." },
      { slug: "cancel-sale", label: "Cancel Sale / Refund", summary: "Refund or forfeit rule with manager approval.", evolveApi: "None", status: "ready", note: "No Evolve API. TrueGear approval and audit trail; finance processes the refund in Evolve." },
    ],
  },
  {
    slug: "handover",
    number: 10,
    label: "Delivery / Handover",
    icon: Handshake,
    description: "PDI, delivery checklist, ready-for-collection list and gate pass.",
    screens: [
      { slug: "pre-delivery-check", navHidden: true, label: "Pre-Delivery Check", summary: "Pre-delivery inspection through technician, foreman, QC-Out and washbay.", evolveApi: "15 ROMaintenance (existing sync)", status: "ready", note: "Uses the existing TrueGear job card flow and its existing RO sync to Evolve. Vehicle cannot be released until PDI is passed." },
      { slug: "handover-checklist", navHidden: true, label: "Handover Checklist", summary: "Walkthrough, documents, keys, manuals, accessories, photos, customer signature.", evolveApi: "None", status: "ready", note: "No Evolve API. TrueGear checklist template with photos and signature." },
      { slug: "ready-to-hand-over", label: "Ready to Hand Over", summary: "Vehicles ready to hand over.", evolveApi: "32 GetAllRFCVehicles ✅", status: "ready", note: "From 32 we get RFCDate, StockNumber, VIN, registration and engine number. With this the list matches Evolve's \"ready for collection\" vehicles." },
      { slug: "gate-pass", label: "Gate Pass", summary: "Issued when paid or finance approved; redeemed at the gate.", evolveApi: "None", status: "ready", note: "No Evolve API. Reuses the TrueGear gate pass and gate-out capture." },
    ],
  },
  {
    slug: "reports",
    number: 11,
    label: "Reports",
    icon: ChartColumn,
    description: "Sales KPIs, funnel, lost sales, team performance, commission and AR.",
    screens: [
      { slug: "sales-dashboard", label: "Sales Dashboard", summary: "Units, revenue vs target, GP per unit, stock age, enquiries, test drives, quotes, bookings.", evolveApi: "17 VehicleSalesSummary ✅ · 19 VehicleStockSummary ✅ · 06 ✅ · 09 ✅", status: "ready", note: "From 17 we get units and value sold by category; from 19 / 06 stock value and age; from 09 GP per deal. With this the dashboard shows Evolve figures; enquiries, test drives and quotes come from TrueGear. ELT to confirm KPI list and targets." },
      { slug: "enquiry-to-sale", label: "Enquiry to Sale Report", summary: "Funnel drop-off by source, campaign, model, branch, executive; time to contact / close.", evolveApi: "None", status: "ready", note: "No Evolve API. Built from TrueGear lead and pipeline data." },
      { slug: "lost-sales", label: "Lost Sales Report", summary: "Why and where deals are lost, by competitor.", evolveApi: "None", status: "ready", note: "No Evolve API. Built from TrueGear lost-deal data." },
      { slug: "team-ranking", label: "Team Ranking", summary: "Units, revenue, GP, conversion, response time per executive.", evolveApi: "None – TrueGear sales data · 07 SalesReps ✅ (salesperson master)", status: "ready", note: "Calculated in TrueGear from TrueGear's own sales data: units, revenue, GP, conversion and response time per executive. The salesperson master comes from Evolve (07 SalesReps), the same way the technician master was taken. 30 is not needed.", change: "Moved to Ready: ranking from TrueGear sales data; salesperson master from Evolve." },
      { slug: "my-sales-score", label: "My Sales Score", summary: "Each executive sees own figures against target.", evolveApi: "09 ✅", status: "ready", note: "From 09 we get the executive's deals and GP. With this each executive sees their own score; targets are set in TrueGear." },
      { slug: "commission", label: "Commission", summary: "Rules per unit / model / GP band / campaign; manager approves.", evolveApi: "None – TrueGear sales data · 07 SalesReps ✅ (salesperson master)", status: "ready", note: "Rules and calculation are in TrueGear, using TrueGear's own sales data; manager approves. Evolve doesn't calculate commission, so 30 is not needed.", change: "Moved to Ready: commission calculated in TrueGear; Evolve doesn't calculate commission." },
      { slug: "customer-balances", label: "Customer Balances Due", summary: "Ageing of vehicle customer accounts.", evolveApi: "01 AccountSummary ✅ · 29 GetVehicleARAgeAnalysis ❌", status: "partial", note: "29 (full ageing list) fails on live (\"UserId cannot be blank\"). From 01 we get balance and ageing for one account at a time, so we show ageing per customer. Ask Evolve to fix 29." },
      { slug: "export-reports", label: "Export Reports", summary: "Export any report.", evolveApi: "None", status: "ready", note: "No Evolve API. Built in TrueGear." },
    ],
  },
  {
    slug: "settings",
    number: 12,
    label: "Settings",
    icon: Settings2,
    description: "Discount limits, targets and checklists. Sales roles and their Evolve salesperson are managed in Role & User Management.",
    screens: [
      { slug: "discount-limits", label: "Discount Limits", summary: "Above the limit needs manager approval.", evolveApi: "None", status: "ready", note: "No Evolve API. Configured in TrueGear." },
      { slug: "sales-targets", label: "Sales Targets", summary: "Per executive, branch and month.", evolveApi: "None", status: "ready", note: "No Evolve API. Configured in TrueGear." },
      { slug: "checklists", label: "Checklists", summary: "New Vehicle Receipt and Delivery checklists.", evolveApi: "None", status: "ready", note: "No Evolve API. Uses the existing TrueGear checklist templates." },
      { slug: "user-manual", label: "User Manual", summary: "How the Vehicle Sales module works, step by step, from purchase order to handover.", evolveApi: "None", status: "ready", note: "Guide for users; no Evolve API." },
    ],
  },
];

export const screenPath = (moduleSlug: string, screenSlug: string) =>
  `${VEHICLE_SALES_BASE}/${moduleSlug}/${screenSlug}`;

export const modulePath = (moduleSlug: string) => `${VEHICLE_SALES_BASE}/${moduleSlug}`;

export function findModule(moduleSlug: string | undefined): SalesModule | undefined {
  return SALES_MODULES.find((m) => m.slug === moduleSlug);
}

export function findScreen(
  moduleSlug: string | undefined,
  screenSlug: string | undefined,
): { module: SalesModule; screen: SalesScreen } | undefined {
  const module = findModule(moduleSlug);
  const screen = module?.screens.find((s) => s.slug === screenSlug);
  return module && screen ? { module, screen } : undefined;
}

// URLs from before the 29 Oct regrouping, so old bookmarks still open the screen.
const LEGACY_MODULES: Record<string, string> = {
  buying: "purchase-order",
  receiving: "goods-receipt",
  enquiries: "crm",
  "sales-progress": "crm",
  "follow-ups": "crm",
  offers: "crm",
  quotes: "quotation",
};
const LEGACY_SCREENS: Record<string, string> = { "sales-calendar": "followup-calendar" };

export function legacyPath(pathname: string): string | undefined {
  const [, , mod, screen] = pathname.split("/");
  if (mod === "sale") {
    const target = screen && SALES_MODULES.find((m) => m.screens.some((s) => s.slug === screen));
    return target ? screenPath(target.slug, screen) : modulePath("sales-order");
  }
  const next = mod && LEGACY_MODULES[mod];
  if (!next) return undefined;
  return screen ? screenPath(next, LEGACY_SCREENS[screen] ?? screen) : modulePath(next);
}

export const TOTAL_SCREENS = SALES_MODULES.reduce((n, m) => n + m.screens.length, 0);
