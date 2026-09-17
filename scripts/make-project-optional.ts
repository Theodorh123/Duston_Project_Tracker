import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";

async function main() {
  console.log("Starting DB migration: making project_id optional and adding entity_id to action_items...");

  // 1. Add entity_id column if not exists
  await db.execute(sql`
    ALTER TABLE action_items 
    ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id) ON DELETE CASCADE;
  `);
  console.log("✓ Added entity_id column (if not existed).");

  // 2. Drop NOT NULL on project_id
  await db.execute(sql`
    ALTER TABLE action_items 
    ALTER COLUMN project_id DROP NOT NULL;
  `);
  console.log("✓ Dropped NOT NULL constraint on project_id.");

  // 3. Backfill entity_id from projects for any existing action items
  await db.execute(sql`
    UPDATE action_items ai
    SET entity_id = p.entity_id
    FROM projects p
    WHERE ai.project_id = p.id AND ai.entity_id IS NULL;
  `);
  console.log("✓ Backfilled entity_id from projects.");

  // 4. Verify columns
  const colCheck = await db.execute(sql`
    SELECT column_name, is_nullable, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'action_items' AND column_name IN ('project_id', 'entity_id', 'deadline');
  `);
  console.log("Verified columns in action_items:", colCheck.rows);

  console.log("Migration completed successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
