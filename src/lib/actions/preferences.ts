"use server";

import { db } from "../db";
import { userPreferences, users } from "../db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function updateUserPreferences(
  userId: string,
  data: {
    defaultView?: "todo" | "kanban" | "planner";
    kanbanColumns?: string[];
    whatsappEnabled?: boolean;
    digestFrequency?: "daily" | "weekly" | "off";
    timezone?: string;
  }
) {
  try {
    await db
      .insert(userPreferences)
      .values({
        userId,
        defaultView: data.defaultView ?? "todo",
        kanbanColumns: data.kanbanColumns ?? ["Todo", "In-Progress", "Done"],
        whatsappEnabled: data.whatsappEnabled ?? true,
        digestFrequency: data.digestFrequency ?? "daily",
        timezone: data.timezone ?? "Africa/Accra",
      })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: {
          ...data,
          updatedAt: new Date(),
        },
      });

    revalidatePath("/settings");
    revalidatePath("/");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateUserProfile(
  userId: string,
  data: {
    name: string;
    phoneE164?: string;
    avatarUrl?: string;
  }
) {
  try {
    await db
      .update(users)
      .set({
        name: data.name,
        phoneE164: data.phoneE164,
        avatarUrl: data.avatarUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    revalidatePath("/settings");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function changeUserPassword(
  userId: string,
  currentPass: string,
  newPass: string
) {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return { success: false, error: "User not found" };

    const valid = await bcrypt.compare(currentPass, user.passwordHash);
    if (!valid) return { success: false, error: "Current password does not match" };

    const passwordHash = await bcrypt.hash(newPass, 10);
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
