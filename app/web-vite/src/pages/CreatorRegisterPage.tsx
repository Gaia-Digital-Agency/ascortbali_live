import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { API_BASE, setTokens } from "../lib/api";
import { withBasePath } from "../lib/paths";
import { PageMeta } from "../components/PageMeta";
import {
  CATEGORY_OPTIONS,
  ORIENTATION_OPTIONS,
  SERVICE_AREA_OPTIONS,
  HAIR_LENGTH_OPTIONS,
  BUST_TYPE_OPTIONS,
  PUBIC_HAIR_OPTIONS,
  SERVICES_OPTIONS,
} from "../lib/creatorOptions";

const NATIONALITIES = [
  "Afghan", "Albanian", "Algerian", "American", "Andorran", "Angolan", "Argentinian", "Armenian",
  "Australian", "Austrian", "Azerbaijani", "Bahraini", "Bangladeshi", "Belarusian", "Belgian",
  "Bolivian", "Bosnian", "Brazilian", "British", "Bulgarian", "Cambodian", "Cameroonian",
  "Canadian", "Chilean", "Chinese", "Colombian", "Congolese", "Croatian", "Cuban", "Czech",
  "Danish", "Dominican", "Dutch", "Ecuadorian", "Egyptian", "Emirati", "Estonian", "Ethiopian",
  "Filipino", "Finnish", "French", "Georgian", "German", "Ghanaian", "Greek", "Guatemalan",
  "Honduran", "Hong Konger", "Hungarian", "Indian", "Indonesian", "Iranian", "Iraqi", "Irish",
  "Israeli", "Italian", "Ivorian", "Jamaican", "Japanese", "Jordanian", "Kazakhstani", "Kenyan",
  "Korean", "Kuwaiti", "Kyrgyz", "Laotian", "Latvian", "Lebanese", "Libyan", "Lithuanian",
  "Luxembourgish", "Macanese", "Malaysian", "Maldivian", "Maltese", "Mexican", "Moldovan",
  "Mongolian", "Moroccan", "Mozambican", "Myanmarese", "Namibian", "Nepalese", "New Zealander",
  "Nicaraguan", "Nigerian", "Norwegian", "Omani", "Pakistani", "Palestinian", "Panamanian",
  "Paraguayan", "Peruvian", "Polish", "Portuguese", "Puerto Rican", "Qatari", "Romanian",
  "Russian", "Saudi", "Senegalese", "Serbian", "Singaporean", "Slovak", "Slovenian",
  "South African", "Spanish", "Sri Lankan", "Sudanese", "Swedish", "Swiss", "Syrian",
  "Taiwanese", "Tajik", "Thai", "Tunisian", "Turkish", "Turkmen", "Ugandan", "Ukrainian",
  "Uruguayan", "Uzbek", "Venezuelan", "Vietnamese", "Yemeni", "Zimbabwean",
];

const AGES = Array.from({ length: 53 }, (_, i) => 18 + i); // 18–70

// Title-case the lower-case enum values used in shared options for display
// in <option> labels (browser CSS on <option> is unreliable).
const titleCase = (s: string) => s.replace(/\b([a-z])/g, (m) => m.toUpperCase());

export default function CreatorRegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [modelName, setModelName] = useState("");
  const [gender, setGender] = useState("");
  const [form, setForm] = useState<string[]>([CATEGORY_OPTIONS[0]]);
  const toggleForm = (option: string) =>
    setForm((prev) => (prev.includes(option) ? prev.filter((v) => v !== option) : [...prev, option]));
  const [orientation, setOrientation] = useState<string>(ORIENTATION_OPTIONS[0]);
  const [age, setAge] = useState("");
  const [nationality, setNationality] = useState("");
  const [city, setCity] = useState<string>(SERVICE_AREA_OPTIONS[0]);
  const [services, setServices] = useState<string[]>([SERVICES_OPTIONS[0]]);
  const toggleService = (option: string) =>
    setServices((prev) => (prev.includes(option) ? prev.filter((v) => v !== option) : [...prev, option]));
  const [hairLength, setHairLength] = useState("");
  const [bustType, setBustType] = useState<string>("Natural");
  const [pubicHair, setPubicHair] = useState<string>("Trimmed");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [wechatId, setWechatId] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [policyConfirmed, setPolicyConfirmed] = useState(false);
  const [termsConfirmed, setTermsConfirmed] = useState(false);
  const [privacyConfirmed, setPrivacyConfirmed] = useState(false);
  const [noNudeConfirmed, setNoNudeConfirmed] = useState(false);
  const hasAllConfirmations = policyConfirmed && termsConfirmed && privacyConfirmed && noNudeConfirmed;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
    // Generate preview URLs
    const previews = files.map((f) => URL.createObjectURL(f));
    setImagePreviews(previews);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hasAllConfirmations) {
      setError("Please confirm all agreements before registering.");
      return;
    }
    const phoneRegex = /^\+\d{1,4}\d{6,16}$/;
    const normalizedPhone = phoneNumber.replace(/[\s-]/g, "");
    const normalizedWhatsapp = whatsappNumber.replace(/[\s-]/g, "");
    if (!/^[a-z0-9_-]{3,50}$/.test(username.trim().toLowerCase())) {
      setError("Username must be 3–50 characters: letters, numbers, - or _ only (no spaces).");
      return;
    }
    if (!/^[A-Za-z0-9-]{1,50}$/.test(modelName.trim())) {
      setError("Display name must be a single word — letters, numbers and hyphens only, no spaces.");
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email or leave it blank.");
      return;
    }
    if (normalizedPhone && !phoneRegex.test(normalizedPhone)) {
      setError("Phone number must include country code, e.g. +628****4567");
      return;
    }
    if (!normalizedWhatsapp || !phoneRegex.test(normalizedWhatsapp)) {
      setError("WhatsApp number must include country code, e.g. +628****4567");
      return;
    }
    if (selectedFiles.length === 0) {
      setError("Please select at least one profile photo.");
      return;
    }
    if (!hairLength) {
      setError("Please select your hair length.");
      return;
    }
    if (services.length === 0) {
      setError("Please select at least one service.");
      return;
    }

    setLoading(true);
    try {
      // Step 1: Upload each image to GCS
      const imageUrls: string[] = [];
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "uploads");
        const uploadRes = await fetch(`${API_BASE}/upload`, {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) {
          const errText = await uploadRes.text();
          throw new Error(`Image upload failed: ${errText}`);
        }
        const uploadJson = await uploadRes.json();
        imageUrls.push(uploadJson.url);
      }

      // Step 2: Submit registration with text fields + image URLs
      const res = await fetch(`${API_BASE}/auth/register/creator`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          email: email.trim().toLowerCase() || undefined,
          modelName: modelName.trim(),
          gender,
          age: parseInt(age, 10),
          nationality,
          city: city.trim(),
          phoneNumber: normalizedPhone,
          whatsapp: normalizedWhatsapp,
          telegramId: telegramId.trim() || undefined,
          wechatId: wechatId.trim() || undefined,
          form,
          orientation,
          services,
          hairLength,
          bustType,
          pubicHair,
          imageFiles: imageUrls,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const messages: Record<string, string> = {
          username_taken: "That username is already taken — please choose another.",
          invalid_body: "Some details are missing or invalid. Please review the highlighted fields and try again.",
          registration_failed: "Sorry, something went wrong creating your account. Please try again in a moment.",
        };
        throw new Error(messages[json?.error] ?? "Could not create your account. Please check your details and try again.");
      }
      setTokens({ accessToken: json.accessToken });
      window.location.href = withBasePath("/creator/logged");
    } catch (err: any) {
      setError(err.message ?? "Unable to register.");
    } finally {
      setLoading(false);
    }
  };

  const sel = "mt-2 w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60";
  const inp = "mt-2 w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none placeholder:text-brand-muted/60 focus:border-brand-gold/60";

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageMeta
        title={"Girls Account — Bali Girls"}
        description={"Become a Bali Girls creator. Set up your profile, photos, and contact details."}
        path={"/creator/register"}
        index={true}
      />
      <div className="text-center">
        <div className="text-xs tracking-luxe text-brand-muted">GIRLS</div>
        <h1 className="mt-2 font-display text-3xl">Create Your Profile</h1>
      </div>

      <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7 shadow-luxe">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs tracking-[0.22em] text-brand-muted">USERNAME <span className="normal-case text-brand-muted/60">(used as your login)</span></label>
            <input required className={inp} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="your_username" aria-label="Username" />
          </div>

          <div>
            <label className="text-xs tracking-[0.22em] text-brand-muted">USER EMAIL <span className="normal-case text-brand-muted/60">(optional)</span></label>
            <input type="email" className={inp} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="username@email.com" aria-label="User email" />
          </div>

          <p className="text-xs text-brand-muted">
            No password needed — you&apos;ll sign in with your WhatsApp number and verify on WhatsApp.
          </p>

          <hr className="border-brand-line" />

          <div>
            <label className="text-xs tracking-[0.22em] text-brand-muted">DISPLAY NAME</label>
            <input required className={inp} value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="Your display name" aria-label="Display name" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs tracking-[0.22em] text-brand-muted">GENDER</label>
              <select required className={sel} value={gender} onChange={(e) => setGender(e.target.value)} aria-label="Gender">
                <option value="" disabled>Select...</option>
                <option value="female">Female</option>
                <option value="transgender">Transgender</option>
              </select>
            </div>
            <div>
              <label className="text-xs tracking-[0.22em] text-brand-muted">CATEGORY <span className="normal-case text-brand-muted/60">(select one or more)</span></label>
              <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label="Category">
                {CATEGORY_OPTIONS.map((c) => {
                  const active = form.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleForm(c)}
                      className={`min-h-[44px] rounded-2xl border px-3 py-2 text-sm transition ${active
                        ? "border-brand-gold/70 bg-brand-gold/15 text-brand-text"
                        : "border-brand-line bg-brand-surface2/40 text-brand-muted hover:text-brand-text"}`}
                    >
                      {titleCase(c)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-xs tracking-[0.22em] text-brand-muted">AGE</label>
              <select required className={sel} value={age} onChange={(e) => setAge(e.target.value)} aria-label="Age">
                <option value="" disabled>Select...</option>
                {AGES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs tracking-[0.22em] text-brand-muted">NATIONALITY</label>
              <select required className={sel} value={nationality} onChange={(e) => setNationality(e.target.value)} aria-label="Nationality">
                <option value="" disabled>Select...</option>
                {NATIONALITIES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs tracking-[0.22em] text-brand-muted">LOCATION</label>
              <select required className={sel} value={city} onChange={(e) => setCity(e.target.value)} aria-label="Location">
                {SERVICE_AREA_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs tracking-[0.22em] text-brand-muted">ORIENTATION</label>
            <select className={sel} value={orientation} onChange={(e) => setOrientation(e.target.value)} aria-label="Orientation">
              {ORIENTATION_OPTIONS.map((o) => (
                <option key={o} value={o}>{titleCase(o)}</option>
              ))}
            </select>
          </div>

          <hr className="border-brand-line" />

          <div>
            <label className="text-xs tracking-[0.22em] text-brand-muted">SERVICES <span className="normal-case text-brand-muted/60">(select one or more)</span></label>
            <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label="Services">
              {SERVICES_OPTIONS.map((s) => {
                const active = services.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleService(s)}
                    className={`min-h-[44px] rounded-2xl border px-3 py-2 text-sm transition ${active
                      ? "border-brand-gold/70 bg-brand-gold/15 text-brand-text"
                      : "border-brand-line bg-brand-surface2/40 text-brand-muted hover:text-brand-text"}`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs tracking-[0.22em] text-brand-muted">HAIR LENGTH</label>
              <select required className={sel} value={hairLength} onChange={(e) => setHairLength(e.target.value)} aria-label="Hair length">
                <option value="" disabled>Select...</option>
                {HAIR_LENGTH_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs tracking-[0.22em] text-brand-muted">BUST</label>
              <select className={sel} value={bustType} onChange={(e) => setBustType(e.target.value)} aria-label="Bust type">
                {BUST_TYPE_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs tracking-[0.22em] text-brand-muted">PUBIC</label>
              <select className={sel} value={pubicHair} onChange={(e) => setPubicHair(e.target.value)} aria-label="Pubic hair">
                {PUBIC_HAIR_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>

          <hr className="border-brand-line" />

          <div>
            <label className="text-xs tracking-[0.22em] text-brand-muted">PROFILE PHOTOS <span className="normal-case text-brand-muted/60">(at least 1 required)</span></label>
            <div
              onClick={() => fileRef.current?.click()}
              className="mt-2 flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-brand-line bg-brand-surface2/20 p-4 transition hover:border-brand-gold/50"
            >
              {imagePreviews.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {imagePreviews.map((preview, i) => (
                    <div key={i} className="aspect-[3/4] w-20 overflow-hidden rounded-lg border border-brand-line">
                      <img src={preview} alt={`Preview ${i + 1}`} className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-sm text-brand-muted">
                  <div className="mb-1 text-lg">+</div>
                  <div>Click to select photos</div>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
            />
            {selectedFiles.length > 0 ? (
              <div className="mt-1 text-xs text-brand-muted">{selectedFiles.length} photo(s) selected</div>
            ) : null}
          </div>

          <hr className="border-brand-line" />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs tracking-[0.22em] text-brand-muted">PHONE/SMS <span className="normal-case text-brand-muted/60">(optional)</span></label>
              <input className={inp} value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+628****7890" aria-label="Phone / SMS" />
            </div>
            <div>
              <label className="text-xs tracking-[0.22em] text-brand-muted">WHATSAPP <span className="normal-case text-brand-muted/60">(used for 2FA)</span></label>
              <input required className={inp} value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="+628****7890" aria-label="WhatsApp number" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs tracking-[0.22em] text-brand-muted">TELEGRAM <span className="normal-case text-brand-muted/60">(optional)</span></label>
              <input className={inp} value={telegramId} onChange={(e) => setTelegramId(e.target.value)} placeholder="@username" aria-label="Telegram" />
            </div>
            <div>
              <label className="text-xs tracking-[0.22em] text-brand-muted">WECHAT ID <span className="normal-case text-brand-muted/60">(optional)</span></label>
              <input className={inp} value={wechatId} onChange={(e) => setWechatId(e.target.value)} placeholder="WeChat ID" aria-label="WeChat ID" />
            </div>
          </div>

          <hr className="border-brand-line" />

          <div className="space-y-3 text-sm">
            <div className="text-xs tracking-[0.18em] text-brand-muted">AGREEMENTS</div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={policyConfirmed} onChange={(e) => setPolicyConfirmed(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-brand-line" />
              <span className="text-brand-muted">I confirm my registration/profile details follow platform policy.</span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={termsConfirmed} onChange={(e) => setTermsConfirmed(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-brand-line" />
              <span className="text-brand-muted">I agree to the Terms of Use.</span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={privacyConfirmed} onChange={(e) => setPrivacyConfirmed(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-brand-line" />
              <span className="text-brand-muted">I agree to the Privacy Statement.</span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={noNudeConfirmed} onChange={(e) => setNoNudeConfirmed(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-brand-line" />
              <span className="text-brand-muted">I confirm I will not upload nude photographs.</span>
            </label>
          </div>

          {error ? <div className="text-xs text-amber-400">{error}</div> : null}

          <button disabled={loading || !hasAllConfirmations || selectedFiles.length === 0} className="btn btn-primary btn-block min-h-[44px] py-3">
            {loading ? "CREATING PROFILE..." : "CREATE PROFILE"}
          </button>

          <div className="text-center text-xs text-brand-muted">
            Already have an account?{" "}
            <Link to="/creator" className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-brand-gold underline">
              Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
