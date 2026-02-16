/**
 * @module components/memory/ClaudeMdAnalyzer
 * @description CLAUDE.md quality analyzer with actionable suggestions
 *
 * PURPOSE:
 * - Display CLAUDE.md quality score with breakdown
 * - Show actionable suggestions for improvement
 * - Highlight lines to remove or move
 *
 * DEPENDENCIES:
 * - @/types/memory - ClaudeMdAnalysis, AnalysisSuggestion, LineRemovalSuggestion, LineMoveTarget types
 *
 * EXPORTS:
 * - ClaudeMdAnalyzer - CLAUDE.md analysis component
 *
 * PATTERNS:
 * - Receives analysis results and analyzing state as props
 * - "Analyze" button triggers analysis via onAnalyze callback
 * - Suggestions list with type badges (remove, move, shorten, add)
 * - Lines to remove show content and reason
 * - Lines to move show target file suggestion
 *
 * CLAUDE NOTES:
 * - Score 0-100 with same color coding as health score (green >= 70, yellow 40-69, red < 40)
 * - Analysis can be null if not yet run
 * - Analyzing flag shows loading spinner on button
 * - suggestionType values: "remove", "move", "shorten", "add", "restructure", etc.
 */

import type { ClaudeMdAnalysis } from "@/types/memory";

interface ClaudeMdAnalyzerProps {
  analysis: ClaudeMdAnalysis | null;
  analyzing: boolean;
  onAnalyze: () => void;
}

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

function getSuggestionBadge(type: string): { label: string; className: string } {
  switch (type) {
    case "remove":
      return { label: "Remove", className: "bg-red-500/20 text-red-400 border-red-500/30" };
    case "move":
      return { label: "Move", className: "bg-purple-500/20 text-purple-400 border-purple-500/30" };
    case "shorten":
      return { label: "Shorten", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" };
    case "add":
      return { label: "Add", className: "bg-green-500/20 text-green-400 border-green-500/30" };
    case "restructure":
      return { label: "Restructure", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" };
    default:
      return { label: type, className: "bg-neutral-500/20 text-neutral-400 border-neutral-500/30" };
  }
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return tokens.toString();
}

export function ClaudeMdAnalyzer({ analysis, analyzing, onAnalyze }: ClaudeMdAnalyzerProps) {
  return (
    <div className="space-y-6">
      {/* Analyze Button + Score Header */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium uppercase tracking-wider text-neutral-400">
            CLAUDE.md Analysis
          </h3>
          <button
            onClick={onAnalyze}
            disabled={analyzing}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
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
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                Analyze
              </>
            )}
          </button>
        </div>

        {!analysis ? (
          <div className="py-8 text-center">
            <svg
              className="mx-auto mb-3 h-12 w-12 text-neutral-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
              />
            </svg>
            <p className="text-sm text-neutral-500">
              Click "Analyze" to evaluate your CLAUDE.md quality
            </p>
            <p className="mt-1 text-xs text-neutral-600">
              Get actionable suggestions to improve documentation effectiveness
            </p>
          </div>
        ) : (
          <>
            {/* Score + Stats Row */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="flex flex-col items-center rounded-lg border border-neutral-800 bg-neutral-950 p-3">
                <span className={`text-3xl font-bold ${getScoreColorClass(analysis.score)}`}>
                  {analysis.score}
                </span>
                <span className="text-xs text-neutral-500">Score</span>
              </div>
              <div className="flex flex-col items-center rounded-lg border border-neutral-800 bg-neutral-950 p-3">
                <span className="text-3xl font-bold text-neutral-200">{analysis.totalLines}</span>
                <span className="text-xs text-neutral-500">Lines</span>
              </div>
              <div className="flex flex-col items-center rounded-lg border border-neutral-800 bg-neutral-950 p-3">
                <span className="text-3xl font-bold text-neutral-200">
                  {formatTokens(analysis.estimatedTokens)}
                </span>
                <span className="text-xs text-neutral-500">Tokens</span>
              </div>
              <div className="flex flex-col items-center rounded-lg border border-neutral-800 bg-neutral-950 p-3">
                <span className="text-3xl font-bold text-neutral-200">
                  {analysis.sections.length}
                </span>
                <span className="text-xs text-neutral-500">Sections</span>
              </div>
            </div>

            {/* Score bar */}
            <div className="mb-6">
              <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-800">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${analysis.score}%`,
                    backgroundColor: getScoreColor(analysis.score),
                  }}
                />
              </div>
            </div>

            {/* Sections List */}
            {analysis.sections.length > 0 && (
              <div className="mb-4">
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Detected Sections
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.sections.map((section) => (
                    <span
                      key={section}
                      className="rounded-md bg-neutral-800 px-2 py-0.5 text-xs text-neutral-300"
                    >
                      {section}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Suggestions */}
      {analysis && analysis.suggestions.length > 0 && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
          <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-neutral-400">
            Suggestions ({analysis.suggestions.length})
          </h3>
          <div className="space-y-3">
            {analysis.suggestions.map((suggestion, idx) => {
              const badge = getSuggestionBadge(suggestion.suggestionType);
              return (
                <div
                  key={idx}
                  className="rounded-lg border border-neutral-800 bg-neutral-950 p-3"
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                    {suggestion.lineRange && (
                      <span className="text-xs text-neutral-600">
                        Lines {suggestion.lineRange[0]}-{suggestion.lineRange[1]}
                      </span>
                    )}
                    {suggestion.target && (
                      <span className="text-xs text-neutral-600">
                        Target: {suggestion.target}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-neutral-200">{suggestion.message}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lines to Remove */}
      {analysis && analysis.linesToRemove.length > 0 && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
          <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-neutral-400">
            Lines to Remove ({analysis.linesToRemove.length})
          </h3>
          <div className="space-y-2">
            {analysis.linesToRemove.map((line, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-red-500/20 bg-red-950/20 p-3"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-xs font-mono text-red-400">
                    L{line.lineNumber}
                  </span>
                  <span className="text-xs text-red-300">{line.reason}</span>
                </div>
                <p className="truncate font-mono text-xs text-neutral-400">{line.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lines to Move */}
      {analysis && analysis.linesToMove.length > 0 && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
          <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-neutral-400">
            Lines to Move ({analysis.linesToMove.length})
          </h3>
          <div className="space-y-2">
            {analysis.linesToMove.map((move, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-purple-500/20 bg-purple-950/20 p-3"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-xs font-mono text-purple-400">
                    L{move.lineRange[0]}-{move.lineRange[1]}
                  </span>
                  <svg
                    className="h-3 w-3 text-neutral-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <span className="text-xs font-medium text-purple-300">{move.targetFile}</span>
                </div>
                <p className="mb-1 truncate font-mono text-xs text-neutral-400">
                  {move.contentPreview}
                </p>
                <p className="text-xs text-neutral-500">{move.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No issues found */}
      {analysis &&
        analysis.suggestions.length === 0 &&
        analysis.linesToRemove.length === 0 &&
        analysis.linesToMove.length === 0 && (
          <div className="rounded-xl border border-green-500/20 bg-green-950/20 p-6 text-center">
            <svg
              className="mx-auto mb-2 h-8 w-8 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm font-medium text-green-400">
              No issues found
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Your CLAUDE.md looks great!
            </p>
          </div>
        )}
    </div>
  );
}
