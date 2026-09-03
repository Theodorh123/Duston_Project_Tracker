import React from "react";
import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";

export type PriorityLevel = "critical" | "high" | "medium" | "low";

export interface PriorityConfig {
  label: string;
  dotColor: string;
  badgeBg: string;
  textColor: string;
  borderColor: string;
  flagFill: string;
  flagStroke: string;
}

export const PRIORITY_CONFIG: Record<PriorityLevel, PriorityConfig> = {
  critical: {
    label: "Critical",
    dotColor: "bg-rose-500",
    badgeBg: "bg-rose-50",
    textColor: "text-rose-700",
    borderColor: "border-rose-200",
    flagFill: "fill-rose-500",
    flagStroke: "text-rose-600",
  },
  high: {
    label: "High",
    dotColor: "bg-amber-500",
    badgeBg: "bg-amber-50",
    textColor: "text-amber-800",
    borderColor: "border-amber-200",
    flagFill: "fill-amber-500",
    flagStroke: "text-amber-600",
  },
  medium: {
    label: "Medium",
    dotColor: "bg-blue-500",
    badgeBg: "bg-blue-50",
    textColor: "text-blue-700",
    borderColor: "border-blue-200",
    flagFill: "fill-blue-500",
    flagStroke: "text-blue-600",
  },
  low: {
    label: "Low",
    dotColor: "bg-slate-400",
    badgeBg: "bg-slate-50",
    textColor: "text-slate-600",
    borderColor: "border-slate-200",
    flagFill: "fill-transparent",
    flagStroke: "text-slate-400",
  },
};

export function getPriorityConfig(priority?: string): PriorityConfig {
  const p = (priority || "medium").toLowerCase() as PriorityLevel;
  return PRIORITY_CONFIG[p] || PRIORITY_CONFIG.medium;
}

interface PriorityFlagProps {
  priority?: string;
  showLabel?: boolean;
  size?: number;
  className?: string;
}

export function PriorityFlag({
  priority,
  showLabel = true,
  size = 11,
  className,
}: PriorityFlagProps) {
  const config = getPriorityConfig(priority);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border shrink-0 transition-colors",
        config.badgeBg,
        config.textColor,
        config.borderColor,
        className
      )}
      title={`${config.label} priority`}
    >
      <Flag
        size={size}
        className={cn("shrink-0", config.flagFill, config.flagStroke)}
      />
      {showLabel && <span className="font-semibold">{config.label}</span>}
    </span>
  );
}
