import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Button from "../common/Button";
import Modal from "../common/Modal";
import { updateCustomer } from "../../api/customer.api";
import type { CustomerFullDetail } from "../../api/customer.api";

/**
 * Edit an existing customer.
 *
 * REBUILT. The previous version held five hardcoded demo values
 * ("Anderson Automotive Solutions Inc", a San Francisco address, US phone
 * numbers) that were never replaced with the loaded customer, and its Save
 * button was `onClick={onClose}` — so it displayed one fictional business for
 * every customer and silently discarded any edit. Wiring that Save would have
 * written the demo values over a real record.
 *
 * FIELD SCOPE — deliberately limited to what the API round-trips.
 * The lookup endpoint (customers/service.ts) selects exactly nine columns, so
 * these are the only fields that can be hydrated from real data:
 *   firstName, lastName, companyName, primaryEmail, customerType, activeCustomer
 *
 * regNo (company) and idNumber (individual) ARE included: getCustomerDetails
 * uses a bare .select(), so both come back with real values, and the Evolve
 * merge overlays exactly one of the two based on the selected customer type.
 *
 * Intentionally NOT included:
 *   • title, initial, taxNo — accepted by the update schema but not surfaced
 *     here. Showing a field the read does not populate would render blank for
 *     every customer and a save would wipe the stored value.
 *   • contacts[] — phone lives in a separate table with a contactType
 *     discriminator. The old modal's "primaryContact" / "alternatePhone"
 *     strings have no defined mapping onto it; guessing one risks overwriting
 *     or duplicating contact rows.
 *   • addresses[] — see EditAddressesModal; deferred for the same reason.
 *
 * Immutable identity (id, crmReferenceNo, custSequenceId) is shown read-only:
 * useful context, and the backend schema is .strict() so it would reject them
 * anyway.
 */

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerFullDetail | null;
  /** Refetch the profile; awaited before the modal closes. */
  onSaved: () => Promise<void> | void;
}

interface ProfileForm {
  firstName: string;
  lastName: string;
  companyName: string;
  primaryEmail: string;
  customerType: string;
  activeCustomer: boolean;
  regNo: string;
  idNumber: string;
}

const emptyForm: ProfileForm = {
  firstName: "",
  lastName: "",
  companyName: "",
  primaryEmail: "",
  customerType: "",
  activeCustomer: true,
  regNo: "",
  idNumber: "",
};

const inputClass =
  "w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-[#E5E7EB] rounded-lg text-xs sm:text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent";
const inputErrorClass = inputClass.replace("border-[#E5E7EB]", "border-red-400");
const labelClass =
  "block text-xs sm:text-sm font-medium text-[#333] mb-1 sm:mb-1.5";

export function EditProfileModal({
  isOpen,
  onClose,
  customer,
  onSaved,
}: EditProfileModalProps) {
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Hydrate from the REAL customer every time the modal opens.
  useEffect(() => {
    if (!isOpen || !customer) return;
    setForm({
      firstName: customer.firstName ?? "",
      lastName: customer.lastName ?? "",
      companyName: customer.companyName ?? "",
      primaryEmail: customer.primaryEmail ?? "",
      customerType: customer.customerType ?? "",
      activeCustomer: customer.activeCustomer ?? true,
      regNo: customer.regNo ?? "",
      idNumber: customer.idNumber ?? "",
    });
    setErrors({});
  }, [isOpen, customer]);

  const set = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: "" } : e));
  };

  const isCompany = form.customerType === "C";

  /**
   * Mirrors the backend rules: a company is identified by its company name,
   * an individual by their own name (the superRefine on the customer schema).
   * The server stays the authority; this avoids an avoidable round trip.
   */
  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (isCompany) {
      if (!form.companyName.trim()) next.companyName = "Company name is required";
    } else {
      if (!form.firstName.trim()) next.firstName = "First name is required";
      if (!form.lastName.trim()) next.lastName = "Last name is required";
    }
    if (
      form.primaryEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.primaryEmail.trim())
    ) {
      next.primaryEmail = "Enter a valid email address";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!customer || saving) return; // saving guard blocks a double submit
    if (!validate()) return;

    setSaving(true);
    try {
      await updateCustomer(customer.id, {
        firstName: form.firstName.trim() || null,
        lastName: form.lastName.trim() || null,
        companyName: form.companyName.trim() || null,
        primaryEmail: form.primaryEmail.trim() || null,
        customerType: form.customerType || undefined,
        activeCustomer: form.activeCustomer,
        // Only the identifier matching the selected type is sent, mirroring how
        // the backend overlays RegNo (company) vs IDNumber (individual).
        // Sending both would put a company registration number into an
        // individual's ID field in Evolve.
        ...(isCompany
          ? { regNo: form.regNo.trim() || null }
          : { idNumber: form.idNumber.trim() || null }),
      });
      toast.success("Customer updated");
      await onSaved();
      onClose();
    } catch (err: unknown) {
      // 403 (missing CUSTOMER_PROFILE:edit) and 400 (validation) both arrive
      // in this shape; showing the server's own message names the field.
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? "Could not update the customer.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile" size="md">
      <div className="space-y-3 sm:space-y-4">
        {/* Read-only identity. Shown for context; the backend rejects any
            attempt to change these, since they key the Evolve record. */}
        {customer && (
          <div className="rounded-lg bg-[#f5f5f5] px-3 py-2.5 text-[11px] sm:text-xs text-[#666] space-y-0.5">
            <div>
              CRM Reference:{" "}
              <span className="text-[#333] font-medium">
                {customer.crmReferenceNo || "—"}
              </span>
            </div>
            <div>
              Evolve Sequence ID:{" "}
              <span className="text-[#333] font-medium">
                {customer.custSequenceId || "—"}
              </span>
            </div>
          </div>
        )}

        <div>
          <label className={labelClass}>Customer Type</label>
          <select
            value={form.customerType}
            onChange={(e) => set("customerType", e.target.value)}
            className={inputClass}
          >
            <option value="I">Individual</option>
            <option value="C">Company</option>
          </select>
        </div>

        {isCompany ? (
          <div>
            <label className={labelClass}>Company Name *</label>
            <input
              type="text"
              value={form.companyName}
              onChange={(e) => set("companyName", e.target.value)}
              className={errors.companyName ? inputErrorClass : inputClass}
            />
            {errors.companyName && (
              <p className="text-[11px] text-[#FE2B73] mt-1">
                {errors.companyName}
              </p>
            )}
            {/* Company registration number → Evolve RegNo. Inside the company
                branch so switching type cannot send it for an individual. */}
            <label className={`${labelClass} mt-3 sm:mt-4`}>
              Company Reg No
            </label>
            <input
              type="text"
              value={form.regNo}
              onChange={(e) => set("regNo", e.target.value)}
              className={inputClass}
              maxLength={30}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className={labelClass}>First Name *</label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                className={errors.firstName ? inputErrorClass : inputClass}
              />
              {errors.firstName && (
                <p className="text-[11px] text-[#FE2B73] mt-1">
                  {errors.firstName}
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>Last Name *</label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                className={errors.lastName ? inputErrorClass : inputClass}
              />
              {errors.lastName && (
                <p className="text-[11px] text-[#FE2B73] mt-1">
                  {errors.lastName}
                </p>
              )}
            </div>
            {/* ID Number → Evolve IDNumber. Spans both grid columns so it
                lines up with the single-column fields below. */}
            <div className="sm:col-span-2">
              <label className={labelClass}>ID Number</label>
              <input
                type="text"
                value={form.idNumber}
                onChange={(e) => set("idNumber", e.target.value)}
                className={inputClass}
                maxLength={20}
              />
            </div>
          </div>
        )}

        <div>
          <label className={labelClass}>Email (Primary)</label>
          <input
            type="email"
            value={form.primaryEmail}
            onChange={(e) => set("primaryEmail", e.target.value)}
            className={errors.primaryEmail ? inputErrorClass : inputClass}
          />
          {errors.primaryEmail && (
            <p className="text-[11px] text-[#FE2B73] mt-1">
              {errors.primaryEmail}
            </p>
          )}
        </div>

        <label className="flex items-center gap-2 text-xs sm:text-sm text-[#333]">
          <input
            type="checkbox"
            checked={form.activeCustomer}
            onChange={(e) => set("activeCustomer", e.target.checked)}
            className="w-4 h-4 accent-[#ff4f31]"
          />
          Active customer
        </label>

        {/* Phone and address are edited elsewhere: both live in separate
            tables whose mapping from this screen's free-text fields is
            undefined. Stated plainly so the omission does not read as a bug. */}
        <p className="text-[11px] text-[#999]">
          Phone numbers and addresses are not editable here yet.
        </p>

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
