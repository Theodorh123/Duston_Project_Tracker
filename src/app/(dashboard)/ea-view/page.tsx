import { auth } from "@/auth";
import { db } from "@/lib/db";
import { actionItems, entities, users, projects, userEntityAccess } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { EaViewClient, QueueItem, EntitySummaryCard } from "@/components/ea-view/EaViewClient";
import { subHours, parseISO } from "date-fns";
import { getDaysOverdue, getPriorityWeight, isDeadlineOverdue } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EaViewPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;

  if (role !== "ea") {
    redirect("/");
  }

  const allActiveEntities = await db.query.entities.findMany({
    where: eq(entities.isActive, true),
  });

  const allItems = await db.query.actionItems.findMany({
    with: {
      project: {
        with: {
          entity: true,
        },
      },
      entity: true,
      assignee: true,
    },
    orderBy: [desc(actionItems.deadline)],
  });

  const entityNameMap = new Map(allActiveEntities.map((e) => [e.id, e.name]));
  const entityColorMap = new Map(allActiveEntities.map((e) => [e.id, e.brandPrimaryColor]));

  // 1. Overdue queue sorted by (days overdue * priority weight)
  const overdueList: QueueItem[] = allItems
    .filter((it) => isDeadlineOverdue(it.deadline, it.status))
    .map((it) => {
      const days = getDaysOverdue(it.deadline);
      const weight = getPriorityWeight(it.priority);
      const itemEntityId = it.entityId || it.project?.entityId || "";
      const itemEntityName = it.entity?.name || it.project?.entity?.name || entityNameMap.get(itemEntityId) || "Subsidiary";
      const itemBrandColor = it.entity?.brandPrimaryColor || it.project?.entity?.brandPrimaryColor || entityColorMap.get(itemEntityId) || "#023542";

      return {
        id: it.id,
        title: it.title,
        projectId: it.projectId || null,
        projectName: it.project?.name || null,
        entityId: itemEntityId,
        entityName: itemEntityName,
        entityBrandColor: itemBrandColor,
        assigneeId: it.assigneeId,
        assigneeName: it.assignee?.name || "Unassigned",
        assigneePhone: it.assignee?.phoneE164,
        deadline: it.deadline,
        priority: it.priority,
        status: it.status,
        daysOverdue: days,
        score: days * weight,
        updatedAt: it.updatedAt.toISOString(),
      };
    })
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  // 2. Chase-up queue: items due within 7 days where updatedAt is more than 48 hours ago
  const threshold48HoursAgo = subHours(new Date(), 48);
  const chaseUpList: QueueItem[] = allItems
    .filter((it) => {
      if (it.status === "done" || isDeadlineOverdue(it.deadline, it.status)) return false;
      const d = parseISO(it.deadline);
      const diffDays = (d.getTime() - new Date().getTime()) / (1000 * 3600 * 24);
      const isDueWithin7Days = diffDays >= 0 && diffDays <= 7;
      const isStagnant = new Date(it.updatedAt).getTime() < threshold48HoursAgo.getTime();
      return isDueWithin7Days && isStagnant;
    })
    .map((it) => {
      const itemEntityId = it.entityId || it.project?.entityId || "";
      const itemEntityName = it.entity?.name || it.project?.entity?.name || entityNameMap.get(itemEntityId) || "Subsidiary";
      const itemBrandColor = it.entity?.brandPrimaryColor || it.project?.entity?.brandPrimaryColor || entityColorMap.get(itemEntityId) || "#023542";

      return {
        id: it.id,
        title: it.title,
        projectId: it.projectId || null,
        projectName: it.project?.name || null,
        entityId: itemEntityId,
        entityName: itemEntityName,
        entityBrandColor: itemBrandColor,
        assigneeId: it.assigneeId,
        assigneeName: it.assignee?.name || "Unassigned",
        assigneePhone: it.assignee?.phoneE164,
        deadline: it.deadline,
        priority: it.priority,
        status: it.status,
        updatedAt: it.updatedAt.toISOString(),
      };
    });

  // 3. By entity summary cards
  const entitySummaries: EntitySummaryCard[] = allActiveEntities.map((ent) => {
    const entItems = allItems.filter((i) => (i.entityId || i.project?.entityId) === ent.id);
    return {
      id: ent.id,
      name: ent.name,
      brandPrimaryColor: ent.brandPrimaryColor,
      openCount: entItems.filter((i) => i.status !== "done").length,
      inProgressCount: entItems.filter((i) => i.status === "in_progress").length,
      completedCount: entItems.filter((i) => i.status === "done").length,
      overdueCount: entItems.filter((i) => isDeadlineOverdue(i.deadline, i.status)).length,
    };
  });

  return (
    <EaViewClient
      overdueQueue={overdueList}
      chaseUpQueue={chaseUpList}
      entitySummaries={entitySummaries}
      entities={allActiveEntities.map((e) => ({ id: e.id, name: e.name }))}
    />
  );
}
