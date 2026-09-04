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

    invalidateMetadataCache();
    revalidatePath("/projects");
    revalidatePath("/");
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

    invalidateMetadataCache();
    revalidatePath("/projects");
    revalidatePath(`/projects/${id}`);
    revalidatePath("/");
    return { success: true };
  } catch (err: any) {
    console.error("updateProject error:", err);
    return { success: false, error: err.message };
  }
}
