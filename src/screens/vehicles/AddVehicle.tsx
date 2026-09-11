import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { CheckCircle, FileCheckCorner, User, Car, ArrowLeft, Loader2, Camera, AlertCircle, X } from "lucide-react";
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
  scanLicence,
  scanOdometer,
  scanFuel,
} from "../../api/vehicle.api";

/** Lifecycle of a Gate Entry vision scan, shown next to the field it fills. */
type ScanStatus = "idle" | "scanning" | "success" | "partial" | "error";

/**
 * Inline status for a vision scan. Renders nothing while idle, so the form is
 * unchanged until a scan is actually run.
 */
const ScanStatusLine: React.FC<{ status: ScanStatus; message: string; busyText: string }> = ({
  status,
  message,
  busyText,
}) => {
  if (status === "idle") return null;
  if (status === "scanning") {
    return (
      <p className="flex items-center gap-1.5 mt-1.5 text-[11px] text-[#999]">
        <Loader2 className="w-3 h-3 animate-spin shrink-0" />
        {busyText}
      </p>
    );
  }
  const ok = status === "success";
  const colour = ok ? "text-[#16a34a]" : status === "partial" ? "text-[#d97706]" : "text-[#ff4f31]";
  const text = ok ? message || "Read from photo — check it is correct." : message;
  if (!text) return null;
  return (
    <p className={`flex items-start gap-1.5 mt-1.5 text-[11px] ${colour}`}>
      {ok ? (
        <CheckCircle className="w-3 h-3 shrink-0 mt-px" />
      ) : (
        <AlertCircle className="w-3 h-3 shrink-0 mt-px" />
      )}
      <span>{text}</span>
    </p>
  );
};

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

  // ─── Gate Entry vision scans ───────────────────────────────────────────────
  // Each scan runs on the RAW capture, in parallel with the normal stamped
  // upload, and may only ever FILL a field the user has not already set.
  const [licenceScanStatus, setLicenceScanStatus] = useState<ScanStatus>("idle");
  const [odometerScanStatus, setOdometerScanStatus] = useState<ScanStatus>("idle");
  const [odometerScanMessage, setOdometerScanMessage] = useState("");

  // Odometer protections. `odoCaptureIdRef` makes a superseded response
  // discardable; `odoUserTouchedRef` makes a manual edit permanently win.
  const odoCaptureIdRef = useRef(0);
  const odoUserTouchedRef = useRef(false);

  // Driver-licence photo captured at Gate Entry. Persisted as the
  // "Driver Licence" vehicle image, matching the reference implementation.
  const [licenceImg, setLicenceImg] = useState<{ imageId: string | null; url: string | null; uploading: boolean }>(
    { imageId: null, url: null, uploading: false },
  );
  const [licenceCameraOpen, setLicenceCameraOpen] = useState(false);

  // Fuel-gauge scan. Same two protections as the odometer: a superseded capture
  // is discarded, and a manual Fuel Level selection permanently wins.
  const [fuelScanStatus, setFuelScanStatus] = useState<ScanStatus>("idle");
  const [fuelImg, setFuelImg] = useState<{ imageId: string | null; url: string | null; uploading: boolean }>(
    { imageId: null, url: null, uploading: false },
  );
  const [fuelCameraOpen, setFuelCameraOpen] = useState(false);
  const fuelCaptureIdRef = useRef(0);
  const fuelUserTouchedRef = useRef(false);

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
  const handleCameraCapture = async (file: File, captured: CapturedPhoto, rawFile?: File) => {
    if (activeSlot === null) return;
    const slotIndex = activeSlot;
    setCameraOpen(false);

    // Vision scans read the RAW frame, before the GPS overlay is burned in —
    // the stamp sits over the plate / instrument cluster. They run in parallel
    // with the stamp+upload below and can never affect it.
    // The number plate is scanned from the Security Dashboard's
    // "Capture Number Plate" flow, not here — by the time Gate Entry is open
    // the vehicle has already been identified.
    if (photoSlots[slotIndex]?.title === "Odometer Reading (KM)") {
      void runOdometerScan(rawFile ?? file);
    }

    await processCapturedFile(file, slotIndex, captured);
    setActiveSlot(null);
  };

  // ─── Gate Entry vision scans ─────────────────────────────────────────────

  /** Human-readable text for a backend rejection code. */
  const scanReasonText = (reason: string | null, subject: string): string => {
    switch (reason) {
      case "NO_NUMBER_PLATE_DETECTED":
        return "No number plate found in that photo.";
      case "NO_LICENCE_DETECTED":
        return "That doesn't look like a driving licence.";
      case "NO_ODOMETER":
        return "No odometer reading found in that photo.";
      case "PLATE_NOT_READABLE":
      case "NOT_READABLE":
        return `The ${subject} could not be read clearly — try again.`;
      case "INVALID_REGISTRATION":
        return "That registration is not a recognised SA format.";
      case "IMPLAUSIBLE_VALUE":
        return "That odometer value looks wrong — enter it manually.";
      case "LOW_CONFIDENCE":
        return `Not confident enough reading the ${subject} — enter it manually.`;
      case "IMAGE_TOO_LARGE":
        return "That photo is too large to scan.";
      case "UNSUPPORTED_FORMAT":
        return "That image format is not supported.";
      default:
        return `Could not scan the ${subject} — enter it manually.`;
    }
  };

  /**
   * Fuel gauge → OCR → one of the five levels.
   *
   * Two protections, both required:
   *  * STALE    — a newer capture bumps the id; an older response arriving
   *               afterwards is discarded.
   *  * OVERRIDE — picking a Fuel Level by hand sets the touched flag, after
   *               which a resolving scan must never change the selection.
   * The manual pills are never disabled while a scan runs.
   */
  const handleFuelCapture = async (file: File, captured: CapturedPhoto, rawFile?: File) => {
    setFuelCameraOpen(false);
    const captureId = ++fuelCaptureIdRef.current;
    fuelUserTouchedRef.current = false;
    setFuelScanStatus("scanning");

    // OCR on the RAW frame, in parallel with the upload below.
    void (async () => {
      try {
        const res = await scanFuel(rawFile ?? file);
        if (captureId !== fuelCaptureIdRef.current) return; // superseded
        const d = res.data;
        if (!d || !d.fuelLevel || d.reason !== null) {
          setFuelScanStatus("error");
          return;
        }
        if (!fuelUserTouchedRef.current) setFuelLevel(d.fuelLevel);
        setFuelScanStatus("success");
      } catch {
        if (captureId !== fuelCaptureIdRef.current) return;
        setFuelScanStatus("error");
      }
    })();

    if (!vehicleId) return;
    setFuelImg((cur) => ({ ...cur, uploading: true }));
    try {
      const meta = {
        capturedAt: captured.capturedAt,
        gpsLat: captured.gpsLat,
        gpsLng: captured.gpsLng,
        gpsAccuracyM: captured.gpsAccuracyM,
        addressText: captured.addressText,
        deviceUserAgent: captured.deviceUserAgent,
      };
      const res = fuelImg.imageId
        ? await replaceVehicleImage(vehicleId, fuelImg.imageId, file, "Fuel Indicator", meta)
        : await uploadVehicleImages(vehicleId, [file], "Fuel Indicator", meta);
      const uploaded = fuelImg.imageId
        ? (res.data as { id: string; imagePath: string } | undefined)
        : (res.data as { uploaded: { id: string; imagePath: string }[] } | undefined)?.uploaded?.[0];
      if (uploaded) {
        setFuelImg({ imageId: uploaded.id, url: uploaded.imagePath, uploading: false });
        return;
      }
      setFuelImg((cur) => ({ ...cur, uploading: false }));
    } catch {
      setFuelImg((cur) => ({ ...cur, uploading: false }));
      toast.error("Could not upload the fuel gauge photo.");
    }
  };

  /** Detach the fuel photo, deleting it server-side when it was uploaded. */
  const removeFuelImage = async () => {
    if (fuelImg.imageId && vehicleId) {
      try {
        await deleteVehicleImage(vehicleId, fuelImg.imageId);
      } catch {
        /* best-effort */
      }
    }
    setFuelImg({ imageId: null, url: null, uploading: false });
    setFuelScanStatus("idle");
  };

  /** Detach the licence photo, deleting it server-side when it was uploaded. */
  const removeLicenceImage = async () => {
    if (licenceImg.imageId && vehicleId) {
      try {
        await deleteVehicleImage(vehicleId, licenceImg.imageId);
      } catch {
        /* best-effort — the local reference is cleared either way */
      }
    }
    setLicenceImg({ imageId: null, url: null, uploading: false });
    setLicenceScanStatus("idle");
  };

  /**
   * Odometer photo → OCR → km.
   *
   * Two protections, both required:
   *  * STALE    — a newer capture bumps the id; an older response that arrives
   *               afterwards is discarded.
   *  * OVERRIDE — a manual edit sets the touched flag, after which a resolving
   *               scan must never overwrite what the user typed.
   */
  const runOdometerScan = async (file: File) => {
    const captureId = ++odoCaptureIdRef.current;
    odoUserTouchedRef.current = false;
    setOdometerScanStatus("scanning");
    setOdometerScanMessage("");
    try {
      const res = await scanOdometer(file);
      if (captureId !== odoCaptureIdRef.current) return; // superseded
      const d = res.data;
      if (!d || d.odometer == null || d.reason !== null) {
        setOdometerScanStatus("error");
        setOdometerScanMessage(scanReasonText(d?.reason ?? null, "odometer"));
        return;
      }
      if (!odoUserTouchedRef.current) setOdometerInput(String(d.odometer));
      setOdometerScanStatus("success");
      setOdometerScanMessage("");
    } catch {
      if (captureId !== odoCaptureIdRef.current) return;
      setOdometerScanStatus("error");
      setOdometerScanMessage("Could not scan the odometer — enter it manually.");
    }
  };

  /**
   * Driver licence → OCR → name + licence number.
   *
   * Prefill NEVER clobbers: a value the user typed, or one restored from an
   * active check-in, always wins. The photo is also stored as the
   * "Driver Licence" vehicle image, matching the reference implementation.
   */
  const handleLicenceCapture = async (file: File, captured: CapturedPhoto, rawFile?: File) => {
    setLicenceCameraOpen(false);
    setLicenceScanStatus("scanning");

    // OCR on the RAW frame, in parallel with the upload below.
    void (async () => {
      try {
        const res = await scanLicence(rawFile ?? file);
        const d = res.data;
        if (!d || !d.isLicence || d.reason !== null) {
          setLicenceScanStatus("error");
          return;
        }
        // Functional updates guarantee we read the latest value and never
        // clobber an existing entry.
        if (d.name) setDriverName((prev) => (prev.trim() ? prev : d.name!));
        if (d.licenceNumber) {
          setDriverLicenceNo((prev) => (prev.trim() ? prev : d.licenceNumber!));
        }
        const complete = !!d.name && !!d.licenceNumber;
        setLicenceScanStatus(complete ? "success" : "partial");
      } catch {
        setLicenceScanStatus("error");
      }
    })();

    // Persist the stamped photo under the "Driver Licence" category. Requires
    // a vehicle; on a not-yet-created entry the scan still works, the photo is
    // simply not stored.
    if (!vehicleId) return;
    setLicenceImg((cur) => ({ ...cur, uploading: true }));
    try {
      const meta = {
        capturedAt: captured.capturedAt,
        gpsLat: captured.gpsLat,
        gpsLng: captured.gpsLng,
        gpsAccuracyM: captured.gpsAccuracyM,
        addressText: captured.addressText,
        deviceUserAgent: captured.deviceUserAgent,
      };
      const res = licenceImg.imageId
        ? await replaceVehicleImage(vehicleId, licenceImg.imageId, file, "Driver Licence", meta)
        : await uploadVehicleImages(vehicleId, [file], "Driver Licence", meta);
      const uploaded = licenceImg.imageId
        ? (res.data as { id: string; imagePath: string } | undefined)
        : (res.data as { uploaded: { id: string; imagePath: string }[] } | undefined)?.uploaded?.[0];
      if (uploaded) {
        setLicenceImg({ imageId: uploaded.id, url: uploaded.imagePath, uploading: false });
        return;
      }
      setLicenceImg((cur) => ({ ...cur, uploading: false }));
    } catch {
      setLicenceImg((cur) => ({ ...cur, uploading: false }));
      toast.error("Could not upload the licence photo.");
    }
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

      {/* Driver-licence capture. Separate instance so it never interferes with
          the photo-slot grid's own camera state. */}
      <LiveCameraCapture
        isOpen={licenceCameraOpen}
        title="Driver Licence"
        onClose={() => setLicenceCameraOpen(false)}
        onCapture={handleLicenceCapture}
      />

      {/* Fuel-gauge capture. Separate instance so it never interferes with the
          photo-slot grid or the licence camera. */}
      <LiveCameraCapture
        isOpen={fuelCameraOpen}
        title="Fuel Gauge"
        onClose={() => setFuelCameraOpen(false)}
        onCapture={handleFuelCapture}
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
                  onChange={(e) => {
                    // Any manual edit permanently wins over an in-flight scan.
                    odoUserTouchedRef.current = true;
                    setOdometerInput(e.target.value);
                  }}
                  // Blur on wheel so scrolling the page never edits the reading.
                  onWheel={(e) => e.currentTarget.blur()}
                  className={`no-spinner w-full pl-2 pr-8 py-1 text-[14px] font-medium text-[#333] bg-white border rounded-md focus:outline-none focus:border-[#ff4f31] ${
                    !odometerInput ? "border-[#ff4f31]" : "border-[#e5e7eb]"
                  }`}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-[#999]">km</span>
              </div>
              <ScanStatusLine
                status={odometerScanStatus}
                message={odometerScanMessage}
                busyText="Reading odometer…"
              />
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

        {/* Driver Licence Photo — capture the card, OCR pre-fills ONLY empty
            Driver Name / Licence # fields above. The upload and the OCR are
            independent: a failed scan never affects the stored photo. */}
        <div className="mb-3">
          <label className="text-[11px] text-[#999] mb-1 block">Driver Licence Photo</label>
          <div className="flex items-center gap-2">
            {licenceImg.url && (
              <div className="relative">
                <img
                  src={licenceImg.url}
                  alt="Driver licence"
                  className="w-14 h-14 object-cover rounded border border-[#e5e7eb]"
                />
                <button
                  type="button"
                  onClick={removeLicenceImage}
                  className="absolute -top-1 -right-1 bg-white border border-[#e5e7eb] rounded-full w-4 h-4 flex items-center justify-center text-[#ef4444]"
                  title="Remove"
                >
                  <X size={10} />
                </button>
              </div>
            )}
            <button
              type="button"
              disabled={licenceImg.uploading}
              onClick={() => setLicenceCameraOpen(true)}
              className={`flex items-center gap-1 text-[11px] border border-dashed border-[#e5e7eb] rounded px-2 py-2 disabled:cursor-not-allowed ${licenceImg.uploading ? "opacity-60 text-[#999]" : "cursor-pointer text-[#666] hover:text-[#ff4f31]"}`}
            >
              {licenceImg.uploading ? (
                <><Loader2 size={12} className="animate-spin" /> Uploading…</>
              ) : (
                <><Camera size={12} /> {licenceImg.url ? "Change photo" : "Add photo"}</>
              )}
            </button>
          </div>

          {/* OCR auto-fill status — inline, minimal. Does not affect the upload. */}
          {licenceScanStatus === "scanning" && (
            <p className="mt-1.5 text-[11px] text-[#666] flex items-center gap-1">
              <Loader2 size={11} className="animate-spin" /> Scanning licence…
            </p>
          )}
          {licenceScanStatus === "success" && (
            <p className="mt-1.5 text-[11px] text-[#1DB401]">Auto-filled from licence — please verify</p>
          )}
          {licenceScanStatus === "partial" && (
            <p className="mt-1.5 text-[11px] text-[#E89D00]">
              Some licence details could not be detected. Please verify.
            </p>
          )}
          {licenceScanStatus === "error" && (
            <p className="mt-1.5 text-[11px] text-[#ef4444]">
              Couldn't read the licence — please enter details manually.
            </p>
          )}
        </div>

        <label className="text-[11px] text-[#999] mb-1 block">Fuel Level</label>
        <div className="flex gap-1.5 mb-3">
          {(["EMPTY", "QUARTER", "HALF", "THREE_QUARTER", "FULL"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                // Manual selection wins over any in-flight AI result.
                fuelUserTouchedRef.current = true;
                setFuelLevel(fuelLevel === f ? "" : f);
              }}
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

        {/* Fuel Gauge Photo — vision classifies the gauge and auto-selects the
            Fuel Level above. The manual pills stay enabled throughout, and a
            manual pick always wins over a resolving scan. */}
        <div className="mb-3">
          <label className="text-[11px] text-[#999] mb-1 block">Fuel Gauge Photo</label>
          <div className="flex items-center gap-2">
            {fuelImg.url && (
              <div className="relative">
                <img src={fuelImg.url} alt="Fuel gauge" className="w-14 h-14 object-cover rounded border border-[#e5e7eb]" />
                <button
                  type="button"
                  onClick={removeFuelImage}
                  className="absolute -top-1 -right-1 bg-white border border-[#e5e7eb] rounded-full w-4 h-4 flex items-center justify-center text-[#ef4444]"
                  title="Remove"
                >
                  <X size={10} />
                </button>
              </div>
            )}
            <button
              type="button"
              disabled={fuelImg.uploading}
              onClick={() => setFuelCameraOpen(true)}
              className={`flex items-center gap-1 text-[11px] border border-dashed border-[#e5e7eb] rounded px-2 py-2 disabled:cursor-not-allowed ${fuelImg.uploading ? "opacity-60 text-[#999]" : "cursor-pointer text-[#666] hover:text-[#ff4f31]"}`}
            >
              {fuelImg.uploading ? (
                <><Loader2 size={12} className="animate-spin" /> Uploading…</>
              ) : (
                <><Camera size={12} /> {fuelImg.url ? "Change photo" : "Add photo"}</>
              )}
            </button>
          </div>

          {/* Fuel-gauge vision status — inline, minimal. Does not affect upload
              and never disables the manual Fuel Level controls above. */}
          {fuelScanStatus === "scanning" && (
            <p className="mt-1.5 text-[11px] text-[#666] flex items-center gap-1">
              <Loader2 size={11} className="animate-spin" /> Analyzing fuel level…
            </p>
          )}
          {fuelScanStatus === "success" && (
            <p className="mt-1.5 text-[11px] text-[#1DB401]">Fuel level detected — please verify</p>
          )}
          {fuelScanStatus === "error" && (
            <p className="mt-1.5 text-[11px] text-[#E89D00]">
              Could not detect fuel level. Please select manually.
            </p>
          )}
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
