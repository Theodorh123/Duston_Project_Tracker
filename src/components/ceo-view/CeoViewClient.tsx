"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldAlert, BarChart3, ArrowRight, Flame, CheckCircle2 } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { useAppShell } from "../layout/AppShell";

export interface HeatmapCell {
  entityId: string;
  entityName: string;
  category: string;
  openCount: number;
  overdueCount: number;
  health: "green" | "amber" | "red" | "empty";
}

export interface RiskItem {
  id: string;
  title: string;
  projectName: string;
  entityName: string;
  entityBrandColor: string;
  blockerReason: string;
  daysBlocked: number;
  priority: string;
}

interface CeoViewClientProps {
  entities: Array<{ id: string; name: string }>;
  categories: string[];
  heatmapGrid: Record<string, Record<string, HeatmapCell>>;
  topRisks: RiskItem[];
  weeklyDigest: {
    openedCount: number;
    closedCount: number;
    overdueCount: number;
    keyMovements: string[];
  };
}

export function CeoViewClient({
  entities,
  categories,
  heatmapGrid,
  topRisks,
  weeklyDigest,
}: CeoViewClientProps) {
  const router = useRouter();
  const { openActionItem, setSelectedEntityId } = useAppShell();

  const handleCellClick = (entityId: string) => {
    setSelectedEntityId(entityId);
    router.push("/projects");
  };

  const getCellColorClass = (health: HeatmapCell["health"]) => {
    switch (health) {
      case "red":
        return "bg-[#F15A24]/15 border-[#F15A24]/30 text-[#F15A24]";
      case "amber":
        return "bg-[#FBB03B]/15 border-[#FBB03B]/30 text-[#FBB03B]";
      case "green":
        return "bg-[#39B54A]/15 border-[#39B54A]/30 text-[#39B54A]";
      case "empty":
      default:
        return "bg-duston-bg/40 border-duston-border text-duston-muted/50";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#023542] text-white">
            CEO Command
          </span>
        </div>
        <h1 className="text-2xl font-medium text-[#023542] tracking-tight">
          CEO Executive Overview
        </h1>
        <p className="text-xs text-duston-muted mt-1">
          Glanceable conglomerate risk matrix, category health heatmaps, and weekly momentum digest
        </p>
      </div>

      {/* Weekly Digest Card */}
      <div className="bg-white border border-duston-border rounded-xl p-6 shadow-subtle space-y-3">
        <div className="flex items-center justify-between border-b border-duston-border pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} strokeWidth={1.5} className="text-[#023542]" />
            <h2 className="text-sm font-medium text-duston-dark">
              Weekly momentum digest
            </h2>
          </div>
          <span className="text-[11px] text-duston-muted">
            Automated group synthesis
          </span>
        </div>

        <p className="text-xs text-duston-text leading-relaxed">
          This week across the Duston Group:{" "}
          <strong className="text-duston-dark">{weeklyDigest.openedCount}</strong> items opened,{" "}
          <strong className="text-[#39B54A]">{weeklyDigest.closedCount}</strong> items closed/completed, and{" "}
          <strong className="text-duston-orange">{weeklyDigest.overdueCount}</strong> items remain overdue.
        </p>

        {weeklyDigest.keyMovements.length > 0 && (
          <div className="pt-2 border-t border-duston-border/60">
            <span className="text-xs font-medium text-duston-dark block mb-1.5">
              Key operational movements:
            </span>
            <ul className="space-y-1 text-xs text-duston-muted">
              {weeklyDigest.keyMovements.map((move, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1BCECE]" />
                  <span>{move}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 1. Group Heatmap */}
      <div className="bg-white border border-duston-border rounded-xl p-6 shadow-subtle space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-duston-border pb-3">
          <div>
            <h2 className="text-sm font-medium text-duston-dark">
              Group health heatmap
            </h2>
            <p className="text-xs text-duston-muted">
              Entities vs. Categories. Color coded by overdue ratio. Cell shows open deliverables count.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#39B54A]" />
              <span className="text-duston-muted">Healthy</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#FBB03B]" />
              <span className="text-duston-muted">Watchlist</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#F15A24]" />
              <span className="text-duston-muted">Overdue risk</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse text-xs">
            <thead>
              <tr className="border-b border-duston-border text-duston-muted font-medium">
                <th className="py-2.5 px-3 text-left font-medium">Subsidiary entity</th>
                {categories.map((cat) => (
                  <th key={cat} className="py-2.5 px-3 uppercase tracking-wider text-[10px]">
                    {cat}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-duston-border">
              {entities.map((entity) => (
                <tr key={entity.id} className="hover:bg-duston-bg/40 transition-colors">
                  <td className="py-3 px-3 text-left font-medium text-duston-dark whitespace-nowrap">
                    {entity.name}
                  </td>
                  {categories.map((cat) => {
                    const cell = heatmapGrid[entity.id]?.[cat];
                    const openCount = cell?.openCount || 0;
                    const health = cell?.health || "empty";

                    return (
                      <td key={cat} className="py-2 px-2">
                        <button
                          onClick={() => handleCellClick(entity.id)}
                          className={cn(
                            "w-full py-2 rounded-lg border text-xs font-semibold transition-all hover:scale-105",
                            getCellColorClass(health)
                          )}
                          title={`${entity.name} - ${cat}: ${openCount} open items`}
                        >
                          {openCount > 0 ? openCount : "—"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Top 10 Risks */}
      <div className="bg-white border border-duston-border rounded-xl p-6 shadow-subtle space-y-4">
        <div className="flex items-center justify-between border-b border-duston-border pb-3">
          <div className="flex items-center gap-2">
            <Flame size={18} strokeWidth={1.5} className="text-duston-orange" />
            <h2 className="text-sm font-medium text-duston-dark">
              Top 10 critical risks &amp; blockers
            </h2>
          </div>
          <span className="text-xs text-duston-orange font-medium">
            Executive intervention required
          </span>
        </div>

        {topRisks.length === 0 ? (
          <p className="text-xs text-[#39B54A] font-medium py-3 text-center">
            No critical or CEO-sponsored blocked workstreams currently active.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-duston-border bg-duston-bg/60 text-duston-muted font-medium">
                  <th className="py-2.5 px-3">Item</th>
                  <th className="py-2.5 px-3">Project</th>
                  <th className="py-2.5 px-3">Entity</th>
                  <th className="py-2.5 px-3">Blocker rationale</th>
                  <th className="py-2.5 px-3 text-right">Days blocked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-duston-border">
                {topRisks.map((risk) => (
                  <tr
                    key={risk.id}
                    onClick={() => openActionItem(risk.id)}
                    className="hover:bg-duston-bg cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3 font-medium text-duston-dark max-w-xs truncate">
                      {risk.title}
                    </td>
                    <td className="py-3 px-3 text-duston-muted max-w-[160px] truncate">
                      {risk.projectName}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-medium"
                        style={{
                          backgroundColor: `${risk.entityBrandColor}15`,
                          color: risk.entityBrandColor,
                        }}
                      >
                        {risk.entityName}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-duston-orange font-medium max-w-sm truncate">
                      {risk.blockerReason}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-duston-orange">
                      {risk.daysBlocked}d
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
