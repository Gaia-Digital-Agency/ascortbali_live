/**
 * OpenClaw WhatsApp client for the baligirls app.
 * Sends WhatsApp messages through the OpenClaw gateway on gda-ai01
 * via SSH, avoiding Meta WABA entirely.
 */
import { execSync } from "child_process";
import { env } from "./env.js";

const SSH_CMD = "ssh gda-ai01";
const STATE_DIR = "/opt/.openclaw-baligirls";
const CLAW_CMD = `/home/azlan/.npm-global/bin/openclaw message send`;

function log(...args: unknown[]) {
  console.log("[openclaw]", ...args);
}

function logErr(...args: unknown[]) {
  console.error("[openclaw]", ...args);
}

/**
 * Send a WhatsApp message through the OpenClaw gateway.
 * @param to - Phone number in E.164 format (e.g. +628****7890)
 * @param text - Message text to send
 * @param accountId - WhatsApp account ID (default: "main")
 */
export function sendWhatsApp(
  to: string,
  text: string,
  accountId = "main"
): { ok: boolean; error?: string; result?: Record<string, unknown> } {
  const toClean = to.replace(/^whatsapp:/, "").trim();
  const phone = toClean.startsWith("+") ? toClean : `+${toClean}`;

  const cmd = [
    SSH_CMD,
    `OPENCLAW_STATE_DIR=${STATE_DIR}`,
    CLAW_CMD,
    `--channel whatsapp`,
    `--account ${accountId}`,
    `--target "${phone}"`,
    `--message ${JSON.stringify(text)}`,
    `--json`,
  ].join(" ");

  log(`sending WhatsApp to ${phone}`);

  try {
    const output = execSync(cmd, {
      timeout: 30_000,
      encoding: "utf-8",
      maxBuffer: 1024 * 10,
    });
    const result = JSON.parse(output.trim());
    log("send success:", result);
    return { ok: true, result };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logErr("send failed:", msg);
    return { ok: false, error: msg };
  }
}

/**
 * Check if the OpenClaw gateway is reachable on gda-ai01.
 */
export function checkHealth(): { ok: boolean; error?: string } {
  try {
    const output = execSync(
      `${SSH_CMD} 'OPENCLAW_STATE_DIR=${STATE_DIR} ${CLAW_CMD} --channel whatsapp --account main --target "+628****0000" --message "health check" --json --dry-run'`,
      { timeout: 10_000, encoding: "utf-8", maxBuffer: 1024 * 10 }
    );
    JSON.parse(output.trim());
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}
