// Static config + small helpers shared by the admin tabs.
import {
  TRAVEL_OPTIONS,
  HAIR_LENGTH_OPTIONS,
  BUST_TYPE_OPTIONS,
  PUBIC_HAIR_OPTIONS,
  SERVICE_AREA_OPTIONS,
  CATEGORY_OPTIONS,
  ORIENTATION_OPTIONS,
} from "../../lib/creatorOptions";
import type { AdSpace } from "./types";

export const defaultAds: AdSpace[] = [
  { slot: "home-1", image: "/api/uploads/baligirls/ads/unique.png", text: null, link_url: "https://lightcyan-horse-210187.hostingersite.com/" },
  { slot: "home-2", image: "/api/uploads/baligirls/ads/humapedia.png", text: null, link_url: "https://www.humanspedia.com/" },
  { slot: "home-3", image: null, text: null, link_url: "https://www.baligirls.com/" },
  { slot: "home-4", image: null, text: null, link_url: null },
  { slot: "home-5", image: null, text: null, link_url: null },
  { slot: "home-6", image: null, text: null, link_url: null },
  { slot: "home-7", image: null, text: null, link_url: null },
  { slot: "home-8", image: null, text: null, link_url: null },
  { slot: "home-9",  image: null, text: null, link_url: null },
  { slot: "home-10", image: null, text: null, link_url: null },
  { slot: "home-11", image: null, text: null, link_url: null },
  { slot: "home-12", image: null, text: null, link_url: null },
  { slot: "home-13", image: null, text: null, link_url: null },
  { slot: "home-14", image: null, text: null, link_url: null },
  { slot: "home-15", image: null, text: null, link_url: null },
  { slot: "home-16", image: null, text: null, link_url: null },
  { slot: "home-17", image: null, text: null, link_url: null },
  { slot: "home-18", image: null, text: null, link_url: null },
  { slot: "home-19", image: null, text: null, link_url: null },
  { slot: "home-20", image: null, text: null, link_url: null },
  { slot: "bottom",  image: null, text: "Your Ads Here", link_url: null },
];

export function normalizeAdImage(image: string | null) {
  const raw = (image ?? "").trim();
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/api/")) return raw;
  return raw;
}

export function toStoredImage(image: string | null) {
  const raw = (image ?? "").trim();
  if (!raw) return null;
  return raw;
}

export function normalizeAdSpace(ad: AdSpace): AdSpace {
  return { ...ad, image: normalizeAdImage(ad.image) };
}

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" });
  } catch { return iso; }
}

// Per-field dropdown options used by the View/Edit modal. Fields not listed
// fall through to a free-text <input>.
export const FIELD_OPTIONS: Record<string, string[]> = {
  // creator fields
  gender:        ["female", "male", "transgender"],
  escort_type:   CATEGORY_OPTIONS,
  form:          CATEGORY_OPTIONS,
  orientation:   ORIENTATION_OPTIONS,
  available_for: ["incall", "outcall", "both"],
  meeting_with:  ["men", "women", "couples", "all"],
  smoker:        ["yes", "no"],
  tattoo:        ["yes", "no"],
  piercing:      ["yes", "no"],
  eyes:          ["Brown", "Dark Brown", "Black", "Hazel", "Blue", "Green", "Gray"],
  hair_color:    ["Black", "Dark Brown", "Brown", "Light Brown", "Blonde", "Red", "Auburn"],
  hair_length:   HAIR_LENGTH_OPTIONS,
  bust_type:     BUST_TYPE_OPTIONS,
  pubic_hair:    PUBIC_HAIR_OPTIONS,
  ethnicity:     ["Asian", "West European", "Eastern European", "African", "Australian", "North American", "South American", "Black", "Caucasian", "Middle Eastern", "Hispanic", "Latin", "Pacific Islander", "Mixed", "Other"],
  city:          SERVICE_AREA_OPTIONS,
  travel:        TRAVEL_OPTIONS,
  // user fields
  age_group:           ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"],
  relationship_status: ["single", "married", "other"],
};

export const TEXTAREA_FIELDS = new Set(["notes", "languages"]);

// Override the default snake_case → UPPER label for fields we've renamed
// on the public profile / creator editor.
export const LABEL_OVERRIDES: Record<string, string> = {
  available_for: "INCALL/OUTCALL",
  meeting_with:  "MEET MEN/WOMEN/COUPLES",
  notes:         "ABOUT ME",
  temp_password: "TEMP PASSWORD",
  wechat_id:     "WECHAT ID",
  telegram_id:   "TELEGRAM ID",
  phone:         "PHONE (SMS)",
  phone_number:  "PHONE (SMS)",
  cell_phone:    "WHATSAPP",
  model_name:    "DISPLAY NAME",
  escort_type:   "CATEGORY",
  is_active:     "ACTIVE",
  body_votes:    "BODY VOTES",
  face_votes:    "FACE VOTES",
};
