import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowRight, User, Car, Phone, Mail, Search, Plus, X, Check, Loader2 } from "lucide-react";
import { Breadcrumb } from "../../components/common/Breadcrumb";
import Button from "../../components/common/Button";
import { ROUTES } from "../../constants/routes";
import { createCustomer, searchCustomers, type CustomerSearchItem } from "../../api/customer.api";
import { addVehicle, listMakes, listModelsByMake, type VehicleMake, type VehicleModel, type VinLookupFields } from "../../api/vehicle.api";
import SearchableDropdown from "../../components/common/SearchableDropdown";

interface CustomerData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  vehicleNumber: string;
  vehicleMake: string;
  vehicleModel: string;
  vin: string;
  manufacturingYear: string;
  odometerLast: string;
  priority: string;
  serviceType: string;
}

const AddCustomer: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [vinLookupApplied, setVinLookupApplied] = useState(false);
  const [pendingModelName, setPendingModelName] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchItem | null>(null);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [searchResults, setSearchResults] = useState<CustomerSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Makes & Models state
  const [makes, setMakes] = useState<VehicleMake[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [selectedMakeId, setSelectedMakeId] = useState<string>("");
  const [loadingMakes, setLoadingMakes] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);

  const [formData, setFormData] = useState<CustomerData>({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    email: "",
    vehicleNumber: "",
    vehicleMake: "",
    vehicleModel: "",
    vin: "",
    manufacturingYear: "",
    odometerLast: "",
    priority: "STANDARD",
    serviceType: "GENERAL_SERVICE",
  });

  const [errors, setErrors] = useState<Partial<CustomerData>>({});

  // Debounced search customers API call
  const debouncedSearch = useCallback((query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await searchCustomers(query.trim());
        if (res.success) {
          setSearchResults(res.data);
        } else {
          setSearchResults([]);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Fetch makes on mount
  useEffect(() => {
    const fetchMakes = async () => {
      setLoadingMakes(true);
      try {
        const res = await listMakes();
        if (res.success) {
          setMakes(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch makes:", err);
      } finally {
        setLoadingMakes(false);
      }
    };
    fetchMakes();
  }, []);

  // Pre-fill from VIN lookup data (sessionStorage) after makes are loaded
  // data.customer fields from <CustomerDetail>: FirstName, LastName, CompanyName, PrimaryEmail,
  //   CellphoneCode, CellphoneNumber, CustSequenceID, IDNumber, etc.
  // data.vehicle fields from <Vehicles><RowDetails>: VehVinNumber, RegistrationNo, Make,
  //   ModelDescription, Series, EngineNumber, Colour, RegistrationYear, etc.
  useEffect(() => {
    if (vinLookupApplied || makes.length === 0) return;
    if (searchParams.get("vinLookup") !== "true") return;

    const raw = sessionStorage.getItem("vinLookupData");
    if (!raw) return;

    try {
      const { CustomerDetail, Vehicles } = JSON.parse(raw) as {
        CustomerDetail: VinLookupFields;
        CustomerProfile: VinLookupFields;
        Vehicles: VinLookupFields;
      };

      const updates: Partial<CustomerData> = {};

      // Customer fields (from CustomerDetail)
      if (CustomerDetail.FirstName) updates.firstName = CustomerDetail.FirstName;
      if (CustomerDetail.LastName) updates.lastName = CustomerDetail.LastName;
      if (CustomerDetail.PrimaryEmail) updates.email = CustomerDetail.PrimaryEmail;
      // Phone: Evolve sends CellphoneCode + CellphoneNumber separately
      if (CustomerDetail.CellphoneNumber) {
        const code = CustomerDetail.CellphoneCode || '';
        updates.phoneNumber = code ? `${code}${CustomerDetail.CellphoneNumber}` : CustomerDetail.CellphoneNumber;
      }

      // Vehicle fields (from Vehicles)
      if (Vehicles.VehVinNumber) updates.vin = Vehicles.VehVinNumber;
      if (Vehicles.RegistrationNo) updates.vehicleNumber = Vehicles.RegistrationNo;
      if (Vehicles.Make) updates.vehicleMake = Vehicles.Make;
      if (Vehicles.ModelDescription) updates.vehicleModel = Vehicles.ModelDescription;
      if (Vehicles.RegistrationYear) updates.manufacturingYear = Vehicles.RegistrationYear;

      // Auto-select matching make dropdown
      const makeName = Vehicles.Make;
      if (makeName) {
        const matchingMake = makes.find(
          (m) => m.name.toLowerCase() === makeName.toLowerCase()
        );
        if (matchingMake) {
          setSelectedMakeId(matchingMake.id);
        }
      }

      // Queue model auto-select after models load
      const modelName = Vehicles.ModelDescription;
      if (modelName) {
        setPendingModelName(modelName);
      }

      if (Object.keys(updates).length > 0) {
        setFormData((prev) => ({ ...prev, ...updates }));
        setShowNewCustomerForm(true);
      }

      setVinLookupApplied(true);
      sessionStorage.removeItem("vinLookupData");
    } catch (e) {
      console.error("Failed to parse VIN lookup data:", e);
    }
  }, [makes, searchParams, vinLookupApplied]);

  // Fetch models when make changes
  useEffect(() => {
    if (!selectedMakeId) {
      setModels([]);
      return;
    }
    const fetchModels = async () => {
      setLoadingModels(true);
      try {
        const res = await listModelsByMake(selectedMakeId);
        if (res.success) {
          setModels(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch models:", err);
      } finally {
        setLoadingModels(false);
      }
    };
    fetchModels();
  }, [selectedMakeId]);

  // Auto-select model from VIN lookup after models are loaded
  useEffect(() => {
    if (!pendingModelName || models.length === 0) return;
    const matchingModel = models.find(
      (m) => m.name.toLowerCase() === pendingModelName.toLowerCase()
    );
    if (matchingModel) {
      setFormData((prev) => ({ ...prev, vehicleModel: matchingModel.name }));
    }
    setPendingModelName(null);
  }, [models, pendingModelName]);

  const handleMakeChange = (makeId: string, makeName: string) => {
    setSelectedMakeId(makeId);
    setFormData((prev) => ({
      ...prev,
      vehicleMake: makeName,
      vehicleModel: "",
    }));
    setModels([]);
    if (errors.vehicleMake) setErrors((prev) => ({ ...prev, vehicleMake: "" }));
    if (errors.vehicleModel) setErrors((prev) => ({ ...prev, vehicleModel: "" }));
  };

  const handleModelChange = (_modelId: string, modelName: string) => {
    setFormData((prev) => ({ ...prev, vehicleModel: modelName }));
    if (errors.vehicleModel) setErrors((prev) => ({ ...prev, vehicleModel: "" }));
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setIsDropdownOpen(true);
    setSelectedCustomer(null);
    debouncedSearch(value);
  };

  const handleSelectCustomer = (customer: CustomerSearchItem) => {
    setSelectedCustomer(customer);
    setSearchQuery(`${customer.firstName} ${customer.lastName}`);
    setFormData(prev => ({
      ...prev,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phoneNumber: customer.contactNumber || "",
      email: customer.primaryEmail || "",
    }));
    setIsDropdownOpen(false);
    setShowNewCustomerForm(false);
  };

  const handleAddNewCustomer = () => {
    setSelectedCustomer(null);
    setSearchQuery("");
    setShowNewCustomerForm(true);
    setSelectedMakeId("");
    setModels([]);
    setFormData({
      firstName: "",
      lastName: "",
      phoneNumber: "",
      email: "",
      vehicleNumber: "",
      vehicleMake: "",
      vehicleModel: "",
      vin: "",
      manufacturingYear: "",
      odometerLast: "",
      priority: "STANDARD",
      serviceType: "GENERAL_SERVICE",
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof CustomerData]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<CustomerData> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required";
    } else if (!/^\d{10}$/.test(formData.phoneNumber.replace(/\s/g, ""))) {
      newErrors.phoneNumber = "Enter a valid 10-digit phone number";
    }
    if (!formData.vin.trim()) {
      newErrors.vin = "VIN is required";
    }
    if (!formData.vehicleNumber.trim()) {
      newErrors.vehicleNumber = "Registration number is required";
    }
    if (!formData.vehicleMake.trim()) {
      newErrors.vehicleMake = "Vehicle make is required";
    }
    if (!formData.vehicleModel.trim()) {
      newErrors.vehicleModel = "Vehicle model is required";
    }
    if (!formData.manufacturingYear.trim()) {
      newErrors.manufacturingYear = "Manufacturing year is required";
    } else if (!/^\d{4}$/.test(formData.manufacturingYear)) {
      newErrors.manufacturingYear = "Enter a valid 4-digit year";
    }
    if (!formData.odometerLast.trim()) {
      newErrors.odometerLast = "Odometer reading is required";
    } else if (isNaN(Number(formData.odometerLast))) {
      newErrors.odometerLast = "Enter a valid number";
    }
    if (!formData.serviceType.trim()) {
      newErrors.serviceType = "Service type is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      let customerId = selectedCustomer?.id;

      // If adding a new customer, create them first
      if (!customerId && showNewCustomerForm) {
        const customerRes = await createCustomer({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          contactNumber: formData.phoneNumber.trim(),
          primaryEmail: formData.email.trim() || undefined,
          crmReferenceNo: `CRM-${Date.now()}`,
          custSequenceId: `CUST-${Date.now()}`,
          customerType: "I",
          activeCustomer: true,
          leadType: "WALK_IN",
          leadSource: "DIRECT",
        });

        if (!customerRes.success) {
          const msg = customerRes.error?.message || "Failed to create customer";
          setSubmitError(msg);
          toast.error(msg);
          setIsSubmitting(false);
          return;
        }

        customerId = customerRes.data.id;
      }

      if (!customerId) {
        setSubmitError("Please search and select a customer or add a new one.");
        setIsSubmitting(false);
        return;
      }

      const res = await addVehicle({
        customerId,
        vin: formData.vin.trim(),
        brand: formData.vehicleMake.trim(),
        model: formData.vehicleModel.trim(),
        manufacturingYear: parseInt(formData.manufacturingYear, 10),
        odometerLast: parseInt(formData.odometerLast, 10),
        registrationNumber: formData.vehicleNumber.trim() || formData.vin.trim(),
        priority: formData.priority,
        serviceType: formData.serviceType,
      });

      if (res.success) {
        toast.success("Vehicle added successfully");
        navigate(`${ROUTES.ADD_VEHICLE}?vehicleId=${res.data.id}`);
      } else {
        const msg = res.error?.message || "Failed to add vehicle";
        setSubmitError(msg);
        toast.error(msg);
      }
    } catch (err: unknown) {
      let msg = "Failed to add vehicle. Please try again.";
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
        msg = axiosErr.response?.data?.error?.message || msg;
      }
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate(ROUTES.SECURITY_DASHBOARD);
  };

  const clearSelection = () => {
    setSelectedCustomer(null);
    setSearchQuery("");
    setSearchResults([]);
    setShowNewCustomerForm(false);
    setSelectedMakeId("");
    setModels([]);
    setFormData({
      firstName: "",
      lastName: "",
      phoneNumber: "",
      email: "",
      vehicleNumber: "",
      vehicleMake: "",
      vehicleModel: "",
      vin: "",
      manufacturingYear: "",
      odometerLast: "",
      priority: "STANDARD",
      serviceType: "GENERAL_SERVICE",
    });
  };

  return (
    <>
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Security Guard" },
          { label: "Add Customer" }
        ]}
      />

      {/* Customer Search Section */}
      {!showNewCustomerForm && (
        <div className="bg-white rounded-[10px] p-4 sm:p-5 md:p-6 mb-5">
          <div className="mb-4">
            <h2 className="text-[#333] text-[15px] sm:text-[16px] mb-1">
              Search Customer
            </h2>
            <p className="text-[#999] text-[12px]">
              Search for an existing customer or add a new one
            </p>
          </div>

          {/* Search Input */}
          <div className="relative" ref={dropdownRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#999]" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => searchQuery.trim() && setIsDropdownOpen(true)}
                placeholder="Search by name, phone number, or email..."
                className="w-full h-12 border border-[#e5e7eb] rounded-[10px] pl-10 pr-10 text-[14px] text-[#333] placeholder:text-[#bfbfbf] outline-none focus:border-[#04c397] transition-colors"
              />
              {selectedCustomer && (
                <button
                  type="button"
                  onClick={clearSelection}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#333]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dropdown */}
            {isDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-[#e5e7eb] rounded-[10px] shadow-lg max-h-60 overflow-y-auto">
                {isSearching ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => handleSelectCustomer(customer)}
                      className="w-full text-left px-4 py-3 hover:bg-[#f9f9f9] border-b border-[#f0f0f0] last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#ff4f31] text-white flex items-center justify-center font-medium">
                          {customer.firstName.charAt(0)}{customer.lastName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[#333] text-[14px] font-medium">
                            {customer.firstName} {customer.lastName}
                          </p>
                          <p className="text-[#999] text-[12px]">
                            {customer.primaryEmail || "No email"}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                ) : searchQuery.trim() ? (
                  <div className="px-4 py-3 text-center">
                    <p className="text-[#999] text-[13px] mb-2">No customer found</p>
                    <button
                      type="button"
                      onClick={handleAddNewCustomer}
                      className="text-[#0066FF] text-[13px] font-medium hover:underline flex items-center gap-1 mx-auto"
                    >
                      <Plus className="w-4 h-4" />
                      Add New Customer
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Add New Customer Button */}
          {!selectedCustomer && (
            <div className="mt-4 pt-4 border-t border-[#e5e7eb]">
              <button
                type="button"
                onClick={handleAddNewCustomer}
                className="flex items-center gap-2 text-[#0066FF] text-[14px] font-medium hover:underline"
              >
                <Plus className="w-4 h-4" />
                Add New Customer
              </button>
            </div>
          )}

          {/* Selected Customer Info */}
          {selectedCustomer && (
            <div className="mt-4 pt-4 border-t border-[#e5e7eb]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#04c397] text-white flex items-center justify-center">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[#333] text-[14px] font-medium">
                      {selectedCustomer.firstName} {selectedCustomer.lastName}
                    </p>
                    <p className="text-[#999] text-[12px]">
                      {selectedCustomer.primaryEmail || "No email"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-[#999] text-[12px] hover:text-[#333]"
                >
                  Change
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Customer & Vehicle Details Form */}
      {(showNewCustomerForm || selectedCustomer) && (
        <form onSubmit={handleSubmit}>
          {/* Customer Details Section */}
          <div className="bg-white rounded-[10px] p-4 sm:p-5 md:p-6 mb-5">
            <h3 className="text-[#333] text-[14px] sm:text-[15px] font-medium mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-[#ff4f31]" />
              Customer Details
              {selectedCustomer && <span className="text-[#04c397] text-[12px]">(Existing Customer)</span>}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* First Name */}
              <div>
                <label className="block text-[#333] text-[13px] font-medium mb-1.5">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  readOnly={!!selectedCustomer}
                  placeholder="Enter first name"
                  className={`w-full h-11 sm:h-12 border rounded-[10px] px-3 sm:px-4 text-[14px] text-[#333] placeholder:text-[#bfbfbf] outline-none transition-colors ${
                    selectedCustomer ? "bg-[#f9f9f9] cursor-not-allowed" : ""
                  } ${
                    errors.firstName
                      ? "border-red-500 focus:border-red-500"
                      : "border-[#e5e7eb] focus:border-[#04c397]"
                  }`}
                />
                {errors.firstName && (
                  <p className="text-red-500 text-[11px] mt-1">{errors.firstName}</p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-[#333] text-[13px] font-medium mb-1.5">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  readOnly={!!selectedCustomer}
                  placeholder="Enter last name"
                  className={`w-full h-11 sm:h-12 border rounded-[10px] px-3 sm:px-4 text-[14px] text-[#333] placeholder:text-[#bfbfbf] outline-none transition-colors ${
                    selectedCustomer ? "bg-[#f9f9f9] cursor-not-allowed" : ""
                  } ${
                    errors.lastName
                      ? "border-red-500 focus:border-red-500"
                      : "border-[#e5e7eb] focus:border-[#04c397]"
                  }`}
                />
                {errors.lastName && (
                  <p className="text-red-500 text-[11px] mt-1">{errors.lastName}</p>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-[#333] text-[13px] font-medium mb-1.5">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999]" />
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    readOnly={!!selectedCustomer?.contactNumber}
                    placeholder="Enter phone number"
                    className={`w-full h-11 sm:h-12 border rounded-[10px] pl-10 pr-3 sm:pr-4 text-[14px] text-[#333] placeholder:text-[#bfbfbf] outline-none transition-colors ${
                      selectedCustomer?.contactNumber ? "bg-[#f9f9f9] cursor-not-allowed" : ""
                    } ${
                      errors.phoneNumber
                        ? "border-red-500 focus:border-red-500"
                        : "border-[#e5e7eb] focus:border-[#04c397]"
                    }`}
                  />
                </div>
                {errors.phoneNumber && (
                  <p className="text-red-500 text-[11px] mt-1">{errors.phoneNumber}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-[#333] text-[13px] font-medium mb-1.5">
                  Email <span className="text-[#999]">(Optional)</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999]" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    readOnly={!!selectedCustomer}
                    placeholder="Enter email address"
                    className={`w-full h-11 sm:h-12 border border-[#e5e7eb] rounded-[10px] pl-10 pr-3 sm:pr-4 text-[14px] text-[#333] placeholder:text-[#bfbfbf] outline-none focus:border-[#04c397] transition-colors ${
                      selectedCustomer ? "bg-[#f9f9f9] cursor-not-allowed" : ""
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle Details Section */}
          <div className="bg-white rounded-[10px] p-4 sm:p-5 md:p-6 mb-5">
            <h3 className="text-[#333] text-[14px] sm:text-[15px] font-medium mb-4 flex items-center gap-2">
              <Car className="w-4 h-4 text-[#ff4f31]" />
              Vehicle Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* VIN */}
              <div>
                <label className="block text-[#333] text-[13px] font-medium mb-1.5">
                  VIN <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="vin"
                  value={formData.vin}
                  onChange={handleChange}
                  maxLength={7}
                  placeholder="e.g., ABC1234"
                  className={`w-full h-11 sm:h-12 border rounded-[10px] px-3 sm:px-4 text-[14px] text-[#333] placeholder:text-[#bfbfbf] outline-none transition-colors uppercase ${
                    errors.vin
                      ? "border-red-500 focus:border-red-500"
                      : "border-[#e5e7eb] focus:border-[#04c397]"
                  }`}
                />
                {errors.vin && (
                  <p className="text-red-500 text-[11px] mt-1">{errors.vin}</p>
                )}
              </div>

              {/* Vehicle Number / Registration */}
              <div>
                <label className="block text-[#333] text-[13px] font-medium mb-1.5">
                  Registration Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="vehicleNumber"
                  value={formData.vehicleNumber}
                  onChange={handleChange}
                  placeholder="e.g., BL 00 MY ZN"
                  className={`w-full h-11 sm:h-12 border rounded-[10px] px-3 sm:px-4 text-[14px] text-[#333] placeholder:text-[#bfbfbf] outline-none transition-colors uppercase ${
                    errors.vehicleNumber
                      ? "border-red-500 focus:border-red-500"
                      : "border-[#e5e7eb] focus:border-[#04c397]"
                  }`}
                />
                {errors.vehicleNumber && (
                  <p className="text-red-500 text-[11px] mt-1">{errors.vehicleNumber}</p>
                )}
              </div>

              {/* Vehicle Make / Brand */}
              <div>
                <label className="block text-[#333] text-[13px] font-medium mb-1.5">
                  Vehicle Make <span className="text-red-500">*</span>
                </label>
                <SearchableDropdown
                  options={makes}
                  value={selectedMakeId}
                  onChange={handleMakeChange}
                  placeholder={loadingMakes ? "Loading makes..." : "Select Vehicle Make"}
                  loading={loadingMakes}
                  hasError={!!errors.vehicleMake}
                />
                {errors.vehicleMake && (
                  <p className="text-red-500 text-[11px] mt-1">{errors.vehicleMake}</p>
                )}
              </div>

              {/* Vehicle Model */}
              <div>
                <label className="block text-[#333] text-[13px] font-medium mb-1.5">
                  Vehicle Model <span className="text-red-500">*</span>
                </label>
                <SearchableDropdown
                  options={models}
                  value={models.find((m) => m.name === formData.vehicleModel)?.id || ""}
                  onChange={handleModelChange}
                  placeholder={
                    !selectedMakeId
                      ? "Select a make first"
                      : loadingModels
                        ? "Loading models..."
                        : "Select Vehicle Model"
                  }
                  disabled={!selectedMakeId}
                  loading={loadingModels}
                  hasError={!!errors.vehicleModel}
                />
                {errors.vehicleModel && (
                  <p className="text-red-500 text-[11px] mt-1">{errors.vehicleModel}</p>
                )}
              </div>

              {/* Manufacturing Year */}
              <div>
                <label className="block text-[#333] text-[13px] font-medium mb-1.5">
                  Manufacturing Year <span className="text-red-500">*</span>
                </label>
                <select
                  name="manufacturingYear"
                  value={formData.manufacturingYear}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, manufacturingYear: e.target.value }));
                    if (errors.manufacturingYear) {
                      setErrors((prev) => ({ ...prev, manufacturingYear: "" }));
                    }
                  }}
                  className={`w-full h-11 sm:h-12 border rounded-[10px] px-3 sm:px-4 text-[14px] text-[#333] outline-none transition-colors bg-white ${
                    errors.manufacturingYear
                      ? "border-red-500 focus:border-red-500"
                      : "border-[#e5e7eb] focus:border-[#04c397]"
                  } ${!formData.manufacturingYear ? "text-[#bfbfbf]" : ""}`}
                >
                  <option value="">Select Year</option>
                  {Array.from({ length: new Date().getFullYear() - 1999 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                    <option key={year} value={String(year)}>{year}</option>
                  ))}
                </select>
                {errors.manufacturingYear && (
                  <p className="text-red-500 text-[11px] mt-1">{errors.manufacturingYear}</p>
                )}
              </div>

              {/* Odometer Reading */}
              <div>
                <label className="block text-[#333] text-[13px] font-medium mb-1.5">
                  Odometer Reading (KM) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="odometerLast"
                  value={formData.odometerLast}
                  onChange={handleChange}
                  placeholder="e.g., 15000"
                  className={`w-full h-11 sm:h-12 border rounded-[10px] px-3 sm:px-4 text-[14px] text-[#333] placeholder:text-[#bfbfbf] outline-none transition-colors ${
                    errors.odometerLast
                      ? "border-red-500 focus:border-red-500"
                      : "border-[#e5e7eb] focus:border-[#04c397]"
                  }`}
                />
                {errors.odometerLast && (
                  <p className="text-red-500 text-[11px] mt-1">{errors.odometerLast}</p>
                )}
              </div>

              {/* Service Type */}
              <div>
                <label className="block text-[#333] text-[13px] font-medium mb-1.5">
                  Service Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="serviceType"
                  value={formData.serviceType}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, serviceType: e.target.value }));
                    if (errors.serviceType) {
                      setErrors((prev) => ({ ...prev, serviceType: "" }));
                    }
                  }}
                  className={`w-full h-11 sm:h-12 border rounded-[10px] px-3 sm:px-4 text-[14px] text-[#333] outline-none transition-colors bg-white ${
                    errors.serviceType
                      ? "border-red-500 focus:border-red-500"
                      : "border-[#e5e7eb] focus:border-[#04c397]"
                  }`}
                >
                  <option value="GENERAL_SERVICE">General Service</option>
                  <option value="REPAIR">Repair</option>
                  <option value="WARRANTY">Warranty</option>
                  <option value="INSPECTION">Inspection</option>
                </select>
                {errors.serviceType && (
                  <p className="text-red-500 text-[11px] mt-1">{errors.serviceType}</p>
                )}
              </div>

              {/* Priority */}
              <div>
                <label className="block text-[#333] text-[13px] font-medium mb-1.5">
                  Priority
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, priority: e.target.value }));
                  }}
                  className="w-full h-11 sm:h-12 border border-[#e5e7eb] focus:border-[#04c397] rounded-[10px] px-3 sm:px-4 text-[14px] text-[#333] outline-none transition-colors bg-white"
                >
                  <option value="STANDARD">Standard</option>
                  <option value="URGENT">Urgent</option>
                  <option value="EXPRESS">Express</option>
                  <option value="BASIC">Basic</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submit Error */}
          {submitError && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-[10px]">
              <p className="text-red-600 text-[13px]">{submitError}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              className="w-full sm:w-auto"
            >
              Back
            </Button>
            <Button
              type="submit"
              variant="gradient"
              icon={isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
              className="w-full sm:w-auto"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Adding Vehicle..." : "Continue to Photo Capture"}
            </Button>
          </div>
        </form>
      )}
    </>
  );
};

export default AddCustomer;
