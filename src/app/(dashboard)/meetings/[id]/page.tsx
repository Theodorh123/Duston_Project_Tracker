import { auth } from "@/auth";
import { db } from "@/lib/db";
import { meetings, actionItems } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { MeetingDetailClient } from "@/components/meetings/MeetingDetailClient";
import { getUserScopeCached, getActiveUsersCached } from "@/lib/db/cache";

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id!;
  const { id } = await params;

  const [
    { allowedEntityIds },
    allUsers,
    meeting,
  ] = await Promise.all([
    getUserScopeCached(userId),
    getActiveUsersCached(),
    db.query.meetings.findFirst({
      where: eq(meetings.id, id),
      with: {
        entity: true,
        attendees: {
          with: {
            user: true,
          },
        },
        actionItems: {
          with: {
            project: true,
            assignee: true,
            comments: true,
          },
          orderBy: [desc(actionItems.deadline)],
        },
      },
    }),
  ]);

  if (!meeting) {
    notFound();
  }

  // Scoping check
  if (!allowedEntityIds.includes(meeting.entityId)) {
    redirect("/meetings");
  }

  const userMap = new Map(allUsers.map((u) => [u.id, u.name]));

  return (
    <MeetingDetailClient
      meeting={{
        id: meeting.id,
        subject: meeting.subject,
        meetingDate: meeting.meetingDate,
        venue: meeting.venue,
        isVirtual: meeting.isVirtual,
        minutesDocUrl: meeting.minutesDocUrl,
        entityName: meeting.entity.name,
        entityBrandColor: meeting.entity.brandPrimaryColor,
        attendees: meeting.attendees.map((a) => ({
          id: a.user.id,
          name: a.user.name,
          email: a.user.email,
        })),
      }}
      actionItems={meeting.actionItems.map((it) => {
        const secIds = Array.isArray(it.secondaryAssigneeIds)
          ? (it.secondaryAssigneeIds as string[])
          : [];
        const secNames = secIds.map((uid) => userMap.get(uid)).filter(Boolean) as string[];
        return {
          id: it.id,
          title: it.title,
          projectName: it.project.name,
          assigneeName: it.assignee.name,
          secondaryAssigneeNames: secNames,
          deadline: it.deadline,
          status: it.status,
          priority: it.priority,
          commentCount: it.comments?.length ?? 0,
        };
      })}
    />
  );
}
