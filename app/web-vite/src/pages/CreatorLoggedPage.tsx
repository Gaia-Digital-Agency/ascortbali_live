import { useEffect, useRef, useState } from "react";
import { apiFetch, clearTokens } from "../lib/api";
import { withBasePath } from "../lib/paths";
import { PasswordInput } from "../components/LoginForm";
import { ChecklistDropdown } from "../components/ChecklistDropdown";
import { PageMeta } from "../components/PageMeta";

type CreatorProfile = {
  username: string;
  title: string;
  url: string;
  temp_password: string | null;
  telegram_id: string;
  last_seen: string;
  notes: string;
  model_name: string;
  is_active: boolean;
  gender: "female" | "male" | "transgender";
  form: string;
  age: number;
  location: string;
  eyes: string;
  hair_color: string;
  hair_length: string;
  travel: string;
  weight: string;
  height: string;
  ethnicity: string;
  nationality: string;
  languages: string;
  phone_number: string;
  cell_phone: string;
  wechat_id: string;
  country: string;
  city: string;
  orientation: string;
  smoker: "yes" | "no";
  tattoo: "yes" | "no";
  piercing: "yes" | "no";
  services: string;
  meeting_with: "men" | "women" | "couples" | "all";
  available_for: "incall" | "outcall" | "both";
  bust_type: string;
  pubic_hair: string;
};

type CreatorImage = {
  image_id: string;
  image_file: string;
  sequence_number: number;
};

const toImageUrl = (file?: string | null) => {
  if (!file) return null;
  if (file.startsWith("http://") || file.startsWith("https://")) return file;
  if (file.startsWith("/")) return file;
  const parts = file.split("/");
  const filename = parts[parts.length - 1];
  return `/api/clean-image/${encodeURIComponent(filename)}`;
};

const defaultSlots = Array.from({ length: 20 }, (_, i) => i + 1);
const CREATOR_NAME_REGEX = /^[A-Za-z0-9]{1,50}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NATIONALITY_OPTIONS = [
  "Indonesian", "Singaporean", "Malaysian", "Thai", "Vietnamese", "Filipino",
  "Chinese", "Japanese", "Korean", "Indian", "Australian", "British", "American",
];
const COUNTRY_OPTIONS = ["Indonesia", "Singapore", "Malaysia", "Thailand", "Vietnam", "Philippines", "Australia", "United Kingdom", "United States"];
const LANGUAGE_OPTIONS = ["English", "Bahasa Indonesia", "Mandarin", "Japanese", "Korean", "Thai", "Vietnamese", "Malay"];
const EYES_OPTIONS = ["Brown", "Dark Brown", "Black", "Hazel", "Blue", "Green", "Gray"];
const HAIR_COLOR_OPTIONS = ["Black", "Dark Brown", "Brown", "Light Brown", "Blonde", "Red", "Auburn"];
const ETHNICITY_OPTIONS = [
  "Asian", "West European", "Eastern European", "African", "Australian",
  "North American", "South American", "Black", "Caucasian",
  "Middle Eastern", "Hispanic", "Latin", "Pacific Islander", "Mixed", "Other",
];
// Field options moved to src/lib/creatorOptions.ts so the registration page,
// profile editor, and public preview all use the same lists.
import {
  TRAVEL_OPTIONS,
  HAIR_LENGTH_OPTIONS,
  BUST_TYPE_OPTIONS,
  PUBIC_HAIR_OPTIONS,
  SERVICES_OPTIONS,
  SERVICE_AREA_OPTIONS,
  CATEGORY_OPTIONS,
  ORIENTATION_OPTIONS,
  parseCategoryCsv,
  buildCategoryCsv,
} from "../lib/creatorOptions";

// ## 5. Height 5cm ranges with feet/inch equivalents, 140-200cm
function cmToFeetInch(cm: number) {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches - feet * 12);
  return `${feet}'${inches}"`;
}
const HEIGHT_OPTIONS = (() => {
  const ranges: string[] = [];
  for (let start = 140; start <= 200; start += 5) {
    const end = start + 4;
    ranges.push(`${start}cm - ${end}cm (${cmToFeetInch(start)} - ${cmToFeetInch(end)})`);
  }
  return ranges;
})();
const WEIGHT_OPTIONS = Array.from({ length: 71 }, (_, i) => `${30 + i} kg`);
const AGE_OPTIONS = Array.from({ length: 43 }, (_, i) => 18 + i);

export default function CreatorPanel() {
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [images, setImages] = useState<CreatorImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingImageSlot, setSavingImageSlot] = useState<number | null>(null);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [showPwCurrent, setShowPwCurrent] = useState(false);
  const [showPwNew, setShowPwNew] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [deactivateChecks, setDeactivateChecks] = useState<boolean[]>([false, false, false, false, false]);

  useEffect(() => {
    (async () => {
      try {
        const me = await apiFetch("/me");
        if (me.role !== "creator") {
          clearTokens();
          window.location.href = withBasePath("/creator");
          return;
        }
        const [p, imgs] = await Promise.all([apiFetch("/me/creator-profile"), apiFetch("/me/creator-images")]);
        // Default Service Area to "All Bali" when the creator hasn't picked
        // any zones yet. The next profile save will persist it.
        if (!String(p?.city ?? "").trim()) p.city = "All Bali";
        setProfile(p);
        setImages(imgs);
      } catch {
        clearTokens();
        window.location.href = withBasePath("/creator");
      }
    })();
  }, []);

  const updateProfile = <K extends keyof CreatorProfile>(key: K, value: CreatorProfile[K]) =>
    setProfile((prev) => (prev ? { ...prev, [key]: value } : prev));

  const saveProfile = async () => {
    if (!profile) return;
    const creatorName = (profile.model_name ?? "").trim();
    const username = (profile.username ?? "").trim().toLowerCase();
    if (!CREATOR_NAME_REGEX.test(creatorName)) {
      setError("Creator name must be one word (letters/numbers only), max 50 characters.");
      setMessage(null);
      return;
    }
    if (!EMAIL_REGEX.test(username)) {
      setError("Username must be a valid email address.");
      setMessage(null);
      return;
    }
    const requiredText: Array<[string, string]> = [
      ["Name", creatorName],
      ["Username", username],
      ["Phone/SMS", String(profile.phone_number ?? "").trim()],
      ["WhatsApp", String(profile.cell_phone ?? "").trim()],
      ["Nationality", String(profile.nationality ?? "").trim()],
      // Country dropped — replaced conceptually by the Service Area picker.
      // Service Area is stored in the city column (comma-separated zones);
      // require at least one selection.
      ["Location", String(profile.city ?? "").trim()],
      ["Ethnicity", String(profile.ethnicity ?? "").trim()],
      ["Languages", String(profile.languages ?? "").trim()],
      ["Eyes", String(profile.eyes ?? "").trim()],
      ["Hair Color", String(profile.hair_color ?? "").trim()],
      ["Hair Length", String(profile.hair_length ?? "").trim()],
      ["Bust Type", String(profile.bust_type ?? "").trim()],
      ["Pubic Hair", String(profile.pubic_hair ?? "").trim()],
      ["Height", String(profile.height ?? "").trim()],
      ["Weight", String(profile.weight ?? "").trim()],
      ["Services", String(profile.services ?? "").trim()],
      ["Travel", String(profile.travel ?? "").trim()],
      ["About Me", String(profile.notes ?? "").trim()],
    ];
    const missing = requiredText.find(([, v]) => !v);
    if (missing) {
      setError(`${missing[0]} is required.`);
      setMessage(null);
      return;
    }

    setSavingProfile(true);
    setError(null);
    setMessage(null);
    try {
      const autoLastSeen = new Date().toISOString();
      const payload = {
        username,
        title: username,
        url: profile.url ?? "",
        tempPassword: profile.temp_password ?? "",
        telegramId: profile.telegram_id ?? "",
        lastSeen: autoLastSeen,
        notes: profile.notes ?? "",
        modelName: creatorName,
        gender: profile.gender,
        form: profile.form ?? "freelance",
        age: Number(profile.age),
        location: profile.location ?? "",
        eyes: profile.eyes ?? "",
        hairColor: profile.hair_color ?? "",
        hairLength: profile.hair_length ?? "",
        bustType: profile.bust_type ?? "Natural",
        pubicHair: profile.pubic_hair ?? "Trimmed",
        // Default TRAVEL to "Travel To Meet" when the stored value is empty
        // so new / unmigrated creators have a sensible pre-selected option.
        travel: profile.travel || "Travel To Meet",
        weight: profile.weight ?? "",
        height: profile.height ?? "",
        ethnicity: profile.ethnicity ?? "",
        nationality: profile.nationality,
        languages: profile.languages ?? "",
        phoneNumber: profile.phone_number ?? "",
        cellPhone: profile.cell_phone ?? "",
        wechatId: profile.wechat_id ?? "",
        country: profile.country,
        city: profile.city,
        orientation: profile.orientation,
        smoker: profile.smoker,
        tattoo: profile.tattoo,
        piercing: profile.piercing,
        services: profile.services,
        meetingWith: profile.meeting_with,
        availableFor: profile.available_for,
        isActive: profile.is_active,
      };
      await apiFetch("/me/creator-profile", { method: "PUT", body: JSON.stringify(payload) });
      setProfile((prev) => (prev ? { ...prev, last_seen: autoLastSeen } : prev));
      setMessage("Creator profile updated.");
    } catch (err: any) {
      if (err?.message === "creator_name_taken") {
        setError("Creator name is already in use. Please choose another one.");
      } else if (err?.message === "invalid_creator_name") {
        setError("Creator name must be one word (letters/numbers only), max 50 characters.");
      } else if (err?.message === "username_taken") {
        setError("Username is already in use.");
      } else {
        setError(err.message ?? "Profile save failed");
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const removeImage = async (sequenceNumber: number) => {
    const target = images.find((img) => img.sequence_number === sequenceNumber);
    if (!target) return;
    setSavingImageSlot(sequenceNumber);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/me/creator-images/${target.image_id}`, { method: "DELETE" });
      setImages((prev) => prev.filter((img) => img.image_id !== target.image_id));
      setMessage(`Image slot ${sequenceNumber} removed.`);
    } catch (err: any) {
      setError(err.message ?? "Image delete failed");
    } finally {
      setSavingImageSlot(null);
    }
  };

  const uploadImage = async (sequenceNumber: number, file: File) => {
    setSavingImageSlot(sequenceNumber);
    setError(null);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/upload`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Upload failed");
      await apiFetch("/me/creator-images", {
        method: "POST",
        body: JSON.stringify({ sequenceNumber, imageFile: data.url }),
      });
      const refreshed = await apiFetch("/me/creator-images");
      setImages(refreshed);
      setMessage(`Uploaded image for slot ${sequenceNumber}.`);
    } catch (err: any) {
      setError(err.message ?? "Upload failed");
    } finally {
      setSavingImageSlot(null);
    }
  };

  const changePassword = async () => {
    setPwSaving(true);
    setPwMsg(null);
    setError(null);
    try {
      await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
      });
      setPwMsg("Password updated.");
      setPwNew("");
    } catch (err: any) {
      setError(err.message ?? "Password change failed");
    } finally {
      setPwSaving(false);
    }
  };

  const toggleActive = async (next: boolean) => {
    if (!profile) return;
    setError(null);
    setMessage(null);
    setSavingProfile(true);
    const autoLastSeen = new Date().toISOString();
    try {
      const payload = {
        username: (profile.username ?? "").trim().toLowerCase(),
        title: (profile.username ?? "").trim().toLowerCase(),
        url: profile.url,
        tempPassword: profile.temp_password ?? "",
        telegramId: profile.telegram_id ?? "",
        lastSeen: autoLastSeen,
        notes: profile.notes ?? "",
        modelName: profile.model_name ?? "",
        gender: profile.gender,
        form: profile.form ?? "freelance",
        age: Number(profile.age),
        location: profile.location ?? "",
        eyes: profile.eyes ?? "",
        hairColor: profile.hair_color ?? "",
        hairLength: profile.hair_length ?? "",
        bustType: profile.bust_type ?? "Natural",
        pubicHair: profile.pubic_hair ?? "Trimmed",
        // Default TRAVEL to "Travel To Meet" when the stored value is empty
        // so new / unmigrated creators have a sensible pre-selected option.
        travel: profile.travel || "Travel To Meet",
        weight: profile.weight ?? "",
        height: profile.height ?? "",
        ethnicity: profile.ethnicity ?? "",
        nationality: profile.nationality,
        languages: profile.languages ?? "",
        phoneNumber: profile.phone_number ?? "",
        cellPhone: profile.cell_phone ?? "",
        wechatId: profile.wechat_id ?? "",
        country: profile.country,
        city: profile.city,
        orientation: profile.orientation,
        smoker: profile.smoker,
        tattoo: profile.tattoo,
        piercing: profile.piercing,
        services: profile.services,
        meetingWith: profile.meeting_with,
        availableFor: profile.available_for,
        isActive: next,
      };
      await apiFetch("/me/creator-profile", { method: "PUT", body: JSON.stringify(payload) });
      setProfile((prev) => (prev ? { ...prev, is_active: next, last_seen: autoLastSeen } : prev));
      setMessage(next ? "Profile is now active." : "Profile is now inactive.");
      setShowDeactivateConfirm(false);
      setDeactivateChecks([false, false, false, false, false]);
    } catch (err: any) {
      setError(err.message ?? "Profile status update failed");
    } finally {
      setSavingProfile(false);
    }
  };

  if (!profile) return <div className="text-sm text-brand-muted">Loading creator profile...</div>;

  return (
    <div className="space-y-8">
      <PageMeta
        title={"Creator Profile — Bali Girls"}
        description={"Manage your Bali Girls creator profile."}
        path={"/creator/logged"}
        index={false}
      />
      <div>
        <div className="text-xs tracking-luxe text-brand-muted">CREATOR</div>
        <h1 className="mt-2 font-display text-2xl md:text-3xl">Creator Profile Page</h1>
        <p className="mt-1 text-[11px] text-brand-muted">Username: {profile.username}</p>
      </div>

      {error ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div> : null}
      {message ? <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">{message}</div> : null}

      <section className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7">
        <div className="text-xs tracking-luxe text-brand-muted">PROFILE</div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Field label="NAME">
            <input
              className="w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60"
              value={profile.model_name ?? ""}
              onChange={(e) => updateProfile("model_name", e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 50))}
              maxLength={50}
              inputMode="text"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="One word, letters/numbers only"
            />
          </Field>
          <Field label="USERNAME">
            <input
              type="email"
              className="w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60"
              value={profile.username ?? ""}
              onChange={(e) => updateProfile("username", e.target.value)}
              placeholder="username@email.com"
            />
          </Field>
          <Field label="AGE">
            <select
              className="w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60"
              value={String(profile.age ?? 18)}
              onChange={(e) => updateProfile("age", Number(e.target.value))}
            >
              {AGE_OPTIONS.map((age) => (
                <option key={age} value={age}>{age}</option>
              ))}
            </select>
          </Field>
          <Field label="NATIONALITY">
            <select className="w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60" value={profile.nationality ?? ""} onChange={(e) => updateProfile("nationality", e.target.value)}>
              <option value="">Select nationality</option>
              {NATIONALITY_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="ETHNICITY">
            <select className="w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60" value={profile.ethnicity ?? ""} onChange={(e) => updateProfile("ethnicity", e.target.value)}>
              <option value="">Select ethnicity</option>
              {ETHNICITY_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </Field>
          {/* COUNTRY removed from this form — Nationality + Service Area cover
              the location info now. The DB column still exists; we send "" so
              existing rows are preserved without the creator having to maintain
              it. */}
          <Field label="LOCATION">
            <ChecklistDropdown
              options={SERVICE_AREA_OPTIONS}
              selected={(profile.city ?? "").split(",").map((v) => v.trim()).filter(Boolean)}
              onChange={(next) => updateProfile("city", next.join(", "))}
              placeholder="Select areas..."
            />
          </Field>
          <Field label="PHONE/SMS">
            <input className="w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60" value={profile.phone_number ?? ""} onChange={(e) => updateProfile("phone_number", e.target.value)} placeholder="+6281234567890" />
          </Field>
          <Field label="WHATSAPP (used for 2FA)">
            <input className="w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60" value={profile.cell_phone ?? ""} onChange={(e) => updateProfile("cell_phone", e.target.value)} placeholder="+6281234567890" />
          </Field>
          <Field label="TELEGRAM (OPTIONAL)">
            <input className="w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60" value={profile.telegram_id ?? ""} onChange={(e) => updateProfile("telegram_id", e.target.value)} placeholder="@username" />
          </Field>
          <Field label="WECHAT ID (OPTIONAL)">
            <input className="w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60" value={profile.wechat_id ?? ""} onChange={(e) => updateProfile("wechat_id", e.target.value)} placeholder="WeChat ID" />
          </Field>
          <Field label="LAST SEEN ONLINE (auto-updated on save)">
            <input className="w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm text-brand-muted outline-none" value={profile.last_seen ? new Date(profile.last_seen).toLocaleString() : "—"} readOnly />
          </Field>
          <Field label="LANGUAGES">
            <select className="w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60" value={profile.languages ?? ""} onChange={(e) => updateProfile("languages", e.target.value)}>
              <option value="">Select language</option>
              {LANGUAGE_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="EYES">
            <select className="w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60" value={profile.eyes ?? ""} onChange={(e) => updateProfile("eyes", e.target.value)}>
              <option value="">Select eye color</option>
              {EYES_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="HAIR COLOR">
            <select className="w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60" value={profile.hair_color ?? ""} onChange={(e) => updateProfile("hair_color", e.target.value)}>
              <option value="">Select hair color</option>
              {HAIR_COLOR_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="HAIR LENGTH">
            <select className="w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60" value={profile.hair_length ?? ""} onChange={(e) => updateProfile("hair_length", e.target.value)}>
              <option value="">Select hair length</option>
              {HAIR_LENGTH_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="BUST TYPE">
            <select className="w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60" value={profile.bust_type ?? "Natural"} onChange={(e) => updateProfile("bust_type", e.target.value)}>
              {BUST_TYPE_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="PUBIC HAIR">
            <select className="w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60" value={profile.pubic_hair ?? "Trimmed"} onChange={(e) => updateProfile("pubic_hair", e.target.value)}>
              {PUBIC_HAIR_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="HEIGHT">
            <select className="w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60" value={profile.height ?? ""} onChange={(e) => updateProfile("height", e.target.value)}>
              <option value="">Select height</option>
              {HEIGHT_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="WEIGHT">
            <select className="w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60" value={profile.weight ?? ""} onChange={(e) => updateProfile("weight", e.target.value)}>
              <option value="">Select weight</option>
              {WEIGHT_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="TRAVEL">
            <select className="w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60" value={profile.travel ?? ""} onChange={(e) => updateProfile("travel", e.target.value)}>
              <option value="">Select travel preference</option>
              {TRAVEL_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </Field>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {/* Gender choices restricted to female + transgender (matches the
              creator registration page). The underlying type still permits
              "male" so existing rows aren't broken — they'll simply show no
              selected radio until the creator picks one of the two valid
              choices and saves. */}
          <ChoiceGroup label="GENDER" value={profile.gender} options={["female", "transgender"]} onChange={(v) => updateProfile("gender", v as CreatorProfile["gender"])} />
          {/* CATEGORY: multi-select. Stored as a comma-separated CSV in
              providers.escort_type (e.g. "escort,massage"). The API normalizes
              either an array or a CSV string back into CSV on save. */}
          <MultiChoiceGroup
            label="CATEGORY"
            value={parseCategoryCsv(profile.form)}
            options={CATEGORY_OPTIONS}
            onChange={(next) => updateProfile("form", buildCategoryCsv(Array.from(next)))}
          />
          <ChoiceGroup label="ORIENTATION" value={profile.orientation || ORIENTATION_OPTIONS[0]} options={ORIENTATION_OPTIONS} onChange={(v) => updateProfile("orientation", v as CreatorProfile["orientation"])} />
          <ChoiceGroup label="INCALL/OUTCALL" value={profile.available_for} options={["incall", "outcall", "both"]} onChange={(v) => updateProfile("available_for", v as CreatorProfile["available_for"])} />
          <ChoiceGroup label="MEET MEN/WOMEN/COUPLES" value={profile.meeting_with} options={["men", "women", "couples", "all"]} onChange={(v) => updateProfile("meeting_with", v as CreatorProfile["meeting_with"])} />
          <ChoiceGroup label="SMOKER" value={profile.smoker} options={["yes", "no"]} onChange={(v) => updateProfile("smoker", v as CreatorProfile["smoker"])} />
          <ChoiceGroup label="TATTOO" value={profile.tattoo} options={["yes", "no"]} onChange={(v) => updateProfile("tattoo", v as CreatorProfile["tattoo"])} />
          <ChoiceGroup label="PIERCING" value={profile.piercing} options={["yes", "no"]} onChange={(v) => updateProfile("piercing", v as CreatorProfile["piercing"])} />
          <div>
            <div className="text-xs tracking-[0.22em] text-brand-muted">SERVICES <span className="normal-case text-brand-muted/60">(select at least one)</span></div>
            <div className="mt-2 space-y-2">
              {SERVICES_OPTIONS.map((s) => {
                const current = (profile.services ?? "").split(",").map((v) => v.trim()).filter(Boolean);
                const checked = current.includes(s);
                return (
                  <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const updated = e.target.checked
                          ? [...current, s]
                          : current.filter((v) => v !== s);
                        updateProfile("services", updated.join(", "));
                      }}
                    />
                    <span>{s}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-5">
          {/* "ABOUT ME" — same DB column (`notes`) as before; only the user-
              facing label changed. Creators write a free-form intro here. */}
          <Field label="ABOUT ME">
            <textarea className="min-h-[120px] w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60" value={profile.notes ?? ""} onChange={(e) => updateProfile("notes", e.target.value)} />
          </Field>
        </div>

        <div className="mt-6">
          <button onClick={saveProfile} disabled={savingProfile} className="btn btn-primary py-3">
            {savingProfile ? "SAVING PROFILE..." : "SAVE PROFILE"}
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7">
        <div className="text-xs tracking-luxe text-brand-muted">CHANGE PASSWORD</div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="CURRENT PASSWORD">
            <PasswordInput
              value={pwCurrent}
              onChange={setPwCurrent}
              placeholder="Current password (or temp password)"
              visible={showPwCurrent}
              onToggleVisibility={() => setShowPwCurrent((prev) => !prev)}
            />
          </Field>
          <Field label="NEW PASSWORD">
            <PasswordInput
              value={pwNew}
              onChange={setPwNew}
              placeholder="New password"
              visible={showPwNew}
              onToggleVisibility={() => setShowPwNew((prev) => !prev)}
            />
          </Field>
        </div>
        {pwMsg ? <div className="mt-4 text-xs text-emerald-400">{pwMsg}</div> : null}
        <div className="mt-6">
          <button onClick={changePassword} disabled={pwSaving || !pwNew.trim()} className="btn btn-primary py-3">
            {pwSaving ? "SAVING..." : "UPDATE PASSWORD"}
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7">
        <div className="text-xs tracking-luxe text-brand-muted">IMAGES (20 SLOTS: 1 MAIN + 19 OTHERS)</div>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {defaultSlots.map((slot) => {
            const existing = images.find((img) => img.sequence_number === slot);
            return (
              <ImageSlotEditor
                key={slot}
                slot={slot}
                imageUrl={toImageUrl(existing?.image_file)}
                busy={savingImageSlot === slot}
                onDelete={() => removeImage(slot)}
                onUpload={(file) => uploadImage(slot, file)}
              />
            );
          })}
        </div>
      </section>

      <div className="flex justify-end">
        <button
          onClick={() => {
            if (profile.is_active) {
              setShowDeactivateConfirm(true);
            } else {
              void toggleActive(true);
            }
          }}
          disabled={savingProfile}
          className="text-xs text-brand-muted/50 underline decoration-brand-muted/20 hover:text-brand-muted hover:decoration-brand-muted/40 transition-colors"
        >
          {profile.is_active ? "Deactivate profile" : "Activate profile"}
        </button>
      </div>

      {showDeactivateConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4">
          <div className="w-full max-w-lg rounded-3xl border border-brand-line bg-brand-bg p-6">
            <h2 className="font-display text-xl text-brand-text">Confirm Deactivation</h2>
            <p className="mt-2 text-xs text-brand-muted">Check all confirmations before deactivating your profile.</p>
            <div className="mt-4 space-y-3 text-sm">
              {[
                "I understand my profile will be hidden from site visitors.",
                "I understand I can reactivate my profile later.",
                "I have saved any profile changes I need.",
                "I understand active chats may be affected.",
                "I confirm I want to proceed with deactivation now.",
              ].map((label, idx) => (
                <label key={label} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={deactivateChecks[idx]}
                    onChange={(e) =>
                      setDeactivateChecks((prev) => prev.map((v, i) => (i === idx ? e.target.checked : v)))
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <div className="mt-5 flex gap-2">
              <button className="btn btn-outline px-4 py-2 text-xs" onClick={() => setShowDeactivateConfirm(false)}>
                CANCEL
              </button>
              <button
                className="btn btn-primary px-4 py-2 text-xs"
                disabled={!deactivateChecks.every(Boolean) || savingProfile}
                onClick={() => void toggleActive(false)}
              >
                PROCEED
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs tracking-[0.22em] text-brand-muted">{label}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function ChoiceGroup({
  label, value, options, onChange,
}: {
  label: string; value: string; options: string[]; onChange: (value: string) => void;
}) {
  return (
    <div>
      <div className="text-xs tracking-[0.22em] text-brand-muted">{label}</div>
      <div className="mt-2 space-y-2">
        {options.map((option) => (
          <label key={option} className="flex items-center gap-2 text-sm">
            <input type="radio" checked={value === option} onChange={() => onChange(option)} />
            <span className="capitalize">{option}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// Multi-select counterpart used by CATEGORY since 2026-05. Renders the same
// visual style as ChoiceGroup but with checkboxes instead of radios. The
// onChange handler receives the next selection as a Set so the caller can
// decide how to serialize (we currently CSV-encode into providers.escort_type).
function MultiChoiceGroup({
  label, value, options, onChange,
}: {
  label: string; value: Set<string>; options: string[]; onChange: (value: Set<string>) => void;
}) {
  const toggle = (option: string) => {
    const next = new Set(value);
    if (next.has(option)) next.delete(option);
    else next.add(option);
    onChange(next);
  };
  return (
    <div>
      <div className="text-xs tracking-[0.22em] text-brand-muted">
        {label} <span className="normal-case text-brand-muted/60">(select one or more)</span>
      </div>
      <div className="mt-2 space-y-2">
        {options.map((option) => (
          <label key={option} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={value.has(option)} onChange={() => toggle(option)} />
            <span className="capitalize">{option}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function ImageSlotEditor({
  slot, imageUrl, busy, onDelete, onUpload,
}: {
  slot: number; imageUrl: string | null; busy: boolean; onDelete: () => void; onUpload: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3 rounded-2xl border border-brand-line bg-brand-surface2/40 p-4">
      <div className="text-xs tracking-[0.22em] text-brand-muted">{slot === 1 ? "MAIN IMAGE" : `IMAGE ${slot}`}</div>
      <div className="aspect-[3/4] overflow-hidden rounded-xl border border-brand-line">
        {imageUrl ? (
          <img src={imageUrl} alt={`Creator photo, slot ${slot}`} width={360} height={640} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-brand-muted">EMPTY</div>
        )}
      </div>
      <div className="flex gap-2">
        <button onClick={onDelete} disabled={busy} className="btn btn-outline px-3 py-2 text-xs">DELETE</button>
        <button onClick={() => fileRef.current?.click()} disabled={busy} className="btn btn-outline px-3 py-2 text-xs">UPLOAD</button>
      </div>
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
        }}
      />
    </div>
  );
}
