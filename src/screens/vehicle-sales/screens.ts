// Maps each registry screen ("module/screen") to its component. Module files
// are lazy-loaded so the Vehicle Sales preview adds nothing to the initial
// bundle of the existing workshop app.

import { lazy, type ComponentType, type LazyExoticComponent } from "react";

type Loader = () => Promise<Record<string, ComponentType>>;

const named = (loader: Loader, name: string) =>
  lazy(() => loader().then((m) => ({ default: m[name] })));

const buying = () => import("./modules/Buying");
const receiving = () => import("./modules/Receiving");
const stock = () => import("./modules/Stock");
const enquiries = () => import("./modules/Enquiries");
const progress = () => import("./modules/SalesProgress");
const followUps = () => import("./modules/FollowUps");
const quotes = () => import("./modules/Quotes");
const sale = () => import("./modules/Sale");
const bodyBuilding = () => import("./modules/BodyBuilding");
const offers = () => import("./modules/Offers");
const handover = () => import("./modules/Handover");
const reports = () => import("./modules/Reports");
const settings = () => import("./modules/Settings");
const manual = () => import("./modules/Manual");

export const SCREEN_COMPONENTS: Record<string, LazyExoticComponent<ComponentType>> = {
  "purchase-order/purchase-orders": named(buying, "PurchaseOrders"),
  "purchase-order/new-purchase-order": named(buying, "NewPurchaseOrder"),
  "purchase-order/approve-purchase-order": named(buying, "ApprovePurchaseOrder"),
  "purchase-order/send-order-to-evolve": named(buying, "SendOrderToEvolve"),

  "goods-receipt/receive-vehicle": named(receiving, "ReceiveVehicle"),
  "goods-receipt/arrival-photos": named(receiving, "ArrivalPhotos"),
  "goods-receipt/arrival-quality-check": named(receiving, "ArrivalQualityCheck"),
  "goods-receipt/damage-report": named(receiving, "DamageReport"),
  "goods-receipt/send-to-evolve-stock": named(receiving, "SendToEvolveStock"),

  "stock/vehicles-in-stock": named(stock, "VehiclesInStock"),
  "stock/vehicle-details": named(stock, "VehicleDetails"),
  "stock/stock-totals": named(stock, "StockTotals"),

  "crm/all-enquiries": named(enquiries, "AllEnquiries"),
  "crm/add-enquiry": named(enquiries, "AddEnquiry"),
  "crm/enquiry-details": named(enquiries, "EnquiryDetails"),
  "crm/auto-assign-rules": named(enquiries, "AutoAssignRules"),
  "crm/reassign-enquiries": named(enquiries, "ReassignEnquiries"),
  "crm/priority-settings": named(enquiries, "PrioritySettings"),
  "crm/sales-board": named(progress, "SalesBoard"),
  "crm/sales-stages-setup": named(progress, "SalesStagesSetup"),
  "crm/close-as-lost": named(progress, "CloseAsLost"),
  "crm/lost-reasons-setup": named(progress, "LostReasonsSetup"),
  "crm/lost-enquiries": named(progress, "LostEnquiries"),
  "crm/customer-history": named(followUps, "CustomerHistory"),
  "crm/message-templates": named(followUps, "MessageTemplates"),
  "crm/reminder-rules": named(followUps, "ReminderRules"),
  "crm/followup-calendar": named(followUps, "SalesCalendar"),
  "crm/demo-vehicles": named(followUps, "DemoVehicles"),
  "crm/book-test-drive": named(followUps, "BookTestDrive"),
  "crm/start-test-drive": named(followUps, "StartTestDrive"),
  "crm/offers": named(offers, "Offers"),
  "crm/choose-customers": named(offers, "ChooseCustomers"),
  "crm/send-offer": named(offers, "SendOffer"),

  "quotation/all-quotations": named(quotes, "AllQuotations"),
  "quotation/new-quote": named(quotes, "NewQuote"),
  "quotation/trade-in-value": named(quotes, "TradeInValue"),
  "quotation/approve-discount": named(quotes, "ApproveDiscount"),
  "quotation/quote-history": named(quotes, "QuoteHistory"),
  "quotation/customer-quote-link": named(quotes, "CustomerQuoteLink"),
  "quotation/print-quote": named(quotes, "PrintQuote"),

  "sales-order/sale-details": named(sale, "SaleDetails"),
  "sales-order/finance-application": named(sale, "FinanceApplication"),
  "sales-order/reserve-vehicle": named(sale, "ReserveVehicle"),
  "sales-order/send-sale-to-evolve": named(sale, "SendSaleToEvolve"),
  "sales-order/fleet-sale": named(sale, "FleetSale"),

  "body-building/body-builders": named(bodyBuilding, "BodyBuilders"),
  "body-building/body-types": named(bodyBuilding, "BodyTypes"),
  "body-building/body-building-job": named(bodyBuilding, "BodyBuildingJob"),

  "sales-invoice/sale-status-invoice": named(sale, "SaleStatusInvoice"),
  "sales-invoice/download-invoice": named(sale, "DownloadInvoice"),

  "payment/customer-payments": named(sale, "CustomerPayments"),
  "payment/cancel-sale": named(sale, "CancelSale"),

  "handover/pre-delivery-check": named(handover, "PreDeliveryCheck"),
  "handover/handover-checklist": named(handover, "HandoverChecklist"),
  "handover/ready-to-hand-over": named(handover, "ReadyToHandOver"),
  "handover/gate-pass": named(handover, "GatePass"),

  "reports/sales-dashboard": named(reports, "SalesDashboard"),
  "reports/enquiry-to-sale": named(reports, "EnquiryToSale"),
  "reports/lost-sales": named(reports, "LostSales"),
  "reports/team-ranking": named(reports, "TeamRanking"),
  "reports/my-sales-score": named(reports, "MySalesScore"),
  "reports/commission": named(reports, "Commission"),
  "reports/customer-balances": named(reports, "CustomerBalances"),
  "reports/export-reports": named(reports, "ExportReports"),

  "settings/discount-limits": named(settings, "DiscountLimits"),
  "settings/sales-targets": named(settings, "SalesTargets"),
  "settings/checklists": named(settings, "Checklists"),
  "settings/user-manual": named(manual, "UserManual"),
};
