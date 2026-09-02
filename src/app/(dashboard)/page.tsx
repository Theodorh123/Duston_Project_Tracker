import { auth } from "@/auth";
import { db } from "@/lib/db";
import { actionItems, meetings, activityLog, userPreferences, users, projects, entities, userEntityAccess } from "@/lib/db/schema";
import { eq, desc, gte, lte, and, inArray } from "drizzle-orm";
import { DashboardClient, ActionItemSummary, MeetingSummary, ActivitySummary } from "@/components/dashboard/DashboardClient";
import { addDays, format } from "date-fns";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ filter?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const initialFilter = (resolvedParams?.filter as any) || "all";
  const session = await auth();
  const userId = session?.user?.id!;

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  const preferences = await db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, userId),
  });

  // Allowed entity IDs for scoping
  let allowedEntityIds: string[] = [];
  if (user?.hasGlobalAccess) {
    const allEnt = await db.query.entities.findMany({ where: eq(entities.isActive, true) });
    allowedEntityIds = allEnt.map((e) => e.id);
  } else {
    const grants = await db.query.userEntityAccess.findMany({
      where: eq(userEntityAccess.userId, userId),
    });
    allowedEntityIds = grants.map((g) => g.entityId);
  }

  // Fetch action items assigned to user (or relevant to user's entities)
  const items = await db.query.actionItems.findMany({
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
  });

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
  }));

  // Filter items by allowed entities if restricted
  const scopedItems = user?.hasGlobalAccess
    ? mappedItems
    : mappedItems.filter((i) => allowedEntityIds.includes(i.entityId));

  // Upcoming meetings (next 14 days)
  const today = new Date();
  const future = addDays(today, 14);

  const upcomingMeetingsData = await db.query.meetings.findMany({
    where: and(
      gte(meetings.meetingDate, format(today, "yyyy-MM-dd")),
      lte(meetings.meetingDate, format(future, "yyyy-MM-dd"))
    ),
    with: {
      entity: true,
      attendees: true,
    },
    orderBy: [meetings.meetingDate],
    limit: 5,
  });

  const scopedMeetings: MeetingSummary[] = upcomingMeetingsData
    .filter((m) => allowedEntityIds.includes(m.entityId))
    .map((m) => ({
      id: m.id,
      subject: m.subject,
      meetingDate: m.meetingDate,
      entityName: m.entity.name,
      venue: m.venue,
      isVirtual: m.isVirtual,
      attendeeCount: m.attendees.length,
    }));

  // Recent activity logs (top 5)
  const recentLogs = await db.query.activityLog.findMany({
    with: {
      actor: true,
      actionItem: true,
    },
    orderBy: [desc(activityLog.createdAt)],
    limit: 5,
  });

  const mappedActivities: ActivitySummary[] = recentLogs.map((l) => ({
    id: l.id,
    actorName: l.actor?.name || "System",
    actionItemTitle: l.actionItem?.title || "Action Item",
    note: l.note,
    createdAt: l.createdAt.toISOString(),
  }));

  // Fetch active projects and users for quick task creation
  const allProjects = await db.query.projects.findMany({
    with: {
      entity: true,
    },
    orderBy: [desc(projects.createdAt)],
  });
  const scopedProjects = allProjects
    .filter((p) => allowedEntityIds.includes(p.entityId))
    .map((p) => ({
      id: p.id,
      name: p.name,
      entityName: p.entity.name,
      entityBrandColor: p.entity.brandPrimaryColor,
    }));

  const allUsers = await db.query.users.findMany({
    where: eq(users.isActive, true),
    orderBy: [users.name],
  });
  const mappedUsers = allUsers.map((u) => ({ id: u.id, name: u.name }));

  return (
    <DashboardClient
      userName={user?.name || "User"}
      initialItems={scopedItems}
      upcomingMeetings={scopedMeetings}
      recentActivities={mappedActivities}
      defaultView={preferences?.defaultView || "todo"}
      kanbanColumns={preferences?.kanbanColumns || ["Backlog", "This Week", "In Progress", "Blocked", "Done"]}
      projects={scopedProjects}
      users={mappedUsers}
      currentUserId={userId}
      initialFilter={initialFilter}
    />
  );
}
