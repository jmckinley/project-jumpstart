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
 * - @/lib/tauri - openUrl for feedback button
 *
 * EXPORTS:
 * - StatusBar - Bottom status bar component
 *
 * PATTERNS:
 * - Always visible at the bottom of the app
 * - Uses compact layout with pipe separators
 * - Color-coded indicators for status
 * - Calls refresh() on mount to load initial context health data
 * - Polls context health every 30 seconds via setInterval
 * - Feedback button opens GitHub issues page in browser
 *
 * CLAUDE NOTES:
 * - See spec Part 3.1 for status bar wireframe
 * - Context color thresholds: green (<50%), yellow (50-79%), red (>=80%)
 * - RALPH status derived from loop list: any "running" -> Running, any "paused" -> Paused, else Idle
 * - Connection is based on whether activeProject is set in the store
 */

import { useEffect, useCallback } from "react";
import { useContextHealth } from "@/hooks/useContextHealth";
import { useRalph } from "@/hooks/useRalph";
import { useProjectStore } from "@/stores/projectStore";
import { openUrl } from "@/lib/tauri";

const FEEDBACK_URL = "https://github.com/jmckinley/project-jumpstart-feedback/issues/new/choose";

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

  const handleFeedback = useCallback(() => {
    openUrl(FEEDBACK_URL).catch(console.error);
  }, []);

  useEffect(() => {
    refresh();

    // Poll context health every 30 seconds
    const interval = setInterval(() => {
      refresh();
    }, 30_000);

    return () => clearInterval(interval);
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
    <footer className="flex items-center justify-between border-t border-neutral-800 bg-neutral-900 px-4 py-1.5 text-xs text-neutral-500">
      <div className="flex items-center gap-4">
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
      </div>
      <button
        onClick={handleFeedback}
        className="flex items-center gap-1 rounded px-2 py-0.5 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
        title="Report a bug or request a feature"
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Feedback
      </button>
    </footer>
  );
}
