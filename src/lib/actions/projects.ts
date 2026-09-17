"use server";

import { db } from "../db";
import { projects } from "../db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { invalidateMetadataCache } from "../db/cache";

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
}

export async function createProject(data: CreateProjectInput) {
  try {
    const [project] = await db
      .insert(projects)
      .values({
        entityId: data.entityId,
        name: data.name,
        description: data.description,
        category: data.category,
        status: data.status,
        priority: data.priority,
        ownerId: data.ownerId || undefined,
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
    await db
      .update(projects)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id));

    revalidateAllProjectPaths(id);
    return { success: true };
  } catch (err: any) {
    console.error("updateProject error:", err);
    return { success: false, error: err.message };
  }
}

export async function createQuickProject(data: { name: string; entityId: string; targetDate?: string }) {
  try {
    if (!data.name?.trim() || !data.entityId) {
      return { success: false, error: "Project name and subsidiary are required." };
    }
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

