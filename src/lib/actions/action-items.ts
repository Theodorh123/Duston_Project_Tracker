"use server";

import { db } from "../db";
import { actionItems, activityLog, comments, users, projects, entities } from "../db/schema";
import { eq, sql, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { sendWhatsApp } from "../services/whatsapp";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getActionItemById(id: string) {
  if (!id || !UUID_REGEX.test(id)) {
    return null;
  }

  try {
    const item = await db.query.actionItems.findFirst({
      where: eq(actionItems.id, id),
      with: {
        project: {
          with: {
            entity: true,
          },
        },
        assignee: true,
        sourceMeeting: true,
        comments: {
          with: {
            user: true,
          },
          orderBy: [desc(comments.createdAt)],
        },
        activityLogs: {
          with: {
            actor: true,
          },
          orderBy: [desc(activityLog.createdAt)],
        },
      },
    });

    if (!item) return null;

    return {
      id: item.id,
      projectId: item.projectId,
      projectName: item.project?.name || "Project",
      entityName: item.project?.entity?.name || "Entity",
      entityBrandColor: item.project?.entity?.brandPrimaryColor || "#023542",
      title: item.title,
      description: item.description,
      assigneeId: item.assigneeId,
      assigneeName: item.assignee?.name || "Assignee",
      deadline: item.deadline,
      status: item.status,
      priority: item.priority,
      tag: item.tag,
      sourceMeetingId: item.sourceMeetingId,
      sourceMeetingSubject: item.sourceMeeting?.subject,
      comments: item.comments?.map((c) => ({
        id: c.id,
        userName: c.user?.name || "User",
        body: c.body,
        createdAt: c.createdAt.toISOString(),
      })),
      activityLogs: item.activityLogs?.map((a) => ({
        id: a.id,
        actorName: a.actor?.name || "Team Member",
        eventType: a.eventType,
        fromValue: a.fromValue,
        toValue: a.toValue,
        note: a.note,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  } catch (err) {
    console.error("getActionItemById error:", err);
    return null;
  }
}

export async function updateActionItemField(
  id: string,
  field: string,
  value: any,
  actorId?: string
) {
  if (!id || !UUID_REGEX.test(id)) {
    return { success: false, error: "Invalid ID" };
  }

  try {
    const current = await db.query.actionItems.findFirst({
      where: eq(actionItems.id, id),
    });
    if (!current) return { success: false, error: "Not found" };

    const updateData: any = {
      [field]: value,
      updatedAt: new Date(),
    };

    if (field === "status" && value === "done") {
      updateData.completedAt = new Date();
    }

    await db.update(actionItems).set(updateData).where(eq(actionItems.id, id));

    // Ensure actorId is a valid user in the database or fallback to current.assigneeId
    const safeActorId =
      actorId && UUID_REGEX.test(actorId) && actorId !== "00000000-0000-0000-0000-000000000000"
        ? actorId
        : current.assigneeId;

    // Log activity
    await db.insert(activityLog).values({
      actionItemId: id,
      actorId: safeActorId,
      eventType: field === "status" ? "status_change" : field === "assigneeId" ? "reassign" : "status_change",
      fromValue: String((current as any)[field] ?? ""),
      toValue: String(value),
      note: `Updated ${field} to ${value}`,
    });

    // WhatsApp nudge / notification if status changed to blocked
    if (field === "status" && value === "blocked") {
      await sendWhatsApp(
        current.assigneeId,
        `Attention: Action item "${current.title}" is marked BLOCKED.`,
        id
      );
    }

    revalidatePath("/");
    revalidatePath("/projects");
    revalidatePath("/ea-view");
    revalidatePath("/ceo-view");

    return { success: true };
  } catch (err: any) {
    console.error("updateActionItemField error:", err);
    return { success: false, error: err.message };
  }
}

export async function createActionItem(data: {
  projectId: string;
  title: string;
  description?: string;
  assigneeId: string;
  deadline: string;
  status?: "not_started" | "in_progress" | "blocked" | "done" | "postponed";
  priority: "low" | "medium" | "high" | "critical";
  tag?: string;
  createdBy: string;
  sourceMeetingId?: string;
}) {
  try {
    const [newItem] = await db
      .insert(actionItems)
      .values({
        projectId: data.projectId,
        title: data.title,
        description: data.description,
        assigneeId: data.assigneeId,
        deadline: data.deadline,
        status: data.status || "not_started",
        priority: data.priority,
        tag: data.tag,
        createdBy: data.createdBy,
        sourceMeetingId: data.sourceMeetingId,
      })
      .returning();

    // Log activity
    await db.insert(activityLog).values({
      actionItemId: newItem.id,
      actorId: data.createdBy,
      eventType: "created",
      note: "Created new action item",
    });

    // Trigger WhatsApp notification log
    await sendWhatsApp(
      data.assigneeId,
      `New action item assigned: "${data.title}" due on ${data.deadline}.`,
      newItem.id
    );

    revalidatePath("/");
    revalidatePath("/projects");
    revalidatePath(`/projects/${data.projectId}`);
    return { success: true, item: newItem };
  } catch (err: any) {
    console.error("createActionItem error:", err);
    return { success: false, error: err.message };
  }
}
