import { NextRequest, NextResponse } from "next/server";
import { getActionItemById, updateActionItem, deleteActionItem } from "@/lib/actions/action-items";
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

  const res = await updateActionItem(id, body, actorId);
  if (!res.success) {
    return NextResponse.json({ error: res.error }, { status: 403 });
  }

  return NextResponse.json({ success: true, item: res.item });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = ((session.user as any)?.role || "").toLowerCase().trim();
  if (!["admin", "ceo", "ea"].includes(role)) {
    return NextResponse.json(
      { error: "Permission denied: Only EA, Admin, or CEO can delete action items." },
      { status: 403 }
    );
  }

  const { id } = await params;
  const result = await deleteActionItem(id, session.user.id);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
