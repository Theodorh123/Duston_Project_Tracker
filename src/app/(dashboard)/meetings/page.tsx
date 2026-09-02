import { auth } from "@/auth";
import { db } from "@/lib/db";
import { meetings, entities, users, meetingAttendees, actionItems, userEntityAccess } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { MeetingsClient, MeetingListItem } from "@/components/meetings/MeetingsClient";

export default async function MeetingsPage() {
  const session = await auth();
  const userId = session?.user?.id!;

  const currentUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  // Entity scoping
  let allowedEntityIds: string[] = [];
  if (currentUser?.hasGlobalAccess) {
    const allEnt = await db.query.entities.findMany({ where: eq(entities.isActive, true) });
    allowedEntityIds = allEnt.map((e) => e.id);
  } else {
    const grants = await db.query.userEntityAccess.findMany({
      where: eq(userEntityAccess.userId, userId),
    });
    allowedEntityIds = grants.map((g) => g.entityId);
  }

  const allMeetings = await db.query.meetings.findMany({
    with: {
      entity: true,
      attendees: {
        with: {
          user: true,
        },
      },
      actionItems: true,
    },
    orderBy: [desc(meetings.meetingDate)],
  });

  const scopedMeetings: MeetingListItem[] = allMeetings
    .filter((m) => allowedEntityIds.includes(m.entityId))
    .map((m) => ({
      id: m.id,
      subject: m.subject,
      entityId: m.entityId,
      entityName: m.entity.name,
      entityBrandColor: m.entity.brandPrimaryColor,
      meetingDate: m.meetingDate,
      venue: m.venue,
      isVirtual: m.isVirtual,
      minutesDocUrl: m.minutesDocUrl,
      attendees: m.attendees.map((a) => ({
        id: a.user.id,
        name: a.user.name,
      })),
      actionItemsProducedCount: m.actionItems.length,
    }));

  const allEntities = await db.query.entities.findMany({
    where: eq(entities.isActive, true),
  });
  const scopedEntities = allEntities
    .filter((e) => allowedEntityIds.includes(e.id))
    .map((e) => ({ id: e.id, name: e.name }));

  const allUsers = await db.query.users.findMany({
    where: eq(users.isActive, true),
  });

  return (
    <MeetingsClient
      meetings={scopedMeetings}
      entities={scopedEntities}
      users={allUsers.map((u) => ({ id: u.id, name: u.name }))}
      currentUserId={userId}
    />
  );
}
