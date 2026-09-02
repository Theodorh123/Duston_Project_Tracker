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
  status: "not_started" | "in_progress" | "done";
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
    const uNameLower = (u.name || "").toLowerCase();
    const uEmailLower = (u.email || "").toLowerCase();

    // Check individual name parts (e.g. "Desmond" in "Desmond Ohene-Asante")
    const parts = uNameLower.split(/\s+/);
    if (parts.some((p) => p.length > 2 && clean.includes(p))) {
      return { matchedUser: u, isExternal: false };
    }

    // Check email prefix if email exists
    if (uEmailLower) {
      const emailPrefix = uEmailLower.split("@")[0].replace(/[._-]/g, " ");
      if (clean.includes(emailPrefix) || emailPrefix.includes(clean)) {
        return { matchedUser: u, isExternal: false };
      }
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
 * Ensure browser DOM globals required by PDF parsers in Node.js runtime are available
 */
function ensurePdfEnvironment() {
  if (typeof (globalThis as any).DOMMatrix === "undefined" || typeof (globalThis as any).DOMMatrix !== "function") {
    class DOMMatrixPolyfill {
      a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
      m11 = 1; m12 = 0; m21 = 0; m22 = 1; m41 = 0; m42 = 0;
      is2D = true; isIdentity = true;
      constructor(init?: any) {
        if (Array.isArray(init) && init.length >= 6) {
          this.a = this.m11 = init[0];
          this.b = this.m12 = init[1];
          this.c = this.m21 = init[2];
          this.d = this.m22 = init[3];
          this.e = this.m41 = init[4];
          this.f = this.m42 = init[5];
        }
      }
      multiply() { return this; }
      translate() { return this; }
      scale() { return this; }
      rotate() { return this; }
      inverse() { return this; }
      transformPoint(p: any) { return p; }
      toFloat32Array() { return new Float32Array([this.a, this.b, this.c, this.d, this.e, this.f]); }
      toFloat64Array() { return new Float64Array([this.a, this.b, this.c, this.d, this.e, this.f]); }
    }
    (globalThis as any).DOMMatrix = DOMMatrixPolyfill;
    (globalThis as any).DOMMatrixReadOnly = DOMMatrixPolyfill;
  }
  if (typeof (globalThis as any).Path2D === "undefined") {
    (globalThis as any).Path2D = class Path2D {};
  }
  if (typeof (globalThis as any).ImageData === "undefined") {
    (globalThis as any).ImageData = class ImageData {};
  }
}

/**
 * Parse PDF Document using unpdf engine with multi-runtime resilience
 */
async function parsePdfBuffer(
  buffer: Buffer,
  fileName: string,
  users: UserSummary[],
  baseDate: Date
): Promise<ParsedRegisterResult> {
  const warnings: string[] = [];

  try {
    ensurePdfEnvironment();

    let fullText = "";

    // Primary: unpdf (lightweight, zero-canvas, serverless/Node-native)
    try {
      const { extractText } = require("unpdf");
      const uint8 = new Uint8Array(buffer);
      const res = await extractText(uint8, { mergePages: true });
      fullText =
        typeof res.text === "string"
          ? res.text
          : Array.isArray(res.text)
          ? res.text.join("\n\n")
          : "";
    } catch (unpdfErr: any) {
      // Fallback: pdf-parse
      try {
        const pdf = require("pdf-parse");
        const data = await pdf(buffer);
        fullText = data?.text || "";
      } catch (fallbackErr: any) {
        throw new Error(unpdfErr?.message || fallbackErr?.message || "Could not read PDF");
      }
    }

    if (!fullText || !fullText.trim()) {
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
  // Search for meeting title in first 8 lines
  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    const l = lines[i];
    if (
      l.toLowerCase().includes("minutes") ||
      l.toLowerCase().includes("meeting") ||
      l.toLowerCase().includes("session") ||
      l.toLowerCase().includes("working") ||
      l.toLowerCase().includes("register") ||
      l.toLowerCase().includes("review") ||
      l.toLowerCase().includes("board")
    ) {
      documentTitle = l;
      break;
    }
  }

  // 1. Locate explicitly captioned Action Items / Action Register table
  const tableCaptions = [
    /\baction\s*items?\b/i,
    /\baction\s*register\b/i,
    /\baction\s*points?\b/i,
    /\baction\s*log\b/i,
    /\baction\s*tracker\b/i,
    /\bsummary\s*of\s*(?:key\s*)?actions?\b/i,
    /\bmatters\s*arising\b/i,
    /\bkey\s*actions?\b/i,
    /\bdeliverables?\s*(?:register|table|tracker)?\b/i,
    /\bnext\s*steps?\b/i,
    /\btable\s*of\s*actions?\b/i,
  ];

  let tableStartIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    for (const c of tableCaptions) {
      if (c.test(lines[i])) {
        tableStartIndex = i;
        break;
      }
    }
    if (tableStartIndex !== -1) break;
  }

  if (tableStartIndex === -1) {
    return {
      documentTitle: documentTitle || cleanFileName(fileName),
      items: [],
      warnings: [
        "No Action Items or Action Register table found. The document must contain a table explicitly captioned 'Action Items' or 'Action Register'.",
      ],
    };
  }

  // 2. Identify the boundary of the Action Items table
  const endCaptions = [
    /\b(any other business|a\.?o\.?b\.?|adjournment|next meeting|signatures?|prepared by|approved by|distribution list|appendix [a-z0-9])\b/i,
    /^\d+(\.\d+)*\s+(any other|adjournment|conclusion|next meeting|aob)/i,
  ];

  const tableLines: string[] = [];
  for (let i = tableStartIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (endCaptions.some((ec) => ec.test(line))) {
      break;
    }
    tableLines.push(line);
  }

  const headerKeywords = [
    "action item",
    "action",
    "deliverable",
    "responsible",
    "responsible party",
    "assignee",
    "action by",
    "deadline",
    "target date",
    "timeline",
    "due date",
    "status",
  ];

  const sectionHeaderBlacklist = [
    "purpose of meeting",
    "attendance",
    "agenda",
    "background",
    "market analysis",
    "pricing strategy",
    "discussion",
    "presentation",
    "opening remarks",
  ];

  // Strategy 1: Parse rows delimited by |, \t, or 2+ consecutive spaces
  let foundDelimited = false;
  for (const line of tableLines) {
    const lower = line.toLowerCase();

    // Skip table header row
    if (headerKeywords.filter((k) => lower.includes(k)).length >= 2) {
      continue;
    }

    let parts: string[] = [];
    if (line.includes("|")) {
      parts = line.split("|").map((p) => p.trim()).filter(Boolean);
    } else if (line.includes("\t")) {
      parts = line.split("\t").map((p) => p.trim()).filter(Boolean);
    } else if (/\s{2,}/.test(line)) {
      parts = line.split(/\s{2,}/).map((p) => p.trim()).filter(Boolean);
    }

    if (parts.length >= 2) {
      foundDelimited = true;
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

      // Validate title is an actionable item, not a section header
      const titleLower = title.toLowerCase();
      const isBlacklisted = sectionHeaderBlacklist.some((b) => titleLower.includes(b));
      const isHeaderWord = titleLower === "action item" || titleLower === "deliverable" || titleLower === "description";

      if (title && title.length > 3 && !isBlacklisted && !isHeaderWord) {
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
          notes: isExternal ? `Outsider: ${responsible}` : undefined,
        });
      }
    }
  }

  // Strategy 2: If no delimited rows found, parse sequential table cells
  if (!foundDelimited || items.length === 0) {
    const cleanCells = tableLines.filter((l) => {
      const lower = l.toLowerCase();
      return !(
        lower === "no." ||
        lower === "no" ||
        lower === "#" ||
        lower === "item" ||
        lower === "action item" ||
        lower === "responsible" ||
        lower === "responsible party" ||
        lower === "deadline" ||
        lower === "target date" ||
        lower === "status"
      );
    });

    let i = 0;
    while (i < cleanCells.length) {
      const line = cleanCells[i];
      const numMatch = line.match(/^(\d+)[\.:]?$/);

      if (numMatch) {
        const num = numMatch[1];
        const title = cleanCells[i + 1] || "";
        const responsible = cleanCells[i + 2] || "";
        const deadline = cleanCells[i + 3] || "";

        const titleLower = title.toLowerCase();
        const isBlacklisted = sectionHeaderBlacklist.some((b) => titleLower.includes(b));

        if (title && title.length > 3 && !/^\d+$/.test(title) && !isBlacklisted) {
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
            notes: isExternal ? `Outsider: ${responsible}` : undefined,
          });

          // Advance past cell block: check if next cell is a status word
          const possibleStatus = cleanCells[i + 4] || "";
          if (/^(not started|in progress|open|ongoing|done|completed|pending|tba)$/i.test(possibleStatus)) {
            i += 5;
          } else {
            i += 4;
          }
          continue;
        }
      } else {
        // Check for inline row: "1. [Title] - [Responsible] ([Deadline])"
        const inlineMatch = line.match(/^(\d+)[\.\s]+(.+?)(?:\s*[-–]\s*(.+?))?(?:\s*\[(.+?)\]|\s*\((.+?)\))?$/);
        if (inlineMatch && inlineMatch[2]) {
          const num = inlineMatch[1];
          const title = inlineMatch[2].trim();
          const responsible = (inlineMatch[3] || "").trim();
          const deadline = (inlineMatch[4] || inlineMatch[5] || "").trim();

          const titleLower = title.toLowerCase();
          const isBlacklisted = sectionHeaderBlacklist.some((b) => titleLower.includes(b));

          if (title.length > 5 && !isBlacklisted) {
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
              notes: isExternal ? `Outsider: ${responsible}` : undefined,
            });
          }
        }
      }
      i++;
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
