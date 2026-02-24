/**
 * @module components/dashboard/SessionHandoff
 * @description Hero card for Smart Session Handoff — displays session snapshot and actions
 *
 * PURPOSE:
 * - Show previous session summary, pending items, and next steps
 * - Provide one-click snapshot capture and hook installation
 * - Serve as the Tier 1 hero element in the dashboard layout
 *
 * DEPENDENCIES:
 * - react (useState) - Expand/collapse state
 * - @/types/session-handoff - SessionSnapshot type
 *
 * EXPORTS:
 * - SessionHandoff - Hero dashboard card component
 *
 * PATTERNS:
 * - Receives snapshot data and action callbacks as props
 * - Full-width gradient card with stat chips and expandable details
 * - Empty state shown when no snapshot exists
 * - Action buttons: Capture Snapshot, Install Hook, View Details
 *
 * CLAUDE NOTES:
 * - Gradient: from-indigo-950/40 to-purple-950/40 with border-indigo-500/30
 * - Larger padding (p-8) and typography for hero tier
 * - Stat chips show pending items count, next steps count, files modified, git branch
 * - Details section (pending items + next steps) toggles with "View Details" button
 */

import { useState } from "react";
import type { SessionSnapshot } from "@/types/session-handoff";

interface SessionHandoffProps {
  snapshot: SessionSnapshot | null;
  capturing: boolean;
  installing: boolean;
  onCapture: () => void;
  onInstallHook: () => void;
}

function formatTimeAgo(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(isoString).toLocaleDateString();
}

export function SessionHandoff({
  snapshot,
  capturing,
  installing,
  onCapture,
  onInstallHook,
}: SessionHandoffProps) {
  const [expanded, setExpanded] = useState(false);

  // Empty state — no snapshot yet
  if (!snapshot) {
    return (
      <div className="rounded-xl border border-l-4 border-indigo-500/30 border-l-indigo-500 bg-gradient-to-br from-indigo-950/40 to-purple-950/40 p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-neutral-100">
              Session Handoff
            </h3>
            <p className="mt-1 text-sm text-neutral-400">
              Capture your session state so the next Claude Code session starts
              with full context — zero ramp-up time.
            </p>
            <button
              onClick={onCapture}
              disabled={capturing}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {capturing ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      className="opacity-25"
                    />
                    <path
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      className="opacity-75"
                    />
                  </svg>
                  Analyzing...
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Capture First Snapshot
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Snapshot exists — show summary + stats + actions
  const branchName = snapshot.gitState.split(" (")[0] || snapshot.gitState;

  return (
    <div className="rounded-xl border border-l-4 border-indigo-500/30 border-l-indigo-500 bg-gradient-to-br from-indigo-950/40 to-purple-950/40 p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-500/20">
            <svg
              className="h-5 w-5 text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium uppercase tracking-wider text-neutral-400">
                Session Handoff
              </h3>
              <span className="text-xs text-neutral-600">
                {formatTimeAgo(snapshot.createdAt)}
              </span>
            </div>
            <p className="mt-1 text-lg font-semibold text-neutral-100">
              {snapshot.summary}
            </p>
          </div>
        </div>
      </div>

      {/* Stat Chips */}
      <div className="mt-4 flex flex-wrap gap-2">
        {snapshot.pendingItems.length > 0 && (
          <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
            {snapshot.pendingItems.length} pending
          </span>
        )}
        {snapshot.nextSteps.length > 0 && (
          <span className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">
            {snapshot.nextSteps.length} next steps
          </span>
        )}
        {snapshot.filesModified.length > 0 && (
          <span className="inline-flex items-center rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">
            {snapshot.filesModified.length} files
          </span>
        )}
        <span className="inline-flex items-center rounded-full border border-neutral-700 bg-neutral-800/50 px-3 py-1 text-xs font-medium text-neutral-400">
          {branchName}
        </span>
      </div>

      {/* Expandable Details */}
      {expanded && (
        <div className="mt-4 space-y-4 border-t border-neutral-800 pt-4">
          {snapshot.pendingItems.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-amber-400">
                Pending Items
              </h4>
              <ul className="space-y-1">
                {snapshot.pendingItems.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-neutral-300"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {snapshot.nextSteps.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-blue-400">
                Suggested Next Steps
              </h4>
              <ul className="space-y-1">
                {snapshot.nextSteps.map((step, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-neutral-300"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400" />
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {snapshot.filesModified.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-green-400">
                Files Modified
              </h4>
              <ul className="space-y-0.5">
                {snapshot.filesModified.map((file, i) => (
                  <li key={i} className="text-xs font-mono text-neutral-500">
                    {file}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={onCapture}
          disabled={capturing}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
        >
          {capturing ? (
            <>
              <svg
                className="h-3.5 w-3.5 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="opacity-25"
                />
                <path
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  className="opacity-75"
                />
              </svg>
              Capturing...
            </>
          ) : (
            "Capture Snapshot"
          )}
        </button>

        <button
          onClick={onInstallHook}
          disabled={installing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:border-neutral-600 hover:bg-neutral-700 disabled:opacity-50"
        >
          {installing ? "Installing..." : "Install Hook"}
        </button>

        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:border-neutral-600 hover:bg-neutral-700"
        >
          {expanded ? "Hide Details" : "View Details"}
          <svg
            className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
