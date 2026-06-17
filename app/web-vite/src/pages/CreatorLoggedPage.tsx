import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, clearTokens, setTokens, API_BASE } from "../lib/api";
import { withBasePath } from "../lib/paths";
import { PasswordInput } from "../components/LoginForm";
import { NATIONALITIES } from "../lib/nationalities";
import { ChecklistDropdown } from "../components/ChecklistDropdown";
import { PageMeta } from "../components/PageMeta";

type CreatorProfile = {
  username: string;
  email: string | null;
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

const CREATOR_NAME_REGEX = /^[A-Za-z0-9-]{1,50}$/;
// Password change is RETAINED AS A BACKUP ONLY. Creators log in passwordless
// via WhatsApp, so this section is hidden. Flip to true to re-enable it.
const PASSWORD_CHANGE_ENABLED = false;
const COUNTRY_OPTIONS = ["Indonesia", "Singapore", "Malaysia", "Thailand", "Vietnam", "Philippines", "Australia", "United Kingdom", "United States"];
const LANGUAGE_OPTIONS = ["English", "Bahasa Indonesia", "Mandarin", "Japanese", "Korean", "Thai", "Vietnamese", "Malay", "Russian", "Ukrainian", "French", "Spanish"];
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
const WEIGHT_OPTIONS = (() => {
  const ranges: string[] = [];
  for (let start = 40; start <= 95; start += 5) ranges.push(`${start} kg - ${start + 4} kg`);
  ranges.push("100 kg+");
  return ranges;
})();
const AGE_OPTIONS = Array.from({ length: 43 }, (_, i) => 18 + i);

// Blank profile used when this same form is rendered as the REGISTRATION form
// (mode="register"). One form serves both registration and profile editing.
const DEFAULT_CREATOR_PROFILE: CreatorProfile = {
  username: "", email: null, title: "", url: "", temp_password: null,
  telegram_id: "", last_seen: "", notes: "", model_name: "", is_active: true,
  gender: "female", form: "escort", age: 18, location: "", eyes: "", hair_color: "",
  hair_length: "", travel: "", weight: "", height: "", ethnicity: "", nationality: "",
  languages: "", phone_number: "", cell_phone: "", wechat_id: "", country: "",
  city: "", orientation: "straight", smoker: "no", tattoo: "no", piercing: "no",
  services: "", meeting_with: "men", available_for: "both", bust_type: "Natural", pubic_hair: "Trimmed",
};

export default function CreatorPanel({ mode = "edit" }: { mode?: "edit" | "register" }) {
  const isRegister = mode === "register";
  const [profile, setProfile] = useState<CreatorProfile | null>(isRegister ? { ...DEFAULT_CREATOR_PROFILE } : null);
  const [images, setImages] = useState<CreatorImage[]>([]);
  // Register-mode photo staging: no provider exists yet, so collect File objects
  // locally and upload them on submit (mirrors the old standalone register page).
  const [regFiles, setRegFiles] = useState<File[]>([]);
  const [regPreviews, setRegPreviews] = useState<string[]>([]);
  const regFileRef = useRef<HTMLInputElement>(null);
  const [agreements, setAgreements] = useState({ policy: false, terms: false, privacy: false, noNude: false });
  const allAgreed = agreements.policy && agreements.terms && agreements.privacy && agreements.noNude;
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // Per-field validation errors, rendered inline under each field.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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
    if (isRegister) return; // registration starts from a blank profile, no auth fetch
    (async () => {
      try {
        const me = await apiFetch("/me");
        if (me.role !== "creator") {
          clearTokens();
          window.location.href = withBasePath("/creator");
          return;
        }
        const [p, imgs] = await Promise.all([apiFetch("/me/creator-profile"), apiFetch("/me/creator-images")]);
        setProfile(p);
        setImages(imgs);
      } catch {
        clearTokens();
        window.location.href = withBasePath("/creator");
      }
    })();
  }, []);

  const updateProfile = <K extends keyof CreatorProfile>(key: K, value: CreatorProfile[K]) => {
    setProfile((prev) => (prev ? { ...prev, [key]: value } : prev));
    setFieldErrors((prev) => { if (!prev[key as string]) return prev; const n = { ...prev }; delete n[key as string]; return n; });
  };
  // Inline error rendered directly under a field.
  const FE = (k: string) => fieldErrors[k] ? <p className="mt-1 text-xs text-red-400">{fieldErrors[k]}</p> : null;

  const handleRegFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setRegFiles(files);
    setRegPreviews(files.map((f) => URL.createObjectURL(f)));
  };

  // Register-mode submit: this same form creates a new creator. Username/email
  // are auto-generated server-side, so they aren't collected here.
  const registerProfile = async () => {
    if (!profile) return;
    setError(null);
    setMessage(null);
    const creatorName = (profile.model_name ?? "").trim();
    const phoneRegex = /^\+\d{1,4}\d{6,16}$/;
    const whatsapp = (profile.cell_phone ?? "").replace(/[\s-]/g, "");
    const fe: Record<string, string> = {};
    if (!CREATOR_NAME_REGEX.test(creatorName)) fe.model_name = "Display name must be one word (letters/numbers only), max 50 characters.";
    if (!whatsapp || !phoneRegex.test(whatsapp)) fe.cell_phone = "Include your WhatsApp number with country code, e.g. +628****4567.";
    if (!(profile.notes ?? "").trim()) fe.notes = "About Me is required.";
    if (regFiles.length === 0) fe.photos = "Please add at least one profile photo.";
    if (!allAgreed) fe.agreements = "Please confirm all agreements before registering.";
    if (Object.keys(fe).length) { setFieldErrors(fe); return; }
    setFieldErrors({});

    setSavingProfile(true);
    try {
      const imageUrls: string[] = [];
      for (const file of regFiles) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", "uploads");
        const up = await fetch(`${API_BASE}/upload`, { method: "POST", body: fd });
        if (!up.ok) throw new Error(`Image upload failed: ${await up.text()}`);
        imageUrls.push((await up.json()).url);
      }
      const res = await fetch(`${API_BASE}/auth/register/creator`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          modelName: creatorName,
          gender: profile.gender,
          age: Number(profile.age),
          city: profile.city,
          whatsapp,
          telegramId: profile.telegram_id || undefined,
          wechatId: profile.wechat_id || undefined,
          form: profile.form,
          orientation: profile.orientation,
          hairLength: profile.hair_length || undefined,
          services: (profile.services || "").trim() || undefined,
          imageFiles: imageUrls,
          languages: profile.languages || undefined,
          eyes: profile.eyes || undefined,
          hairColor: profile.hair_color || undefined,
          ethnicity: profile.ethnicity || undefined,
          nationality: profile.nationality || undefined,
          height: profile.height || undefined,
          weight: profile.weight || undefined,
          meetingWith: profile.meeting_with || undefined,
          availableFor: profile.available_for || undefined,
          smoker: profile.smoker || undefined,
          tattoo: profile.tattoo || undefined,
          piercing: profile.piercing || undefined,
          notes: profile.notes || undefined,
          bustType: profile.bust_type || undefined,
          pubicHair: profile.pubic_hair || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        // Map server errors to the specific field so the message shows inline.
        if (json?.error === "creator_name_taken") { setFieldErrors({ model_name: "That display name is already taken — choose another." }); return; }
        if (json?.error === "whatsapp_taken") { setFieldErrors({ cell_phone: "That WhatsApp number is already registered." }); return; }
        if (json?.error === "username_taken") { setError("That handle is already taken — please try again."); return; }
        if (json?.error === "invalid_body" && json?.details) {
          // Map backend field names to this form's field keys for inline display.
          const keyMap: Record<string, string> = { modelName: "model_name", whatsapp: "cell_phone", notes: "notes", age: "age", city: "city", gender: "gender", services: "services" };
          const fes = (json.details.fieldErrors ?? {}) as Record<string, string[]>;
          const feMap: Record<string, string> = {};
          for (const [f, msgs] of Object.entries(fes)) feMap[keyMap[f] ?? f] = msgs.join(", ");
          if (Object.keys(feMap).length) { setFieldErrors(feMap); return; }
          setError((json.details.formErrors ?? []).join("; ") || "Some details are invalid — please check the highlighted fields.");
          return;
        }
        throw new Error("Something went wrong creating your account. Please try again.");
      }
      setTokens({ accessToken: json.accessToken });
      window.location.href = withBasePath("/creator/logged");
    } catch (err: any) {
      setError(err.message ?? "Unable to register.");
    } finally {
      setSavingProfile(false);
    }
  };

  const saveProfile = async () => {
    if (!profile) return;
    const creatorName = (profile.model_name ?? "").trim();
    const username = (profile.username ?? "").trim().toLowerCase();
    // Required fields, shown inline under each field. (phone_number is not a
    // form field — it defaults to the WhatsApp number server-side.)
    const fe: Record<string, string> = {};
    if (!CREATOR_NAME_REGEX.test(creatorName)) fe.model_name = "Girl name must be one word (letters/numbers only), max 50 characters.";
    if (!String(profile.cell_phone ?? "").trim()) fe.cell_phone = "WhatsApp is required.";
    if (!String(profile.city ?? "").trim()) fe.city = "Location is required.";
    if (!String(profile.notes ?? "").trim()) fe.notes = "About Me is required.";
    if (Object.keys(fe).length) { setFieldErrors(fe); setMessage(null); return; }
    setFieldErrors({});

    setSavingProfile(true);
    setError(null);
    setMessage(null);
    try {
      const autoLastSeen = new Date().toISOString();
      const payload = {
        username,
        email: profile.email ?? "",
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
        
        // so new / unmigrated creators have a sensible pre-selected option.
        travel: profile.travel || "",
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
      setMessage("Girl profile updated.");
    } catch (err: any) {
      if (err?.message === "creator_name_taken") {
        setError("Girl name is already in use. Please choose another one.");
      } else if (err?.message === "invalid_creator_name") {
        setError("Girl name must be one word (letters/numbers only), max 50 characters.");
      } else if (err?.message === "username_taken") {
        setError("Username is already in use.");
      } else {
        setError(err.message ?? "Profile save failed");
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const removeImage = async (imageId: string) => {
    const target = images.find((img) => img.image_id === imageId);
    if (!target) return;
    setSavingImageSlot(target.sequence_number);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/me/creator-images/${target.image_id}`, { method: `DELETE` });
      setImages((prev) => prev.filter((img) => img.image_id !== target.image_id));
      setMessage(`Photo removed.`);
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
        email: profile.email ?? "",
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
        
        // so new / unmigrated creators have a sensible pre-selected option.
        travel: profile.travel || "",
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
        title={"Girls Profile — Bali Girls"}
        description={"Manage your Bali Girls profile."}
        path={"/creator/logged"}
        index={false}
      />
      <div>
        <div className="text-xs tracking-luxe text-brand-muted">GIRLS</div>
        <h1 className="mt-2 font-display text-2xl md:text-3xl">{isRegister ? "Create Your Profile" : "Girls Profile Page"}</h1>
        {isRegister ? (
          <p className="mt-1 text-[11px] text-brand-muted">No password needed — you&apos;ll sign in with your WhatsApp number and verify on WhatsApp.</p>
        ) : null}
      </div>

      {error ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div> : null}
      {message ? <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">{message}</div> : null}

      <section className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7">
        <div className="text-xs tracking-luxe text-brand-muted">PROFILE</div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Field label="NAME (required)">
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
            {FE("model_name")}
          </Field>
          <Field label="AGE (required)">
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
            <input className="w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60" value={profile.nationality ?? ""} onChange={(e) => updateProfile("nationality", e.target.value)} list="nat-options" placeholder="Type nationality" />
            <datalist id="nat-options">
              {NATIONALITIES.map((n) => <option key={n} value={n} />)}
            </datalist>
          </Field>
          <Field label="ETHNICITY (required)">
            <select className="w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60" value={profile.ethnicity ?? ""} onChange={(e) => updateProfile("ethnicity", e.target.value)}>
              <option value="">Select ethnicity</option>
              {ETHNICITY_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </Field>
          {/* COUNTRY removed from this form — Nationality + Service Area cover
              the location info now. The DB column still exists; we send "" so
              existing rows are preserved without the creator having to maintain
              it. */}
          <Field label="LOCATION (required)">
            <ChecklistDropdown
              options={SERVICE_AREA_OPTIONS}
              selected={(profile.city ?? "").split(",").map((v) => v.trim()).filter(Boolean)}
              onChange={(next) => updateProfile("city", next.join(", "))}
              placeholder="Select areas..."
            />
            {FE("city")}
          </Field>
          <Field label="WHATSAPP (used for 2FA)">
            <input className="w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60" value={profile.cell_phone ?? ""} onChange={(e) => updateProfile("cell_phone", e.target.value)} placeholder="+6281234567890" />
            {FE("cell_phone")}
          </Field>
          <Field label="TELEGRAM (OPTIONAL)">
            <input className="w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60" value={profile.telegram_id ?? ""} onChange={(e) => updateProfile("telegram_id", e.target.value)} placeholder="@username" />
          </Field>
          <Field label="WECHAT ID (OPTIONAL)">
            <input className="w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60" value={profile.wechat_id ?? ""} onChange={(e) => updateProfile("wechat_id", e.target.value)} placeholder="WeChat ID" />
          </Field>
          <Field label="LANGUAGES">
            <ChecklistDropdown
              options={LANGUAGE_OPTIONS}
              selected={(profile.languages ?? "").split(",").map((v) => v.trim()).filter(Boolean)}
              onChange={(next) => updateProfile("languages", next.join(", "))}
              placeholder="Select languages..."
            />
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
          <Field label="LAST SEEN ONLINE (view only)">
            <input className="w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm text-brand-muted outline-none" value={profile.last_seen ? new Date(profile.last_seen).toLocaleString() : "—"} readOnly />
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
          </div>

        <div className="mt-5">
          {/* SERVICES — free text (max 150 chars), stored in providers.services.
              Shown above ABOUT ME. Optional. */}
          <Field label="SERVICES (optional)">
            <textarea
              className="min-h-[80px] w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60"
              maxLength={150}
              value={profile.services ?? ""}
              onChange={(e) => updateProfile("services", e.target.value)}
              placeholder="Describe the services you offer..."
            />
            <p className="mt-1 text-[11px] text-brand-muted">Limit 150 characters — currently {(profile.services ?? "").length}</p>
          </Field>
        </div>

        <div className="mt-5">
          {/* "ABOUT ME" — same DB column (`notes`) as before; only the user-
              facing label changed. Creators write a free-form intro here. */}
          <Field label="ABOUT ME (required)">
            <textarea
              className="min-h-[80px] w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60"
              maxLength={150}
              value={profile.notes ?? ""}
              onChange={(e) => updateProfile("notes", e.target.value)}
            />
            <p className="mt-1 text-[11px] text-brand-muted">Limit 150 characters — currently {(profile.notes ?? "").length}</p>
            {FE("notes")}
          </Field>
        </div>

        {!isRegister ? (
        <div className="mt-6">
          <button onClick={saveProfile} disabled={savingProfile} className="btn btn-primary py-3">
            {savingProfile ? "SAVING PROFILE..." : "SAVE PROFILE"}
          </button>
        </div>
        ) : null}
      </section>

      {PASSWORD_CHANGE_ENABLED && (
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
      )}

      <section className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7">
        <div className="text-xs tracking-luxe text-brand-muted">PHOTOS</div>
        {isRegister ? (
          <div className="mt-5 space-y-4">
            <input ref={regFileRef} type="file" accept="image/*" multiple onChange={handleRegFileSelect} className="hidden" />
            <button type="button" onClick={() => regFileRef.current?.click()} className="btn btn-outline px-6 py-3 text-xs">SELECT PHOTOS</button>
            {regPreviews.length > 0 ? (
              <div className="grid gap-5 md:grid-cols-3">
                {regPreviews.map((src, i) => (
                  <div key={i} className="aspect-[3/4] overflow-hidden rounded-xl border border-brand-line">
                    <img src={src} alt={`Selected ${i + 1}`} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-brand-muted">Add at least one profile photo.</p>
            )}
            {FE("photos")}
          </div>
        ) : (
        <>
        {images.length > 0 ? (
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {images
            .sort((a, b) => a.sequence_number - b.sequence_number)
            .map((img) => (
            <div key={img.image_id} className="space-y-3 rounded-2xl border border-brand-line bg-brand-surface2/40 p-4">
              <div className="aspect-[3/4] overflow-hidden rounded-xl border border-brand-line">
                <img src={toImageUrl(img.image_file)} alt={`Photo ${img.sequence_number}`} width={360} height={640} loading="lazy" decoding="async" className="h-full w-full object-cover" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => removeImage(img.image_id)} disabled={savingImageSlot === img.sequence_number} className="btn btn-outline px-3 py-2 text-xs">DELETE</button>
                <button onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) uploadImage(img.sequence_number, f); }; input.click(); }} disabled={savingImageSlot === img.sequence_number} className="btn btn-outline px-3 py-2 text-xs">REPLACE</button>
              </div>
            </div>
          ))}
        </div>
        ) : (
          <div className="mt-5 text-center text-sm text-brand-muted">No photos yet.</div>
        )}
        <div className="mt-5 flex justify-center">
          <button
            onClick={() => {
              const nextSeq = images.length > 0 ? Math.max(...images.map((i) => i.sequence_number)) + 1 : 1;
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = (e) => {
                const f = (e.target as HTMLInputElement).files?.[0];
                if (f) uploadImage(nextSeq, f);
              };
              input.click();
            }}
            disabled={savingProfile}
            className="btn btn-outline px-6 py-3 text-xs"
          >
            + ADD IMAGE
          </button>
        </div>
        </>
        )}
      </section>

      {isRegister ? (
        <section className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7">
          <div className="space-y-3 text-sm">
            <label className="flex items-start gap-2"><input type="checkbox" checked={agreements.policy} onChange={(e) => setAgreements((a) => ({ ...a, policy: e.target.checked }))} /><span>I agree to the content &amp; conduct policy.</span></label>
            <label className="flex items-start gap-2"><input type="checkbox" checked={agreements.terms} onChange={(e) => setAgreements((a) => ({ ...a, terms: e.target.checked }))} /><span>I have read and accept the <Link to="/terms" className="text-brand-gold underline">Terms</Link>.</span></label>
            <label className="flex items-start gap-2"><input type="checkbox" checked={agreements.privacy} onChange={(e) => setAgreements((a) => ({ ...a, privacy: e.target.checked }))} /><span>I have read the <Link to="/privacy" className="text-brand-gold underline">Privacy Policy</Link>.</span></label>
            <label className="flex items-start gap-2"><input type="checkbox" checked={agreements.noNude} onChange={(e) => setAgreements((a) => ({ ...a, noNude: e.target.checked }))} /><span>I confirm my photos contain no nudity.</span></label>
          </div>
          {FE("agreements")}
          <div className="mt-6">
            <button onClick={registerProfile} disabled={savingProfile} className="btn btn-primary py-3">
              {savingProfile ? "CREATING PROFILE..." : "CREATE PROFILE"}
            </button>
          </div>
          <div className="mt-4 text-center text-xs text-brand-muted">
            Already have an account?{" "}
            <Link to="/creator" className="text-brand-gold underline">Sign In</Link>
          </div>
        </section>
      ) : (
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
      )}

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

