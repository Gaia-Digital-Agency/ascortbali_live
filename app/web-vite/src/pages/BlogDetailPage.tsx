import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { API_BASE } from "../lib/api";
import { withBasePath } from "../lib/paths";
import { PageMeta } from "../components/PageMeta";

type Blog = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  heroImage: string | null;
  publishedAt: string | null;
};

const heroSrc = (img: string | null) => {
  if (!img) return null;
  if (img.startsWith("http://") || img.startsWith("https://")) return img;
  return withBasePath(img);
};

const fmtDate = (iso: string | null) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch { return ""; }
};

export default function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    fetch(`${API_BASE}/blogs/${encodeURIComponent(slug)}`)
      .then(async (r) => {
        if (cancelled) return;
        if (r.status === 404) { setNotFound(true); setBlog(null); return; }
        if (!r.ok) throw new Error("load_failed");
        const data = await r.json();
        setBlog(data);
      })
      .catch(() => { if (!cancelled) { setNotFound(true); setBlog(null); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 rounded-full border border-brand-line px-4 py-2 text-xs tracking-[0.18em] text-brand-muted hover:border-brand-gold hover:text-brand-gold"
        >
          ← BACK TO BLOG
        </Link>
      </div>

      {loading ? (
        <article className="space-y-4">
          <div className="skeleton aspect-[16/9] rounded-2xl" />
          <div className="skeleton h-10 w-3/4" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-5/6" />
        </article>
      ) : notFound || !blog ? (
        <>
          <PageMeta title="Article not found — Bali Girls" description="Article not found." path={`/blog/${slug}`} index={false} />
          <div className="rounded-2xl border border-brand-line bg-brand-surface/30 p-10 text-center text-sm tracking-[0.18em] text-brand-muted">
            ARTICLE NOT FOUND
          </div>
        </>
      ) : (
        <>
          <PageMeta
            title={`${blog.title} — Bali Girls`}
            description={blog.excerpt || `Read "${blog.title}" on Bali Girls.`}
            path={`/blog/${blog.slug}`}
            image={heroSrc(blog.heroImage) || undefined}
          />

          <article>
            {blog.heroImage ? (
              <div className="mb-6 overflow-hidden rounded-2xl border border-brand-line bg-black/40">
                <img
                  src={heroSrc(blog.heroImage)!}
                  alt={blog.title}
                  width={1200}
                  height={675}
                  decoding="async"
                  className="h-auto w-full object-cover"
                />
              </div>
            ) : null}

            <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-brand-muted">
              {fmtDate(blog.publishedAt)}
            </div>
            <h1 className="mb-6 text-3xl font-light leading-tight tracking-wide text-brand-text md:text-4xl">
              {blog.title}
            </h1>
            {blog.excerpt ? (
              <p className="mb-8 border-l-2 border-brand-gold/60 pl-4 text-base italic leading-relaxed text-brand-muted">
                {blog.excerpt}
              </p>
            ) : null}

            <div className="prose-blog">
              <ReactMarkdown>{blog.body}</ReactMarkdown>
            </div>
          </article>

          <div className="mt-10">
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 rounded-full border border-brand-line px-4 py-2 text-xs tracking-[0.18em] text-brand-muted hover:border-brand-gold hover:text-brand-gold"
            >
              ← BACK TO BLOG
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
