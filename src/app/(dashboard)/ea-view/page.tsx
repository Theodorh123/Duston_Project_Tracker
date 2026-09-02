import { auth } from "@/auth";
import { db } from "@/lib/db";
import { actionItems, meetings, entities, users, projects, userEntityAccess } from "@/lib/db/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { redirect } from "next/navigation";
import { EaViewClient, QueueItem, EntitySummaryCard, UpcomingMeetingWithPrep } from "@/components/ea-view/EaViewClient";
import { addDays, format, subHours, parseISO } from "date-fns";
import { getDaysOverdue, getPriorityWeight, isDeadlineOverdue } from "@/lib/utils";

export default async function EaViewPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;

  if (role !== "ea" && role !== "ceo") {
    redirect("/");
  }

  const allActiveEntities = await db.query.entities.findMany({
    where: eq(entities.isActive, true),
  });

  const allItems = await db.query.actionItems.findMany({
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

  // 1. Overdue queue sorted by (days overdue * priority weight)
  const overdueList: QueueItem[] = allItems
    .filter((it) => isDeadlineOverdue(it.deadline, it.status))
    .map((it) => {
      const days = getDaysOverdue(it.deadline);
      const weight = getPriorityWeight(it.priority);
      return {
        id: it.id,
        title: it.title,
        projectId: it.projectId,
        projectName: it.project.name,
        entityId: it.project.entityId,
        entityName: it.project.entity.name,
        entityBrandColor: it.project.entity.brandPrimaryColor,
        assigneeId: it.assigneeId,
        assigneeName: it.assignee.name,
        assigneePhone: it.assignee.phoneE164,
        deadline: it.deadline,
        priority: it.priority,
        status: it.status,
        daysOverdue: days,
        score: days * weight,
        updatedAt: it.updatedAt.toISOString(),
      };
    })
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  // 2. Chase-up queue: items due within 7 days where updatedAt is more than 48 hours ago
  const threshold48HoursAgo = subHours(new Date(), 48);
  const chaseUpList: QueueItem[] = allItems
    .filter((it) => {
      if (it.status === "done" || isDeadlineOverdue(it.deadline, it.status)) return false;
      const d = parseISO(it.deadline);
      const diffDays = (d.getTime() - new Date().getTime()) / (1000 * 3600 * 24);
      const isDueWithin7Days = diffDays >= 0 && diffDays <= 7;
      const isStagnant = new Date(it.updatedAt).getTime() < threshold48HoursAgo.getTime();
      return isDueWithin7Days && isStagnant;
    })
    .map((it) => ({
      id: it.id,
      title: it.title,
      projectId: it.projectId,
      projectName: it.project.name,
      entityId: it.project.entityId,
      entityName: it.project.entity.name,
      entityBrandColor: it.project.entity.brandPrimaryColor,
      assigneeId: it.assigneeId,
      assigneeName: it.assignee.name,
      assigneePhone: it.assignee.phoneE164,
      deadline: it.deadline,
      priority: it.priority,
      status: it.status,
      updatedAt: it.updatedAt.toISOString(),
    }));

  // 3. By entity summary cards
  const entitySummaries: EntitySummaryCard[] = allActiveEntities.map((ent) => {
    const entItems = allItems.filter((i) => i.project.entityId === ent.id);
    return {
      id: ent.id,
      name: ent.name,
      brandPrimaryColor: ent.brandPrimaryColor,
      openCount: entItems.filter((i) => i.status !== "done").length,
      inProgressCount: entItems.filter((i) => i.status === "in_progress").length,
      blockedCount: entItems.filter((i) => i.status === "blocked").length,
      overdueCount: entItems.filter((i) => isDeadlineOverdue(i.deadline, i.status)).length,
    };
  });

  // 4. Upcoming meetings next 14 days
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const next14DaysStr = format(addDays(new Date(), 14), "yyyy-MM-dd");

  const meetingsNext14 = await db.query.meetings.findMany({
    where: and(
      gte(meetings.meetingDate, todayStr),
      lte(meetings.meetingDate, next14DaysStr)
    ),
    with: {
      entity: true,
      attendees: {
        with: {
          user: true,
        },
      },
    },
    orderBy: [meetings.meetingDate],
  });

  const upcomingMeetingsWithPrep: UpcomingMeetingWithPrep[] = meetingsNext14.map((m) => ({
    id: m.id,
    subject: m.subject,
    meetingDate: m.meetingDate,
    entityName: m.entity.name,
    attendees: m.attendees.map((att) => {
      const attendeeOpenItems = allItems
        .filter((it) => it.assigneeId === att.user.id && it.status !== "done")
        .map((it) => ({
          id: it.id,
          title: it.title,
          deadline: it.deadline,
        }));

      return {
        id: att.user.id,
        name: att.user.name,
        openActionItems: attendeeOpenItems,
      };
    }),
  }));

  return (
    <EaViewClient
      overdueQueue={overdueList}
      chaseUpQueue={chaseUpList}
      entitySummaries={entitySummaries}
      upcomingMeetings={upcomingMeetingsWithPrep}
      entities={allActiveEntities.map((e) => ({ id: e.id, name: e.name }))}
    />
  );
}
