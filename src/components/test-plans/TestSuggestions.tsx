/**
 * @module components/test-plans/TestSuggestions
 * @description AI-generated test suggestions with accept/dismiss actions
 *
 * PURPOSE:
 * - Display AI-generated test case suggestions
 * - Allow accepting suggestions (creates test case)
 * - Allow dismissing suggestions
 *
 * DEPENDENCIES:
 * - @/types/test-plan - GeneratedTestSuggestion type
 *
 * EXPORTS:
 * - TestSuggestions - AI test suggestions component
 *
 * PATTERNS:
 * - Cards for each suggestion
 * - Accept adds to test plan, dismiss removes
 * - Show rationale for each suggestion
 *
 * CLAUDE NOTES:
 * - Suggestions are generated from code analysis
 * - Priority is color-coded
 * - Rationale explains why the test is important
 */

import type { GeneratedTestSuggestion, TestType, TestPriority } from "@/types/test-plan";

interface TestSuggestionsProps {
  suggestions: GeneratedTestSuggestion[];
  isGenerating: boolean;
  onGenerate: () => void;
  onAccept: (suggestion: GeneratedTestSuggestion) => void;
  onDismiss: (suggestionName: string) => void;
}

const priorityColors: Record<TestPriority, { bg: string; text: string }> = {
  critical: { bg: "bg-red-500/20", text: "text-red-400" },
  high: { bg: "bg-orange-500/20", text: "text-orange-400" },
  medium: { bg: "bg-yellow-500/20", text: "text-yellow-400" },
  low: { bg: "bg-neutral-700", text: "text-neutral-400" },
};

const typeLabels: Record<TestType, string> = {
  unit: "Unit",
  integration: "Integration",
  e2e: "E2E",
};

export function TestSuggestions({
  suggestions,
  isGenerating,
  onGenerate,
  onAccept,
  onDismiss,
}: TestSuggestionsProps) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-neutral-200">AI Suggestions</h3>
          <p className="mt-0.5 text-xs text-neutral-500">
            Test cases suggested based on your code
          </p>
        </div>
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGenerating ? (
            <span className="flex items-center gap-1.5">
              <svg
                className="h-3 w-3 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
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
            </span>
          ) : (
            "Generate Suggestions"
          )}
        </button>
      </div>

      {suggestions.length === 0 && !isGenerating ? (
        <div className="py-6 text-center">
          <p className="text-sm text-neutral-500">
            No suggestions yet. Click "Generate Suggestions" to analyze your code.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map((suggestion) => {
            const priorityInfo = priorityColors[suggestion.priority];

            return (
              <div
                key={suggestion.name}
                className="rounded-md border border-neutral-800 bg-neutral-950 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-neutral-200">
                        {suggestion.name}
                      </p>
                      <span className="rounded bg-neutral-700 px-1.5 py-0.5 text-xs text-neutral-400">
                        {typeLabels[suggestion.testType]}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs ${priorityInfo.bg} ${priorityInfo.text}`}
                      >
                        {suggestion.priority}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-neutral-400">
                      {suggestion.description}
                    </p>
                    <p className="mt-2 text-xs text-neutral-500 italic">
                      Why: {suggestion.rationale}
                    </p>
                    {suggestion.suggestedFilePath && (
                      <p className="mt-1 text-xs text-neutral-600">
                        Suggested file: {suggestion.suggestedFilePath}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-1.5">
                    <button
                      onClick={() => onAccept(suggestion)}
                      className="rounded-md bg-green-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-green-500"
                      title="Add to test plan"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => onDismiss(suggestion.name)}
                      className="rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-500 transition-colors hover:border-neutral-600 hover:text-neutral-400"
                      title="Dismiss suggestion"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
