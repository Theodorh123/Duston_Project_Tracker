import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isPast, isToday, isThisWeek, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return "No date";
  const d = typeof dateString === "string" ? parseISO(dateString) : dateString;
  try {
    return format(d, "MMM d, yyyy");
  } catch {
    return String(dateString);
  }
}

export function formatShortDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return "--";
  const d = typeof dateString === "string" ? parseISO(dateString) : dateString;
  try {
    return format(d, "MMM d");
  } catch {
    return String(dateString);
  }
}

export function isDeadlineOverdue(deadline: string | Date, status: string): boolean {
  if (status === "done" || status === "cancelled") return false;
  const d = typeof deadline === "string" ? parseISO(deadline) : deadline;
  return isPast(d) && !isToday(d);
}

export function getDaysOverdue(deadline: string | Date): number {
  const d = typeof deadline === "string" ? parseISO(deadline) : deadline;
  const diffTime = Math.abs(new Date().getTime() - d.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
