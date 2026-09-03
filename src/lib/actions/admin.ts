"use server";

import { db } from "../db";
import { users, entities, userEntityAccess } from "../db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { invalidateMetadataCache } from "../db/cache";

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
  entityIds?: string[];
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

    // Link restricted/assigned entities
    if (data.entityIds && data.entityIds.length > 0) {
      for (const entityId of data.entityIds) {
        await db
          .insert(userEntityAccess)
          .values({
            userId: newUser.id,
            entityId,
            accessLevel: "write",
          })
          .onConflictDoNothing();
      }
    }

    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true, user: newUser, tempPassword: defaultPassword };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateUserEntityAccess(data: {
  userId: string;
  hasGlobalAccess: boolean;
  entityIds: string[];
}) {
  try {
    // 1. Update user global access flag
    await db
      .update(users)
      .set({
        hasGlobalAccess: data.hasGlobalAccess,
        updatedAt: new Date(),
      })
      .where(eq(users.id, data.userId));

    // 2. Clear previous grants
    await db
      .delete(userEntityAccess)
      .where(eq(userEntityAccess.userId, data.userId));

    // 3. Insert new entity grants if any
    if (data.entityIds && data.entityIds.length > 0) {
      for (const entityId of data.entityIds) {
        await db
          .insert(userEntityAccess)
          .values({
            userId: data.userId,
            entityId,
            accessLevel: "write",
          })
          .onConflictDoNothing();
      }
    }

    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true };
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

    invalidateMetadataCache();
    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function quickCreateUser(data: {
  name: string;
  email?: string;
  entityId?: string;
}) {
  try {
    const trimmedName = data.name.trim();
    if (!trimmedName) {
      return { success: false, error: "Name is required" };
    }

    const cleanSlug = trimmedName.toLowerCase().replace(/[^a-z0-9]/g, ".");
    const email = (data.email?.trim() || `${cleanSlug}@dustongroup.com`).toLowerCase();

    // Check if user with this email already exists
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (existing) {
      return { success: true, user: existing };
    }

    const defaultPassword = "Duston123!";
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const [newUser] = await db
      .insert(users)
      .values({
        name: trimmedName,
        email,
        role: "contributor",
        hasGlobalAccess: true,
        passwordHash,
      })
      .returning();

    if (data.entityId) {
      await db
        .insert(userEntityAccess)
        .values({
          userId: newUser.id,
          entityId: data.entityId,
          accessLevel: "write",
        })
        .onConflictDoNothing();
    }

    invalidateMetadataCache();
    revalidatePath("/admin");
    revalidatePath("/");
    revalidatePath("/projects");
    revalidatePath("/action-items");
    return { success: true, user: newUser };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function quickCreateEntity(data: {
  name: string;
  brandPrimaryColor?: string;
}) {
  try {
    const trimmedName = data.name.trim();
    if (!trimmedName) return { success: false, error: "Subsidiary name is required" };
    const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");

    const existing = await db.query.entities.findFirst({
      where: eq(entities.slug, slug),
    });
    if (existing) {
      return { success: true, entity: existing };
    }

    const [newEntity] = await db
      .insert(entities)
      .values({
        name: trimmedName,
        slug,
        brandPrimaryColor: data.brandPrimaryColor || "#023542",
      })
      .returning();

    invalidateMetadataCache();
    revalidatePath("/admin");
    revalidatePath("/");
    revalidatePath("/projects");
    revalidatePath("/action-items");
    return { success: true, entity: newEntity };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

