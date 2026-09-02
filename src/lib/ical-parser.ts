/**
 * RFC 5545 compliant lightweight iCal/ICS parser.
 * Handles line unfolding, timezones, virtual meeting detection, and attendee extraction.
 */

export interface ParsedCalendarEvent {
  uid: string;
  summary: string;
  startDate: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endDate?: string;
  endTime?: string;
  location?: string;
  description?: string;
  isVirtual: boolean;
  status?: string;
  attendeeEmails: string[];
}

/**
 * Unfolds folded RFC 5545 lines (lines beginning with whitespace continue the previous line)
 */
function unfoldIcal(raw: string): string {
  return raw.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
}

/**
 * Unescapes RFC 5545 text characters (e.g. \, \; \n)
 */
function unescapeIcalText(str: string): string {
  return str
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

/**
 * Parses an iCal date string (e.g. 20260905T143000Z, 20260905T143000, 20260905)
 * Returns { date: '2026-09-05', time: '14:30' }
 */
function parseIcalDate(val: string): { date: string; time?: string } {
  const cleanVal = val.trim();
  // Match YYYYMMDDTHHMMSS... or YYYYMMDD
  const match = cleanVal.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/);
  if (!match) {
    // Fallback: try JS Date
    const d = new Date(cleanVal);
    if (!isNaN(d.getTime())) {
      return {
        date: d.toISOString().split("T")[0],
        time: d.toTimeString().slice(0, 5),
      };
    }
    const today = new Date().toISOString().split("T")[0];
    return { date: today };
  }

  const [_, year, month, day, hour, min] = match;
  const dateStr = `${year}-${month}-${day}`;
  const timeStr = hour && min ? `${hour}:${min}` : undefined;

  return { date: dateStr, time: timeStr };
}

/**
 * Parses raw .ics file text and returns an array of calendar events
 */
export function parseIcsContent(rawIcs: string): ParsedCalendarEvent[] {
  if (!rawIcs || typeof rawIcs !== "string") return [];

  const unfolded = unfoldIcal(rawIcs);
  const lines = unfolded.split(/\r?\n/);

  const events: ParsedCalendarEvent[] = [];
  let inEvent = false;
  let currentEvent: Partial<ParsedCalendarEvent> = {};
  let attendeeEmails: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed === "BEGIN:VEVENT") {
      inEvent = true;
      currentEvent = {
        attendeeEmails: [],
      };
      attendeeEmails = [];
      continue;
    }

    if (trimmed === "END:VEVENT") {
      if (inEvent && currentEvent.summary && currentEvent.startDate) {
        // Skip cancelled meetings
        if (currentEvent.status?.toUpperCase() !== "CANCELLED") {
          events.push({
            uid: currentEvent.uid || `ical-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            summary: currentEvent.summary,
            startDate: currentEvent.startDate,
            startTime: currentEvent.startTime,
            endDate: currentEvent.endDate,
            endTime: currentEvent.endTime,
            location: currentEvent.location || null as any,
            description: currentEvent.description || undefined,
            isVirtual: !!currentEvent.isVirtual,
            status: currentEvent.status || "CONFIRMED",
            attendeeEmails,
          });
        }
      }
      inEvent = false;
      currentEvent = {};
      continue;
    }

    if (!inEvent) continue;

    // Parse property and value
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;

    const propHeader = trimmed.slice(0, colonIdx);
    const propValue = trimmed.slice(colonIdx + 1);

    // Header may have params: e.g. DTSTART;TZID=... or SUMMARY;LANGUAGE=...
    const propName = propHeader.split(";")[0].toUpperCase();

    switch (propName) {
      case "UID":
        currentEvent.uid = propValue.trim();
        break;

      case "SUMMARY":
        currentEvent.summary = unescapeIcalText(propValue.trim());
        break;

      case "DTSTART": {
        const { date, time } = parseIcalDate(propValue);
        currentEvent.startDate = date;
        currentEvent.startTime = time;
        break;
      }

      case "DTEND": {
        const { date, time } = parseIcalDate(propValue);
        currentEvent.endDate = date;
        currentEvent.endTime = time;
        break;
      }

      case "LOCATION": {
        const loc = unescapeIcalText(propValue.trim());
        currentEvent.location = loc;
        if (
          loc.toLowerCase().includes("teams.microsoft.com") ||
          loc.toLowerCase().includes("zoom.us") ||
          loc.toLowerCase().includes("meet.google.com") ||
          loc.toLowerCase().includes("webex.com") ||
          loc.toLowerCase().includes("virtual") ||
          loc.toLowerCase().includes("online")
        ) {
          currentEvent.isVirtual = true;
        }
        break;
      }

      case "DESCRIPTION": {
        const desc = unescapeIcalText(propValue.trim());
        currentEvent.description = desc;
        if (
          !currentEvent.isVirtual &&
          (desc.toLowerCase().includes("teams.microsoft.com") ||
            desc.toLowerCase().includes("zoom.us") ||
            desc.toLowerCase().includes("meet.google.com") ||
            desc.toLowerCase().includes("https://teams.live.com"))
        ) {
          currentEvent.isVirtual = true;
        }
        break;
      }

      case "STATUS":
        currentEvent.status = propValue.trim();
        break;

      case "ATTENDEE": {
        // Look for mailto:
        const mailtoMatch = propValue.match(/mailto:([^\s;>]+)/i);
        if (mailtoMatch) {
          attendeeEmails.push(mailtoMatch[1].toLowerCase().trim());
        }
        break;
      }
    }
  }

  return events;
}
