/**
 * Stamps an image file with a "GPS Map Camera" style overlay burned into the
 * bottom of the frame: a floating rounded card with a location map thumbnail,
 * the reverse-geocoded address, latitude/longitude, and the local date/time,
 * plus a small "GPS Map Camera" badge above it.
 *
 * All photo capture in the app routes through here (AddVehicle via
 * stampImageWithMeta; the inspection checklists via stampImage), so the overlay
 * is consistent everywhere and on both the live getUserMedia path and the
 * file-input fallback path.
 *
 * Providers:
 *  - Reverse geocoding: OpenStreetMap Nominatim (keyless).
 *  - Map thumbnail: Esri "World Imagery" satellite tiles (keyless) by default,
 *    to match the satellite look of the GPS Map Camera app. Esri's basemap
 *    tiles are intended for light use with attribution (drawn on the map);
 *    high-volume use needs an ArcGIS account. To use a keyed provider instead
 *    (e.g. Google static maps with maptype=satellite), set VITE_MAPS_STATIC_URL
 *    to a URL template and VITE_MAPS_API_KEY to the key. Supported template
 *    placeholders: {lat} {lng} {zoom} {width} {height} {size} {key}  e.g.
 *    VITE_MAPS_STATIC_URL=https://maps.googleapis.com/maps/api/staticmap?center={lat},{lng}&zoom={zoom}&size={size}&maptype=satellite&markers=color:red%7C{lat},{lng}&key={key}
 */

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string; // full address — also sent to backend as addressText
  place?: string;   // "City, State, Country" — overlay title line
  flag?: string;    // country flag emoji for the title
}

export interface CapturedPhoto {
  file: File;
  capturedAt: string;          // ISO timestamp
  gpsLat: number | null;
  gpsLng: number | null;
  gpsAccuracyM: number | null;
  addressText: string | null;
  deviceUserAgent: string;
}

// Optional keyed static-map provider. When unset we fall back to keyless tiles.
const STATIC_MAP_TEMPLATE = import.meta.env.VITE_MAPS_STATIC_URL as string | undefined;
const STATIC_MAP_KEY = import.meta.env.VITE_MAPS_API_KEY as string | undefined;
// Keyless satellite basemap (CORS-enabled). {z}/{y}/{x} order is Esri's.
const TILE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const TILE_ATTRIBUTION = "Esri";
const MAP_ZOOM = 17;

// Cache the last known position so it's available instantly for stamping
let cachedPosition: GeoPosition | null = null;
let geoPromise: Promise<GeoPosition | null> | null = null;

/** Convert an ISO 3166-1 alpha-2 country code to its flag emoji. */
function countryCodeToFlag(cc?: string): string {
  if (!cc || cc.length !== 2) return "";
  const base = 0x1f1e6;
  const up = cc.toUpperCase();
  return String.fromCodePoint(base + (up.charCodeAt(0) - 65), base + (up.charCodeAt(1) - 65));
}

async function reverseGeocode(lat: number, lng: number): Promise<{ address: string; place: string; flag: string }> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { "Accept-Language": "en" } },
    );
    if (!res.ok) return { address: "", place: "", flag: "" };
    const data = await res.json();
    const a = data.address;
    if (!a) return { address: data.display_name || "", place: "", flag: "" };
    // Title: locality, region, country — de-duplicated.
    const placeParts = [
      a.city || a.town || a.village || a.suburb || a.county || a.state_district || "",
      a.state || "",
      a.country || "",
    ].filter(Boolean);
    const place = Array.from(new Set(placeParts)).join(", ");
    return {
      address: data.display_name || place,
      place,
      flag: countryCodeToFlag(a.country_code),
    };
  } catch {
    return { address: "", place: "", flag: "" };
  }
}

function fetchGeolocation(): Promise<GeoPosition | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn("[stampImage] Geolocation API not available in this browser.");
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;
        const { address, place, flag } = await reverseGeocode(lat, lng);
        const geo: GeoPosition = { latitude: lat, longitude: lng, accuracy, address, place, flag };
        cachedPosition = geo;
        resolve(geo);
      },
      (err) => {
        console.warn("[stampImage] Geolocation error:", err.message);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  });
}

/**
 * Call this early (e.g. on component mount) to trigger the browser permission
 * prompt so the location is ready by the time a photo is captured.
 */
export function requestGeolocation(): void {
  if (!geoPromise) {
    geoPromise = fetchGeolocation();
  }
}

async function getGeolocation(): Promise<GeoPosition | null> {
  // If we already have a cached position, use it
  if (cachedPosition) return cachedPosition;
  // If a request is in-flight, wait for it
  if (geoPromise) return geoPromise;
  // Otherwise start a fresh request
  geoPromise = fetchGeolocation();
  return geoPromise;
}

function formatDateTime(): string {
  const now = new Date();
  const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  let hh = now.getHours();
  const ampm = hh >= 12 ? "PM" : "AM";
  hh = hh % 12 || 12;
  const min = String(now.getMinutes()).padStart(2, "0");
  // Local UTC offset, e.g. GMT +02:00 / GMT +05:30 / GMT -07:00
  const offMin = -now.getTimezoneOffset();
  const sign = offMin >= 0 ? "+" : "-";
  const oh = String(Math.floor(Math.abs(offMin) / 60)).padStart(2, "0");
  const om = String(Math.abs(offMin) % 60).padStart(2, "0");
  const tz = `GMT ${sign}${oh}:${om}`;
  return `${weekday}, ${dd}/${mm}/${yyyy} ${String(hh).padStart(2, "0")}:${min} ${ampm} ${tz}`;
}

// --- Canvas helpers -------------------------------------------------------

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Greedy word-wrap, capped at maxLines with an ellipsis on the last line. */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  let i = 0;
  for (; i < words.length; i++) {
    const candidate = current ? `${current} ${words[i]}` : words[i];
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
      if (lines.length === maxLines - 1) break;
    }
  }
  if (lines.length < maxLines) {
    // remaining words (current + anything past the break)
    const rest = [current, ...words.slice(i + 1)].filter(Boolean).join(" ");
    if (rest) lines.push(ellipsize(ctx, rest, maxWidth));
  } else if (words.slice(i + 1).length) {
    lines[lines.length - 1] = ellipsize(ctx, `${current} ${words.slice(i + 1).join(" ")}`, maxWidth);
  }
  return lines;
}

/** Trim a single line with a trailing ellipsis so it fits maxWidth. */
function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + "…";
}

/** Draw a small location pin centered at (cx, cy). */
function drawMarker(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.save();
  ctx.fillStyle = "#ea4335";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(1, r * 0.16);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.fillStyle = "#ffffff";
  ctx.arc(cx, cy, r * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// --- Map thumbnail fetching ----------------------------------------------

/**
 * Load an image with crossOrigin="anonymous". If the source doesn't return CORS
 * headers the load FAILS (and we get null) rather than tainting the canvas —
 * which keeps canvas.toBlob() working and guarantees capture never breaks.
 */
function loadImage(url: string, timeoutMs: number): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const timer = setTimeout(() => { img.onload = img.onerror = null; resolve(null); }, timeoutMs);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); resolve(null); };
    img.src = url;
  });
}

/** Build a centered map thumbnail from raster tiles (keyless). */
async function buildTileMap(lat: number, lng: number, sizePx: number, zoom: number): Promise<HTMLCanvasElement | null> {
  const TILE = 256;
  const n = 2 ** zoom;
  const latRad = (lat * Math.PI) / 180;
  const xTile = ((lng + 180) / 360) * n;
  const yTile = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  // World-pixel coords of the marker, and the top-left of our square window.
  const centerX = xTile * TILE;
  const centerY = yTile * TILE;
  const left = centerX - sizePx / 2;
  const top = centerY - sizePx / 2;
  const x0 = Math.floor(left / TILE);
  const x1 = Math.floor((left + sizePx - 1) / TILE);
  const y0 = Math.floor(top / TILE);
  const y1 = Math.floor((top + sizePx - 1) / TILE);

  const off = document.createElement("canvas");
  off.width = sizePx;
  off.height = sizePx;
  const octx = off.getContext("2d");
  if (!octx) return null;

  const jobs: Promise<void>[] = [];
  let loaded = 0;
  for (let tx = x0; tx <= x1; tx++) {
    for (let ty = y0; ty <= y1; ty++) {
      if (ty < 0 || ty >= n) continue;
      const wx = ((tx % n) + n) % n; // wrap longitude
      const url = TILE_URL
        .replace("{z}", String(zoom))
        .replace("{x}", String(wx))
        .replace("{y}", String(ty));
      const dx = tx * TILE - left;
      const dy = ty * TILE - top;
      jobs.push(
        loadImage(url, 4000).then((img) => {
          if (img) { octx.drawImage(img, dx, dy, TILE, TILE); loaded++; }
        }),
      );
    }
  }
  await Promise.all(jobs);
  return loaded > 0 ? off : null;
}

/** Resolve a map thumbnail for the location — keyed provider if configured, else tiles. */
async function fetchMapImage(geo: GeoPosition, sizePx: number): Promise<CanvasImageSource | null> {
  const size = Math.max(64, Math.round(sizePx));
  if (STATIC_MAP_TEMPLATE) {
    // Google's free Static Maps tier caps dimensions at 640px; request at most
    // that and let drawImage scale the thumbnail up to mapSize if needed.
    const req = Math.min(640, size);
    const url = STATIC_MAP_TEMPLATE
      .replace(/{lat}/g, String(geo.latitude))
      .replace(/{lng}/g, String(geo.longitude))
      .replace(/{zoom}/g, String(MAP_ZOOM))
      .replace(/{width}/g, String(req))
      .replace(/{height}/g, String(req))
      .replace(/{size}/g, `${req}x${req}`)
      .replace(/{key}/g, STATIC_MAP_KEY ?? "");
    return loadImage(url, 5000);
  }
  return buildTileMap(geo.latitude, geo.longitude, size, MAP_ZOOM);
}

// --- Overlay --------------------------------------------------------------

/**
 * Composite a "GPS Map Camera" style card onto the bottom of a canvas that
 * already has the photo drawn. Reusable across capture paths. All metrics scale
 * with canvas width so it looks right at any resolution. Degrades gracefully:
 * with no geo it still stamps the date/time and shows "Location unavailable".
 */
export async function stampGpsMapOverlay(canvas: HTMLCanvasElement, geo: GeoPosition | null): Promise<void> {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;

  const margin = Math.max(8, Math.round(W * 0.013));
  const radius = Math.max(8, Math.round(W * 0.016));
  const pad = Math.max(10, Math.round(W * 0.018));
  const gap = Math.max(8, Math.round(W * 0.018));
  const sans = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

  const bodyFont = Math.max(13, Math.round(W * 0.0195));
  const titleFont = Math.round(bodyFont * 1.42);
  const bodyLineH = Math.round(bodyFont * 1.4);
  const titleLineH = Math.round(titleFont * 1.16);

  const panelX = margin;
  const panelW = W - margin * 2;

  // Estimate map size (worst-case line count) to know the text wrap width.
  const estContentH = 2 * titleLineH + 4 * bodyLineH;
  const estTextW = Math.max(40, panelW - pad * 2 - estContentH - gap);

  // Compose lines.
  const flag = geo?.flag ? ` ${geo.flag}` : "";
  const title = (geo?.place || (geo?.address ? geo.address.split(",")[0] : "") || "Location unavailable") + (geo ? flag : "");
  ctx.font = `bold ${titleFont}px ${sans}`;
  const titleLines = wrapText(ctx, title, estTextW, 2);

  const bodyLines: string[] = [];
  ctx.font = `${bodyFont}px ${sans}`;
  if (geo) {
    if (geo.address) wrapText(ctx, geo.address, estTextW, 2).forEach((l) => bodyLines.push(l));
    bodyLines.push(`Lat ${geo.latitude.toFixed(6)}° Long ${geo.longitude.toFixed(6)}°`);
  }
  bodyLines.push(formatDateTime());

  // Exact card geometry now that the line count is known.
  const contentH = titleLines.length * titleLineH + bodyLines.length * bodyLineH;
  const mapSize = contentH;
  const panelH = contentH + pad * 2;
  const panelY = H - panelH - margin;
  const textX = panelX + pad + mapSize + gap;
  const maxTextW = panelX + panelW - pad - textX;

  // Fetch the map thumbnail (bounded + CORS-safe; null on any failure).
  const map = geo ? await fetchMapImage(geo, mapSize) : null;

  // Card background.
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  roundRectPath(ctx, panelX, panelY, panelW, panelH, radius);
  ctx.fill();

  // Map square (left).
  const mapX = panelX + pad;
  const mapY = panelY + pad;
  const mapRadius = Math.round(mapSize * 0.05);
  ctx.save();
  roundRectPath(ctx, mapX, mapY, mapSize, mapSize, mapRadius);
  ctx.clip();
  if (map) {
    ctx.drawImage(map, mapX, mapY, mapSize, mapSize);
  } else {
    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    ctx.fillRect(mapX, mapY, mapSize, mapSize);
  }
  ctx.restore();
  if (map && !STATIC_MAP_TEMPLATE) {
    // Tile attribution (required for the keyless basemap).
    ctx.font = `${Math.max(9, Math.round(bodyFont * 0.52))}px ${sans}`;
    ctx.textBaseline = "bottom";
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.fillText(TILE_ATTRIBUTION, mapX + mapSize * 0.04, mapY + mapSize - mapSize * 0.04);
  }
  // A keyed provider's URL draws its own marker (markers=…); only draw ours
  // for the keyless tiles or the empty-state placeholder.
  if (!STATIC_MAP_TEMPLATE || !map) {
    drawMarker(ctx, mapX + mapSize / 2, mapY + mapSize / 2, mapSize * 0.1);
  }
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = Math.max(1, Math.round(W * 0.0012));
  roundRectPath(ctx, mapX, mapY, mapSize, mapSize, mapRadius);
  ctx.stroke();

  // Text block (right).
  ctx.textBaseline = "top";
  let y = panelY + pad;
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${titleFont}px ${sans}`;
  for (const line of titleLines) {
    ctx.fillText(ellipsize(ctx, line, maxTextW), textX, y);
    y += titleLineH;
  }
  ctx.font = `${bodyFont}px ${sans}`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  for (const line of bodyLines) {
    ctx.fillText(ellipsize(ctx, line, maxTextW), textX, y);
    y += bodyLineH;
  }
}

/**
 * Phase 8 — capture-with-metadata helper. Returns the stamped file alongside
 * the structured GPS + timestamp metadata so the upload payload can carry
 * audit fields for compliance reporting.
 */
export async function stampImageWithMeta(file: File): Promise<CapturedPhoto> {
  const stamped = await stampImage(file);
  const geo = await getGeolocation();
  return {
    file: stamped,
    capturedAt: new Date().toISOString(),
    gpsLat: geo?.latitude ?? null,
    gpsLng: geo?.longitude ?? null,
    gpsAccuracyM: geo?.accuracy != null ? Math.round(geo.accuracy) : null,
    addressText: geo?.address ?? null,
    deviceUserAgent: navigator.userAgent,
  };
}

export async function stampImage(file: File): Promise<File> {
  const geo = await getGeolocation();

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = async () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        resolve(file);
        return;
      }

      // Draw original image, then the GPS Map Camera overlay.
      ctx.drawImage(img, 0, 0);
      try {
        await stampGpsMapOverlay(canvas, geo);
      } catch (e) {
        // Overlay is best-effort — never fail the capture over it.
        console.warn("[stampImage] overlay failed:", e);
      }

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          resolve(blob ? new File([blob], file.name, { type: file.type || "image/jpeg" }) : file);
        },
        file.type || "image/jpeg",
        0.92,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}
