import { NextRequest, NextResponse } from "next/server";
import { sendWhatsApp } from "@/lib/services/whatsapp";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, actionItemId, message } = await req.json();

  if (!userId || !message) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const result = await sendWhatsApp(userId, message, actionItemId);
  return NextResponse.json(result);
}
