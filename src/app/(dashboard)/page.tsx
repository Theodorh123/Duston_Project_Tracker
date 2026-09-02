import { auth } from "@/auth";
import { db } from "@/lib/db";
import { actionItems, meetings, activityLog, userPreferences, users, projects, entities, userEntityAccess } from "@/lib/db/schema";
import { eq, desc, gte, lte, and, inArray } from "drizzle-orm";
import { DashboardClient, ActionItemSummary, MeetingSummary, ActivitySummary } from "@/components/dashboard/DashboardClient";
import { addDays, format } from "date-fns";

export default async function DashboardPage() {
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
    orderBy: [desc(actionItems.deadline)],
  });

  // Filter items to allowed entities
  const scopedItems: ActionItemSummary[] = items
    .filter((it) => allowedEntityIds.includes(it.project.entityId))
    .map((it) => ({
      id: it.id,
      projectId: it.projectId,
      projectName: it.project.name,
      entityId: it.project.entityId,
      entityName: it.project.entity.name,
      entityBrandColor: it.project.entity.brandPrimaryColor,
      title: it.title,
      deadline: it.deadline,
      status: it.status,
      priority: it.priority,
      assigneeId: it.assigneeId,
      assigneeName: it.assignee.name,
    }));

  // Fetch upcoming meetings (next 7 days) within allowed entities
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const nextWeekStr = format(addDays(new Date(), 7), "yyyy-MM-dd");

  const upcomingMtgs = await db.query.meetings.findMany({
    where: and(
      gte(meetings.meetingDate, todayStr),
      lte(meetings.meetingDate, nextWeekStr)
    ),
    with: {
      entity: true,
      attendees: true,
    },
    orderBy: [meetings.meetingDate],
  });

  const scopedMeetings: MeetingSummary[] = upcomingMtgs
    .filter((m) => allowedEntityIds.includes(m.entityId))
    .map((m) => ({
      id: m.id,
      subject: m.subject,
      entityName: m.entity.name,
      meetingDate: m.meetingDate,
      venue: m.venue,
      isVirtual: m.isVirtual,
      attendeeCount: m.attendees.length,
    }));

  // Fetch recent activity
  const recentLogs = await db.query.activityLog.findMany({
    with: {
      actor: true,
      actionItem: true,
    },
    orderBy: [desc(activityLog.createdAt)],
    limit: 8,
  });

  const mappedActivities: ActivitySummary[] = recentLogs.map((log) => ({
    id: log.id,
    actorName: log.actor.name,
    actionItemTitle: log.actionItem?.title || "Action item",
    note: log.note,
    createdAt: log.createdAt.toISOString(),
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
    />
  );
}
