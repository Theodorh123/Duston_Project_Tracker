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
      secondaryAssigneeIds: secIds,
      secondaryAssignees: secondaryUsers,
      deadline: item.deadline,
      status: item.status,
      priority: item.priority,
      tag: item.tag,
      sourceMeetingId: item.sourceMeetingId,
      sourceMeetingSubject: item.sourceMeeting?.subject,
      createdBy: item.createdBy,
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
  projectId?: string;
  assigneeId?: string;
  secondaryAssigneeIds?: string[];
  deadline?: string;
  status?: "not_started" | "in_progress" | "blocked" | "done" | "postponed";
  priority?: "low" | "medium" | "high" | "critical";
  tag?: string | null;
  description?: string | null;
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

    // Authorization check: Only EA, Admin, CEO can edit any action item.
    // All other users can only edit action items that originate from them.
    if (actorId && UUID_REGEX.test(actorId) && actorId !== "00000000-0000-0000-0000-000000000000") {
      const actor = await db.query.users.findFirst({
        where: eq(users.id, actorId),
      });
      const actorRole = actor?.role?.toLowerCase()?.trim() || "";
      const isPrivileged = ["admin", "ceo", "ea"].includes(actorRole);
      const isOriginator = current.createdBy === actorId;

      if (!isPrivileged && !isOriginator) {
        return {
          success: false,
          error: "Permission denied: Only EA, Admin, CEO or the creator of this action item can amend it.",
        };
      }
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.projectId !== undefined) updateData.projectId = data.projectId;
    if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId;
    if (data.secondaryAssigneeIds !== undefined) updateData.secondaryAssigneeIds = data.secondaryAssigneeIds;
    if (data.deadline !== undefined) updateData.deadline = data.deadline;
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

    revalidatePath("/");
    revalidatePath("/action-items");
    revalidatePath("/projects");
    revalidatePath("/ea-view");
    revalidatePath("/ceo-view");

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

    // Authorization check: Only EA, Admin, CEO can edit any action item.
    // All other users can only edit action items that originate from them.
    if (actorId && UUID_REGEX.test(actorId) && actorId !== "00000000-0000-0000-0000-000000000000") {
      const actor = await db.query.users.findFirst({
        where: eq(users.id, actorId),
      });
      const actorRole = actor?.role?.toLowerCase()?.trim() || "";
      const isPrivileged = ["admin", "ceo", "ea"].includes(actorRole);
      const isOriginator = current.createdBy === actorId;

      if (!isPrivileged && !isOriginator) {
        return {
          success: false,
          error: "Permission denied: Only EA, Admin, CEO or the creator of this action item can amend it.",
        };
      }
    }

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
      eventType: field === "status" ? "status_change" : (field === "assigneeId" || field === "secondaryAssigneeIds") ? "reassign" : "status_change",
      fromValue: typeof (current as any)[field] === "object" ? JSON.stringify((current as any)[field] ?? []) : String((current as any)[field] ?? ""),
      toValue: typeof value === "object" ? JSON.stringify(value) : String(value),
      note: field === "secondaryAssigneeIds" 
        ? "Updated secondary co-owners" 
        : field === "assigneeId" 
        ? "Reassigned primary responsible party"
        : field === "projectId"
        ? "Moved to different project"
        : `Updated ${field} to ${value}`,
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
    revalidatePath("/action-items");
    revalidatePath("/projects");
    revalidatePath("/ea-view");
    revalidatePath("/ceo-view");

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
    if (!actorId || !UUID_REGEX.test(actorId)) {
      return { success: false, error: "Authentication required to delete action items" };
    }

    const actor = await db.query.users.findFirst({
      where: eq(users.id, actorId),
    });

    if (!actor || !["admin", "ceo", "ea"].includes(actor.role)) {
      return {
        success: false,
        error: "Permission denied: Only EA, Admin, or CEO can delete action items.",
      };
    }

    // Explicitly remove linked rows in cascading order
    await db.delete(comments).where(eq(comments.actionItemId, id));
    await db.delete(activityLog).where(eq(activityLog.actionItemId, id));
    await db.delete(actionItems).where(eq(actionItems.id, id));

    revalidatePath("/");
    revalidatePath("/action-items");
    revalidatePath("/projects");
    revalidatePath("/meetings");
    revalidatePath("/ea-view");
    revalidatePath("/ceo-view");

    return { success: true };
  } catch (err: any) {
    console.error("deleteActionItem error:", err);
    return { success: false, error: err.message || "Failed to delete action item" };
  }
}

export async function createActionItem(data: {
  projectId: string;
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
    const [newItem] = await db
      .insert(actionItems)
      .values({
        projectId: data.projectId,
        title: data.title,
        description: data.description,
        assigneeId: data.assigneeId,
        secondaryAssigneeIds: data.secondaryAssigneeIds || [],
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

    if (data.secondaryAssigneeIds && data.secondaryAssigneeIds.length > 0) {
      for (const secId of data.secondaryAssigneeIds) {
        if (secId && secId !== data.assigneeId) {
          await sendWhatsApp(
            secId,
            `You are co-assigned to action item: "${data.title}" due on ${data.deadline}.`,
            newItem.id
          );
        }
      }
    }

    revalidatePath("/");
    revalidatePath("/action-items");
    revalidatePath("/projects");
    revalidatePath(`/projects/${data.projectId}`);
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
  projectId?: string;
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

    let targetProjectId = data.projectId;
    let targetEntityId = data.entityId;

    // If no specific project provided, resolve from entity or auto-create entity general deliverables
    if (!targetProjectId && targetEntityId) {
      const existingProj = await db.query.projects.findFirst({
        where: eq(projects.entityId, targetEntityId),
      });

      if (existingProj) {
        targetProjectId = existingProj.id;
      } else {
        const ent = await db.query.entities.findFirst({
          where: eq(entities.id, targetEntityId),
        });
        const targetDateStr = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const [newProj] = await db
          .insert(projects)
          .values({
            entityId: targetEntityId,
            name: `${ent?.name || "Subsidiary"} Operations & Deliverables`,
            category: "operations",
            ownerId: data.createdBy,
            startDate: new Date().toISOString().split("T")[0],
            targetDate: targetDateStr,
            status: "in_progress",
          })
          .returning();
        targetProjectId = newProj.id;
      }
    } else if (targetProjectId && !targetEntityId) {
      const proj = await db.query.projects.findFirst({
        where: eq(projects.id, targetProjectId),
      });
      targetEntityId = proj?.entityId;
    }

    if (!targetProjectId) {
      return { success: false, error: "Please select a target Subsidiary for these action items." };
    }

    let sourceMeetingId: string | undefined = undefined;

    // Optional: create a meeting record if meetingSubject provided and createMeetingRecord is true
    if (data.createMeetingRecord && data.meetingSubject?.trim() && targetEntityId) {
      const [newMeeting] = await db
        .insert(meetings)
        .values({
          entityId: targetEntityId,
          subject: data.meetingSubject.trim(),
          meetingDate: data.meetingDate || new Date().toISOString().split("T")[0],
          venue: data.venue || "Virtual",
          isVirtual: true,
          createdBy: data.createdBy,
        })
        .returning();
      sourceMeetingId = newMeeting.id;
    }

    const insertedItems = [];

    for (const item of data.items) {
      const [created] = await db
        .insert(actionItems)
        .values({
          projectId: targetProjectId,
          title: item.title.trim(),
          description: item.notes || null,
          assigneeId: item.assigneeId,
          deadline: item.deadline,
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
      await sendWhatsApp(
        item.assigneeId,
        `New action item assigned from register: "${item.title}" due on ${item.deadline}.`,
        created.id
      );
    }

    revalidatePath("/");
    revalidatePath("/action-items");
    revalidatePath("/projects");
    revalidatePath(`/projects/${data.projectId}`);
    revalidatePath("/meetings");

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

