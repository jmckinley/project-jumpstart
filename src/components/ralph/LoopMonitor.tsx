/**
 * @module components/ralph/LoopMonitor
 * @description Displays active and recent RALPH loops with status tracking and inline mistakes
 *
 * PURPOSE:
 * - Show list of RALPH loops for the current project
 * - Display loop status (running, paused, completed, failed)
 * - Allow pausing active loops and resuming paused loops
 * - Allow killing running or paused loops
 * - Show loop metadata (quality score, iterations, timestamps)
 * - Display associated mistakes inline when a failed loop is expanded
 *
 * DEPENDENCIES:
 * - @/types/ralph - RalphLoop, RalphMistake types
 *
 * EXPORTS:
 * - LoopMonitor - Loop history and monitor component
 *
 * PATTERNS:
 * - Loops are displayed newest first
 * - Active (running) loops are highlighted at the top
 * - Status badges use color coding: green=completed, yellow=running, blue=paused, red=failed
 * - Prompt text is truncated with expand-on-click
 * - Failed loops show associated mistakes when expanded
 *
 * CLAUDE NOTES:
 * - Only "running" loops can be paused
 * - Only "paused" loops can be resumed
 * - Both "running" and "paused" loops can be killed
 * - Failed/completed loops are in terminal state, no actions available
 * - Mistakes are matched to loops by loop_id
 * - Empty state shows when no loops exist
 * - Timestamps are formatted as relative time
 */

import { useState } from "react";
import type { RalphLoop, RalphMistake } from "@/types/ralph";

interface LoopMonitorProps {
  loops: RalphLoop[];
  mistakes: RalphMistake[];
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

function getMistakeTypeBadge(type: string): { bg: string; text: string; label: string } {
  switch (type) {
    case "file_not_found":
      return { bg: "bg-orange-950", text: "text-orange-400", label: "File Not Found" };
    case "syntax_error":
      return { bg: "bg-red-950", text: "text-red-400", label: "Syntax Error" };
    case "type_error":
      return { bg: "bg-pink-950", text: "text-pink-400", label: "Type Error" };
    case "permission_error":
      return { bg: "bg-yellow-950", text: "text-yellow-400", label: "Permission" };
    case "timeout":
      return { bg: "bg-amber-950", text: "text-amber-400", label: "Timeout" };
    case "network_error":
      return { bg: "bg-blue-950", text: "text-blue-400", label: "Network" };
    case "resource_error":
      return { bg: "bg-purple-950", text: "text-purple-400", label: "Resource" };
    case "user_cancelled":
      return { bg: "bg-neutral-800", text: "text-neutral-400", label: "Cancelled" };
    case "implementation":
    default:
      return { bg: "bg-red-950", text: "text-red-400", label: "Error" };
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
  mistakes,
  onPause,
  onResume,
  onKill,
}: {
  loop: RalphLoop;
  mistakes: RalphMistake[];
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onKill: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const status = getStatusBadge(loop.status);
  const promptPreview =
    loop.prompt.length > 80 ? loop.prompt.slice(0, 80) + "..." : loop.prompt;

  // Get mistakes for this loop
  const loopMistakes = mistakes.filter((m) => m.loopId === loop.id);
  const hasMistakes = loopMistakes.length > 0;

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2 flex-wrap">
            <span
              className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${status.bg} ${status.text}`}
            >
              {status.label}
            </span>
            {loop.mode === "prd" && (
              <span className="inline-block rounded bg-purple-950 px-2 py-0.5 text-xs font-medium text-purple-300">
                PRD
              </span>
            )}
            <span className="text-xs text-neutral-500">
              Score: {loop.qualityScore}/100
            </span>
            {loop.mode === "prd" && loop.totalStories !== null && (
              <span className="text-xs text-purple-300">
                Story {(loop.currentStory ?? 0) + 1}/{loop.totalStories}
              </span>
            )}
            {loop.mode !== "prd" && loop.iterations > 0 && (
              <span className="text-xs text-neutral-500">
                {loop.iterations} iterations
              </span>
            )}
            {hasMistakes && (
              <span className="text-xs text-red-400">
                {loopMistakes.length} error{loopMistakes.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-left text-sm text-neutral-300 hover:text-neutral-100"
          >
            {expanded ? loop.prompt : promptPreview}
          </button>

          {/* Show outcome for non-expanded view */}
          {!expanded && loop.outcome && (
            <p className="mt-1 text-xs text-neutral-500 truncate">
              Outcome: {loop.outcome.slice(0, 100)}...
            </p>
          )}

          {/* Expanded view with full outcome and mistakes */}
          {expanded && (
            <div className="mt-3 space-y-3">
              {loop.outcome && (
                <div className="rounded bg-neutral-800/50 p-2">
                  <p className="text-xs text-neutral-500 mb-1">Outcome:</p>
                  <p className="text-xs text-neutral-400 whitespace-pre-wrap font-mono">
                    {loop.outcome.length > 500
                      ? loop.outcome.slice(0, 500) + "..."
                      : loop.outcome}
                  </p>
                </div>
              )}

              {/* Inline mistakes for this loop */}
              {loopMistakes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-red-400 font-medium">
                    Captured Errors:
                  </p>
                  {loopMistakes.map((mistake) => {
                    const badge = getMistakeTypeBadge(mistake.mistakeType);
                    return (
                      <div
                        key={mistake.id}
                        className="rounded border border-red-900/50 bg-red-950/20 p-2"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}
                          >
                            {badge.label}
                          </span>
                          <span className="text-xs text-neutral-600">
                            {formatRelativeTime(mistake.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400">
                          {mistake.description.length > 200
                            ? mistake.description.slice(0, 200) + "..."
                            : mistake.description}
                        </p>
                        {mistake.resolution && (
                          <p className="mt-1 text-xs text-green-400">
                            Resolution: {mistake.resolution}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
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

export function LoopMonitor({ loops, mistakes, loading, onPause, onResume, onKill, onRefresh }: LoopMonitorProps) {
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
            <LoopCard key={loop.id} loop={loop} mistakes={mistakes} onPause={onPause} onResume={onResume} onKill={onKill} />
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
            <LoopCard key={loop.id} loop={loop} mistakes={mistakes} onPause={onPause} onResume={onResume} onKill={onKill} />
          ))}
        </div>
      )}
    </div>
  );
}
