import { auth } from "@/auth";
import { db } from "@/lib/db";
import { actionItems, activityLog, userPreferences, users, projects, entities, userEntityAccess } from "@/lib/db/schema";
import { eq, desc, or, sql } from "drizzle-orm";
import { DashboardClient, ActionItemSummary, ActivitySummary } from "@/components/dashboard/DashboardClient";

import { getUserScopeCached, getActiveEntitiesCached, getActiveUsersCached } from "@/lib/db/cache";

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
    [preferences, items, recentLogs, allProjects],
  ] = await Promise.all([
    getUserScopeCached(userId),
    getActiveEntitiesCached(),
    getActiveUsersCached(),
    Promise.all([
      db.query.userPreferences.findFirst({
        where: eq(userPreferences.userId, userId),
      }),
      db.query.actionItems.findMany({
        where: or(
          eq(actionItems.assigneeId, userId),
          sql`${actionItems.secondaryAssigneeIds} @> ${JSON.stringify([userId])}::jsonb`
        ),
        with: {
          project: {
            with: {
              entity: true,
            },
          },
          assignee: true,
          comments: true,
        },
        orderBy: [actionItems.deadline],
      }),
      db.query.activityLog.findMany({
        with: {
          actor: true,
          actionItem: {
            with: {
              project: true,
            },
          },
        },
        orderBy: [desc(activityLog.createdAt)],
        limit: 20,
      }),
      db.query.projects.findMany({
        with: {
          entity: true,
        },
        orderBy: [desc(projects.createdAt)],
      }),
    ]),
  ]);

  const userNameMap = new Map(allUsers.map((u) => [u.id, u.name]));

  // Map action items for client
  const mappedItems: ActionItemSummary[] = items.map((item) => {
    const secIds: string[] = Array.isArray(item.secondaryAssigneeIds)
      ? (item.secondaryAssigneeIds as string[])
      : [];
    const secNames = secIds.map((id) => userNameMap.get(id)).filter(Boolean) as string[];

    return {
      id: item.id,
      projectId: item.projectId,
      projectName: item.project.name,
      entityId: item.project.entityId,
      entityName: item.project.entity.name,
      entityBrandColor: item.project.entity.brandPrimaryColor,
      title: item.title,
      deadline: item.deadline,
      status: item.status as any,
      priority: item.priority as any,
      assigneeId: item.assigneeId,
      assigneeName: item.assignee.name,
      secondaryAssigneeIds: secIds,
      secondaryAssigneeNames: secNames,
      commentCount: item.comments?.length || 0,
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
      if (!l.actionItem?.project?.entityId) return true;
      return allowedEntityIds.includes(l.actionItem.project.entityId);
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
      entityName: p.entity.name,
      entityBrandColor: p.entity.brandPrimaryColor,
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
      initialFilter={initialFilter}
    />
  );
}
