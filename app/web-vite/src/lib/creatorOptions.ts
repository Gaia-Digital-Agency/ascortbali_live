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

export const SERVICES_OPTIONS = [
  "Full Services",
  "Massage",
  "Sex",
  "Anal",
  "BDSM",
  "Role Play",
  "Vanilla",
  "Refer Notes",
];

// Major / main service areas in Bali. Stored comma-separated in providers.city
// (the column has been repurposed from a single city to a multi-area selector).
export const SERVICE_AREA_OPTIONS = [
  "Denpasar",
  "Ubud",
  "Sanur",
  "Canggu",
  "Nusa Dua",
];

// Category replaces the legacy "FORM" field. Stored lower-case in
// providers.escort_type (column name kept for backward-compat). The
// ChoiceGroup component capitalises on render, so "sugar baby" -> "Sugar Baby".
export const CATEGORY_OPTIONS = [
  "freelance",
  "girlfriend",
  "sugar baby",
  "escort",
  "hot wife",
];

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
