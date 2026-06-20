// Additive migration for the OpenClaw (Charles) push-OTP login path.
//
// Adds two columns to the raw `login_2fa_sessions` table:
//   - code     text     : the secret 6-digit OTP delivered over WhatsApp (never
//                          returned to the browser); separate from `token` (the
//                          browser-held session id).
//   - attempts integer   : per-session verification attempts, capped at 5.
//
// Idempotent (IF NOT EXISTS) and safe to run on the live table. Run BEFORE
// deploying the code that writes these columns.
import "dotenv/config";
import { Client } from "pg";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query("BEGIN");
    await client.query(`ALTER TABLE login_2fa_sessions ADD COLUMN IF NOT EXISTS code text`);
    await client.query(`ALTER TABLE login_2fa_sessions ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0`);
    await client.query("COMMIT");
    console.log("login_2fa_sessions: ensured columns code (text), attempts (integer default 0)");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
