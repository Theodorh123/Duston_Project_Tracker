"use server";

import { db } from "../db";
import { projects, actionItems } from "../db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { invalidateMetadataCache, getUserScopeCached } from "../db/cache";
import { auth } from "@/auth";

export interface CreateProjectInput {
  entityId: string;
  name: string;
  description?: string;
  category: "capex" | "financing" | "regulatory" | "commercial" | "operations" | "corporate";
  status: "not_started" | "in_progress" | "on_hold" | "blocked" | "done" | "cancelled";
  priority: "low" | "medium" | "high" | "critical";
  ownerId?: string;
  sponsorId?: string;
  startDate: string;
  targetDate: string;
  budgetNotes?: string;
}

function revalidateAllProjectPaths(projectId?: string) {
  invalidateMetadataCache();
  revalidatePath("/projects");
  if (projectId) revalidatePath(`/projects/${projectId}`);
  revalidatePath("/todos");
  revalidatePath("/action-items");
  revalidatePath("/");
  revalidatePath("/ceo-view");
  revalidatePath("/ea-view");
  revalidatePath("/analytics");
  revalidatePath("/admin");
}

export async function createProject(data: CreateProjectInput) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const effectiveOwnerId = data.ownerId || userId || undefined;

    const [project] = await db
      .insert(projects)
      .values({
        entityId: data.entityId,
        name: data.name,
        description: data.description,
        category: data.category,
        status: data.status,
        priority: data.priority,
        ownerId: effectiveOwnerId,
        sponsorId: data.sponsorId || undefined,
        startDate: data.startDate,
        targetDate: data.targetDate,
        budgetNotes: data.budgetNotes,
      })
      .returning();

    revalidateAllProjectPaths(project.id);
    return { success: true, project };
  } catch (err: any) {
    console.error("createProject error:", err);
    return { success: false, error: err.message };
  }
}

export async function updateProject(id: string, data: Partial<CreateProjectInput>) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized. Please sign in." };
    }

    const userId = session.user.id;
    const userRole = (session.user as any)?.role;
    const hasGlobal = (session.user as any)?.hasGlobalAccess ?? false;

    // Fetch existing project to verify permissions
    const existingProject = await db.query.projects.findFirst({
      where: eq(projects.id, id),
    });

    if (!existingProject) {
      return { success: false, error: "Project not found" };
    }

    const isOwnerOrSponsor = existingProject.ownerId === userId || existingProject.sponsorId === userId;
    const isAdminOrExec = userRole === "admin" || userRole === "ceo" || userRole === "ea" || hasGlobal;

    if (!isAdminOrExec && !isOwnerOrSponsor) {
      const { allowedEntityIds } = await getUserScopeCached(userId);
      if (!allowedEntityIds.includes(existingProject.entityId)) {
        return { success: false, error: "You do not have permission to edit this project." };
      }
    }

    const [updated] = await db
      .update(projects)
      .set({
        ...data,
        ownerId: data.ownerId === "" ? null : data.ownerId,
        sponsorId: data.sponsorId === "" ? null : data.sponsorId,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id))
      .returning();

    revalidateAllProjectPaths(id);
    return { success: true, project: updated };
  } catch (err: any) {
    console.error("updateProject error:", err);
    return { success: false, error: err.message || "Failed to update project" };
  }
}

export async function deleteProject(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized. Please sign in." };
    }

    const userId = session.user.id;
    const userRole = (session.user as any)?.role;
    const hasGlobal = (session.user as any)?.hasGlobalAccess ?? false;

    // Look up project
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, id),
    });

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    const isOwnerOrSponsor = project.ownerId === userId || project.sponsorId === userId;
    const isAdminOrExec = userRole === "admin" || userRole === "ceo" || userRole === "ea" || hasGlobal;

    if (!isAdminOrExec && !isOwnerOrSponsor) {
      const { allowedEntityIds } = await getUserScopeCached(userId);
      if (!allowedEntityIds.includes(project.entityId)) {
        return { success: false, error: "You do not have permission to delete this project." };
      }
    }

    // Unlink action items (preserves them in their respective entity action register)
    await db
      .update(actionItems)
      .set({ projectId: null })
      .where(eq(actionItems.projectId, id));

    // Delete project
    await db.delete(projects).where(eq(projects.id, id));

    revalidateAllProjectPaths(id);
    return { success: true };
  } catch (err: any) {
    console.error("deleteProject error:", err);
    return { success: false, error: err.message || "Failed to delete project" };
  }
}

export async function createQuickProject(data: { name: string; entityId: string; targetDate?: string }) {
  try {
    if (!data.name?.trim() || !data.entityId) {
      return { success: false, error: "Project name and subsidiary are required." };
    }
    const session = await auth();
    const userId = session?.user?.id;

    const today = new Date().toISOString().slice(0, 10);
    const target = data.targetDate || new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const [project] = await db
      .insert(projects)
      .values({
        entityId: data.entityId,
        name: data.name.trim(),
        category: "operations",
        status: "not_started",
        priority: "medium",
        ownerId: userId || undefined,
        startDate: today,
        targetDate: target,
      })
      .returning();

    revalidateAllProjectPaths(project.id);
    return {
      success: true,
      project: {
        id: project.id,
        name: project.name,
        entityId: project.entityId,
      },
    };
  } catch (err: any) {
    console.error("createQuickProject error:", err);
    return { success: false, error: err.message };
  }
}
