/**
 * OpenClaw WhatsApp client for the baligirls app.
 *
 * Sends WhatsApp messages through Charles (the chs OpenClaw instance on gda-ai01)
 * via the warm "bg-otp-relay" service over the private VPC — NOT by cold-starting
 * the `openclaw` CLI (which takes ~31s per call). The relay holds OpenClaw's gateway
 * RPC runtime warm and sends in ~1.7s. See /opt/.openclaw-chs/otp-relay on gda-ai01.
 */
const RELAY_URL = process.env.OTP_RELAY_URL || "http://10.148.0.7:19500/otp/send";
const RELAY_TOKEN = process.env.OTP_RELAY_TOKEN || "";
const RELAY_TIMEOUT_MS = Number(process.env.OTP_RELAY_TIMEOUT_MS || 35000);

function log(...args: unknown[]) {
  console.log("[openclaw]", ...args);
}
function logErr(...args: unknown[]) {
  console.error("[openclaw]", ...args);
}

/**
 * Send a WhatsApp message via the bg-otp-relay. Phone must be E.164 (e.g. "+628…").
 * Returns {ok} so callers can fall back to Twilio on failure.
 */
export async function sendWhatsApp(
  to: string,
  text: string,
  _accountId = "main"
): Promise<{ ok: boolean; error?: string; result?: Record<string, unknown> }> {
  const toClean = to.replace(/^whatsapp:/, "").trim();
  const phone = toClean.startsWith("+") ? toClean : `+${toClean}`;
  if (!RELAY_TOKEN) return { ok: false, error: "OTP relay token not configured" };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), RELAY_TIMEOUT_MS);
  try {
    log(`sending WhatsApp to ${phone} via relay`);
    const r = await fetch(RELAY_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${RELAY_TOKEN}` },
      body: JSON.stringify({ to: phone, message: text }),
      signal: ctrl.signal,
    });
    const json = (await r.json().catch(() => ({}))) as Record<string, unknown>;
    if (!r.ok || !json.ok) {
      logErr("relay send failed:", r.status, json?.error);
      return { ok: false, error: String(json?.error || `relay_${r.status}`) };
    }
    log("send success:", json.messageId);
    return { ok: true, result: json };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logErr("send failed:", msg);
    return { ok: false, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

/** Check that the bg-otp-relay is reachable. */
export async function checkHealth(): Promise<{ ok: boolean; error?: string }> {
  try {
    const healthUrl = RELAY_URL.replace(/\/otp\/send$/, "/health");
    const r = await fetch(healthUrl, { signal: AbortSignal.timeout(8000) });
    return { ok: r.ok };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
