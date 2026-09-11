import { useState } from "react";
import { Camera, Image, Loader2, RotateCcw, Trash2, AlertTriangle, X } from "lucide-react";
import Button from '../common/Button';

interface PhotoCaptureCardProps {
  title: string;
  required?: boolean;
  capturedImage?: string;
  isUploading?: boolean;
  uploadError?: boolean;
  disabled?: boolean;
  onCapture?: () => void;
  onDelete?: () => void;
}

export function PhotoCaptureCard({
  title,
  required = false,
  capturedImage,
  isUploading = false,
  uploadError = false,
  disabled = false,
  onCapture,
  onDelete,
}: PhotoCaptureCardProps) {
  // Full-size viewer for the captured shot. The tile preview is ~170px tall and
  // crops with object-cover, so the burned-in GPS/timestamp band and the damage
  // being documented are not readable there.
  const [viewerOpen, setViewerOpen] = useState(false);

  return (
    <div className={`bg-[#eff1f5] rounded-[10px] p-4 sm:p-5 flex flex-col gap-4 sm:gap-5 items-center w-full ${disabled && !isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Title */}
      <p className="text-[14px] sm:text-[16px] text-[#333] text-center">
        {title}
        {required && <span className="text-[#f51111] ml-1">*</span>}
      </p>

      {/* Capture Container */}
      <div
        className={`relative bg-white border-2 border-dashed rounded-[10px] w-full h-45 sm:h-41.25 md:h-42.5 flex flex-col items-center justify-center gap-3 px-4 sm:px-6 py-4 overflow-hidden ${uploadError ? 'border-[#DE2020]' : 'border-[#8c8c8c]'}`}>
        {capturedImage ? (
          <>
            {/* Captured Image — click to open it full size. The overlays below
                sit at z-10, so Delete/Retry keep their own clicks. */}
            <img
              src={capturedImage}
              alt={title}
              onClick={() => !isUploading && setViewerOpen(true)}
              className={`absolute inset-0 w-full h-full object-cover rounded-[10px] ${
                isUploading ? '' : 'cursor-zoom-in'
              }`}
            />

            {/* Uploading Overlay */}
            {isUploading && (
              <div className="absolute inset-0 bg-black/40 rounded-[10px] flex flex-col items-center justify-center z-10">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
                <p className="text-white text-[12px] mt-2">Uploading...</p>
              </div>
            )}

            {/* Upload-failed Overlay — preview is local only, not saved */}
            {!isUploading && uploadError && (
              <div className="absolute inset-0 bg-[#DE2020]/55 rounded-[10px] flex flex-col items-center justify-center gap-2 z-10 px-3">
                <AlertTriangle className="w-7 h-7 text-white" />
                <p className="text-white text-[12px] text-center font-medium leading-tight">
                  Not saved — file too large or upload failed
                </p>
                <button
                  onClick={onCapture}
                  className="mt-1 inline-flex items-center gap-1 bg-white text-[#DE2020] text-[12px] font-semibold rounded-md px-3 py-1.5 shadow hover:bg-gray-100 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Retry
                </button>
              </div>
            )}

            {/* Delete Button - hidden while uploading */}
            {!isUploading && (
              <button
                onClick={onDelete}
                className="absolute top-2 right-2 bg-white rounded-md p-2 shadow-md hover:bg-gray-100 z-10 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-[#DE2020]" />
              </button>
            )}
          </>
        ) : (
          <>
          <Image size={64} strokeWidth={3} absoluteStrokeWidth />
            {/* Capture Button */}
            <Button
              onClick={onCapture}
              disabled={disabled}
              variant="gradient"
              gradient={{ from: '#04C397', to: '#158E86', direction: 'to-r' }}
              icon={<Camera className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />}
              className="w-full sm:w-32.5 h-11 sm:h-12.5"
            >
              Capture
            </Button>
          </>
        )}
      </div>

      {/* Full-size viewer. Backdrop click closes; the inner panel stops
          propagation so clicks on the image itself do not. Retake is offered
          here because the tile has no recapture control once a slot is filled —
          the Capture button is replaced by the preview. */}
      {viewerOpen && capturedImage && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 px-4 py-6"
          onClick={() => setViewerOpen(false)}
        >
          <div
            className="w-full max-w-3xl flex items-center justify-between mb-3"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-white text-[15px] font-semibold">{title}</p>
            <button
              onClick={() => setViewerOpen(false)}
              className="text-white/70 hover:text-white transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <img
            src={capturedImage}
            alt={title}
            onClick={(e) => e.stopPropagation()}
            className="max-w-3xl w-full max-h-[75vh] object-contain rounded-[10px]"
          />

          {onCapture && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setViewerOpen(false);
                onCapture();
              }}
              className="mt-4 inline-flex items-center gap-2 bg-white text-[#333] text-sm font-semibold rounded-lg px-4 py-2 shadow hover:bg-gray-100 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Retake
            </button>
          )}
        </div>
      )}
    </div>
  );
}
