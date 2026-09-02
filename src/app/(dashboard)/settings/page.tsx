import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users, userPreferences } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { SettingsClient } from "@/components/settings/SettingsClient";

export default async function SettingsPage() {
  const session = await auth();
  const userId = session?.user?.id!;

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  const preferences = await db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, userId),
  });

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
      }}
    />
  );
}
