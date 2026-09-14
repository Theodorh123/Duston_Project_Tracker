"use server";

import { db } from "../db";
import { userTodos, users, projects, entities } from "../db/schema";
import { eq, desc, asc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

export interface TodoItemData {
  id: string;
  userId: string;
  userName?: string;
  title: string;
  projectId?: string | null;
  projectName?: string | null;
  entityName?: string | null;
  entityBrandColor?: string | null;
  dueDate?: string | null;
  status: "not_started" | "in_progress" | "done";
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getUserTodos(targetUserId?: string): Promise<{ success: boolean; todos?: TodoItemData[]; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const currentUserId = session.user.id;
    const currentUserRole = (session.user as any)?.role || "contributor";
    const isAdmin = currentUserRole === "admin";

    // Non-admins can strictly only see their own to-dos
    const queryUserId = isAdmin && targetUserId ? targetUserId : currentUserId;

    const items = await db.query.userTodos.findMany({
      where: eq(userTodos.userId, queryUserId),
      with: {
        user: true,
        project: {
          with: {
            entity: true,
          },
        },
      },
      orderBy: [
        asc(userTodos.isCompleted),
        asc(userTodos.dueDate),
        desc(userTodos.createdAt),
      ],
    });

    const mapped: TodoItemData[] = items.map((item) => {
      const statusValue: "not_started" | "in_progress" | "done" =
        item.status === "done" || item.isCompleted
          ? "done"
          : item.status === "in_progress"
          ? "in_progress"
          : "not_started";

      return {
        id: item.id,
        userId: item.userId,
        userName: item.user?.name || "User",
        title: item.title,
        projectId: item.projectId,
        projectName: item.project?.name || null,
        entityName: item.project?.entity?.name || null,
        entityBrandColor: item.project?.entity?.brandPrimaryColor || null,
        dueDate: item.dueDate,
        status: statusValue,
        isCompleted: statusValue === "done",
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      };
    });

    return { success: true, todos: mapped };
  } catch (err: any) {
    console.error("Failed to fetch user todos:", err);
    return { success: false, error: err.message || "Failed to fetch todos" };
  }
}

export async function createTodo(data: {
  title: string;
  projectId?: string | null;
  dueDate?: string | null;
  status?: "not_started" | "in_progress" | "done";
  targetUserId?: string;
}): Promise<{ success: boolean; todo?: TodoItemData; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const currentUserId = session.user.id;
    const currentUserRole = (session.user as any)?.role || "contributor";
    const isAdmin = currentUserRole === "admin";

    const assignedUserId = isAdmin && data.targetUserId ? data.targetUserId : currentUserId;

    if (!data.title?.trim()) {
      return { success: false, error: "Action is required" };
    }

    const statusValue = data.status || "not_started";
    const isCompleted = statusValue === "done";

    const [newTodo] = await db
      .insert(userTodos)
      .values({
        userId: assignedUserId,
        title: data.title.trim(),
        projectId: data.projectId || null,
        dueDate: data.dueDate || null,
        status: statusValue as any,
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
      })
      .returning();

    // Fetch project info if attached
    let projectName: string | null = null;
    let entityName: string | null = null;
    let entityBrandColor: string | null = null;

    if (newTodo.projectId) {
      const proj = await db.query.projects.findFirst({
        where: eq(projects.id, newTodo.projectId),
        with: { entity: true },
      });
      if (proj) {
        projectName = proj.name;
        entityName = proj.entity?.name || null;
        entityBrandColor = proj.entity?.brandPrimaryColor || null;
      }
    }

    revalidatePath("/todos");
    revalidatePath("/");

    return {
      success: true,
      todo: {
        id: newTodo.id,
        userId: newTodo.userId,
        title: newTodo.title,
        projectId: newTodo.projectId,
        projectName,
        entityName,
        entityBrandColor,
        dueDate: newTodo.dueDate,
        status: (newTodo.status as any) || statusValue,
        isCompleted,
        createdAt: newTodo.createdAt.toISOString(),
        updatedAt: newTodo.updatedAt.toISOString(),
      },
    };
  } catch (err: any) {
    console.error("Failed to create todo:", err);
    return { success: false, error: err.message || "Failed to create todo" };
  }
}

export async function updateTodoStatus(
  todoId: string,
  newStatus: "not_started" | "in_progress" | "done"
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const currentUserId = session.user.id;
    const currentUserRole = (session.user as any)?.role || "contributor";
    const isAdmin = currentUserRole === "admin";

    const existing = await db.query.userTodos.findFirst({
      where: eq(userTodos.id, todoId),
    });

    if (!existing) {
      return { success: false, error: "To-do not found" };
    }

    if (!isAdmin && existing.userId !== currentUserId) {
      return { success: false, error: "Permission denied" };
    }

    const isCompleted = newStatus === "done";

    await db
      .update(userTodos)
      .set({
        status: newStatus as any,
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(userTodos.id, todoId));

    revalidatePath("/todos");
    revalidatePath("/");

    return { success: true };
  } catch (err: any) {
    console.error("Failed to update todo status:", err);
    return { success: false, error: err.message || "Failed to update todo status" };
  }
}

export async function toggleTodoComplete(
  todoId: string,
  isCompleted: boolean
): Promise<{ success: boolean; error?: string }> {
  const newStatus = isCompleted ? "done" : "in_progress";
  return updateTodoStatus(todoId, newStatus);
}

export async function updateTodo(
  todoId: string,
  data: {
    title?: string;
    projectId?: string | null;
    dueDate?: string | null;
    status?: "not_started" | "in_progress" | "done";
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const currentUserId = session.user.id;
    const currentUserRole = (session.user as any)?.role || "contributor";
    const isAdmin = currentUserRole === "admin";

    const existing = await db.query.userTodos.findFirst({
      where: eq(userTodos.id, todoId),
    });

    if (!existing) {
      return { success: false, error: "To-do not found" };
    }

    if (!isAdmin && existing.userId !== currentUserId) {
      return { success: false, error: "Permission denied" };
    }

    const updatePayload: any = {
      updatedAt: new Date(),
    };

    if (data.title !== undefined) updatePayload.title = data.title.trim();
    if (data.projectId !== undefined) updatePayload.projectId = data.projectId || null;
    if (data.dueDate !== undefined) updatePayload.dueDate = data.dueDate || null;
    if (data.status !== undefined) {
      updatePayload.status = data.status;
      updatePayload.isCompleted = data.status === "done";
      updatePayload.completedAt = data.status === "done" ? new Date() : null;
    }

    await db.update(userTodos).set(updatePayload).where(eq(userTodos.id, todoId));

    revalidatePath("/todos");
    revalidatePath("/");

    return { success: true };
  } catch (err: any) {
    console.error("Failed to update todo:", err);
    return { success: false, error: err.message || "Failed to update todo" };
  }
}

export async function deleteTodo(todoId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const currentUserId = session.user.id;
    const currentUserRole = (session.user as any)?.role || "contributor";
    const isAdmin = currentUserRole === "admin";

    const existing = await db.query.userTodos.findFirst({
      where: eq(userTodos.id, todoId),
    });

    if (!existing) {
      return { success: false, error: "To-do not found" };
    }

    if (!isAdmin && existing.userId !== currentUserId) {
      return { success: false, error: "Permission denied" };
    }

    await db.delete(userTodos).where(eq(userTodos.id, todoId));

    revalidatePath("/todos");
    revalidatePath("/");

    return { success: true };
  } catch (err: any) {
    console.error("Failed to delete todo:", err);
    return { success: false, error: err.message || "Failed to delete todo" };
  }
}
