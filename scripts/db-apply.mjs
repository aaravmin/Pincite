// Apply a .sql migration file to the Supabase database.
// Usage: node --env-file=.env.local scripts/db-apply.mjs <path-to-sql>
//
// Connection: reads SUPABASE_DB_URL for host/user/port/db. If SUPABASE_DB_PASSWORD
// is also set, it overrides the URL's password using discrete fields, which avoids
// URL-encoding problems when the password contains special characters. The secret is
// never printed.
import { readFileSync } from "node:fs";
import pg from "pg";

const url = process.env.SUPABASE_DB_URL;
const rawPassword = process.env.SUPABASE_DB_PASSWORD;
if (!url) {
  console.error("SUPABASE_DB_URL is not set (add it to .env.local).");
  process.exit(1);
}
const file = process.argv[2];
if (!file) {
  console.error("usage: db-apply.mjs <path-to-sql>");
  process.exit(1);
}

function buildConfig() {
  if (rawPassword) {
    const x = new URL(url);
    return {
      host: x.hostname,
      port: Number(x.port || "5432"),
      user: decodeURIComponent(x.username),
      database: x.pathname.replace(/^\//, "") || "postgres",
      password: rawPassword,
      ssl: { rejectUnauthorized: false },
    };
  }
  return { connectionString: url, ssl: { rejectUnauthorized: false } };
}

const sql = readFileSync(file, "utf8");
const client = new pg.Client(buildConfig());

try {
  await client.connect();
  await client.query(sql);
  console.log(`APPLIED ${file}`);
} catch (e) {
  console.error(`APPLY FAILED: ${e.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
