// Role-based access for Vehicle Sales. Each module is one permission resource
// (constants/permissions.ts → VEHICLE_SALES_MODULES) with the standard five
// actions, granted per role in Role & User Management (seeded roles: Sales
// Executive, Sales Manager, F&I Manager). Super Admin bypasses every check.
//
// A screen needs `view` on its module, plus the action below when the screen
// exists to do that one thing:
//   create  — raises a new record (PO, receipt, enquiry, quote, fleet deal, payment)
//   edit    — works on existing records, including sending them to Evolve
//   approve — manager decisions and module set-up (approvals, rules, stages)

import { useCallback, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { ACTIONS, VEHICLE_SALES_MODULES, type Action } from "../../constants/permissions";
import { SALES_MODULES, type SalesModule } from "./registry";
import { useSalesData } from "./data/store";

export function salesResource(moduleSlug: string): string | undefined {
  return VEHICLE_SALES_MODULES.find((m) => m.slug === moduleSlug)?.key;
}

const SCREEN_ACTION: Record<string, Action> = {
  // 1. Purchase Order
  "purchase-order/new-purchase-order": ACTIONS.CREATE,
  "purchase-order/approve-purchase-order": ACTIONS.APPROVE,
  "purchase-order/send-order-to-evolve": ACTIONS.EDIT,
  // 2. Vehicle Goods Receipt
  "goods-receipt/receive-vehicle": ACTIONS.CREATE,
  "goods-receipt/arrival-photos": ACTIONS.EDIT,
  "goods-receipt/arrival-quality-check": ACTIONS.EDIT,
  "goods-receipt/damage-report": ACTIONS.EDIT,
  "goods-receipt/send-to-evolve-stock": ACTIONS.EDIT,
  // 4. CRM / Enquiry
  "crm/add-enquiry": ACTIONS.CREATE,
  "crm/auto-assign-rules": ACTIONS.APPROVE,
  "crm/reassign-enquiries": ACTIONS.APPROVE,
  "crm/priority-settings": ACTIONS.APPROVE,
  "crm/sales-stages-setup": ACTIONS.APPROVE,
  "crm/lost-reasons-setup": ACTIONS.APPROVE,
  "crm/close-as-lost": ACTIONS.EDIT,
  "crm/message-templates": ACTIONS.APPROVE,
  "crm/reminder-rules": ACTIONS.APPROVE,
  "crm/demo-vehicles": ACTIONS.APPROVE,
  "crm/book-test-drive": ACTIONS.CREATE,
  "crm/start-test-drive": ACTIONS.EDIT,
  "crm/offers": ACTIONS.APPROVE,
  "crm/choose-customers": ACTIONS.APPROVE,
  "crm/send-offer": ACTIONS.APPROVE,
  // 5. Quotation
  "quotation/new-quote": ACTIONS.CREATE,
  "quotation/trade-in-value": ACTIONS.EDIT,
  "quotation/approve-discount": ACTIONS.APPROVE,
  "quotation/customer-quote-link": ACTIONS.EDIT,
  // 6. Sales Order
  "sales-order/finance-application": ACTIONS.EDIT,
  "sales-order/reserve-vehicle": ACTIONS.EDIT,
  "sales-order/send-sale-to-evolve": ACTIONS.EDIT,
  "sales-order/fleet-sale": ACTIONS.CREATE,
  // 7. Body Building
  "body-building/body-builders": ACTIONS.APPROVE,
  "body-building/body-types": ACTIONS.APPROVE,
  // 8. Sales Invoice — both screens are views of Evolve's invoice.
  // 9. Payment
  "payment/customer-payments": ACTIONS.CREATE,
  "payment/cancel-sale": ACTIONS.EDIT,
  // 10. Delivery / Handover
  "handover/pre-delivery-check": ACTIONS.EDIT,
  "handover/handover-checklist": ACTIONS.EDIT,
  "handover/gate-pass": ACTIONS.EDIT,
  // 11. Reports
  "reports/team-ranking": ACTIONS.APPROVE,
  "reports/commission": ACTIONS.APPROVE,
  "reports/customer-balances": ACTIONS.APPROVE,
  // 12. Settings — every screen changes configuration.
  "settings/discount-limits": ACTIONS.EDIT,
  "settings/sales-targets": ACTIONS.EDIT,
  "settings/checklists": ACTIONS.EDIT,
};

/** The action a screen needs on its module, besides `view`. */
export function screenAction(moduleSlug: string, screenSlug: string): Action {
  return SCREEN_ACTION[`${moduleSlug}/${screenSlug}`] ?? ACTIONS.VIEW;
}

export function useSalesAccess() {
  const { hasPermission } = useAuth();

  const can = useCallback(
    (moduleSlug: string, action: Action = ACTIONS.VIEW) => {
      const resource = salesResource(moduleSlug);
      return !!resource && hasPermission(resource, action);
    },
    [hasPermission],
  );

  const canScreen = useCallback(
    (moduleSlug: string, screenSlug: string) => {
      const action = screenAction(moduleSlug, screenSlug);
      return can(moduleSlug, ACTIONS.VIEW) && (action === ACTIONS.VIEW || can(moduleSlug, action));
    },
    [can],
  );

  return { can, canScreen };
}

/** The modules this user can view, each with only the screens they can open. */
export function useVisibleModules(): SalesModule[] {
  const { can, canScreen } = useSalesAccess();
  return useMemo(
    () => SALES_MODULES.filter((m) => can(m.slug)).map((m) => ({ ...m, screens: m.screens.filter((s) => canScreen(m.slug, s.slug)) })),
    [can, canScreen],
  );
}

// ── Lead ownership ───────────────────────────────────────────────────────────
// CRM › Approve (Sales Manager, Super Admin) sees every enquiry and reassigns.
// Everyone else (Sales Executive) sees the enquiries they own plus unclaimed
// ones (no owner), which they can claim.
export function useLeadScope() {
  const { user, hasPermission } = useAuth();
  const resource = salesResource("crm");
  const seesAll = !!resource && hasPermission(resource, ACTIONS.APPROVE);
  const me = user?.id ?? "";
  const canSee = useCallback((e: { ownerId?: string }) => seesAll || !e.ownerId || e.ownerId === me, [seesAll, me]);
  return { seesAll, me, canSee };
}

/** The enquiries this user may see (see useLeadScope). */
export function useMyEnquiries() {
  const { enquiries } = useSalesData();
  const { canSee } = useLeadScope();
  return useMemo(() => enquiries.filter(canSee), [enquiries, canSee]);
}
