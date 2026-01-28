/**
 * @module components/layout/StatusBar
 * @description Bottom status bar showing live context health, RALPH status, and connection state
 *
 * PURPOSE:
 * - Display context usage percentage with color-coded indicator
 * - Indicate RALPH loop status (running, paused, idle)
 * - Show connection status based on active project
 *
 * DEPENDENCIES:
 * - @/hooks/useContextHealth - Context usage percent and rot risk
 * - @/hooks/useRalph - RALPH loop list to derive running/paused/idle status
 * - @/stores/projectStore - Active project to determine connection state
 *
 * EXPORTS:
 * - StatusBar - Bottom status bar component
 *
 * PATTERNS:
 * - Always visible at the bottom of the app
 * - Uses compact layout with pipe separators
 * - Color-coded indicators for status
 * - Calls refresh() on mount to load initial context health data
 *
 * CLAUDE NOTES:
 * - See spec Part 3.1 for status bar wireframe
 * - Context color thresholds: green (<50%), yellow (50-79%), red (>=80%)
 * - RALPH status derived from loop list: any "running" -> Running, any "paused" -> Paused, else Idle
 * - Connection is based on whether activeProject is set in the store
 */

import { useEffect } from "react";
import { useContextHealth } from "@/hooks/useContextHealth";
import { useRalph } from "@/hooks/useRalph";
import { useProjectStore } from "@/stores/projectStore";

function getContextColor(usagePercent: number | undefined | null): string {
  if (usagePercent == null) return "text-neutral-500";
  if (usagePercent >= 80) return "text-red-400";
  if (usagePercent >= 50) return "text-yellow-400";
  return "text-green-400";
}

function getRalphLabel(loops: { status: string }[]): { label: string; color: string } {
  if (loops.some((l) => l.status === "running")) {
    return { label: "Running", color: "text-green-400" };
  }
  if (loops.some((l) => l.status === "paused")) {
    return { label: "Paused", color: "text-yellow-400" };
  }
  return { label: "Idle", color: "text-neutral-500" };
}

export function StatusBar() {
  const { contextHealth, refresh } = useContextHealth();
  const { loops } = useRalph();
  const activeProject = useProjectStore((s) => s.activeProject);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const usagePercent = contextHealth?.usagePercent ?? null;
  const contextColor = getContextColor(usagePercent);
  const contextLabel =
    usagePercent != null ? `Context: ${Math.round(usagePercent)}%` : "Context: --";

  const ralph = getRalphLabel(loops);

  const connected = activeProject != null;
  const connectionDotColor = connected ? "bg-green-400" : "bg-neutral-600";
  const connectionLabel = connected ? "Connected" : "No Project";

  return (
    <footer className="flex items-center gap-4 border-t border-neutral-800 bg-neutral-900 px-4 py-1.5 text-xs text-neutral-500">
      <span className={contextColor}>{contextLabel}</span>
      <span>|</span>
      <span className={ralph.color}>RALPH: {ralph.label}</span>
      <span>|</span>
      <span className="flex items-center gap-1">
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${connectionDotColor}`}
        />
        {connectionLabel}
      </span>
    </footer>
  );
}
