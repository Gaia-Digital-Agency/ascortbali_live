import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getAccessToken } from "../lib/api";
import { withBasePath } from "../lib/paths";
import { AdminTabs } from "../components/AdminTabs";

type Blog = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  heroImage: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type DraftBlog = {
  id?: string;
  title: string;
  excerpt: string;
  body: string;
  heroImage: string;
  publishedAt: string; // ISO string or empty
};

const emptyDraft: DraftBlog = {
  title: "",
  excerpt: "",
  body: "",
  heroImage: "",
  publishedAt: "",
};

const heroSrc = (img: string | null | undefined) => {
  if (!img) return null;
  if (img.startsWith("http://") || img.startsWith("https://")) return img;
  return withBasePath(img);
};

const fmtDate = (iso: string | null) => {
  if (!iso) return "DRAFT";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return "—"; }
};

export default function AdminBlogsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<DraftBlog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Auth/role check at the top — no token or non-admin token bounces.
  useEffect(() => {
    if (!getAccessToken()) {
      navigate("/admin", { replace: true });
    }
  }, [navigate]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ items: Blog[] }>("/admin/blogs");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setError((e as Error).message || "load_failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const startCreate = () => setEditing({ ...emptyDraft });
  const startEdit = (b: Blog) => setEditing({
    id: b.id,
    title: b.title,
    excerpt: b.excerpt ?? "",
    body: b.body,
    heroImage: b.heroImage ?? "",
    publishedAt: b.publishedAt ?? "",
  });
  const cancelEdit = () => setEditing(null);

  const onUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", "blogs");
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error(`upload_failed_${res.status}`);
      const data = await res.json();
      if (!data.url) throw new Error("upload_no_url");
      setEditing((d) => d ? { ...d, heroImage: data.url } : d);
    } catch (e) {
      setError((e as Error).message || "upload_failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onSave = async () => {
    if (!editing) return;
    if (!editing.title.trim() || !editing.body.trim()) {
      setError("Title and Article body are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: editing.title.trim(),
        excerpt: editing.excerpt.trim() || null,
        body: editing.body,
        heroImage: editing.heroImage.trim() || null,
        publishedAt: editing.publishedAt
          ? new Date(editing.publishedAt).toISOString()
          : null,
      };
      if (editing.id) {
        await apiFetch(`/admin/blogs/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch(`/admin/blogs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setEditing(null);
      await load();
    } catch (e) {
      setError((e as Error).message || "save_failed");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (b: Blog) => {
    if (!confirm(`Delete "${b.title}"? This cannot be undone.`)) return;
    try {
      await apiFetch(`/admin/blogs/${b.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError((e as Error).message || "delete_failed");
    }
  };

  const inputClass =
    "w-full rounded-xl border border-brand-line bg-black/30 px-4 py-2 text-sm text-brand-text placeholder:text-brand-muted/60 focus:border-brand-gold focus:outline-none";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <AdminTabs />
      <h1 className="mb-6 text-center text-2xl font-light tracking-[0.18em] text-brand-text">
        BLOG MANAGEMENT
      </h1>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {!editing ? (
        <>
          <div className="mb-6 flex justify-end">
            <button
              type="button"
              onClick={startCreate}
              className="rounded-full border border-brand-gold bg-brand-gold/20 px-5 py-2 text-xs tracking-[0.18em] text-brand-text hover:bg-brand-gold/30"
            >
              + NEW ARTICLE
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-20 rounded-xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-brand-line bg-brand-surface/30 p-10 text-center text-sm tracking-[0.18em] text-brand-muted">
              NO ARTICLES YET — CLICK "NEW ARTICLE" TO START
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center gap-4 rounded-xl border border-brand-line bg-brand-surface/30 p-3"
                >
                  <div className="h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-black/40">
                    {b.heroImage ? (
                      <img
                        src={heroSrc(b.heroImage)!}
                        alt={b.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-brand-muted">
                        NO IMAGE
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-brand-text">
                      {b.title}
                    </div>
                    <div className="text-xs text-brand-muted">
                      {fmtDate(b.publishedAt)} · /blog/{b.slug}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(b)}
                      className="rounded-full border border-brand-line px-3 py-1 text-xs tracking-[0.18em] text-brand-muted hover:border-brand-gold hover:text-brand-gold"
                    >
                      EDIT
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(b)}
                      className="rounded-full border border-red-500/40 px-3 py-1 text-xs tracking-[0.18em] text-red-300 hover:bg-red-500/20"
                    >
                      DELETE
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <div className="space-y-4 rounded-2xl border border-brand-line bg-brand-surface/30 p-6">
          <div>
            <label className="mb-1 block text-xs tracking-[0.18em] text-brand-muted">
              TITLE *
            </label>
            <input
              className={inputClass}
              value={editing.title}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              placeholder="Article title (slug auto-generated from this)"
              maxLength={200}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs tracking-[0.18em] text-brand-muted">
              EXCERPT (optional — used for meta description; auto-falls back to body if empty)
            </label>
            <textarea
              className={inputClass + " min-h-[80px]"}
              value={editing.excerpt}
              onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })}
              placeholder="One- or two-sentence summary for the listing card and search engines."
              maxLength={500}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs tracking-[0.18em] text-brand-muted">
              HERO IMAGE
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {editing.heroImage ? (
                <img
                  src={heroSrc(editing.heroImage)!}
                  alt="Current hero"
                  className="h-20 w-36 rounded-lg border border-brand-line object-cover"
                />
              ) : (
                <div className="flex h-20 w-36 items-center justify-center rounded-lg border border-dashed border-brand-line text-[10px] text-brand-muted">
                  NO IMAGE
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUpload(f);
                }}
                className="text-xs text-brand-muted"
              />
              {uploading ? (
                <span className="text-xs text-brand-muted">UPLOADING…</span>
              ) : null}
              {editing.heroImage ? (
                <button
                  type="button"
                  onClick={() => setEditing({ ...editing, heroImage: "" })}
                  className="rounded-full border border-brand-line px-3 py-1 text-xs tracking-[0.18em] text-brand-muted hover:border-red-400 hover:text-red-300"
                >
                  REMOVE
                </button>
              ) : null}
            </div>
            <div className="mt-1 text-[11px] text-brand-muted">
              Recommended 1200×675 (16:9). Stored in GCS at baligirls/blogs/.
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs tracking-[0.18em] text-brand-muted">
              ARTICLE BODY * (Markdown supported — # heading, **bold**, [link](url), tables, lists)
            </label>
            <textarea
              className={inputClass + " min-h-[400px] font-mono text-[13px]"}
              value={editing.body}
              onChange={(e) => setEditing({ ...editing, body: e.target.value })}
              placeholder={`## Heading\n\nFirst paragraph...\n\n- list item\n\n[link](https://example.com)`}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs tracking-[0.18em] text-brand-muted">
              PUBLISH DATE (leave empty to save as draft — drafts are not visible to public)
            </label>
            <input
              type="datetime-local"
              className={inputClass}
              value={
                editing.publishedAt
                  ? new Date(editing.publishedAt).toISOString().slice(0, 16)
                  : ""
              }
              onChange={(e) =>
                setEditing({
                  ...editing,
                  publishedAt: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : "",
                })
              }
            />
          </div>

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              className="rounded-full border border-brand-line px-5 py-2 text-xs tracking-[0.18em] text-brand-muted hover:border-brand-gold hover:text-brand-text disabled:opacity-50"
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving || uploading}
              className="rounded-full border border-brand-gold bg-brand-gold/20 px-6 py-2 text-xs tracking-[0.18em] text-brand-text hover:bg-brand-gold/30 disabled:opacity-50"
            >
              {saving ? "SAVING…" : editing.id ? "SAVE CHANGES" : "CREATE ARTICLE"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
