import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users, entities, activityLog, actionItems, projects } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AdminClient, AdminUser, AdminEntity, AdminActivityLog } from "@/components/admin/AdminClient";

export default async function AdminPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;

  if (role !== "admin") {
    redirect("/");
  }

  // 1. Users with their assigned entities
  const allUsers = await db.query.users.findMany({
    with: {
      entityAccess: {
        with: {
          entity: true,
        },
      },
    },
    orderBy: [desc(users.createdAt)],
  });

  const mappedUsers: AdminUser[] = allUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    hasGlobalAccess: u.hasGlobalAccess,
    assignedEntities: (u.entityAccess || [])
      .filter((ea) => ea.entity)
      .map((ea) => ({
        id: ea.entity.id,
        name: ea.entity.name,
        brandPrimaryColor: ea.entity.brandPrimaryColor,
      })),
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
  }));

  // 2. Entities
  const allEntities = await db.query.entities.findMany({
    with: {
      parent: true,
    },
    orderBy: [entities.name],
  });

  const mappedEntities: AdminEntity[] = allEntities.map((e) => ({
    id: e.id,
    name: e.name,
    slug: e.slug,
    parentEntityId: e.parentEntityId,
    parentName: e.parent?.name,
    brandPrimaryColor: e.brandPrimaryColor,
    isActive: e.isActive,
  }));

  // 3. Activity Log (paginated 50)
  const allActivities = await db.query.activityLog.findMany({
    with: {
      actor: true,
      actionItem: {
        with: {
          project: {
            with: {
              entity: true,
            },
          },
        },
      },
    },
    orderBy: [desc(activityLog.createdAt)],
    limit: 50,
  });

  const mappedActivities: AdminActivityLog[] = allActivities.map((a) => ({
    id: a.id,
    actorName: a.actor?.name || "System",
    actionItemTitle: a.actionItem?.title || "Action item",
    entityName: a.actionItem?.project?.entity?.name || "General",
    eventType: a.eventType,
    fromValue: a.fromValue,
    toValue: a.toValue,
    note: a.note,
    createdAt: a.createdAt.toISOString(),
  }));

  return (
    <AdminClient
      initialUsers={mappedUsers}
      initialEntities={mappedEntities}
      initialActivities={mappedActivities}
    />
  );
}
