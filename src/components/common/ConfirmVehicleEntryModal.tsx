import { CheckCircle, Loader2 } from 'lucide-react';
import Button from './Button';

interface ConfirmVehicleEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  registration: string;
  owner: string;
  photosCaptured: string;
  entryTime: string;
  isConfirming?: boolean;
  error?: string | null;
}

export function ConfirmVehicleEntryModal({
  isOpen,
  onClose,
  onConfirm,
  registration,
  owner,
  photosCaptured,
  entryTime,
  isConfirming = false,
  error,
}: ConfirmVehicleEntryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-7.5 w-125 shadow-xl">
        {/* Title */}
        <h2 className="text-[#333] text-[20px] mb-2">Confirm Vehicle Entry</h2>
        <p className="text-[#999] text-[14px] mb-7.5">
          This will register the vehicle for service and notify the Quality check team.
        </p>

        {/* Information Grid */}
        <div className="grid grid-cols-2 gap-x-10 gap-y-5 mb-7.5">
          <div>
            <p className="text-[#999] text-[12px] mb-1.25">Registration</p>
            <p className="text-[#333] text-[16px]">{registration}</p>
          </div>
          <div>
            <p className="text-[#999] text-[12px] mb-1.25">Owner</p>
            <p className="text-[#333] text-[16px]">{owner}</p>
          </div>
          <div>
            <p className="text-[#999] text-[12px] mb-1.25">Photos Captured</p>
            <p className="text-[#333] text-[16px]">{photosCaptured}</p>
          </div>
          <div>
            <p className="text-[#999] text-[12px] mb-1.25">Entry time</p>
            <p className="text-[#333] text-[16px]">{entryTime}</p>
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
          <Button variant="outline" onClick={onClose} disabled={isConfirming}>
            Cancel
          </Button>
          <Button
            variant="gradient"
            onClick={onConfirm}
            disabled={isConfirming}
            icon={isConfirming ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
          >
            {isConfirming ? "Confirming..." : "Confirm Entry!"}
          </Button>
        </div>
      </div>
    </div>
  );
}
