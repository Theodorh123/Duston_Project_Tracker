import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserScopeCached, getActiveEntitiesCached } from "@/lib/db/cache";
import { AppShell } from "@/components/layout/AppShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const { user: userRecord, allowedEntityIds } = await getUserScopeCached(userId);

  if (!userRecord) {
    redirect("/login");
  }

  const allEntities = await getActiveEntitiesCached();
  const accessibleEntities = allEntities
    .filter((e) => allowedEntityIds.includes(e.id))
    .map((e) => ({
      id: e.id,
      name: e.name,
      slug: e.slug,
      brandPrimaryColor: e.brandPrimaryColor,
    }));

  return (
    <AppShell
      user={{
        id: userRecord.id,
        name: userRecord.name,
        email: userRecord.email,
        role: userRecord.role,
        jobTitle: userRecord.jobTitle,
        avatarUrl: userRecord.avatarUrl,
      }}
      entities={accessibleEntities}
    >
      {children}
    </AppShell>
  );
}
