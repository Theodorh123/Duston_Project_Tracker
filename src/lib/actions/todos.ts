"use server";

import { db } from "../db";
import { userTodos, users } from "../db/schema";
import { eq, desc, asc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

export interface TodoItemData {
  id: string;
  userId: string;
  userName?: string;
  title: string;
  notes?: string | null;
  isCompleted: boolean;
  completedAt?: string | null;
  dueDate?: string | null;
  reminderTime?: string | null;
  priority: "low" | "medium" | "high" | "critical";
  category?: string | null;
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
      },
      orderBy: [
        asc(userTodos.isCompleted),
        asc(userTodos.dueDate),
        desc(userTodos.createdAt),
      ],
    });

    const mapped: TodoItemData[] = items.map((item) => ({
      id: item.id,
      userId: item.userId,
      userName: item.user?.name || "User",
      title: item.title,
      notes: item.notes,
      isCompleted: item.isCompleted,
      completedAt: item.completedAt ? item.completedAt.toISOString() : null,
      dueDate: item.dueDate,
      reminderTime: item.reminderTime ? item.reminderTime.toISOString() : null,
      priority: item.priority as any,
      category: item.category || "General",
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }));

    return { success: true, todos: mapped };
  } catch (err: any) {
    console.error("Failed to fetch user todos:", err);
    return { success: false, error: err.message || "Failed to fetch todos" };
  }
}

export async function createTodo(data: {
  title: string;
  notes?: string;
  dueDate?: string;
  reminderTime?: string;
  priority?: "low" | "medium" | "high" | "critical";
  category?: string;
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
      return { success: false, error: "Title is required" };
    }

    const [newTodo] = await db
      .insert(userTodos)
      .values({
        userId: assignedUserId,
        title: data.title.trim(),
        notes: data.notes?.trim() || null,
        dueDate: data.dueDate || null,
        reminderTime: data.reminderTime ? new Date(data.reminderTime) : null,
        priority: data.priority || "medium",
        category: data.category?.trim() || "General",
        isCompleted: false,
      })
      .returning();

    revalidatePath("/todos");
    revalidatePath("/");

    return {
      success: true,
      todo: {
        id: newTodo.id,
        userId: newTodo.userId,
        title: newTodo.title,
        notes: newTodo.notes,
        isCompleted: newTodo.isCompleted,
        completedAt: newTodo.completedAt ? newTodo.completedAt.toISOString() : null,
        dueDate: newTodo.dueDate,
        reminderTime: newTodo.reminderTime ? newTodo.reminderTime.toISOString() : null,
        priority: newTodo.priority as any,
        category: newTodo.category || "General",
        createdAt: newTodo.createdAt.toISOString(),
        updatedAt: newTodo.updatedAt.toISOString(),
      },
    };
  } catch (err: any) {
    console.error("Failed to create todo:", err);
    return { success: false, error: err.message || "Failed to create todo" };
  }
}

export async function toggleTodoComplete(
  todoId: string,
  isCompleted: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const currentUserId = session.user.id;
    const currentUserRole = (session.user as any)?.role || "contributor";
    const isAdmin = currentUserRole === "admin";

    // Ensure user owns this todo or is admin
    const existing = await db.query.userTodos.findFirst({
      where: eq(userTodos.id, todoId),
    });

    if (!existing) {
      return { success: false, error: "To-do not found" };
    }

    if (!isAdmin && existing.userId !== currentUserId) {
      return { success: false, error: "Permission denied" };
    }

    await db
      .update(userTodos)
      .set({
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(userTodos.id, todoId));

    revalidatePath("/todos");
    revalidatePath("/");

    return { success: true };
  } catch (err: any) {
    console.error("Failed to toggle todo complete:", err);
    return { success: false, error: err.message || "Failed to update todo" };
  }
}

export async function updateTodo(
  todoId: string,
  data: {
    title?: string;
    notes?: string;
    dueDate?: string | null;
    reminderTime?: string | null;
    priority?: "low" | "medium" | "high" | "critical";
    category?: string;
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
    if (data.notes !== undefined) updatePayload.notes = data.notes?.trim() || null;
    if (data.dueDate !== undefined) updatePayload.dueDate = data.dueDate;
    if (data.reminderTime !== undefined) {
      updatePayload.reminderTime = data.reminderTime ? new Date(data.reminderTime) : null;
    }
    if (data.priority !== undefined) updatePayload.priority = data.priority;
    if (data.category !== undefined) updatePayload.category = data.category?.trim() || "General";

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
