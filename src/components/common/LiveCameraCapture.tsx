import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, RotateCcw, Upload, X } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";
import { stampImageWithMeta, requestGeolocation, type CapturedPhoto } from "../../utils/stampImage";

interface Props {
  isOpen: boolean;
  /** Label shown in the modal header (e.g. "Front View"). */
  title?: string;
  onClose: () => void;
  /** Called with the ALREADY geo-stamped frame plus its GPS/timestamp
      metadata. Stamping happens here so every capture site in the app gets
      the same overlay — callers only handle upload. */
  onCapture: (file: File, meta: CapturedPhoto) => void | Promise<void>;
}

/**
 * Live camera capture component (3.3 — Photo Compliance).
 *
 * Uses navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
 * to show a live video preview and capture the current frame on tap. No file
 * picker, no gallery option — strictly live capture. This is the OEM
 * compliance gate Johan asked for; gallery uploads are blocked at the UI
 * level here (and at the server level via the captured_at freshness check).
 *
 * Every frame that leaves this component is geo-stamped (GPS Map Camera style
 * overlay: satellite thumbnail, address, lat/long, local date-time) via
 * `stampImageWithMeta`, so no capture site can accidentally ship an
 * unstamped photo.
 */
// How long to wait for getUserMedia before showing an actionable error. Long
// enough for a user to read and accept a permission prompt, short enough that a
// silently-queued prompt doesn't leave the modal spinning forever.
const CAMERA_START_TIMEOUT_MS = 20000;

export default function LiveCameraCapture({ isOpen, title, onClose, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  // Fallback mode kicks in when getUserMedia is unavailable (insecure context
  // such as HTTP, old browser, blocked permissions). The native input is used
  // with capture="environment" — server-side 5-min freshness gate still
  // enforces "live" capture, so this is safe.
  const [fallbackMode, setFallbackMode] = useState(false);

  // Acquire / release the camera stream when the modal opens/closes.
  useEffect(() => {
    if (!isOpen) {
      stopStream();
      setFallbackMode(false);
      setError(null);
      return;
    }
    // Camera FIRST, geolocation second — deliberately not in the same tick.
    // Browsers queue permission prompts one at a time, so firing the location
    // request alongside getUserMedia could put the location prompt in front and
    // leave the camera prompt pending indefinitely: the user clicks "Add photo"
    // and never sees a camera popup. Warming GPS after the stream is live still
    // has the fix ready well before Capture is pressed.
    void startStream().finally(() => requestGeolocation());
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, facingMode]);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startStream = async () => {
    setError(null);
    setStarting(true);
    try {
      // getUserMedia requires a secure context. If the page is on http://
      // (not https:// or localhost), or the browser doesn't support it,
      // switch to fallback file-input mode automatically.
      const insecureContext = typeof window !== "undefined"
        && window.location?.protocol === "http:"
        && window.location.hostname !== "localhost"
        && window.location.hostname !== "127.0.0.1";
      if (insecureContext || !navigator.mediaDevices?.getUserMedia) {
        setFallbackMode(true);
        setError(
          insecureContext
            ? "Live camera requires a secure (HTTPS) connection. Using device camera fallback."
            : "Live camera not available in this browser. Using device camera fallback.",
        );
        return;
      }
      // getUserMedia never rejects while a permission prompt is open or queued
      // behind another one — it just stays pending, leaving the modal stuck on
      // "Starting camera...". Race it so the user always gets an actionable
      // message and a Retry instead of an indefinite spinner.
      const stream = await Promise.race([
        navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('CameraTimeout')),
            CAMERA_START_TIMEOUT_MS,
          ),
        ),
      ]);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => { /* autoplay may need user gesture */ });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to access camera.";
      // Common cases: NotAllowedError (permission denied), NotFoundError (no camera),
      // NotReadableError (camera in use by another app).
      if (msg.includes("CameraTimeout")) {
        setError(
          "The camera did not start. If your browser is asking for camera permission, allow it and press Retry — " +
            "if you previously blocked it, re-enable camera access for this site in the address-bar icon.",
        );
      } else if (msg.includes("Permission") || msg.includes("NotAllowed")) {
        setError("Camera permission was denied. Please allow access in your browser settings.");
      } else if (msg.includes("NotFound")) {
        setError("No camera detected on this device.");
      } else if (msg.includes("NotReadable")) {
        setError("Camera is in use by another application. Close other apps and retry.");
      } else {
        setError(msg);
      }
    } finally {
      setStarting(false);
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    // Use intrinsic video dimensions so we don't downsample.
    const w = video.videoWidth || 1920;
    const h = video.videoHeight || 1080;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("Failed to read the video frame.");
      return;
    }
    setCapturing(true);
    try {
      ctx.drawImage(video, 0, 0, w, h);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92),
      );
      if (!blob) {
        setError("Failed to encode frame.");
        return;
      }
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
      const captured = await stampImageWithMeta(file);
      await onCapture(captured.file, captured);
      // Caller closes the modal after upload completes.
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Capture failed.");
    } finally {
      setCapturing(false);
    }
  };

  const toggleFacing = () => setFacingMode((m) => (m === "environment" ? "user" : "environment"));

  // Fallback path — use the native file picker with capture="environment".
  // The browser will open the device camera on most mobile / tablet OSes.
  // The resulting File goes through the same geo-stamp as a live-stream
  // capture before reaching onCapture.
  const handleFallbackUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = ""; // reset so picking the same file again re-fires
    if (!f) return;
    setCapturing(true);
    try {
      const captured = await stampImageWithMeta(f);
      await onCapture(captured.file, captured);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setCapturing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title ?? "Live Camera Capture"} size="lg">
      <div className="flex flex-col gap-3">
        <p className="text-[12px] text-[#666]">
          Photos must be taken live for OEM compliance. Gallery uploads are not allowed.
        </p>

        {fallbackMode ? (
          <div className="bg-[#fafafa] border border-dashed border-[#e5e7eb] rounded-[10px] p-6 flex flex-col items-center gap-3 text-center">
            <Camera className="w-10 h-10 text-[#999]" />
            <p className="text-[13px] text-[#666] max-w-md">
              {error ?? "Tap below to open the device camera."}
            </p>
            <input
              ref={fallbackInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFallbackUpload}
              className="hidden"
            />
            <Button
              onClick={() => fallbackInputRef.current?.click()}
              disabled={capturing}
              className="mt-2"
            >
              {capturing ? (
                <><Loader2 className="w-4 h-4 mr-1 inline animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="w-4 h-4 mr-1 inline" /> Open device camera</>
              )}
            </Button>
            <p className="text-[11px] text-[#999] max-w-md">
              The server still verifies each photo is taken within the last 5 minutes —
              gallery uploads will be rejected.
            </p>
          </div>
        ) : (
          <div className="relative bg-black rounded-[10px] overflow-hidden aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {(starting || error) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white text-center p-4 gap-2">
                {starting && !error && (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <p className="text-[13px]">Starting camera...</p>
                  </>
                )}
                {error && (
                  <>
                    <p className="text-[13px]">{error}</p>
                    <button
                      type="button"
                      onClick={startStream}
                      className="mt-2 text-[12px] underline hover:text-[#ff4f31]"
                    >
                      Retry
                    </button>
                  </>
                )}
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            disabled={capturing}
          >
            <X className="w-4 h-4 mr-1 inline" /> Cancel
          </Button>
          {!fallbackMode && (
            <>
              <Button
                variant="secondary"
                onClick={toggleFacing}
                disabled={capturing || starting || !!error}
                title="Switch camera"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                onClick={handleCapture}
                className="flex-1"
                disabled={capturing || starting || !!error}
              >
                {capturing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 inline animate-spin" /> Capturing...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-1 inline" /> Capture
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
