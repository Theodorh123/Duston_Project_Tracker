import { db } from "./index";
import {
  entities,
  users,
  userEntityAccess,
  projects,
  actionItems,
  meetings,
  meetingAttendees,
  comments,
  activityLog,
  userPreferences,
} from "./schema";
import bcrypt from "bcryptjs";
import { addDays, subDays, format } from "date-fns";

export async function seedDatabase() {
  console.log("Seeding Duston Project Tracker database...");

  const passwordHash = await bcrypt.hash("Duston123!", 10);
  const today = new Date();

  // 1. Entities
  console.log("Seeding entities...");
  // Parent MOSL
  const [mosl] = await db
    .insert(entities)
    .values({
      name: "MOSL Ltd",
      slug: "mosl",
      brandPrimaryColor: "#FF8B00",
      isActive: true,
    })
    .returning();

  // MOSL Children
  const [moslGhana] = await db
    .insert(entities)
    .values({
      parentEntityId: mosl.id,
      name: "MOSL Ghana",
      slug: "mosl-ghana",
      brandPrimaryColor: "#FF8B00",
      isActive: true,
    })
    .returning();

  const [moslTanzania] = await db
    .insert(entities)
    .values({
      parentEntityId: mosl.id,
      name: "MOSL Tanzania",
      slug: "mosl-tanzania",
      brandPrimaryColor: "#FF8B00",
      isActive: true,
    })
    .returning();

  const [moslMali] = await db
    .insert(entities)
    .values({
      parentEntityId: mosl.id,
      name: "MOSL Mali",
      slug: "mosl-mali",
      brandPrimaryColor: "#FF8B00",
      isActive: true,
    })
    .returning();

  const [moslSenegal] = await db
    .insert(entities)
    .values({
      parentEntityId: mosl.id,
      name: "MOSL Senegal",
      slug: "mosl-senegal",
      brandPrimaryColor: "#FF8B00",
      isActive: true,
    })
    .returning();

  // Standalone entities
  const [icon] = await db
    .insert(entities)
    .values({
      name: "ICON Energy",
      slug: "icon",
      brandPrimaryColor: "#03506F",
      isActive: true,
    })
    .returning();

  const [norva] = await db
    .insert(entities)
    .values({
      name: "Norva Oil Trading DMCC",
      slug: "norva",
      brandPrimaryColor: "#023542",
      isActive: true,
    })
    .returning();

  const [novaMines] = await db
    .insert(entities)
    .values({
      name: "Nova Mines",
      slug: "nova-mines",
      brandPrimaryColor: "#03446D",
      isActive: true,
    })
    .returning();

  const [dustonProperties] = await db
    .insert(entities)
    .values({
      name: "Duston Properties",
      slug: "duston-properties",
      brandPrimaryColor: "#023542",
      isActive: true,
    })
    .returning();

  const [livon] = await db
    .insert(entities)
    .values({
      name: "Livon Advanced Hospital",
      slug: "livon",
      brandPrimaryColor: "#1BCECE",
      isActive: true,
    })
    .returning();

  const [alpha] = await db
    .insert(entities)
    .values({
      name: "Alpha Insurance Brokers",
      slug: "alpha",
      brandPrimaryColor: "#023542",
      isActive: true,
    })
    .returning();

  const [wasco] = await db
    .insert(entities)
    .values({
      name: "WASCO",
      slug: "wasco",
      brandPrimaryColor: "#023542",
      isActive: true,
    })
    .returning();

  const [gbs] = await db
    .insert(entities)
    .values({
      name: "GBS - Ghana Bunkering Services",
      slug: "gbs",
      brandPrimaryColor: "#023542",
      isActive: true,
    })
    .returning();

  // 2. Users
  console.log("Seeding users...");
  const [theophilus] = await db
    .insert(users)
    .values({
      name: "Theophilus Dorh",
      email: "theophilus@duston.com",
      passwordHash,
      phoneE164: "+233241234567",
      role: "ea",
      hasGlobalAccess: true,
      isActive: true,
    })
    .returning();

  const [elton] = await db
    .insert(users)
    .values({
      name: "Elton K. Dusi",
      email: "elton@duston.com",
      passwordHash,
      phoneE164: "+233249876543",
      role: "ceo",
      hasGlobalAccess: true,
      isActive: true,
    })
    .returning();

  const [testMd] = await db
    .insert(users)
    .values({
      name: "Test MD",
      email: "md@duston.com",
      passwordHash,
      phoneE164: "+233201112233",
      role: "md",
      hasGlobalAccess: false,
      isActive: true,
    })
    .returning();

  const [testHod] = await db
    .insert(users)
    .values({
      name: "Test HOD",
      email: "hod@duston.com",
      passwordHash,
      phoneE164: "+233204445566",
      role: "hod",
      hasGlobalAccess: true,
      isActive: true,
    })
    .returning();

  const [testContributor] = await db
    .insert(users)
    .values({
      name: "Test Contributor",
      email: "contributor@duston.com",
      passwordHash,
      phoneE164: "+233207778899",
      role: "contributor",
      hasGlobalAccess: true,
      isActive: true,
    })
    .returning();

  // 3. User Entity Access for Test MD (MOSL group only)
  console.log("Seeding user entity access for restricted user...");
  await db.insert(userEntityAccess).values([
    { userId: testMd.id, entityId: mosl.id, accessLevel: "write" },
    { userId: testMd.id, entityId: moslGhana.id, accessLevel: "write" },
    { userId: testMd.id, entityId: moslTanzania.id, accessLevel: "write" },
    { userId: testMd.id, entityId: moslMali.id, accessLevel: "write" },
    { userId: testMd.id, entityId: moslSenegal.id, accessLevel: "write" },
  ]);

  // 4. User Preferences
  console.log("Seeding user preferences...");
  const userList = [theophilus, elton, testMd, testHod, testContributor];
  for (const u of userList) {
    await db.insert(userPreferences).values({
      userId: u.id,
      defaultView: "todo",
      kanbanColumns: ["Backlog", "This Week", "In Progress", "Blocked", "Done"],
      timezone: "Africa/Accra",
      whatsappEnabled: true,
      digestFrequency: "daily",
    });
  }

  // 5. Sample Projects
  console.log("Seeding projects...");
  // Under MOSL
  const [pEbid] = await db
    .insert(projects)
    .values({
      entityId: mosl.id,
      name: "EBID Trade Finance Facility (USD 50M)",
      description: "Structured trade finance syndication with ECOWAS Bank for Investment and Development.",
      category: "financing",
      status: "in_progress",
      priority: "critical",
      ownerId: theophilus.id,
      sponsorId: elton.id,
      startDate: format(subDays(today, 60), "yyyy-MM-dd"),
      targetDate: format(addDays(today, 90), "yyyy-MM-dd"),
      budgetNotes: "Facility fee: 1.25%, margin: SOFR + 450bps. Legal counsel: BELA Partners.",
    })
    .returning();

  const [pBolga] = await db
    .insert(projects)
    .values({
      entityId: mosl.id,
      name: "Bolgatanga Terminal Construction",
      description: "Construction of inland bulk fuel terminal in Upper East Region.",
      category: "capex",
      status: "in_progress",
      priority: "high",
      ownerId: testHod.id,
      sponsorId: elton.id,
      startDate: format(subDays(today, 120), "yyyy-MM-dd"),
      targetDate: format(addDays(today, 180), "yyyy-MM-dd"),
      budgetNotes: "Phase 1 CAPEX: USD 14.2M.",
    })
    .returning();

  const [pGbsRestruct] = await db
    .insert(projects)
    .values({
      entityId: mosl.id,
      name: "GBS Operational Restructuring",
      description: "Streamlining bunkering operations and barging turnaround times.",
      category: "operations",
      status: "in_progress",
      priority: "medium",
      ownerId: testMd.id,
      sponsorId: elton.id,
      startDate: format(subDays(today, 30), "yyyy-MM-dd"),
      targetDate: format(addDays(today, 45), "yyyy-MM-dd"),
    })
    .returning();

  // MOSL Subsidiaries
  const [pNyerere] = await db
    .insert(projects)
    .values({
      entityId: moslTanzania.id,
      name: "Project Nyerere — PBPA Licensing",
      description: "Petroleum Bulk Procurement Agency (PBPA) tender accreditation and local partner alignment.",
      category: "regulatory",
      status: "in_progress",
      priority: "high",
      ownerId: testMd.id,
      sponsorId: theophilus.id,
      startDate: format(subDays(today, 45), "yyyy-MM-dd"),
      targetDate: format(addDays(today, 30), "yyyy-MM-dd"),
    })
    .returning();

  const [pMaliExport] = await db
    .insert(projects)
    .values({
      entityId: moslMali.id,
      name: "Mali Export Strategy — Phase 1",
      description: "Cross-border transit corridors and customs escrow agreements.",
      category: "commercial",
      status: "in_progress",
      priority: "medium",
      ownerId: testMd.id,
      sponsorId: elton.id,
      startDate: format(subDays(today, 20), "yyyy-MM-dd"),
      targetDate: format(addDays(today, 60), "yyyy-MM-dd"),
    })
    .returning();

  const [pSenegalSupply] = await db
    .insert(projects)
    .values({
      entityId: moslSenegal.id,
      name: "Norva Senegal Supply Coordination",
      description: "Offshore cargo discharge coordination into Dakar terminal.",
      category: "commercial",
      status: "in_progress",
      priority: "high",
      ownerId: theophilus.id,
      sponsorId: elton.id,
      startDate: format(subDays(today, 15), "yyyy-MM-dd"),
      targetDate: format(addDays(today, 40), "yyyy-MM-dd"),
    })
    .returning();

  // ICON Energy
  const [pGlencore] = await db
    .insert(projects)
    .values({
      entityId: icon.id,
      name: "Glencore Retail CAPEX Loan (USD 20M)",
      description: "Refinancing station network upgrades across 42 retail forecourts.",
      category: "financing",
      status: "in_progress",
      priority: "critical",
      ownerId: theophilus.id,
      sponsorId: elton.id,
      startDate: format(subDays(today, 90), "yyyy-MM-dd"),
      targetDate: format(addDays(today, 15), "yyyy-MM-dd"),
    })
    .returning();

  const [pGcbCard] = await db
    .insert(projects)
    .values({
      entityId: icon.id,
      name: "GCB Digital Fuel Card Partnership",
      description: "Fleet corporate payment integration with GCB Bank retail POS systems.",
      category: "commercial",
      status: "in_progress",
      priority: "medium",
      ownerId: testContributor.id,
      sponsorId: theophilus.id,
      startDate: format(subDays(today, 40), "yyyy-MM-dd"),
      targetDate: format(addDays(today, 25), "yyyy-MM-dd"),
    })
    .returning();

  const [pMobile2i] = await db
    .insert(projects)
    .values({
      entityId: icon.id,
      name: "Mobile 2i Forecourt Automation",
      description: "Automated tank gauging (ATG) and electronic dispensing pump telemetry.",
      category: "operations",
      status: "blocked",
      priority: "high",
      ownerId: testHod.id,
      sponsorId: elton.id,
      startDate: format(subDays(today, 70), "yyyy-MM-dd"),
      targetDate: format(addDays(today, 10), "yyyy-MM-dd"),
    })
    .returning();

  // WASCO
  const [pBalungu] = await db
    .insert(projects)
    .values({
      entityId: wasco.id,
      name: "Project Gamma — Balungu Terminal Build",
      description: "Civil engineering works and storage tanks fabrication.",
      category: "capex",
      status: "in_progress",
      priority: "critical",
      ownerId: testHod.id,
      sponsorId: elton.id,
      startDate: format(subDays(today, 100), "yyyy-MM-dd"),
      targetDate: format(addDays(today, 120), "yyyy-MM-dd"),
    })
    .returning();

  // Nova Mines
  const [pDrilling] = await db
    .insert(projects)
    .values({
      entityId: novaMines.id,
      name: "Q1 2026 Drilling Program",
      description: "Core diamond exploration drill campaign across southern concession.",
      category: "operations",
      status: "in_progress",
      priority: "high",
      ownerId: testHod.id,
      sponsorId: elton.id,
      startDate: format(subDays(today, 50), "yyyy-MM-dd"),
      targetDate: format(addDays(today, 45), "yyyy-MM-dd"),
    })
    .returning();

  const [pCommunity] = await db
    .insert(projects)
    .values({
      entityId: novaMines.id,
      name: "Community Relations Framework",
      description: "Local stakeholder engagement and CSR water sanitation handover.",
      category: "corporate",
      status: "in_progress",
      priority: "low",
      ownerId: testContributor.id,
      sponsorId: theophilus.id,
      startDate: format(subDays(today, 30), "yyyy-MM-dd"),
      targetDate: format(addDays(today, 60), "yyyy-MM-dd"),
    })
    .returning();

  // Livon Advanced Hospital
  const [pIhg] = await db
    .insert(projects)
    .values({
      entityId: livon.id,
      name: "IHG O&M Onboarding",
      description: "Transition to international hospital operations protocol and SOP compliance.",
      category: "operations",
      status: "in_progress",
      priority: "critical",
      ownerId: theophilus.id,
      sponsorId: elton.id,
      startDate: format(subDays(today, 40), "yyyy-MM-dd"),
      targetDate: format(addDays(today, 20), "yyyy-MM-dd"),
    })
    .returning();

  const [pBrand] = await db
    .insert(projects)
    .values({
      entityId: livon.id,
      name: "Brand Guidelines Rollout",
      description: "Signage, physician apparel, and patient portal styling guidelines.",
      category: "corporate",
      status: "done",
      priority: "medium",
      ownerId: testContributor.id,
      sponsorId: theophilus.id,
      startDate: format(subDays(today, 90), "yyyy-MM-dd"),
      targetDate: format(subDays(today, 10), "yyyy-MM-dd"),
      actualEndDate: format(subDays(today, 10), "yyyy-MM-dd"),
    })
    .returning();

  // Duston Properties
  const [pEuphoria] = await db
    .insert(projects)
    .values({
      entityId: dustonProperties.id,
      name: "Euphoria Residential Development",
      description: "Luxury high-rise residential apartment complex in Airport West.",
      category: "capex",
      status: "in_progress",
      priority: "high",
      ownerId: theophilus.id,
      sponsorId: elton.id,
      startDate: format(subDays(today, 150), "yyyy-MM-dd"),
      targetDate: format(addDays(today, 240), "yyyy-MM-dd"),
    })
    .returning();

  // 6. Meetings
  console.log("Seeding meetings...");
  const [m1] = await db
    .insert(meetings)
    .values({
      entityId: mosl.id,
      subject: "MOSL Board & Financing Committee Review",
      meetingDate: format(subDays(today, 5), "yyyy-MM-dd"),
      minutesDocUrl: "https://drive.google.com/open?id=duston-board-minutes-ebid",
      createdBy: theophilus.id,
    })
    .returning();

  const [m2] = await db
    .insert(meetings)
    .values({
      entityId: icon.id,
      subject: "ICON Retail Forecourt Performance Sync",
      meetingDate: format(subDays(today, 2), "yyyy-MM-dd"),
      minutesDocUrl: "https://sharepoint.com/duston/icon/minutes-forecourt",
      createdBy: theophilus.id,
    })
    .returning();

  const [m3] = await db
    .insert(meetings)
    .values({
      entityId: livon.id,
      subject: "Livon Hospital Executive Committee",
      meetingDate: format(addDays(today, 3), "yyyy-MM-dd"),
      minutesDocUrl: "https://drive.google.com/open?id=livon-exco-brief",
      createdBy: theophilus.id,
    })
    .returning();

  // Meeting attendees
  await db.insert(meetingAttendees).values([
    { meetingId: m1.id, userId: elton.id },
    { meetingId: m1.id, userId: theophilus.id },
    { meetingId: m1.id, userId: testMd.id },
    { meetingId: m2.id, userId: elton.id },
    { meetingId: m2.id, userId: theophilus.id },
    { meetingId: m2.id, userId: testHod.id },
    { meetingId: m3.id, userId: elton.id },
    { meetingId: m3.id, userId: theophilus.id },
  ]);

  // 7. Action Items with varied deadlines
  console.log("Seeding action items...");

  // Action items for Theophilus
  const [ai1] = await db
    .insert(actionItems)
    .values({
      projectId: pEbid.id,
      title: "Submit draft term sheet to Stanbic Bank",
      description: "Stanbic syndication desk requires confirmed sign-off on sovereign pledge clauses.",
      assigneeId: theophilus.id,
      deadline: format(subDays(today, 3), "yyyy-MM-dd"), // OVERDUE
      status: "in_progress",
      priority: "critical",
      tag: "Syndication",
      sourceMeetingId: m1.id,
      createdBy: elton.id,
    })
    .returning();

  const [ai2] = await db
    .insert(actionItems)
    .values({
      projectId: pEbid.id,
      title: "Review BELA legal opinion on covenant package",
      description: "Check negative pledge clauses against existing MOSL bond indentures.",
      assigneeId: theophilus.id,
      deadline: format(today, "yyyy-MM-dd"), // TODAY
      status: "in_progress",
      priority: "high",
      tag: "Legal",
      sourceMeetingId: m1.id,
      createdBy: theophilus.id,
    })
    .returning();

  const [ai3] = await db
    .insert(actionItems)
    .values({
      projectId: pGlencore.id,
      title: "Execute Glencore hedging mandate agreement",
      description: "Finalize ISDA master agreement schedules with Glencore Singapore.",
      assigneeId: theophilus.id,
      deadline: format(addDays(today, 4), "yyyy-MM-dd"), // THIS WEEK
      status: "not_started",
      priority: "high",
      tag: "Treasury",
      sourceMeetingId: m2.id,
      createdBy: elton.id,
    })
    .returning();

  const [ai4] = await db
    .insert(actionItems)
    .values({
      projectId: pEuphoria.id,
      title: "Approve MEP engineering drawings for Tower B",
      description: "Mechanical and electrical design review with Lead MEP consultant.",
      assigneeId: theophilus.id,
      deadline: format(addDays(today, 18), "yyyy-MM-dd"), // LATER
      status: "not_started",
      priority: "medium",
      tag: "Design",
      createdBy: theophilus.id,
    })
    .returning();

  // Action items for Elton (CEO)
  await db.insert(actionItems).values([
    {
      projectId: pEbid.id,
      title: "Sign ministerial bilateral guarantee letter",
      description: "Countersign the sovereign support documentation at Ministry of Finance.",
      assigneeId: elton.id,
      deadline: format(addDays(today, 2), "yyyy-MM-dd"),
      status: "in_progress",
      priority: "critical",
      tag: "Executive",
      sourceMeetingId: m1.id,
      createdBy: theophilus.id,
    },
    {
      projectId: pBalungu.id,
      title: "Review Balungu EPC contractor milestone sign-off",
      description: "Final tranche approval for USD 3.5M civil engineering milestone.",
      assigneeId: elton.id,
      deadline: format(subDays(today, 2), "yyyy-MM-dd"), // OVERDUE
      status: "blocked",
      priority: "critical",
      tag: "CAPEX",
      createdBy: theophilus.id,
    },
    {
      projectId: pIhg.id,
      title: "Host IHG Africa regional director lunch meeting",
      description: "Align on operational milestone targets for hospital opening.",
      assigneeId: elton.id,
      deadline: format(addDays(today, 5), "yyyy-MM-dd"),
      status: "not_started",
      priority: "medium",
      tag: "Governance",
      sourceMeetingId: m3.id,
      createdBy: theophilus.id,
    },
  ]);

  // Action items for Test MD
  await db.insert(actionItems).values([
    {
      projectId: pBolga.id,
      title: "Schedule EPCM progress review with Marco Scheepers",
      description: "Walk-through of tank foundation settlement data and piping installation schedules.",
      assigneeId: testMd.id,
      deadline: format(subDays(today, 4), "yyyy-MM-dd"), // OVERDUE
      status: "in_progress",
      priority: "high",
      tag: "Operations",
      createdBy: theophilus.id,
    },
    {
      projectId: pNyerere.id,
      title: "Submit PBPA clearance dossier to Dar es Salaam port authorities",
      description: "Complete tax clearance and local content declaration filings.",
      assigneeId: testMd.id,
      deadline: format(addDays(today, 3), "yyyy-MM-dd"),
      status: "in_progress",
      priority: "high",
      tag: "Permits",
      createdBy: testMd.id,
    },
    {
      projectId: pGbsRestruct.id,
      title: "Audit GBS bunker barge safety certifications",
      description: "Bureau Veritas annual drydock inspection checklist verification.",
      assigneeId: testMd.id,
      deadline: format(subDays(today, 8), "yyyy-MM-dd"),
      status: "done",
      priority: "medium",
      tag: "Compliance",
      completedAt: subDays(today, 1),
      createdBy: theophilus.id,
    },
  ]);

  // Action items for Test HOD
  await db.insert(actionItems).values([
    {
      projectId: pMobile2i.id,
      title: "Resolve telemetry connectivity dropout on Kumasi retail pumps",
      description: "Pumps dropping offline due to unstable cellular gateway firmware.",
      assigneeId: testHod.id,
      deadline: format(subDays(today, 5), "yyyy-MM-dd"), // OVERDUE & BLOCKED
      status: "blocked",
      priority: "critical",
      tag: "IT/Telemetry",
      createdBy: theophilus.id,
    },
    {
      projectId: pDrilling.id,
      title: "Commission assay lab analysis for Drill Hole DH-042",
      description: "Send 140 split core samples to SGS Tarkwa laboratory for fire assay.",
      assigneeId: testHod.id,
      deadline: format(addDays(today, 1), "yyyy-MM-dd"),
      status: "in_progress",
      priority: "high",
      tag: "Geology",
      createdBy: theophilus.id,
    },
  ]);

  // Action items for Test Contributor
  await db.insert(actionItems).values([
    {
      projectId: pGcbCard.id,
      title: "Configure POS test batch for 5 pilot Accra stations",
      description: "Run test transactions with 50 merchant cards on PAX terminals.",
      assigneeId: testContributor.id,
      deadline: format(addDays(today, 3), "yyyy-MM-dd"),
      status: "in_progress",
      priority: "medium",
      tag: "POS",
      createdBy: testHod.id,
    },
    {
      projectId: pBrand.id,
      title: "Distribute Livon brand asset packs to medical staff",
      description: "Upload vectorized badges and scrubs color specs to Intranet.",
      assigneeId: testContributor.id,
      deadline: format(subDays(today, 12), "yyyy-MM-dd"),
      status: "done",
      priority: "low",
      tag: "Branding",
      completedAt: subDays(today, 11),
      createdBy: theophilus.id,
    },
  ]);

  // 8. Comments & Activity Log
  console.log("Seeding comments and activity...");
  await db.insert(comments).values([
    {
      actionItemId: ai1.id,
      userId: elton.id,
      body: "Stanbic MD confirmed verbally they will accept the sovereign backstop if signed by Tuesday.",
    },
    {
      actionItemId: ai1.id,
      userId: theophilus.id,
      body: "Working with BELA to ensure wording matches the EBID draft before morning circulation.",
    },
  ]);

  await db.insert(activityLog).values([
    {
      actionItemId: ai1.id,
      actorId: elton.id,
      eventType: "created",
      note: "Created action item from Board meeting",
    },
    {
      actionItemId: ai1.id,
      actorId: theophilus.id,
      eventType: "status_change",
      fromValue: "not_started",
      toValue: "in_progress",
      note: "Moved to In Progress after initial Stanbic sync",
    },
    {
      actionItemId: ai2.id,
      actorId: theophilus.id,
      eventType: "created",
      note: "Drafted covenant review item",
    },
  ]);

  console.log("Duston Project Tracker seed completed successfully!");
}

// Allow direct CLI execution: tsx src/lib/db/seed.ts
if (require.main === module || process.argv[1]?.includes("seed.ts")) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seed failed:", err);
      process.exit(1);
    });
}
