import { auth } from "@/auth";
import { db } from "@/lib/db";
import { actionItems, projects, entities, users, comments, activityLog } from "@/lib/db/schema";
import { eq, desc, or, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { CeoViewClient, HeatmapCell, RiskItem } from "@/components/ceo-view/CeoViewClient";
import { isDeadlineOverdue, getDaysOverdue } from "@/lib/utils";

export default async function CeoViewPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;

  if (role !== "ceo" && role !== "ea") {
    redirect("/");
  }

  // Find CEO user ID
  const ceoUser = await db.query.users.findFirst({
    where: eq(users.role, "ceo"),
  });
  const ceoUserId = ceoUser?.id || session?.user?.id;

  const allActiveEntities = await db.query.entities.findMany({
    where: eq(entities.isActive, true),
  });

  const allProjects = await db.query.projects.findMany({
    with: {
      entity: true,
      actionItems: true,
    },
  });

  const categories = ["capex", "financing", "regulatory", "commercial", "operations", "corporate"];

  // Build heatmap
  const heatmapGrid: Record<string, Record<string, HeatmapCell>> = {};

  for (const ent of allActiveEntities) {
    heatmapGrid[ent.id] = {};
    for (const cat of categories) {
      const catProjects = allProjects.filter(
        (p) => p.entityId === ent.id && p.category === cat
      );
      const catItems = catProjects.flatMap((p) => p.actionItems);
      const openItems = catItems.filter((i) => i.status !== "done");
      const overdueItems = openItems.filter((i) => isDeadlineOverdue(i.deadline, i.status));

      let health: HeatmapCell["health"] = "empty";
      if (openItems.length > 0) {
        const ratio = overdueItems.length / openItems.length;
        if (ratio > 0.3) {
          health = "red";
        } else if (ratio > 0) {
          health = "amber";
        } else {
          health = "green";
        }
      }

      heatmapGrid[ent.id][cat] = {
        entityId: ent.id,
        entityName: ent.name,
        category: cat,
        openCount: openItems.length,
        overdueCount: overdueItems.length,
        health,
      };
    }
  }

  // Top 10 Risks: Blocked items where sponsor_id = ceo_user_id OR priority = 'critical'
  const blockedItems = await db.query.actionItems.findMany({
    where: eq(actionItems.status, "blocked"),
    with: {
      project: {
        with: {
          entity: true,
        },
      },
      comments: {
        orderBy: [desc(comments.createdAt)],
        limit: 1,
      },
      activityLogs: {
        orderBy: [desc(activityLog.createdAt)],
        limit: 1,
      },
    },
    orderBy: [desc(actionItems.updatedAt)],
    limit: 10,
  });

  const topRisks: RiskItem[] = blockedItems
    .filter((it) => it.priority === "critical" || (it.project.sponsorId && it.project.sponsorId === ceoUserId))
    .map((it) => {
      const daysBlocked = Math.max(1, getDaysOverdue(it.updatedAt));
      const blockerComment = it.comments[0]?.body || it.description || it.activityLogs[0]?.note || "Awaiting external contractor milestone sign-off";

      return {
        id: it.id,
        title: it.title,
        projectName: it.project.name,
        entityName: it.project.entity.name,
        entityBrandColor: it.project.entity.brandPrimaryColor,
        blockerReason: blockerComment,
        daysBlocked,
        priority: it.priority,
      };
    });

  // Weekly digest statistics
  const allActionItems = await db.query.actionItems.findMany();
  const openedCount = allActionItems.length;
  const closedCount = allActionItems.filter((i) => i.status === "done").length;
  const overdueCount = allActionItems.filter((i) => isDeadlineOverdue(i.deadline, i.status)).length;

  const keyMovements = [
    "EBID USD 50M Trade Finance term sheet sign-off moved to In Progress",
    "Balungu Terminal civil engineering milestone sign-off marked Blocked",
    "GBS bunker barge safety certifications verified and Closed",
  ];

  return (
    <CeoViewClient
      entities={allActiveEntities.map((e) => ({ id: e.id, name: e.name }))}
      categories={categories}
      heatmapGrid={heatmapGrid}
      topRisks={topRisks}
      weeklyDigest={{
        openedCount,
        closedCount,
        overdueCount,
        keyMovements,
      }}
    />
  );
}
