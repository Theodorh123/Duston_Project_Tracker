import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  getUserScopeCached,
  getActiveEntitiesCached,
} from "@/lib/db/cache";
import { db } from "@/lib/db";
import { actionItems } from "@/lib/db/schema";
import { AnalyticsClient, AnalyticsItem } from "@/components/analytics/AnalyticsClient";
import { Suspense } from "react";

export const metadata = {
  title: "Analytics | Duston Project Tracker",
  description: "Monitor deliverable completion, operational velocity, and workstream momentum across subsidiaries.",
};

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const [
    { user, allowedEntityIds },
    allEntities,
    allItems,
  ] = await Promise.all([
    getUserScopeCached(userId),
    getActiveEntitiesCached(),
    db.query.actionItems.findMany({
      with: {
        project: {
          with: {
            entity: true,
          },
        },
        assignee: true,
        sourceMeeting: true,
      },
      orderBy: [actionItems.deadline],
    }),
  ]);

  const scopedEntities = allEntities
    .filter((e) => allowedEntityIds.includes(e.id))
    .map((e) => ({
      id: e.id,
      name: e.name,
      slug: e.slug,
      brandPrimaryColor: e.brandPrimaryColor,
    }));

  const mappedItems: AnalyticsItem[] = allItems
    .filter((it) => it.project && allowedEntityIds.includes(it.project.entityId))
    .map((it) => ({
      id: it.id,
      title: it.title,
      description: it.description,
      deadline: it.deadline,
      status: it.status as any,
      priority: it.priority as any,
      tag: it.tag,
      assigneeId: it.assigneeId,
      assigneeName: it.assignee?.name || "Unassigned",
      assigneeAvatar: it.assignee?.avatarUrl,
      projectId: it.projectId,
      projectName: it.project?.name || "Project",
      entityId: it.project?.entityId,
      entityName: it.project?.entity?.name || "Subsidiary",
      entityBrandColor: it.project?.entity?.brandPrimaryColor || "#023542",
      createdAt: it.createdAt ? it.createdAt.toISOString() : new Date().toISOString(),
      createdBy: it.createdBy,
    }));

  return (
    <Suspense fallback={null}>
      <AnalyticsClient
        items={mappedItems}
        entities={scopedEntities}
        currentUserRole={user?.role || "contributor"}
      />
    </Suspense>
  );
}
