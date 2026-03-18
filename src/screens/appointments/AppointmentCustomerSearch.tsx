import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home,
  ChevronRight,
  Search,
  User,
  Car,
  Wrench,
  CalendarDays,
  CheckSquare,
  Check,
  Phone,
  Mail,
  MapPin,
  Info,
  Loader2,
} from "lucide-react";
import Button from "../../components/common/Button";
import { ROUTES } from "../../constants/routes";
import { irmCustomerSearch, searchInternalCustomers, type IrmCustomerResult, type InternalCustomer } from "../../api/appointment.api";
import { useAppointmentWizard } from "../../context/AppointmentWizardContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Customer",  icon: User },
  { label: "Vehicle",   icon: Car },
  { label: "Service",   icon: Wrench },
  { label: "Slot",      icon: CalendarDays },
  { label: "Review",    icon: CheckSquare },
];

// ─── Component ────────────────────────────────────────────────────────────────

const AppointmentCustomerSearch: React.FC = () => {
  const navigate            = useNavigate();
  const { state, setState } = useAppointmentWizard();

  const [phoneSearch, setPhoneSearch] = useState("");
  const [regSearch,   setRegSearch]   = useState("");
  const [showResults,   setShowResults]   = useState(false);
  const [results,       setResults]       = useState<IrmCustomerResult[]>([]);
  const [isSearching,   setIsSearching]   = useState(false);
  const [searchError,   setSearchError]   = useState<string | null>(null);
  const [searchStep,    setSearchStep]    = useState<"crm" | "internal" | null>(null);

  // Selected IRM result (tracked locally; written to context on Next)
  const [selected, setSelected] = useState<IrmCustomerResult | null>(
    state.customerId || state.isNewCustomer
      ? ({
          localCustomerId: state.customerId,
          crmReferenceNo:  state.newCustomerData?.crmReferenceNo ?? '',
          custSequenceId:  state.newCustomerData?.custSequenceId ?? '',
          firstName:       state.customerName.split(" ")[0] ?? '',
          lastName:        state.customerName.split(" ").slice(1).join(" ") ?? '',
          phone:           state.customerPhone,
          email:           state.customerEmail,
          vehicle:         null,
        } as IrmCustomerResult)
      : null,
  );

  const [activeTab, setActiveTab] = useState<"search" | "new">(
    state.isNewCustomer ? "new" : "search",
  );

  // New-customer form — pre-fill from context if already filled
  const nc = state.newCustomerData;
  const [newFirstName, setNewFirstName] = useState(nc?.firstName     ?? "");
  const [newLastName,  setNewLastName]  = useState(nc?.lastName      ?? "");
  const [newPhone,     setNewPhone]     = useState(nc?.contactNumber ?? "");
  const [newEmail,     setNewEmail]     = useState(nc?.primaryEmail  ?? "");
  const [newAddress,   setNewAddress]   = useState(nc?.address       ?? "");

  const isNewFormValid = newFirstName.trim() && newLastName.trim() && newPhone.trim();
  const canProceed     = selected || (activeTab === "new" && isNewFormValid);
  const currentStep    = 0;

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleSearch = async () => {
    const phone = phoneSearch.trim();
    const vin   = regSearch.trim();
    if (!phone && !vin) return;

    setIsSearching(true);
    setSearchError(null);
    setShowResults(false);
    setSearchStep("crm");

    try {
      // Step 1: Search CRM (IRM)
      const irmRes = await irmCustomerSearch({ phone: phone || undefined, vin: vin || undefined });
      const irmData = irmRes.data ?? [];

      if (irmData.length > 0) {
        setResults(irmData);
        setSearchStep(null);
        setShowResults(true);
        return;
      }

      // Step 2: Fall back to internal DB
      setSearchStep("internal");
      const internalData: InternalCustomer[] = await searchInternalCustomers({
        phone: phone || undefined,
        q:     !phone && vin ? vin : undefined,
      });

      if (internalData.length > 0) {
        // Map internal customers to IrmCustomerResult shape
        const mapped: IrmCustomerResult[] = internalData.map((c) => ({
          localCustomerId: c.id,
          crmReferenceNo:  c.crmReferenceNo,
          custSequenceId:  c.custSequenceId,
          firstName:       c.firstName,
          lastName:        c.lastName,
          companyName:     c.companyName ?? "",
          customerType:    c.customerType,
          idNumber:        "",
          phone:           c.contactNumber ?? "",
          email:           c.primaryEmail ?? "",
          address:         "",
          city:            "",
          postalCode:      "",
          country:         "",
          vehicle: c.vehicleRegistration ? {
            registrationNumber: c.vehicleRegistration,
            vin:                "",
            brand:              c.vehicleBrand ?? "",
            model:              c.vehicleModel ?? "",
            series:             "",
            year:               "",
            engineNumber:       "",
            colour:             "",
            fuelType:           "",
            transmissionType:   "",
            modelDescription:   "",
            registrationDate:   "",
            sellingDate:        "",
          } : null,
        }));
        setResults(mapped);
      } else {
        setResults([]);
      }
      setSearchStep(null);
      setShowResults(true);
    } catch {
      setSearchError("Search failed. Please check your connection and try again.");
      setSearchStep(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleNext = () => {
    if (activeTab === "search" && selected) {
      if (selected.localCustomerId) {
        // Customer exists in local DB — use their ID directly
        setState({
          customerId:      selected.localCustomerId,
          customerName:    `${selected.firstName} ${selected.lastName}`.trim(),
          customerPhone:   selected.phone,
          customerEmail:   selected.email,
          isNewCustomer:   false,
          newCustomerData: null,
          // Pre-fill vehicle from IRM data for the next step
          ...(selected.vehicle ? buildIrmVehicleState(selected) : {}),
        });
      } else {
        // IRM customer not yet in local DB — will be created at appointment submission
        setState({
          customerId:    null,
          customerName:  `${selected.firstName} ${selected.lastName}`.trim(),
          customerPhone: selected.phone,
          customerEmail: selected.email,
          isNewCustomer: true,
          newCustomerData: {
            firstName:     selected.firstName,
            lastName:      selected.lastName,
            contactNumber: selected.phone,
            primaryEmail:  selected.email,
            address:       "",
            crmReferenceNo: selected.crmReferenceNo,
            custSequenceId: selected.custSequenceId,
          },
          // Pre-fill vehicle from IRM data for the next step
          ...(selected.vehicle ? buildIrmVehicleState(selected) : {}),
        });
      }
    } else if (activeTab === "new" && isNewFormValid) {
      setState({
        customerId:    null,
        customerName:  `${newFirstName.trim()} ${newLastName.trim()}`,
        customerPhone: newPhone.trim(),
        customerEmail: newEmail.trim(),
        isNewCustomer: true,
        newCustomerData: {
          firstName:     newFirstName.trim(),
          lastName:      newLastName.trim(),
          contactNumber: newPhone.trim(),
          primaryEmail:  newEmail.trim(),
          address:       newAddress.trim(),
        },
      });
    }
    navigate(ROUTES.APPOINTMENT_CREATE_VEHICLE);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 w-full">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-[#999]">
        <Home size={15} />
        <span>Home</span>
        <ChevronRight size={13} />
        <span
          className="cursor-pointer hover:text-[#333] transition-colors"
          onClick={() => navigate(ROUTES.APPOINTMENT_DASHBOARD)}
        >
          Appointments
        </span>
        <ChevronRight size={13} />
        <span className="text-[#333] font-medium">Customer Search</span>
      </nav>

      {/* Stepper */}
      <div className="bg-white border border-[#e5e7eb] rounded-[10px] p-5 shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const Icon        = step.icon;
            const isActive    = index === currentStep;
            const isCompleted = index < currentStep;
            const isLast      = index === STEPS.length - 1;
            return (
              <div key={step.label} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isCompleted ? "bg-green-600 text-white" :
                    isActive    ? "bg-linear-to-b from-[#ff4f31] to-[#fe2b73] text-white" :
                                  "bg-[#f5f5f5] text-[#999]"
                  }`}>
                    {isCompleted ? <Check size={20} /> : <Icon size={20} />}
                  </div>
                  <span className={`text-xs font-medium text-center whitespace-nowrap ${isActive ? "text-[#333]" : "text-[#999]"}`}>
                    {step.label}
                  </span>
                </div>
                {!isLast && (
                  <div className={`flex-1 h-0.5 mx-2 mb-5 ${isCompleted ? "bg-green-600" : "bg-[#e5e7eb]"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Body */}
      <div className="flex gap-6 items-start">

        {/* Left panel */}
        <div className="flex-2 flex flex-col gap-5">
          <div>
            <h2 className="text-xl font-bold text-[#333]">Search or Add Customer</h2>
            <p className="text-sm text-[#999] mt-1">Find an existing customer or register a new one</p>
          </div>

          {/* Tab toggle */}
          <div className="flex border border-[#e5e7eb] rounded-lg overflow-hidden">
            <button
              onClick={() => { setActiveTab("search"); setSelected(null); }}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                activeTab === "search"
                  ? "bg-white text-[#333]"
                  : "bg-[#f9f9f9] text-[#999] hover:bg-[#f5f5f5]"
              }`}
            >
              Search Existing
            </button>
            <button
              onClick={() => { setActiveTab("new"); setSelected(null); }}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-l border-[#e5e7eb] ${
                activeTab === "new"
                  ? "bg-white text-[#333]"
                  : "bg-red-50 text-red-500 hover:bg-red-100"
              }`}
            >
              + Add New
            </button>
          </div>

          {/* ── TAB: Search ── */}
          {activeTab === "search" && (
            <div className="bg-white border border-[#e5e7eb] rounded-[10px] p-6 shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)]">
              <h3 className="text-base font-bold text-[#333] mb-1">Search Customer</h3>
              <p className="text-sm text-[#999] mb-4">Search the CRM by vehicle registration or phone number</p>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-sm font-medium text-[#333]">Vehicle Registration</label>
                  <div className="relative mt-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
                    <input
                      type="text"
                      placeholder="e.g. BL 00 MY ZN or GJ 05 0932"
                      value={regSearch}
                      onChange={(e) => setRegSearch(e.target.value)}
                      onKeyDown={handleKeyDown}
                      autoFocus
                      className="w-full pl-9 pr-3 py-2 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:border-[#ff5100] text-[#333]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <hr className="flex-1 border-[#e5e7eb]" />
                  <span className="text-xs font-medium text-[#999]">or</span>
                  <hr className="flex-1 border-[#e5e7eb]" />
                </div>

                <div>
                  <label className="text-sm font-medium text-[#333]">Phone Number</label>
                  <div className="relative mt-1">
                    <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
                    <input
                      type="text"
                      placeholder="+27 60 000 0000"
                      value={phoneSearch}
                      onChange={(e) => setPhoneSearch(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:border-[#ff5100] text-[#333]"
                    />
                  </div>
                </div>

                <Button
                  variant="gradient"
                  icon={isSearching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                  onClick={handleSearch}
                  disabled={isSearching || (!regSearch.trim() && !phoneSearch.trim())}
                >
                  {searchStep === "crm" ? "Searching CRM..." : searchStep === "internal" ? "Searching Internal DB..." : "Search Customer"}
                </Button>

                {searchError && (
                  <p className="text-sm text-red-500">{searchError}</p>
                )}
              </div>

              {showResults && (
                <div className="mt-6 flex flex-col gap-3">
                  {results.length > 0 ? (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-[#333]">
                          {results.length} result{results.length !== 1 ? "s" : ""} found
                        </p>
                        {/* <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                          searchSource === "crm"
                            ? "border-blue-400 text-blue-600 bg-blue-50"
                            : "border-green-600 text-green-600 bg-green-50"
                        }`}>
                          {searchSource === "crm" ? "From CRM" : "From Internal DB"}
                        </span> */}
                      </div>
                      {results.map((customer, idx) => {
                        const isSelectedRow = selected?.crmReferenceNo === customer.crmReferenceNo && selected?.custSequenceId === customer.custSequenceId;
                        const initials = `${customer.firstName?.[0] ?? ""}${customer.lastName?.[0] ?? ""}`.toUpperCase();
                        return (
                          <div
                            key={`${customer.crmReferenceNo}-${idx}`}
                            className={`border rounded-lg p-4 transition-all ${
                              isSelectedRow ? "border-[#ff5100] bg-[#ff5100]/5" : "border-[#e5e7eb]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#f5f5f5] flex items-center justify-center shrink-0">
                                  <span className="text-xs font-bold text-[#999]">{initials}</span>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-bold text-[#333]">
                                      {customer.firstName} {customer.lastName}
                                    </p>
                                    {/* {isLocal ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border border-green-600 text-green-600 bg-green-50">
                                        <Database size={9} />
                                        In System
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border border-blue-400 text-blue-600 bg-blue-50">
                                        CRM Only
                                      </span>
                                    )} */}
                                  </div>
                                  {customer.phone && (
                                    <p className="text-xs text-[#999]">{customer.phone}</p>
                                  )}
                                  {customer.email && (
                                    <p className="text-xs text-[#999]">{customer.email}</p>
                                  )}
                                  {customer.vehicle?.registrationNumber && (
                                    <p className="text-xs text-[#999]">
                                      {customer.vehicle.registrationNumber}
                                      {customer.vehicle.brand ? ` — ${customer.vehicle.brand} ${customer.vehicle.model} ${customer.vehicle.year}`.trim() : ""}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {isSelectedRow ? (
                                <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg shrink-0">
                                  <Check size={12} />
                                  Selected
                                </button>
                              ) : (
                                <button
                                  onClick={() => setSelected(customer)}
                                  className="px-3 py-1.5 text-xs font-medium text-[#ff5100] border border-[#ff5100] rounded-lg hover:bg-[#ff5100]/5 shrink-0 transition-colors"
                                >
                                  Select
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-6 text-center">
                      <p className="text-sm font-medium text-[#333]">No customer found</p>
                      <p className="text-xs text-[#999]">
                        Searched CRM and internal database — no match for your query.
                      </p>
                      <button
                        onClick={() => { setActiveTab("new"); setSelected(null); }}
                        className="mt-1 px-4 py-2 text-sm font-medium text-white bg-linear-to-b from-[#ff4f31] to-[#fe2b73] rounded-lg hover:opacity-90 transition-opacity"
                      >
                        + Create New Customer
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Add New ── */}
          {activeTab === "new" && (
            <div className="bg-white border border-[#e5e7eb] rounded-[10px] p-6 shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)]">
              <h3 className="text-base font-bold text-[#333] mb-1">Register New Customer</h3>
              <p className="text-sm text-[#999] mb-4">Customer not found in CRM? Add their details manually</p>

              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-[#333]">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="First name"
                      value={newFirstName}
                      onChange={(e) => setNewFirstName(e.target.value)}
                      className="w-full px-3 py-2 mt-1 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:border-[#ff5100] text-[#333]"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#333]">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Last name"
                      value={newLastName}
                      onChange={(e) => setNewLastName(e.target.value)}
                      className="w-full px-3 py-2 mt-1 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:border-[#ff5100] text-[#333]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-[#333]">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative mt-1">
                    <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
                    <input
                      type="text"
                      placeholder="+27 60 000 0000"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:border-[#ff5100] text-[#333]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-[#333]">Email Address</label>
                  <div className="relative mt-1">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
                    <input
                      type="text"
                      placeholder="customer@email.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:border-[#ff5100] text-[#333]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-[#333]">Address</label>
                  <div className="relative mt-1">
                    <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
                    <input
                      type="text"
                      placeholder="Villa/Apt, Street, Area, City"
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:border-[#ff5100] text-[#333]"
                    />
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-lg bg-[#ff5100]/5 border border-[#ff5100]/20">
                  <Info size={15} className="text-[#ff5100] mt-0.5 shrink-0" />
                  <p className="text-xs text-[#999]">
                    A customer profile will be created when the appointment is confirmed
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right panel — Booking Summary */}
        <div className="w-72 shrink-0">
          <div className="bg-white border border-[#e5e7eb] rounded-[10px] p-6 shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)] sticky top-6">
            <h3 className="text-base font-bold text-[#333] mb-4">Booking Summary</h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#999]">Customer</span>
                <span className={`text-sm font-medium ${selected ? "text-[#333]" : "text-[#999]"}`}>
                  {selected
                    ? `${selected.firstName} ${selected.lastName}`.trim()
                    : (activeTab === "new" && newFirstName
                        ? `${newFirstName} ${newLastName}`.trim()
                        : "Not selected yet")}
                </span>
              </div>
              <hr className="border-[#f0f0f0]" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#999]">Phone</span>
                <span className={`text-sm ${selected ? "text-[#333]" : "text-[#999]"}`}>
                  {selected?.phone ?? (activeTab === "new" && newPhone ? newPhone : "—")}
                </span>
              </div>
              <hr className="border-[#f0f0f0]" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#999]">Vehicle</span>
                <span className="text-sm text-[#999]">
                  {selected?.vehicle?.registrationNumber ?? "—"}
                </span>
              </div>
              <hr className="border-[#f0f0f0]" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#999]">Service</span>
                <span className="text-sm text-[#999]">—</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bottom-0 -mx-4 sm:-mx-6 lg:-mx-8 -mb-4 sm:-mb-6 lg:-mb-8 mt-2 bg-white border-t border-[#e5e7eb] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-32 h-2 bg-[#f0f0f0] rounded-full overflow-hidden">
            <div className="h-full bg-green-600 rounded-full" style={{ width: "20%" }} />
          </div>
          <span className="text-xs text-[#999] whitespace-nowrap">Step 1 of 5 — Customer Search</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate(ROUTES.APPOINTMENT_DASHBOARD)}>
            Cancel
          </Button>
          <Button
            variant="gradient"
            disabled={!canProceed}
            onClick={handleNext}
          >
            Next
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

    </div>
  );
};

// ─── Helper: build wizard vehicle state from IRM vehicle data ─────────────────
function buildIrmVehicleState(customer: IrmCustomerResult) {
  const v = customer.vehicle;
  if (!v) return {};
  return {
    isNewVehicle: true,
    newVehicleData: {
      brand:              v.brand,
      model:              v.model,
      manufacturingYear:  v.year ? Number(v.year) : 0,
      registrationNumber: v.registrationNumber,
      vin:                v.vin,
      fuelType:           v.fuelType,
      transmissionType:   v.transmissionType,
      odometerLast:       0,
      engineNumber:       v.engineNumber      || undefined,
      seriesDescription:  v.series            || undefined,
      modelDescription:   v.modelDescription  || undefined,
      extColour:          v.colour            || undefined,
      registrationDate:   v.registrationDate  || undefined,
      sellingDate:        v.sellingDate       || undefined,
    },
    vehicleName: `${v.brand} ${v.model} ${v.year}`.trim(),
    vehicleReg:  v.registrationNumber,
    vehicleMakeModel: `${v.brand} ${v.model}`.trim(),
    vehicleYear: v.year,
    vehicleFuel: v.fuelType,
    vehicleTransmission: v.transmissionType,
    vehicleOdometer: '0',
  };
}

export default AppointmentCustomerSearch;
