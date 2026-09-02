# Duston Project Tracker

Internal enterprise project management and cross-subsidiary action tracker purpose-built for **Duston Group**, a diversified Ghanaian conglomerate.

The system empowers the CEO, Executive Assistant, subsidiary Managing Directors, Heads of Department, and Contributors to track deliverables, meeting minutes, and operational bottlenecks with cross-entity visibility and WhatsApp notification alerts.

---

## Design Reference & Aesthetics

Built following the calm confidence, rounded metric density, and information architecture of the **Taskora** dashboard reference:
- **Primary Dark:** `#023542` (Dark Futurist Green) — Sidebar, headers, primary buttons
- **Primary Accent:** `#1BCECE` (Futurist Green) — CTAs, active nav states, focus rings, progress fills
- **Status & Priority Semantic Accents:**
  - High priority / Overdue: `#F15A24` (Orange)
  - Medium priority: `#FBB03B` (Amber)
  - Low priority: `#D9E021` (Yellow-green)
  - Completed: `#39B54A` (Green)
- **Surfaces:** `#FAF9F6` (Warm off-white background), `#FFFFFF` (Card surfaces), `#E8E6E0` (Subtle 1px borders)
- **Typography:** Maven Pro (`next/font/google`), sentence case throughout, zero emojis, zero excessive drop shadows.

---

## Tech Stack

- **Framework:** Next.js 15 (App Router, Server Components & Server Actions)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + custom tokens
- **Icons:** Lucide React (`stroke-width={1.5}`)
- **Database:** Neon / Supabase PostgreSQL via `@neondatabase/serverless` & `postgres`
- **ORM:** Drizzle ORM (`drizzle-kit`)
- **Authentication:** Auth.js v5 (NextAuth) Credentials Provider with bcrypt password hashing
- **WhatsApp Integration:** Interface wired with structured payload logging & database notification dispatch

---

## Getting Started

### 1. Environment Variables

Create `.env.local` based on `.env.example`:

```env
DATABASE_URL="postgresql://user:password@ep-xyz.region.aws.neon.tech/dustondb?sslmode=require"
AUTH_SECRET="duston_super_secret_auth_key_2026_ghana_conglomerate_secure_token"
AUTH_URL="http://localhost:3000"
NEXTAUTH_URL="http://localhost:3000"
```

### 2. Push Schema & Seed Data

Ensure your database is reachable via `DATABASE_URL`, then execute:

```bash
# Push tables to Postgres
npm run db:push

# Populate subsidiaries, test users, and realistic initiatives
npm run db:seed
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Seed Test Accounts

All accounts use the default password: **`Duston123!`**

| Name | Email | Role | Entity Visibility | Key Features |
|---|---|---|---|---|
| **Theophilus Dorh** | `theophilus@duston.com` | `ea` (EA) | Global (All Entities) | EA View, Overdue Queue, Meeting Prep Panel, Executive Briefs |
| **Elton K. Dusi** | `elton@duston.com` | `ceo` (CEO) | Global (All Entities) | CEO View, Group Heatmap, Top 10 Risks, Weekly Digest |
| **Test MD** | `md@duston.com` | `md` (MD) | MOSL Group Only | Scoped to MOSL Ltd, MOSL Ghana/Tanzania/Mali/Senegal |
| **Test HOD** | `hod@duston.com` | `hod` (Head of Dept) | Global (All Entities) | Forecourt automation, CAPEX tracking |
| **Test Contributor** | `contributor@duston.com` | `contributor` | Global (All Entities) | Personal Todo, Kanban, and Planner views |

---

## Key Screens & Features

1. **Login (`/login`):** Centered card on warm off-white background with subtle diagonal FlaneLines motif. Features 1-click test user buttons for instant evaluation.
2. **Dashboard (`/`):** 4 rounded metric cards (Open, Overdue, Due this week, Completed this month), view switcher (Todo, Kanban, Planner), 7-day upcoming meetings, and recent activity feed.
3. **Projects (`/projects`):** Filterable table/card view with entity brand pills, category and status multi-filters, live search, and slide-in project creation drawer.
4. **Project Detail (`/projects/[id]`):** Breadcrumbs, meta strip, 4 dedicated tabs (Action Items [List/Kanban], Meetings, Activity audit trail, and Details with inline edits).
5. **Meetings (`/meetings` & `/meetings/[id]`):** Meeting directory and detail view with attendee stacks, external minutes link, and **Action Register Bulk Parser** (`Item | Responsible | Deadline`).
6. **Action Item Drawer:** Universal 480px slide-in panel (full-screen on mobile) with inline editing, deadline picker, status/priority dropdowns, auto-saving description, comment bubbles, and activity timeline.
7. **EA View (`/ea-view`):** Overdue queue sorted by risk score (`days overdue * priority`), chase-up queue, subsidiary health cards, 14-day meeting prep panel, and instant executive brief generator.
8. **CEO View (`/ceo-view`):** Group health heatmap (Subsidiaries × Categories) colored green/amber/red based on overdue ratio, top 10 critical risks/blockers, and weekly momentum digest.
9. **Settings (`/settings`):** Manage default view, custom Kanban pipeline columns, WhatsApp notification toggles, digest frequencies, profile details, and security passwords.
10. **Admin Console (`/admin`):** Role administration, temporary password resets, user activation/deactivation, entity subsidiary hierarchy management, and system-wide activity logs.
