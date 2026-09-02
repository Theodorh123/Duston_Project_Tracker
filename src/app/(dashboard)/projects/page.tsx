import { auth } from "@/auth";
import { db } from "@/lib/db";
import { projects, entities, users, actionItems, userEntityAccess } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { ProjectsClient, ProjectListItem } from "@/components/projects/ProjectsClient";

export default async function ProjectsPage() {
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

  // Query projects with relations
  const allProjects = await db.query.projects.findMany({
    with: {
      entity: true,
      owner: true,
      actionItems: true,
    },
    orderBy: [desc(projects.targetDate)],
  });

  const scopedProjects: ProjectListItem[] = allProjects
    .filter((p) => allowedEntityIds.includes(p.entityId))
    .map((p) => ({
      id: p.id,
      name: p.name,
      entityId: p.entityId,
      entityName: p.entity.name,
      entityBrandColor: p.entity.brandPrimaryColor,
      category: p.category,
      ownerId: p.ownerId,
      ownerName: p.owner.name,
      status: p.status,
      priority: p.priority,
      targetDate: p.targetDate,
      comments: p.description || null,
      openItemsCount: p.actionItems.filter((it) => it.status !== "done").length,
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
    <ProjectsClient
      projects={scopedProjects}
      entities={scopedEntities}
      users={allUsers.map((u) => ({ id: u.id, name: u.name }))}
      currentUserId={userId}
    />
  );
}
