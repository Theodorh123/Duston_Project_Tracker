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

## Production Accounts & Access

The database is connected to Neon PostgreSQL. Current active executive accounts use password: **`Duston@123!`**

| Name | Email | Role | Access Scope | Permissions |
|---|---|---|---|---|
| **System Admin** | `admin@dustongroup.com` | `admin` | Global (All Subsidiaries) | Full system control, user & entity management, data maintenance |
| **Theophilus Dorh** | `t.dorh@dustongroup.com` | `ea` | Global (All Subsidiaries) | EA View, universal action item delete/edit, meeting registers |
| **Elton K. Dusi** | `elton.dusi@moslafrica.com` | `ceo` | Global (All Subsidiaries) | CEO View, group heatmap, universal action item delete/edit |
| **Other Team Members** | `*@dustongroup.com` | `hod` / `md` / `contributor` | Subsidiary-scoped | Edit own created deliverables, view assigned subsidiary projects |

---

## Key Capabilities & Role-Based Permissions

1. **Role-Based Delete & Amend Security**:
   - **Delete Action Items:** Restricted strictly to **EA**, **Admin**, and **CEO** with confirmation dialog.
   - **Amend Action Items:** EA, Admin, and CEO can edit any action item across the conglomerate. Other members can **only edit items that originate from them**.
2. **Action Register Bulk Importer (`/action-items`)**:
   - Accepts tab-separated, CSV, or Markdown tables directly copied from Word/Excel meeting minutes.
   - Intelligent auto-mapping for Subsidiary, Project, Action Item, Responsible Party, Status, Deadline, and Priority.
3. **Data & Maintenance Panel (`/admin`)**:
   - Real-time database metrics dashboard.
   - Self-service purging of system notifications and test activity logs.
4. **Login Screen (`/login`)**:
   - Integrated show/hide password eye toggle and corporate FlaneLines branding.
5. **Universal Action Item Drawer**:
   - Slide-in side drawer with live status/priority pills, deadline calendars, auto-saving variance notes, threaded comments, and audit timeline.
6. **Dismissible Overlays**:
   - Notification popover and profile dropdown dismiss automatically when clicking outside or pressing <kbd>Esc</kbd>.

