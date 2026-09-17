import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, actionItems } from "@/lib/db/schema";
import { ilike } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  if (!q.trim()) {
    return NextResponse.json({ results: [] });
  }

  const queryPattern = `%${q.trim()}%`;

  try {
    const [foundProjects, foundItems] = await Promise.all([
      db.query.projects.findMany({
        where: ilike(projects.name, queryPattern),
        with: { entity: true },
        limit: 5,
      }),
      db.query.actionItems.findMany({
        where: ilike(actionItems.title, queryPattern),
        with: {
          project: {
            with: { entity: true },
          },
        },
        limit: 8,
      }),
    ]);

    const results = [
      ...foundProjects.map((p) => ({
        type: "project" as const,
        id: p.id,
        title: p.name,
        entity: p.entity?.name || "Group",
        href: `/projects/${p.id}`,
      })),
      ...foundItems.map((i) => ({
        type: "action" as const,
        id: i.id,
        title: i.title,
        entity: i.project?.entity?.name || "Group",
        href: undefined,
      })),
    ];

    return NextResponse.json({ results });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json({ results: [] });
  }
}
