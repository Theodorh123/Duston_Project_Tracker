import { auth } from "@/auth";
import { db } from "@/lib/db";
import { projects, actionItems, meetings, activityLog } from "@/lib/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { ProjectDetailClient } from "@/components/projects/ProjectDetailClient";
import { getUserScopeCached, getActiveUsersCached } from "@/lib/db/cache";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id!;
  const { id } = await params;

  // Run user scope, active users, and project lookup in parallel
  const [
    { allowedEntityIds },
    allUsers,
    project,
    items,
  ] = await Promise.all([
    getUserScopeCached(userId),
    getActiveUsersCached(),
    db.query.projects.findFirst({
      where: eq(projects.id, id),
      with: {
        entity: true,
        owner: true,
        sponsor: true,
      },
    }),
    db.query.actionItems.findMany({
      where: eq(actionItems.projectId, id),
      with: {
        assignee: true,
      },
      orderBy: [desc(actionItems.deadline)],
    }),
  ]);

  if (!project) {
    notFound();
  }

  // Scoping check
  if (!allowedEntityIds.includes(project.entityId)) {
    redirect("/projects");
  }

  // Fetch meetings and activity logs concurrently based on items
  const meetingIds = items
    .map((it) => it.sourceMeetingId)
    .filter((mid): mid is string => Boolean(mid));
  const itemIds = items.map((it) => it.id);

  const [projectMeetings, projectActivityLogs] = await Promise.all([
    meetingIds.length > 0
      ? db.query.meetings.findMany({
          where: inArray(meetings.id, meetingIds),
          with: {
            attendees: true,
          },
          orderBy: [desc(meetings.meetingDate)],
        })
      : Promise.resolve([]),
    itemIds.length > 0
      ? db.query.activityLog.findMany({
          where: inArray(activityLog.actionItemId, itemIds),
          with: {
            actor: true,
            actionItem: true,
          },
          orderBy: [desc(activityLog.createdAt)],
          limit: 20,
        })
      : Promise.resolve([]),
  ]);

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
        ownerName: project.owner?.name ?? null,
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
        comments: it.description || null,
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
