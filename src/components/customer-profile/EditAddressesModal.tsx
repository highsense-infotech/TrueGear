import Button from "../common/Button";
import Modal from "../common/Modal";

interface AddressForm {
  billingAddress: string;
  shippingAddress: string;
  serviceAddress: string;
  geoCoordinates: string;
}

interface EditAddressesModalProps {
  isOpen: boolean;
  onClose: () => void;
  addressForm: AddressForm;
  setAddressForm: React.Dispatch<React.SetStateAction<AddressForm>>;
}

export function EditAddressesModal({
  isOpen,
  onClose,
  addressForm,
  setAddressForm,
}: EditAddressesModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Addresses"
      size="lg"
    >
      <div className="space-y-3 sm:space-y-4">
        <div>
          <label className="block text-xs sm:text-sm font-medium text-[#333] mb-1 sm:mb-1.5">
            Service Address
          </label>
          <textarea
            value={addressForm.serviceAddress}
            onChange={(e) =>
              setAddressForm({
                ...addressForm,
                serviceAddress: e.target.value,
              })
            }
            rows={3}
            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-[#E5E7EB] rounded-lg text-xs sm:text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent resize-none"
          />
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-medium text-[#333] mb-1 sm:mb-1.5">
            Shipping/Delivery Address
          </label>
          <textarea
            value={addressForm.shippingAddress}
            onChange={(e) =>
              setAddressForm({
                ...addressForm,
                shippingAddress: e.target.value,
              })
            }
            rows={3}
            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-[#E5E7EB] rounded-lg text-xs sm:text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent resize-none"
          />
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-medium text-[#333] mb-1 sm:mb-1.5">
            Geo Coordinates
          </label>
          <input
            type="text"
            value={addressForm.geoCoordinates}
            onChange={(e) =>
              setAddressForm({
                ...addressForm,
                geoCoordinates: e.target.value,
              })
            }
            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-[#E5E7EB] rounded-lg text-xs sm:text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
          />
          <p className="text-[10px] sm:text-xs text-[#8C8C8C] mt-1">
            <span className="font-semibold">Format:</span> latitude° N/S,
            longitude® E/W
          </p>
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-medium text-[#333] mb-1 sm:mb-1.5">
            Address Search & Location
          </label>
          <div className="bg-[#F6F6F6] border border-[#E5E7EB] p-3 sm:p-5">
            <label className="block text-xs sm:text-sm font-medium text-[#333] mb-1 sm:mb-1.5">
              Google Maps API Key
            </label>
            <input
              type="text"
              placeholder="Enter your Google Maps API key"
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border bg-white border-[#E5E7EB] rounded-lg text-xs sm:text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
            />
            <p className="text-[10px] sm:text-xs text-[#8C8C8C] mt-1">
              Get your API key from
              <span className="text-[#0061FF]">Google Cloud Console</span>
              and enable Places API
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 sm:gap-3 pt-3 sm:pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="text-xs sm:text-sm"
          >
            Cancel
          </Button>
          <Button
            variant="gradient"
            onClick={onClose}
            className="text-xs sm:text-sm"
          >
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}
