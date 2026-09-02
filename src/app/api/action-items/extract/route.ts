import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { parseActionRegister } from "@/lib/action-register-parser";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const rawText = formData.get("text") as string | null;

    if (!file && !rawText) {
      return NextResponse.json(
        { error: "No file or text provided for extraction." },
        { status: 400 }
      );
    }

    // Fetch active users for assignee matching
    const allUsers = await db.query.users.findMany({
      where: eq(users.isActive, true),
      columns: { id: true, name: true, email: true },
    });

    let buffer: Buffer;
    let fileName = "pasted_register.txt";

    if (file) {
      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
      fileName = file.name;
    } else {
      buffer = Buffer.from(rawText || "", "utf8");
    }

    const result = await parseActionRegister(buffer, fileName, allUsers);

    return NextResponse.json({
      success: true,
      documentTitle: result.documentTitle,
      meetingDate: result.meetingDate,
      venue: result.venue,
      items: result.items,
      warnings: result.warnings,
    });
  } catch (err: any) {
    console.error("Action item extraction API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process document." },
      { status: 500 }
    );
  }
}
