// Shared admin types. Extracted from AdminLoggedPage to keep the page
// orchestrator and per-tab components in sync.

export type Me = { username: string; role: string };

export type AdminStats = { creatorCount: number; userCount: number };

export type UserAccount = {
  id: string;
  username: string;
  password: string;
  created_at: string;
  updated_at: string;
  verified: boolean;
};

export type CreatorAccount = {
  id: string;
  username: string;
  password: string | null;
  temp_password: string | null;
  last_seen: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  verified: boolean;
  // Admin-set A-F (or null = not yet rated). Replaces the public vote tally
  // that used to drive the body/face badge on CreatorPreviewPage.
  body_rating: Rating | null;
  face_rating: Rating | null;
};

export type Rating = "A" | "B" | "C" | "D" | "E" | "F";

export type AdSlot =
  | "home-1" | "home-2" | "home-3" | "home-4"
  | "home-5" | "home-6" | "home-7" | "home-8"
  | "home-9" | "home-10" | "home-11" | "home-12"
  | "home-13" | "home-14" | "home-15" | "home-16"
  | "home-17" | "home-18" | "home-19" | "home-20"
  | "bottom";

export type AdSpace = {
  slot: AdSlot;
  image: string | null;
  text: string | null;
  link_url: string | null;
};

export type Metrics = {
  visitors_by_window: Record<string, number>;
  page_views_by_window: Record<string, number>;
  regions: Array<{ region: string; visitors: number }>;
  top_creators_7d: Array<{ uuid: string; model_name: string; slug: string; views: number }>;
  devices: Array<{ device: string; n: number }>;
  new_vs_returning: Array<{ kind: string; n: number }>;
  bounce: Array<{ kind: string; n: number }>;
  voting: { body_total: number; face_total: number; voters: number } | null;
  service_splits: Array<{ service: string; creators: number }>;
};

export type ViewType = "user" | "creator";
export type ViewData = Record<string, string | number | boolean | null>;
