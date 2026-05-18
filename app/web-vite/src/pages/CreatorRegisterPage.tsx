import { useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE, setTokens } from "../lib/api";
import { withBasePath } from "../lib/paths";
import { PageMeta } from "../components/PageMeta";
import {
  CATEGORY_OPTIONS,
  ORIENTATION_OPTIONS,
  SERVICE_AREA_OPTIONS,
  SERVICES_OPTIONS,
  BUST_TYPE_OPTIONS,
  PUBIC_HAIR_OPTIONS,
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

// Hair Length and Services are NOT collected at registration time. Both live
// on the Creator Profile Management page where they're required, so the
// signup flow stays minimal — creators only need to fill them in once they
// land on the editor.

export default function CreatorRegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [modelName, setModelName] = useState("");
  const [gender, setGender] = useState("");
  // Category is multi-select since 2026-05; default to a single-element list
  // so the API still receives "escort" if nothing else is picked.
  const [form, setForm] = useState<string[]>([CATEGORY_OPTIONS[0]]);
  const toggleForm = (option: string) =>
    setForm((prev) => (prev.includes(option) ? prev.filter((v) => v !== option) : [...prev, option]));
  const [orientation, setOrientation] = useState<string>(ORIENTATION_OPTIONS[0]);
  const [age, setAge] = useState("");
  const [nationality, setNationality] = useState("");
  const [city, setCity] = useState<string>(SERVICE_AREA_OPTIONS[0]);
  const [services, setServices] = useState<string[]>([]);
  const [bustType, setBustType] = useState<string>(BUST_TYPE_OPTIONS[0]);
  const [pubicHair, setPubicHair] = useState<string>("Trimmed");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [wechatId, setWechatId] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [policyConfirmed, setPolicyConfirmed] = useState(false);
  const [termsConfirmed, setTermsConfirmed] = useState(false);
  const [privacyConfirmed, setPrivacyConfirmed] = useState(false);
  const [noNudeConfirmed, setNoNudeConfirmed] = useState(false);
  const hasAllConfirmations = policyConfirmed && termsConfirmed && privacyConfirmed && noNudeConfirmed;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hasAllConfirmations) {
      setError("Please confirm all agreements before registering.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    const phoneRegex = /^\+\d{1,4}\d{6,16}$/;
    const normalizedPhone = phoneNumber.replace(/[\s-]/g, "");
    const normalizedWhatsapp = whatsappNumber.replace(/[\s-]/g, "");
    if (!normalizedPhone || !phoneRegex.test(normalizedPhone)) {
      setError("Phone number must include country code, e.g. +6281234567");
      return;
    }
    if (!normalizedWhatsapp || !phoneRegex.test(normalizedWhatsapp)) {
      setError("WhatsApp number must include country code, e.g. +6281234567");
      return;
    }
    // Services and Hair Length are not collected at registration — those
    // live in the profile editor.
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register/creator`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: email.trim().toLowerCase(),
          password,
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
          bustType,
          pubicHair,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json?.error === "username_taken") throw new Error("Username is already taken. Choose another.");
        throw new Error(json?.error ?? "Registration failed.");
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
        title={"Create Creator Account — Bali Girls"}
        description={"Become a Bali Girls creator. Set up your profile, photos, and contact details."}
        path={"/creator/register"}
        index={true}
      />
      <div className="text-center">
        <div className="text-xs tracking-luxe text-brand-muted">CREATOR</div>
        <h1 className="mt-2 font-display text-3xl">Create Creator Account</h1>
      </div>

      <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7 shadow-luxe">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs tracking-[0.22em] text-brand-muted">USERNAME (EMAIL) <span className="normal-case text-brand-muted/60">(used as your login)</span></label>
            <input required type="email" className={inp} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="username@email.com" aria-label="Username email" />
          </div>

          <div>
            <label className="text-xs tracking-[0.22em] text-brand-muted">PASSWORD</label>
            <div className="relative mt-2">
              <input
                required
                type={showPassword ? "text" : "password"}
                className="w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 pr-16 text-sm outline-none placeholder:text-brand-muted/60 focus:border-brand-gold/60"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                aria-label="Password"
              />
              <button type="button" className="absolute right-0 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-xs text-brand-muted hover:text-brand-text" onClick={() => setShowPassword((p) => !p)}>
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs tracking-[0.22em] text-brand-muted">CONFIRM PASSWORD</label>
            <input required type={showPassword ? "text" : "password"} className={inp} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" aria-label="Confirm password" />
          </div>

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

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs tracking-[0.22em] text-brand-muted">BUST TYPE</label>
              <select className={sel} value={bustType} onChange={(e) => setBustType(e.target.value)} aria-label="Bust Type">
                {BUST_TYPE_OPTIONS.map((v) => (<option key={v} value={v}>{v}</option>))}
              </select>
            </div>
            <div>
              <label className="text-xs tracking-[0.22em] text-brand-muted">PUBIC HAIR</label>
              <select className={sel} value={pubicHair} onChange={(e) => setPubicHair(e.target.value)} aria-label="Pubic Hair">
                {PUBIC_HAIR_OPTIONS.map((v) => (<option key={v} value={v}>{v}</option>))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs tracking-[0.22em] text-brand-muted">
              SERVICES <span className="normal-case text-brand-muted/60">(select all that apply)</span>
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {SERVICES_OPTIONS.map((s) => {
                const checked = services.includes(s);
                return (
                  <label key={s} className="flex items-center gap-2 rounded-xl border border-brand-line bg-brand-surface2/40 px-3 py-2 text-xs">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) setServices((prev) => [...prev, s]);
                        else setServices((prev) => prev.filter((v) => v !== s));
                      }}
                    />
                    <span>{s}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs tracking-[0.22em] text-brand-muted">PHONE/SMS</label>
              <input required className={inp} value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+6281234567890" aria-label="Phone / SMS" />
            </div>
            <div>
              <label className="text-xs tracking-[0.22em] text-brand-muted">WHATSAPP <span className="normal-case text-brand-muted/60">(used for 2FA)</span></label>
              <input required className={inp} value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="+6281234567890" aria-label="WhatsApp number" />
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

          {error ? <div className="text-xs text-red-400">{error}</div> : null}

          <button disabled={loading || !hasAllConfirmations} className="btn btn-primary btn-block min-h-[44px] py-3">
            {loading ? "CREATING ACCOUNT..." : "CREATE CREATOR ACCOUNT"}
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
