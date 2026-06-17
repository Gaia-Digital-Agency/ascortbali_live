import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, clearTokens, setTokens, API_BASE } from "../lib/api";
import { withBasePath } from "../lib/paths";
import { PageMeta } from "../components/PageMeta";

type UserProfile = {
  email: string;
  fullName: string;
  gender: "female" | "male" | "transgender";
  ageGroup: "18-24" | "25-34" | "35-44" | "45-54" | "55-64" | "65+" | "45+";
  nationality: string;
  city: string;
  relationshipStatus: "single" | "married" | "other";
  whatsapp: string;
};

const defaultProfile: UserProfile = {
  email: "",
  fullName: "",
  gender: "female",
  ageGroup: "25-34",
  nationality: "",
  city: "",
  relationshipStatus: "single",
  whatsapp: "",
};

// 8-char alphanumeric password generator (no ambiguous chars).
const genPassword = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
};

export default function UserDashboard({ mode = "edit" }: { mode?: "edit" | "register" }) {
  const isRegister = mode === "register";
  // Register mode: username + password + confirm are auto-generated and shown
  // READ-ONLY here (they are only editable in the admin user view).
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [me, setMe] = useState<{ username: string; role: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pwCurrent, setPwCurrent] = useState("User@123");
  const [pwNew, setPwNew] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [showPwCurrent, setShowPwCurrent] = useState(false);
  const [showPwNew, setShowPwNew] = useState(false);
  const [pwConfirm, setPwConfirm] = useState("");
  const [showPwConfirm, setShowPwConfirm] = useState(false);

  useEffect(() => {
    if (isRegister) {
      // Auto-generate username + password + confirm; all shown read-only here.
      setProfile((prev) => ({ ...prev, email: prev.email || ("user_" + Math.random().toString(36).slice(2, 8)) }));
      const pw = genPassword();
      setRegPassword(pw);
      setRegConfirm(pw);
      return;
    }
    (async () => {
      try {
        const m = await apiFetch("/me");
        if (m.role !== "user") {
          clearTokens();
          window.location.href = withBasePath("/user");
          return;
        }
        setMe(m);
        const p = await apiFetch("/me/user-profile");
        setProfile(p);
      } catch {
        window.location.href = withBasePath("/user");
      }
    })();
  }, []);

  const update = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) =>
    setProfile((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (!profile.email.trim()) {
        throw new Error("Username is required.");
      }
      if (!profile.fullName.trim() || !profile.nationality.trim() || !profile.city.trim()) {
        throw new Error("All fields are compulsory.");
      }
      await apiFetch("/me/user-profile", { method: "PUT", body: JSON.stringify(profile) });
      setMessage("Profile updated.");
    } catch (err: any) {
      if (err?.message === "email_taken") {
        setError("That username is already taken — try a different one");
      } else {
        setError(err.message ?? "Couldn't save your changes — please try again");
      }
    } finally {
      setSaving(false);
    }
  };

  // Register-mode submit: this same form creates a new user account.
  const registerUser = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const username = profile.email.trim();
      if (!username) throw new Error("Username is required.");
      if (!/^[a-zA-Z0-9_]+$/.test(username)) throw new Error("Username: letters, numbers and underscores only.");
      if (username.length < 3) throw new Error("Username needs at least 3 characters.");
      const whatsapp = profile.whatsapp.replace(/[\s-]/g, "");
      if (!/^\+\d{1,4}\d{6,16}$/.test(whatsapp)) throw new Error("Include your WhatsApp number with country code, e.g. +628****4567.");
      if (!profile.fullName.trim() || !profile.nationality.trim() || !profile.city.trim()) throw new Error("All fields are compulsory.");
      if (regPassword !== regConfirm) throw new Error("Password and confirm password do not match.");
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username,
          fullName: profile.fullName.trim(),
          gender: profile.gender,
          ageGroup: profile.ageGroup,
          nationality: profile.nationality.trim(),
          city: profile.city.trim(),
          relationshipStatus: profile.relationshipStatus,
          whatsapp,
          password: regPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json?.error === "username_taken") throw new Error("That username is taken — try a different one.");
        if (json?.error === "invalid_body" && json?.details) {
          const fe = json.details.fieldErrors ?? {};
          const parts = Object.entries(fe).map(([f, m]) => `${f}: ${(m as string[]).join(", ")}`);
          throw new Error([...parts, ...(json.details.formErrors ?? [])].filter(Boolean).join("; ") || "Some details are invalid — please check the form.");
        }
        throw new Error(json?.error ?? "Something went wrong — please try again.");
      }
      setTokens({ accessToken: json.accessToken });
      window.location.href = withBasePath("/");
    } catch (err: any) {
      setError(err.message ?? "Couldn't create your account — please try again.");
    } finally {
      setSaving(false);
    }
  };

  const logout = () => {
    clearTokens();
    window.location.assign(withBasePath("/"));
  };

  const changePassword = async () => {
    setPwSaving(true);
    setPwMsg(null);
    setError(null);
    if (pwNew !== pwConfirm) {
      setPwSaving(false);
      setError("New passwords do not match");
      return;
    }
    try {
      await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
      });
      setPwMsg("Password updated.");
      setPwNew("");
      setPwConfirm("");
    } catch (err: any) {
      setError(err.message ?? "Couldn't change your password — please try again");
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageMeta
        title={"Member Profile — Bali Girls"}
        description={"Your Bali Girls member profile."}
        path={"/user/logged"}
        index={false}
      />
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mt-2 font-display text-3xl">{isRegister ? "CREATE ACCOUNT" : "USER INFORMATION"}</h1>
          <p className="mt-2 text-sm text-brand-muted">
            {isRegister
              ? "No password needed — you'll sign in with your WhatsApp number and verify on WhatsApp."
              : me ? `Signed in as ${me.username}` : "Loading..."}
          </p>
        </div>
        {!isRegister ? (
        <div className="flex gap-3">
          <Link className="btn btn-outline" to="/">BACK HOME</Link>
          <Link className="btn btn-outline" to="/user/logged">EDIT PROFILE</Link>
          <button onClick={logout} className="btn btn-outline">LOGOUT</button>
        </div>
        ) : null}
      </div>

      {error ? <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">{error}</div> : null}
      {message ? <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">{message}</div> : null}

      <section className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7">
        <div className="text-xs tracking-luxe text-brand-muted">ALL FIELDS REQUIRED</div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="USERNAME (login ID)">
            <input type="text" readOnly className="w-full rounded-2xl border border-brand-line bg-brand-surface2/20 px-4 py-3 text-sm text-brand-muted outline-none" value={profile.email} placeholder="auto-generated" />
          </Field>
          {isRegister ? (
            <>
              <Field label="PASSWORD (auto-generated)">
                <input type="text" readOnly className="w-full rounded-2xl border border-brand-line bg-brand-surface2/20 px-4 py-3 text-sm text-brand-muted outline-none" value={regPassword} />
              </Field>
              <Field label="CONFIRM PASSWORD">
                <input type="text" readOnly className="w-full rounded-2xl border border-brand-line bg-brand-surface2/20 px-4 py-3 text-sm text-brand-muted outline-none" value={regConfirm} />
              </Field>
            </>
          ) : null}
          <Field label="FULL NAME">
            <input className="w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60" value={profile.fullName} onChange={(e) => update("fullName", e.target.value)} />
          </Field>
          <Field label="NATIONALITY">
            <input className="w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60" value={profile.nationality} onChange={(e) => update("nationality", e.target.value)} />
          </Field>
          <Field label="CURRENT CITY">
            <input className="w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60" value={profile.city} onChange={(e) => update("city", e.target.value)} />
          </Field>
          <Field label="WHATSAPP NUMBER (used for 2FA and login)">
            <input className="w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60" value={profile.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} placeholder="+6281234567890" />
          </Field>
          <Field label="AGE GROUP">
            <select className="w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60" value={profile.ageGroup} onChange={(e) => update("ageGroup", e.target.value as UserProfile["ageGroup"])}>
              <option value="18-24">18-24</option>
              <option value="25-34">25-34</option>
              <option value="35-44">35-44</option>
              <option value="45-54">45-54</option>
              <option value="55-64">55-64</option>
              <option value="65+">65+</option>
            </select>
          </Field>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <RadioGroup label="GENDER" value={profile.gender} options={["female", "male", "transgender"]} onChange={(value) => update("gender", value as UserProfile["gender"])} />
          <RadioGroup label="RELATIONSHIP STATUS" value={profile.relationshipStatus} options={["single", "married", "other"]} onChange={(value) => update("relationshipStatus", value as UserProfile["relationshipStatus"])} />
        </div>

        <div className="mt-6">
          <button onClick={isRegister ? registerUser : save} disabled={saving} className="btn btn-primary py-3">
            {saving ? (isRegister ? "CREATING ACCOUNT..." : "SAVING...") : (isRegister ? "CREATE ACCOUNT" : "SAVE PROFILE")}
          </button>
        </div>
        {isRegister ? (
          <div className="mt-4 text-center text-xs text-brand-muted">
            Already have an account?{" "}
            <Link to="/user" className="text-brand-gold underline">Sign In</Link>
          </div>
        ) : null}
      </section>

      {!isRegister ? (
      <section className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7">
        <div className="text-xs tracking-luxe text-brand-muted">CHANGE PASSWORD</div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="CURRENT PASSWORD">
            <PasswordInput value={pwCurrent} onChange={setPwCurrent} visible={showPwCurrent} onToggleVisibility={() => setShowPwCurrent((prev) => !prev)} />
          </Field>
          <Field label="NEW PASSWORD">
            <PasswordInput value={pwNew} onChange={setPwNew} visible={showPwNew} onToggleVisibility={() => setShowPwNew((prev) => !prev)} />
          </Field>
          <Field label="CONFIRM NEW PASSWORD">
            <PasswordInput value={pwConfirm} onChange={setPwConfirm} visible={showPwConfirm} onToggleVisibility={() => setShowPwConfirm((prev) => !prev)} />
          </Field>
        </div>
        {pwMsg ? <div className="mt-4 text-xs text-emerald-400">{pwMsg}</div> : null}
        {pwNew && pwConfirm && pwNew !== pwConfirm ? <div className="mt-4 text-xs text-yellow-300">Passwords do not match</div> : null}
        <div className="mt-6">
          <button onClick={changePassword} disabled={pwSaving || !pwNew.trim() || pwNew !== pwConfirm} className="btn btn-primary py-3">
            {pwSaving ? "SAVING..." : "UPDATE PASSWORD"}
          </button>
        </div>
      </section>
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

function PasswordInput({
  value, onChange, visible, onToggleVisibility,
}: {
  value: string; onChange: (value: string) => void; visible: boolean; onToggleVisibility: () => void;
}) {
  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        className="w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 pr-16 text-sm outline-none focus:border-brand-gold/60"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-brand-muted hover:text-brand-text" onClick={onToggleVisibility}>
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}

function RadioGroup({
  label, value, options, onChange,
}: {
  label: string; value: string; options: string[]; onChange: (value: string) => void;
}) {
  return (
    <div>
      <div className="text-xs tracking-[0.22em] text-brand-muted">{label}</div>
      <div className="mt-3 space-y-2">
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
