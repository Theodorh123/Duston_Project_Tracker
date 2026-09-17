import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const connectionString = (process.env.DATABASE_URL || "").replace("-pooler.", ".");
const sql = neon(connectionString);

async function main() {
  const cols = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'action_items'
    ORDER BY ordinal_position;
  `;
  console.log("action_items columns:", JSON.stringify(cols, null, 2));
}

main().catch(console.error);
