/**
 * @module components/ralph/LoopMonitor
 * @description Displays active and recent RALPH loops with status tracking
 *
 * PURPOSE:
 * - Show list of RALPH loops for the current project
 * - Display loop status (running, paused, completed, failed)
 * - Allow pausing active loops and resuming paused loops
 * - Allow killing running or paused loops
 * - Show loop metadata (quality score, iterations, timestamps)
 *
 * DEPENDENCIES:
 * - @/types/ralph - RalphLoop type
 *
 * EXPORTS:
 * - LoopMonitor - Loop history and monitor component
 *
 * PATTERNS:
 * - Loops are displayed newest first
 * - Active (running) loops are highlighted at the top
 * - Status badges use color coding: green=completed, yellow=running, blue=paused, red=failed
 * - Prompt text is truncated with expand-on-click
 *
 * CLAUDE NOTES:
 * - Only "running" loops can be paused
 * - Only "paused" loops can be resumed
 * - Both "running" and "paused" loops can be killed
 * - Failed/completed loops are in terminal state, no actions available
 * - Empty state shows when no loops exist
 * - Timestamps are formatted as relative time
 */

import { useState } from "react";
import type { RalphLoop } from "@/types/ralph";

interface LoopMonitorProps {
  loops: RalphLoop[];
  loading: boolean;
  onPause: (loopId: string) => void;
  onResume: (loopId: string) => void;
  onKill: (loopId: string) => void;
  onRefresh: () => void;
}

function getStatusBadge(status: string): { bg: string; text: string; label: string } {
  switch (status) {
    case "running":
      return { bg: "bg-yellow-950", text: "text-yellow-400", label: "Running" };
    case "paused":
      return { bg: "bg-blue-950", text: "text-blue-400", label: "Paused" };
    case "completed":
      return { bg: "bg-green-950", text: "text-green-400", label: "Completed" };
    case "failed":
      return { bg: "bg-red-950", text: "text-red-400", label: "Failed" };
    default:
      return { bg: "bg-neutral-800", text: "text-neutral-400", label: "Idle" };
  }
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function LoopCard({
  loop,
  onPause,
  onResume,
  onKill,
}: {
  loop: RalphLoop;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onKill: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = getStatusBadge(loop.status);
  const promptPreview =
    loop.prompt.length > 80 ? loop.prompt.slice(0, 80) + "..." : loop.prompt;

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span
              className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${status.bg} ${status.text}`}
            >
              {status.label}
            </span>
            <span className="text-xs text-neutral-500">
              Score: {loop.qualityScore}/100
            </span>
            {loop.iterations > 0 && (
              <span className="text-xs text-neutral-500">
                {loop.iterations} iterations
              </span>
            )}
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-left text-sm text-neutral-300 hover:text-neutral-100"
          >
            {expanded ? loop.prompt : promptPreview}
          </button>
          {loop.outcome && (
            <p className="mt-1 text-xs text-neutral-500">
              Outcome: {loop.outcome}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-xs text-neutral-600">
            {formatRelativeTime(loop.createdAt)}
          </span>
          {loop.status === "running" && (
            <div className="flex gap-1">
              <button
                onClick={() => onPause(loop.id)}
                className="rounded px-2 py-1 text-xs font-medium text-yellow-400 transition-colors hover:bg-yellow-950"
              >
                Pause
              </button>
              <button
                onClick={() => onKill(loop.id)}
                className="rounded px-2 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-950"
              >
                Kill
              </button>
            </div>
          )}
          {loop.status === "paused" && (
            <div className="flex gap-1">
              <button
                onClick={() => onResume(loop.id)}
                className="rounded px-2 py-1 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-950"
              >
                Resume
              </button>
              <button
                onClick={() => onKill(loop.id)}
                className="rounded px-2 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-950"
              >
                Kill
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function LoopMonitor({ loops, loading, onPause, onResume, onKill, onRefresh }: LoopMonitorProps) {
  const activeLoops = loops.filter((l) => l.status === "running");
  const recentLoops = loops.filter((l) => l.status !== "running");

  return (
    <div className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-300">Loop Monitor</h3>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-xs text-neutral-500 transition-colors hover:text-neutral-300 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {loops.length === 0 && !loading && (
        <div className="flex items-center justify-center py-8 text-neutral-600">
          <p className="text-sm">No RALPH loops yet. Analyze a prompt to get started.</p>
        </div>
      )}

      {/* Active Loops */}
      {activeLoops.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-yellow-400">
            Active ({activeLoops.length})
          </h4>
          {activeLoops.map((loop) => (
            <LoopCard key={loop.id} loop={loop} onPause={onPause} onResume={onResume} onKill={onKill} />
          ))}
        </div>
      )}

      {/* Recent Loops */}
      {recentLoops.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-neutral-500">
            Recent ({recentLoops.length})
          </h4>
          {recentLoops.map((loop) => (
            <LoopCard key={loop.id} loop={loop} onPause={onPause} onResume={onResume} onKill={onKill} />
          ))}
        </div>
      )}
    </div>
  );
}
