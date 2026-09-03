import { auth } from "@/auth";
import { db } from "@/lib/db";
import { actionItems, projects } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { Suspense } from "react";
import { ActionRegisterClient, RegisterItem } from "@/components/action-items/ActionRegisterClient";
import { getUserScopeCached, getActiveEntitiesCached, getActiveUsersCached } from "@/lib/db/cache";

export default async function ActionRegisterPage() {
  const session = await auth();
  const userId = session?.user?.id!;

  const [
    { user: currentUser, allowedEntityIds },
    allEnt,
    allUsers,
    [allItems, allProj],
  ] = await Promise.all([
    getUserScopeCached(userId),
    getActiveEntitiesCached(),
    getActiveUsersCached(),
    Promise.all([
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
      db.query.projects.findMany({
        orderBy: [desc(projects.targetDate)],
      }),
    ]),
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
      createdBy: it.createdBy,
      createdAt: it.createdAt ? it.createdAt.toISOString() : new Date().toISOString(),
    }));

  return (
    <Suspense fallback={null}>
      <ActionRegisterClient
        items={mappedItems}
        entities={scopedEntities}
        projects={scopedProjects}
        users={scopedUsers}
        currentUserId={userId}
        currentUserName={currentUser?.name || "User"}
        userRole={currentUser?.role}
      />
    </Suspense>
  );
}
