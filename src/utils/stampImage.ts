/**
 * Stamps an image file with geolocation coordinates and date-time.
 * Returns a new File with the overlay burned in.
 */

interface GeoPosition {
  latitude: number;
  longitude: number;
  address?: string;
}

// Cache the last known position so it's available instantly for stamping
let cachedPosition: GeoPosition | null = null;
let geoPromise: Promise<GeoPosition | null> | null = null;

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { "Accept-Language": "en" } },
    );
    if (!res.ok) return "";
    const data = await res.json();
    if (!data.address) return data.display_name || "";
    const a = data.address;
    const parts = [
      a.road || a.neighbourhood || "",
      a.suburb || a.village || a.town || "",
      a.city || a.state_district || "",
      a.state || "",
      a.postcode || "",
    ].filter(Boolean);
    return parts.join(", ");
  } catch {
    return "";
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
        const address = await reverseGeocode(lat, lng);
        const geo: GeoPosition = { latitude: lat, longitude: lng, address };
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
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
}

function formatCoords(pos: GeoPosition): string {
  return `Lat: ${pos.latitude.toFixed(6)}, Lng: ${pos.longitude.toFixed(6)}`;
}

export async function stampImage(file: File): Promise<File> {
  const geo = await getGeolocation();
  const dateTime = formatDateTime();

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Stamp settings
      const fontSize = Math.max(14, Math.round(img.width * 0.02));
      const padding = Math.round(fontSize * 0.6);
      const lineHeight = fontSize + 4;

      // Truncate text to fit within image width
      ctx.font = `bold ${fontSize}px monospace`;
      const maxTextWidth = img.width - padding * 2;
      const truncate = (text: string): string => {
        if (ctx.measureText(text).width <= maxTextWidth) return text;
        while (text.length > 0 && ctx.measureText(text + "...").width > maxTextWidth) {
          text = text.slice(0, -1);
        }
        return text + "...";
      };

      // Build text lines
      const lines: string[] = [dateTime];
      if (geo) {
        lines.push(formatCoords(geo));
        if (geo.address) lines.push(truncate(geo.address));
      }

      const blockHeight = lines.length * lineHeight + padding * 2;
      const blockY = img.height - blockHeight;

      // Semi-transparent background
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, blockY, img.width, blockHeight);

      // Text
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.textBaseline = "top";

      lines.forEach((line, i) => {
        ctx.fillText(line, padding, blockY + padding + i * lineHeight);
      });

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (blob) {
            resolve(new File([blob], file.name, { type: file.type || "image/jpeg" }));
          } else {
            resolve(file);
          }
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
