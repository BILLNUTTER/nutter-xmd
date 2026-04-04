import { defineConfig } from "drizzle-kit";
import path from "path";

const isProd = process.env.NODE_ENV === "production";
// In dev, prefer local Postgres so schema pushes go to the local DB,
// not the production Supabase DB.  Pass NODE_ENV=production explicitly
// when you want to push to Supabase (e.g. on Heroku's postbuild).
const url = isProd
  ? (process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL)
  : (process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL);

if (!url) {
  throw new Error("SUPABASE_DATABASE_URL or DATABASE_URL must be set.");
}

const useSupabaseSsl = isProd && !!process.env.SUPABASE_DATABASE_URL;

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url,
    ssl: useSupabaseSsl ? { rejectUnauthorized: false } : undefined,
  },
});
