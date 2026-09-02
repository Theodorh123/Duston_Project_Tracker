import { auth } from "@/auth";
import { db } from "@/lib/db";
import { projects, entities, users, actionItems, meetings, activityLog, userEntityAccess } from "@/lib/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { ProjectDetailClient } from "@/components/projects/ProjectDetailClient";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id!;
  const { id } = await params;

  const currentUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, id),
    with: {
      entity: true,
      owner: true,
      sponsor: true,
    },
  });

  if (!project) {
    notFound();
  }

  // Scoping check
  if (!currentUser?.hasGlobalAccess) {
    const grants = await db.query.userEntityAccess.findMany({
      where: eq(userEntityAccess.userId, userId),
    });
    const allowedEntityIds = grants.map((g) => g.entityId);
    if (!allowedEntityIds.includes(project.entityId)) {
      redirect("/projects");
    }
  }

  // Fetch action items
  const items = await db.query.actionItems.findMany({
    where: eq(actionItems.projectId, project.id),
    with: {
      assignee: true,
    },
    orderBy: [desc(actionItems.deadline)],
  });

  // Fetch meetings linked through action items
  const meetingIds = items
    .map((it) => it.sourceMeetingId)
    .filter((mid): mid is string => Boolean(mid));

  let projectMeetings: any[] = [];
  if (meetingIds.length > 0) {
    projectMeetings = await db.query.meetings.findMany({
      where: inArray(meetings.id, meetingIds),
      with: {
        attendees: true,
      },
      orderBy: [desc(meetings.meetingDate)],
    });
  }

  // Fetch activity logs for this project's action items
  const itemIds = items.map((it) => it.id);
  let projectActivityLogs: any[] = [];
  if (itemIds.length > 0) {
    projectActivityLogs = await db.query.activityLog.findMany({
      where: inArray(activityLog.actionItemId, itemIds),
      with: {
        actor: true,
        actionItem: true,
      },
      orderBy: [desc(activityLog.createdAt)],
      limit: 20,
    });
  }

  const allUsers = await db.query.users.findMany({
    where: eq(users.isActive, true),
  });

  return (
    <ProjectDetailClient
      project={{
        id: project.id,
        name: project.name,
        description: project.description,
        category: project.category,
        status: project.status,
        priority: project.priority,
        startDate: project.startDate,
        targetDate: project.targetDate,
        budgetNotes: project.budgetNotes,
        entityId: project.entityId,
        entityName: project.entity.name,
        entityBrandColor: project.entity.brandPrimaryColor,
        ownerId: project.ownerId,
        ownerName: project.owner.name,
        sponsorId: project.sponsorId,
        sponsorName: project.sponsor?.name,
      }}
      actionItems={items.map((it) => ({
        id: it.id,
        title: it.title,
        assigneeId: it.assigneeId,
        assigneeName: it.assignee.name,
        deadline: it.deadline,
        status: it.status,
        priority: it.priority,
        tag: it.tag,
      }))}
      meetings={projectMeetings.map((m) => ({
        id: m.id,
        subject: m.subject,
        meetingDate: m.meetingDate,
        attendeeCount: m.attendees.length,
      }))}
      activityLogs={projectActivityLogs.map((a) => ({
        id: a.id,
        actorName: a.actor.name,
        actionItemTitle: a.actionItem.title,
        eventType: a.eventType,
        note: a.note,
        createdAt: a.createdAt.toISOString(),
      }))}
      users={allUsers.map((u) => ({ id: u.id, name: u.name }))}
      currentUserId={userId}
    />
  );
}
