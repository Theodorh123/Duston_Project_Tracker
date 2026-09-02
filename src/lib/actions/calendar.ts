"use server";

import { db } from "../db";
import { meetings, meetingAttendees, users, entities, userPreferences } from "../db/schema";
import { eq, and, sql, or } from "drizzle-orm";
import { parseIcsContent, ParsedCalendarEvent } from "../ical-parser";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export interface SyncCalendarResult {
  success: boolean;
  message?: string;
  count?: number;
  updatedCount?: number;
  totalParsed?: number;
  feedUrl?: string;
  lastSyncedAt?: string;
  error?: string;
}

export async function syncCalendarFeed({
  feedUrl,
  icsContent,
  entityId,
}: {
  feedUrl?: string;
  icsContent?: string;
  entityId?: string;
}): Promise<SyncCalendarResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized. Please sign in." };
    }
    const currentUserId = session.user.id;

    let rawIcs = icsContent;

    // If feed URL is provided, fetch it
    if (feedUrl && !rawIcs) {
      let cleanUrl = feedUrl.trim();
      // Convert webcal:// to https://
      if (cleanUrl.startsWith("webcal://")) {
        cleanUrl = "https://" + cleanUrl.slice(9);
      }

      const res = await fetch(cleanUrl, {
        headers: {
          "User-Agent": "Duston-Project-Tracker/1.0",
          Accept: "text/calendar, text/plain, */*",
        },
        cache: "no-store",
      });

      if (!res.ok) {
        return {
          success: false,
          error: `Failed to fetch calendar from provider (HTTP ${res.status}). Please verify the Outlook or iCal link is published with full details.`,
        };
      }

      rawIcs = await res.text();
    }

    if (!rawIcs || !rawIcs.includes("BEGIN:VCALENDAR")) {
      return {
        success: false,
        error: "Invalid calendar feed. Make sure the link ends with .ics or contains valid iCal calendar data.",
      };
    }

    const events = parseIcsContent(rawIcs);
    if (events.length === 0) {
      return {
        success: false,
        error: "No meetings found in this calendar feed.",
      };
    }

    // Determine target entity ID (default to first active entity if not provided)
    let targetEntityId = entityId;
    if (!targetEntityId) {
      const firstEntity = await db.query.entities.findFirst({
        where: eq(entities.isActive, true),
      });
      targetEntityId = firstEntity?.id;
    }

    if (!targetEntityId) {
      return { success: false, error: "No active subsidiary entity found in system." };
    }

    // Filter to events from 7 days ago onwards (so we don't import ancient calendar history)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);
    const cutoffStr = cutoffDate.toISOString().split("T")[0];

    const upcomingEvents = events.filter((ev) => ev.startDate >= cutoffStr);

    let createdCount = 0;
    let updatedCount = 0;

    // Cache active users to map attendees by email
    const allUsers = await db.query.users.findMany({
      where: eq(users.isActive, true),
    });
    const userEmailMap = new Map(allUsers.map((u) => [u.email.toLowerCase(), u.id]));

    for (const ev of upcomingEvents) {
      // Check if meeting already exists by externalEventId OR by (date + subject)
      const existing = await db.query.meetings.findFirst({
        where: or(
          eq(meetings.externalEventId, ev.uid),
          and(eq(meetings.meetingDate, ev.startDate), eq(meetings.subject, ev.summary))
        ),
      });

      let meetingId: string;

      if (existing) {
        meetingId = existing.id;
        await db
          .update(meetings)
          .set({
            subject: ev.summary,
            meetingDate: ev.startDate,
            venue: ev.location || (ev.isVirtual ? "Virtual (Teams / Zoom)" : existing.venue || "HQ Boardroom"),
            isVirtual: ev.isVirtual || existing.isVirtual,
            externalEventId: ev.uid,
            updatedAt: new Date(),
          })
          .where(eq(meetings.id, existing.id));
        updatedCount++;
      } else {
        const [inserted] = await db
          .insert(meetings)
          .values({
            entityId: targetEntityId,
            subject: ev.summary,
            meetingDate: ev.startDate,
            venue: ev.location || (ev.isVirtual ? "Virtual (Microsoft Teams)" : "HQ Boardroom"),
            isVirtual: ev.isVirtual,
            externalEventId: ev.uid,
            createdBy: currentUserId,
          })
          .returning({ id: meetings.id });
        meetingId = inserted.id;
        createdCount++;
      }

      // Link attendees if found in system
      if (ev.attendeeEmails && ev.attendeeEmails.length > 0) {
        for (const email of ev.attendeeEmails) {
          const matchedUserId = userEmailMap.get(email.toLowerCase());
          if (matchedUserId) {
            // Check if already in attendees
            const existingAttendee = await db.query.meetingAttendees.findFirst({
              where: and(
                eq(meetingAttendees.meetingId, meetingId),
                eq(meetingAttendees.userId, matchedUserId)
              ),
            });
            if (!existingAttendee) {
              await db.insert(meetingAttendees).values({
                meetingId,
                userId: matchedUserId,
              });
            }
          }
        }
      }
    }

    // Save calendar feed preference
    const now = new Date();
    await db
      .insert(userPreferences)
      .values({
        userId: currentUserId,
        calendarFeedUrl: feedUrl || null,
        calendarLastSyncedAt: now,
      })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: {
          calendarFeedUrl: feedUrl || undefined,
          calendarLastSyncedAt: now,
          updatedAt: now,
        },
      });

    revalidatePath("/meetings");
    revalidatePath("/");

    return {
      success: true,
      count: createdCount,
      updatedCount,
      totalParsed: upcomingEvents.length,
      feedUrl,
      lastSyncedAt: now.toISOString(),
      message: `Calendar sync complete: ${createdCount} new meetings imported, ${updatedCount} refreshed.`,
    };
  } catch (err: any) {
    console.error("Calendar sync error:", err);
    return {
      success: false,
      error: err.message || "An unexpected error occurred during calendar synchronization.",
    };
  }
}
