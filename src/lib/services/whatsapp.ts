import { db } from "../db";
import { notifications, users } from "../db/schema";
import { eq } from "drizzle-orm";

export interface WhatsAppNotificationPayload {
  recipientId: string;
  recipientPhone?: string | null;
  message: string;
  actionItemId?: string;
  type?: string;
}

/**
 * WhatsApp Notification Service interface
 * Log payloads to console for MVP; records notification audit in DB.
 * Later can be backed by @whiskeysockets/baileys worker service.
 */
export async function sendWhatsApp(
  userId: string,
  message: string,
  actionItemId?: string
): Promise<{ success: boolean; messageId: string }> {
  const timestamp = new Date().toISOString();
  console.log(`[WHATSAPP-SERVICE] [${timestamp}]`);
  console.log(`To User ID: ${userId}`);
  console.log(`Message: ${message}`);
  if (actionItemId) console.log(`Action Item ID: ${actionItemId}`);
  console.log(`[WHATSAPP-SERVICE-PAYLOAD]`, JSON.stringify({ userId, message, actionItemId }, null, 2));

  try {
    // Record into notifications table
    await db.insert(notifications).values({
      userId,
      actionItemId,
      type: "whatsapp_alert",
      channel: "whatsapp",
      payload: { message, scheduledAt: timestamp },
      sentAt: new Date(),
    });
  } catch (err) {
    console.error("[WHATSAPP-SERVICE] DB notification record error:", err);
  }

  return {
    success: true,
    messageId: `wa_mock_${Date.now()}`,
  };
}
