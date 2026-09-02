import { auth } from "@/auth";
import { db } from "@/lib/db";
import { actionItems, entities, users, projects, userEntityAccess } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { ActionRegisterClient, RegisterItem } from "@/components/action-items/ActionRegisterClient";

export default async function ActionRegisterPage() {
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

  // Fetch all action items with relations
  const [allItems, allEnt, allProj, allUsers] = await Promise.all([
    db.query.actionItems.findMany({
      with: {
        project: {
          with: {
            entity: true,
          },
        },
        assignee: true,
        sourceMeeting: true,
      },
      orderBy: [actionItems.deadline],
    }),
    db.query.entities.findMany({
      where: eq(entities.isActive, true),
      orderBy: [entities.name],
    }),
    db.query.projects.findMany({
      orderBy: [desc(projects.targetDate)],
    }),
    db.query.users.findMany({
      where: eq(users.isActive, true),
      orderBy: [users.name],
    }),
  ]);

  const scopedEntities = allEnt
    .filter((e) => allowedEntityIds.includes(e.id))
    .map((e) => ({ id: e.id, name: e.name }));

  const scopedProjects = allProj
    .filter((p) => allowedEntityIds.includes(p.entityId))
    .map((p) => ({ id: p.id, name: p.name, entityId: p.entityId }));

  const scopedUsers = allUsers.map((u) => ({ id: u.id, name: u.name }));

  const mappedItems: RegisterItem[] = allItems
    .filter((it) => it.project && allowedEntityIds.includes(it.project.entityId))
    .map((it) => ({
      id: it.id,
      title: it.title,
      description: it.description,
      deadline: it.deadline,
      status: it.status as any,
      priority: it.priority as any,
      tag: it.tag,
      assigneeId: it.assigneeId,
      assigneeName: it.assignee?.name || "Unassigned",
      projectId: it.projectId,
      projectName: it.project?.name || "Project",
      entityId: it.project?.entityId,
      entityName: it.project?.entity?.name || "Subsidiary",
      entityBrandColor: it.project?.entity?.brandPrimaryColor || "#023542",
      sourceMeetingId: it.sourceMeetingId,
      sourceMeetingSubject: it.sourceMeeting?.subject,
      createdAt: it.createdAt ? it.createdAt.toISOString() : new Date().toISOString(),
    }));

  return (
    <ActionRegisterClient
      items={mappedItems}
      entities={scopedEntities}
      projects={scopedProjects}
      users={scopedUsers}
      currentUserId={userId}
      currentUserName={currentUser?.name || "User"}
      userRole={currentUser?.role}
    />
  );
}
