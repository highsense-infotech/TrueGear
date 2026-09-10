import { useState, useEffect, useRef } from "react";
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
import Modal from "../../components/common/Modal";
import { ROUTES } from "../../constants/routes";
import { CUSTOMER_TITLES } from "../../constants/customer";
import {
  irmCustomerSearch,
  searchInternalCustomers,
  type IrmCustomerResult,
  type InternalCustomer,
} from "../../api/appointment.api";
import { useAppointmentWizard } from "../../context/AppointmentWizardContext";
import { getCompanies, type Company } from "../../api/company.api";

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Customer", icon: User },
  { label: "Vehicle", icon: Car },
  { label: "Service", icon: Wrench },
  { label: "Slot", icon: CalendarDays },
  { label: "Review", icon: CheckSquare },
];

// Company selector → the Evolve InterfaceCode used for the CRM search.
const COMPANY_OPTIONS = [
  { label: "10EC", value: "95112-AGLT-10EC" },
  { label: "20EC", value: "95112-AGLT-20EC" },
];

// Display name: company name takes priority, then first/last name.
const customerDisplayName = (c: {
  companyName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}): string =>
  c.companyName?.trim() ||
  `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();

// ─── Component ────────────────────────────────────────────────────────────────

const AppointmentCustomerSearch: React.FC = () => {
  const navigate = useNavigate();
  const { state, setState, reset } = useAppointmentWizard();

  // Restore selected customer from wizard context when navigating back
  const restoredSelected: IrmCustomerResult | null =
    state.customerId || (state.customerName && !state.isNewCustomer)
      ? ({
          localCustomerId: state.customerId,
          crmReferenceNo: state.newCustomerData?.crmReferenceNo ?? "",
          custSequenceId: state.newCustomerData?.custSequenceId ?? "",
          firstName: state.customerName.split(" ")[0] ?? "",
          lastName: state.customerName.split(" ").slice(1).join(" ") ?? "",
          companyName: "",
          customerType: "",
          idNumber: "",
          phone: state.customerPhone,
          email: state.customerEmail,
          address: "",
          city: "",
          postalCode: "",
          country: "",
          vehicle: state.vehicleReg
            ? {
                registrationNumber: state.vehicleReg,
                vin: "",
                brand: state.vehicleMakeModel.split(" ")[0] ?? "",
                model:
                  state.vehicleMakeModel.split(" ").slice(1).join(" ") ?? "",
                series: "",
                year: state.vehicleYear,
                engineNumber: "",
                colour: "",
                fuelType: state.vehicleFuel,
                transmissionType: state.vehicleTransmission,
                modelDescription: "",
                registrationDate: "",
                sellingDate: "",
              }
            : null,
        } as IrmCustomerResult)
      : null;

  const [phoneSearch, setPhoneSearch] = useState("");
  const [regSearch, setRegSearch] = useState("");
  // Backend-driven companies (dropdown source).
  const [companies, setCompanies] = useState<Company[]>([]);
  // Explicitly track backend availability. An empty list is still a valid
  // backend response (registry reachable, just no companies) and stays in
  // backend mode; only a failed request falls back to legacy options.
  const [backendAvailable, setBackendAvailable] = useState(false);
  const usingBackend = backendAvailable;
  // Legacy fallback selection (interface code) — used ONLY when the backend
  // company list is unavailable. In backend mode the selection is WizardState.companyId.
  // Starts empty: company selection is mandatory (no silent default) — Phase D.
  const [companyCode, setCompanyCode] = useState("");
  const [switchSuggestion, setSwitchSuggestion] = useState<
    { code: string } | null
  >(null);
  // A company change awaiting confirmation (only when there's data to clear).
  const [pendingCompany, setPendingCompany] = useState<
    { mode: "backend" | "legacy"; value: string } | null
  >(null);
  // Monotonic search generation. Bumped on every new search AND on a confirmed
  // company change; a resolved request only writes state if its generation is
  // still current — neutralises stale responses overwriting cleared state.
  const searchGenRef = useRef(0);
  const [showResults, setShowResults] = useState(!!restoredSelected);
  const [results, setResults] = useState<IrmCustomerResult[]>(
    restoredSelected ? [restoredSelected] : [],
  );
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchStep, setSearchStep] = useState<"crm" | "internal" | null>(null);

  const [selected, setSelected] = useState<IrmCustomerResult | null>(
    restoredSelected,
  );

  const [activeTab, setActiveTab] = useState<"search" | "new">(
    state.isNewCustomer ? "new" : "search",
  );

  // New-customer form — pre-fill from context if already filled
  const nc = state.newCustomerData;
  // 'C' keeps the previous behaviour as the default (this form only ever created
  // companies). Drives which name field identifies the customer — see validateNewForm.
  const [newCustomerType, setNewCustomerType] = useState<"I" | "C">(nc?.customerType ?? "C");
  const [newFirstName, setNewFirstName] = useState(nc?.firstName ?? "");
  const [newLastName, setNewLastName] = useState(nc?.lastName ?? "");
  const [newCompanyName, setNewCompanyName] = useState(nc?.companyName ?? "");
  // Type-specific identifiers — only the one matching newCustomerType is shown.
  const [newTitle, setNewTitle] = useState(nc?.title ?? "");
  const [newInitial, setNewInitial] = useState(nc?.initial ?? "");
  const [newIdNumber, setNewIdNumber] = useState(nc?.idNumber ?? "");
  const [newRegNo, setNewRegNo] = useState(nc?.regNo ?? "");
  const [newPhone, setNewPhone] = useState(nc?.contactNumber ?? "");
  const [newEmail, setNewEmail] = useState(nc?.primaryEmail ?? "");
  const [newAddress, setNewAddress] = useState(nc?.address ?? "");

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateNewForm = (): boolean => {
    const errors: Record<string, string> = {};
    // A company is identified by its company name (first/last name are the
    // optional authorised person); an individual by their own name. Mirrors the
    // superRefine on the backend newCustomer schema.
    if (newCustomerType === "C") {
      if (!newCompanyName.trim()) errors.companyName = "Company name is required";
      if (!newRegNo.trim()) errors.regNo = "Company reg no is required";
    } else {
      if (!newTitle.trim()) errors.title = "Title is required";
      if (!newInitial.trim()) errors.initial = "Initial is required";
      if (!newFirstName.trim()) errors.firstName = "First name is required";
      if (!newLastName.trim()) errors.lastName = "Last name is required";
      // An ID number is a 13-digit code — check the shape, not just presence,
      // so a short or mistyped one is caught here rather than by Evolve.
      if (!newIdNumber.trim()) errors.idNumber = "ID number is required";
      else if (!/^\d{13}$/.test(newIdNumber.trim()))
        errors.idNumber = "ID number must be exactly 13 digits";
    }
    // 10 digits starting 06, 07 or 08. The trunk zero is stripped downstream
    // (toEvolvePhone → CellphoneCode "27" + national number), so entering the
    // local form here is correct — the normalisation is not our concern.
    if (!newPhone.trim()) errors.phone = "Phone number is required";
    else if (!/^0[678]\d{8}$/.test(newPhone.trim()))
      errors.phone = "Enter a 10-digit number starting 06, 07 or 08";
    if (!newEmail.trim()) errors.email = "Email address is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim()))
      errors.email = "Enter a valid email address";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isNewFormValid =
    (newCustomerType === "C"
      ? newCompanyName.trim() && newRegNo.trim()
      : newTitle.trim() && newInitial.trim() && newFirstName.trim() && newLastName.trim() && /^\d{13}$/.test(newIdNumber.trim())) &&
    /^0[678]\d{8}$/.test(newPhone.trim()) &&
    newEmail.trim();
  // Mandatory company selection (Phase D): backend mode uses WizardState.companyId,
  // legacy fallback uses the local interface-code selection. No silent default.
  const companySelected = usingBackend ? !!state.companyId : !!companyCode;
  const canProceed =
    companySelected && (selected || (activeTab === "new" && isNewFormValid));
  const currentStep = 0;

  // ── Company-change UX (D-5) ────────────────────────────────────────────────
  // Lock the company once a customer/vehicle is selected. Before that, changing
  // it clears entered data — with a confirmation dialog when there IS data.
  const companyLocked = !!selected || !!state.customerId || !!state.vehicleId;

  const hasClearableData =
    !!regSearch.trim() ||
    !!phoneSearch.trim() ||
    showResults ||
    results.length > 0 ||
    !!switchSuggestion ||
    !!newFirstName.trim() ||
    !!newLastName.trim() ||
    !!newCompanyName.trim() ||
    !!newPhone.trim() ||
    !!newEmail.trim() ||
    !!newAddress.trim();

  const applyCompanyChange = (mode: "backend" | "legacy", value: string) => {
    if (mode === "backend") setState({ companyId: value });
    else setCompanyCode(value);
  };

  const clearDependentState = () => {
    // Invalidate any in-flight search so its late response cannot overwrite the
    // state we are about to clear (request-generation guard).
    searchGenRef.current += 1;
    setRegSearch("");
    setPhoneSearch("");
    setResults([]);
    setShowResults(false);
    setSwitchSuggestion(null);
    setSearchError(null);
    setSearchStep(null);
    setIsSearching(false);
    setSelected(null);
    setNewFirstName("");
    setNewLastName("");
    setNewCompanyName("");
    setNewPhone("");
    setNewEmail("");
    setNewAddress("");
    setFormErrors({});
    setActiveTab("search");
    setState({
      customerId: null,
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      isNewCustomer: false,
      newCustomerData: null,
      vehicleId: null,
      vehicleName: "",
      vehicleReg: "",
      vehicleMakeModel: "",
      vehicleYear: "",
      vehicleFuel: "",
      vehicleTransmission: "",
      vehicleOdometer: "",
      isNewVehicle: false,
      newVehicleData: null,
    });
  };

  const requestCompanyChange = (mode: "backend" | "legacy", value: string) => {
    const current = mode === "backend" ? state.companyId ?? "" : companyCode;
    if (value === current) return; // no-op
    if (!hasClearableData) {
      applyCompanyChange(mode, value); // nothing to lose → change immediately
      return;
    }
    setPendingCompany({ mode, value }); // confirm before clearing
  };

  const confirmCompanyChange = () => {
    if (!pendingCompany) return;
    clearDependentState();
    applyCompanyChange(pendingCompany.mode, pendingCompany.value);
    setPendingCompany(null);
  };

  // ─── Handlers ───────────────────────────────────────────────────────────────

  // Load the company list from the backend once. On success → backend-driven
  // dropdown + default selection. On empty/failure → warn and keep the legacy
  // COMPANY_OPTIONS fallback (no user-facing error).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getCompanies();
        if (cancelled) return;
        setCompanies(list);
        setBackendAvailable(true);
        // No silent default (Phase D): the user must pick a company explicitly.
        // A previously-restored companyId is preserved as-is.
      } catch {
        if (cancelled) return;
        console.warn(
          "[AppointmentCustomerSearch] GET /companies unavailable — falling back to legacy company options",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
    // Load once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (override?: {
    companyId?: string;
    interfaceCode?: string;
  }) => {
    const phone = phoneSearch.trim();
    const term  = regSearch.trim();
    if (!phone && !term) return;

    // VINs are ISO 3779 — always exactly 17 alphanumeric characters. Anything
    // else (e.g. "B081400") is a registration number. Route to the correct
    // Evolve search field so the BE doesn't always look in the VIN column.
    const isVin = term.length === 17;

    // New search generation; captured for staleness checks after each await.
    const myGen = ++searchGenRef.current;
    const isStale = () => searchGenRef.current !== myGen;

    setIsSearching(true);
    setSearchError(null);
    setSwitchSuggestion(null);
    setShowResults(false);
    setSearchStep("crm");

    // Prefer companyId (backend-driven dropdown). Only when we're on the legacy
    // COMPANY_OPTIONS fallback do we send interfaceCode — preserves search during
    // rollout. `override` lets the "switch company" prompt re-run immediately.
    const companyParams = usingBackend
      ? { companyId: override?.companyId ?? state.companyId }
      : { interfaceCode: override?.interfaceCode ?? companyCode };

    try {
      // Step 1: Search CRM (IRM)
      const irmRes = await irmCustomerSearch({
        phone: phone || undefined,
        vin:   term && isVin  ? term : undefined,
        reg:   term && !isVin ? term : undefined,
        ...companyParams,
      });
      if (isStale()) return; // superseded by a newer search / company change
      const irmData = irmRes.data ?? [];
      const outcome = irmRes.meta?.outcome; // undefined = legacy BE without Phase 1 meta

      if (irmData.length > 0) {
        setResults(irmData);
        setSearchStep(null);
        setShowResults(true);
        return;
      }

      // Route by SEARCH INTENT. A VIN/registration term identifies a VEHICLE,
      // whose company ownership is authoritative in Evolve. A phone identifies a
      // PERSON (identity), which may legitimately span companies.
      const isVehicleSearch = !!term;
      const companyLabel = usingBackend
        ? companies.find((c) => c.id === state.companyId)?.code ?? "the selected company"
        : COMPANY_OPTIONS.find((o) => o.value === companyCode)?.label ?? companyCode;

      // Cross-company detection: the vehicle isn't in the selected company but
      // our records show it belongs to another one → offer to switch instead of
      // a dead-end "not found".
      if (
        isVehicleSearch &&
        outcome === "SWITCH_COMPANY" &&
        irmRes.meta?.ownedByCompany
      ) {
        setResults([]);
        setShowResults(false);
        setSearchStep(null);
        setSwitchSuggestion(irmRes.meta.ownedByCompany);
        return;
      }

      // Vehicle search: Evolve is the system of record for company ownership.
      // Do NOT fall back to the company-agnostic local DB — that is exactly what
      // attached vehicles under the wrong company. (Legacy BE with no `outcome`
      // still falls through to preserve prior behaviour until Phase 1 is live.)
      if (isVehicleSearch && outcome === "NOT_FOUND") {
        setResults([]);
        setSearchStep(null);
        setShowResults(false);
        setSearchError(
          `No vehicle found in ${companyLabel} for "${term}". Check that the correct company is selected.`,
        );
        return;
      }
      if (isVehicleSearch && outcome === "UNAVAILABLE") {
        setResults([]);
        setSearchStep(null);
        setShowResults(false);
        setSearchError(
          "Evolve is currently unavailable. Please try again in a moment.",
        );
        return;
      }

      // Identity (phone) search — or a legacy backend without `outcome`: fall
      // back to the internal DB as before (q does ILIKE on both VIN and reg).
      setSearchStep("internal");
      const internalData: InternalCustomer[] = await searchInternalCustomers({
        phone: phone || undefined,
        q: !phone && term ? term : undefined,
      });
      if (isStale()) return; // superseded by a newer search / company change

      if (internalData.length > 0) {
        // Map internal customers to IrmCustomerResult shape
        const mapped: IrmCustomerResult[] = internalData.map((c) => ({
          localCustomerId: c.id,
          crmReferenceNo: c.crmReferenceNo,
          custSequenceId: c.custSequenceId,
          firstName: c.firstName,
          lastName: c.lastName,
          companyName: c.companyName ?? "",
          customerType: c.customerType,
          idNumber: "",
          phone: c.contactNumber ?? "",
          email: c.primaryEmail ?? "",
          address: "",
          city: "",
          postalCode: "",
          country: "",
          vehicle: c.vehicleRegistration
            ? {
                registrationNumber: c.vehicleRegistration,
                vin: "",
                brand: c.vehicleBrand ?? "",
                model: c.vehicleModel ?? "",
                series: "",
                year: "",
                engineNumber: "",
                colour: "",
                fuelType: "",
                transmissionType: "",
                modelDescription: "",
                registrationDate: "",
                sellingDate: "",
              }
            : null,
        }));
        setResults(mapped);
      } else {
        setResults([]);
      }
      setSearchStep(null);
      setShowResults(true);
    } catch {
      if (isStale()) return; // stale failure must not surface on the new state
      setSearchError(
        "Search failed. Please check your connection and try again.",
      );
      setSearchStep(null);
    } finally {
      // Only the current generation owns the loading flag; a stale request
      // must not flip it off (a newer search may be in progress).
      if (!isStale()) setIsSearching(false);
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
          customerId: selected.localCustomerId,
          customerName: customerDisplayName(selected),
          customerPhone: selected.phone,
          customerEmail: selected.email,
          isNewCustomer: false,
          newCustomerData: null,
          // Pre-fill vehicle from IRM data for the next step
          ...(selected.vehicle ? buildIrmVehicleState(selected) : {}),
        });
      } else {
        // IRM customer not yet in local DB — will be created at appointment submission
        setState({
          customerId: null,
          customerName: customerDisplayName(selected),
          customerPhone: selected.phone,
          customerEmail: selected.email,
          isNewCustomer: true,
          newCustomerData: {
            // Trust Evolve's CustomerType when it gave us one, otherwise infer
            // from the presence of a company name — the same rule the backend
            // uses in evolveCustomerPersist.service.ts.
            customerType:
              selected.customerType === "I" || selected.customerType === "C"
                ? selected.customerType
                : selected.companyName?.trim()
                ? "C"
                : "I",
            firstName: selected.firstName,
            lastName: selected.lastName,
            companyName: selected.companyName ?? "",
            // The IRM search result carries idNumber but no reg number, so only
            // this one can be prefilled from a lookup.
            idNumber: selected.idNumber || undefined,
            contactNumber: selected.phone,
            primaryEmail: selected.email,
            address: "",
            crmReferenceNo: selected.crmReferenceNo,
            custSequenceId: selected.custSequenceId,
          },
          // Pre-fill vehicle from IRM data for the next step
          ...(selected.vehicle ? buildIrmVehicleState(selected) : {}),
        });
      }
    } else if (activeTab === "new") {
      if (!validateNewForm()) return;
      const isCompany = newCustomerType === "C";
      setState({
        customerId: null,
        // A company is named by its company name, an individual by their own —
        // the two are mutually exclusive, so only one is ever populated.
        customerName: isCompany
          ? newCompanyName.trim()
          : `${newFirstName.trim()} ${newLastName.trim()}`.trim(),
        customerPhone: newPhone.trim(),
        customerEmail: newEmail.trim(),
        isNewCustomer: true,
        newCustomerData: {
          customerType: newCustomerType,
          // Whichever pair the chosen type does not use is sent empty, so a
          // value typed before the type was switched is never stored.
          firstName: isCompany ? "" : newFirstName.trim(),
          lastName: isCompany ? "" : newLastName.trim(),
          companyName: isCompany ? newCompanyName.trim() : undefined,
          // Same rule as the names: only the identifier for the chosen type is
          // sent, so a value typed before switching type is never stored.
          idNumber: isCompany ? undefined : newIdNumber.trim() || undefined,
          regNo: isCompany ? newRegNo.trim() || undefined : undefined,
          title: isCompany ? undefined : newTitle.trim() || undefined,
          initial: isCompany ? undefined : newInitial.trim() || undefined,
          contactNumber: newPhone.trim(),
          primaryEmail: newEmail.trim(),
          address: newAddress.trim(),
        },
      });
    } else {
      return;
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
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            const isLast = index === STEPS.length - 1;
            return (
              <div
                key={step.label}
                className="flex items-center flex-1 last:flex-none"
              >
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isCompleted
                        ? "bg-green-600 text-white"
                        : isActive
                          ? "bg-linear-to-b from-[#ff4f31] to-[#fe2b73] text-white"
                          : "bg-[#f5f5f5] text-[#999]"
                    }`}
                  >
                    {isCompleted ? <Check size={20} /> : <Icon size={20} />}
                  </div>
                  <span
                    className={`text-xs font-medium text-center whitespace-nowrap ${isActive ? "text-[#333]" : "text-[#999]"}`}
                  >
                    {step.label}
                  </span>
                </div>
                {!isLast && (
                  <div
                    className={`flex-1 h-0.5 mx-2 mb-5 ${isCompleted ? "bg-green-600" : "bg-[#e5e7eb]"}`}
                  />
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
            <h2 className="text-xl font-bold text-[#333]">
              Search or Add Customer
            </h2>
            <p className="text-sm text-[#999] mt-1">
              Find an existing customer or register a new one
            </p>
          </div>

          {/* Company selector — mandatory; governs the whole step (search + add new). */}
          <div className="mb-3">
            <label className="text-sm font-medium text-[#333]">Company</label>
            <div className="relative mt-1">
              {usingBackend ? (
                <select
                  value={state.companyId ?? ""}
                  onChange={(e) => requestCompanyChange("backend", e.target.value)}
                  disabled={companyLocked}
                  className="w-full pl-3 pr-3 py-2 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:border-[#ff5100] text-[#333] bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="" disabled>
                    Select company…
                  </option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.code}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={companyCode}
                  onChange={(e) => requestCompanyChange("legacy", e.target.value)}
                  disabled={companyLocked}
                  className="w-full pl-3 pr-3 py-2 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:border-[#ff5100] text-[#333] bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="" disabled>
                    Select company…
                  </option>
                  {COMPANY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {companyLocked ? (
              <p className="text-xs text-[#999] mt-1">
                Company is locked while a customer/vehicle is selected.
              </p>
            ) : !companySelected ? (
              <p className="text-xs text-[#999] mt-1">
                Select a company to continue.
              </p>
            ) : null}
          </div>

          {/* Confirm dialog — company change that would clear entered data. */}
          <Modal
            isOpen={!!pendingCompany}
            onClose={() => setPendingCompany(null)}
            title="Change company?"
            size="sm"
          >
            <p className="text-sm text-[#555] mb-5">
              You've changed the selected company. This will clear the current
              search and any unsaved customer/vehicle information. Continue?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPendingCompany(null)}
                className="px-4 py-2 text-sm font-medium text-[#555] border border-[#e5e7eb] rounded-lg hover:bg-[#f5f5f5]"
              >
                Cancel
              </button>
              <Button variant="gradient" onClick={confirmCompanyChange}>
                Continue
              </Button>
            </div>
          </Modal>

          {/* Tab toggle */}
          <div className="flex border border-[#e5e7eb] rounded-lg overflow-hidden">
            <button
              onClick={() => {
                setActiveTab("search");
                setSelected(null);
              }}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                activeTab === "search"
                  ? "bg-white text-[#333]"
                  : "bg-[#f9f9f9] text-[#999] hover:bg-[#f5f5f5]"
              }`}
            >
              Search Existing
            </button>
            <button
              onClick={() => {
                setActiveTab("new");
                setSelected(null);
              }}
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
              <h3 className="text-base font-bold text-[#333] mb-1">
                Search Customer
              </h3>
              <p className="text-sm text-[#999] mb-4">
                Search the CRM by VIN, registration number, or phone number
              </p>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-sm font-medium text-[#333]">
                    VIN or Vehicle Registration
                  </label>
                  <div className="relative mt-1">
                    <Search
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]"
                    />
                    <input
                      type="text"
                      placeholder="e.g. AAK1518FLSB081400 or B081400"
                      value={regSearch}
                      onChange={(e) => {
                        setRegSearch(e.target.value);
                        setPhoneSearch("");
                      }}
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
                  <label className="text-sm font-medium text-[#333]">
                    Phone Number
                  </label>
                  <div className="relative mt-1">
                    <Phone
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]"
                    />
                    <input
                      type="text"
                      placeholder="+27 60 000 0000"
                      value={phoneSearch}
                      onChange={(e) => {
                        setPhoneSearch(e.target.value);
                        setRegSearch("");
                      }}
                      onKeyDown={handleKeyDown}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:border-[#ff5100] text-[#333]"
                    />
                  </div>
                </div>

                <Button
                  variant="gradient"
                  icon={
                    isSearching ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Search size={15} />
                    )
                  }
                  onClick={() => handleSearch()}
                  disabled={
                    isSearching ||
                    !companySelected ||
                    (!regSearch.trim() && !phoneSearch.trim())
                  }
                >
                  {searchStep === "crm"
                    ? "Searching CRM..."
                    : searchStep === "internal"
                      ? "Searching Internal DB..."
                      : "Search Customer"}
                </Button>

                {searchError && (
                  <p className="text-sm text-red-500">{searchError}</p>
                )}

                {switchSuggestion && (
                  <div className="flex flex-col gap-2 rounded-lg border border-[#fde68a] bg-[#fffbeb] p-3">
                    <p className="text-sm text-[#92400e]">
                      This vehicle belongs to company{" "}
                      <strong>{switchSuggestion.code}</strong>, not the selected
                      company. Switch to search under the correct company.
                    </p>
                    <div>
                      <Button
                        variant="gradient"
                        onClick={() => {
                          setSwitchSuggestion(null);
                          if (usingBackend) {
                            const owner = companies.find(
                              (c) => c.code === switchSuggestion.code,
                            );
                            if (owner) {
                              setState({ companyId: owner.id });
                              handleSearch({ companyId: owner.id });
                            }
                          } else {
                            // Legacy fallback: the backend no longer sends the
                            // InterfaceCode, so derive it locally from the owner's
                            // company code via COMPANY_OPTIONS (label = code).
                            const legacy = COMPANY_OPTIONS.find(
                              (o) => o.label === switchSuggestion.code,
                            );
                            if (legacy) {
                              setCompanyCode(legacy.value);
                              handleSearch({ interfaceCode: legacy.value });
                            }
                          }
                        }}
                      >
                        Switch to {switchSuggestion.code} &amp; search
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {showResults && (
                <div className="mt-6 flex flex-col gap-3">
                  {results.length > 0 ? (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-[#333]">
                          {results.length} result
                          {results.length !== 1 ? "s" : ""} found
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
                        const isSelectedRow =
                          selected?.crmReferenceNo ===
                            customer.crmReferenceNo &&
                          selected?.custSequenceId === customer.custSequenceId;
                        const displayName = customerDisplayName(customer);
                        const initials = customer.companyName?.trim()
                          ? customer.companyName.trim().slice(0, 2).toUpperCase()
                          : `${customer.firstName?.[0] ?? ""}${customer.lastName?.[0] ?? ""}`.toUpperCase();
                        return (
                          <div
                            key={`${customer.crmReferenceNo}-${idx}`}
                            className={`border rounded-lg p-4 transition-all ${
                              isSelectedRow
                                ? "border-[#ff5100] bg-[#ff5100]/5"
                                : "border-[#e5e7eb]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#f5f5f5] flex items-center justify-center shrink-0">
                                  <span className="text-xs font-bold text-[#999]">
                                    {initials}
                                  </span>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-bold text-[#333]">
                                      {displayName}
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
                                    <p className="text-xs text-[#999]">
                                      {customer.phone}
                                    </p>
                                  )}
                                  {customer.email && (
                                    <p className="text-xs text-[#999]">
                                      {customer.email}
                                    </p>
                                  )}
                                  {customer.vehicle?.registrationNumber && (
                                    <p className="text-xs text-[#999]">
                                      {customer.vehicle.registrationNumber.toUpperCase()}
                                      {customer.vehicle.brand
                                        ? ` — ${customer.vehicle.brand} ${customer.vehicle.model} ${customer.vehicle.year}`.trim()
                                        : ""}
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
                      <p className="text-sm font-medium text-[#333]">
                        No customer found
                      </p>
                      <p className="text-xs text-[#999]">
                        Searched CRM and internal database — no match for your
                        query.
                      </p>
                      <button
                        onClick={() => {
                          setActiveTab("new");
                          setSelected(null);
                        }}
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
              <h3 className="text-base font-bold text-[#333] mb-1">
                Register New Customer
              </h3>
              <p className="text-sm text-[#999] mb-4">
                Customer not found in CRM? Add their details manually
              </p>

              <div className="flex flex-col gap-4">
                {/* Customer type — decides which name identifies the customer,
                    and is stored as customers.customer_type ('I' / 'C'). */}
                <div>
                  <span className="text-sm font-medium text-[#333]">
                    Customer Type <span className="text-red-500">*</span>
                  </span>
                  <div className="flex items-center gap-6 mt-2">
                    {([
                      { value: "I", label: "Individual" },
                      { value: "C", label: "Company" },
                    ] as const).map((opt) => (
                      <label
                        key={opt.value}
                        className="flex items-center gap-2 text-sm text-[#333] cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="customerType"
                          value={opt.value}
                          checked={newCustomerType === opt.value}
                          onChange={() => {
                            setNewCustomerType(opt.value);
                            // Clear the errors that no longer apply to the new type.
                            setFormErrors((p) => ({
                              ...p,
                              companyName: "",
                              regNo: "",
                              title: "",
                              initial: "",
                              firstName: "",
                              lastName: "",
                              idNumber: "",
                            }));
                          }}
                          className="w-4 h-4 accent-[#ff5100]"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                {newCustomerType === "C" && (
                  <div>
                    <label className="text-sm font-medium text-[#333]">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Company name"
                      value={newCompanyName}
                      onChange={(e) => {
                        setNewCompanyName(e.target.value);
                        setFormErrors((p) => ({ ...p, companyName: "" }));
                      }}
                      className={`w-full px-3 py-2 mt-1 text-sm border rounded-lg focus:outline-none focus:border-[#ff5100] text-[#333] ${formErrors.companyName ? "border-red-400" : "border-[#e5e7eb]"}`}
                    />
                    {formErrors.companyName && (
                      <p className="text-xs text-red-500 mt-1">
                        {formErrors.companyName}
                      </p>
                    )}
                  </div>
                )}

                {/* Type-specific identifier: company registration number for a
                    company, ID number for an individual. Stored in
                    customers.reg_no / customers.id_number respectively. */}
                {newCustomerType === "C" ? (
                  <div>
                    <label className="text-sm font-medium text-[#333]">
                      Company Reg No <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Company registration number"
                      value={newRegNo}
                      maxLength={20}
                      onChange={(e) => {
                        setNewRegNo(e.target.value);
                        setFormErrors((p) => ({ ...p, regNo: "" }));
                      }}
                      className={`w-full px-3 py-2 mt-1 text-sm border rounded-lg focus:outline-none focus:border-[#ff5100] text-[#333] ${formErrors.regNo ? "border-red-400" : "border-[#e5e7eb]"}`}
                    />
                    {formErrors.regNo && (
                      <p className="text-xs text-red-500 mt-1">
                        {formErrors.regNo}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="text-sm font-medium text-[#333]">
                      ID Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="13-digit ID number"
                      value={newIdNumber}
                      maxLength={13}
                      onChange={(e) => {
                        // Digits only — strips spaces and separators as typed
                        // or pasted, so the stored value is always the bare code.
                        setNewIdNumber(e.target.value.replace(/\D/g, ""));
                        setFormErrors((p) => ({ ...p, idNumber: "" }));
                      }}
                      className={`w-full px-3 py-2 mt-1 text-sm border rounded-lg focus:outline-none focus:border-[#ff5100] text-[#333] ${formErrors.idNumber ? "border-red-400" : "border-[#e5e7eb]"}`}
                    />
                    {formErrors.idNumber && (
                      <p className="text-xs text-red-500 mt-1">
                        {formErrors.idNumber}
                      </p>
                    )}
                  </div>
                )}
                {/* Individual only — a company is identified by its company name
                    alone, so the person-name pair is not shown for one. */}
                {newCustomerType === "I" && (
                <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-[#333]">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newTitle}
                      onChange={(e) => {
                        setNewTitle(e.target.value);
                        setFormErrors((p) => ({ ...p, title: "" }));
                      }}
                      className={`w-full px-3 py-2 mt-1 text-sm border rounded-lg focus:outline-none focus:border-[#ff5100] bg-white ${formErrors.title ? "border-red-400" : "border-[#e5e7eb]"} ${newTitle ? "text-[#333]" : "text-[#999]"}`}
                    >
                      <option value="">Select title</option>
                      {CUSTOMER_TITLES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    {formErrors.title && (
                      <p className="text-xs text-red-500 mt-1">
                        {formErrors.title}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#333]">
                      Initial <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. J"
                      value={newInitial}
                      maxLength={8}
                      onChange={(e) => {
                        setNewInitial(e.target.value.toUpperCase());
                        setFormErrors((p) => ({ ...p, initial: "" }));
                      }}
                      className={`w-full px-3 py-2 mt-1 text-sm border rounded-lg focus:outline-none focus:border-[#ff5100] text-[#333] uppercase ${formErrors.initial ? "border-red-400" : "border-[#e5e7eb]"}`}
                    />
                    {formErrors.initial && (
                      <p className="text-xs text-red-500 mt-1">
                        {formErrors.initial}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-[#333]">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="First name"
                      value={newFirstName}
                      onChange={(e) => {
                        setNewFirstName(e.target.value);
                        setFormErrors((p) => ({ ...p, firstName: "" }));
                      }}
                      className={`w-full px-3 py-2 mt-1 text-sm border rounded-lg focus:outline-none focus:border-[#ff5100] text-[#333] ${formErrors.firstName ? "border-red-400" : "border-[#e5e7eb]"}`}
                    />
                    {formErrors.firstName && (
                      <p className="text-xs text-red-500 mt-1">
                        {formErrors.firstName}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#333]">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Last name"
                      value={newLastName}
                      onChange={(e) => {
                        setNewLastName(e.target.value);
                        setFormErrors((p) => ({ ...p, lastName: "" }));
                      }}
                      className={`w-full px-3 py-2 mt-1 text-sm border rounded-lg focus:outline-none focus:border-[#ff5100] text-[#333] ${formErrors.lastName ? "border-red-400" : "border-[#e5e7eb]"}`}
                    />
                    {formErrors.lastName && (
                      <p className="text-xs text-red-500 mt-1">
                        {formErrors.lastName}
                      </p>
                    )}
                  </div>
                </div>
                </>
                )}

                <div>
                  <label className="text-sm font-medium text-[#333]">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative mt-1">
                    <Phone
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0600000000"
                      value={newPhone}
                      maxLength={10}
                      onChange={(e) => {
                        // Digits only — strips spaces and separators as typed
                        // or pasted, so "082 123 4567" becomes "0821234567".
                        setNewPhone(e.target.value.replace(/\D/g, ""));
                        setFormErrors((p) => ({ ...p, phone: "" }));
                      }}
                      className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-[#ff5100] text-[#333] ${formErrors.phone ? "border-red-400" : "border-[#e5e7eb]"}`}
                    />
                  </div>
                  {formErrors.phone && (
                    <p className="text-xs text-red-500 mt-1">
                      {formErrors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-[#333]">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative mt-1">
                    <Mail
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]"
                    />
                    <input
                      type="email"
                      placeholder="customer@email.com"
                      value={newEmail}
                      onChange={(e) => {
                        setNewEmail(e.target.value);
                        setFormErrors((p) => ({ ...p, email: "" }));
                      }}
                      className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-[#ff5100] text-[#333] ${formErrors.email ? "border-red-400" : "border-[#e5e7eb]"}`}
                    />
                  </div>
                  {formErrors.email && (
                    <p className="text-xs text-red-500 mt-1">
                      {formErrors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-[#333]">
                    Address
                  </label>
                  <div className="relative mt-1">
                    <MapPin
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]"
                    />
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
                    A customer profile will be created when the appointment is
                    confirmed
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right panel — Booking Summary */}
        <div className="w-72 shrink-0">
          <div className="bg-white border border-[#e5e7eb] rounded-[10px] p-6 shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)] sticky top-6">
            <h3 className="text-base font-bold text-[#333] mb-4">
              Booking Summary
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#999]">Customer</span>
                <span
                  className={`text-sm font-medium ${selected ? "text-[#333]" : "text-[#999]"}`}
                >
                  {selected
                    ? customerDisplayName(selected)
                    : activeTab === "new" && (newCompanyName || newFirstName)
                      ? customerDisplayName({
                          companyName: newCompanyName,
                          firstName: newFirstName,
                          lastName: newLastName,
                        })
                      : "Not selected yet"}
                </span>
              </div>
              <hr className="border-[#f0f0f0]" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#999]">Phone</span>
                <span
                  className={`text-sm ${selected ? "text-[#333]" : "text-[#999]"}`}
                >
                  {selected?.phone ??
                    (activeTab === "new" && newPhone ? newPhone : "—")}
                </span>
              </div>
              <hr className="border-[#f0f0f0]" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#999]">Vehicle</span>
                <span className="text-sm text-[#999]">
                  {selected?.vehicle?.registrationNumber?.toUpperCase() ?? "—"}
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
            <div
              className="h-full bg-green-600 rounded-full"
              style={{ width: "20%" }}
            />
          </div>
          <span className="text-xs text-[#999] whitespace-nowrap">
            Step 1 of 5 — Customer Search
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => {
              reset();
              navigate(ROUTES.APPOINTMENT_DASHBOARD);
            }}
          >
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
      brand: v.brand,
      model: v.model,
      manufacturingYear: v.year ? Number(v.year) : 0,
      registrationNumber: v.registrationNumber,
      vin: v.vin,
      fuelType: v.fuelType,
      transmissionType: v.transmissionType,
      odometerLast: 0,
      engineNumber: v.engineNumber || undefined,
      seriesDescription: v.series || undefined,
      modelDescription: v.modelDescription || undefined,
      extColour: v.colour || undefined,
      registrationDate: v.registrationDate || undefined,
      sellingDate: v.sellingDate || undefined,
    },
    vehicleName: `${v.brand} ${v.model} ${v.year}`.trim(),
    vehicleReg: v.registrationNumber,
    vehicleMakeModel: `${v.brand} ${v.model}`.trim(),
    vehicleYear: v.year,
    vehicleFuel: v.fuelType,
    vehicleTransmission: v.transmissionType,
    vehicleOdometer: "0",
  };
}

export default AppointmentCustomerSearch;
