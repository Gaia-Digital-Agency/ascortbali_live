import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { API_BASE } from "../lib/api";
import { withBasePath } from "../lib/paths";
import { PageMeta } from "../components/PageMeta";

type Blog = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  heroImage: string | null;
  publishedAt: string | null;
};

const PAGE_SIZE = 12;

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
      month: "short",
      year: "numeric",
    });
  } catch { return ""; }
};

export default function BlogIndexPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(Number(searchParams.get("page") ?? "1") || 1, 1);

  const [items, setItems] = useState<Blog[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${API_BASE}/blogs?page=${page}&limit=${PAGE_SIZE}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setItems(Array.isArray(data.items) ? data.items : []);
        setTotal(Number(data.total) || 0);
        setTotalPages(Math.max(1, Number(data.totalPages) || 1));
      })
      .catch(() => { if (!cancelled) { setItems([]); setTotal(0); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page]);

  const goPage = (n: number) => {
    const next = new URLSearchParams(searchParams);
    if (n <= 1) next.delete("page");
    else next.set("page", String(n));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <PageMeta
        title="Blog — Bali Girls"
        description="Long-form writing on wellness, culture, and life in Bali. New articles weekly."
        path={`/blog${page > 1 ? `?page=${page}` : ""}`}
      />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-2 text-center text-3xl font-light tracking-[0.18em] text-brand-text">
          BLOG
        </h1>
        <p className="mb-8 text-center text-sm tracking-[0.18em] text-brand-muted">
          {total > 0 ? `${total} ARTICLE${total === 1 ? "" : "S"}` : ""}
        </p>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton aspect-[16/10] rounded-2xl border border-brand-line" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-brand-line bg-brand-surface/30 p-10 text-center text-sm tracking-[0.18em] text-brand-muted">
            NO ARTICLES YET
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((b) => {
              const img = heroSrc(b.heroImage);
              return (
                <Link
                  key={b.id}
                  to={`/blog/${b.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-brand-line bg-brand-surface/30 transition-colors hover:border-brand-gold"
                >
                  <div className="aspect-[16/10] overflow-hidden bg-black/40">
                    {img ? (
                      <img
                        src={img}
                        alt={b.title}
                        width={1200}
                        height={750}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs tracking-[0.22em] text-brand-muted">
                        NO IMAGE
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-brand-muted">
                      {fmtDate(b.publishedAt)}
                    </div>
                    <h2 className="text-lg font-light leading-tight tracking-wide text-brand-text group-hover:text-brand-gold">
                      {b.title}
                    </h2>
                    {b.excerpt ? (
                      <p className="line-clamp-3 text-sm leading-relaxed text-brand-muted">
                        {b.excerpt}
                      </p>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {totalPages > 1 ? (
          <nav className="mt-10 flex justify-center gap-2 text-sm tracking-[0.18em]">
            <button
              type="button"
              onClick={() => goPage(page - 1)}
              disabled={page <= 1}
              className="rounded-full border border-brand-line px-4 py-2 disabled:opacity-30 hover:border-brand-gold hover:text-brand-gold"
            >
              ← PREV
            </button>
            {Array.from({ length: totalPages }).map((_, i) => {
              const n = i + 1;
              const active = n === page;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => goPage(n)}
                  className={
                    "min-w-[44px] rounded-full border px-3 py-2 " +
                    (active
                      ? "border-brand-gold bg-brand-gold/20 text-brand-text"
                      : "border-brand-line text-brand-muted hover:border-brand-gold hover:text-brand-text")
                  }
                >
                  {n}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => goPage(page + 1)}
              disabled={page >= totalPages}
              className="rounded-full border border-brand-line px-4 py-2 disabled:opacity-30 hover:border-brand-gold hover:text-brand-gold"
            >
              NEXT →
            </button>
          </nav>
        ) : null}
      </div>
    </>
  );
}
