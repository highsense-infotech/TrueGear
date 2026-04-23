import Button from "../common/Button";
import Modal from "../common/Modal";

interface ProfileForm {
  fullName: string;
  primaryContact: string;
  email: string;
  phone: string;
  alternatePhone: string;
}

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileForm: ProfileForm;
  setProfileForm: React.Dispatch<React.SetStateAction<ProfileForm>>;
}

export function EditProfileModal({
  isOpen,
  onClose,
  profileForm,
  setProfileForm,
}: EditProfileModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Profile"
      size="md"
    >
      <div className="space-y-3 sm:space-y-4">
        <div>
          <label className="block text-xs sm:text-sm font-medium text-[#333] mb-1 sm:mb-1.5">
            Full Name / Business
          </label>
          <input
            type="text"
            value={profileForm.fullName}
            onChange={(e) =>
              setProfileForm({ ...profileForm, fullName: e.target.value })
            }
            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-[#E5E7EB] rounded-lg text-xs sm:text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-medium text-[#333] mb-1 sm:mb-1.5">
            Primary Contact
          </label>
          <input
            type="text"
            value={profileForm.primaryContact}
            onChange={(e) =>
              setProfileForm({
                ...profileForm,
                primaryContact: e.target.value,
              })
            }
            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-[#E5E7EB] rounded-lg text-xs sm:text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-medium text-[#333] mb-1 sm:mb-1.5">
            Email (Primary)
          </label>
          <input
            type="email"
            value={profileForm.email}
            onChange={(e) =>
              setProfileForm({ ...profileForm, email: e.target.value })
            }
            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-[#E5E7EB] rounded-lg text-xs sm:text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-medium text-[#333] mb-1 sm:mb-1.5">
            Phone (Primary)
          </label>
          <input
            type="text"
            value={profileForm.phone}
            onChange={(e) =>
              setProfileForm({ ...profileForm, phone: e.target.value })
            }
            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-[#E5E7EB] rounded-lg text-xs sm:text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-medium text-[#333] mb-1 sm:mb-1.5">
            Alternate Phone
          </label>
          <input
            type="text"
            value={profileForm.alternatePhone}
            onChange={(e) =>
              setProfileForm({
                ...profileForm,
                alternatePhone: e.target.value,
              })
            }
            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-[#E5E7EB] rounded-lg text-xs sm:text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
          />
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
