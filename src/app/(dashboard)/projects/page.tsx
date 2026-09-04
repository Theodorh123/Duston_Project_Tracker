import { auth } from "@/auth";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { ProjectsClient, ProjectListItem } from "@/components/projects/ProjectsClient";
import { getUserScopeCached, getActiveEntitiesCached, getActiveUsersCached } from "@/lib/db/cache";

export default async function ProjectsPage() {
  const session = await auth();
  const userId = session?.user?.id!;

  const [
    { allowedEntityIds },
    allEntities,
    allUsers,
    allProjects,
  ] = await Promise.all([
    getUserScopeCached(userId),
    getActiveEntitiesCached(),
    getActiveUsersCached(),
    db.query.projects.findMany({
      with: {
        entity: true,
        owner: true,
        actionItems: true,
      },
      orderBy: [desc(projects.targetDate)],
    }),
  ]);

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
      ownerName: p.owner?.name ?? null,
      status: p.status,
      priority: p.priority,
      targetDate: p.targetDate,
      comments: p.description || null,
      openItemsCount: p.actionItems.filter((it) => it.status !== "done").length,
    }));

  const scopedEntities = allEntities
    .filter((e) => allowedEntityIds.includes(e.id))
    .map((e) => ({ id: e.id, name: e.name }));

  return (
    <ProjectsClient
      projects={scopedProjects}
      entities={scopedEntities}
      users={allUsers.map((u) => ({ id: u.id, name: u.name }))}
      currentUserId={userId}
    />
  );
}
