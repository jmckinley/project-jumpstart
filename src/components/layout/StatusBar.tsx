/**
 * @module components/layout/StatusBar
 * @description Bottom status bar showing context health, cost, and connection status
 *
 * PURPOSE:
 * - Display context usage percentage
 * - Show session cost and duration
 * - Indicate RALPH loop status
 * - Show connection status to Claude Code
 *
 * EXPORTS:
 * - StatusBar - Bottom status bar component
 *
 * PATTERNS:
 * - Always visible at the bottom of the app
 * - Uses compact layout with pipe separators
 * - Color-coded indicators for status
 *
 * CLAUDE NOTES:
 * - See spec Part 3.1 for status bar wireframe
 * - Context percentage, cost, and time are placeholder until Phase 8
 */

export function StatusBar() {
  return (
    <footer className="flex items-center gap-4 border-t border-neutral-800 bg-neutral-900 px-4 py-1.5 text-xs text-neutral-500">
      <span>Context: --</span>
      <span>|</span>
      <span>Cost: --</span>
      <span>|</span>
      <span>RALPH: Idle</span>
      <span>|</span>
      <span className="flex items-center gap-1">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-neutral-600" />
        Disconnected
      </span>
    </footer>
  );
}
