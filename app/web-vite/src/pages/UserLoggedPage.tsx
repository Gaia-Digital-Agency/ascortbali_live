import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, clearTokens } from "../lib/api";
import { withBasePath } from "../lib/paths";
import { PageMeta } from "../components/PageMeta";

type UserProfile = {
  email: string;
  fullName: string;
  gender: "female" | "male" | "transgender";
  ageGroup: "18-24" | "25-34" | "35-44" | "45+";
  nationality: string;
  city: string;
  preferredContact: "whatsapp" | "telegram" | "wechat";
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
  preferredContact: "telegram",
  relationshipStatus: "single",
  whatsapp: "",
};

export default function UserDashboard() {
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
          <h1 className="mt-2 font-display text-3xl">USER INFORMATION</h1>
          <p className="mt-2 text-sm text-brand-muted">{me ? `Signed in as ${me.username}` : "Loading..."}</p>
        </div>
        <div className="flex gap-3">
          <Link className="btn btn-outline" to="/">BACK HOME</Link>
          <Link className="btn btn-outline" to="/user/logged">EDIT PROFILE</Link>
          <button onClick={logout} className="btn btn-outline">LOGOUT</button>
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">{error}</div> : null}
      {message ? <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">{message}</div> : null}

      <section className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7">
        <div className="text-xs tracking-luxe text-brand-muted">ALL FIELDS REQUIRED</div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="USERNAME (login ID)">
            <input type="text" className="w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60" value={profile.email} onChange={(e) => update("email", e.target.value)} placeholder="your_username" />
          </Field>
          <Field label="FULL NAME">
            <input className="w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60" value={profile.fullName} onChange={(e) => update("fullName", e.target.value)} />
          </Field>
          <Field label="NATIONALITY">
            <input className="w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60" value={profile.nationality} onChange={(e) => update("nationality", e.target.value)} />
          </Field>
          <Field label="CITY">
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
              <option value="45+">45+</option>
            </select>
          </Field>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <RadioGroup label="GENDER" value={profile.gender} options={["female", "male", "transgender"]} onChange={(value) => update("gender", value as UserProfile["gender"])} />
          <RadioGroup label="PREFERRED CONTACT" value={profile.preferredContact} options={["whatsapp", "telegram", "wechat"]} onChange={(value) => update("preferredContact", value as UserProfile["preferredContact"])} />
          <RadioGroup label="RELATIONSHIP STATUS" value={profile.relationshipStatus} options={["single", "married", "other"]} onChange={(value) => update("relationshipStatus", value as UserProfile["relationshipStatus"])} />
        </div>

        <div className="mt-6">
          <button onClick={save} disabled={saving} className="btn btn-primary py-3">
            {saving ? "SAVING..." : "SAVE PROFILE"}
          </button>
        </div>
      </section>

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
