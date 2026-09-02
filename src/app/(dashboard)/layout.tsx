import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { entities, userEntityAccess, users } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
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
  const userRecord = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!userRecord) {
    redirect("/login");
  }

  // Determine accessible entities based on user scope
  let accessibleEntities: Array<{
    id: string;
    name: string;
    slug: string;
    brandPrimaryColor: string;
  }> = [];

  if (userRecord.hasGlobalAccess) {
    // Global access users see all active entities
    const allEntities = await db.query.entities.findMany({
      where: eq(entities.isActive, true),
    });
    accessibleEntities = allEntities.map((e) => ({
      id: e.id,
      name: e.name,
      slug: e.slug,
      brandPrimaryColor: e.brandPrimaryColor,
    }));
  } else {
    // Restricted access users (e.g. Test MD) see only entities granted in user_entity_access
    const grants = await db.query.userEntityAccess.findMany({
      where: eq(userEntityAccess.userId, userId),
      with: {
        entity: true,
      },
    });
    accessibleEntities = grants
      .filter((g) => g.entity && g.entity.isActive)
      .map((g) => ({
        id: g.entity.id,
        name: g.entity.name,
        slug: g.entity.slug,
        brandPrimaryColor: g.entity.brandPrimaryColor,
      }));
  }

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
