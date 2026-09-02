import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  meetings,
  entities,
  users,
  meetingAttendees,
  actionItems,
  userEntityAccess,
  userPreferences,
} from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { MeetingsClient, MeetingListItem } from "@/components/meetings/MeetingsClient";

export default async function MeetingsPage() {
  const session = await auth();
  const userId = session?.user?.id!;

  // Fetch data in parallel
  const [currentUser, preferences, allEnt, grants, allMeetings, allUsers] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, userId) }),
    db.query.userPreferences.findFirst({ where: eq(userPreferences.userId, userId) }),
    db.query.entities.findMany({ where: eq(entities.isActive, true) }),
    db.query.userEntityAccess.findMany({ where: eq(userEntityAccess.userId, userId) }),
    db.query.meetings.findMany({
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
    }),
    db.query.users.findMany({
      where: eq(users.isActive, true),
    }),
  ]);

  // Entity scoping
  const allowedEntityIds = currentUser?.hasGlobalAccess
    ? allEnt.map((e) => e.id)
    : grants.map((g) => g.entityId);

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

  const scopedEntities = allEnt
    .filter((e) => allowedEntityIds.includes(e.id))
    .map((e) => ({ id: e.id, name: e.name }));

  return (
    <MeetingsClient
      meetings={scopedMeetings}
      entities={scopedEntities}
      users={allUsers.map((u) => ({ id: u.id, name: u.name }))}
      currentUserId={userId}
      initialFeedUrl={preferences?.calendarFeedUrl}
      lastSyncedAt={preferences?.calendarLastSyncedAt?.toISOString()}
    />
  );
}
