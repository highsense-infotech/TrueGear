
import { Camera, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import Button from '../common/Button';

interface Photo {
  id: string;
  imageUrl: string;
}

interface ChecklistItemProps {
  label: string;
  description?: string;
  status?: 'pass' | 'fail' | 'na' | null;
  onStatusChange?: (status: 'pass' | 'fail' | 'na' | null) => void;
  onPhotoUpload?: (file: File) => Promise<void>;
  onPhotoDelete?: (photoId: string) => Promise<void>;
  photos?: Photo[];
  showPhotoError?: boolean;
}

export function ChecklistItem({ label, description, status: externalStatus, onStatusChange, onPhotoUpload, onPhotoDelete, photos = [], showPhotoError }: ChecklistItemProps) {
  const [internalStatus, setInternalStatus] = useState<'pass' | 'fail' | 'na' | null>(externalStatus || null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync internal state with external status prop
  useEffect(() => {
    if (externalStatus !== undefined) {
      setInternalStatus(externalStatus);
    }
  }, [externalStatus]);

  // Determine which status to display
  const currentStatus = externalStatus !== undefined ? externalStatus : internalStatus;
  const hasPhoto = photos.length > 0;
  const photoRequired = currentStatus === 'fail' && !hasPhoto && showPhotoError;

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

  const handleDelete = async (photoId: string) => {
    if (!onPhotoDelete) return;
    setDeletingId(photoId);
    try {
      await onPhotoDelete(photoId);
    } catch (err) {
      console.error("Failed to delete photo:", err);
    } finally {
      setDeletingId(null);
    }
  };

  // Close preview if the viewed photo was deleted
  useEffect(() => {
    if (previewIndex !== null && previewIndex >= photos.length) {
      setPreviewIndex(photos.length > 0 ? photos.length - 1 : null);
    }
  }, [photos.length, previewIndex]);

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-3.75 px-5 border-b border-[#ebebeb] last:border-0 gap-3 sm:gap-0">
        {/* Checkbox + Label */}
        <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
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

          {/* Photos */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="flex items-center gap-1.5 pt-2 pb-1 -mt-2 -mb-1 pr-1">
            {/* Visible photo thumbnails (max 4) */}
            {photos.slice(0, 4).map((photo, index) => (
              <div key={photo.id} className="relative group shrink-0">
                <div
                  className="h-12.5 w-12.5 rounded-md border border-[#BFBFBF] overflow-hidden cursor-pointer"
                  onClick={() => deletingId !== photo.id && setPreviewIndex(index)}
                >
                  {deletingId === photo.id ? (
                    <div className="w-full h-full flex items-center justify-center bg-[#FBFBFB]">
                      <Loader2 size={16} className="animate-spin text-[#CACACA]" />
                    </div>
                  ) : (
                    <img src={photo.imageUrl} alt={label} className="w-full h-full object-cover" />
                  )}
                </div>
                {onPhotoDelete && deletingId !== photo.id && (
                  <button
                    onClick={() => handleDelete(photo.id)}
                    className="absolute -top-1.5 -right-1.5 z-10 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} color="white" />
                  </button>
                )}
              </div>
            ))}

            {/* +N more badge */}
            {photos.length > 4 && (
              <button
                onClick={() => setPreviewIndex(4)}
                className="h-12.5 w-12.5 rounded-md border border-[#BFBFBF] bg-[#F5F5F5] flex items-center justify-center cursor-pointer shrink-0 hover:bg-[#EBEBEB] transition-colors"
              >
                <span className="text-[#333] text-[12px] font-medium">+{photos.length - 4}</span>
              </button>
            )}

            {/* Add photo button */}
            <div className="relative shrink-0">
              <Button
                variant="custom"
                onClick={handleCameraClick}
                disabled={uploading}
                className={`relative h-12.5! w-12.5! rounded-md bg-[#FBFBFB] border flex items-center justify-center hover:bg-gray-50 shrink-0 px-0! overflow-hidden ${
                  photoRequired ? 'border-red-500 border-2' : 'border-[#BFBFBF]'
                }`}
              >
                {uploading ? (
                  <Loader2 size={20} className="animate-spin text-[#CACACA]" />
                ) : (
                  <Camera size={20} color={photoRequired ? '#EF4444' : '#CACACA'} />
                )}
              </Button>
              {photoRequired && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Photo Preview Modal */}
      {previewIndex !== null && photos[previewIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setPreviewIndex(null)}
        >
          <div
            className="relative max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setPreviewIndex(null)}
              className="absolute -top-3 -right-3 z-10 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100 cursor-pointer"
            >
              <X size={18} color="#333" />
            </button>

            {/* Image */}
            {imageLoading && (
              <div className="flex items-center justify-center w-60 h-60">
                <Loader2 size={32} className="animate-spin text-white" />
              </div>
            )}
            <img
              src={photos[previewIndex].imageUrl}
              alt={label}
              className={`max-w-[90vw] max-h-[85vh] rounded-lg object-contain ${imageLoading ? 'hidden' : ''}`}
              onLoad={() => setImageLoading(false)}
            />

            {/* Navigation */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => { setImageLoading(true); setPreviewIndex((previewIndex - 1 + photos.length) % photos.length); }}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white cursor-pointer"
                >
                  <ChevronLeft size={20} color="#333" />
                </button>
                <button
                  onClick={() => { setImageLoading(true); setPreviewIndex((previewIndex + 1) % photos.length); }}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white cursor-pointer"
                >
                  <ChevronRight size={20} color="#333" />
                </button>
              </>
            )}

            {/* Counter */}
            {photos.length > 1 && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-10 bg-white/90 px-3 py-1 rounded-full text-[13px] text-[#333] font-medium shadow">
                {previewIndex + 1} / {photos.length}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
