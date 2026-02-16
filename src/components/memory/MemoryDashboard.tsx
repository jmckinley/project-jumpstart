/**
 * @module components/memory/MemoryDashboard
 * @description Memory health overview with source listing and metrics
 *
 * PURPOSE:
 * - Display overall memory health score and rating
 * - Show all memory sources with file stats
 * - Provide quick stats for learnings, rules, skills
 * - Show estimated token usage with progress bar
 *
 * DEPENDENCIES:
 * - @/types/memory - MemorySource, MemoryHealth types
 *
 * EXPORTS:
 * - MemoryDashboard - Memory health overview component
 *
 * PATTERNS:
 * - Receives health and sources as props from parent MemoryView
 * - Uses SVG circular indicator for claudeMdScore (same pattern as HealthScore.tsx)
 * - Source list is scrollable with icons per source type
 * - Health rating badge is color-coded: green=excellent, blue=good, yellow=needs-attention, red=poor
 *
 * CLAUDE NOTES:
 * - claudeMdScore ranges 0-100
 * - estimatedTokenUsage is compared against a 200k max context window
 * - Source types: "claude-md", "rules", "skills", "local-md", "hooks", etc.
 * - When health is null, show placeholder / loading state
 */

import type { MemorySource, MemoryHealth } from "@/types/memory";

interface MemoryDashboardProps {
  health: MemoryHealth | null;
  sources: MemorySource[];
  loading: boolean;
  onRefresh: () => void;
}

const MAX_CONTEXT_TOKENS = 200_000;

function getScoreColor(score: number): string {
  if (score >= 70) return "#22c55e";
  if (score >= 40) return "#eab308";
  return "#ef4444";
}

function getScoreColorClass(score: number): string {
  if (score >= 70) return "text-green-500";
  if (score >= 40) return "text-yellow-500";
  return "text-red-500";
}

function getRatingBadge(rating: string): { label: string; className: string } {
  switch (rating) {
    case "excellent":
      return { label: "Excellent", className: "bg-green-500/20 text-green-400 border-green-500/30" };
    case "good":
      return { label: "Good", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" };
    case "needs-attention":
      return { label: "Needs Attention", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" };
    case "poor":
      return { label: "Poor", className: "bg-red-500/20 text-red-400 border-red-500/30" };
    default:
      return { label: rating, className: "bg-neutral-500/20 text-neutral-400 border-neutral-500/30" };
  }
}

function getSourceIcon(sourceType: string): string {
  switch (sourceType) {
    case "claude-md":
      return "M";
    case "local-md":
      return "L";
    case "rules":
      return "R";
    case "skills":
      return "S";
    case "hooks":
      return "H";
    default:
      return "F";
  }
}

function getSourceIconColor(sourceType: string): string {
  switch (sourceType) {
    case "claude-md":
      return "bg-blue-500/20 text-blue-400";
    case "local-md":
      return "bg-purple-500/20 text-purple-400";
    case "rules":
      return "bg-amber-500/20 text-amber-400";
    case "skills":
      return "bg-green-500/20 text-green-400";
    case "hooks":
      return "bg-cyan-500/20 text-cyan-400";
    default:
      return "bg-neutral-500/20 text-neutral-400";
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return tokens.toString();
}

export function MemoryDashboard({ health, sources, loading, onRefresh }: MemoryDashboardProps) {
  const score = health?.claudeMdScore ?? 0;
  const circumference = 2 * Math.PI * 54;
  const offset = circumference * (1 - score / 100);
  const color = getScoreColor(score);
  const colorClass = getScoreColorClass(score);
  const rating = health ? getRatingBadge(health.healthRating) : null;

  const tokenPercent = health
    ? Math.min((health.estimatedTokenUsage / MAX_CONTEXT_TOKENS) * 100, 100)
    : 0;
  const tokenBarColor =
    tokenPercent >= 80 ? "bg-red-500" : tokenPercent >= 50 ? "bg-yellow-500" : "bg-green-500";

  return (
    <div className="space-y-6">
      {/* Health Score + Rating Card */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium uppercase tracking-wider text-neutral-400">
            Memory Health
          </h3>
          <div className="flex items-center gap-3">
            {rating && (
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${rating.className}`}
              >
                {rating.label}
              </span>
            )}
            <button
              onClick={onRefresh}
              disabled={loading}
              className="rounded-md border border-neutral-700 px-3 py-1 text-xs text-neutral-400 transition-colors hover:border-neutral-600 hover:text-neutral-200 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Circular Score Display */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative h-36 w-36">
              <svg
                className="-rotate-90"
                viewBox="0 0 120 120"
                width="144"
                height="144"
              >
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="#404040"
                  strokeWidth="8"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke={color}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-4xl font-bold ${colorClass}`}>{score}</span>
                <span className="text-xs text-neutral-500">CLAUDE.md</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              {health?.claudeMdLines ?? 0} lines
            </p>
          </div>

          {/* Quick Stats */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
                <p className="text-2xl font-bold text-neutral-100">
                  {health?.totalSources ?? 0}
                </p>
                <p className="text-xs text-neutral-500">Memory Sources</p>
              </div>
              <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
                <p className="text-2xl font-bold text-neutral-100">
                  {health?.totalLearnings ?? 0}
                </p>
                <p className="text-xs text-neutral-500">Total Learnings</p>
              </div>
              <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
                <p className="text-2xl font-bold text-neutral-100">
                  {health?.activeLearnings ?? 0}
                </p>
                <p className="text-xs text-neutral-500">Active Learnings</p>
              </div>
              <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
                <p className="text-2xl font-bold text-neutral-100">
                  {health?.rulesFileCount ?? 0}
                </p>
                <p className="text-xs text-neutral-500">Rules Files</p>
              </div>
            </div>

            <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-neutral-500">Skills Count</p>
                <p className="text-sm font-medium text-neutral-200">
                  {health?.skillsCount ?? 0}
                </p>
              </div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-neutral-500">Total Lines</p>
                <p className="text-sm font-medium text-neutral-200">
                  {health?.totalLines ?? 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Token Usage Bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-neutral-400">Estimated Token Usage</span>
            <span className="text-xs text-neutral-500">
              {formatTokens(health?.estimatedTokenUsage ?? 0)} / {formatTokens(MAX_CONTEXT_TOKENS)}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${tokenBarColor}`}
              style={{ width: `${tokenPercent}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-neutral-600">
            {tokenPercent.toFixed(0)}% of context window
          </p>
        </div>
      </div>

      {/* Memory Sources List */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-neutral-400">
          Memory Sources
        </h3>

        {sources.length === 0 && !loading ? (
          <p className="py-8 text-center text-sm text-neutral-500">
            No memory sources found. Create a CLAUDE.md file to get started.
          </p>
        ) : (
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {sources.map((source) => (
              <div
                key={source.path}
                className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3 transition-colors hover:border-neutral-700"
              >
                {/* Source type icon */}
                <div
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-xs font-bold ${getSourceIconColor(source.sourceType)}`}
                >
                  {getSourceIcon(source.sourceType)}
                </div>

                {/* Source info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-neutral-200">
                      {source.name}
                    </p>
                    <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-500">
                      {source.sourceType}
                    </span>
                  </div>
                  <p className="truncate text-xs text-neutral-500">{source.description}</p>
                </div>

                {/* Stats */}
                <div className="flex flex-shrink-0 items-center gap-4 text-xs text-neutral-500">
                  <span>{source.lineCount} lines</span>
                  <span>{formatBytes(source.sizeBytes)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
