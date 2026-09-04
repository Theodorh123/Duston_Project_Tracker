import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { auth } from "@/auth";
import { getUserScopeCached } from "@/lib/db/cache";
import { asc, inArray } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowedEntityIds } = await getUserScopeCached(session.user.id);
  const projectList = await db.query.projects.findMany({
    where: allowedEntityIds.length > 0 ? inArray(projects.entityId, allowedEntityIds) : undefined,
    with: {
      entity: {
        columns: {
          id: true,
          name: true,
          brandPrimaryColor: true,
        },
      },
    },
    orderBy: [asc(projects.name)],
  });

  return NextResponse.json(
    projectList.map((p) => ({
      id: p.id,
      name: p.name,
      entityId: p.entityId,
      entityName: p.entity?.name || "Subsidiary",
      entityBrandColor: p.entity?.brandPrimaryColor || "#023542",
    }))
  );
}
