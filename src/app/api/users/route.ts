import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userList = await db.query.users.findMany({
    where: eq(users.isActive, true),
    columns: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: [asc(users.name)],
  });

  return NextResponse.json(userList);
}
