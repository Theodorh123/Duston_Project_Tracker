import { cache } from "react";
import { db } from "./index";
import { entities, users, userEntityAccess } from "./schema";
import { eq } from "drizzle-orm";

interface CachedEntry<T> {
  data: T;
  expiresAt: number;
}

const memoryStore = new Map<string, CachedEntry<any>>();
const TTL_MS = 60 * 1000; // 60 seconds TTL

export function getFromMemory<T>(key: string): T | null {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setInMemory<T>(key: string, data: T, ttlMs: number = TTL_MS): void {
  memoryStore.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

export function invalidateMetadataCache(): void {
  memoryStore.clear();
}

/**
 * Cached active entities - shared across layout and page renders
 */
export const getActiveEntitiesCached = cache(async () => {
  const cached = getFromMemory<Array<typeof entities.$inferSelect>>("active_entities");
  if (cached) return cached;

  const result = await db.query.entities.findMany({
    where: eq(entities.isActive, true),
    orderBy: [entities.name],
  });

  setInMemory("active_entities", result);
  return result;
});

/**
 * Cached active users - shared across layout and page renders
 */
export const getActiveUsersCached = cache(async () => {
  const cached = getFromMemory<Array<typeof users.$inferSelect>>("active_users");
  if (cached) return cached;

  const result = await db.query.users.findMany({
    where: eq(users.isActive, true),
    orderBy: [users.name],
  });

  setInMemory("active_users", result);
  return result;
});

/**
 * Cached user details + accessible entity IDs
 */
export const getUserScopeCached = cache(async (userId: string) => {
  const cacheKey = `user_scope_${userId}`;
  const cached = getFromMemory<{
    user: typeof users.$inferSelect | undefined;
    allowedEntityIds: string[];
  }>(cacheKey);
  if (cached) return cached;

  const [user, allEntities] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, userId),
    }),
    getActiveEntitiesCached(),
  ]);

  if (!user) {
    return { user: undefined, allowedEntityIds: [] };
  }

  let allowedEntityIds: string[] = [];
  if (user.hasGlobalAccess) {
    allowedEntityIds = allEntities.map((e) => e.id);
  } else {
    const grants = await db.query.userEntityAccess.findMany({
      where: eq(userEntityAccess.userId, userId),
    });
    allowedEntityIds = grants.map((g) => g.entityId);
  }

  const result = { user, allowedEntityIds };
  setInMemory(cacheKey, result, 30 * 1000); // 30s TTL
  return result;
});
