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
} from "../lib/creatorOptions";

const AGES = Array.from({ length: 53 }, (_, i) => 18 + i); // 18–70

// Title-case the lower-case enum values used in shared options for display
// in <option> labels (browser CSS on <option> is unreliable).
const titleCase = (s: string) => s.replace(/\b([a-z])/g, (m) => m.toUpperCase());

export default function CreatorRegisterPage() {
  const [modelName, setModelName] = useState("");
  const [gender, setGender] = useState("");
  const [form, setForm] = useState<string[]>([CATEGORY_OPTIONS[0]]);
  const toggleForm = (option: string) =>
    setForm((prev) => (prev.includes(option) ? prev.filter((v) => v !== option) : [...prev, option]));
  const [orientation, setOrientation] = useState<string>(ORIENTATION_OPTIONS[0]);
  const [age, setAge] = useState("");
  const [city, setCity] = useState<string>(SERVICE_AREA_OPTIONS[0]);
  const [services, setServices] = useState("");
  const [hairLength, setHairLength] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [wechatId, setWechatId] = useState("");
  const [languages, setLanguages] = useState("");
  const [eyes, setEyes] = useState("");
  const [hairColor, setHairColor] = useState("");
  const [ethnicity, setEthnicity] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [meetingWith, setMeetingWith] = useState("");
  const [availableFor, setAvailableFor] = useState("");
  const [smoker, setSmoker] = useState("");
  const [tattoo, setTattoo] = useState("");
  const [piercing, setPiercing] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const [policyConfirmed, setPolicyConfirmed] = useState(false);
  const [termsConfirmed, setTermsConfirmed] = useState(false);
  const [privacyConfirmed, setPrivacyConfirmed] = useState(false);
  const [noNudeConfirmed, setNoNudeConfirmed] = useState(false);
  const hasAllConfirmations = policyConfirmed && termsConfirmed && privacyConfirmed && noNudeConfirmed;

  const clearFieldError = (field: string) => setFieldErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });

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
    setFieldErrors({});

    if (!hasAllConfirmations) {
      setError("Please confirm all agreements before registering.");
      return;
    }
    const phoneRegex = /^\+\d{1,4}\d{6,16}$/;
    const normalizedWhatsapp = whatsappNumber.replace(/[\s-]/g, "");
    if (!/^[A-Za-z0-9-]{1,50}$/.test(modelName.trim())) {
      setFieldErrors({ modelName: "Single word, letters/numbers/hyphens only, no spaces" });
      return;
    }

    if (!normalizedWhatsapp || !phoneRegex.test(normalizedWhatsapp)) {
      setFieldErrors({ whatsapp: "Include country code, e.g. +628****4567" });
      return;
    }
    if (selectedFiles.length === 0) {
      setFieldErrors({ photos: "Select at least one profile photo" });
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
          modelName: modelName.trim(),
          gender,
          age: parseInt(age, 10),
          city: city.trim(),
          whatsapp: normalizedWhatsapp,
          telegramId: telegramId.trim() || undefined,
          wechatId: wechatId.trim() || undefined,
          form,
          orientation,
          hairLength: hairLength || undefined,
          services: services.trim() || undefined,
          imageFiles: imageUrls,
          languages: languages || undefined,
          eyes: eyes || undefined,
          hairColor: hairColor || undefined,
          ethnicity: ethnicity || undefined,
          height: height || undefined,
          weight: weight || undefined,
          meetingWith: meetingWith || undefined,
          availableFor: availableFor || undefined,
          smoker: smoker || undefined,
          tattoo: tattoo || undefined,
          piercing: piercing || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json?.error === "invalid_body" && json?.details) {
          const fieldErrors = json.details.fieldErrors ?? {};
          const parsed: Record<string, string> = {};
          for (const [field, msgs] of Object.entries(fieldErrors)) {
            parsed[field] = (msgs as string[]).join(", ");
          }
          setFieldErrors(parsed);
          // Also surface a readable summary at the top — some fields are hidden
          // (username/email) and have no inline slot, so without this the error
          // would be invisible to the user.
          const formErrors: string[] = json.details.formErrors ?? [];
          const summary = [
            ...Object.entries(parsed).map(([f, m]) => `${f}: ${m}`),
            ...formErrors,
          ].filter(Boolean).join("; ");
          setError(summary || "Some details are invalid — please check the form.");
          return;
        }
        const messages: Record<string, string> = {
          username_taken: "That username is already taken — please choose another.",
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

  const FE = (f: string) => fieldErrors[f] ? <div className="mt-1 text-xs text-amber-400">{fieldErrors[f]}</div> : null;

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
          <p className="text-xs text-brand-muted">
            No password needed — you&apos;ll sign in with your WhatsApp number and verify on WhatsApp.
          </p>

          <hr className="border-brand-line" />

          <div>
            <label className="text-xs tracking-[0.22em] text-brand-muted">DISPLAY NAME</label>
            <input required className={inp} value={modelName} onChange={(e) => { setModelName(e.target.value); clearFieldError("modelName"); }} placeholder="Your display name" aria-label="Display name" />
            {FE("modelName")}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs tracking-[0.22em] text-brand-muted">GENDER</label>
              <select required className={sel} value={gender} onChange={(e) => { setGender(e.target.value); clearFieldError("gender"); }} aria-label="Gender">
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
              <select required className={sel} value={age} onChange={(e) => { setAge(e.target.value); clearFieldError("age"); }} aria-label="Age">
                <option value="" disabled>Select...</option>
                {AGES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs tracking-[0.22em] text-brand-muted">LOCATION</label>
            <select required className={sel} value={city} onChange={(e) => { setCity(e.target.value); clearFieldError("city"); }} aria-label="Location">
              {SERVICE_AREA_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs tracking-[0.22em] text-brand-muted">ORIENTATION</label>
            <select className={sel} value={orientation} onChange={(e) => { setOrientation(e.target.value); clearFieldError("orientation"); }} aria-label="Orientation">
              {ORIENTATION_OPTIONS.map((o) => (
                <option key={o} value={o}>{titleCase(o)}</option>
              ))}
            </select>
          </div>

          <hr className="border-brand-line" />

          <div>
            <label className="text-xs tracking-[0.22em] text-brand-muted">SERVICES <span className="normal-case text-brand-muted/60">(optional)</span></label>
            <textarea
              className="mt-2 min-h-[80px] w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none placeholder:text-brand-muted/60 focus:border-brand-gold/60"
              maxLength={150}
              value={services}
              onChange={(e) => { setServices(e.target.value); clearFieldError("services"); }}
              placeholder="Describe the services you offer..."
              aria-label="Services"
            />
            <p className="mt-1 text-[11px] text-brand-muted">Limit 150 characters — currently {services.length}</p>
            {FE("services")}
          </div>

          <div>
            <label className="text-xs tracking-[0.22em] text-brand-muted">HAIR LENGTH </label>
            <select className={sel} value={hairLength} onChange={(e) => { setHairLength(e.target.value); clearFieldError("hairLength"); }} aria-label="Hair length">
              <option value="">Select...</option>
              {HAIR_LENGTH_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>


          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs tracking-[0.22em] text-brand-muted">LANGUAGES </label>
              <select className={sel} value={languages} onChange={(e) => { setLanguages(e.target.value); clearFieldError("languages"); }} aria-label="Languages">
                <option value="">Select...</option>
                <option value="English">English</option>
                <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                <option value="Mandarin">Mandarin</option>
                <option value="Japanese">Japanese</option>
                <option value="Korean">Korean</option>
                <option value="Thai">Thai</option>
                <option value="Vietnamese">Vietnamese</option>
                <option value="Malay">Malay</option>
              </select>
            </div>
            <div>
              <label className="text-xs tracking-[0.22em] text-brand-muted">EYES </label>
              <select className={sel} value={eyes} onChange={(e) => { setEyes(e.target.value); clearFieldError("eyes"); }} aria-label="Eyes">
                <option value="">Select...</option>
                <option value="Brown">Brown</option>
                <option value="Dark Brown">Dark Brown</option>
                <option value="Black">Black</option>
                <option value="Hazel">Hazel</option>
                <option value="Blue">Blue</option>
                <option value="Green">Green</option>
                <option value="Gray">Gray</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs tracking-[0.22em] text-brand-muted">HAIR COLOR </label>
              <select className={sel} value={hairColor} onChange={(e) => { setHairColor(e.target.value); clearFieldError("hairColor"); }} aria-label="Hair color">
                <option value="">Select...</option>
                <option value="Black">Black</option>
                <option value="Dark Brown">Dark Brown</option>
                <option value="Brown">Brown</option>
                <option value="Light Brown">Light Brown</option>
                <option value="Blonde">Blonde</option>
                <option value="Red">Red</option>
                <option value="Auburn">Auburn</option>
              </select>
            </div>
            <div>
              <label className="text-xs tracking-[0.22em] text-brand-muted">ETHNICITY </label>
              <select className={sel} value={ethnicity} onChange={(e) => { setEthnicity(e.target.value); clearFieldError("ethnicity"); }} aria-label="Ethnicity">
                <option value="">Select...</option>
                <option value="Asian">Asian</option>
                <option value="West European">West European</option>
                <option value="Eastern European">Eastern European</option>
                <option value="African">African</option>
                <option value="Australian">Australian</option>
                <option value="North American">North American</option>
                <option value="South American">South American</option>
                <option value="Black">Black</option>
                <option value="Caucasian">Caucasian</option>
                <option value="Middle Eastern">Middle Eastern</option>
                <option value="Hispanic">Hispanic</option>
                <option value="Latin">Latin</option>
                <option value="Pacific Islander">Pacific Islander</option>
                <option value="Mixed">Mixed</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs tracking-[0.22em] text-brand-muted">HEIGHT </label>
              <select className={sel} value={height} onChange={(e) => { setHeight(e.target.value); clearFieldError("height"); }} aria-label="Height">
                <option value="">Select...</option>
                <option value="140cm - 144cm ">140cm - 144cm</option>
                <option value="145cm - 149cm ">145cm - 149cm</option>
                <option value="150cm - 154cm ">150cm - 154cm</option>
                <option value="155cm - 159cm ">155cm - 159cm</option>
                <option value="160cm - 164cm ">160cm - 164cm</option>
                <option value="165cm - 169cm ">165cm - 169cm</option>
                <option value="170cm - 174cm ">170cm - 174cm</option>
                <option value="175cm - 179cm ">175cm - 179cm</option>
                <option value="180cm - 184cm ">180cm - 184cm</option>
                <option value="185cm - 189cm ">185cm - 189cm</option>
                <option value="190cm - 194cm ">190cm - 194cm</option>
                <option value="195cm - 199cm ">195cm - 199cm</option>
                <option value="200cm+">200cm+</option>
              </select>
            </div>
            <div>
              <label className="text-xs tracking-[0.22em] text-brand-muted">WEIGHT </label>
              <select className={sel} value={weight} onChange={(e) => { setWeight(e.target.value); clearFieldError("weight"); }} aria-label="Weight">
                <option value="">Select...</option>
                <option value="30 kg">30 kg</option>
                <option value="31 kg">31 kg</option>
                <option value="32 kg">32 kg</option>
                <option value="33 kg">33 kg</option>
                <option value="34 kg">34 kg</option>
                <option value="35 kg">35 kg</option>
                <option value="36 kg">36 kg</option>
                <option value="37 kg">37 kg</option>
                <option value="38 kg">38 kg</option>
                <option value="39 kg">39 kg</option>
                <option value="40 kg">40 kg</option>
                <option value="41 kg">41 kg</option>
                <option value="42 kg">42 kg</option>
                <option value="43 kg">43 kg</option>
                <option value="44 kg">44 kg</option>
                <option value="45 kg">45 kg</option>
                <option value="46 kg">46 kg</option>
                <option value="47 kg">47 kg</option>
                <option value="48 kg">48 kg</option>
                <option value="49 kg">49 kg</option>
                <option value="50 kg">50 kg</option>
                <option value="51 kg">51 kg</option>
                <option value="52 kg">52 kg</option>
                <option value="53 kg">53 kg</option>
                <option value="54 kg">54 kg</option>
                <option value="55 kg">55 kg</option>
                <option value="56 kg">56 kg</option>
                <option value="57 kg">57 kg</option>
                <option value="58 kg">58 kg</option>
                <option value="59 kg">59 kg</option>
                <option value="60 kg">60 kg</option>
                <option value="61 kg">61 kg</option>
                <option value="62 kg">62 kg</option>
                <option value="63 kg">63 kg</option>
                <option value="64 kg">64 kg</option>
                <option value="65 kg">65 kg</option>
                <option value="66 kg">66 kg</option>
                <option value="67 kg">67 kg</option>
                <option value="68 kg">68 kg</option>
                <option value="69 kg">69 kg</option>
                <option value="70 kg">70 kg</option>
                <option value="71 kg">71 kg</option>
                <option value="72 kg">72 kg</option>
                <option value="73 kg">73 kg</option>
                <option value="74 kg">74 kg</option>
                <option value="75 kg">75 kg</option>
                <option value="76 kg">76 kg</option>
                <option value="77 kg">77 kg</option>
                <option value="78 kg">78 kg</option>
                <option value="79 kg">79 kg</option>
                <option value="80 kg">80 kg</option>
                <option value="81 kg">81 kg</option>
                <option value="82 kg">82 kg</option>
                <option value="83 kg">83 kg</option>
                <option value="84 kg">84 kg</option>
                <option value="85 kg">85 kg</option>
                <option value="86 kg">86 kg</option>
                <option value="87 kg">87 kg</option>
                <option value="88 kg">88 kg</option>
                <option value="89 kg">89 kg</option>
                <option value="90 kg">90 kg</option>
                <option value="91 kg">91 kg</option>
                <option value="92 kg">92 kg</option>
                <option value="93 kg">93 kg</option>
                <option value="94 kg">94 kg</option>
                <option value="95 kg">95 kg</option>
                <option value="96 kg">96 kg</option>
                <option value="97 kg">97 kg</option>
                <option value="98 kg">98 kg</option>
                <option value="99 kg">99 kg</option>
                <option value="100 kg+">100 kg+</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs tracking-[0.22em] text-brand-muted">INCALL/OUTCALL </label>
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-2 text-sm"><input type="radio" checked={availableFor === "incall"} onChange={() => { setAvailableFor("incall"); clearFieldError("availableFor"); }} /><span>Incall</span></label>
                <label className="flex items-center gap-2 text-sm"><input type="radio" checked={availableFor === "outcall"} onChange={() => { setAvailableFor("outcall"); clearFieldError("availableFor"); }} /><span>Outcall</span></label>
                <label className="flex items-center gap-2 text-sm"><input type="radio" checked={availableFor === "both"} onChange={() => { setAvailableFor("both"); clearFieldError("availableFor"); }} /><span>Both</span></label>
              </div>
            </div>
            <div>
              <label className="text-xs tracking-[0.22em] text-brand-muted">MEET </label>
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-2 text-sm"><input type="radio" checked={meetingWith === "men"} onChange={() => { setMeetingWith("men"); clearFieldError("meetingWith"); }} /><span>Men</span></label>
                <label className="flex items-center gap-2 text-sm"><input type="radio" checked={meetingWith === "women"} onChange={() => { setMeetingWith("women"); clearFieldError("meetingWith"); }} /><span>Women</span></label>
                <label className="flex items-center gap-2 text-sm"><input type="radio" checked={meetingWith === "couples"} onChange={() => { setMeetingWith("couples"); clearFieldError("meetingWith"); }} /><span>Couples</span></label>
                <label className="flex items-center gap-2 text-sm"><input type="radio" checked={meetingWith === "all"} onChange={() => { setMeetingWith("all"); clearFieldError("meetingWith"); }} /><span>All</span></label>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-xs tracking-[0.22em] text-brand-muted">SMOKER </label>
                <div className="mt-2 space-y-2">
                  <label className="flex items-center gap-2 text-sm"><input type="radio" checked={smoker === "yes"} onChange={() => { setSmoker("yes"); clearFieldError("smoker"); }} /><span>Yes</span></label>
                  <label className="flex items-center gap-2 text-sm"><input type="radio" checked={smoker === "no"} onChange={() => { setSmoker("no"); clearFieldError("smoker"); }} /><span>No</span></label>
                </div>
              </div>
              <div className="mt-3">
                <label className="text-xs tracking-[0.22em] text-brand-muted">TATTOO </label>
                <div className="mt-2 space-y-2">
                  <label className="flex items-center gap-2 text-sm"><input type="radio" checked={tattoo === "yes"} onChange={() => { setTattoo("yes"); clearFieldError("tattoo"); }} /><span>Yes</span></label>
                  <label className="flex items-center gap-2 text-sm"><input type="radio" checked={tattoo === "no"} onChange={() => { setTattoo("no"); clearFieldError("tattoo"); }} /><span>No</span></label>
                </div>
              </div>
              <div className="mt-3">
                <label className="text-xs tracking-[0.22em] text-brand-muted">PIERCING </label>
                <div className="mt-2 space-y-2">
                  <label className="flex items-center gap-2 text-sm"><input type="radio" checked={piercing === "yes"} onChange={() => { setPiercing("yes"); clearFieldError("piercing"); }} /><span>Yes</span></label>
                  <label className="flex items-center gap-2 text-sm"><input type="radio" checked={piercing === "no"} onChange={() => { setPiercing("no"); clearFieldError("piercing"); }} /><span>No</span></label>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs tracking-[0.22em] text-brand-muted">ABOUT ME </label>
            <textarea className="mt-2 min-h-[80px] w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none placeholder:text-brand-muted/60 focus:border-brand-gold/60" value={notes} onChange={(e) => { setNotes(e.target.value); clearFieldError("notes"); }} placeholder="Tell us about yourself..." />
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
            {FE("photos")}
            {FE("imageFiles")}
          </div>

          <hr className="border-brand-line" />

          <div className="grid grid-cols-2 gap-3">
            
            <div>
              <label className="text-xs tracking-[0.22em] text-brand-muted">WHATSAPP <span className="normal-case text-brand-muted/60">(used for 2FA)</span></label>
              <input required className={inp} value={whatsappNumber} onChange={(e) => { setWhatsappNumber(e.target.value); clearFieldError("whatsapp"); }} placeholder="+628****7890" aria-label="WhatsApp number" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs tracking-[0.22em] text-brand-muted">TELEGRAM </label>
              <input className={inp} value={telegramId} onChange={(e) => { setTelegramId(e.target.value); clearFieldError("telegramId"); }} placeholder="@username" aria-label="Telegram" />
            </div>
            <div>
              <label className="text-xs tracking-[0.22em] text-brand-muted">WECHAT ID </label>
              <input className={inp} value={wechatId} onChange={(e) => { setWechatId(e.target.value); clearFieldError("wechatId"); }} placeholder="WeChat ID" aria-label="WeChat ID" />
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
