import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const TBA_DEADLINE = "2099-12-31";

export function isTbaDeadline(dateString: string | Date | null | undefined): boolean {
  if (!dateString) return true;
  if (typeof dateString === "string") {
    const s = dateString.trim().toLowerCase();
    return s.startsWith("2099-12-31") || s === "tba" || s === "tbd" || s === "to be actioned" || s === "to_be_actioned";
  }
  if (dateString instanceof Date) {
    return dateString.getFullYear() >= 2099;
  }
  return false;
}

export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString || isTbaDeadline(dateString)) return "To Be Actioned";

  // Date-only string YYYY-MM-DD: format deterministically without timezone shift
  if (typeof dateString === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split("-").map(Number);
    if (year >= 2099) return "To Be Actioned";
    return `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
  }

  const d = typeof dateString === "string" ? parseISO(dateString) : dateString;
  try {
    if (d.getFullYear() >= 2099) return "To Be Actioned";
    return format(d, "MMM d, yyyy");
  } catch {
    return String(dateString);
  }
}

export function formatShortDate(dateString: string | Date | null | undefined): string {
  if (!dateString || isTbaDeadline(dateString)) return "To Be Actioned";

  // Date-only string YYYY-MM-DD: format deterministically without timezone shift
  if (typeof dateString === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split("-").map(Number);
    if (year >= 2099) return "To Be Actioned";
    return `${MONTH_NAMES[month - 1]} ${day}`;
  }

  const d = typeof dateString === "string" ? parseISO(dateString) : dateString;
  try {
    if (d.getFullYear() >= 2099) return "To Be Actioned";
    return format(d, "MMM d");
  } catch {
    return String(dateString);
  }
}

export function isDeadlineOverdue(deadline: string | Date | null | undefined, status: string): boolean {
  if (!deadline || isTbaDeadline(deadline)) return false;
  if (status === "done" || status === "cancelled") return false;
  
  if (typeof deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
    const [year] = deadline.split("-").map(Number);
    if (year >= 2099) return false;
    const today = new Date().toISOString().split("T")[0];
    return deadline < today;
  }

  const d = typeof deadline === "string" ? parseISO(deadline) : deadline;
  if (d.getFullYear() >= 2099) return false;
  const now = new Date();
  return d.getTime() < now.getTime();
}

export function getDaysOverdue(deadline: string | Date | null | undefined): number {
  if (!deadline || isTbaDeadline(deadline)) return 0;
  if (typeof deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
    const [year, month, day] = deadline.split("-").map(Number);
    if (year >= 2099) return 0;
    const deadlineTime = new Date(year, month - 1, day).getTime();
    const nowTime = new Date().setHours(0, 0, 0, 0);
    const diff = nowTime - deadlineTime;
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  const d = typeof deadline === "string" ? parseISO(deadline) : deadline;
  if (d.getFullYear() >= 2099) return 0;
  const diffTime = Math.abs(new Date().getTime() - d.getTime());
  return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}

export function getPriorityWeight(priority: string): number {
  switch (priority) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
    default:
      return 1;
  }
}
