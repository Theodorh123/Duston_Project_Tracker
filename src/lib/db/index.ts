import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const rawConnectionString =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_E4nC9DSguaZJ@ep-raspy-mode-za8p2eep-pooler.c-2.eu-west-2.aws.neon.tech/neondb?sslmode=require";

// Use direct endpoint for HTTP serverless (Neon recommends direct for HTTP proxying)
const connectionString = rawConnectionString.replace("-pooler.", ".");

const rawSql = neon(connectionString, {
  fetchOptions: {
    cache: "no-store",
  },
});

// Resilient wrapper: automatically retry on transient network hiccups (ETIMEDOUT, fetch failed)
const sql = async (...args: Parameters<typeof rawSql>) => {
  let lastError: any;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await rawSql(...args);
    } catch (err: any) {
      lastError = err;
      const isNetworkError =
        err?.message?.includes("fetch failed") ||
        err?.message?.includes("ETIMEDOUT") ||
        err?.message?.includes("ECONNRESET") ||
        err?.sourceError?.message?.includes("fetch failed") ||
        err?.cause?.code === "ETIMEDOUT";

      if (!isNetworkError || attempt === 2) {
        throw err;
      }

      // Wait briefly before retrying (200ms, 400ms)
      await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 200));
    }
  }
  throw lastError;
};

export const db = drizzle(sql as any, { schema });
