import { useState } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import Button from './Button';

export type EntryShop = 'SERVICE' | 'MAJOR' | 'PDI';

interface ConfirmVehicleEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (shop: EntryShop) => void;
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
  // Shop the vehicle is routed to at the gate. Drives Major/Service scoping
  // for foreman/controller. Defaults to SERVICE.
  const [shop, setShop] = useState<EntryShop>('SERVICE');
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

        {/* Shop routing — picks which workshop (and which foreman/controller
            scope) this vehicle belongs to. */}
        <div className="mb-6">
          <p className="text-[#999] text-[12px] mb-1.5">Route to Shop</p>
          <div className="flex gap-2">
            {(['SERVICE', 'MAJOR', 'PDI'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setShop(s)}
                disabled={isConfirming}
                className={`flex-1 h-11 rounded-[10px] border text-[14px] font-medium transition-colors ${
                  shop === s
                    ? 'border-[#ff4f31] bg-[#fff5f2] text-[#ff4f31]'
                    : 'border-[#e5e7eb] bg-white text-[#555] hover:bg-[#fafafa]'
                }`}
              >
                {s === 'SERVICE' ? 'Service' : s === 'MAJOR' ? 'Major' : 'PDI'}
              </button>
            ))}
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
            onClick={() => onConfirm(shop)}
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
