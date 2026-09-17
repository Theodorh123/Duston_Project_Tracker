"use server";

import { db } from "../db";
import { actionItems, activityLog, comments, users, projects, entities, meetings } from "../db/schema";
import { eq, sql, desc, and, inArray } from "drizzle-orm";
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
        entity: true,
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

    const secIds: string[] = Array.isArray(item.secondaryAssigneeIds)
      ? (item.secondaryAssigneeIds as string[])
      : [];

    let secondaryUsers: Array<{ id: string; name: string }> = [];
    if (secIds.length > 0) {
      secondaryUsers = await db.query.users.findMany({
        where: inArray(users.id, secIds),
        columns: { id: true, name: true },
      });
    }

    const secondaryNames = secondaryUsers.map((u) => u.name);
    const itemEntityId = item.entityId || item.project?.entityId;
    const itemEntityName = item.entity?.name || item.project?.entity?.name || "Subsidiary";
    const itemBrandColor = item.entity?.brandPrimaryColor || item.project?.entity?.brandPrimaryColor || "#023542";

    return {
      id: item.id,
      projectId: item.projectId,
      projectName: item.project?.name || null,
      entityId: itemEntityId,
      entityName: itemEntityName,
      entityBrandColor: itemBrandColor,
      title: item.title,
      description: item.description,
      assigneeId: item.assigneeId,
      assigneeName: item.assignee?.name || "Assignee",
      secondaryAssigneeIds: secIds,
      secondaryAssignees: secondaryUsers,
      secondaryAssigneeNames: secondaryNames,
      deadline: item.deadline,
      status: item.status,
      priority: item.priority,
      tag: item.tag,
      sourceMeetingId: item.sourceMeetingId,
      sourceMeetingSubject: item.sourceMeeting?.subject,
      createdBy: item.createdBy,
      commentCount: item.comments?.length || 0,
      comments: item.comments?.map((c) => {
        const isPrimary = c.userId === item.assigneeId;
        const isSecondary = secIds.includes(c.userId);
        return {
          id: c.id,
          userId: c.userId,
          userName: c.user?.name || "User",
          userRole: isPrimary ? "Lead Owner" : isSecondary ? "Co-Owner" : undefined,
          body: c.body,
          createdAt: c.createdAt.toISOString(),
        };
      }),
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

export interface UpdateActionItemInput {
  title?: string;
  projectId?: string | null;
  entityId?: string;
  assigneeId?: string;
  secondaryAssigneeIds?: string[];
  deadline?: string;
  status?: "not_started" | "in_progress" | "blocked" | "done" | "postponed";
  priority?: "low" | "medium" | "high" | "critical";
  tag?: string | null;
  description?: string | null;
}

import { invalidateMetadataCache } from "../db/cache";
import { TBA_DEADLINE, isTbaDeadline } from "@/lib/utils";

function normalizeDeadline(deadline?: string | null): string {
  if (!deadline || deadline.trim() === "" || isTbaDeadline(deadline)) {
    return TBA_DEADLINE;
  }
  return deadline.trim();
}

function revalidateAllActionItemPaths(projectId?: string) {
  invalidateMetadataCache();
  revalidatePath("/");
  revalidatePath("/action-items");
  revalidatePath("/projects");
  if (projectId) revalidatePath(`/projects/${projectId}`);
  revalidatePath("/meetings");
  revalidatePath("/todos");
  revalidatePath("/admin");
  revalidatePath("/ea-view");
  revalidatePath("/ceo-view");
  revalidatePath("/analytics");
}

export async function updateActionItem(
  id: string,
  data: UpdateActionItemInput,
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
      updatedAt: new Date(),
    };

    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.projectId !== undefined) {
      updateData.projectId = data.projectId && data.projectId.trim() !== "" ? data.projectId : null;
      if (updateData.projectId) {
        const proj = await db.query.projects.findFirst({
          where: eq(projects.id, updateData.projectId),
        });
        if (proj?.entityId) {
          updateData.entityId = proj.entityId;
        }
      }
    }
    if (data.entityId !== undefined) updateData.entityId = data.entityId;
    if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId;
    if (data.secondaryAssigneeIds !== undefined) updateData.secondaryAssigneeIds = data.secondaryAssigneeIds;
    if (data.deadline !== undefined) updateData.deadline = normalizeDeadline(data.deadline);
    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === "done") {
        updateData.completedAt = new Date();
      }
    }
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.tag !== undefined) updateData.tag = data.tag;
    if (data.description !== undefined) updateData.description = data.description;

    const [updated] = await db
      .update(actionItems)
      .set(updateData)
      .where(eq(actionItems.id, id))
      .returning();

    const safeActorId =
      actorId && UUID_REGEX.test(actorId) && actorId !== "00000000-0000-0000-0000-000000000000"
        ? actorId
        : current.assigneeId;

    await db.insert(activityLog).values({
      actionItemId: id,
      actorId: safeActorId,
      eventType: data.status && data.status !== current.status ? "status_change" : "status_change",
      note: "Updated action item details",
    });

    if (data.status === "blocked" && current.status !== "blocked") {
      await sendWhatsApp(
        updated.assigneeId,
        `Attention: Action item "${updated.title}" is marked BLOCKED.`,
        id
      );
    }

    revalidateAllActionItemPaths(updated.projectId || undefined);

    return { success: true, item: updated };
  } catch (err: any) {
    console.error("updateActionItem error:", err);
    return { success: false, error: err.message };
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

    const finalValue =
      field === "deadline"
        ? normalizeDeadline(value)
        : field === "projectId" && (!value || value === "")
        ? null
        : value;

    const updateData: any = {
      [field]: finalValue,
      updatedAt: new Date(),
    };

    if (field === "status" && value === "done") {
      updateData.completedAt = new Date();
    }

    if (field === "projectId" && finalValue) {
      const proj = await db.query.projects.findFirst({
        where: eq(projects.id, finalValue),
      });
      if (proj?.entityId) {
        updateData.entityId = proj.entityId;
      }
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
      eventType: field === "status" ? "status_change" : (field === "assigneeId" || field === "secondaryAssigneeIds") ? "reassign" : "status_change",
      fromValue: typeof (current as any)[field] === "object" ? JSON.stringify((current as any)[field] ?? []) : String((current as any)[field] ?? ""),
      toValue: typeof finalValue === "object" ? JSON.stringify(finalValue) : String(finalValue),
      note: field === "secondaryAssigneeIds" 
        ? "Updated secondary co-owners" 
        : field === "assigneeId" 
        ? "Reassigned primary responsible party"
        : field === "projectId"
        ? "Updated project assignment"
        : `Updated ${field} to ${finalValue}`,
    });

    // WhatsApp nudge / notification if status changed to blocked
    if (field === "status" && value === "blocked") {
      await sendWhatsApp(
        current.assigneeId,
        `Attention: Action item "${current.title}" is marked BLOCKED.`,
        id
      );
    }

    revalidateAllActionItemPaths(current.projectId || undefined);

    return { success: true };
  } catch (err: any) {
    console.error("updateActionItemField error:", err);
    return { success: false, error: err.message };
  }
}

export async function deleteActionItem(id: string, actorId: string) {
  if (!id || !UUID_REGEX.test(id)) {
    return { success: false, error: "Invalid ID" };
  }

  try {
    const current = await db.query.actionItems.findFirst({
      where: eq(actionItems.id, id),
    });

    // Explicitly remove linked rows in cascading order
    await db.delete(comments).where(eq(comments.actionItemId, id));
    await db.delete(activityLog).where(eq(activityLog.actionItemId, id));
    await db.delete(actionItems).where(eq(actionItems.id, id));

    revalidateAllActionItemPaths(current?.projectId || undefined);

    return { success: true };
  } catch (err: any) {
    console.error("deleteActionItem error:", err);
    return { success: false, error: err.message || "Failed to delete action item" };
  }
}

export async function createActionItem(data: {
  entityId?: string | null;
  projectId?: string | null;
  title: string;
  description?: string;
  assigneeId: string;
  secondaryAssigneeIds?: string[];
  deadline: string;
  status?: "not_started" | "in_progress" | "blocked" | "done" | "postponed";
  priority: "low" | "medium" | "high" | "critical";
  tag?: string;
  createdBy: string;
  sourceMeetingId?: string;
}) {
  try {
    let resolvedEntityId = data.entityId;
    const resolvedProjectId = data.projectId && data.projectId.trim() !== "" ? data.projectId : null;

    if (resolvedProjectId && !resolvedEntityId) {
      const proj = await db.query.projects.findFirst({
        where: eq(projects.id, resolvedProjectId),
      });
      resolvedEntityId = proj?.entityId;
    }

    if (!resolvedEntityId) {
      const firstEnt = await db.query.entities.findFirst({
        where: eq(entities.isActive, true),
      });
      resolvedEntityId = firstEnt?.id;
    }

    const resolvedDeadline = normalizeDeadline(data.deadline);
    const [newItem] = await db
      .insert(actionItems)
      .values({
        entityId: resolvedEntityId,
        projectId: resolvedProjectId,
        title: data.title,
        description: data.description,
        assigneeId: data.assigneeId,
        secondaryAssigneeIds: data.secondaryAssigneeIds || [],
        deadline: resolvedDeadline,
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
    const deadlineLabel = isTbaDeadline(resolvedDeadline) ? "To Be Actioned" : resolvedDeadline;
    await sendWhatsApp(
      data.assigneeId,
      `New action item assigned: "${data.title}" (Deadline: ${deadlineLabel}).`,
      newItem.id
    );

    if (data.secondaryAssigneeIds && data.secondaryAssigneeIds.length > 0) {
      for (const secId of data.secondaryAssigneeIds) {
        if (secId && secId !== data.assigneeId) {
          await sendWhatsApp(
            secId,
            `You are co-assigned to action item: "${data.title}" (Deadline: ${deadlineLabel}).`,
            newItem.id
          );
        }
      }
    }

    revalidateAllActionItemPaths(resolvedProjectId || undefined);
    return { success: true, item: newItem };
  } catch (err: any) {
    console.error("createActionItem error:", err);
    return { success: false, error: err.message };
  }
}

export interface BulkActionItemInput {
  title: string;
  assigneeId: string;
  deadline: string;
  priority?: "low" | "medium" | "high" | "critical";
  status?: "not_started" | "in_progress" | "blocked" | "done";
  notes?: string;
  tag?: string;
}

export async function bulkCreateActionItems(data: {
  entityId?: string;
  projectId?: string | null;
  createdBy: string;
  meetingSubject?: string;
  createMeetingRecord?: boolean;
  meetingDate?: string;
  venue?: string;
  items: BulkActionItemInput[];
}) {
  try {
    if (!data.items || data.items.length === 0) {
      return { success: false, error: "No action items provided to import." };
    }

    const targetProjectId = data.projectId && data.projectId.trim() !== "" ? data.projectId : null;
    let targetEntityId = data.entityId;

    if (targetProjectId && !targetEntityId) {
      const proj = await db.query.projects.findFirst({
        where: eq(projects.id, targetProjectId),
      });
      targetEntityId = proj?.entityId;
    }

    if (!targetEntityId) {
      const firstEnt = await db.query.entities.findFirst({
        where: eq(entities.isActive, true),
      });
      targetEntityId = firstEnt?.id;
    }

    if (!targetEntityId) {
      return { success: false, error: "No subsidiary found to assign items to." };
    }

    let sourceMeetingId: string | undefined;

    if (data.createMeetingRecord && data.meetingSubject && targetEntityId) {
      const meetingDateStr = data.meetingDate || new Date().toISOString().split("T")[0];
      const [newMeeting] = await db
        .insert(meetings)
        .values({
          entityId: targetEntityId,
          subject: data.meetingSubject,
          meetingDate: meetingDateStr,
          venue: data.venue || "Virtual",
          isVirtual: true,
          createdBy: data.createdBy,
        })
        .returning();
      sourceMeetingId = newMeeting.id;
    }

    const insertedItems = [];

    for (const item of data.items) {
      const resolvedDeadline = normalizeDeadline(item.deadline);
      const [created] = await db
        .insert(actionItems)
        .values({
          entityId: targetEntityId,
          projectId: targetProjectId,
          title: item.title.trim(),
          description: item.notes || null,
          assigneeId: item.assigneeId,
          deadline: resolvedDeadline,
          status: item.status || "not_started",
          priority: item.priority || "medium",
          tag: item.tag || (item.notes?.includes("Counterparty") ? "Counterparty" : undefined),
          sourceMeetingId,
          createdBy: data.createdBy,
        })
        .returning();

      insertedItems.push(created);

      await db.insert(activityLog).values({
        actionItemId: created.id,
        actorId: data.createdBy,
        eventType: "created",
        note: data.meetingSubject
          ? `Imported from "${data.meetingSubject}"`
          : "Imported from action register",
      });

      // Optional WhatsApp notification
      const deadlineLabel = isTbaDeadline(resolvedDeadline) ? "To Be Actioned" : resolvedDeadline;
      await sendWhatsApp(
        item.assigneeId,
        `New action item assigned from register: "${item.title}" (Deadline: ${deadlineLabel}).`,
        created.id
      );
    }

    revalidateAllActionItemPaths(targetProjectId || undefined);

    return {
      success: true,
      count: insertedItems.length,
      items: insertedItems,
      meetingId: sourceMeetingId,
    };
  } catch (err: any) {
    console.error("bulkCreateActionItems error:", err);
    return { success: false, error: err.message || "Failed to import action items." };
  }
}

