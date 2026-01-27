/**
 * @module components/dashboard/QuickWins
 * @description Card listing prioritized quick improvement suggestions for the project
 *
 * PURPOSE:
 * - Display actionable quick wins sorted by impact/effort ratio
 * - Show impact points and effort level badges per suggestion
 * - Provide an optional action button for each item
 *
 * DEPENDENCIES:
 * - @/types/health - QuickWin type definition
 *
 * EXPORTS:
 * - QuickWins - Dashboard card component listing improvement suggestions
 *
 * PATTERNS:
 * - Receives quickWins array and optional onAction callback as props
 * - When quickWins is empty, shows an "All caught up!" message
 * - Effort badge uses green/yellow/red for low/medium/high effort
 *
 * CLAUDE NOTES:
 * - Impact is displayed as "+N points" in a badge
 * - Effort label maps: low -> "Easy" (green), medium -> "Medium" (yellow), high -> "Hard" (red)
 * - The onAction callback is optional; the button is hidden when not provided
 */

import type { QuickWin } from "@/types/health";

interface QuickWinsProps {
  quickWins: QuickWin[];
  onAction?: (win: QuickWin) => void;
}

const EFFORT_CONFIG: Record<
  QuickWin["effort"],
  { label: string; className: string }
> = {
  low: {
    label: "Easy",
    className: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  medium: {
    label: "Medium",
    className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  },
  high: {
    label: "Hard",
    className: "bg-red-500/20 text-red-400 border-red-500/30",
  },
};

export function QuickWins({ quickWins, onAction }: QuickWinsProps) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
      <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-neutral-400">
        Quick Wins
      </h3>

      {quickWins.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-2 text-3xl">&#10003;</div>
          <p className="text-sm font-medium text-neutral-300">All caught up!</p>
          <p className="mt-1 text-xs text-neutral-500">
            No improvement suggestions right now.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {quickWins.map((win, index) => {
            const effort = EFFORT_CONFIG[win.effort];

            return (
              <li
                key={`${win.title}-${index}`}
                className="rounded-lg border border-neutral-800 bg-neutral-850 p-4 transition-colors hover:border-neutral-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-neutral-200">
                      {win.title}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {win.description}
                    </p>
                  </div>

                  {onAction && (
                    <button
                      onClick={() => onAction(win)}
                      className="shrink-0 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1 text-xs font-medium text-neutral-300 transition-colors hover:border-neutral-600 hover:bg-neutral-700"
                    >
                      Fix
                    </button>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  {/* Impact badge */}
                  <span className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-400">
                    +{win.impact} points
                  </span>

                  {/* Effort badge */}
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${effort.className}`}
                  >
                    {effort.label}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
