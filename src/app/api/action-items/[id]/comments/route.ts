import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comments, activityLog, users, actionItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

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
    note: "Added an update",
  });

  // Revalidate views across the app so everyone sees the latest updates immediately
  revalidatePath("/");
  revalidatePath("/action-items");
  revalidatePath("/projects");
  revalidatePath("/ea-view");
  revalidatePath("/ceo-view");

  const author = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { name: true },
  });

  return NextResponse.json({
    success: true,
    comment: {
      ...newComment,
      userName: author?.name || "Team Member",
    },
  });
}
