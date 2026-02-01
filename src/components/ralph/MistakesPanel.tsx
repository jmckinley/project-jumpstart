/**
 * @module components/ralph/MistakesPanel
 * @description Displays captured mistakes from RALPH loops for learning and review
 *
 * PURPOSE:
 * - Show recent mistakes captured from failed or killed RALPH loops
 * - Display mistake type, description, and associated loop info
 * - Allow users to review what went wrong and learn from errors
 *
 * DEPENDENCIES:
 * - @/types/ralph - RalphMistake type
 *
 * EXPORTS:
 * - MistakesPanel - Collapsible panel showing recent mistakes
 *
 * PATTERNS:
 * - Mistakes are displayed newest first
 * - Each mistake shows type badge, description, and loop reference
 * - Collapsible to save space when not needed
 *
 * CLAUDE NOTES:
 * - Mistake types are color-coded by severity
 * - Loop ID is shown as a short reference (first 8 chars)
 * - Context (original prompt) can be expanded
 */

import { useState } from "react";
import type { RalphMistake } from "@/types/ralph";

interface MistakesPanelProps {
  mistakes: RalphMistake[];
  loading: boolean;
  onRefresh: () => void;
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
      return { bg: "bg-red-950", text: "text-red-400", label: "Implementation" };
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

function MistakeCard({ mistake }: { mistake: RalphMistake }) {
  const [expanded, setExpanded] = useState(false);
  const badge = getMistakeTypeBadge(mistake.mistakeType);
  const loopRef = mistake.loopId ? mistake.loopId.slice(0, 8) : "—";

  const descriptionPreview = mistake.description.length > 100
    ? mistake.description.slice(0, 100) + "..."
    : mistake.description;

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2 flex-wrap">
            <span
              className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}
            >
              {badge.label}
            </span>
            <span className="text-xs text-neutral-500">
              Loop: <code className="font-mono">{loopRef}</code>
            </span>
            <span className="text-xs text-neutral-600">
              {formatRelativeTime(mistake.createdAt)}
            </span>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-left text-sm text-neutral-300 hover:text-neutral-100"
          >
            {expanded ? mistake.description : descriptionPreview}
          </button>
          {expanded && mistake.context && (
            <div className="mt-2 rounded bg-neutral-800/50 p-2">
              <p className="text-xs text-neutral-500 mb-1">Original prompt:</p>
              <p className="text-xs text-neutral-400 font-mono whitespace-pre-wrap">
                {mistake.context.length > 300
                  ? mistake.context.slice(0, 300) + "..."
                  : mistake.context}
              </p>
            </div>
          )}
          {mistake.resolution && (
            <p className="mt-1 text-xs text-green-400">
              Resolution: {mistake.resolution}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function MistakesPanel({ mistakes, loading, onRefresh }: MistakesPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (mistakes.length === 0 && !loading) {
    return null; // Don't show panel if no mistakes
  }

  return (
    <div className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 text-sm font-medium text-neutral-300 hover:text-neutral-100"
        >
          <span className={`transition-transform ${collapsed ? "" : "rotate-90"}`}>
            ▶
          </span>
          Captured Mistakes ({mistakes.length})
        </button>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-xs text-neutral-500 transition-colors hover:text-neutral-300 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {!collapsed && (
        <div className="space-y-2">
          {mistakes.length === 0 && loading && (
            <p className="text-sm text-neutral-500 py-2">Loading mistakes...</p>
          )}
          {mistakes.map((mistake) => (
            <MistakeCard key={mistake.id} mistake={mistake} />
          ))}
        </div>
      )}
    </div>
  );
}
