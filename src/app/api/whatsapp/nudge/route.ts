import { NextRequest, NextResponse } from "next/server";
import { sendWhatsApp } from "@/lib/services/whatsapp";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any)?.role;
  if (role !== "ea") {
    return NextResponse.json(
      { error: "Forbidden: WhatsApp push notifications are strictly reserved for the Executive Assistant." },
      { status: 403 }
    );
  }

  const { userId, actionItemId, message } = await req.json();

  if (!userId || !message) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const result = await sendWhatsApp(userId, message, actionItemId);
  return NextResponse.json(result);
}
