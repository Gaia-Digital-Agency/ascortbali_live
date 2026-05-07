// Import necessary modules for the server.
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { pinoHttp } from "pino-http";
import crypto from "crypto";
import { createRouter } from "./router.js";
import { ensureAnalyticsTable } from "./routes/analytics.js";

// Initialize the Express application and apply middleware.
const app = express();

// Ensure req.ip reflects the real client IP when behind NGINX (via X-Forwarded-For).
// Default: trust the first proxy hop.
const trustProxyEnv = process.env.TRUST_PROXY;
if (trustProxyEnv === undefined) {
  app.set("trust proxy", 1);
} else if (trustProxyEnv === "true") {
  app.set("trust proxy", true);
} else if (trustProxyEnv === "false") {
  app.set("trust proxy", false);
} else {
  const n = Number(trustProxyEnv);
  app.set("trust proxy", Number.isFinite(n) ? n : 1);
}

app.use(helmet());
app.use(express.json({ limit: "1mb" }));

// Structured logging with request ID correlation
app.use(pinoHttp({
  genReqId: (req, res) => {
    const id = (req.headers["x-request-id"] as string) || crypto.randomUUID();
    res.setHeader("X-Request-Id", id);
    return id;
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url, ip: req.headers["x-forwarded-for"] || req.remoteAddress }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
}));

// Dev-only quick log; disable in production to reduce noise
if (process.env.NODE_ENV !== "production") app.use(morgan("dev"));

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") ?? ["http://localhost:3000"], credentials: true }));

// CSRF protection: require X-Requested-With header on state-changing requests.
app.use((req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  if (req.headers["x-requested-with"]) return next();
  // Allow requests with content-type application/json (browsers don't send this cross-origin without CORS preflight)
  if (req.headers["content-type"]?.includes("application/json")) return next();
  return res.status(403).json({ error: "csrf_rejected" });
});

// Health check endpoint to verify the server is running.
app.get("/health", (_req, res) => res.json({ ok: true }));

// Register the main application router.
app.use(createRouter());

// Global error handler. Hooks into Sentry if SENTRY_DSN is configured.
// The Sentry SDK is intentionally imported lazily so the app works without it.
let sentry: any = null;
if (process.env.SENTRY_DSN) {
  try {
    // @ts-expect-error - optional peer dep; install @sentry/node when enabling
    const mod = await import("@sentry/node");
    sentry = mod;
    sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV, tracesSampleRate: 0.1 });
    console.log("Sentry error tracking enabled");
  } catch {
    console.warn("SENTRY_DSN set but @sentry/node not installed. Run: pnpm --filter @ascortbali/api add @sentry/node");
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.use((err: any, req: any, res: any, _next: any) => {
  const requestId = res.getHeader("X-Request-Id");
  req.log?.error({ err, requestId }, "unhandled error");
  if (sentry?.captureException) {
    try { sentry.captureException(err, { tags: { requestId } }); } catch { /* ignore */ }
  }
  if (!res.headersSent) {
    res.status(err?.status || 500).json({ error: "server_error", requestId });
  }
});

// Start the server on the configured port and host.
const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "127.0.0.1";

// One-shot DDL at boot so it never sits on the request path.
ensureAnalyticsTable().catch((err) => {
  console.warn("[boot] ensureAnalyticsTable failed (analytics will retry on first hit):", err?.message || err);
  // Non-fatal: analytics is best-effort; the route itself wraps inserts in try/catch.
});

app.listen(port, host, () => {
  console.log(`API listening on http://${host}:${port}`);
});
