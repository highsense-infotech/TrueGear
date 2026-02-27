
import { Camera, StickyNote, Loader2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import Button from '../common/Button';

interface ChecklistItemProps {
  label: string;
  description?: string;
  status?: 'pass' | 'fail' | 'na' | null;
  onStatusChange?: (status: 'pass' | 'fail' | 'na' | null) => void;
  onPhotoUpload?: (file: File) => Promise<void>;
  photoUrl?: string;
}

export function ChecklistItem({ label, description, status: externalStatus, onStatusChange, onPhotoUpload, photoUrl }: ChecklistItemProps) {
  const [internalStatus, setInternalStatus] = useState<'pass' | 'fail' | 'na' | null>(externalStatus || null);
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync internal state with external status prop
  useEffect(() => {
    if (externalStatus !== undefined) {
      setInternalStatus(externalStatus);
    }
  }, [externalStatus]);

  // Determine which status to display
  const currentStatus = externalStatus !== undefined ? externalStatus : internalStatus;

  const handleStatusChange = (newStatus: 'pass' | 'fail' | 'na') => {
    // Toggle: if clicking same status, clear it
    const updatedStatus = currentStatus === newStatus ? null : newStatus;
    setInternalStatus(updatedStatus);
    onStatusChange?.(updatedStatus);
  };

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onPhotoUpload) return;

    // Show local preview immediately
    const reader = new FileReader();
    reader.onloadend = () => setLocalPreview(reader.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      await onPhotoUpload(file);
    } catch (err) {
      console.error("Failed to upload photo:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-3.75 px-5 border-b border-[#ebebeb] last:border-0 gap-3 sm:gap-0">
      {/* Checkbox + Label */}
      <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
        <div className="w-5 h-5 rounded border-2 border-[#D9D9D9] shrink-0 cursor-pointer hover:border-[#999]" />
        <div>
          <p className="text-[#333] text-[14px] mb-0.5">{label}</p>
          {description && <p className="text-[#999] text-[12px]">{description}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
        {/* Status Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-[#EFEFEF] p-1.25 border border-[#DBDBDB] rounded-[10px]">
          <Button
            variant="custom"
            onClick={() => handleStatusChange('pass')}
            className={`px-2 sm:px-4 h-9.5! rounded-md text-[12px] sm:text-[14px] font-medium transition-colors ${
              currentStatus === 'pass'
                ? 'bg-linear-to-r from-[#7CE000] to-[#03A800] text-white border border-[#EBEBEB] shadow-[2px_4px_8px_0px_rgba(0,0,0,0.15)]'
                : 'bg-transparent text-[#333] hover:bg-gray-100'
            }`}
          >
            Pass
          </Button>
          <Button
            variant="custom"
            onClick={() => handleStatusChange('fail')}
            className={`px-2 sm:px-4 h-9.5! rounded-md text-[12px] sm:text-[14px] font-medium transition-colors ${
              currentStatus === 'fail'
                ? 'bg-linear-to-r from-[#FF0000] to-[#E50000] text-white border border-[#EBEBEB] shadow-[2px_4px_8px_0px_rgba(0,0,0,0.15)]'
                : 'bg-transparent text-[#333] hover:bg-gray-100'
            }`}
          >
            Fail
          </Button>
          <Button
            variant="custom"
            onClick={() => handleStatusChange('na')}
            className={`px-2 sm:px-4 h-9.5! rounded-md text-[12px] sm:text-[14px] font-medium transition-colors ${
              currentStatus === 'na'
                ? 'bg-linear-to-r from-[#C1C1C1] to-[#B1B1B1] text-white border border-[#EBEBEB] shadow-[2px_4px_8px_0px_rgba(0,0,0,0.15)]'
                : 'bg-transparent text-[#333] hover:bg-gray-100'
            }`}
          >
            N/A
          </Button>
        </div>

        {/* Camera Button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          variant="custom"
          onClick={handleCameraClick}
          disabled={uploading}
          className="relative h-12.5! w-12.5! rounded-md bg-[#FBFBFB] border border-[#BFBFBF] flex items-center justify-center hover:bg-gray-50 shrink-0 px-0! overflow-hidden"
        >
          {uploading ? (
            <Loader2 size={20} className="animate-spin text-[#CACACA]" />
          ) : localPreview || photoUrl ? (
            <img src={localPreview || photoUrl} alt={label} className="w-full h-full object-cover" />
          ) : (
            <Camera size={20} color="#CACACA" />
          )}
        </Button>

        {/* Notes Button */}
        <Button
          variant="custom"
          className="h-12.5! rounded-md bg-[#FBFBFB] border border-[#BFBFBF] flex items-center justify-center hover:bg-gray-50 shrink-0 px-3!"
        >
          <StickyNote size={20} color="#CACACA" />
        </Button>
      </div>
    </div>
  );
}
