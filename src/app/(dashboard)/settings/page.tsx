import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users, userPreferences, entities } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { SettingsClient } from "@/components/settings/SettingsClient";

export default async function SettingsPage() {
  const session = await auth();
  const userId = session?.user?.id!;

  const [user, preferences, allEntities] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, userId),
    }),
    db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, userId),
    }),
    db.query.entities.findMany({
      where: eq(entities.isActive, true),
    }),
  ]);

  return (
    <SettingsClient
      user={{
        id: user?.id || userId,
        name: user?.name || "User",
        email: user?.email || "",
        role: user?.role || (session?.user as any)?.role || "contributor",
        phoneE164: user?.phoneE164,
        avatarUrl: user?.avatarUrl,
      }}
      preferences={{
        defaultView: preferences?.defaultView || "todo",
        kanbanColumns: preferences?.kanbanColumns || ["Backlog", "This Week", "In Progress", "Blocked", "Done"],
        whatsappEnabled: preferences?.whatsappEnabled ?? true,
        digestFrequency: preferences?.digestFrequency || "daily",
        timezone: preferences?.timezone || "Africa/Accra",
        calendarFeedUrl: preferences?.calendarFeedUrl,
        calendarLastSyncedAt: preferences?.calendarLastSyncedAt?.toISOString(),
      }}
      entities={allEntities.map((e) => ({ id: e.id, name: e.name }))}
    />
  );
}
