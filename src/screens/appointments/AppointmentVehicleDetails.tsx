import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home,
  ChevronRight,
  User,
  Car,
  Wrench,
  CalendarDays,
  CheckSquare,
  Check,
  Plus,
  Loader2,
} from "lucide-react";
import Button from "../../components/common/Button";
import { ROUTES } from "../../constants/routes";
import { getVehiclesByCustomer, type VehicleListItem } from "../../api/appointment.api";
import { listMakes, listModelsByMake, type VehicleMake, type VehicleModel } from "../../api/vehicle.api";
import { useAppointmentWizard } from "../../context/AppointmentWizardContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Customer", icon: User },
  { label: "Vehicle",  icon: Car },
  { label: "Service",  icon: Wrench },
  { label: "Slot",     icon: CalendarDays },
  { label: "Review",   icon: CheckSquare },
];

const YEARS = Array.from({ length: 25 }, (_, i) => String(2024 - i));

// ─── Component ────────────────────────────────────────────────────────────────

const AppointmentVehicleDetails: React.FC = () => {
  const navigate            = useNavigate();
  const { state, setState } = useAppointmentWizard();
  const currentStep         = 1;

  // Saved vehicles from API
  const [vehicles,  setVehicles]  = useState<VehicleListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Makes / Models from API
  const [makes,         setMakes]         = useState<VehicleMake[]>([]);
  const [models,        setModels]        = useState<VehicleModel[]>([]);
  const [loadingMakes,  setLoadingMakes]  = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);

  // Searchable combobox state
  const [makeSearch,  setMakeSearch]  = useState("");
  const [makeOpen,    setMakeOpen]    = useState(false);
  const [modelSearch, setModelSearch] = useState("");
  const [modelOpen,   setModelOpen]   = useState(false);
  const makeRef  = useRef<HTMLDivElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);

  // Selected existing vehicle. "__irm__" is a sentinel for the IRM pre-filled vehicle.
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    state.vehicleId && !state.isNewVehicle
      ? state.vehicleId
      : state.isNewVehicle && state.newVehicleData
      ? "__irm__"
      : null,
  );


  // Always start by showing saved vehicles
  const [showNewForm, setShowNewForm] = useState(false);

  // New vehicle form — always start blank
  const [regNumber,    setRegNumber]    = useState("");
  const [vin,          setVin]          = useState("");
  const [makeId,       setMakeId]       = useState("");
  const [modelId,      setModelId]      = useState("");
  const [fuelType,     setFuelType]     = useState("");
  const [transmission, setTransmission] = useState("");
  const [year,         setYear]         = useState("");
  const [odometer]     = useState("");

  // ─── Click-outside to close comboboxes ──────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (makeRef.current && !makeRef.current.contains(e.target as Node)) setMakeOpen(false);
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) setModelOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ─── Fetch vehicles ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!state.customerId) return;
    setIsLoading(true);
    getVehiclesByCustomer(state.customerId)
      .then((res) => setVehicles(res.data ?? []))
      .catch(() => setLoadError("Could not load vehicles."))
      .finally(() => setIsLoading(false));
  }, [state.customerId]);

  // ─── Fetch makes on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    setLoadingMakes(true);
    listMakes()
      .then((res) => {
        const list = res.data ?? [];
        setMakes(list);
      })
      .catch(() => {/* makes optional */})
      .finally(() => setLoadingMakes(false));
  }, []);

  // ─── Fetch models when makeId changes ────────────────────────────────────────
  useEffect(() => {
    if (!makeId) { setModels([]); setModelId(""); return; }
    setLoadingModels(true);
    listModelsByMake(makeId)
      .then((res) => {
        const list = res.data ?? [];
        setModels(list);
      })
      .catch(() => setModels([]))
      .finally(() => setLoadingModels(false));
  }, [makeId]);

  const selectedVehicle   = vehicles.find((v) => v.id === selectedVehicleId);
  // Only show the IRM card if the vehicle doesn't already exist in local saved vehicles
  const irmVehicleRaw     = state.newVehicleData;
  const irmAlreadySaved   = irmVehicleRaw && vehicles.some((v) =>
    (irmVehicleRaw.vin && v.vin && v.vin === irmVehicleRaw.vin) ||
    (irmVehicleRaw.registrationNumber && v.registrationNumber && v.registrationNumber === irmVehicleRaw.registrationNumber)
  );
  const irmVehicle        = irmAlreadySaved ? null : irmVehicleRaw;

  // If the IRM vehicle was already saved locally, auto-select the local copy instead
  useEffect(() => {
    if (selectedVehicleId === "__irm__" && irmVehicleRaw && vehicles.length > 0) {
      const match = vehicles.find((v) =>
        (irmVehicleRaw.vin && v.vin && v.vin === irmVehicleRaw.vin) ||
        (irmVehicleRaw.registrationNumber && v.registrationNumber && v.registrationNumber === irmVehicleRaw.registrationNumber)
      );
      if (match) setSelectedVehicleId(match.id);
    }
  }, [vehicles, selectedVehicleId, irmVehicleRaw]);

  const selectedMakeName  = makes.find((m) => m.id === makeId)?.name  ?? "";
  const selectedModelName = models.find((m) => m.id === modelId)?.name ?? "";
  const isNewFormValid  = showNewForm && regNumber.trim() && vin.trim() && makeId && modelId && fuelType && transmission && year;
  const canProceed      = selectedVehicleId === "__irm__" || selectedVehicleId || isNewFormValid;

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleSelectVehicle = (id: string) => {
    setSelectedVehicleId(id);
    setShowNewForm(false);
  };

  const handleNext = () => {
    if (selectedVehicleId === "__irm__" && irmVehicle) {
      // IRM pre-filled vehicle — wizard state already contains newVehicleData; just ensure flags are set
      setState({
        vehicleId:           null,
        vehicleName:         `${irmVehicle.brand} ${irmVehicle.model} ${irmVehicle.manufacturingYear}`,
        vehicleReg:          irmVehicle.registrationNumber,
        vehicleMakeModel:    `${irmVehicle.brand} ${irmVehicle.model}`,
        vehicleYear:         String(irmVehicle.manufacturingYear),
        vehicleFuel:         irmVehicle.fuelType,
        vehicleTransmission: irmVehicle.transmissionType,
        vehicleOdometer:     String(irmVehicle.odometerLast ?? 0),
        isNewVehicle:        true,
        newVehicleData:      irmVehicle,
      });
    } else if (selectedVehicle && !showNewForm) {
      setState({
        vehicleId:           selectedVehicle.id,
        vehicleName:         `${selectedVehicle.brand} ${selectedVehicle.model} ${selectedVehicle.manufacturingYear}`,
        vehicleReg:          selectedVehicle.registrationNumber ?? "",
        vehicleMakeModel:    `${selectedVehicle.brand} ${selectedVehicle.model}`,
        vehicleYear:         String(selectedVehicle.manufacturingYear),
        vehicleFuel:         selectedVehicle.fuelType ?? "",
        vehicleTransmission: selectedVehicle.transmissionType ?? "",
        vehicleOdometer:     String(selectedVehicle.odometerLast ?? ""),
        isNewVehicle:        false,
        newVehicleData:      null,
      });
    } else if (isNewFormValid) {
      setState({
        vehicleId:           null,
        vehicleName:         `${selectedMakeName} ${selectedModelName} ${year}`,
        vehicleReg:          regNumber.trim(),
        vehicleMakeModel:    `${selectedMakeName} ${selectedModelName}`,
        vehicleYear:         year,
        vehicleFuel:         fuelType,
        vehicleTransmission: transmission,
        vehicleOdometer:     odometer,
        isNewVehicle:        true,
        newVehicleData: {
          brand:              selectedMakeName,
          model:              selectedModelName,
          manufacturingYear:  Number(year),
          registrationNumber: regNumber.trim(),
          vin:                vin.trim(),
          fuelType,
          transmissionType:   transmission,
          odometerLast:       odometer ? Number(odometer) : 0,
        },
      });
    }
    navigate(ROUTES.APPOINTMENT_CREATE_SERVICE);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 w-full">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-[#999]">
        <Home size={15} />
        <span>Home</span>
        <ChevronRight size={13} />
        <span className="cursor-pointer hover:text-[#333] transition-colors" onClick={() => navigate(ROUTES.APPOINTMENT_DASHBOARD)}>
          Appointments
        </span>
        <ChevronRight size={13} />
        <span className="text-[#333] font-medium">Vehicle Details</span>
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
                    isActive    ? "bg-gradient-to-b from-[#ff4f31] to-[#fe2b73] text-white" :
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

      {/* Body: left form + right summary */}
      <div className="flex gap-6 items-start">

        {/* Left panel */}
        <div className="flex-[2] flex flex-col gap-5">
          <div>
            <h2 className="text-xl font-bold text-[#333]">Vehicle Details</h2>
            <p className="text-sm text-[#999] mt-1">Select an existing vehicle or add a new one</p>
          </div>

          {/* Saved Vehicles */}
          <div className="bg-white border border-[#e5e7eb] rounded-[10px] p-6 shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)]">
            <h3 className="text-base font-bold text-[#333] mb-1">Saved Vehicles</h3>
            <p className="text-sm text-[#999] mb-4">
              Vehicles registered under {state.customerName || "this customer"}
            </p>

            {/* IRM pre-filled vehicle card */}
            {irmVehicle && (
              <div className="flex flex-col gap-3 mb-3">
                <div
                  onClick={() => { setSelectedVehicleId("__irm__"); setShowNewForm(false); }}
                  className={`border rounded-lg p-4 cursor-pointer transition-all flex items-center gap-4 ${
                    selectedVehicleId === "__irm__" ? "border-[#ff5100] bg-[#ff5100]/5" : "border-[#e5e7eb] hover:border-[#999]"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-[#f5f5f5] flex items-center justify-center shrink-0">
                    <Car size={20} className="text-[#999]" />
                  </div>
                  <div className="flex-1 flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-[#333]">
                        {irmVehicle.brand} {irmVehicle.model} {irmVehicle.manufacturingYear || ""}
                      </p>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 bg-blue-50 border border-blue-300 text-blue-600 rounded-full">
                        IRM
                      </span>
                    </div>
                    {irmVehicle.registrationNumber && (
                      <p className="text-xs text-[#999]">Reg: {irmVehicle.registrationNumber}</p>
                    )}
                    <p className="text-xs text-[#999]">
                      {irmVehicle.fuelType || "—"} · {irmVehicle.transmissionType || "—"}
                    </p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedVehicleId === "__irm__" ? "border-[#ff5100]" : "border-[#ccc]"
                  }`}>
                    {selectedVehicleId === "__irm__" && <div className="w-2.5 h-2.5 rounded-full bg-[#ff5100]" />}
                  </div>
                </div>
                {vehicles.length > 0 && (
                  <div className="flex items-center gap-3">
                    <hr className="flex-1 border-[#e5e7eb]" />
                    <span className="text-xs text-[#999]">other saved vehicles</span>
                    <hr className="flex-1 border-[#e5e7eb]" />
                  </div>
                )}
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-[#999]">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm">Loading vehicles...</span>
              </div>
            ) : loadError ? (
              <p className="text-sm text-red-500 py-4 text-center">{loadError}</p>
            ) : vehicles.length === 0 && !irmVehicle ? (
              <p className="text-sm text-[#999] py-4 text-center">No vehicles found for this customer.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {vehicles.map((vehicle) => {
                  const isSelected = selectedVehicleId === vehicle.id;
                  const makeLabel  = vehicle.brand;
                  return (
                    <div
                      key={vehicle.id}
                      onClick={() => handleSelectVehicle(vehicle.id)}
                      className={`border rounded-lg p-4 cursor-pointer transition-all flex items-center gap-4 ${
                        isSelected ? "border-[#ff5100] bg-[#ff5100]/5" : "border-[#e5e7eb] hover:border-[#999]"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-[#f5f5f5] flex items-center justify-center shrink-0">
                        <Car size={20} className="text-[#999]" />
                      </div>
                      <div className="flex-1 flex flex-col gap-0.5">
                        <p className="text-sm font-bold text-[#333]">
                          {makeLabel} {vehicle.model} {vehicle.manufacturingYear}
                        </p>
                        {vehicle.registrationNumber && (
                          <p className="text-xs text-[#999]">Reg: {vehicle.registrationNumber}</p>
                        )}
                        <p className="text-xs text-[#999]">
                          {vehicle.fuelType ?? "—"} · {vehicle.transmissionType ?? "—"}
                          {vehicle.odometerLast ? ` · ${vehicle.odometerLast.toLocaleString()} KM` : ""}
                        </p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? "border-[#ff5100]" : "border-[#ccc]"
                      }`}>
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#ff5100]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add New Vehicle toggle / form */}
          {!showNewForm ? (
            <button
              onClick={() => { setShowNewForm(true); setSelectedVehicleId(null); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-[#333] border border-[#e5e7eb] rounded-lg hover:bg-[#f5f5f5] transition-colors"
            >
              <Plus size={16} />
              Add New Vehicle
            </button>
          ) : (
            <div className="bg-white border border-[#e5e7eb] rounded-[10px] p-6 shadow-[2px_3px_20px_0px_rgba(0,0,0,0.04)]">
              <h3 className="text-base font-bold text-[#333] mb-1">Add New Vehicle</h3>
              <p className="text-sm text-[#999] mb-4">Enter vehicle details to register a new vehicle</p>

              <div className="flex flex-col gap-4">
                {/* Registration */}
                <div>
                  <label className="text-sm font-medium text-[#333]">
                    Registration Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. BL 00 MY ZN"
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value)}
                    className="w-full px-3 py-2 mt-1 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:border-[#ff5100] text-[#333]"
                  />
                </div>

                {/* VIN */}
                <div>
                  <label className="text-sm font-medium text-[#333]">
                    VIN (Chassis Number) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="17-character VIN"
                    value={vin}
                    onChange={(e) => setVin(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 mt-1 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:border-[#ff5100] text-[#333] uppercase"
                  />
                </div>

                {/* Make + Model */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Make combobox */}
                  <div>
                    <label className="text-sm font-medium text-[#333]">Make <span className="text-red-500">*</span></label>
                    <div ref={makeRef} className="relative mt-1">
                      <input
                        type="text"
                        placeholder={loadingMakes ? "Loading..." : "Search make..."}
                        value={makeOpen ? makeSearch : (selectedMakeName || makeSearch)}
                        onFocus={() => { setMakeOpen(true); setMakeSearch(""); }}
                        onChange={(e) => { setMakeSearch(e.target.value); setMakeOpen(true); }}
                        className="w-full px-3 py-2 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:border-[#ff5100] text-[#333] bg-white"
                      />
                      {makeOpen && (
                        <div className="absolute z-20 mt-1 w-full bg-white border border-[#e5e7eb] rounded-lg shadow-lg max-h-52 overflow-y-auto">
                          {makes
                            .filter((m) => m.name.toLowerCase().includes(makeSearch.toLowerCase()))
                            .map((m) => (
                              <div
                                key={m.id}
                                onMouseDown={() => {
                                  setMakeId(m.id);
                                  setMakeSearch("");
                                  setMakeOpen(false);
                                  setModelId("");
                                  setModelSearch("");
                                }}
                                className={`px-3 py-2 text-sm cursor-pointer hover:bg-[#f5f5f5] ${m.id === makeId ? "text-[#ff5100] font-medium" : "text-[#333]"}`}
                              >
                                {m.name}
                              </div>
                            ))}
                          {makes.filter((m) => m.name.toLowerCase().includes(makeSearch.toLowerCase())).length === 0 && (
                            <div className="px-3 py-2 text-sm text-[#999]">No results</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Model combobox */}
                  <div>
                    <label className="text-sm font-medium text-[#333]">Model <span className="text-red-500">*</span></label>
                    <div ref={modelRef} className="relative mt-1">
                      <input
                        type="text"
                        placeholder={loadingModels ? "Loading..." : makeId ? "Search model..." : "Select make first"}
                        disabled={!makeId}
                        value={modelOpen ? modelSearch : (selectedModelName || modelSearch)}
                        onFocus={() => { setModelOpen(true); setModelSearch(""); }}
                        onClick={() => { if (makeId) { setModelOpen(true); setModelSearch(""); } }}
                        onChange={(e) => { setModelSearch(e.target.value); setModelOpen(true); }}
                        className="w-full px-3 py-2 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:border-[#ff5100] text-[#333] bg-white disabled:opacity-50"
                      />
                      {modelOpen && makeId && (
                        <div className="absolute z-20 mt-1 w-full bg-white border border-[#e5e7eb] rounded-lg shadow-lg max-h-52 overflow-y-auto">
                          {loadingModels ? (
                            <div className="px-3 py-2 text-sm text-[#999] flex items-center gap-2">
                              <Loader2 size={13} className="animate-spin" /> Loading models...
                            </div>
                          ) : (
                            <>
                              {models
                                .filter((m) => m.name.toLowerCase().includes(modelSearch.toLowerCase()))
                                .map((m) => (
                                  <div
                                    key={m.id}
                                    onMouseDown={() => {
                                      setModelId(m.id);
                                      setModelSearch("");
                                      setModelOpen(false);
                                    }}
                                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-[#f5f5f5] ${m.id === modelId ? "text-[#ff5100] font-medium" : "text-[#333]"}`}
                                  >
                                    {m.name}
                                  </div>
                                ))}
                              {models.filter((m) => m.name.toLowerCase().includes(modelSearch.toLowerCase())).length === 0 && (
                                <div className="px-3 py-2 text-sm text-[#999]">No results</div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Fuel + Year */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-[#333]">Fuel Type <span className="text-red-500">*</span></label>
                    <select
                      value={fuelType}
                      onChange={(e) => setFuelType(e.target.value)}
                      className="w-full px-3 py-2 mt-1 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:border-[#ff5100] text-[#333] bg-white"
                    >
                      <option value="">Select fuel</option>
                      <option value="petrol">Petrol</option>
                      <option value="diesel">Diesel</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="electric">Electric</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#333]">Year <span className="text-red-500">*</span></label>
                    <select
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="w-full px-3 py-2 mt-1 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:border-[#ff5100] text-[#333] bg-white"
                    >
                      <option value="">Select year</option>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>

                {/* Transmission */}
                <div>
                  <label className="text-sm font-medium text-[#333]">Transmission <span className="text-red-500">*</span></label>
                  <div className="flex gap-2 mt-1">
                    {["automatic", "manual"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTransmission(t)}
                        className={`flex-1 h-10 rounded-lg text-sm font-medium border transition-colors ${
                          transmission === t
                            ? "bg-[#ff5100] text-white border-[#ff5100]"
                            : "bg-white text-[#999] border-[#e5e7eb] hover:bg-[#f5f5f5]"
                        }`}
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              <button
                onClick={() => { setShowNewForm(false); setSelectedVehicleId(null); }}
                className="mt-4 text-xs text-[#999] hover:text-[#333] underline"
              >
                Cancel — select existing instead
              </button>
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
                <span className="text-sm font-medium text-[#333]">{state.customerName || "—"}</span>
              </div>
              <hr className="border-[#f0f0f0]" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#999]">Phone</span>
                <span className="text-sm text-[#333]">{state.customerPhone || "—"}</span>
              </div>
              <hr className="border-[#f0f0f0]" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#999]">Vehicle</span>
                <span className={`text-sm ${(selectedVehicle || selectedVehicleId === "__irm__") ? "font-medium text-[#333]" : "text-[#999]"}`}>
                  {selectedVehicleId === "__irm__" && irmVehicle
                    ? `${irmVehicle.brand} ${irmVehicle.model} ${irmVehicle.manufacturingYear || ""}`.trim()
                    : selectedVehicle
                    ? `${selectedVehicle.brand} ${selectedVehicle.model} ${selectedVehicle.manufacturingYear}`
                    : "Not selected yet"}
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
            <div className="h-full bg-green-600 rounded-full" style={{ width: "40%" }} />
          </div>
          <span className="text-xs text-[#999] whitespace-nowrap">Step 2 of 5 — Vehicle Details</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate(ROUTES.APPOINTMENT_CREATE_CUSTOMER)}>
            Previous
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

export default AppointmentVehicleDetails;
