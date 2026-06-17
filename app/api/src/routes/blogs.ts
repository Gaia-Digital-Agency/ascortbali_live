// Blog endpoints. Public list/detail + admin CRUD.
//
// Public:
//   GET  /blogs?page&limit       — paginated list of published posts
//   GET  /blogs/:slug            — single post by slug (must be published)
//
// Admin (requireAuth + role=admin):
//   GET    /admin/blogs          — list all (incl. drafts)
//   POST   /admin/blogs          — create
//   PUT    /admin/blogs/:id      — update
//   DELETE /admin/blogs/:id      — delete
//
// Slug is generated from title with -2/-3 collision suffix (uniqueBlogSlug).
// Posts are "published" when published_at IS NOT NULL AND <= NOW().

import { Router } from "express";
import { cacheGet } from "../lib/cache.js";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { getPool } from "../lib/pg.js";
import { uniqueBlogSlug } from "../lib/slug.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const blogsRouter = Router();
export const adminBlogsRouter = Router();

adminBlogsRouter.use(requireAuth, requireRole(["admin"]));

const BlogInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  excerpt: z.string().trim().max(500).nullish(),
  body: z.string().min(1),
  heroImage: z.string().trim().max(500).nullish(),
  publishedAt: z.string().datetime().nullish(),
});

// Map a Blog row to the public-facing JSON shape.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function publicBlogShape(b: any) {
  return {
    id: b.id,
    slug: b.slug,
    title: b.title,
    excerpt: b.excerpt,
    body: b.body,
    heroImage: b.heroImage ?? null,
    publishedAt: b.publishedAt ? b.publishedAt.toISOString() : null,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

// ─── Public ──────────────────────────────────────────────────────────────────

blogsRouter.get("/", cacheGet(60), async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const skip = (page - 1) * limit;
  try {
    const where = { publishedAt: { lte: new Date() } } as const;
    const [items, total] = await Promise.all([
      prisma.blog.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.blog.count({ where }),
    ]);
    res.json({
      items: items.map(publicBlogShape),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch {
    res.status(500).json({ error: "blogs_load_failed" });
  }
});

blogsRouter.get("/:slug", cacheGet(60), async (req, res) => {
  const slug = String(req.params.slug || "").toLowerCase();
  if (!slug) return res.status(400).json({ error: "missing_slug" });
  try {
    const b = await prisma.blog.findUnique({ where: { slug } });
    if (!b || !b.publishedAt || b.publishedAt > new Date()) {
      return res.status(404).json({ error: "not_found" });
    }
    res.json(publicBlogShape(b));
  } catch {
    res.status(500).json({ error: "blog_load_failed" });
  }
});

// ─── Admin ───────────────────────────────────────────────────────────────────

adminBlogsRouter.get("/", async (_req, res) => {
  try {
    const items = await prisma.blog.findMany({
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    });
    res.json({ items: items.map(publicBlogShape) });
  } catch {
    res.status(500).json({ error: "blogs_load_failed" });
  }
});

adminBlogsRouter.post("/", async (req, res) => {
  const parsed = BlogInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
  }
  const p = parsed.data;
  try {
    const slug = await uniqueBlogSlug(getPool(), p.title);
    const created = await prisma.blog.create({
      data: {
        slug,
        title: p.title,
        excerpt: p.excerpt ?? null,
        body: p.body,
        heroImage: p.heroImage ?? null,
        publishedAt: p.publishedAt ? new Date(p.publishedAt) : null,
      },
    });
    res.status(201).json(publicBlogShape(created));
  } catch (err) {
    res.status(500).json({ error: "blog_create_failed", message: (err as Error).message });
  }
});

adminBlogsRouter.put("/:id", async (req, res) => {
  const id = String(req.params.id || "");
  if (!id) return res.status(400).json({ error: "missing_id" });
  const parsed = BlogInputSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
  }
  const p = parsed.data;
  try {
    const current = await prisma.blog.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ error: "not_found" });
    let nextSlug = current.slug;
    if (p.title && p.title !== current.title) {
      nextSlug = await uniqueBlogSlug(getPool(), p.title, id);
    }
    const updated = await prisma.blog.update({
      where: { id },
      data: {
        ...(p.title !== undefined ? { title: p.title, slug: nextSlug } : {}),
        ...(p.excerpt !== undefined ? { excerpt: p.excerpt ?? null } : {}),
        ...(p.body !== undefined ? { body: p.body } : {}),
        ...(p.heroImage !== undefined ? { heroImage: p.heroImage ?? null } : {}),
        ...(p.publishedAt !== undefined
          ? { publishedAt: p.publishedAt ? new Date(p.publishedAt) : null }
          : {}),
      },
    });
    res.json(publicBlogShape(updated));
  } catch (err) {
    res.status(500).json({ error: "blog_update_failed", message: (err as Error).message });
  }
});

adminBlogsRouter.delete("/:id", async (req, res) => {
  const id = String(req.params.id || "");
  if (!id) return res.status(400).json({ error: "missing_id" });
  try {
    await prisma.blog.delete({ where: { id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "not_found" });
  }
});
