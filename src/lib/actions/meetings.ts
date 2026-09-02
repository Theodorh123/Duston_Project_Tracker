"use server";

import { db } from "../db";
import { meetings, meetingAttendees, actionItems, activityLog, users, projects } from "../db/schema";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { sendWhatsApp } from "../services/whatsapp";

export interface CreateMeetingInput {
  entityId: string;
  projectId?: string;
  subject: string;
  meetingDate: string;
  venue?: string;
  isVirtual?: boolean;
  minutesDocUrl?: string;
  attendeeUserIds: string[];
  createdBy: string;
  rawActionRegister?: string;
}

export async function createMeeting(data: CreateMeetingInput) {
  try {
    // 1. Create meeting record
    const [meeting] = await db
      .insert(meetings)
      .values({
        entityId: data.entityId,
        subject: data.subject,
        meetingDate: data.meetingDate,
        venue: data.venue,
        isVirtual: data.isVirtual ?? false,
        minutesDocUrl: data.minutesDocUrl,
        createdBy: data.createdBy,
      })
      .returning();

    // 2. Add attendees
    if (data.attendeeUserIds && data.attendeeUserIds.length > 0) {
      await db.insert(meetingAttendees).values(
        data.attendeeUserIds.map((userId) => ({
          meetingId: meeting.id,
          userId,
        }))
      );
    }

    // 3. Bulk parse action register if provided
    if (data.rawActionRegister?.trim()) {
      // Find fallback project if not specified
      let targetProjectId = data.projectId;
      if (!targetProjectId) {
        const entityProjects = await db.query.projects.findMany({
          where: eq(projects.entityId, data.entityId),
          limit: 1,
        });
        if (entityProjects.length > 0) {
          targetProjectId = entityProjects[0].id;
        }
      }

      if (targetProjectId) {
        const allUsers = await db.query.users.findMany();
        const lines = data.rawActionRegister
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);

        for (const line of lines) {
          // Parse pipe or tab delimited: Item | Responsible party | Deadline
          const delimiter = line.includes("\t") ? "\t" : "|";
          const parts = line.split(delimiter).map((p) => p.trim());
          if (parts.length >= 2) {
            const title = parts[0];
            const responsible = parts[1]?.toLowerCase();
            const deadlineRaw = parts[2] || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

            // Match assignee by name or email
            const matchedUser =
              allUsers.find(
                (u) =>
                  u.name.toLowerCase().includes(responsible) ||
                  u.email.toLowerCase().includes(responsible)
              ) || allUsers[0];

            const [createdItem] = await db
              .insert(actionItems)
              .values({
                projectId: targetProjectId,
                title,
                assigneeId: matchedUser ? matchedUser.id : data.createdBy,
                deadline: deadlineRaw,
                status: "not_started",
                priority: "medium",
                sourceMeetingId: meeting.id,
                createdBy: data.createdBy,
              })
              .returning();

            await db.insert(activityLog).values({
              actionItemId: createdItem.id,
              actorId: data.createdBy,
              eventType: "created",
              note: `Bulk imported from meeting "${data.subject}"`,
            });

            if (matchedUser) {
              await sendWhatsApp(
                matchedUser.id,
                `New action item assigned from meeting "${data.subject}": ${title}`,
                createdItem.id
              );
            }
          }
        }
      }
    }

    revalidatePath("/meetings");
    revalidatePath("/projects");
    revalidatePath("/");
    return { success: true, meetingId: meeting.id };
  } catch (err: any) {
    console.error("createMeeting error:", err);
    return { success: false, error: err.message };
  }
}
