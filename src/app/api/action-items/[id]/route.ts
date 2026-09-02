import { NextRequest, NextResponse } from "next/server";
import { getActionItemById, updateActionItemField } from "@/lib/actions/action-items";
import { auth } from "@/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = await getActionItemById(id);
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(item);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id } = await params;
  const body = await req.json();

  const actorId = session?.user?.id || "00000000-0000-0000-0000-000000000000";

  for (const [field, value] of Object.entries(body)) {
    await updateActionItemField(id, field, value, actorId);
  }

  return NextResponse.json({ success: true });
}
