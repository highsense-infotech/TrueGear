import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Button from "../common/Button";
import Modal from "../common/Modal";
import { updateVehicle } from "../../api/vehicle.api";
import type { VehicleListItem } from "../../api/appointment.api";

/**
 * Edit an existing vehicle from the customer's Assets tab.
 *
 * Scope is deliberately narrow: the fields below are the ones VehicleListItem
 * actually carries, so the form can be hydrated from data the Assets tab
 * already holds — no extra fetch, and no field rendered blank because the list
 * endpoint does not return it.
 *
 * NOT editable here, by design:
 *   • customerId — vehicle OWNERSHIP. Forty backend sites derive the customer
 *     (and so the RO owner, invoice payee and every dashboard name) by joining
 *     vehicles.customer_id. Moving it from an edit form would silently
 *     reassign all of that. The backend strips it from this endpoint too;
 *     transfers need their own deliberate workflow.
 *   • id / createdAt / createdBy — identity and audit.
 *
 * The appointment wizard has its own vehicle edit (AppointmentVehicleDetails),
 * which is booking-scoped and deliberately untouched.
 */

interface EditVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: VehicleListItem | null;
  /** Refetch the Assets data; awaited before the modal closes. */
  onSaved: () => Promise<void> | void;
}

interface VehicleForm {
  brand: string;
  model: string;
  manufacturingYear: string;
  registrationNumber: string;
  vin: string;
  fuelType: string;
  transmissionType: string;
  odometerLast: string;
}

const emptyForm: VehicleForm = {
  brand: "",
  model: "",
  manufacturingYear: "",
  registrationNumber: "",
  vin: "",
  fuelType: "",
  transmissionType: "",
  odometerLast: "",
};

const inputClass =
  "w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-[#E5E7EB] rounded-lg text-xs sm:text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent";
const inputErrorClass = inputClass.replace("border-[#E5E7EB]", "border-red-400");
const labelClass =
  "block text-xs sm:text-sm font-medium text-[#333] mb-1 sm:mb-1.5";

export function EditVehicleModal({
  isOpen,
  onClose,
  vehicle,
  onSaved,
}: EditVehicleModalProps) {
  const [form, setForm] = useState<VehicleForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Hydrate from the REAL vehicle each time the modal opens, so switching
  // between vehicles never shows the previous one's values.
  useEffect(() => {
    if (!isOpen || !vehicle) return;
    setForm({
      brand: vehicle.brand ?? "",
      model: vehicle.model ?? "",
      manufacturingYear: vehicle.manufacturingYear
        ? String(vehicle.manufacturingYear)
        : "",
      registrationNumber: vehicle.registrationNumber ?? "",
      vin: vehicle.vin ?? "",
      fuelType: vehicle.fuelType ?? "",
      transmissionType: vehicle.transmissionType ?? "",
      odometerLast:
        vehicle.odometerLast !== undefined && vehicle.odometerLast !== null
          ? String(vehicle.odometerLast)
          : "",
    });
    setErrors({});
  }, [isOpen, vehicle]);

  const set = (key: keyof VehicleForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: "" } : e));
  };

  /**
   * Mirrors the server's updateVehicleSchema so the user is told what is wrong
   * before a round trip. The backend remains the authority — this only avoids
   * an avoidable 400.
   */
  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.brand.trim()) next.brand = "Make is required";
    if (!form.model.trim()) next.model = "Model is required";
    if (!form.vin.trim()) next.vin = "VIN is required";

    if (form.manufacturingYear.trim()) {
      const y = Number(form.manufacturingYear);
      if (!Number.isInteger(y) || y < 1900 || y > 2100) {
        next.manufacturingYear = "Enter a year between 1900 and 2100";
      }
    }
    if (form.odometerLast.trim()) {
      const o = Number(form.odometerLast);
      if (!Number.isInteger(o) || o < 0) {
        next.odometerLast = "Odometer must be a whole number of 0 or more";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!vehicle || saving) return; // saving guard blocks a double submit
    if (!validate()) return;

    setSaving(true);
    try {
      // Only the editable fields are sent. customerId is never included.
      await updateVehicle(vehicle.id, {
        brand: form.brand.trim(),
        model: form.model.trim(),
        vin: form.vin.trim(),
        registrationNumber: form.registrationNumber.trim() || undefined,
        fuelType: form.fuelType.trim() || undefined,
        transmissionType: form.transmissionType.trim() || undefined,
        ...(form.manufacturingYear.trim()
          ? { manufacturingYear: Number(form.manufacturingYear) }
          : {}),
        ...(form.odometerLast.trim()
          ? { odometerLast: Number(form.odometerLast) }
          : {}),
      });
      toast.success("Vehicle updated");
      await onSaved();
      onClose();
    } catch (err: unknown) {
      // The backend returns a specific message for a duplicate VIN or
      // registration within this customer, and for a permission failure.
      // Surface it rather than a generic string — it names the field at fault.
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? "Could not update the vehicle.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Vehicle" size="md">
      <div className="space-y-3 sm:space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className={labelClass}>Make *</label>
            <input
              type="text"
              value={form.brand}
              onChange={(e) => set("brand", e.target.value)}
              className={errors.brand ? inputErrorClass : inputClass}
            />
            {errors.brand && (
              <p className="text-[11px] text-[#FE2B73] mt-1">{errors.brand}</p>
            )}
          </div>
          <div>
            <label className={labelClass}>Model *</label>
            <input
              type="text"
              value={form.model}
              onChange={(e) => set("model", e.target.value)}
              className={errors.model ? inputErrorClass : inputClass}
            />
            {errors.model && (
              <p className="text-[11px] text-[#FE2B73] mt-1">{errors.model}</p>
            )}
          </div>
        </div>

        <div>
          <label className={labelClass}>VIN *</label>
          <input
            type="text"
            value={form.vin}
            onChange={(e) => set("vin", e.target.value.toUpperCase())}
            className={errors.vin ? inputErrorClass : inputClass}
          />
          {errors.vin && (
            <p className="text-[11px] text-[#FE2B73] mt-1">{errors.vin}</p>
          )}
        </div>

        <div>
          <label className={labelClass}>Registration Number</label>
          <input
            type="text"
            value={form.registrationNumber}
            onChange={(e) =>
              set("registrationNumber", e.target.value.toUpperCase())
            }
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className={labelClass}>Manufacturing Year</label>
            <input
              type="number"
              value={form.manufacturingYear}
              onChange={(e) => set("manufacturingYear", e.target.value)}
              className={
                errors.manufacturingYear ? inputErrorClass : inputClass
              }
            />
            {errors.manufacturingYear && (
              <p className="text-[11px] text-[#FE2B73] mt-1">
                {errors.manufacturingYear}
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Odometer</label>
            <input
              type="number"
              value={form.odometerLast}
              onChange={(e) => set("odometerLast", e.target.value)}
              className={errors.odometerLast ? inputErrorClass : inputClass}
            />
            {errors.odometerLast && (
              <p className="text-[11px] text-[#FE2B73] mt-1">
                {errors.odometerLast}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className={labelClass}>Fuel Type</label>
            <input
              type="text"
              value={form.fuelType}
              onChange={(e) => set("fuelType", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Transmission</label>
            <input
              type="text"
              value={form.transmissionType}
              onChange={(e) => set("transmissionType", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 sm:gap-3 pt-3 sm:pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="text-xs sm:text-sm"
          >
            Cancel
          </Button>
          <Button
            variant="gradient"
            onClick={handleSave}
            disabled={saving}
            className="text-xs sm:text-sm"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
