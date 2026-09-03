import { auth } from "@/auth";
import { db } from "@/lib/db";
import { meetings, actionItems } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { MeetingDetailClient } from "@/components/meetings/MeetingDetailClient";
import { getUserScopeCached } from "@/lib/db/cache";

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
    meeting,
  ] = await Promise.all([
    getUserScopeCached(userId),
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
      actionItems={meeting.actionItems.map((it) => ({
        id: it.id,
        title: it.title,
        projectName: it.project.name,
        assigneeName: it.assignee.name,
        deadline: it.deadline,
        status: it.status,
        priority: it.priority,
      }))}
    />
  );
}
