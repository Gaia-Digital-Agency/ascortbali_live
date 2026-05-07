import express from 'express'
import cookieParser from 'cookie-parser'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { Storage } from '@google-cloud/storage'
import multer from 'multer'
import sharp from 'sharp'
import crypto from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT ? Number(process.env.PORT) : 8002

const app = express()
app.use(cookieParser())
app.use(express.json())

const GCS_BUCKET = process.env.GCS_BUCKET_NAME || 'gda-ce01-bucket'
const GCS_UPLOAD_PREFIX = (process.env.GCS_UPLOAD_PREFIX || 'baligirls/uploads').replace(/^\/+|\/+$/g, '')
const storage = new Storage({ keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS })
const bucket = storage.bucket(GCS_BUCKET)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

// Minimal extension → MIME map for GCS stream pass-through
// (lets us skip a getMetadata() round-trip per request).
const EXT_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
}
function extToMime(p: string): string {
  return EXT_MIME[path.extname(p).toLowerCase()] || 'application/octet-stream'
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleGcsStreamError(err: any, res: express.Response, label: string) {
  if (res.headersSent) {
    try { res.destroy(err) } catch { /* ignore */ }
    return
  }
  // Clear any pre-staged file headers so res.json sets a correct content-type.
  res.removeHeader('Content-Type')
  res.removeHeader('Cache-Control')
  res.removeHeader('Vary')
  res.removeHeader('X-Cache')
  const code = err?.code ?? err?.response?.statusCode
  if (code === 404 || code === '404' || /No such object/i.test(String(err?.message))) {
    res.status(404).json({ error: 'Not found' })
  } else {
    console.error(`[${label}] gcs stream error:`, err?.message || err)
    res.status(500).json({ error: 'Server error' })
  }
}

// /api/admin-asset/:filename was removed on 2026-04-29 — its only consumer
// was Layout.tsx loading baligirls_logo.png from the (now-deleted) legacy
// app/web/public folder. The logo now lives in app/web-vite/public/ and is
// served at /baligirls_logo.png via the SPA static handler below.

// On-the-fly image transform cache (in-memory, 200MB soft cap, LRU-ish)
const imgCache = new Map<string, { buf: Buffer; contentType: string; ts: number }>()
const IMG_CACHE_MAX_BYTES = 200 * 1024 * 1024
let imgCacheBytes = 0

function cacheGet(key: string) {
  const entry = imgCache.get(key)
  if (!entry) return null
  // LRU touch
  imgCache.delete(key)
  imgCache.set(key, entry)
  return entry
}
function cacheSet(key: string, buf: Buffer, contentType: string) {
  const size = buf.length
  while (imgCacheBytes + size > IMG_CACHE_MAX_BYTES && imgCache.size > 0) {
    const oldestKey = imgCache.keys().next().value as string
    const oldest = imgCache.get(oldestKey)!
    imgCacheBytes -= oldest.buf.length
    imgCache.delete(oldestKey)
  }
  imgCache.set(key, { buf, contentType, ts: Date.now() })
  imgCacheBytes += size
}

// Wildcard route (single segment OR full GCS path). Single segments resolve
// against GCS_UPLOAD_PREFIX (creator photos); paths containing `/` are taken
// as the literal GCS object name (used by ad images under baligirls/ads/).
app.get('/api/clean-image/*', async (req, res) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawPath = decodeURIComponent((req.params as any)[0] as string)
    const widthParam = Number(req.query.w)
    const width = Number.isFinite(widthParam) && widthParam > 0 && widthParam <= 2000 ? Math.round(widthParam) : null
    const accept = String(req.headers.accept || '')
    const wantsAvif = accept.includes('image/avif')
    const wantsWebp = !wantsAvif && accept.includes('image/webp')
    const fmt = wantsAvif ? 'avif' : wantsWebp ? 'webp' : 'original'

    // Resolve the GCS object: bare filenames are creator photos under the
    // upload prefix; anything with a slash is taken as the full path.
    const gcsObjectName = rawPath.includes('/') ? rawPath : `${GCS_UPLOAD_PREFIX}/${rawPath}`
    const filename = rawPath.split('/').pop() || rawPath
    const gcsFile = bucket.file(gcsObjectName)

    // FAST PATH: no transform requested. Stream straight from GCS to the
    // client; skip exists() + getMetadata() (saves 2 round-trips), skip the
    // in-memory cache (it adds memory pressure for no CPU win on this path —
    // GCS itself is the cache, and a future nginx proxy_cache will front it).
    if (fmt === 'original' && !width) {
      res.setHeader('Content-Type', extToMime(filename))
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable')
      res.setHeader('Vary', 'Accept')
      res.setHeader('X-Cache', 'PASS')
      const stream = gcsFile.createReadStream()
      stream.on('error', (err) => handleGcsStreamError(err, res, 'clean-image:pass'))
      stream.pipe(res)
      return
    }

    // TRANSFORM PATH: keep buffer + sharp + in-memory cache (cache hit avoids
    // a sharp round-trip on the next request, which is the real win here).
    const cacheKey = crypto.createHash('md5').update(`${gcsObjectName}|${width ?? 0}|${fmt}`).digest('hex')
    const cached = cacheGet(cacheKey)
    if (cached) {
      res.setHeader('Content-Type', cached.contentType)
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable')
      res.setHeader('Vary', 'Accept')
      res.setHeader('X-Cache', 'HIT')
      res.end(cached.buf)
      return
    }

    // No more exists() pre-check — let download() surface 404 directly.
    let buffer: Buffer
    try {
      ;[buffer] = await gcsFile.download()
    } catch (err: unknown) {
      const e = err as { code?: number | string; message?: string }
      if (e?.code === 404 || e?.code === '404' || /No such object/i.test(String(e?.message))) {
        res.status(404).json({ error: 'Not found' })
        return
      }
      throw err
    }

    let pipeline = sharp(buffer)
    if (width) pipeline = pipeline.resize({ width, withoutEnlargement: true })
    if (fmt === 'avif') pipeline = pipeline.avif({ quality: 55 })
    else if (fmt === 'webp') pipeline = pipeline.webp({ quality: 80 })
    else pipeline = pipeline.jpeg({ quality: 82, progressive: true, mozjpeg: true })

    const out = await pipeline.toBuffer()
    const contentType = fmt === 'avif' ? 'image/avif' : fmt === 'webp' ? 'image/webp' : 'image/jpeg'
    cacheSet(cacheKey, out, contentType)
    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable')
    res.setHeader('Vary', 'Accept')
    res.setHeader('X-Cache', 'MISS')
    res.end(out)
  } catch (err) {
    console.error('image error:', err)
    if (!res.headersSent) res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/static/*', async (req, res) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filePath = (req.params as any)[0] as string
  const gcsFile = bucket.file(`static/${filePath}`)
  res.setHeader('Content-Type', extToMime(filePath))
  res.setHeader('Cache-Control', 'public, max-age=86400')
  const stream = gcsFile.createReadStream()
  stream.on('error', (err) => handleGcsStreamError(err, res, 'static'))
  stream.pipe(res)
})

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) { res.status(400).json({ error: 'No file provided' }); return }
    const folder = (req.body.folder as string) || 'uploads'
    const ext = path.extname(req.file.originalname)
    const filename = `${Date.now()}${ext}`
    const gcsPath = `baligirls/${folder}/${filename}`
    const gcsFile = bucket.file(gcsPath)
    await gcsFile.save(req.file.buffer, { metadata: { contentType: req.file.mimetype }, resumable: false })
    res.json({ url: `/api/uploads/${gcsPath}` })
  } catch (err: any) { res.status(500).json({ error: err.message || 'Upload failed' }) }
})

app.get('/api/uploads/*', async (req, res) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filePath = (req.params as any)[0] as string
  const gcsFile = bucket.file(filePath)
  // Object keys here are timestamp-based (`${Date.now()}${ext}` in /api/upload),
  // so each URL is effectively immutable. Long cache + skip exists/getMetadata.
  res.setHeader('Content-Type', extToMime(filePath))
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  const stream = gcsFile.createReadStream()
  stream.on('error', (err) => handleGcsStreamError(err, res, 'uploads'))
  stream.pipe(res)
})

// Serve robots.txt from public
app.get('/robots.txt', (_req, res) => {
  const robotsPath = path.join(__dirname, 'public', 'robots.txt')
  if (fs.existsSync(robotsPath)) {
    res.setHeader('Content-Type', 'text/plain')
    res.sendFile(robotsPath)
  } else {
    res.status(404).end()
  }
})

// Dynamically generate sitemap.xml with creator profiles
app.get('/sitemap.xml', async (_req, res) => {
  try {
    // Default to the live domain (gaiada2.online). Override with PUBLIC_SITE_URL
    // in .env if/when the site moves to another host.
    const base = process.env.PUBLIC_SITE_URL || 'https://baligirls.gaiada2.online'
    const apiBase = process.env.INTERNAL_API_URL || 'http://127.0.0.1:8001'
    const staticUrls = [
      '/',
      '/user',
      '/user/register',
      '/creator',
      '/creator/register',
      '/terms',
      '/privacy',
    ]
    let creatorUrls: string[] = []
    try {
      const r = await fetch(`${apiBase}/creators?page=1&limit=500`)
      if (r.ok) {
        const json = await r.json() as { items?: Array<{ uuid?: string; slug?: string | null }> }
        // Prefer slug (Phase D) — readable + SEO-friendly. Fall back to uuid
        // for any legacy row that somehow lacks a slug.
        creatorUrls = (json.items ?? [])
          .map(c => c.slug || c.uuid)
          .filter((u): u is string => !!u)
          .map(u => `/creator/preview/${u}`)
      }
    } catch { /* best-effort */ }
    const now = new Date().toISOString()
    const urls = [...staticUrls, ...creatorUrls]
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${base}${u}</loc><lastmod>${now}</lastmod></url>`).join('\n')}
</urlset>`
    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.send(xml)
  } catch {
    res.status(500).end()
  }
})

const distPath = path.join(__dirname, 'dist', 'client')

// ── Per-route meta substitution (Phase D, item 70) ──────────────────────
// The SPA's static index.html ships hardcoded meta tags. For per-route SEO
// we substitute them server-side BEFORE shipping the HTML, so crawlers
// (including ones that don't run JS) see the right title / description /
// og / canonical for each URL on the very first byte. react-helmet-async
// will further update the head client-side after hydration.
const SSR_SITE_BASE = process.env.PUBLIC_SITE_URL || 'https://baligirls.gaiada2.online'
const SSR_DEFAULT_OG = `${SSR_SITE_BASE}/og-image.png`

type RouteMeta = { title: string; description: string; image?: string; index?: boolean }

const STATIC_ROUTE_META: Record<string, RouteMeta> = {
  '/':                  { title: 'Bali Girls — Free, Real, Simple', description: 'A marketplace connecting creators and members in Bali. Browse featured profiles, ads, and services.' },
  '/user':              { title: 'Sign In — Bali Girls',            description: 'Sign in to your Bali Girls member account.' },
  '/user/register':     { title: 'Create Account — Bali Girls',     description: 'Sign up to browse Bali Girls creators and contact details.' },
  '/creator':           { title: 'Creator Sign In — Bali Girls',    description: 'Sign in to your Bali Girls creator account.' },
  '/creator/register':  { title: 'Create Creator Account — Bali Girls', description: 'Become a Bali Girls creator. Set up your profile, photos, and contact details.' },
  '/admin':             { title: 'Admin — Bali Girls',              description: 'Admin login.', index: false },
  '/admin/logged':      { title: 'Admin — Bali Girls',              description: 'Bali Girls admin dashboard.', index: false },
  '/user/logged':       { title: 'Member Profile — Bali Girls',     description: 'Your Bali Girls member profile.', index: false },
  '/creator/logged':    { title: 'Creator Profile — Bali Girls',    description: 'Manage your Bali Girls creator profile.', index: false },
  '/terms':             { title: 'Terms of Use — Bali Girls',       description: 'Terms and conditions for using the Bali Girls platform.' },
  '/privacy':           { title: 'Privacy Statement — Bali Girls',  description: 'Privacy statement for Bali Girls — how we handle and protect your data.' },
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) =>
  c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;')

function injectMeta(html: string, urlPath: string, meta: RouteMeta): string {
  const url = SSR_SITE_BASE + (urlPath.startsWith('/') ? urlPath : '/' + urlPath)
  const og = meta.image ?? SSR_DEFAULT_OG
  const title = escapeHtml(meta.title)
  const desc = escapeHtml(meta.description)
  const robots = meta.index === false ? 'noindex, nofollow' : 'index, follow'
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(/<meta\s+name="description"[^>]*>/, `<meta name="description" content="${desc}">`)
    .replace(/<meta\s+name="robots"[^>]*>/, `<meta name="robots" content="${robots}">`)
    .replace(/<meta\s+property="og:title"[^>]*>/, `<meta property="og:title" content="${title}">`)
    .replace(/<meta\s+property="og:description"[^>]*>/, `<meta property="og:description" content="${desc}">`)
    .replace(/<meta\s+property="og:url"[^>]*>/, `<meta property="og:url" content="${url}">`)
    .replace(/<meta\s+property="og:image"[^>]*>/, `<meta property="og:image" content="${og}">`)
    .replace(/<meta\s+name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${title}">`)
    .replace(/<meta\s+name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${desc}">`)
    .replace(/<meta\s+name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${og}">`)
    .replace(/<link\s+rel="canonical"[^>]*>/, `<link rel="canonical" href="${url}">`)
}

// Resolve route meta for a given URL path. Static routes use the table
// above; /creator/preview/<slug> is treated as a creator page (a future
// pass — item 72-onwards — will fetch the creator's name + notes excerpt
// + primary image from the API and substitute them here).
function metaForPath(urlPath: string): RouteMeta {
  if (STATIC_ROUTE_META[urlPath]) return STATIC_ROUTE_META[urlPath]
  if (urlPath.startsWith('/creator/preview/')) {
    return { title: 'Creator — Bali Girls', description: 'Browse creator profile, photos, and contact details on Bali Girls.' }
  }
  if (urlPath === '/blog' || urlPath.startsWith('/blog/')) {
    return { title: 'Blog — Bali Girls', description: 'News and stories from Bali Girls.' }
  }
  return STATIC_ROUTE_META['/']
}

// ── Hero-injection for the homepage LCP ─────────────────────────────────
// PSI flagged "LCP request discovery" + "Network dependency tree" — the
// LCP image (first FeaturedCarousel girl) was discoverable only after JS
// hydrated and AdsProvider+FeaturedCarousel both fetched. We pre-resolve
// the featured-girl-1 image URL here and inject
//   <link rel="preload" as="image" href="..." fetchpriority="high">
// into the HTML before sending. Browser starts the image fetch from
// the first HTML byte instead of after a 4-step waterfall.
//
// Cached in-memory for 60s so we don't hit the API on every page load.
// On any failure we fall through to the static handler below — site
// degrades gracefully to the pre-injection behaviour.
const HOMEPAGE_HTML_TTL_MS = 60_000;
let homepageHtmlCache: { html: string; expiresAt: number } | null = null;
const INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://127.0.0.1:8001';

async function buildHomepageHtml(): Promise<string | null> {
  try {
    const fetchOpts = { signal: AbortSignal.timeout(800) };
    const settingsRes = await fetch(`${INTERNAL_API_URL}/ads/settings`, fetchOpts);
    if (!settingsRes.ok) return null;
    const settings = await settingsRes.json() as Record<string, string | null | undefined>;
    const firstName = (settings.featured_girl_1 ?? '').trim();
    if (!firstName) return null;
    const byNamesRes = await fetch(
      `${INTERNAL_API_URL}/creators/by-names?names=${encodeURIComponent(firstName)}`,
      fetchOpts,
    );
    if (!byNamesRes.ok) return null;
    const byNames = await byNamesRes.json() as { items?: Array<{ image_file?: string | null }> };
    const imageFile = byNames.items?.[0]?.image_file;
    if (!imageFile) return null;
    // Mirror toCreatorImageUrl() in src/components/AdvertisingSpaces.tsx:
    // bare filenames → /api/clean-image/<filename>. Preload URL must byte-
    // match what the SPA later fetches.
    const filename = imageFile.includes('/') ? imageFile.split('/').pop()! : imageFile;
    const lcpUrl = `/api/clean-image/${encodeURIComponent(filename)}?w=480`;
    const html = await fs.promises.readFile(path.join(distPath, 'index.html'), 'utf8');
    const preload =
      `    <link rel="preload" as="image" href="${lcpUrl}" fetchpriority="high" />\n` +
      `    <link rel="preload" as="fetch" crossorigin="anonymous" ` +
      `href="/api/creators/by-names?names=${encodeURIComponent(firstName)}" />\n`;
    return html.replace('</head>', `${preload}  </head>`);
  } catch {
    return null;
  }
}

app.get('/', async (_req, res, next) => {
  try {
    const now = Date.now();
    if (!homepageHtmlCache || homepageHtmlCache.expiresAt <= now) {
      const built = await buildHomepageHtml();
      if (built) homepageHtmlCache = { html: built, expiresAt: now + HOMEPAGE_HTML_TTL_MS };
    }
    if (homepageHtmlCache) {
      // Apply per-route meta to the LCP-preloaded HTML.
      let withMeta = injectMeta(homepageHtmlCache.html, '/', metaForPath('/'));
      // JSON-LD Organization schema (item 71). Inserted before </head> so
      // crawlers without JS still see it in the initial HTML payload.
      const orgJsonLd = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Bali Girls',
        url: SSR_SITE_BASE,
        logo: `${SSR_SITE_BASE}/baligirls_logo.png`,
      });
      withMeta = withMeta.replace(
        '</head>',
        `    <script type="application/ld+json">${orgJsonLd}</script>\n  </head>`
      );
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(withMeta);
      return;
    }
  } catch { /* fall through */ }
  next();
});

// Long-cache static assets (favicon, og-image, baligirls_logo, etc.). The
// Vite-hashed JS/CSS under /assets/* are intercepted by nginx with a 1-year
// immutable header BEFORE they reach this handler, so this branch governs
// only the unhashed top-level public files. index.html stays no-cache so
// deploys take effect on next request.
app.use(express.static(distPath, {
  maxAge: '30d',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(`${path.sep}index.html`) || filePath.endsWith('/index.html')) {
      res.setHeader('Cache-Control', 'no-cache')
    }
  },
}))
app.use('*', async (req, res) => {
  // SPA fallback — index.html must not be cached so users see updates.
  // Per-route meta is injected here so crawlers see the right title /
  // description / og / canonical / robots on the very first byte.
  res.setHeader('Cache-Control', 'no-cache')
  try {
    const urlPath = (req.originalUrl || '/').split('?')[0]
    const html = await fs.promises.readFile(path.join(distPath, 'index.html'), 'utf8')
    const withMeta = injectMeta(html, urlPath, metaForPath(urlPath))
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(withMeta)
  } catch {
    res.sendFile(path.join(distPath, 'index.html'))
  }
})

// Optional Sentry error tracking (lazy-loaded)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sentry: any = null
if (process.env.SENTRY_DSN) {
  try {
    // @ts-expect-error - optional peer dep
    const mod = await import('@sentry/node')
    sentry = mod
    sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV, tracesSampleRate: 0.1 })
    console.log('Sentry enabled for web-vite')
  } catch {
    console.warn('SENTRY_DSN set but @sentry/node not installed')
  }
}

// Global error handler
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('[web-vite] error:', err)
  if (sentry?.captureException) {
    try { sentry.captureException(err) } catch { /* ignore */ }
  }
  if (!res.headersSent) res.status(err?.status || 500).json({ error: 'server_error' })
})

app.listen(PORT, () => console.log(`Baligirls web-vite running on port ${PORT}`))
