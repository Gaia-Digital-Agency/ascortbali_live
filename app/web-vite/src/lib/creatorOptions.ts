// Shared option lists for creator-facing fields. Both the registration page
// and the profile editor render dropdowns / multi-selects from these arrays,
// so the available values stay in sync.

export const TRAVEL_OPTIONS = [
  "Travel To Meet",
  "Expense Paid",
  "No Travelling",
  "Within City Only",
  "Nationwide",
  "International",
];

export const HAIR_LENGTH_OPTIONS = [
  "Very Short",
  "Short",
  "Medium",
  "Shoulder",
  "Long",
  "Very Long",
];

export const BUST_TYPE_OPTIONS = [
  "Natural",
  "Perky",
  "Enhanced",
  "Big",
  "Petite",
  "Firm",
  "Extra",
];

export const PUBIC_HAIR_OPTIONS = [
  "Kept",
  "Shaved",
  "Trimmed",
  "Shaped",
];

export const SERVICES_OPTIONS = [
  "Full Services",
  "Sex",
  "Anal",
  "BDSM",
  "Role Play",
  "Vanilla",
];

// Major / main service areas in Bali. Stored comma-separated in providers.city
// (the column has been repurposed from a single city to a multi-area selector).
export const SERVICE_AREA_OPTIONS = [
  "Denpasar",
  "Ubud",
  "Sanur",
  "Canggu",
  "Nusa Dua",
  "Kuta",
  "Seminyak",
];

// Category replaces the legacy "FORM" field. Stored lower-case in
// providers.escort_type (column name kept for backward-compat). The
// field is multi-select since 2026-05: multiple values are stored as a
// comma-separated CSV in the same column (e.g. "escort,massage"). A
// single token like the legacy "escort" is still valid and treated as
// a one-element list.
export const CATEGORY_OPTIONS = [
  "escort",
  "sugar babies",
  "massage",
  "dating/brides",
];

// Default category if the creator leaves the multi-select empty. Kept the
// same value as before the multi-select migration so behaviour matches.
export const DEFAULT_CATEGORY = "escort";

// DEMS badge mapping shown on creator cards. The letter is the public-facing
// initial; the token is the value stored in providers.escort_type. Keep in
// sync with CATEGORY_OPTIONS.
export const CATEGORY_DEMS: ReadonlyArray<{ letter: "D" | "E" | "M" | "S"; token: string }> = [
  { letter: "D", token: "dating/brides" },
  { letter: "E", token: "escort" },
  { letter: "M", token: "massage" },
  { letter: "S", token: "sugar babies" },
];

// Parse the comma-separated escort_type into a normalized Set of tokens.
// Tolerates legacy single-token rows, surrounding whitespace, mixed case,
// and the empty string.
export function parseCategoryCsv(stored: string | null | undefined): Set<string> {
  if (!stored) return new Set();
  return new Set(
    stored
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

// Normalize an array of category tokens into the CSV string that goes back
// into providers.escort_type. Trims, lower-cases, dedupes, and falls back to
// DEFAULT_CATEGORY when the array is empty.
export function buildCategoryCsv(values: ReadonlyArray<string>): string {
  const cleaned = Array.from(new Set(values.map((s) => s.trim().toLowerCase()).filter(Boolean)));
  if (cleaned.length === 0) return DEFAULT_CATEGORY;
  return cleaned.join(",");
}

// Orientation values. Stored lower-case. Older accounts may have "bisexual"
// (no space), "gay", or "other"; the API backfill migrates those into this
// reduced set so the dropdown stays in sync.
export const ORIENTATION_OPTIONS = [
  "straight",
  "bi sexual",
  "lesbian",
];

// Normalize a stored DB value into one of the whitelist labels. Returns the
// fallback (first entry) if no match. Case-insensitive, whitespace-tolerant.
export function matchOption(stored: string | null | undefined, options: string[]): string {
  if (!stored) return options[0];
  const norm = stored.trim().toLowerCase().replace(/\s+/g, " ");
  for (const o of options) {
    if (o.toLowerCase() === norm) return o;
  }
  return options[0];
}
