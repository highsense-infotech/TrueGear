import { Trash2, Loader2 } from 'lucide-react';
import Button from './Button';

type DeleteVariant = 'cancel-entry' | 'delete-vehicle';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  registration: string;
  model: string;
  isDeleting?: boolean;
  error?: string | null;
  variant?: DeleteVariant;
}

const VARIANT_CONTENT: Record<DeleteVariant, { title: string; description: string; buttonLabel: string; loadingLabel: string }> = {
  'cancel-entry': {
    title: 'Cancel Entry',
    description: 'Are you sure you want to cancel this vehicle entry? The vehicle record will be preserved.',
    buttonLabel: 'Cancel Entry',
    loadingLabel: 'Cancelling...',
  },
  'delete-vehicle': {
    title: 'Delete Vehicle',
    description: 'This will permanently remove the vehicle and all associated records. This action cannot be undone.',
    buttonLabel: 'Delete Vehicle',
    loadingLabel: 'Deleting...',
  },
};

export function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  registration,
  model,
  isDeleting = false,
  error,
  variant = 'cancel-entry',
}: ConfirmDeleteModalProps) {
  if (!isOpen) return null;

  const content = VARIANT_CONTENT[variant];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-7.5 w-125 shadow-xl">
        {/* Icon */}
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <Trash2 className="w-6 h-6 text-red-500" />
        </div>

        {/* Title */}
        <h2 className="text-[#333] text-[20px] mb-2">{content.title}</h2>
        <p className="text-[#999] text-[14px] mb-7.5">{content.description}</p>

        {/* Vehicle Info */}
        <div className="grid grid-cols-2 gap-x-10 gap-y-5 mb-7.5">
          <div>
            <p className="text-[#999] text-[12px] mb-1.25">Registration</p>
            <p className="text-[#333] text-[16px]">{registration}</p>
          </div>
          <div>
            <p className="text-[#999] text-[12px] mb-1.25">Model</p>
            <p className="text-[#333] text-[16px]">{model}</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-[10px]">
            <p className="text-red-600 text-[13px]">{error}</p>
          </div>
        )}

        {/* Horizontal Line */}
        <div className="border-t border-[#CACACA] my-6"></div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="custom"
            className="bg-red-500! text-white! hover:bg-red-600! px-6!"
            onClick={onConfirm}
            disabled={isDeleting}
            icon={isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
          >
            {isDeleting ? content.loadingLabel : content.buttonLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
