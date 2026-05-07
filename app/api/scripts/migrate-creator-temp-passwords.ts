import "dotenv/config";
import { Client } from "pg";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query("BEGIN");
    const result = await client.query(
      `
      UPDATE providers
         SET password = temp_password,
             updated_at = NOW()
       WHERE COALESCE(temp_password, '') <> ''
         AND COALESCE(password, '') = ''
      `
    );
    await client.query("COMMIT");
    console.log(`Creator temp_password migration complete. Updated rows: ${result.rowCount ?? 0}`);
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
