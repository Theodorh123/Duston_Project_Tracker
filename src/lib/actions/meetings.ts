"use server";

import { db } from "../db";
import { meetings, meetingAttendees, actionItems, activityLog, users, projects } from "../db/schema";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { sendWhatsApp } from "../services/whatsapp";
import { TBA_DEADLINE, isTbaDeadline } from "@/lib/utils";

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
      const targetProjectId = data.projectId && data.projectId.trim() !== "" ? data.projectId : null;
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
          const rawD = (parts[2] || "").trim();
          const isTba =
            !rawD ||
            isTbaDeadline(rawD) ||
            ["tba", "tbd", "to be actioned", "pending", "none"].includes(rawD.toLowerCase());
          const deadlineRaw = isTba ? TBA_DEADLINE : rawD;

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
              entityId: data.entityId,
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

      revalidatePath("/meetings");
      revalidatePath("/action-items");
      revalidatePath("/projects");
      revalidatePath("/");
      return { success: true, meetingId: meeting.id };
    } catch (err: any) {
      console.error("createMeeting error:", err);
      return { success: false, error: err.message };
    }
}
