import { auth } from "@/auth";
import { db } from "@/lib/db";
import { actionItems, activityLog, userPreferences, users, projects, entities, comments } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { DashboardClient, ActionItemSummary, ActivitySummary } from "@/components/dashboard/DashboardClient";

import { getUserScopeCached, getActiveEntitiesCached, getActiveUsersCached } from "@/lib/db/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ filter?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const initialFilter = (resolvedParams?.filter as any) || "all";
  const session = await auth();
  const userId = session?.user?.id!;

  // Fetch scope and entities from cache (0ms if loaded by layout)
  const [
    { user, allowedEntityIds },
    allEnt,
    allUsers,
    [preferences, items, recentLogs, allProjects, commentCounts],
  ] = await Promise.all([
    getUserScopeCached(userId),
    getActiveEntitiesCached(),
    getActiveUsersCached(),
    Promise.all([
      db.query.userPreferences.findFirst({
        where: eq(userPreferences.userId, userId),
      }),
      db.query.actionItems.findMany({
        orderBy: [actionItems.deadline],
      }),
      db.query.activityLog.findMany({
        with: {
          actor: {
            columns: { name: true },
          },
          actionItem: {
            columns: { id: true, title: true, entityId: true, projectId: true },
          },
        },
        orderBy: [desc(activityLog.createdAt)],
        limit: 20,
      }),
      db.query.projects.findMany({
        orderBy: [desc(projects.createdAt)],
      }),
      db
        .select({
          actionItemId: comments.actionItemId,
          count: sql<number>`count(*)::int`,
        })
        .from(comments)
        .groupBy(comments.actionItemId),
    ]),
  ]);

  const userNameMap = new Map(allUsers.map((u) => [u.id, u.name]));
  const entityNameMap = new Map(allEnt.map((e) => [e.id, e.name]));
  const entityColorMap = new Map(allEnt.map((e) => [e.id, e.brandPrimaryColor]));
  const projectMap = new Map(allProjects.map((p) => [p.id, p]));
  const commentCountMap = new Map(
    commentCounts.map((c) => [c.actionItemId, Number(c.count) || 0])
  );

  // Map action items for client
  const mappedItems: ActionItemSummary[] = items.map((item) => {
    const secIds: string[] = Array.isArray(item.secondaryAssigneeIds)
      ? (item.secondaryAssigneeIds as string[])
      : [];
    const secNames = secIds.map((id) => userNameMap.get(id)).filter(Boolean) as string[];

    const proj = item.projectId ? projectMap.get(item.projectId) : undefined;
    const itemEntityId = item.entityId || proj?.entityId || "";
    const itemEntityName = entityNameMap.get(itemEntityId) || "Subsidiary";
    const itemBrandColor = entityColorMap.get(itemEntityId) || "#023542";
    const assigneeName = userNameMap.get(item.assigneeId) || "Unassigned";

    return {
      id: item.id,
      projectId: item.projectId || null,
      projectName: proj?.name || null,
      entityId: itemEntityId,
      entityName: itemEntityName,
      entityBrandColor: itemBrandColor,
      title: item.title,
      deadline: item.deadline,
      status: item.status as any,
      priority: item.priority as any,
      assigneeId: item.assigneeId,
      assigneeName,
      secondaryAssigneeIds: secIds,
      secondaryAssigneeNames: secNames,
      commentCount: commentCountMap.get(item.id) || 0,
      tag: item.tag,
    };
  });

  // Filter items by allowed entities if restricted
  const scopedItems = user?.hasGlobalAccess
    ? mappedItems
    : mappedItems.filter((i) => allowedEntityIds.includes(i.entityId));

  const mappedActivities: ActivitySummary[] = recentLogs
    .filter((l) => {
      if (user?.hasGlobalAccess) return true;
      const actProj = l.actionItem?.projectId ? projectMap.get(l.actionItem.projectId) : undefined;
      const actEntityId = l.actionItem?.entityId || actProj?.entityId;
      if (!actEntityId) return true;
      return allowedEntityIds.includes(actEntityId);
    })
    .slice(0, 8)
    .map((l) => ({
      id: l.id,
      actorName: l.actor?.name || "System",
      actionItemTitle: l.actionItem?.title || "Action Item",
      note: l.note,
      createdAt: l.createdAt.toISOString(),
    }));

  const scopedProjects = allProjects
    .filter((p) => allowedEntityIds.includes(p.entityId))
    .map((p) => ({
      id: p.id,
      name: p.name,
      entityId: p.entityId,
      entityName: entityNameMap.get(p.entityId) || "Subsidiary",
      entityBrandColor: entityColorMap.get(p.entityId) || "#023542",
    }));

  const mappedUsers = allUsers.map((u) => ({ id: u.id, name: u.name }));

  return (
    <DashboardClient
      userName={user?.name || "User"}
      initialItems={scopedItems}
      recentActivities={mappedActivities}
      defaultView={preferences?.defaultView || "todo"}
      kanbanColumns={preferences?.kanbanColumns || ["Todo", "In-Progress", "Done"]}
      projects={scopedProjects}
      users={mappedUsers}
      entities={allEnt.map((e) => ({ id: e.id, name: e.name, brandPrimaryColor: e.brandPrimaryColor }))}
      currentUserId={userId}
      userRole={user?.role}
      hasGlobalAccess={Boolean(user?.hasGlobalAccess)}
      initialFilter={initialFilter}
    />
  );
}
