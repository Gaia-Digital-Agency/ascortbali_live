import { useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE, setTokens } from "../lib/api";
import { withBasePath } from "../lib/paths";

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

export default function UserRegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<"female" | "male" | "transgender">("male");
  const [ageGroup, setAgeGroup] = useState<"18-24" | "25-34" | "35-44" | "45-54" | "55-64" | "65+">("25-34");
  const [nationality, setNationality] = useState("");
  const [city, setCity] = useState("");
  const [preferredContact, setPreferredContact] = useState<"whatsapp" | "telegram" | "wechat">("whatsapp");
  const [relationshipStatus, setRelationshipStatus] = useState<"single" | "married" | "other">("single");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phoneRegex = /^\+\d{1,4}\d{6,16}$/;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    const normalizedPhone = phoneNumber.replace(/[\s-]/g, "");
    const normalizedWhatsapp = whatsappNumber.replace(/[\s-]/g, "");
    if (!email.trim()) { setError("Email is required."); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setError("Please provide a valid email."); return; }
    if (!phoneRegex.test(normalizedPhone)) { setError("Phone number must include country code, e.g. +6281234567"); return; }
    if (!phoneRegex.test(normalizedWhatsapp)) { setError("WhatsApp number must include country code, e.g. +6281234567"); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          gender,
          ageGroup,
          nationality: nationality.trim(),
          city: city.trim(),
          preferredContact,
          relationshipStatus,
          phoneNumber: normalizedPhone,
          whatsapp: normalizedWhatsapp,
          telegramId: telegramId.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json?.error === "username_taken") throw new Error("Email is already taken.");
        throw new Error(json?.error ?? "Registration failed.");
      }
      setTokens({ accessToken: json.accessToken });
      window.location.href = withBasePath("/");
    } catch (err: any) {
      setError(err.message ?? "Unable to register.");
    } finally {
      setLoading(false);
    }
  };

  const fieldClass = "mt-2 w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none placeholder:text-brand-muted/60 focus:border-brand-gold/60";

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="text-center">
        <div className="text-xs tracking-luxe text-brand-muted">USER ACCESS</div>
        <h1 className="mt-2 font-display text-3xl">Create Account</h1>
      </div>

      <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7 shadow-luxe">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs tracking-[0.22em] text-brand-muted">EMAIL <span className="normal-case text-brand-muted/60">(used as your login username)</span></label>
            <input required className={fieldClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" aria-label="Email" />
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
            <input required type={showPassword ? "text" : "password"} className={fieldClass} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" aria-label="Confirm password" />
          </div>

          <hr className="border-brand-line" />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs tracking-[0.22em] text-brand-muted">PHONE NUMBER</label>
              <input required className={fieldClass} value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+6281234567890" aria-label="Phone number" />
            </div>
            <div>
              <label className="text-xs tracking-[0.22em] text-brand-muted">WHATSAPP <span className="normal-case text-brand-muted/60">(used for 2FA)</span></label>
              <input required className={fieldClass} value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="+6281234567890" aria-label="WhatsApp number" />
            </div>
          </div>

          <div>
            <label className="text-xs tracking-[0.22em] text-brand-muted">TELEGRAM ID (OPTIONAL)</label>
            <input className={fieldClass} value={telegramId} onChange={(e) => setTelegramId(e.target.value)} placeholder="@telegram_id" aria-label="Telegram ID" />
          </div>

          <hr className="border-brand-line" />

          <div>
            <label className="text-xs tracking-[0.22em] text-brand-muted">FULL NAME</label>
            <input required className={fieldClass} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" aria-label="Full name" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs tracking-[0.22em] text-brand-muted">GENDER</label>
              <select required className={fieldClass} value={gender} onChange={(e) => setGender(e.target.value as any)} aria-label="Gender">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="transgender">Transgender</option>
              </select>
            </div>
            <div>
              <label className="text-xs tracking-[0.22em] text-brand-muted">AGE GROUP</label>
              <select required className={fieldClass} value={ageGroup} onChange={(e) => setAgeGroup(e.target.value as any)} aria-label="Age group">
                <option value="18-24">18–24</option>
                <option value="25-34">25–34</option>
                <option value="35-44">35–44</option>
                <option value="45-54">45–54</option>
                <option value="55-64">55–64</option>
                <option value="65+">65+</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs tracking-[0.22em] text-brand-muted">NATIONALITY</label>
              <select required className={fieldClass} value={nationality} onChange={(e) => setNationality(e.target.value)} aria-label="Nationality">
                <option value="" disabled>Select...</option>
                {NATIONALITIES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs tracking-[0.22em] text-brand-muted">CITY</label>
              <input required aria-label="City" className={fieldClass} value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Bali" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs tracking-[0.22em] text-brand-muted">PREFERRED CONTACT</label>
              <select required className={fieldClass} value={preferredContact} onChange={(e) => setPreferredContact(e.target.value as any)} aria-label="Preferred contact">
                <option value="whatsapp">WhatsApp</option>
                <option value="telegram">Telegram</option>
                <option value="wechat">WeChat</option>
              </select>
            </div>
            <div>
              <label className="text-xs tracking-[0.22em] text-brand-muted">RELATIONSHIP STATUS</label>
              <select required className={fieldClass} value={relationshipStatus} onChange={(e) => setRelationshipStatus(e.target.value as any)} aria-label="Relationship status">
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {error ? <div className="text-xs text-red-400">{error}</div> : null}

          <button disabled={loading} className="btn btn-primary btn-block min-h-[44px] py-3">
            {loading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
          </button>

          <div className="text-center text-xs text-brand-muted">
            Already have an account?{" "}
            <Link to="/user" className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-brand-gold underline">
              Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
