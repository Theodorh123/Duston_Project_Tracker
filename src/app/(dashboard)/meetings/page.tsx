import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  meetings,
  userPreferences,
  projects,
} from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { MeetingsClient, MeetingListItem } from "@/components/meetings/MeetingsClient";
import { getUserScopeCached, getActiveEntitiesCached, getActiveUsersCached } from "@/lib/db/cache";

export default async function MeetingsPage() {
  const session = await auth();
  const userId = session?.user?.id!;

  // Fetch cached references + page data in parallel
  const [
    { allowedEntityIds },
    allEnt,
    allUsers,
    [preferences, allMeetings, allProjects],
  ] = await Promise.all([
    getUserScopeCached(userId),
    getActiveEntitiesCached(),
    getActiveUsersCached(),
    Promise.all([
      db.query.userPreferences.findFirst({ where: eq(userPreferences.userId, userId) }),
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
      db.query.projects.findMany({
        with: {
          entity: true,
        },
      }),
    ]),
  ]);

  const scopedProjects = allProjects
    .filter((p) => allowedEntityIds.includes(p.entityId))
    .map((p) => ({
      id: p.id,
      name: p.name,
      entityId: p.entityId,
      entityName: p.entity.name,
    }));

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
      projects={scopedProjects}
      users={allUsers.map((u) => ({ id: u.id, name: u.name }))}
      currentUserId={userId}
    />
  );
}
