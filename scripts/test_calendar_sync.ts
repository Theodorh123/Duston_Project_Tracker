import { parseIcsContent } from "../src/lib/ical-parser";
import { Client } from "pg";

const sampleIcs = `BEGIN:VCALENDAR
PRODID:-//Microsoft Corporation//Outlook 16.0 MIMEDIR//EN
VERSION:2.0
METHOD:PUBLISH
X-WR-CALNAME:Calendar
BEGIN:VEVENT
UID:outlook-test-uid-001@dustongroup.com
SUMMARY:Executive Committee Strategy Session
DTSTART;TZID="Greenwich Standard Time":20260908T090000
DTEND;TZID="Greenwich Standard Time":20260908T110000
LOCATION:Duston Group HQ Executive Boardroom
DESCRIPTION:Bi-weekly leadership committee meeting to review group subsidiary financials and capital expansion projects.\\nJoin Teams Meeting: https://teams.microsoft.com/l/meetup-join/12345
ATTENDEE;CN="Elton K. Dusi";ROLE=REQ-PARTICIPANT:mailto:elton.dusi@moslafrica.com
ATTENDEE;CN="William N. Adjabeng";ROLE=REQ-PARTICIPANT:mailto:william.adjabeng@moslafrica.com
ATTENDEE;CN="Theophilus Dorh";ROLE=REQ-PARTICIPANT:mailto:t.dorh@dustongroup.com
STATUS:CONFIRMED
END:VEVENT
BEGIN:VEVENT
UID:outlook-test-uid-002@dustongroup.com
SUMMARY:MOSL Africa Q3 Capex Review
DTSTART;TZID="Greenwich Standard Time":20260910T140000
DTEND;TZID="Greenwich Standard Time":20260910T153000
LOCATION:Microsoft Teams Meeting (Virtual)
DESCRIPTION:Reviewing equipment procurement and budget allocations for West Africa operations.
ATTENDEE;CN="Desmond Ohene-Asante";ROLE=REQ-PARTICIPANT:mailto:desmond.oheneasante@moslafrica.com
ATTENDEE;CN="Benjamin Arthur";ROLE=REQ-PARTICIPANT:mailto:benjamin.arthur@moslafrica.com
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

async function test() {
  console.log("Testing ICS Parser:");
  const events = parseIcsContent(sampleIcs);
  console.log(`Parsed ${events.length} events:`);
  console.dir(events, { depth: null });

  if (events.length !== 2) {
    throw new Error("Expected 2 events");
  }

  console.log("\nTesting direct database sync...");
  const connectionString = "postgresql://neondb_owner:npg_E4nC9DSguaZJ@ep-raspy-mode-za8p2eep-pooler.c-2.eu-west-2.aws.neon.tech/neondb?sslmode=require";
  const client = new Client({ connectionString });
  await client.connect();

  const entRes = await client.query("SELECT id FROM entities WHERE is_active = true LIMIT 1");
  const entityId = entRes.rows[0].id;
  const userRes = await client.query("SELECT id FROM users WHERE email = 't.dorh@dustongroup.com'");
  const creatorId = userRes.rows[0].id;

  for (const ev of events) {
    const existing = await client.query("SELECT id FROM meetings WHERE external_event_id = $1", [ev.uid]);
    if (existing.rows.length === 0) {
      const ins = await client.query(
        "INSERT INTO meetings (entity_id, subject, meeting_date, venue, is_virtual, external_event_id, created_by, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING id",
        [entityId, ev.summary, ev.startDate, ev.location || "HQ", ev.isVirtual, ev.uid, creatorId]
      );
      console.log(`Inserted meeting "${ev.summary}" on ${ev.startDate} (ID: ${ins.rows[0].id})`);
    } else {
      console.log(`Meeting "${ev.summary}" already exists (ID: ${existing.rows[0].id})`);
    }
  }

  const allM = await client.query("SELECT id, subject, meeting_date, venue, is_virtual FROM meetings ORDER BY meeting_date");
  console.log("\nCurrent meetings in DB:");
  console.table(allM.rows);

  await client.end();
  console.log("Test completed successfully!");
}

test().catch(console.error);
