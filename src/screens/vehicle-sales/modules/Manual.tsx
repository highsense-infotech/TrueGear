// Module 12 — Settings › User Manual. A read-only guide to the Vehicle Sales
// module: the flow from purchase order to handover, what each module does,
// who does it, and what is still done by hand in Evolve. Links open only the
// screens this user may use.

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, CircleCheck, CircleAlert, Users } from "lucide-react";
import { cn } from "../../../components/utils/cn";
import { PageHeader, Card, SearchInput, SmallButton, Notice, Badge, EmptyState } from "../components/ui";
import { SALES_MODULES, screenPath } from "../registry";
import { useSalesAccess } from "../access";

interface Topic {
  module: string; // registry module slug
  purpose: string;
  steps: { title: string; text: string }[];
  rules?: string[];
  evolve: string;
  links: string[]; // screen slugs in this module
}

const TOPICS: Topic[] = [
  {
    module: "purchase-order",
    purpose: "Order new vehicles from a supplier and track each order until the vehicles arrive.",
    steps: [
      { title: "Raise the order", text: "Purchase Orders › + New Purchase Order. Pick the supplier, receiving branch and expected date (ETA), then add a line per vehicle: make, model, model code, colour, quantity and unit cost. Save as a draft or submit it for approval." },
      { title: "Approve", text: "A manager opens Approve Purchase Order and approves or rejects it (a rejection needs a reason). An approved order becomes Ordered." },
      { title: "Supplier delay", text: "Open the order and use Revise ETA with the new date and a reason. You can revise it as often as needed until every vehicle is received; the original ETA and every change stay on the order." },
      { title: "Customer promise", text: "In the order, pick the body type the vehicle will get. The customer promise is the current ETA plus that body type's build days." },
    ],
    rules: [
      "Status flow: Draft → Approval → Ordered → Partially Received → Received (or Rejected).",
      "Revise ETA needs Purchase Order › Approve and is closed once the order is fully received.",
    ],
    evolve: "Sending on-order stock to Evolve (API 23) is built but switched off until Evolve UAT passes. Capture the on-order vehicle in Evolve by hand, then open Send order to Evolve from the order and use Mark entered manually.",
    links: ["purchase-orders", "approve-purchase-order"],
  },
  {
    module: "goods-receipt",
    purpose: "Book arriving vehicles into stock, photograph and check them, and claim any damage from the supplier.",
    steps: [
      { title: "Receive", text: "Receive Vehicle › Against purchase order: choose the order and enter VIN, engine number, colour, odometer and retail price. A partial receipt keeps the order open. Used, demo and trade-in vehicles use the Without PO tab." },
      { title: "Trade-ins", text: "Trade-ins from invoiced or delivered sales wait at the top of Receive Vehicle. Take into stock fills the form as Used; add VIN, engine number, colour, odometer and retail price." },
      { title: "Arrival photos", text: "Live camera only. Front and rear views are required; left, right, dashboard and engine are optional. The odometer and VIN photos are read by the AI scan." },
      { title: "Quality check", text: "Arrival Quality Check: work through the New Vehicle Receipt checklist and record pass, conditional or fail. Defects found here go to the damage report." },
      { title: "Supplier claim", text: "Damage Report: set the claim type (Damage or Warranty) and estimate, then Send estimate → Supplier approved or Rejected (resend after a rejection) → Supplier paid → Settled. Settling releases a held vehicle to sellable stock." },
    ],
    evolve: "Adding the vehicle to Evolve stock (API 18) is switched off until UAT passes. Add it in Evolve by hand; TrueGear picks it up from Evolve stock (API 06).",
    links: ["receive-vehicle", "arrival-photos", "arrival-quality-check", "damage-report"],
  },
  {
    module: "stock",
    purpose: "See every vehicle in stock with price, colour, location, stock age and whether it is reserved or sold.",
    steps: [
      { title: "Find a vehicle", text: "Vehicles in Stock lists Evolve stock and vehicles received in TrueGear. Search or filter by branch, type and status." },
      { title: "Vehicle details", text: "Click a vehicle for its prices, factory accessories and deal history. From there you can create a quote or reserve it." },
      { title: "Totals", text: "Stock Totals shows count and value per location." },
    ],
    evolve: "Read live from Evolve (APIs 06, 16, 19, 26).",
    links: ["vehicles-in-stock", "stock-totals"],
  },
  {
    module: "crm",
    purpose: "Capture every lead, follow it up, book test drives and move it through the sales stages until it is won or lost.",
    steps: [
      { title: "Add an enquiry", text: "All Enquiries › + Add Enquiry. Search for an existing customer or add a new one (individual or company), pick the make, model and model code, the source and the owner. A new customer is created in TrueGear and, when switched on, in Evolve." },
      { title: "Lead ownership", text: "A Sales Executive sees their own enquiries and unclaimed ones, and can claim an unclaimed lead. Managers see all enquiries, can leave a new lead unassigned and can reassign leads." },
      { title: "Work the enquiry", text: "Open it from All Enquiries or the Sales Board. Enquiry Details shows requirements, matching stock and activity, with buttons to create a quote, book a test drive or close it as lost." },
      { title: "Test drive", text: "Book a vehicle, date and time slot (slots already taken or already past are blocked). On the day, Start Test Drive: capture the driver's licence with the live camera (the driver need not be the customer), record the odometer, then finish with the end odometer and feedback." },
      { title: "Sales Board and lost deals", text: "Drag enquiries across the stages. Close as Lost records the reason and competitor; Lost Enquiries lets you reopen one." },
      { title: "Follow-ups and offers", text: "The FollowUp Calendar shows tasks and test drives. Offers lets you create a campaign, choose customers and send it." },
    ],
    rules: [
      "All Enquiries shows the enquiry funnel and lead sources; managers can switch the charts to one salesperson.",
      "Set-up screens (auto-assign, priority, stages, lost reasons, templates, reminders, demo vehicles) are for managers.",
    ],
    evolve: "Evolve has no CRM API, so leads live in TrueGear. Existing customers are looked up in Evolve (APIs 02, 03).",
    links: ["all-enquiries", "sales-board", "followup-calendar", "start-test-drive", "lost-enquiries", "offers"],
  },
  {
    module: "quotation",
    purpose: "Price a vehicle for the customer with accessories, F&I products, maintenance plan, trade-in and discount.",
    steps: [
      { title: "Build the quote", text: "All Quotations › + New Quote (or Create quote from the enquiry): choose the enquiry and the vehicle. The price comes from stock. Search and tick accessories, F&I insurance and a maintenance contract (or None), add the trade-in and any discount." },
      { title: "Discount approval", text: "A discount above the executive's limit (Settings › Discount Limits) goes to a manager on Approve Discount." },
      { title: "Share it", text: "Print the quote or send the customer link. Both carry a QR code and the payment reference Q-…-V1." },
      { title: "Revisions", text: "Editing a saved quote creates the next version (V2, V3 …). Quote History keeps every version." },
    ],
    evolve: "Accessories, F&I insurances and maintenance contracts are read from Evolve (API 07).",
    links: ["all-quotations", "new-quote", "approve-discount", "quote-history"],
  },
  {
    module: "sales-order",
    purpose: "Turn the accepted quote into a deal and prepare it for Evolve.",
    steps: [
      { title: "Create the deal", text: "Sale Details › New deal from quote. Check the salesperson, manager, F&I manager, AR account, deposit and trade-in." },
      { title: "Finance and reservation", text: "From the deal: Finance application captures employment, income and address; Reserve vehicle blocks the unit against the deposit so no other quote can take it." },
      { title: "Fleet", text: "Fleet Sale handles several vehicles for one buyer." },
    ],
    evolve: "Pushing the deal to Evolve (API 12, Review for Evolve) is switched off until UAT passes. Create the deal in Evolve by hand; TrueGear reads it back (API 09).",
    links: ["sale-details", "fleet-sale"],
  },
  {
    module: "body-building",
    purpose: "Send a sold vehicle to a body builder, track it and check it on return.",
    steps: [
      { title: "Masters", text: "Body Builder Master and Body Type Master hold the builders and the standard build days of each body type." },
      { title: "Job", text: "Body Building Job sends the vehicle, tracks progress and the expected return, and records the check when it comes back." },
    ],
    evolve: "No Evolve API. Build days feed the customer promise on the purchase order.",
    links: ["body-building-job", "body-builders", "body-types"],
  },
  {
    module: "sales-invoice",
    purpose: "See when Evolve has invoiced the deal.",
    steps: [
      { title: "Status", text: "Sale Status & Invoice shows the Evolve deal status, invoice number and date, totals and gross profit." },
      { title: "Download", text: "Download the Evolve invoice from the deal." },
    ],
    evolve: "Read from Evolve (APIs 09, 26). Invoice download (API 20) still needs a test with a real document.",
    links: ["sale-status-invoice"],
  },
  {
    module: "payment",
    purpose: "Record what the customer pays and the balance still due.",
    steps: [
      { title: "Record a payment", text: "Customer Payments: pick the deal; the reference is pre-filled with the quote reference (Q-…-Vn) so the payment matches the deal." },
      { title: "Cancel or refund", text: "Cancel Sale / Refund applies the refund or forfeit rule and needs manager approval." },
    ],
    evolve: "No Evolve API. Finance enters the receipt in Evolve.",
    links: ["customer-payments", "cancel-sale"],
  },
  {
    module: "handover",
    purpose: "Get the vehicle ready and hand it to the customer.",
    steps: [
      { title: "Ready list", text: "Ready to Hand Over lists the vehicles to deliver." },
      { title: "Pre-delivery check", text: "From the list, run the PDI. The vehicle cannot be released until it passes." },
      { title: "Handover", text: "Handover Checklist: walkthrough, documents, keys, manuals, photos and the customer's signature." },
      { title: "Gate pass", text: "Issued once paid or finance approved; the gate redeems it when the vehicle leaves." },
    ],
    evolve: "Ready-for-collection vehicles are read from Evolve (API 32).",
    links: ["ready-to-hand-over", "gate-pass"],
  },
  {
    module: "reports",
    purpose: "Track sales, the funnel, lost deals, team performance, commission and balances.",
    steps: [
      { title: "Dashboards", text: "Sales Dashboard, Enquiry to Sale, Lost Sales, Team Ranking and My Sales Score." },
      { title: "Money", text: "Commission (manager approves) and Customer Balances Due." },
      { title: "Export", text: "Export Reports downloads any report." },
    ],
    evolve: "Sales and stock figures come from Evolve (APIs 17, 19, 06, 09); leads, test drives and quotes from TrueGear.",
    links: ["sales-dashboard", "enquiry-to-sale", "team-ranking", "my-sales-score"],
  },
  {
    module: "settings",
    purpose: "Set the rules the other modules use.",
    steps: [
      { title: "Discount limits", text: "Maximum discount per role; above it a manager approves." },
      { title: "Sales targets", text: "Per executive, branch and month; used by My Sales Score." },
      { title: "Checklists", text: "The New Vehicle Receipt and Delivery checklists." },
    ],
    evolve: "No Evolve API. Users, roles and each user's Evolve salesperson are set in Role & User Management.",
    links: ["discount-limits", "sales-targets", "checklists"],
  },
];

const ROLES: { role: string; does: string }[] = [
  { role: "Sales Executive", does: "Own and unclaimed enquiries, test drives, quotes, sales orders, receiving, stock and handover. No purchase orders, approvals or settings." },
  { role: "Sales Manager", does: "Everything a Sales Executive does, plus purchase orders, all approvals (orders, discounts), every enquiry, reassigning leads and the CRM set-up screens." },
  { role: "F&I Manager", does: "Quotations, sales orders (with approval), invoices, customer payments (with approval) and reports." },
  { role: "Super Admin", does: "Everything, and manages roles and permissions in Role & User Management." },
];

export function UserManual() {
  const navigate = useNavigate();
  const { canScreen } = useSalesAccess();
  const [query, setQuery] = useState("");

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TOPICS.map((t) => ({ t, m: SALES_MODULES.find((m) => m.slug === t.module)! }))
      .filter(({ t, m }) => !q || [m.label, t.purpose, t.evolve, ...(t.rules ?? []), ...t.steps.flatMap((s) => [s.title, s.text])].join(" ").toLowerCase().includes(q));
  }, [query]);

  const jump = (slug: string) => document.getElementById(`manual-${slug}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <>
      <PageHeader title="User Manual" description="What the Vehicle Sales module does, step by step, from purchase order to handover." />

      <Card title="How a vehicle sale flows" icon={BookOpen} className="mb-5">
        <ol className="flex flex-wrap items-center gap-1.5">
          {TOPICS.slice(0, 10).map((t, i) => {
            const m = SALES_MODULES.find((x) => x.slug === t.module)!;
            return (
              <li key={t.module} className="flex items-center gap-1.5">
                <button type="button" onClick={() => jump(t.module)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e7eb] bg-white px-2.5 py-1.5 text-[12px] text-[#333] hover:border-[#ff4f31] hover:text-[#ff4f31] cursor-pointer">
                  <m.icon size={14} className="text-[#999]" /> {m.label}
                </button>
                {i < 9 && <ArrowRight size={14} className="text-[#ccc]" aria-hidden />}
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-[12px] text-[#666]">Reports and Settings sit alongside the flow. Click a step to jump to it.</p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <Card title="Who does what" icon={Users}>
          <ul className="divide-y divide-[#f0f0f0]">
            {ROLES.map((r) => (
              <li key={r.role} className="py-2.5">
                <p className="text-[13px] font-medium text-[#333]">{r.role}</p>
                <p className="text-[12px] text-[#666] mt-0.5">{r.does}</p>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-[#999]">These are the standard roles. Your administrator can change them in Role & User Management.</p>
        </Card>
        <Card title="TrueGear and Evolve">
          <div className="space-y-3 text-[12px] text-[#555]">
            <p className="flex gap-2"><CircleCheck size={16} className="text-green-600 shrink-0" /><span><span className="font-medium text-[#333]">Read from Evolve today:</span> stock, prices, customers, lookup lists (makes, models, accessories, F&I products), deals and invoices.</span></p>
            <p className="flex gap-2"><CircleAlert size={16} className="text-amber-600 shrink-0" /><span><span className="font-medium text-[#333]">Sending to Evolve is switched off</span> until each call passes Evolve's UAT test: on-order stock, stock, new customers and deals. Until then staff capture these in Evolve by hand; screens marked with an amber dot in the menu work this way.</span></p>
            <p className="flex gap-2"><CircleCheck size={16} className="text-green-600 shrink-0" /><span><span className="font-medium text-[#333]">Kept in TrueGear:</span> purchase orders, receiving, leads, test drives, quotes, payments, handover and reports.</span></p>
          </div>
        </Card>
      </div>

      <div className="mb-5"><SearchInput value={query} onChange={setQuery} placeholder="Search the manual, e.g. test drive, ETA, claim" /></div>

      {sections.length === 0 ? (
        <EmptyState icon={BookOpen} title="Nothing found" message={`No topic mentions "${query.trim()}".`} />
      ) : (
        <div className="space-y-5">
          {sections.map(({ t, m }) => {
            const links = t.links.filter((s) => canScreen(m.slug, s)).map((s) => m.screens.find((x) => x.slug === s)).filter((s) => !!s);
            return (
              <section key={t.module} id={`manual-${t.module}`} className="scroll-mt-4">
                <Card title={m.label} subtitle={t.purpose} icon={m.icon}>
                  <ol className="space-y-3">
                    {t.steps.map((s, i) => (
                      <li key={s.title} className="flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#fff1ee] text-[#ff4f31] text-[12px] font-semibold flex items-center justify-center shrink-0">{i + 1}</span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-[#333]">{s.title}</p>
                          <p className="text-[12px] text-[#666] mt-0.5">{s.text}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                  {t.rules && (
                    <ul className="mt-4 space-y-1 text-[12px] text-[#555] list-disc pl-5">
                      {t.rules.map((r) => <li key={r}>{r}</li>)}
                    </ul>
                  )}
                  <Notice tone="info" className="mt-4"><span className="font-medium">Evolve:</span> {t.evolve}</Notice>
                  {links.length > 0 && (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Badge tone="gray">Open</Badge>
                      {links.map((s) => (
                        <SmallButton key={s.slug} onClick={() => navigate(screenPath(m.slug, s.slug))}
                          className={cn(s.status !== "ready" && "border-amber-300")}>{s.label}</SmallButton>
                      ))}
                    </div>
                  )}
                </Card>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
