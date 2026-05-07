import "dotenv/config";
import { Client } from "pg";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query<{
      uuid: string;
      username: string;
    }>(`
      SELECT uuid::text AS uuid, username
      FROM providers
      WHERE username IS NOT NULL
        AND POSITION('@' IN username) = 0
      ORDER BY updated_at ASC NULLS LAST, created_at ASC NULLS LAST, uuid ASC
    `);

    let updated = 0;
    for (const row of rows) {
      const base = String(row.username || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, "");
      if (!base) continue;

      let candidate = `${base}@email.com`;
      let suffix = 1;
      while (true) {
        const exists = await client.query(
          `SELECT 1 FROM providers WHERE LOWER(username) = LOWER($1) AND uuid <> $2::uuid LIMIT 1`,
          [candidate, row.uuid]
        );
        if (!exists.rows[0]) break;
        suffix += 1;
        candidate = `${base}${suffix}@email.com`;
      }

      await client.query(
        `UPDATE providers SET username = $1, updated_at = NOW() WHERE uuid = $2::uuid`,
        [candidate, row.uuid]
      );
      updated += 1;
    }

    await client.query("COMMIT");
    console.log(`Creator username email migration complete. Updated rows: ${updated}`);
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
