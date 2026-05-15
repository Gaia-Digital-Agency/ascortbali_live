// Country (ISO2 or name) → region bucket for analytics aggregation.
// 8 buckets, trimmed per product spec.
const ISO_TO_REGION: Record<string, string> = {
  ID: "Indonesia",
  // Southeast Asia (excl. Indonesia)
  TH: "Southeast Asia", VN: "Southeast Asia", SG: "Southeast Asia", MY: "Southeast Asia",
  PH: "Southeast Asia", KH: "Southeast Asia", LA: "Southeast Asia", MM: "Southeast Asia",
  BN: "Southeast Asia", TL: "Southeast Asia",
  // East/South Asia
  CN: "East/South Asia", JP: "East/South Asia", KR: "East/South Asia", TW: "East/South Asia",
  HK: "East/South Asia", MO: "East/South Asia", MN: "East/South Asia",
  IN: "East/South Asia", PK: "East/South Asia", BD: "East/South Asia", NP: "East/South Asia",
  LK: "East/South Asia", KZ: "East/South Asia", UZ: "East/South Asia", KG: "East/South Asia",
  TJ: "East/South Asia", AF: "East/South Asia",
  // Middle East
  AE: "Middle East", SA: "Middle East", QA: "Middle East", KW: "Middle East", BH: "Middle East",
  OM: "Middle East", IL: "Middle East", JO: "Middle East", LB: "Middle East", EG: "Middle East",
  IR: "Middle East", IQ: "Middle East", TR: "Middle East", SY: "Middle East", YE: "Middle East",
  PS: "Middle East",
  // Europe (all)
  GB: "Europe", IE: "Europe", FR: "Europe", DE: "Europe", NL: "Europe", BE: "Europe",
  AT: "Europe", CH: "Europe", LU: "Europe", IT: "Europe", ES: "Europe", PT: "Europe",
  GR: "Europe", CY: "Europe", MT: "Europe", SE: "Europe", NO: "Europe", DK: "Europe",
  FI: "Europe", IS: "Europe", EE: "Europe", LV: "Europe", LT: "Europe", PL: "Europe",
  CZ: "Europe", HU: "Europe", RO: "Europe", BG: "Europe", UA: "Europe", RU: "Europe",
  BY: "Europe", RS: "Europe", SK: "Europe", SI: "Europe", HR: "Europe", BA: "Europe",
  AL: "Europe", MK: "Europe", ME: "Europe", XK: "Europe", MD: "Europe", GE: "Europe",
  AM: "Europe", AZ: "Europe", LI: "Europe", MC: "Europe", AD: "Europe", SM: "Europe",
  VA: "Europe", UK: "Europe",
  US: "USA",
  CA: "Canada",
};
// Some upstream feeds give full country name instead of ISO2.
const NAME_TO_ISO: Record<string, string> = {
  "indonesia": "ID",
  "united states": "US", "usa": "US", "u.s.a.": "US", "united states of america": "US",
  "canada": "CA",
  "thailand": "TH", "vietnam": "VN", "singapore": "SG", "malaysia": "MY",
  "philippines": "PH", "cambodia": "KH",
  "china": "CN", "japan": "JP", "korea": "KR", "south korea": "KR", "taiwan": "TW",
  "hong kong": "HK", "india": "IN", "pakistan": "PK",
  "united arab emirates": "AE", "saudi arabia": "SA", "qatar": "QA", "israel": "IL",
  "turkey": "TR",
  "united kingdom": "GB", "uk": "GB", "great britain": "GB", "england": "GB",
  "france": "FR", "germany": "DE", "netherlands": "NL", "spain": "ES", "italy": "IT",
  "portugal": "PT", "sweden": "SE", "norway": "NO", "denmark": "DK", "finland": "FI",
  "poland": "PL", "ukraine": "UA", "russia": "RU", "switzerland": "CH",
};
export function countryToRegion(country: string | null | undefined): string {
  if (!country) return "Other";
  const t = country.trim();
  if (t.length === 2 && ISO_TO_REGION[t.toUpperCase()]) return ISO_TO_REGION[t.toUpperCase()];
  const iso = NAME_TO_ISO[t.toLowerCase()];
  if (iso && ISO_TO_REGION[iso]) return ISO_TO_REGION[iso];
  return "Other";
}
export const ALL_REGIONS = [
  "Indonesia", "Southeast Asia", "East/South Asia", "Middle East",
  "Europe", "USA", "Canada", "Other",
] as const;
