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

export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return "No date";

  // Date-only string YYYY-MM-DD: format deterministically without timezone shift
  if (typeof dateString === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split("-").map(Number);
    return `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
  }

  const d = typeof dateString === "string" ? parseISO(dateString) : dateString;
  try {
    return format(d, "MMM d, yyyy");
  } catch {
    return String(dateString);
  }
}

export function formatShortDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return "--";

  // Date-only string YYYY-MM-DD: format deterministically without timezone shift
  if (typeof dateString === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [, month, day] = dateString.split("-").map(Number);
    return `${MONTH_NAMES[month - 1]} ${day}`;
  }

  const d = typeof dateString === "string" ? parseISO(dateString) : dateString;
  try {
    return format(d, "MMM d");
  } catch {
    return String(dateString);
  }
}

export function isDeadlineOverdue(deadline: string | Date, status: string): boolean {
  if (status === "done" || status === "cancelled") return false;
  
  if (typeof deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
    const today = new Date().toISOString().split("T")[0];
    return deadline < today;
  }

  const d = typeof deadline === "string" ? parseISO(deadline) : deadline;
  const now = new Date();
  return d.getTime() < now.getTime();
}

export function getDaysOverdue(deadline: string | Date): number {
  if (typeof deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
    const [year, month, day] = deadline.split("-").map(Number);
    const deadlineTime = new Date(year, month - 1, day).getTime();
    const nowTime = new Date().setHours(0, 0, 0, 0);
    const diff = nowTime - deadlineTime;
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  const d = typeof deadline === "string" ? parseISO(deadline) : deadline;
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
