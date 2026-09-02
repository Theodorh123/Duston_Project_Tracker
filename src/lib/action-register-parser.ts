import * as XLSX from "xlsx";
import { format, addDays, parse, isValid } from "date-fns";

export interface ParsedActionItem {
  id: string; // client temporary ID
  itemNumber?: number | string;
  title: string;
  rawResponsible: string;
  matchedUserId: string | null;
  matchedUserName: string | null;
  isExternal: boolean;
  rawDeadline: string;
  parsedDeadline: string; // YYYY-MM-DD
  isDeadlineTBA: boolean;
  priority: "low" | "medium" | "high" | "critical";
  status: "not_started" | "in_progress" | "blocked" | "done";
  notes?: string;
}

export interface ParsedRegisterResult {
  documentTitle: string;
  meetingDate?: string;
  venue?: string;
  items: ParsedActionItem[];
  warnings: string[];
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
}

/**
 * Intelligent Resolver for textual deadlines (e.g. "After the meeting", "TBA", "Immediate", "15 Sept 2026")
 */
export function resolveDeadline(rawDeadline: string, baseDate?: Date): {
  parsedDate: string;
  rawText: string;
  isTBA: boolean;
} {
  const clean = (rawDeadline || "").trim();
  const base = baseDate || new Date();
  const lower = clean.toLowerCase();

  // If blank or TBA
  if (!clean || lower === "tba" || lower === "tbd" || lower.includes("pending") || lower.includes("to be agreed")) {
    return {
      parsedDate: format(addDays(base, 14), "yyyy-MM-dd"),
      rawText: clean || "TBA",
      isTBA: true,
    };
  }

  // After the meeting
  if (lower.includes("after the meeting") || lower.includes("post meeting") || lower.includes("following meeting")) {
    return {
      parsedDate: format(addDays(base, 3), "yyyy-MM-dd"),
      rawText: clean,
      isTBA: false,
    };
  }

  // Immediate / Urgent
  if (lower.includes("immediate") || lower.includes("asap") || lower.includes("urgent")) {
    return {
      parsedDate: format(addDays(base, 1), "yyyy-MM-dd"),
      rawText: clean,
      isTBA: false,
    };
  }

  // Next week / End of week
  if (lower.includes("next week")) {
    return {
      parsedDate: format(addDays(base, 7), "yyyy-MM-dd"),
      rawText: clean,
      isTBA: false,
    };
  }

  if (lower.includes("end of week") || lower.includes("this week")) {
    return {
      parsedDate: format(addDays(base, 4), "yyyy-MM-dd"),
      rawText: clean,
      isTBA: false,
    };
  }

  // Check Excel serial number (e.g. 45540)
  const num = Number(clean);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    try {
      const parsedExcelDate = new Date(Math.round((num - 25569) * 86400 * 1000));
      if (isValid(parsedExcelDate)) {
        return {
          parsedDate: format(parsedExcelDate, "yyyy-MM-dd"),
          rawText: clean,
          isTBA: false,
        };
      }
    } catch {}
  }

  // Try standard date formats
  const standardFormats = [
    "yyyy-MM-dd",
    "dd/MM/yyyy",
    "MM/dd/yyyy",
    "dd-MM-yyyy",
    "d MMM yyyy",
    "d MMMM yyyy",
    "MMM d, yyyy",
    "MMMM d, yyyy",
    "d MMM",
    "MMM d",
  ];

  for (const fmt of standardFormats) {
    try {
      const parsed = parse(clean, fmt, base);
      if (isValid(parsed)) {
        // If year was omitted, default to current year
        if (parsed.getFullYear() === 1970) {
          parsed.setFullYear(base.getFullYear());
        }
        return {
          parsedDate: format(parsed, "yyyy-MM-dd"),
          rawText: clean,
          isTBA: false,
        };
      }
    } catch {}
  }

  // Native JS Date fallback
  const nativeDate = new Date(clean);
  if (isValid(nativeDate) && nativeDate.getFullYear() > 2000) {
    return {
      parsedDate: format(nativeDate, "yyyy-MM-dd"),
      rawText: clean,
      isTBA: false,
    };
  }

  // Fallback: 7 days out
  return {
    parsedDate: format(addDays(base, 7), "yyyy-MM-dd"),
    rawText: clean,
    isTBA: true,
  };
}

/**
 * Intelligent Assignee Matcher for Executive Team & Counterparties
 */
export function matchAssignee(
  rawName: string,
  users: UserSummary[]
): {
  matchedUser: UserSummary | null;
  isExternal: boolean;
} {
  const clean = (rawName || "").trim().toLowerCase();
  if (!clean) {
    return { matchedUser: null, isExternal: false };
  }

  // Check known counterparties or external entities
  const externalKeywords = ["totsa", "bank", "ministry", "norva", "contractor", "consultant", "vendor", "external", "ecowas", "ebid", "barge"];
  const isExplicitExternal = externalKeywords.some((kw) => clean.includes(kw));

  // Try exact first name / last name match
  for (const u of users) {
    const uNameLower = u.name.toLowerCase();
    const uEmailLower = u.email.toLowerCase();

    // Check individual name parts (e.g. "Desmond" in "Desmond Ohene-Asante")
    const parts = uNameLower.split(/\s+/);
    if (parts.some((p) => p.length > 2 && clean.includes(p))) {
      return { matchedUser: u, isExternal: false };
    }

    // Check email prefix
    const emailPrefix = uEmailLower.split("@")[0].replace(/[._-]/g, " ");
    if (clean.includes(emailPrefix) || emailPrefix.includes(clean)) {
      return { matchedUser: u, isExternal: false };
    }
  }

  return {
    matchedUser: null,
    isExternal: isExplicitExternal,
  };
}

/**
 * Main parser: takes a file buffer (Excel or PDF or text), extracts metadata and action items table
 */
export async function parseActionRegister(
  buffer: Buffer,
  fileName: string,
  users: UserSummary[],
  options?: { defaultDate?: string }
): Promise<ParsedRegisterResult> {
  const warnings: string[] = [];
  const baseDate = options?.defaultDate ? new Date(options.defaultDate) : new Date();
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  // 1. PDF Parsing
  if (ext === "pdf") {
    return parsePdfBuffer(buffer, fileName, users, baseDate);
  }

  // 2. Excel & CSV Parsing
  if (["xlsx", "xls", "csv"].includes(ext)) {
    return parseExcelBuffer(buffer, fileName, users, baseDate);
  }

  // 3. Fallback: plain text
  const textContent = buffer.toString("utf8");
  return parseTextContent(textContent, fileName, users, baseDate);
}

/**
 * Parse Excel Spreadsheets (.xlsx, .xls, .csv)
 */
function parseExcelBuffer(
  buffer: Buffer,
  fileName: string,
  users: UserSummary[],
  baseDate: Date
): ParsedRegisterResult {
  const warnings: string[] = [];
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  if (!ws) {
    return {
      documentTitle: cleanFileName(fileName),
      items: [],
      warnings: ["No worksheet found in Excel file."],
    };
  }

  // Convert to 2D array
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  if (!rows || rows.length === 0) {
    return {
      documentTitle: cleanFileName(fileName),
      items: [],
      warnings: ["Worksheet is empty."],
    };
  }

  // Look for title in the first 5 rows
  let documentTitle = "";
  let headerRowIndex = -1;

  // Header column index mappings
  let colIndexNo = -1;
  let colIndexItem = -1;
  let colIndexResponsible = -1;
  let colIndexDeadline = -1;

  for (let r = 0; r < Math.min(rows.length, 25); r++) {
    const row = rows[r];
    const rowStr = row.map((cell) => String(cell).trim().toLowerCase()).join(" ");

    // Check if this row is the header row
    const hasItem = rowStr.includes("action item") || rowStr.includes("action") || rowStr.includes("task") || rowStr.includes("deliverable") || rowStr.includes("description");
    const hasResponsible = rowStr.includes("responsible") || rowStr.includes("assignee") || rowStr.includes("action by") || rowStr.includes("owner") || rowStr.includes("pic");
    const hasDeadline = rowStr.includes("deadline") || rowStr.includes("due date") || rowStr.includes("target date") || rowStr.includes("timeline");

    if (hasItem && (hasResponsible || hasDeadline)) {
      headerRowIndex = r;
      // Map columns
      row.forEach((cell: any, c: number) => {
        const h = String(cell).trim().toLowerCase();
        if (h === "no." || h === "no" || h === "#" || h.includes("item no")) colIndexNo = c;
        else if (h.includes("action item") || h.includes("task") || h.includes("deliverable") || h.includes("description") || h === "action") colIndexItem = c;
        else if (h.includes("responsible") || h.includes("assignee") || h.includes("owner") || h.includes("action by")) colIndexResponsible = c;
        else if (h.includes("deadline") || h.includes("due") || h.includes("target date") || h.includes("timeline")) colIndexDeadline = c;
      });
      break;
    } else if (r < 4 && row[0] && String(row[0]).trim().length > 5 && !documentTitle) {
      documentTitle = String(row[0]).trim();
    }
  }

  if (headerRowIndex === -1) {
    // Fallback heuristic: assume col 1 is action item, col 2 is responsible, col 3 is deadline
    headerRowIndex = 0;
    colIndexItem = 1;
    colIndexResponsible = 2;
    colIndexDeadline = 3;
    warnings.push("Could not find standard table headers; inferred columns automatically.");
  }

  if (colIndexItem === -1) {
    colIndexItem = colIndexNo === 0 ? 1 : 0;
  }
  if (colIndexResponsible === -1) {
    colIndexResponsible = colIndexItem + 1;
  }
  if (colIndexDeadline === -1) {
    colIndexDeadline = colIndexResponsible + 1;
  }

  const items: ParsedActionItem[] = [];

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    const rawItem = String(row[colIndexItem] || "").trim();
    const rawResponsible = colIndexResponsible >= 0 ? String(row[colIndexResponsible] || "").trim() : "";
    const rawDeadline = colIndexDeadline >= 0 ? String(row[colIndexDeadline] || "").trim() : "";
    const rawNo = colIndexNo >= 0 ? String(row[colIndexNo] || "").trim() : String(items.length + 1);

    if (!rawItem || rawItem.length < 3) continue;

    // Resolve Assignee & Deadline
    const { matchedUser, isExternal } = matchAssignee(rawResponsible, users);
    const { parsedDate, rawText, isTBA } = resolveDeadline(rawDeadline, baseDate);

    items.push({
      id: `item-${Date.now()}-${r}`,
      itemNumber: rawNo || items.length + 1,
      title: rawItem,
      rawResponsible,
      matchedUserId: matchedUser?.id || null,
      matchedUserName: matchedUser?.name || null,
      isExternal,
      rawDeadline: rawText,
      parsedDeadline: parsedDate,
      isDeadlineTBA: isTBA,
      priority: "medium",
      status: "not_started",
      notes: isExternal ? `Counterparty: ${rawResponsible}` : undefined,
    });
  }

  return {
    documentTitle: documentTitle || cleanFileName(fileName),
    items,
    warnings,
  };
}

/**
 * Parse PDF Document using pdf-parse native table & line detection
 */
async function parsePdfBuffer(
  buffer: Buffer,
  fileName: string,
  users: UserSummary[],
  baseDate: Date
): Promise<ParsedRegisterResult> {
  const warnings: string[] = [];

  try {
    const { PDFParse } = require("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText();
    await parser.destroy();

    const fullText = textResult?.text || "";
    if (!fullText.trim()) {
      return {
        documentTitle: cleanFileName(fileName),
        items: [],
        warnings: ["No text content could be extracted from the PDF."],
      };
    }

    return parseTextContent(fullText, fileName, users, baseDate);
  } catch (err: any) {
    warnings.push(`PDF parsing encountered an issue: ${err.message}`);
    return {
      documentTitle: cleanFileName(fileName),
      items: [],
      warnings,
    };
  }
}

/**
 * Parse plain text, tab-delimited, pipe-delimited, or line-delimited register
 */
function parseTextContent(
  text: string,
  fileName: string,
  users: UserSummary[],
  baseDate: Date
): ParsedRegisterResult {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: ParsedActionItem[] = [];
  const warnings: string[] = [];

  let documentTitle = "";
  // Search for meeting title in first 5 lines
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const l = lines[i];
    if (
      l.toLowerCase().includes("minutes") ||
      l.toLowerCase().includes("meeting") ||
      l.toLowerCase().includes("session") ||
      l.toLowerCase().includes("working") ||
      l.toLowerCase().includes("register") ||
      l.toLowerCase().includes("board")
    ) {
      documentTitle = l;
      break;
    }
  }

  // Regex to match numbered table rows like:
  // 1 | Contact Standard Bank... | Desmond | After the meeting
  // or: 1 \t Contact Standard Bank... \t Desmond \t TBA
  // or: 1. Contact Standard Bank... - Desmond (Deadline: After the meeting)
  const numberedRowRegex = /^(\d+)[\.\s\|\t]+(.+)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if table row with pipe or tab
    if (line.includes("|") || line.includes("\t")) {
      const delimiter = line.includes("\t") ? "\t" : "|";
      const parts = line.split(delimiter).map((p) => p.trim()).filter(Boolean);

      // Skip table header row
      const lower0 = (parts[0] || "").toLowerCase();
      if (lower0 === "no." || lower0 === "no" || lower0 === "action item" || lower0 === "item") {
        continue;
      }

      if (parts.length >= 3) {
        // [No, Action Item, Responsible, Deadline] OR [Action Item, Responsible, Deadline]
        let itemNumber: string | undefined;
        let title = "";
        let responsible = "";
        let deadline = "";

        if (/^\d+$/.test(parts[0])) {
          itemNumber = parts[0];
          title = parts[1];
          responsible = parts[2] || "";
          deadline = parts[3] || "";
        } else {
          title = parts[0];
          responsible = parts[1] || "";
          deadline = parts[2] || "";
        }

        if (title && title.length > 3) {
          const { matchedUser, isExternal } = matchAssignee(responsible, users);
          const { parsedDate, rawText, isTBA } = resolveDeadline(deadline, baseDate);

          items.push({
            id: `item-${Date.now()}-${items.length}`,
            itemNumber: itemNumber || items.length + 1,
            title,
            rawResponsible: responsible,
            matchedUserId: matchedUser?.id || null,
            matchedUserName: matchedUser?.name || null,
            isExternal,
            rawDeadline: rawText,
            parsedDeadline: parsedDate,
            isDeadlineTBA: isTBA,
            priority: "medium",
            status: "not_started",
            notes: isExternal ? `Counterparty: ${responsible}` : undefined,
          });
        }
      }
    } else if (numberedRowRegex.test(line)) {
      // Line like: "1. Contact Standard Bank to progress final execution..."
      const match = line.match(numberedRowRegex);
      if (match) {
        const num = match[1];
        const rest = match[2];

        // Check if line contains responsible in parens or after dash
        // e.g. "Review bitumen opportunity [Desmond] [TBA]"
        let title = rest;
        let responsible = "";
        let deadline = "";

        const bracketMatch = rest.match(/(.+?)\s*\[(.*?)\]\s*\[(.*?)\]$/);
        if (bracketMatch) {
          title = bracketMatch[1];
          responsible = bracketMatch[2];
          deadline = bracketMatch[3];
        }

        if (title && title.length > 5) {
          const { matchedUser, isExternal } = matchAssignee(responsible, users);
          const { parsedDate, rawText, isTBA } = resolveDeadline(deadline, baseDate);

          items.push({
            id: `item-${Date.now()}-${items.length}`,
            itemNumber: num,
            title,
            rawResponsible: responsible,
            matchedUserId: matchedUser?.id || null,
            matchedUserName: matchedUser?.name || null,
            isExternal,
            rawDeadline: rawText,
            parsedDeadline: parsedDate,
            isDeadlineTBA: isTBA,
            priority: "medium",
            status: "not_started",
          });
        }
      }
    }
  }

  return {
    documentTitle: documentTitle || cleanFileName(fileName),
    items,
    warnings,
  };
}

function cleanFileName(fileName: string): string {
  const withoutExt = fileName.replace(/\.[^/.]+$/, "");
  return withoutExt
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
