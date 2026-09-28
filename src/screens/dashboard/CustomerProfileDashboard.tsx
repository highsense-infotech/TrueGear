import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { CustomerProfile } from "../../components/cards/CustomerProfile";
import Button from "../../components/common/Button";
import { OverviewTab } from "../../components/customer-profile/OverviewTab";
import { ServiceTab } from "../../components/customer-profile/ServiceTab";
import { AssetsTab } from "../../components/customer-profile/AssetsTab";
import { FinancialTab } from "../../components/customer-profile/FinancialTab";
import { IntegrationTab } from "../../components/customer-profile/IntegrationTab";
import { EditProfileModal } from "../../components/customer-profile/EditProfileModal";
import { EditVehicleModal } from "../../components/customer-profile/EditVehicleModal";
import { EditAddressesModal } from "../../components/customer-profile/EditAddressesModal";
import { AddNotesModal } from "../../components/customer-profile/AddNotesModal";
import { lookupCustomerBySequence, addCustomerNote } from "../../api/customer.api";
import type { CustomerFullDetail } from "../../api/customer.api";
import { getVehiclesByCustomer, type VehicleListItem } from "../../api/appointment.api";

const tabs = [
  { id: "overview", label: "Overview" },
  // { id: "service", label: "Service & Operations" },
  { id: "assets", label: "Assets & Vehicles" },
  // { id: "financial", label: "Financial" },
  // { id: "integration", label: "Integration" },
];

function CustomerProfileDashboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const custSequenceId = searchParams.get("custSequenceId");

  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(!!custSequenceId);
  const [customer, setCustomer] = useState<CustomerFullDetail | null>(null);
  const [irmDetail, setIrmDetail] = useState<Record<string, string> | null>(null);
  const [irmAr, setIrmAr] = useState<Record<string, string | number | boolean> | null>(null);
  const [internalNotes, setInternalNotes] = useState<string | null>(null);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [customerVehicles, setCustomerVehicles] = useState<VehicleListItem[]>([]);
  /**
   * Vehicle paging. getVehiclesByCustomer defaults to limit=10, and this
   * screen previously called it with no options — so a customer with 23
   * vehicles showed 10 with nothing indicating the rest existed. Fleet
   * customers can have hundreds, so the list is paged rather than fetched
   * whole; `total` drives the count shown in the Asset Management card.
   */
  const [vehiclePage, setVehiclePage] = useState(1);
  const [vehiclePageSize, setVehiclePageSize] = useState(10);
  const [vehicleTotal, setVehicleTotal] = useState(0);
  const [vehicleTotalPages, setVehicleTotalPages] = useState(1);
  /**
   * The resolved local customer id, kept separately from `customer` so the
   * vehicle-paging effect below has a single primitive dependency. Depending
   * on the `customer` OBJECT would refire the fetch on every unrelated
   * refetch, because a fresh object is never referentially equal.
   */
  const [vehicleCustomerId, setCustomerId] = useState<string | null>(null);

  useEffect(() => {
    if (!custSequenceId) return;
    setLoading(true);
    (async () => {
      try {
        const res = await lookupCustomerBySequence(custSequenceId);
        if (res.data) {
        if (res.data.irmData) {
          setIrmDetail(res.data.irmData.CustomerDetail);
          setIrmAr(res.data.irmData.AccountsReceivable ?? null);
        }
        if (res.data.localData) {
          const localCustomer = res.data.localData as CustomerFullDetail;
          setCustomer(localCustomer);
          setInternalNotes(localCustomer.notes ?? null);
          setNotesForm({ notes: localCustomer.notes ?? "" });
          // Fetch the first page of this customer's vehicles. Paging state is
          // applied by the effect below, which also handles page changes.
          setCustomerId(localCustomer.id);
        }
        }
      } catch {

      }
      setLoading(false);
    })();
  }, [custSequenceId]);

  /**
   * Load one page of vehicles whenever the customer, page or page size
   * changes. Separate from the main load effect so paging does not re-run the
   * Evolve lookup (which is a live IRM call plus a full persist).
   */
  useEffect(() => {
    if (!vehicleCustomerId) return;
    let cancelled = false;
    (async () => {
      try {
        const vRes = await getVehiclesByCustomer(vehicleCustomerId, {
          page: vehiclePage,
          limit: vehiclePageSize,
        });
        if (cancelled) return;
        setCustomerVehicles(vRes.data?.data ?? []);
        setVehicleTotal(vRes.data?.pagination?.total ?? 0);
        setVehicleTotalPages(vRes.data?.pagination?.totalPages ?? 1);
      } catch {
        // Non-fatal: the rest of the profile still renders.
      }
    })();
    // A page change that lands after a later one must not overwrite it.
    return () => { cancelled = true; };
  }, [vehicleCustomerId, vehiclePage, vehiclePageSize]);

  const handleSaveNotes = async () => {
    if (!customer) return;
    setIsSavingNotes(true);
    try {
      const res = await addCustomerNote(customer.id, notesForm.notes);
      setInternalNotes(res.data?.notes ?? null);
      setIsAddNotesOpen(false);
    } catch {
      // keep modal open on error
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Modal states
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isEditAddressesOpen, setIsEditAddressesOpen] = useState(false);
  const [isAddNotesOpen, setIsAddNotesOpen] = useState(false);
  // Vehicle being edited from the Assets tab; null closes the modal.
  const [editingVehicle, setEditingVehicle] = useState<VehicleListItem | null>(null);

  /**
   * Refetch the customer after a profile edit, so the header and tabs show
   * the saved values. Re-runs the same lookup the page loads with; the app
   * has no query cache, so an explicit refetch is the convention here.
   */
  const refetchCustomer = async () => {
    if (!custSequenceId) return;
    try {
      const res = await lookupCustomerBySequence(custSequenceId);
      if (!res.data) return;

      /**
       * Refresh irmData TOO, not just localData.
       *
       * Every displayed value prefers irmDetail over customer (displayName,
       * displayEmail, the address blocks, and the Edit modal's own
       * hydration). Updating only `customer` left the STALE Evolve snapshot
       * from page load still winning, so a saved edit appeared to do nothing
       * until a full reload cleared it — even though the write had succeeded.
       *
       * The initial load sets both; a refetch that sets one is what caused
       * the mismatch. Assigned unconditionally so a customer that has since
       * stopped resolving in Evolve clears the old snapshot instead of
       * keeping it forever.
       */
      setIrmDetail(res.data.irmData?.CustomerDetail ?? null);
      setIrmAr(res.data.irmData?.AccountsReceivable ?? null);

      const localCustomer = res.data.localData as CustomerFullDetail | undefined;
      if (localCustomer) {
        setCustomer(localCustomer);
        setInternalNotes(localCustomer.notes ?? null);
      }
    } catch {
      // Non-fatal: the save succeeded and was confirmed by a toast. The
      // screen keeps its previous values until the next load.
    }
  };

  /**
   * Refetch this customer's vehicles after a vehicle edit, so the Assets tab
   * shows the new values — same explicit-refetch convention.
   */
  const refetchVehicles = async () => {
    if (!customer) return;
    try {
      // Keep the CURRENT page and size: editing a vehicle on page 3 must not
      // silently jump the list back to page 1. Omitting these was what made
      // the list show only the first 10 of 23 in the first place.
      const vRes = await getVehiclesByCustomer(customer.id, {
        page: vehiclePage,
        limit: vehiclePageSize,
      });
      setCustomerVehicles(vRes.data?.data ?? []);
      setVehicleTotal(vRes.data?.pagination?.total ?? 0);
      setVehicleTotalPages(vRes.data?.pagination?.totalPages ?? 1);
    } catch {
      // Non-fatal, as above.
    }
  };

  // Form states
  // profileForm removed: it held hardcoded demo values ("Anderson Automotive
  // Solutions Inc" and a fictional US contact) that were shown for EVERY
  // customer and never replaced with loaded data. EditProfileModal now
  // hydrates from the real `customer` object instead.
  //
  // addressForm below is still demo data, but remains because
  // EditAddressesModal is deferred, not rewritten — its Edit button is hidden
  // so these values cannot reach the backend.

  const [addressForm, setAddressForm] = useState({
    billingAddress:
      "2312 Business Rd, Ste 203, San Francisco, CA 94102, United States",
    shippingAddress:
      "5876 Logistics Pocket, Bldg 4, Oakland, CA 94621, United States",
    serviceAddress:
      "2312 Business Rd, Ste Service Bay 3, San Francisco, CA 94102, United States",
    geoCoordinates: "37.7749, -122.4194",
  });

  const [notesForm, setNotesForm] = useState({
    notes: "",
  });

  // ─── Helper to build a formatted address string from IRM parts ────────────
  const buildIrmAddress = (...parts: (string | undefined)[]) =>
    parts.filter(Boolean).join(", ") || "—";

  const pinIcon = (
    <svg className="size-6" fill="none" viewBox="0 0 16 16">
      <path
        d="M8 14C8 14 12 10.5 12 7C12 4.79086 10.2091 3 8 3C5.79086 3 4 4.79086 4 7C4 10.5 8 14 8 14Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <circle
        cx="8"
        cy="7"
        r="1.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );

  // const geoIcon = (
  //   <svg className="size-6" fill="none" viewBox="0 0 16 16">
  //     <path
  //       d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14Z"
  //       stroke="currentColor"
  //       strokeLinecap="round"
  //       strokeLinejoin="round"
  //       strokeWidth="1.5"
  //     />
  //     <path
  //       d="M2 8H14M8 2C9.5 4 10 6 10 8C10 10 9.5 12 8 14C6.5 12 6 10 6 8C6 6 6.5 4 8 2Z"
  //       stroke="currentColor"
  //       strokeLinecap="round"
  //       strokeLinejoin="round"
  //       strokeWidth="1.5"
  //     />
  //   </svg>
  // );

  // Always show the same 4 fixed labels; populate values from IRM → local → "—"
  const billingAddress = irmDetail
    ? buildIrmAddress(
        irmDetail.PhysicalAddress1,
        irmDetail.PhysicalAddress2,
        irmDetail.PhysicalAddress3,
        irmDetail.PhysicalCity,
        irmDetail.PhysicalAreaCode,
        irmDetail.PhysicalCountry,
      )
    : buildIrmAddress(
        ...(customer?.addresses?.find((a) => a.addressType === "BILLING")
          ? [
              customer.addresses.find((a) => a.addressType === "BILLING")!.addressLine1 ?? undefined,
              customer.addresses.find((a) => a.addressType === "BILLING")!.addressLine2 ?? undefined,
              customer.addresses.find((a) => a.addressType === "BILLING")!.city ?? undefined,
              customer.addresses.find((a) => a.addressType === "BILLING")!.state ?? undefined,
              customer.addresses.find((a) => a.addressType === "BILLING")!.postalCode ?? undefined,
              customer.addresses.find((a) => a.addressType === "BILLING")!.country ?? undefined,
            ]
          : []),
      );

  const shippingAddress = irmDetail
    ? buildIrmAddress(
        irmDetail.DeliveryAddress1,
        irmDetail.DeliveryAddress2,
        irmDetail.DeliveryAddress3,
        irmDetail.DeliveryCity,
        irmDetail.DeliveryAreaCode,
        irmDetail.DeliveryCountry,
      )
    : buildIrmAddress(
        ...(customer?.addresses?.find((a) => a.addressType === "SHIPPING")
          ? [
              customer.addresses.find((a) => a.addressType === "SHIPPING")!.addressLine1 ?? undefined,
              customer.addresses.find((a) => a.addressType === "SHIPPING")!.city ?? undefined,
              customer.addresses.find((a) => a.addressType === "SHIPPING")!.state ?? undefined,
              customer.addresses.find((a) => a.addressType === "SHIPPING")!.country ?? undefined,
            ]
          : []),
      );

  const serviceAddress = irmDetail
    ? buildIrmAddress(
        irmDetail.PostalAddress1,
        irmDetail.PostalAddress2,
        irmDetail.PostalAddress3,
        irmDetail.PostalCity,
        irmDetail.PostalAreaCode,
        irmDetail.PostalCountry,
      )
    : buildIrmAddress(
        ...(customer?.addresses?.find((a) => a.addressType === "SERVICE")
          ? [
              customer.addresses.find((a) => a.addressType === "SERVICE")!.addressLine1 ?? undefined,
              customer.addresses.find((a) => a.addressType === "SERVICE")!.city ?? undefined,
              customer.addresses.find((a) => a.addressType === "SERVICE")!.state ?? undefined,
              customer.addresses.find((a) => a.addressType === "SERVICE")!.country ?? undefined,
            ]
          : []),
      );

  const addressFields = [
    { label: "Billing Address",            value: billingAddress,  icon: pinIcon },
    { label: "Shipping/Delivery Address",  value: shippingAddress, icon: pinIcon },
    { label: "Service Address",            value: serviceAddress,  icon: pinIcon },
    // { label: "Geo Coordinates",            value: "—",             icon: geoIcon },
  ];

  const personIcon = (
    <svg className="size-6" fill="none" viewBox="0 0 16 16">
      <path
        d="M8 8C9.65685 8 11 6.65685 11 5C11 3.34315 9.65685 2 8 2C6.34315 2 5 3.34315 5 5C5 6.65685 6.34315 8 8 8Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M2 14V13C2 11.3431 3.34315 10 5 10H11C12.6569 10 14 11.3431 14 13V14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );

  // const calendarIcon = (
  //   <svg className="size-6" fill="none" viewBox="0 0 16 16">
  //     <rect x="2" y="3" width="12" height="11" rx="1" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
  //     <path d="M2 6H14M5 2V4M11 2V4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
  //   </svg>
  // );

  // const arrowIcon = (
  //   <svg className="size-6" fill="none" viewBox="0 0 16 16">
  //     <path d="M3 13L13 3M13 3H7M13 3V9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
  //   </svg>
  // );

  // const tagIcon = (
  //   <svg className="size-6" fill="none" viewBox="0 0 16 16">
  //     <path d="M2 2H7.5L14 8.5L8.5 14L2 7.5V2Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
  //     <circle cx="5" cy="5" r="1" fill="currentColor" />
  //   </svg>
  // );

  const relationshipFields = [
    // {
    //   label: "First Service Date",
    //   value: "—",
    //   icon: calendarIcon,
    // },
    {
      label: "Customer Type / Segment",
      value: irmDetail?.CustomerType || customer?.customerType || "—",
      icon: personIcon,
    },
    // {
    //   label: "Lead Source",
    //   value: irmDetail?.LeadSource || "—",
    //   icon: arrowIcon,
    // },
    // {
    //   label: "Loyalty Program Status",
    //   value: "—",
    //   icon: tagIcon,
    // },
  ];

  const marketingConsent = {
    email: irmDetail ? irmDetail.ReceiveEmail === "1" : true,
    sms: irmDetail ? irmDetail.ReceiveSMS === "1" : true,
    marketing: irmDetail ? irmDetail.ReceiveMarketingAll === "1" : true,
  };

  // ─── Identity fields for OverviewTab ─────────────────────────────────────
  const overviewCustomerId =
    irmDetail?.CustSequenceID ??
    customer?.custSequenceId ??
    customer?.crmReferenceNo ??
    "—";

  const overviewAccountNumber =
    (irmAr?.ArAccountNumber as string | undefined) ??
    irmDetail?.CRMReferenceNo ??
    customer?.crmReferenceNo ??
    "—";

  const overviewPrimaryContact =
    [irmDetail?.FirstName, irmDetail?.LastName].filter(Boolean).join(" ") ||
    [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") ||
    "—";

  const workPhone = irmDetail
    ? `${irmDetail.WorkTelCode ?? ""} ${irmDetail.WorkTelNumber ?? ""}`.trim() ||
      "—"
    : "—";

  /**
   * The customer's own name. IRM takes priority, local is the fallback.
   *
   * DRIVEN BY CustomerType, NOT BY WHICH FIELD HAPPENS TO BE POPULATED.
   * A company record in Evolve can also carry a contact person's FirstName
   * (e.g. 20EC0001242: CustomerType=C, CompanyName="SHAMFAM LOGISTICS C.C.",
   * FirstName="Samantha"). Preferring the person name whenever it was present
   * showed "Samantha" as the customer instead of the company. The person is
   * still shown, as the Primary Contact — a separate field.
   *
   * 'C' is the company discriminator on both sides (Evolve CustomerType and
   * our customers.customer_type). Anything else is treated as a person, with
   * the opposite field as a fallback so a mistyped record still renders a
   * name rather than an em dash.
   */
  const isCompanyRecord =
    (irmDetail?.CustomerType ?? customer?.customerType ?? "") === "C";

  const personName = irmDetail
    ? [irmDetail.FirstName, irmDetail.LastName].filter(Boolean).join(" ")
    : [customer?.firstName, customer?.lastName].filter(Boolean).join(" ");
  const companyName = irmDetail
    ? irmDetail.CompanyName || irmDetail.TradingAs || ""
    : customer?.companyName || "";

  const displayName = !irmDetail && !customer
    ? "-"
    : isCompanyRecord
      ? companyName || personName || "—"
      : personName || companyName || "—";

  const displayEmail =
    irmDetail?.PrimaryEmail ??
    irmDetail?.Email ??
    customer?.primaryEmail ??
    "—";

  /**
   * Fleet number for the header badge. Evolve is authoritative; the local
   * mirror is the fallback for when the IRM lookup fails.
   *
   * Trimmed and falsy-checked because Evolve returns the element as
   * whitespace rather than omitting it when the customer has no fleet number
   * (`<FleetNo>\n  </FleetNo>`) — an untrimmed value would render an empty
   * badge reading "Fleet No:".
   */
  const displayFleetNo =
    (irmDetail?.FleetNo ?? customer?.fleetNo ?? "").trim() || null;

  const mobileContact = customer?.contacts?.find(
    (c) => c.contactType === "MOBILE",
  );
  const displayPhone = mobileContact
    ? `${mobileContact.countryCode ?? ""} ${mobileContact.contactNumber ?? ""}`.trim()
    : (irmDetail?.CellphoneNumber ?? "—");

  const displayId = customer
    ? `ID: ${customer.crmReferenceNo || customer.custSequenceId}`
    : "ID: CUST-2024-1847";

  // const sourceLabel =
  //   dataSource === "irm"
  //     ? " · IRM synced"
  //     : dataSource === "local"
  //       ? " · Local"
  //       : "";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb / Back */}
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-[11px] sm:text-[12px] text-[#676879] hover:text-[#333]"
        >
          Back to List
        </button>
      </div>

      {/* <h2 className="text-[13px] sm:text-[14px] md:text-[16px] mb-2 font-semibold text-[#333] truncate">
        {displayName}
      </h2>
      <div className="flex flex-wrap items-center gap-x-1.5 sm:gap-x-2 md:gap-x-4 text-[10px] sm:text-[11px] md:text-[12px] text-[#999]">
        <p className="truncate">{displayId}</p>
        <span className="hidden sm:inline">•</span>
        <p className="truncate">{overviewAccountNumber !== "—" ? `Account ${overviewAccountNumber}` : "Account —"}</p>
      </div> */}
      {/* Profile Header */}
      <div className="mb-6">
        <CustomerProfile
          companyName={displayName}
          customerId={displayId}
          accountNumber={overviewAccountNumber !== "—" ? `Account ${overviewAccountNumber}` : "Account —"}
          address1={displayEmail}
          phone1={displayPhone}
          fleetNo={displayFleetNo}
          onEditClick={() => setIsEditProfileOpen(true)}
        />
      </div>

      {/* Tabs - Filter Style */}
      <div className="flex gap-1.5 sm:gap-2 bg-[#EDEDED] p-1 rounded-[10px] border border-[#DBDBDB] overflow-x-auto md:w-fit">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            variant="secondary"
            className={`rounded-lg px-2.5 sm:px-3 md:px-4 h-8 sm:h-9 md:h-10! py-1.5 sm:py-2 text-xs sm:text-sm transition-colors focus:outline-none whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-white border border-[#e5e7eb] shadow-sm text-gray-700! hover:bg-white"
                : "bg-[#EDEDED]! text-gray-700! hover:bg-[#EDEDED]!"
            }`}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <OverviewTab
          addressFields={addressFields}
          relationshipFields={relationshipFields}
          marketingConsent={marketingConsent}
          onAddNotes={() => setIsAddNotesOpen(true)}
          internalNotes={internalNotes}
          customerId={overviewCustomerId}
          accountNumber={overviewAccountNumber}
          fullName={displayName}
          primaryContact={overviewPrimaryContact}
          email={displayEmail}
          phone={displayPhone}
          alternatePhone={workPhone}
          preferredLanguage={irmDetail?.Language ?? "—"}
        />
      )}

      {activeTab === "service" && <ServiceTab />}

      {activeTab === "assets" && (
        <AssetsTab
          vehicles={customerVehicles}
          onEditVehicle={(v) => setEditingVehicle(v)}
          // Paging is owned by the parent, which does the fetching.
          page={vehiclePage}
          pageSize={vehiclePageSize}
          total={vehicleTotal}
          totalPages={vehicleTotalPages}
          onPageChange={setVehiclePage}
          onPageSizeChange={(l) => {
            setVehiclePageSize(l);
            setVehiclePage(1); // a new size invalidates the current offset
          }}
        />
      )}

      {activeTab === "financial" && <FinancialTab />}

      {activeTab === "integration" && <IntegrationTab />}

      {/* Modals */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        customer={customer}
        onSaved={refetchCustomer}
      />

      <EditAddressesModal
        isOpen={isEditAddressesOpen}
        onClose={() => setIsEditAddressesOpen(false)}
        addressForm={addressForm}
        setAddressForm={setAddressForm}
      />

      <AddNotesModal
        isOpen={isAddNotesOpen}
        onClose={() => setIsAddNotesOpen(false)}
        notesForm={notesForm}
        setNotesForm={setNotesForm}
        onSave={handleSaveNotes}
        isSaving={isSavingNotes}
      />

      <EditVehicleModal
        isOpen={editingVehicle !== null}
        onClose={() => setEditingVehicle(null)}
        vehicle={editingVehicle}
        onSaved={refetchVehicles}
      />
    </div>
  );
}

export default CustomerProfileDashboard;
