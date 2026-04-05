import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const isProd = process.env.NODE_ENV === "production";
const connectionString = isProd
  ? (process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL)
  : (process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL);

if (!connectionString) {
  throw new Error(
    "SUPABASE_DATABASE_URL or DATABASE_URL must be set.",
  );
}

const useSupabaseSsl = isProd && !!process.env.SUPABASE_DATABASE_URL;

export const pool = new Pool({
  connectionString,
  ssl: useSupabaseSsl ? { rejectUnauthorized: false } : undefined,
  max: 3,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});
export const db = drizzle(pool, { schema });

// ─── Backup DB pool ───────────────────────────────────────────────────────────
// Optional secondary Supabase. Set SUPABASE_BACKUP_DATABASE_URL on Heroku.
// whatsapp.ts automatically falls back to this when the primary pool fails.
const backupConnectionString = isProd
  ? process.env.SUPABASE_BACKUP_DATABASE_URL
  : undefined;

export const poolBackup = backupConnectionString
  ? new Pool({
      connectionString: backupConnectionString,
      ssl: { rejectUnauthorized: false },
      max: 2,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    })
  : null;

export const dbBackup = poolBackup ? drizzle(poolBackup, { schema }) : null;

export * from "./schema";
