import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comments, activityLog } from "@/lib/db/schema";
import { auth } from "@/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id } = await params;
  const { body } = await req.json();

  if (!body?.trim()) {
    return NextResponse.json({ error: "Empty comment" }, { status: 400 });
  }

  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [newComment] = await db
    .insert(comments)
    .values({
      actionItemId: id,
      userId,
      body: body.trim(),
    })
    .returning();

  await db.insert(activityLog).values({
    actionItemId: id,
    actorId: userId,
    eventType: "comment_added",
    note: "Added a comment",
  });

  return NextResponse.json({ success: true, comment: newComment });
}
