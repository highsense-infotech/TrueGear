import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { CheckCircle, FileCheckCorner, User, Car, ArrowLeft, Loader2 } from "lucide-react";
import { Breadcrumb } from "../../components/common/Breadcrumb";
import Button from "../../components/common/Button";
import { PhotoCaptureCard } from "../../components/cards/PhotoCaptureCard";
import { requestGeolocation, type CapturedPhoto } from "../../utils/stampImage";
import LiveCameraCapture from "../../components/common/LiveCameraCapture";
import { ConfirmVehicleEntryModal } from "../../components/common/ConfirmVehicleEntryModal";
import { ROUTES } from "../../constants/routes";
import {
  getVehicleDetails,
  uploadVehicleImages,
  replaceVehicleImage,
  deleteVehicleImage,
  confirmVehicleEntry,
} from "../../api/vehicle.api";

interface PhotoSlot {
  title: string;
  required: boolean;
  capturedImage?: string;
  imageId?: string; // backend image ID
  isUploading?: boolean;
  uploadError?: boolean; // upload to server failed — preview is local only
}

interface CustomerData {
  firstName: string;
  lastName: string;
  companyName: string;
  phoneNumber: string;
  email: string;
  vin: string;
  vehicleNumber: string;
  vehicleMake: string;
  vehicleModel: string;
  odometerLast: number;
  priority: string;
  serviceType: string;
  manufacturingYear: number;
}

const AddVehicle: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const vehicleIdFromUrl = searchParams.get("vehicleId");
  const isReEntry = searchParams.get("reentry") === "true";

  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [validationError, setValidationError] = useState<string>("");
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [entryTime, setEntryTime] = useState<string>(
    new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  );
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [odometerInput, setOdometerInput] = useState<string>("");

  // Phase 1 — richer arrival capture
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  // Per-field errors for the now-mandatory driver details, so the inspector is
  // pointed at the offending input rather than only shown the banner below.
  const [driverErrors, setDriverErrors] = useState<{ name?: string; phone?: string }>({});
  const [driverLicenceNo, setDriverLicenceNo] = useState("");
  const [fuelLevel, setFuelLevel] = useState<"EMPTY" | "QUARTER" | "HALF" | "THREE_QUARTER" | "FULL" | "">("");
  const [damagesNotes, setDamagesNotes] = useState("");
  // Shop recorded on the existing check-in, used to pre-select Route to Shop
  // in the confirm modal when an entry is edited. Null on a first entry.
  const [entryShop, setEntryShop] = useState<"SERVICE" | "MAJOR" | "PDI" | null>(null);
  const [complaintText, setComplaintText] = useState("");
  const [, setReceivingNo] = useState<string | null>(null);

  const initialSlots: PhotoSlot[] = [
    { title: "Vehicle Registration No", required: true },
    { title: "Odometer Reading (KM)", required: true },
    { title: "Front View", required: true },
    { title: "Rear View", required: true },
    { title: "Left View", required: false },
    { title: "Right View", required: false },
    { title: "Dashboard View", required: false },
    { title: "Engine View", required: false },
  ];

  const [photoSlots, setPhotoSlots] = useState<PhotoSlot[]>(initialSlots);

  // Request geolocation early so it's ready when a photo is captured
  useEffect(() => { requestGeolocation(); }, []);

  // Load data: from API if vehicleId in URL, otherwise from sessionStorage
  useEffect(() => {
    if (vehicleIdFromUrl) {
      setIsEditing(true);
      setIsLoading(true);
      setFetchError(null);
      setVehicleId(vehicleIdFromUrl);

      getVehicleDetails(vehicleIdFromUrl)
        .then((res) => {
          if (res.success && res.data) {
            const { vehicle, customer, images, activeCheckIn, appointmentComplaint } = res.data;

            // Pre-fill Phase 1 capture fields from the active check-in.
            // On a fresh re-entry visit there's no active check-in yet, so the
            // fields stay blank — the gate keeper enters them anew.
            if (activeCheckIn && !isReEntry) {
              setDriverName(activeCheckIn.driverName ?? "");
              setDriverPhone(activeCheckIn.driverPhone ?? "");
              setDriverLicenceNo(activeCheckIn.driverLicenceNo ?? "");
              setFuelLevel(activeCheckIn.fuelLevel ?? "");
              setDamagesNotes(activeCheckIn.damagesNotes ?? "");
              setComplaintText(activeCheckIn.complaintText ?? "");
              setEntryShop(activeCheckIn.shop ?? null);
              setReceivingNo(activeCheckIn.receivingNo ?? null);
            }

            // Auto-fill the complaint from the open booking when the check-in
            // doesn't already carry one. Applies to first entry AND re-entry: a
            // returning vehicle still has a current booking whose complaint is
            // relevant (unlike odometer/photos, which are reset per visit). The
            // gate keeper can still override. Mirrors the backend on-submit
            // auto-fill so the shown value matches what gets persisted.
            if (!activeCheckIn?.complaintText && appointmentComplaint) {
              setComplaintText(appointmentComplaint);
            }
            setCustomerData({
              firstName: customer.firstName,
              lastName: customer.lastName,
              companyName: customer.companyName ?? "",
              phoneNumber: customer.contactNumber || "",
              email: customer.primaryEmail || "",
              vin: vehicle.vin,
              vehicleNumber: (vehicle.registrationNumber || vehicle.vin || "").toUpperCase(),
              vehicleMake: vehicle.brand,
              vehicleModel: vehicle.model,
              odometerLast: vehicle.odometerLast ?? 0,
              priority: vehicle.priority ?? "STANDARD",
              serviceType: vehicle.serviceType ?? "GENERAL_SERVICE",
              manufacturingYear: vehicle.manufacturingYear ?? 0,
            });
            // Clear odometer on re-entry so security team enters the current reading.
            // Pre-fill only when editing an in-progress entry (not a fresh re-entry).
            setOdometerInput(isReEntry ? "" : String(vehicle.odometerLast ?? ""));
            if (vehicle.entryTime) {
              const d = new Date(vehicle.entryTime);
              setEntryTime(
                d.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })
              );
            }

            // Map existing images to photo slots by category. For re-entries
            // we filter to photos taken in THIS visit (after the active
            // check-in started) — gate-release should have archived prior
            // visit photos to vehicle_check_in_photos, but if any leak
            // through we don't want to re-show them. For non-re-entry edits,
            // show everything in vehicle_images.
            if (images && images.length > 0) {
              const visitStart = isReEntry && activeCheckIn?.checkInTime
                ? new Date(activeCheckIn.checkInTime).getTime()
                : null;
              setPhotoSlots((prev) => {
                const updated = [...prev];
                images.forEach((img) => {
                  // Skip pre-fill for re-entry if the photo predates the active
                  // check-in (i.e. left over from a prior visit).
                  if (visitStart != null) {
                    const ts = img.capturedAt
                      ? new Date(img.capturedAt).getTime()
                      : new Date(img.createdAt).getTime();
                    if (ts < visitStart) return;
                  }
                  const slotIndex = updated.findIndex(
                    (slot) => slot.title === img.imageCategory
                  );
                  if (slotIndex !== -1) {
                    updated[slotIndex] = {
                      ...updated[slotIndex],
                      capturedImage: img.imagePath,
                      imageId: img.id,
                    };
                  }
                });
                return updated;
              });
            }

            sessionStorage.setItem("vehicleId", vehicleIdFromUrl);
          } else {
            setFetchError("Failed to load vehicle details");
          }
        })
        .catch((err: unknown) => {
          if (err && typeof err === "object" && "response" in err) {
            const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
            setFetchError(axiosErr.response?.data?.error?.message || "Failed to load vehicle details");
          } else {
            setFetchError("Failed to load vehicle details");
          }
        })
        .finally(() => setIsLoading(false));
    } else {
      const storedCustomer = sessionStorage.getItem("customerData");
      const storedIsEditing = sessionStorage.getItem("isEditing");
      const storedVehicleId = sessionStorage.getItem("vehicleId");

      if (storedCustomer) {
        try {
          setCustomerData(JSON.parse(storedCustomer));
        } catch (e) {
          console.error("Error parsing customer data:", e);
        }
      }
      if (storedIsEditing === "true") {
        setIsEditing(true);
      }
      if (storedVehicleId) {
        setVehicleId(storedVehicleId);
      }
    }
  }, [vehicleIdFromUrl]);

  // Check if all required fields are captured
  // A failed upload keeps a local preview but isn't actually saved, so it must
  // NOT count as a captured photo for validation purposes.
  const requiredSlots = photoSlots.filter((slot) => slot.required);
  const capturedRequiredCount = requiredSlots.filter((slot) => slot.capturedImage && !slot.uploadError).length;
  const isValid = capturedRequiredCount === requiredSlots.length;
  const missingCount = requiredSlots.length - capturedRequiredCount;
  const capturedCount = photoSlots.filter((slot) => slot.capturedImage && !slot.uploadError).length;
  const isAnyUploading = photoSlots.some((slot) => slot.isUploading);

  // Accepts a local number ("0831234567") or an international one
  // ("+27 83 123 4567"): strip spaces/dashes/brackets and an optional leading
  // "+", then require 9–15 digits (E.164 range). Deliberately looser than the
  // customer form's strict 10-digit rule, because the driver at the gate is
  // often reached on an international number.
  const isValidDriverPhone = (raw: string): boolean =>
    /^\d{9,15}$/.test(raw.replace(/[\s()-]/g, "").replace(/^\+/, ""));

  const handleConfirmEntry = () => {
    // Driver details are mandatory — the gate record must identify who brought
    // the vehicle in and how to reach them.
    const nextDriverErrors: { name?: string; phone?: string } = {};
    if (!driverName.trim()) {
      nextDriverErrors.name = "Driver name is required";
    }
    if (!driverPhone.trim()) {
      nextDriverErrors.phone = "Driver phone is required";
    } else if (!isValidDriverPhone(driverPhone)) {
      nextDriverErrors.phone = "Enter a valid phone number (9–15 digits)";
    }
    setDriverErrors(nextDriverErrors);
    if (nextDriverErrors.name || nextDriverErrors.phone) {
      setValidationError("Driver name and phone number are required before confirming entry.");
      return;
    }

    if (!odometerInput || isNaN(Number(odometerInput)) || Number(odometerInput) <= 0) {
      setValidationError("Odometer reading is required before confirming entry.");
      return;
    }
    if (!isValid) {
      setValidationError(
        `Please capture ${missingCount} more required photo${missingCount !== 1 ? "s" : ""} before confirming entry.`
      );
      return;
    }
    setValidationError("");
    setIsModalOpen(true);
  };

  // Phase 8B — opens the live camera modal for this slot. Gallery picks
  // are no longer possible — capture is OEM-compliant by enforcement.
  const handleCapture = (index: number) => {
    setActiveSlot(index);
    setCameraOpen(true);
  };

  // Receives the live-captured frame from <LiveCameraCapture>. Same upload
  // path as the legacy file-input flow but without the gallery option.
  const handleCameraCapture = async (file: File, captured: CapturedPhoto) => {
    if (activeSlot === null) return;
    setCameraOpen(false);
    await processCapturedFile(file, activeSlot, captured);
    setActiveSlot(null);
  };

  // Extracted from the original handleFileChange so live camera and (legacy)
  // file input both route through one place.
  const processCapturedFile = async (
    file: File,
    slotIndex: number,
    captured: CapturedPhoto,
  ) => {
    const slot = photoSlots[slotIndex];

    // The file arrives already geo-stamped from <LiveCameraCapture>; `captured`
    // carries the matching lat/lng/capturedAt so the upload can include them
    // for the compliance audit (3.3).
    const stampedFile = file;
    const photoMeta = {
      capturedAt: captured.capturedAt,
      gpsLat: captured.gpsLat,
      gpsLng: captured.gpsLng,
      gpsAccuracyM: captured.gpsAccuracyM,
      addressText: captured.addressText,
      deviceUserAgent: captured.deviceUserAgent,
    };

    // Show uploading state with local preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoSlots((prev) => {
        const updated = [...prev];
        updated[slotIndex] = {
          ...updated[slotIndex],
          capturedImage: reader.result as string,
          isUploading: true,
          uploadError: false,
        };
        return updated;
      });
    };
    reader.readAsDataURL(stampedFile);

    // Upload to API if we have a vehicleId
    if (vehicleId) {
      try {
        if (slot.imageId) {
          // Replace existing image
          const res = await replaceVehicleImage(vehicleId, slot.imageId, stampedFile, slot.title, photoMeta);
          if (res.success && res.data) {
            const imgData = res.data;
            setPhotoSlots((prev) => {
              const updated = [...prev];
              updated[slotIndex] = {
                ...updated[slotIndex],
                imageId: imgData.id,
                capturedImage: imgData.imagePath,
                isUploading: false,
                uploadError: false,
              };
              return updated;
            });
          }
        } else {
          // Upload new image
          const res = await uploadVehicleImages(vehicleId, [stampedFile], slot.title, photoMeta);
          if (res.success && res.data && res.data.uploaded.length > 0) {
            const uploaded = res.data.uploaded[0];
            setPhotoSlots((prev) => {
              const updated = [...prev];
              updated[slotIndex] = {
                ...updated[slotIndex],
                imageId: uploaded.id,
                capturedImage: uploaded.imagePath,
                isUploading: false,
                uploadError: false,
              };
              return updated;
            });
          }
        }
      } catch (err) {
        console.error("Image upload failed:", err);
        toast.error(`${slot.title}: upload failed — photo not saved. Tap to retry.`);
        // Keep the local preview but flag it as not saved so the gatekeeper
        // knows it must be re-captured (and it won't count toward required).
        setPhotoSlots((prev) => {
          const updated = [...prev];
          updated[slotIndex] = { ...updated[slotIndex], isUploading: false, uploadError: true };
          return updated;
        });
      }
    } else {
      // No vehicleId yet - just keep local preview
      setPhotoSlots((prev) => {
        const updated = [...prev];
        updated[slotIndex] = { ...updated[slotIndex], isUploading: false };
        return updated;
      });
    }

  };

  // Handle delete button click - delete from API
  const handleDelete = async (index: number) => {
    const slot = photoSlots[index];

    if (slot.imageId && vehicleId) {
      try {
        await deleteVehicleImage(vehicleId, slot.imageId);
      } catch (err) {
        console.error("Image delete failed:", err);
        toast.error("Failed to delete image");
      }
    }

    setPhotoSlots((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        capturedImage: undefined,
        imageId: undefined,
      };
      return updated;
    });
  };

  const handleModalConfirm = async (shop: "SERVICE" | "MAJOR" | "PDI") => {
    if (!vehicleId) {
      setConfirmError("Vehicle ID not found.");
      return;
    }

    setIsConfirming(true);
    setConfirmError(null);

    try {
      const res = await confirmVehicleEntry(vehicleId, {
        odometerReading: odometerInput ? Number(odometerInput) : undefined,
        driverName: driverName.trim() || undefined,
        driverPhone: driverPhone.trim() || undefined,
        driverLicenceNo: driverLicenceNo.trim() || undefined,
        fuelLevel: fuelLevel || undefined,
        damagesNotes: damagesNotes.trim() || undefined,
        complaintText: complaintText.trim() || undefined,
        shop,
      });
      if (res.success) {
        toast.success(`Vehicle entry confirmed — ${res.data?.receivingNo ?? ""}`.trim());
        setReceivingNo(res.data?.receivingNo ?? null);
        setIsModalOpen(false);
        sessionStorage.removeItem("customerData");
        sessionStorage.removeItem("isEditing");
        sessionStorage.removeItem("vehicleId");
        if (isEditing) {
          navigate(ROUTES.SECURITY_DASHBOARD);
        } else {
          // Pass the receiving number to the success page via state.
          navigate(ROUTES.VEHICLE_ENTRY_SUCCESS, {
            state: { receivingNo: res.data?.receivingNo ?? null },
          });
        }
      } else {
        const msg = res.error?.message || "Failed to confirm entry.";
        setConfirmError(msg);
        toast.error(msg);
      }
    } catch (err: unknown) {
      let msg = "Failed to confirm entry.";
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
        msg = axiosErr.response?.data?.error?.message || msg;
      }
      setConfirmError(msg);
      toast.error(msg);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleBack = () => {
    if (isEditing) {
      navigate(ROUTES.SECURITY_DASHBOARD);
    } else {
      navigate(ROUTES.ADD_CUSTOMER);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Error state
  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-red-500 text-sm">{fetchError}</p>
        <Button variant="secondary" onClick={() => navigate(ROUTES.SECURITY_DASHBOARD)}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Live camera capture — replaces the file input (3.3 compliance).
          No gallery option; uses MediaDevices.getUserMedia. */}
      <LiveCameraCapture
        isOpen={cameraOpen}
        title={activeSlot != null ? photoSlots[activeSlot]?.title : "Live Capture"}
        onClose={() => { setCameraOpen(false); setActiveSlot(null); }}
        onCapture={handleCameraCapture}
      />

      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Security Guard", onClick: () => navigate(ROUTES.SECURITY_DASHBOARD) },
          isEditing
            ? { label: "Edit Vehicle" }
            : { label: "Customer Details", onClick: handleBack },
          { label: "Vehicle Photos" },
        ]}
      />

      {/* Customer Info Card */}
      {customerData && (
        <div className="bg-white rounded-[10px] p-4 sm:p-5 md:p-6 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[#333] text-[14px] sm:text-[15px] font-medium flex items-center gap-2">
              <User className="w-4 h-4 text-[#ff4f31]" />
              Customer Information
            </h3>
            {!vehicleIdFromUrl && (
              <button
                onClick={handleBack}
                className="text-[#0066FF] text-[13px] flex items-center gap-1 hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Edit
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-[#f9f9f9] rounded-[8px] p-3">
              <p className="text-[#999] text-[11px] mb-1">Customer Name</p>
              <p className="text-[#333] text-[14px] font-medium">
                {customerData.companyName
                  || `${customerData.firstName} ${customerData.lastName}`.trim()
                  || "—"}
              </p>
            </div>
            <div className="bg-[#f9f9f9] rounded-[8px] p-3">
              <p className="text-[#999] text-[11px] mb-1">Phone Number</p>
              <p className="text-[#333] text-[14px] font-medium">
                {customerData.phoneNumber || "N/A"}
              </p>
            </div>
            <div className="bg-[#f9f9f9] rounded-[8px] p-3">
              <p className="text-[#999] text-[11px] mb-1">Email</p>
              <p className="text-[#333] text-[14px] font-medium">
                {customerData.email || "N/A"}
              </p>
            </div>
            <div className="bg-[#f9f9f9] rounded-[8px] p-3">
              <p className="text-[#999] text-[11px] mb-1">VIN</p>
              <p className="text-[#333] text-[14px] font-medium uppercase">
                {customerData.vin}
              </p>
            </div>
            <div className="bg-[#f9f9f9] rounded-[8px] p-3">
              <p className="text-[#999] text-[11px] mb-1">Vehicle Registration Number</p>
              <p className="text-[#333] text-[14px] font-medium uppercase">
                {customerData.vehicleNumber}
              </p>
            </div>
            <div className="bg-[#f9f9f9] rounded-[8px] p-3">
              <p className="text-[#999] text-[11px] mb-1">Vehicle Make</p>
              <p className="text-[#333] text-[14px] font-medium">
                {customerData.vehicleMake}
              </p>
            </div>
            <div className="bg-[#f9f9f9] rounded-[8px] p-3">
              <p className="text-[#999] text-[11px] mb-1">Vehicle Model</p>
              <p className="text-[#333] text-[14px] font-medium flex items-center gap-2">
                <Car className="w-4 h-4 text-[#666]" />
                {customerData.vehicleModel}
              </p>
            </div>
            <div className="bg-[#f9f9f9] rounded-[8px] p-3">
              <p className="text-[#999] text-[11px] mb-1">
                Odometer Reading <span className="text-[#ff4f31]">*</span>
              </p>
              <div className="relative mt-1">
                <input
                  type="number"
                  min={0}
                  placeholder="Enter reading"
                  value={odometerInput}
                  onChange={(e) => setOdometerInput(e.target.value)}
                  // Blur on wheel so scrolling the page never edits the reading.
                  onWheel={(e) => e.currentTarget.blur()}
                  className={`no-spinner w-full pl-2 pr-8 py-1 text-[14px] font-medium text-[#333] bg-white border rounded-md focus:outline-none focus:border-[#ff4f31] ${
                    !odometerInput ? "border-[#ff4f31]" : "border-[#e5e7eb]"
                  }`}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-[#999]">km</span>
              </div>
            </div>
            <div className="bg-[#f9f9f9] rounded-[8px] p-3">
              <p className="text-[#999] text-[11px] mb-1">Priority</p>
              <p className="text-[#333] text-[14px] font-medium capitalize">
                {customerData.priority.toLowerCase()}
              </p>
            </div>
            <div className="bg-[#f9f9f9] rounded-[8px] p-3">
              <p className="text-[#999] text-[11px] mb-1">Service Type</p>
              <p className="text-[#333] text-[14px] font-medium capitalize">
                {customerData.serviceType.replace(/_/g, " ").toLowerCase()}
              </p>
            </div>
            <div className="bg-[#f9f9f9] rounded-[8px] p-3">
              <p className="text-[#999] text-[11px] mb-1">Manufacturing Year</p>
              <p className="text-[#333] text-[14px] font-medium">
                {customerData.manufacturingYear}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Phase 1 — Driver / Fuel / Damages / Complaint capture.
          These extend the gate entry beyond reg/VIN/odometer so the client
          process flow has the receiving info it expects. */}
      <div className="bg-white rounded-[10px] p-4 sm:p-5 md:p-6 mb-5">
        <p className="text-[14px] font-semibold text-[#333] mb-3">Driver & Vehicle Condition</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="text-[11px] text-[#999] mb-1 block">
              Driver Name <span className="text-[#ff4f31]">*</span>
            </label>
            <input
              type="text"
              value={driverName}
              onChange={(e) => {
                setDriverName(e.target.value);
                if (driverErrors.name) setDriverErrors((p) => ({ ...p, name: undefined }));
              }}
              placeholder="Driver's full name"
              className={`w-full px-2 py-1.5 text-[14px] text-[#333] bg-white border rounded-md focus:outline-none focus:border-[#ff4f31] ${
                driverErrors.name ? "border-red-500" : "border-[#e5e7eb]"
              }`}
            />
            {driverErrors.name && (
              <p className="text-red-500 text-[11px] mt-1">{driverErrors.name}</p>
            )}
          </div>
          <div>
            <label className="text-[11px] text-[#999] mb-1 block">
              Driver Phone <span className="text-[#ff4f31]">*</span>
            </label>
            <input
              type="tel"
              value={driverPhone}
              onChange={(e) => {
                setDriverPhone(e.target.value);
                if (driverErrors.phone) setDriverErrors((p) => ({ ...p, phone: undefined }));
              }}
              placeholder="+27 …"
              className={`w-full px-2 py-1.5 text-[14px] text-[#333] bg-white border rounded-md focus:outline-none focus:border-[#ff4f31] ${
                driverErrors.phone ? "border-red-500" : "border-[#e5e7eb]"
              }`}
            />
            {driverErrors.phone && (
              <p className="text-red-500 text-[11px] mt-1">{driverErrors.phone}</p>
            )}
          </div>
          <div>
            <label className="text-[11px] text-[#999] mb-1 block">Driver Licence #</label>
            <input
              type="text"
              value={driverLicenceNo}
              onChange={(e) => setDriverLicenceNo(e.target.value)}
              placeholder="(optional)"
              className="w-full px-2 py-1.5 text-[14px] text-[#333] bg-white border border-[#e5e7eb] rounded-md focus:outline-none focus:border-[#ff4f31]"
            />
          </div>
        </div>

        <label className="text-[11px] text-[#999] mb-1 block">Fuel Level</label>
        <div className="flex gap-1.5 mb-3">
          {(["EMPTY", "QUARTER", "HALF", "THREE_QUARTER", "FULL"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFuelLevel(fuelLevel === f ? "" : f)}
              className={`flex-1 h-8 rounded-md border text-[12px] font-medium transition-colors ${
                fuelLevel === f
                  ? "border-[#ff4f31] bg-[#fff5f2] text-[#ff4f31]"
                  : "border-[#e5e7eb] bg-white text-[#555] hover:bg-[#fafafa]"
              }`}
            >
              {f === "THREE_QUARTER" ? "¾" : f === "QUARTER" ? "¼" : f === "HALF" ? "½" : f === "FULL" ? "Full" : "Empty"}
            </button>
          ))}
        </div>

        {/* Visible Damages lives in the "Entry Notes" card below — it is the
            same damagesNotes value, so it is not duplicated here. */}
        <label className="text-[11px] text-[#999] mb-1 block">Customer Complaint</label>
        <textarea
          value={complaintText}
          onChange={(e) => setComplaintText(e.target.value)}
          placeholder="Auto-filled from appointment if any. Add or override here."
          rows={2}
          className="w-full px-2 py-1.5 text-[14px] text-[#333] bg-white border border-[#e5e7eb] rounded-md focus:outline-none focus:border-[#ff4f31] resize-y"
        />
      </div>

      {/* Photo Section */}
      <div className="bg-white rounded-[10px] p-4 sm:p-5 md:p-6 mb-5">
        <div className="mb-6 sm:mb-7">
          <h2 className="text-[#333] text-[15px] sm:text-[16px] mb-1">
            Vehicle Photo Capture ({capturedCount}/8)
          </h2>
          <p className="text-[#999] text-[12px]">
            Capture photos from all angles. At least 4 photos required.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {photoSlots.map((slot, index) => (
            <PhotoCaptureCard
              key={index}
              title={slot.title}
              required={slot.required}
              capturedImage={slot.capturedImage}
              isUploading={slot.isUploading}
              uploadError={slot.uploadError}
              disabled={isAnyUploading}
              onCapture={() => handleCapture(index)}
              onDelete={() => handleDelete(index)}
            />
          ))}
        </div>
      </div>

      {/* Entry Notes */}
      <div className="bg-white rounded-[10px] p-4 sm:p-5 md:p-6 mb-5">
        <div>
          <h3 className="text-[#333] text-[15px] sm:text-[16px] mb-2">Entry Notes</h3>
          <p className="text-[#999] text-[12px] mb-3">
            Add any observations about the vehicle condition
          </p>
          {/* Bound to damagesNotes — this box WAS unbound, so anything typed
              here was silently discarded and never pre-filled on edit. */}
          <textarea
            value={damagesNotes}
            onChange={(e) => setDamagesNotes(e.target.value)}
            placeholder="e.g., Minor scratch on left door, customer mentioned AC not cooling properly..."
            className="w-full h-28 sm:h-32 border border-[#e5e7eb] rounded-[10px] p-3 sm:p-4 text-[14px] text-[#333] placeholder:text-[#bfbfbf] resize-none outline-none focus:border-[#04c397]"
          />
        </div>
      </div>

      {/* Confirmation Section */}
      <div className="bg-white rounded-[10px] p-4 sm:p-5 md:p-6 mb-5">
        {validationError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-[10px]">
            <p className="text-red-600 text-[13px]">{validationError}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border border-[#e5e7eb] rounded-[10px] p-4 sm:p-5">
          <div className="flex items-start sm:items-center gap-3">
            <div className="flex justify-center items-center bg-[#3aa400] h-10 w-10 rounded-full p-2 shrink-0">
              <FileCheckCorner size={20} color="#fff" />
            </div>
            <div>
              <p className="text-[#333] text-[14px] sm:text-[16px]">Ready to confirm entry?</p>
              <p className={`text-[12px] ${!isValid ? "text-orange-600" : "text-[#999]"}`}>
                {!isValid
                  ? `${missingCount} required photo${missingCount !== 1 ? "s" : ""} missing`
                  : `Please capture at least ${Math.max(0, 4 - capturedCount)} more photo${Math.max(0, 4 - capturedCount) !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>

          <Button
            variant="gradient"
            icon={<CheckCircle className="w-5 h-5" />}
            onClick={handleConfirmEntry}
            disabled={!isValid || isAnyUploading}
          >
            {isEditing ? "Update Entry" : "Confirm Entry!"}
          </Button>
        </div>
      </div>

      <ConfirmVehicleEntryModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setConfirmError(null); }}
        onConfirm={handleModalConfirm}
        registration={customerData?.vehicleNumber || "BL 00 MY ZN"}
        owner={customerData ? (customerData.companyName || `${customerData.firstName} ${customerData.lastName}`.trim()) : "Ravi Varma"}
        photosCaptured={`${capturedCount}/8`}
        entryTime={entryTime}
        isConfirming={isConfirming}
        error={confirmError}
        initialShop={entryShop}
      />
    </>
  );
};

export default AddVehicle;
