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
    // Support multiple files under "files" or single under "file"
    const files = formData.getAll("files") as File[];
    if (files.length === 0) {
      const single = formData.get("file") as File | null;
      if (single) files.push(single);
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No Excel files provided. Please upload an Excel spreadsheet (.xlsx, .xls)." },
        { status: 400 }
      );
    }

    // Verify all files are Excel files
    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext !== "xlsx" && ext !== "xls") {
        return NextResponse.json(
          { error: `File "${file.name}" is not an Excel file. Only Excel spreadsheets (.xlsx, .xls) are supported.` },
          { status: 400 }
        );
      }
    }

    // Fetch active users for assignee matching
    const allUsers = await db.query.users.findMany({
      where: eq(users.isActive, true),
      columns: { id: true, name: true, email: true },
    });

    const documentSummaries: Array<{ name: string; title: string; count: number }> = [];
    let allItems: any[] = [];
    let allWarnings: string[] = [];
    let primaryTitle = "";

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const result = await parseActionRegister(buffer, file.name, allUsers);

      const docTitle = result.documentTitle || file.name.replace(/\.[^/.]+$/, "");
      if (!primaryTitle) primaryTitle = docTitle;

      // Tag items with source document name
      const taggedItems = (result.items || []).map((it) => ({
        ...it,
        sourceDocument: docTitle,
      }));

      documentSummaries.push({
        name: file.name,
        title: docTitle,
        count: taggedItems.length,
      });

      allItems = allItems.concat(taggedItems);
      if (result.warnings?.length) {
        allWarnings.push(...result.warnings.map((w) => `[${file.name}] ${w}`));
      }
    }

    const displayTitle =
      files.length > 1
        ? `${files.length} Excel Registers (${allItems.length} deliverables)`
        : primaryTitle;

    return NextResponse.json({
      success: true,
      documentTitle: displayTitle,
      documents: documentSummaries,
      items: allItems,
      warnings: allWarnings,
    });
  } catch (err: any) {
    console.error("Action item extraction API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process document." },
      { status: 500 }
    );
  }
}
