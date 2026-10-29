// ─── Number-Plate Formatting — South Africa + India (client mirror) ───────────
//
// Mirrors the backend normalisation + validation (plateScan.dto.ts) so the UI
// can display / re-check a registration consistently. The BACKEND REMAINS THE
// AUTHORITY — this exists only for presentation and defensive client checks.
// It never runs OCR and never "fixes" a registration the server rejected.
//
// ─── Why the two rulesets are kept apart ──────────────────────────────────────
// The Indian ruleset anchors corrections on the assumption that the
// LAST FOUR characters of a plate are digits. South African plates end in a
// PROVINCE CODE, so that rule corrupts them:
//
//   CWW326GP → last-4 window is "26GP" → toDigit('G') = '6' → CWW3266P
//
// …which then fails validation. So each market keeps its own anchors, and
// `normalizePlate` only accepts a correction that actually validates.
//
// Supported:
//   SA 1. Province-suffix  — 3 letters + 3 digits + province code  e.g. CWW326GP
//   SA 2. Town-code series — 2–3 letters + 3–6 digits              e.g. CA123456
//   IN 1. Standard state   — GJ05AB1234, RJ14CV0002, TN07B4123
//   IN 2. BH (Bharat)      — 21BH2345AA, 22BH1234A
// Personalised/vanity, dealer, trailer and temporary plates are NOT matched —
// they are structurally unvalidatable and are rejected, not guessed.

export const SA_PROVINCE_CODES = ["GP", "MP", "NW", "FS", "NC", "EC", "ZN", "WP", "L"] as const;

// Longest-first so "L" can never shadow a two-letter code during matching.
const PROVINCE_ALTERNATION = [...SA_PROVINCE_CODES]
  .sort((a, b) => b.length - a.length)
  .join("|");

export const SA_PROVINCE_PLATE_REGEX = new RegExp(
  `^[A-Z]{3}[0-9]{3}(?:${PROVINCE_ALTERNATION})$`,
);
export const SA_TOWN_PLATE_REGEX = /^[A-Z]{2,3}[0-9]{3,6}$/;

// ─── Supported Indian schemes ─────────────────────────────────────────────────
// Carried over from the reference implementation so the same build serves both
// markets: standard state scheme (GJ05AB1234, RJ14CV0002) and BH series.
export const INDIAN_PLATE_REGEX = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/;
export const BH_PLATE_REGEX = /^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$/;

// Anchored positional OCR corrections, applied only to positions a scheme fixes
// as letters or digits — and only when the raw reading doesn't already validate.
const ALPHA_FIX: Record<string, string> = { "0": "O", "1": "I", "2": "Z", "4": "A", "5": "S", "6": "G", "8": "B" };
const DIGIT_FIX: Record<string, string> = { O: "0", Q: "0", D: "0", I: "1", L: "1", Z: "2", S: "5", B: "8", G: "6", A: "4" };

const toAlpha = (c: string) => ALPHA_FIX[c] ?? c;
const toDigit = (c: string) => DIGIT_FIX[c] ?? c;

// Province-suffix anchors: LLL DDD <province>. The province code is left
// untouched — correcting it could silently move a vehicle to another province.
function correctProvinceScheme(s: string): string {
  const suffix = [...SA_PROVINCE_CODES].find((code) => s.endsWith(code));
  if (!suffix) return s;
  const body = s.slice(0, s.length - suffix.length);
  if (body.length !== 6) return s;

  const chars = body.split("");
  for (let i = 0; i < 3; i++) chars[i] = toAlpha(chars[i]);
  for (let i = 3; i < 6; i++) chars[i] = toDigit(chars[i]);
  return chars.join("") + suffix;
}

// Town-code anchors: leading letters, trailing digits. The split point is the
// longest leading run the scheme allows that leaves a valid digit block.
function correctTownScheme(s: string): string {
  for (const letterCount of [3, 2]) {
    if (s.length <= letterCount) continue;
    const digits = s.length - letterCount;
    if (digits < 3 || digits > 6) continue;

    const chars = s.split("");
    for (let i = 0; i < letterCount; i++) chars[i] = toAlpha(chars[i]);
    for (let i = letterCount; i < chars.length; i++) chars[i] = toDigit(chars[i]);
    const candidate = chars.join("");
    if (SA_TOWN_PLATE_REGEX.test(candidate)) return candidate;
  }
  return s;
}

// ─── Indian anchors (from the reference implementation) ───────────────────────
// BH series: YY (digits) BH #### (digits) XX (letters). The "BH" marker is
// detected on the alpha-corrected pair so an "8H" misread still matches.
function correctBhSeries(s: string): string {
  const out = s.split("");
  if (out.length < 9) return s;
  if (toAlpha(out[2]) !== "B" || toAlpha(out[3]) !== "H") return s;
  out[0] = toDigit(out[0]);
  out[1] = toDigit(out[1]);
  out[2] = "B";
  out[3] = "H";
  for (let i = 4; i < 8 && i < out.length; i++) out[i] = toDigit(out[i]);
  for (let i = 8; i < out.length; i++) out[i] = toAlpha(out[i]);
  return out.join("");
}

// Standard Indian anchors: first two characters are the state letters, last
// four are the unique number. The middle is left untouched.
//
// INDIAN-ONLY — never valid for a South African plate, which ends in a province
// code (applying it to CWW326GP yields CWW3266P). `normalizePlate` keeps the
// schemes apart by only accepting a correction that actually validates.
function correctIndianStandard(s: string): string {
  const out = s.split("");
  for (let i = 0; i < 2 && i < out.length; i++) out[i] = toAlpha(out[i]);
  for (let i = out.length - 4; i < out.length; i++) {
    if (i >= 2) out[i] = toDigit(out[i]);
  }
  return out.join("");
}

/** Uppercase, strip separators, then apply the anchored positional fixes. */
export function normalizePlate(raw: string | null | undefined): string {
  if (!raw) return "";
  const s = raw
    .toUpperCase()
    .replace(/[\s.-]/g, "")
    .replace(/[^A-Z0-9]/g, "");

  // Implausible length → return as-is so validation rejects it (no guesswork).
  // SA plates run 5–9 characters; Indian standard/BH run 8–10.
  if (s.length < 5 || s.length > 10) return s;

  // Already valid → never "correct" a correct reading.
  if (validatePlate(s)) return s;

  // Try each scheme's anchored correction and accept the FIRST that yields a
  // genuinely valid registration. A correction that would corrupt a plate from
  // another market produces something that fails validation, so it is
  // discarded rather than returned.
  for (const candidate of [
    correctBhSeries(s),
    correctIndianStandard(s),
    correctProvinceScheme(s),
    correctTownScheme(s),
  ]) {
    if (validatePlate(candidate)) return candidate;
  }

  return s;
}

export function validatePlate(normalized: string): boolean {
  return (
    SA_PROVINCE_PLATE_REGEX.test(normalized) ||
    SA_TOWN_PLATE_REGEX.test(normalized) ||
    INDIAN_PLATE_REGEX.test(normalized) ||
    BH_PLATE_REGEX.test(normalized)
  );
}
