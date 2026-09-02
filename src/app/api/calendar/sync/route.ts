import { NextRequest, NextResponse } from "next/server";
import { syncCalendarFeed } from "@/lib/actions/calendar";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await syncCalendarFeed({
      feedUrl: body.feedUrl,
      icsContent: body.icsContent,
      entityId: body.entityId,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to synchronize calendar." },
      { status: 500 }
    );
  }
}
