import { useEffect, useRef, useState } from "react";
import { Loader2, CheckCircle2, XCircle, ScanLine } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";
import LiveCameraCapture from "./LiveCameraCapture";
import { scanPlate, type PlateRejectionReason } from "../../api/vehicle.api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the validated registration once the user confirms the detected
      plate. The parent wires this into the existing handleSearch() flow. */
  onDetected: (registration: string) => void;
}

type Stage = "camera" | "scanning" | "detected" | "rejected";

// Client-side Stage-1 quality pre-check thresholds. Deliberately lenient so we
// don't false-reject a clear plate — the server + model handle the rest.
const MIN_DIMENSION = 240;      // px min width — smaller can't hold a readable plate
const DARK_MEAN_LUMA = 30;      // 0–255 average brightness floor
const BLUR_VARIANCE_FLOOR = 2;  // very-low sharpness proxy → treat as blurry

// Human-readable copy per rejection reason. Headline stays consistent with the
// spec ("Number plate not detected") for the common case.
const REJECTION_COPY: Record<PlateRejectionReason, { title: string; detail: string }> = {
  NO_NUMBER_PLATE_DETECTED: { title: "Number plate not detected.", detail: "Point the camera at the vehicle's number plate and try again." },
  PLATE_NOT_READABLE: { title: "Number plate not readable.", detail: "Move closer and hold steady so the characters are clear." },
  INVALID_REGISTRATION: { title: "Couldn't read a valid registration.", detail: "The plate text didn't match a valid format. Please retake." },
  LOW_CONFIDENCE: { title: "Not confident about the plate.", detail: "Improve lighting / focus and retake the photo." },
  IMAGE_TOO_BLURRY: { title: "Image is too blurry.", detail: "Hold the device steady and retake." },
  IMAGE_TOO_DARK: { title: "Image is too dark.", detail: "Improve the lighting and retake." },
  IMAGE_TOO_LARGE: { title: "Image is too large.", detail: "Please retake the photo." },
  UNSUPPORTED_FORMAT: { title: "Unsupported image.", detail: "Please retake using the camera." },
  PROCESSING_ERROR: { title: "Couldn't process the image.", detail: "Something went wrong. Please retake and try again." },
};

// Loads the captured file and runs cheap resolution / brightness / sharpness
// checks entirely in the browser. Returns a rejection reason or null (ok).
async function analyzeImageQuality(file: File): Promise<PlateRejectionReason | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode failed"));
      el.src = url;
    });

    // Width-only: the guide-box crop is wide but short, so a height floor would
    // false-reject a perfectly readable plate.
    if (img.naturalWidth < MIN_DIMENSION) {
      return "PLATE_NOT_READABLE";
    }

    // Downscale to a small grayscale grid for fast metrics.
    const w = 160;
    const h = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * w));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null; // can't analyse → let the server decide

    ctx.drawImage(img, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);

    const gray: number[] = new Array(w * h);
    let sum = 0;
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      gray[p] = l;
      sum += l;
    }
    const mean = sum / gray.length;
    if (mean < DARK_MEAN_LUMA) return "IMAGE_TOO_DARK";

    // Sharpness proxy: variance of a simple Laplacian over the grayscale grid.
    let lapSum = 0;
    let lapSqSum = 0;
    let count = 0;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const c = gray[y * w + x];
        const lap = 4 * c - gray[y * w + (x - 1)] - gray[y * w + (x + 1)] - gray[(y - 1) * w + x] - gray[(y + 1) * w + x];
        lapSum += lap;
        lapSqSum += lap * lap;
        count++;
      }
    }
    if (count > 0) {
      const lapMean = lapSum / count;
      const variance = lapSqSum / count - lapMean * lapMean;
      if (variance < BLUR_VARIANCE_FLOOR) return "IMAGE_TOO_BLURRY";
    }

    return null;
  } catch {
    return null; // analysis failed → defer to the server
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Guide-box proportions — shared by the visual frame and the sampled region so
// the analysis matches exactly what the user sees.
const GUIDE_W = 0.78; // fraction of video width
const GUIDE_H = 0.5; // fraction of video height

// Map the visible guide box back through object-cover to the video's intrinsic
// pixel rect, so we operate on exactly what the user sees inside the frame.
function guideRegionFromVideo(v: HTMLVideoElement) {
  const vw = v.videoWidth;
  const vh = v.videoHeight;
  const dispW = v.clientWidth || vw;
  const dispH = v.clientHeight || vh;
  const scale = Math.max(dispW / vw, dispH / vh);
  const offX = (vw * scale - dispW) / 2;
  const offY = (vh * scale - dispH) / 2;
  const boxDispW = dispW * GUIDE_W;
  const boxDispH = dispH * GUIDE_H;
  const rx = Math.max(0, ((dispW - boxDispW) / 2 + offX) / scale);
  const ry = Math.max(0, ((dispH - boxDispH) / 2 + offY) / scale);
  const rw = Math.min(vw - rx, boxDispW / scale);
  const rh = Math.min(vh - ry, boxDispH / scale);
  return { rx, ry, rw, rh };
}

// Crop the guide-box region out of the live video into a JPEG File. Used for
// both the live detection probe and the final Capture, so what's detected is
// only what's inside the box — not the whole frame.
async function cropGuideBoxToFile(v: HTMLVideoElement, maxW = 1000): Promise<File | null> {
  const { rx, ry, rw, rh } = guideRegionFromVideo(v);
  if (rw < 1 || rh < 1) return null;
  const s = Math.min(1, maxW / rw);
  const cw = Math.max(1, Math.round(rw * s));
  const ch = Math.max(1, Math.round(rh * s));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(v, rx, ry, rw, rh, 0, 0, cw, ch);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), "image/jpeg", 0.9));
  return blob ? new File([blob], "plate.jpg", { type: "image/jpeg" }) : null;
}

type FrameStatus = "idle" | "checking" | "plate";

// How often, at most, to send a live detection probe to the backend while the
// camera is open. Probes only fire when the cheap client heuristic says there's
// something well-lit and detailed in the box, so empty/dark frames cost nothing.
const PROBE_INTERVAL_MS = 2500;

// Real-time guide frame. A cheap client heuristic (brightness + edge density)
// only decides WHETHER to probe; the GREEN state is driven by the actual
// server-side detector so it turns green only for a genuine, readable number
// plate — not for a face or any detailed object. The full validation still runs
// again on Capture.
function PlateGuideFrame() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<FrameStatus>("idle");
  const probingRef = useRef(false);
  const lastProbeRef = useRef(0);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    // The overlay is wrapped by LiveCameraCapture in its own <div>, so the
    // <video> is not a direct child of our parent — walk up the ancestors until
    // we find the container that holds it.
    const findVideo = (): HTMLVideoElement | null => {
      let el: HTMLElement | null = rootRef.current;
      for (let i = 0; i < 5 && el; i++) {
        el = el.parentElement;
        const v = el?.querySelector("video") as HTMLVideoElement | null;
        if (v) return v;
      }
      return null;
    };

    // Cheap gate: is there well-lit, detailed content inside the guide box?
    // (Not a plate detector — just decides whether it's worth probing.)
    const candidatePresent = (video: HTMLVideoElement): boolean => {
      if (!ctx) return false;
      const { rx, ry, rw, rh } = guideRegionFromVideo(video);
      if (rw < 1 || rh < 1) return false;

      const sw = 200;
      const sh = Math.max(1, Math.round((sw * rh) / rw));
      canvas.width = sw;
      canvas.height = sh;
      ctx.drawImage(video, rx, ry, rw, rh, 0, 0, sw, sh);

      const { data } = ctx.getImageData(0, 0, sw, sh);
      const gray = new Float32Array(sw * sh);
      let sum = 0;
      for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        gray[p] = l;
        sum += l;
      }
      const mean = sum / gray.length;

      let edges = 0;
      let count = 0;
      for (let y = 1; y < sh - 1; y++) {
        for (let x = 1; x < sw - 1; x++) {
          const gx = gray[y * sw + x + 1] - gray[y * sw + x - 1];
          const gy = gray[(y + 1) * sw + x] - gray[(y - 1) * sw + x];
          if (Math.abs(gx) + Math.abs(gy) > 40) edges++;
          count++;
        }
      }
      const edgeRatio = count ? edges / count : 0;
      return mean > 35 && mean < 245 && edgeRatio > 0.03;
    };

    // Send ONLY the guide-box region to the real detector. Green only when the
    // model confirms a valid, readable plate inside the box (same crop + pass
    // criteria as Capture) — a plate elsewhere in the frame won't count.
    const probe = async (video: HTMLVideoElement) => {
      probingRef.current = true;
      try {
        const file = await cropGuideBoxToFile(video);
        if (!file || cancelled) return;
        const res = await scanPlate(file);
        if (cancelled) return;
        const d = res.data;
        setStatus(d && d.isPlate && d.reason === null && d.registration ? "plate" : "idle");
      } catch {
        if (!cancelled) setStatus("idle");
      } finally {
        probingRef.current = false;
        lastProbeRef.current = Date.now();
      }
    };

    const tick = () => {
      const video = findVideo();
      if (video && video.videoWidth > 0) {
        if (candidatePresent(video)) {
          const now = Date.now();
          if (!probingRef.current && now - lastProbeRef.current > PROBE_INTERVAL_MS) {
            // Keep showing green while re-checking a plate; otherwise show "checking".
            setStatus((s) => (s === "plate" ? "plate" : "checking"));
            void probe(video);
          }
        } else if (!cancelled) {
          setStatus("idle"); // box empty / dark → red immediately, no probe
        }
      }
      timer = setTimeout(tick, 300);
    };

    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const border =
    status === "plate" ? "border-[#22c55e]" : status === "checking" ? "border-[#f59e0b]" : "border-[#ef4444]";
  const pillBg =
    status === "plate" ? "bg-[#16a34a]/85" : status === "checking" ? "bg-[#d97706]/85" : "bg-black/60";
  const message =
    status === "plate"
      ? "Number plate detected — tap Capture"
      : status === "checking"
        ? "Checking…"
        : "Position the vehicle number plate inside the frame";

  return (
    <div ref={rootRef} className="absolute inset-0 flex flex-col items-center justify-center">
      <div
        className={`rounded-lg border-2 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] transition-colors duration-150 ${border}`}
        style={{ width: `${GUIDE_W * 100}%`, height: `${GUIDE_H * 100}%` }}
      />
      <p
        className={`mt-4 px-3 py-1.5 rounded-md text-white text-[12px] sm:text-[13px] text-center transition-colors duration-150 ${pillBg}`}
      >
        {message}
      </p>
    </div>
  );
}

export default function PlateCaptureModal({ isOpen, onClose, onDetected }: Props) {
  const [stage, setStage] = useState<Stage>("camera");
  const [registration, setRegistration] = useState<string>("");
  const [rejectReason, setRejectReason] = useState<PlateRejectionReason>("NO_NUMBER_PLATE_DETECTED");

  const resetAndClose = () => {
    setStage("camera");
    setRegistration("");
    onClose();
  };

  const retake = () => {
    setRegistration("");
    setStage("camera");
  };

  const handleCapture = async (file: File) => {
    // Crop to the guide box while the video is still live (before setStage
    // unmounts the camera). This keeps Capture consistent with the live
    // indicator — only what's inside the box is detected. In fallback mode
    // (no live video) we use the passed file as-is.
    const liveVideo = document.querySelector("video") as HTMLVideoElement | null;
    let target = file;
    if (liveVideo && liveVideo.videoWidth > 0) {
      const cropped = await cropGuideBoxToFile(liveVideo);
      if (cropped) target = cropped;
    }

    // Stage 1 — client quality pre-check.
    setStage("scanning");
    const qualityReason = await analyzeImageQuality(target);
    if (qualityReason) {
      setRejectReason(qualityReason);
      setStage("rejected");
      return;
    }

    // Stages 2–7 — server-side detection + validation.
    try {
      const res = await scanPlate(target);
      const data = res.data;
      if (data && data.isPlate && data.reason === null && data.registration) {
        setRegistration(data.registration);
        setStage("detected");
      } else {
        setRejectReason((data?.reason as PlateRejectionReason) ?? "PROCESSING_ERROR");
        setStage("rejected");
      }
    } catch {
      setRejectReason("PROCESSING_ERROR");
      setStage("rejected");
    }
  };

  // Camera stage delegates to the shared LiveCameraCapture (with a guide-frame
  // overlay). Closing it releases the stream via LiveCameraCapture's own
  // lifecycle. Other stages render as a normal modal (camera is off then).
  if (stage === "camera") {
    return (
      <LiveCameraCapture
        isOpen={isOpen}
        title="Capture Number Plate"
        onClose={resetAndClose}
        onCapture={(file, _meta, rawFile) => handleCapture(rawFile ?? file)}
        overlay={<PlateGuideFrame />}
      />
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} title="Capture Number Plate" size="md">
      {stage === "scanning" && (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <ScanLine className="w-10 h-10 text-[#ff4f31]" />
          <Loader2 className="w-6 h-6 animate-spin text-[#999]" />
          <p className="text-[14px] text-[#333] font-medium">Checking for a number plate…</p>
          <p className="text-[12px] text-[#999]">This takes a few seconds.</p>
        </div>
      )}

      {stage === "detected" && (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-[#1DB401]" />
          <div>
            <p className="text-[13px] text-[#666] mb-1">Number Plate Detected</p>
            <p className="text-[26px] sm:text-[30px] font-bold tracking-wider text-[#333]">{registration}</p>
          </div>
          <div className="flex gap-3 w-full mt-2">
            <Button variant="outline" className="flex-1" onClick={retake}>
              Retake
            </Button>
            <Button variant="gradient" className="flex-1" onClick={() => onDetected(registration)}>
              Search Vehicle
            </Button>
          </div>
        </div>
      )}

      {stage === "rejected" && (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <XCircle className="w-12 h-12 text-[#e11d48]" />
          <div>
            <p className="text-[15px] text-[#333] font-semibold mb-1">{REJECTION_COPY[rejectReason].title}</p>
            <p className="text-[13px] text-[#666] max-w-sm">{REJECTION_COPY[rejectReason].detail}</p>
          </div>
          <div className="flex gap-3 w-full mt-2">
            <Button variant="gradient" className="flex-1" onClick={retake}>
              Retake
            </Button>
            <Button variant="outline" className="flex-1" onClick={resetAndClose}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
