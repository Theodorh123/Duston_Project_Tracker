"use server";

import { db } from "../db";
import { users, entities } from "../db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function updateUserRole(userId: string, role: "admin" | "ceo" | "ea" | "md" | "hod" | "contributor" | "external") {
  try {
    await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId));
    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function resetUserPassword(userId: string) {
  try {
    const tempPassword = `Duston${Math.random().toString(36).slice(-6)}!`;
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
    revalidatePath("/admin");
    return { success: true, tempPassword };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function toggleUserStatus(userId: string, isActive: boolean) {
  try {
    await db.update(users).set({ isActive, updatedAt: new Date() }).where(eq(users.id, userId));
    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createUser(data: {
  name: string;
  email: string;
  role: "admin" | "ceo" | "ea" | "md" | "hod" | "contributor" | "external";
  phoneE164?: string;
  hasGlobalAccess?: boolean;
}) {
  try {
    const defaultPassword = "Duston123!";
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const [newUser] = await db
      .insert(users)
      .values({
        name: data.name,
        email: data.email.toLowerCase().trim(),
        role: data.role,
        phoneE164: data.phoneE164,
        hasGlobalAccess: data.hasGlobalAccess ?? true,
        passwordHash,
      })
      .returning();

    revalidatePath("/admin");
    return { success: true, user: newUser, tempPassword: defaultPassword };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createEntity(data: {
  name: string;
  slug: string;
  brandPrimaryColor: string;
  parentEntityId?: string;
}) {
  try {
    const [newEntity] = await db
      .insert(entities)
      .values({
        name: data.name,
        slug: data.slug,
        brandPrimaryColor: data.brandPrimaryColor || "#023542",
        parentEntityId: data.parentEntityId || null,
      })
      .returning();

    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true, entity: newEntity };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateEntity(id: string, data: Partial<{ name: string; brandPrimaryColor: string; isActive: boolean }>) {
  try {
    await db
      .update(entities)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(entities.id, id));

    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
