import { auth } from "@/auth";
import { db } from "@/lib/db";
import { actionItems, activityLog, userPreferences, users, projects, entities, userEntityAccess } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { DashboardClient, ActionItemSummary, ActivitySummary } from "@/components/dashboard/DashboardClient";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ filter?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const initialFilter = (resolvedParams?.filter as any) || "all";
  const session = await auth();
  const userId = session?.user?.id!;

  // Fetch all dashboard data concurrently in parallel
  const [
    user,
    preferences,
    grants,
    allEnt,
    items,
    recentLogs,
    allProjects,
    allUsers,
  ] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, userId),
    }),
    db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, userId),
    }),
    db.query.userEntityAccess.findMany({
      where: eq(userEntityAccess.userId, userId),
    }),
    db.query.entities.findMany({
      where: eq(entities.isActive, true),
    }),
    db.query.actionItems.findMany({
      where: eq(actionItems.assigneeId, userId),
      with: {
        project: {
          with: {
            entity: true,
          },
        },
        assignee: true,
      },
      orderBy: [actionItems.deadline],
    }),
    db.query.activityLog.findMany({
      with: {
        actor: true,
        actionItem: true,
      },
      orderBy: [desc(activityLog.createdAt)],
      limit: 8,
    }),
    db.query.projects.findMany({
      with: {
        entity: true,
      },
      orderBy: [desc(projects.createdAt)],
    }),
    db.query.users.findMany({
      where: eq(users.isActive, true),
      orderBy: [users.name],
    }),
  ]);

  // Allowed entity IDs for scoping
  const allowedEntityIds = user?.hasGlobalAccess
    ? allEnt.map((e) => e.id)
    : grants.map((g) => g.entityId);

  // Map action items for client
  const mappedItems: ActionItemSummary[] = items.map((item) => ({
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
    tag: item.tag,
  }));

  // Filter items by allowed entities if restricted
  const scopedItems = user?.hasGlobalAccess
    ? mappedItems
    : mappedItems.filter((i) => allowedEntityIds.includes(i.entityId));

  const mappedActivities: ActivitySummary[] = recentLogs.map((l) => ({
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
      kanbanColumns={preferences?.kanbanColumns || ["Backlog", "This Week", "In Progress", "Blocked", "Done"]}
      projects={scopedProjects}
      users={mappedUsers}
      entities={allEnt.map((e) => ({ id: e.id, name: e.name, brandPrimaryColor: e.brandPrimaryColor }))}
      currentUserId={userId}
      initialFilter={initialFilter}
    />
  );
}
