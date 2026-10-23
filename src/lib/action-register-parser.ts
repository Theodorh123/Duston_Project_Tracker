import * as XLSX from "xlsx";
import { format, addDays, parse, isValid } from "date-fns";

export interface ParsedActionItem {
  id: string; // client temporary ID
  itemNumber?: number | string;
  sourceDocument?: string;
  title: string;
  rawResponsible: string;
  matchedUserId: string | null;
  matchedUserName: string | null;
  coAssignees?: Array<{ id: string; name: string }>;
  isExternal: boolean;
  needsInternalLead?: boolean;
  rawDeadline: string;
  parsedDeadline: string; // YYYY-MM-DD
  isDeadlineTBA: boolean;
  assumedTwoWeeks?: boolean;
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
 * Implicit or TBA/TBC deadlines assume 2 weeks (14 days) from base date.
 */
export function resolveDeadline(rawDeadline: string, baseDate?: Date): {
  parsedDate: string;
  rawText: string;
  isTBA: boolean;
  assumedTwoWeeks: boolean;
} {
  const clean = (rawDeadline || "").trim();
  const base = baseDate || new Date();
  const lower = clean.toLowerCase();

  // If blank or non-explicit (TBA, TBC, TBD, etc.): assume 2 weeks (14 days)
  const isImplicit =
    !clean ||
    lower === "tba" ||
    lower === "tbc" ||
    lower === "tbd" ||
    lower === "n/a" ||
    lower === "na" ||
    lower === "-" ||
    lower === "--" ||
    lower === "none" ||
    lower === "to be actioned" ||
    lower === "to_be_actioned" ||
    lower.includes("to be actioned") ||
    lower.includes("to be confirmed") ||
    lower.includes("to be determined") ||
    lower.includes("pending") ||
    lower.includes("to be agreed") ||
    lower.includes("tba") ||
    lower.includes("tbc") ||
    lower.includes("tbd");

  if (isImplicit) {
    return {
      parsedDate: format(addDays(base, 14), "yyyy-MM-dd"),
      rawText: clean || "TBA (2 weeks assumed)",
      isTBA: true,
      assumedTwoWeeks: true,
    };
  }

  // If already standard ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return {
      parsedDate: clean,
      rawText: clean,
      isTBA: false,
      assumedTwoWeeks: false,
    };
  }

  // After the meeting
  if (lower.includes("after the meeting") || lower.includes("post meeting") || lower.includes("following meeting")) {
    return {
      parsedDate: format(addDays(base, 3), "yyyy-MM-dd"),
      rawText: clean,
      isTBA: false,
      assumedTwoWeeks: false,
    };
  }

  // Immediate / Urgent
  if (lower.includes("immediate") || lower.includes("asap") || lower.includes("urgent")) {
    return {
      parsedDate: format(addDays(base, 1), "yyyy-MM-dd"),
      rawText: clean,
      isTBA: false,
      assumedTwoWeeks: false,
    };
  }

  // Next week / End of week
  if (lower.includes("next week")) {
    return {
      parsedDate: format(addDays(base, 7), "yyyy-MM-dd"),
      rawText: clean,
      isTBA: false,
      assumedTwoWeeks: false,
    };
  }

  if (lower.includes("end of week") || lower.includes("this week")) {
    return {
      parsedDate: format(addDays(base, 4), "yyyy-MM-dd"),
      rawText: clean,
      isTBA: false,
      assumedTwoWeeks: false,
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
          assumedTwoWeeks: false,
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
          assumedTwoWeeks: false,
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
      assumedTwoWeeks: false,
    };
  }

  // Fallback for non-explicit dates: assume 2 weeks (14 days)
  return {
    parsedDate: format(addDays(base, 14), "yyyy-MM-dd"),
    rawText: clean,
    isTBA: true,
    assumedTwoWeeks: true,
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
  coAssignees: UserSummary[];
  isExternal: boolean;
  needsInternalLead: boolean;
} {
  const clean = (rawName || "").trim();
  if (!clean) {
    return { matchedUser: null, coAssignees: [], isExternal: false, needsInternalLead: true };
  }

  const cleanLower = clean.toLowerCase();
  const externalKeywords = [
    "totsa", "bank", "ministry", "norva", "contractor", "consultant",
    "vendor", "external", "ecowas", "ebid", "barge", "gra", "stanbic", "authority", "customs"
  ];
  const isExplicitExternal = externalKeywords.some((kw) => cleanLower.includes(kw));

  // Split multiple names by "/", "&", " and ", ","
  const segments = clean
    .split(/[\/&,]|(?:\s+and\s+)/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const matchedUsers: UserSummary[] = [];

  for (const seg of segments) {
    const segLower = seg.toLowerCase();
    for (const u of users) {
      if (matchedUsers.some((m) => m.id === u.id)) continue;

      const uNameLower = (u.name || "").toLowerCase();
      const uEmailLower = (u.email || "").toLowerCase();

      // Check name parts (first name or surname > 2 chars)
      const parts = uNameLower.split(/\s+/);
      const matchesName = parts.some((p) => p.length > 2 && segLower.includes(p));

      // Check email prefix if email exists
      let matchesEmail = false;
      if (uEmailLower) {
        const emailPrefix = uEmailLower.split("@")[0].replace(/[._-]/g, " ");
        matchesEmail = segLower.includes(emailPrefix) || emailPrefix.includes(segLower);
      }

      if (matchesName || matchesEmail) {
        matchedUsers.push(u);
        break;
      }
    }
  }

  const primaryUser = matchedUsers[0] || null;
  const coAssignees = matchedUsers.slice(1);
  const isExternal =
    isExplicitExternal ||
    (!primaryUser &&
      clean.length > 0 &&
      !cleanLower.includes("tba") &&
      !cleanLower.includes("team") &&
      !cleanLower.includes("management") &&
      !cleanLower.includes("all"));

  return {
    matchedUser: primaryUser,
    coAssignees,
    isExternal,
    needsInternalLead: !primaryUser,
  };
}

/**
 * Main parser: takes a file buffer (Excel spreadsheets only: .xlsx, .xls), extracts metadata and action items table
 */
export async function parseActionRegister(
  buffer: Buffer,
  fileName: string,
  users: UserSummary[],
  options?: { defaultDate?: string }
): Promise<ParsedRegisterResult> {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  // Strictly allow ONLY Excel Spreadsheets (.xlsx, .xls)
  if (["xlsx", "xls"].includes(ext)) {
    const baseDate = options?.defaultDate ? new Date(options.defaultDate) : new Date();
    return parseExcelBuffer(buffer, fileName, users, baseDate);
  }

  throw new Error("Only Excel files (.xlsx, .xls) are allowed for importing action items.");
}

/**
 * Parse Excel Spreadsheets (.xlsx, .xls, .csv)
 */
/**
 * Parse Excel Spreadsheets (.xlsx, .xls)
 * Resilient multi-sheet workbook scanner with adaptive column inference
 */
function parseExcelBuffer(
  buffer: Buffer,
  fileName: string,
  users: UserSummary[],
  baseDate: Date
): ParsedRegisterResult {
  const warnings: string[] = [];
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });

  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    return {
      documentTitle: cleanFileName(fileName),
      items: [],
      warnings: ["No worksheet found in Excel file."],
    };
  }

  // Rank sheets: prioritize sheets named "action", "register", "deliverable", "tracker", "minute", "task"
  const candidateSheets = [...wb.SheetNames].sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    const aScore = /action|register|deliverable|tracker|minute|task/.test(aLower) ? 1 : 0;
    const bScore = /action|register|deliverable|tracker|minute|task/.test(bLower) ? 1 : 0;
    return bScore - aScore;
  });

  let bestResult: {
    sheetName: string;
    documentTitle: string;
    items: ParsedActionItem[];
    warnings: string[];
  } | null = null;

  for (const sName of candidateSheets) {
    const ws = wb.Sheets[sName];
    if (!ws) continue;
    const result = parseSingleWorksheet(ws, sName, fileName, users, baseDate);
    if (result.items.length > 0) {
      if (!bestResult || result.items.length > bestResult.items.length) {
        bestResult = { ...result, sheetName: sName };
      }
      // If a sheet with a healthy number of items was found, prefer it
      if (result.items.length >= 3) break;
    } else if (!bestResult) {
      bestResult = { ...result, sheetName: sName };
    }
  }

  if (!bestResult || bestResult.items.length === 0) {
    const firstSheet = wb.Sheets[wb.SheetNames[0]];
    const fallback = parseSingleWorksheet(firstSheet, wb.SheetNames[0], fileName, users, baseDate);
    return {
      documentTitle: fallback.documentTitle || cleanFileName(fileName),
      items: fallback.items,
      warnings: fallback.warnings.length > 0 ? fallback.warnings : ["No action items found in worksheet. Please check sheet headers."],
    };
  }

  return {
    documentTitle: bestResult.documentTitle,
    items: bestResult.items,
    warnings: bestResult.warnings,
  };
}

/**
 * Parse an individual Excel worksheet
 */
function parseSingleWorksheet(
  ws: XLSX.WorkSheet,
  sheetName: string,
  fileName: string,
  users: UserSummary[],
  baseDate: Date
): {
  documentTitle: string;
  items: ParsedActionItem[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  if (!rows || rows.length === 0) {
    return {
      documentTitle: cleanFileName(fileName),
      items: [],
      warnings: [`Sheet "${sheetName}" is empty.`],
    };
  }

  let documentTitle = "";
  let headerRowIndex = -1;

  let colIndexNo = -1;
  let colIndexItem = -1;
  let colIndexResponsible = -1;
  let colIndexDeadline = -1;
  let colIndexPriority = -1;
  let colIndexStatus = -1;
  let colIndexRemarks = -1;

  // Scan up to 50 rows for the header row
  for (let r = 0; r < Math.min(rows.length, 50); r++) {
    const row = rows[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    const rowStr = row.map((cell) => String(cell || "").trim().toLowerCase()).join(" ");

    const hasItem =
      rowStr.includes("action") ||
      rowStr.includes("task") ||
      rowStr.includes("deliverable") ||
      rowStr.includes("description") ||
      rowStr.includes("activity") ||
      rowStr.includes("activities") ||
      rowStr.includes("matter") ||
      rowStr.includes("point") ||
      rowStr.includes("details");

    const hasResponsible =
      rowStr.includes("responsible") ||
      rowStr.includes("assign") ||
      rowStr.includes("owner") ||
      rowStr.includes("lead") ||
      rowStr.includes("action by") ||
      rowStr.includes("who") ||
      rowStr.includes("person") ||
      rowStr.includes("pic") ||
      rowStr.includes("focal") ||
      rowStr.includes("accountable");

    const hasDeadline =
      rowStr.includes("deadline") ||
      rowStr.includes("due") ||
      rowStr.includes("target") ||
      rowStr.includes("timeline") ||
      rowStr.includes("completion") ||
      rowStr.includes("delivery") ||
      rowStr.includes("by when") ||
      rowStr.includes("when") ||
      rowStr.includes("date");

    const isHeaderCandidate =
      (hasItem && (hasResponsible || hasDeadline)) ||
      (hasResponsible && hasDeadline) ||
      (hasItem && (rowStr.includes("no") || rowStr.includes("s/n") || rowStr.includes("#")));

    if (isHeaderCandidate) {
      headerRowIndex = r;
      row.forEach((cell: any, c: number) => {
        const h = String(cell || "").trim().toLowerCase();
        if (!h) return;

        // Numbering column
        if (
          h === "no." ||
          h === "no" ||
          h === "#" ||
          h === "s/n" ||
          h === "sn" ||
          h === "s.n." ||
          h === "id" ||
          h === "ref" ||
          h === "item" ||
          h.includes("item no") ||
          h.includes("item #") ||
          h.includes("s/n")
        ) {
          if (colIndexNo === -1) colIndexNo = c;
        }
        // Action item / deliverable column
        else if (
          h.includes("action") ||
          h.includes("task") ||
          h.includes("deliverable") ||
          h.includes("description") ||
          h.includes("activity") ||
          h.includes("activities") ||
          h.includes("matter") ||
          h.includes("resolution") ||
          h.includes("decision") ||
          h.includes("point") ||
          h.includes("details")
        ) {
          if (colIndexItem === -1) colIndexItem = c;
        }
        // Responsible / Owner column
        else if (
          h.includes("responsible") ||
          h.includes("assign") ||
          h.includes("owner") ||
          h.includes("lead") ||
          h.includes("action by") ||
          h.includes("who") ||
          h.includes("person") ||
          h.includes("pic") ||
          h.includes("focal") ||
          h.includes("party") ||
          h.includes("accountable")
        ) {
          if (colIndexResponsible === -1) colIndexResponsible = c;
        }
        // Deadline / Timeline column
        else if (
          h.includes("deadline") ||
          h.includes("due") ||
          h.includes("target") ||
          h.includes("timeline") ||
          h.includes("completion") ||
          h.includes("delivery") ||
          h.includes("by when") ||
          h.includes("when") ||
          h.includes("timeframe") ||
          h.includes("schedule") ||
          h.includes("date")
        ) {
          if (colIndexDeadline === -1) colIndexDeadline = c;
        }
        // Priority column
        else if (h.includes("priority") || h.includes("urgency")) {
          if (colIndexPriority === -1) colIndexPriority = c;
        }
        // Status column
        else if (h.includes("status") || h.includes("progress") || h.includes("state")) {
          if (colIndexStatus === -1) colIndexStatus = c;
        }
        // Remarks / Notes column
        else if (h.includes("remark") || h.includes("comment") || h.includes("note") || h.includes("observation")) {
          if (colIndexRemarks === -1) colIndexRemarks = c;
        }
      });
      break;
    } else if (r < 4 && row[0] && String(row[0]).trim().length > 5 && !documentTitle) {
      documentTitle = String(row[0]).trim();
    }
  }

  // Heuristic fallback for column inference if header wasn't matched explicitly
  if (headerRowIndex === -1) {
    headerRowIndex = 0;
    warnings.push("Could not find standard table headers; inferred columns automatically.");
  }

  // If action item column wasn't identified, find the column with the longest average text
  if (colIndexItem === -1) {
    let maxAvgLen = 0;
    let candidateCol = -1;
    const maxCols = Math.min(20, rows[headerRowIndex]?.length || 10);

    for (let c = 0; c < maxCols; c++) {
      if (c === colIndexNo || c === colIndexResponsible || c === colIndexDeadline) continue;
      let totalLen = 0;
      let rowCount = 0;
      for (let r = headerRowIndex + 1; r < Math.min(rows.length, headerRowIndex + 15); r++) {
        const val = String(rows[r]?.[c] || "").trim();
        if (val) {
          totalLen += val.length;
          rowCount++;
        }
      }
      const avg = rowCount > 0 ? totalLen / rowCount : 0;
      if (avg > maxAvgLen) {
        maxAvgLen = avg;
        candidateCol = c;
      }
    }

    if (candidateCol >= 0 && maxAvgLen >= 4) {
      colIndexItem = candidateCol;
    } else {
      colIndexItem = colIndexNo === 0 ? 1 : 0;
    }
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
    if (!Array.isArray(row) || row.length === 0) continue;

    const rawItem = String(row[colIndexItem] || "").trim();
    if (!rawItem || rawItem.length < 2) continue;

    // Skip repeated header rows
    const lowerItem = rawItem.toLowerCase();
    if (
      lowerItem === "action" ||
      lowerItem === "actions" ||
      lowerItem === "action item" ||
      lowerItem === "action items" ||
      lowerItem === "task" ||
      lowerItem === "deliverable" ||
      lowerItem === "description"
    ) {
      continue;
    }

    const rawResponsible = colIndexResponsible >= 0 ? String(row[colIndexResponsible] || "").trim() : "";

    let rawDeadline = "";
    if (colIndexDeadline >= 0 && row[colIndexDeadline] !== undefined && row[colIndexDeadline] !== null) {
      const cellVal = row[colIndexDeadline];
      if (cellVal instanceof Date && isValid(cellVal)) {
        rawDeadline = format(cellVal, "yyyy-MM-dd");
      } else {
        rawDeadline = String(cellVal || "").trim();
      }
    }

    const rawNo = colIndexNo >= 0 && row[colIndexNo] !== undefined ? String(row[colIndexNo] || "").trim() : String(items.length + 1);

    // Parse status if column exists
    let status: "not_started" | "in_progress" | "done" = "not_started";
    if (colIndexStatus >= 0 && row[colIndexStatus]) {
      const s = String(row[colIndexStatus]).toLowerCase().trim();
      if (s.includes("done") || s.includes("complet")) status = "done";
      else if (s.includes("progress") || s.includes("ongoing")) status = "in_progress";
    }

    // Parse priority if column exists
    let priority: "low" | "medium" | "high" | "critical" = "medium";
    if (colIndexPriority >= 0 && row[colIndexPriority]) {
      const p = String(row[colIndexPriority]).toLowerCase().trim();
      if (p.includes("crit")) priority = "critical";
      else if (p.includes("high")) priority = "high";
      else if (p.includes("low")) priority = "low";
    }

    // Remarks
    const rawRemarks = colIndexRemarks >= 0 && row[colIndexRemarks] ? String(row[colIndexRemarks]).trim() : "";

    // Resolve Assignee & Deadline
    const { matchedUser, coAssignees, isExternal, needsInternalLead } = matchAssignee(rawResponsible, users);
    const { parsedDate, rawText, isTBA, assumedTwoWeeks } = resolveDeadline(rawDeadline, baseDate);

    const noteParts: string[] = [];
    if (rawRemarks) noteParts.push(rawRemarks);
    if (isExternal) noteParts.push(`Counterparty: ${rawResponsible}`);

    items.push({
      id: `item-${Date.now()}-${r}`,
      itemNumber: rawNo || items.length + 1,
      title: rawItem,
      rawResponsible,
      matchedUserId: matchedUser?.id || null,
      matchedUserName: matchedUser?.name || null,
      coAssignees: coAssignees.map((c) => ({ id: c.id, name: c.name })),
      isExternal,
      needsInternalLead,
      rawDeadline: rawText,
      parsedDeadline: parsedDate,
      isDeadlineTBA: isTBA,
      assumedTwoWeeks,
      priority,
      status,
      notes: noteParts.length > 0 ? noteParts.join(" | ") : undefined,
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
        const { matchedUser, coAssignees, isExternal, needsInternalLead } = matchAssignee(responsible, users);
        const { parsedDate, rawText, isTBA } = resolveDeadline(deadline, baseDate);

        items.push({
          id: `item-${Date.now()}-${items.length}`,
          itemNumber: itemNumber || items.length + 1,
          title,
          rawResponsible: responsible,
          matchedUserId: matchedUser?.id || null,
          matchedUserName: matchedUser?.name || null,
          coAssignees: coAssignees.map((c) => ({ id: c.id, name: c.name })),
          isExternal,
          needsInternalLead,
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
          const { matchedUser, coAssignees, isExternal, needsInternalLead } = matchAssignee(responsible, users);
          const { parsedDate, rawText, isTBA } = resolveDeadline(deadline, baseDate);

          items.push({
            id: `item-${Date.now()}-${items.length}`,
            itemNumber: num,
            title,
            rawResponsible: responsible,
            matchedUserId: matchedUser?.id || null,
            matchedUserName: matchedUser?.name || null,
            coAssignees: coAssignees.map((c) => ({ id: c.id, name: c.name })),
            isExternal,
            needsInternalLead,
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
            const { matchedUser, coAssignees, isExternal, needsInternalLead } = matchAssignee(responsible, users);
            const { parsedDate, rawText, isTBA } = resolveDeadline(deadline, baseDate);

            items.push({
              id: `item-${Date.now()}-${items.length}`,
              itemNumber: num,
              title,
              rawResponsible: responsible,
              matchedUserId: matchedUser?.id || null,
              matchedUserName: matchedUser?.name || null,
              coAssignees: coAssignees.map((c) => ({ id: c.id, name: c.name })),
              isExternal,
              needsInternalLead,
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
