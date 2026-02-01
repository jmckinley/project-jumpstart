/**
 * @module components/ralph/CommandCenter
 * @description Main RALPH command center with prompt input and analysis controls
 *
 * PURPOSE:
 * - Provide prompt text input for RALPH loop tasks
 * - Trigger prompt quality analysis
 * - Display analysis results inline
 * - Allow starting RALPH loops from analyzed prompts
 * - Show auto-enhance option for low-quality prompts
 * - Provide example prompts for quick start
 * - Display learned context from previous loops (mistakes and patterns)
 *
 * DEPENDENCIES:
 * - @/types/ralph - PromptAnalysis, RalphLoopContext types
 *
 * EXPORTS:
 * - CommandCenter - Prompt input with analysis and loop controls
 *
 * PATTERNS:
 * - User types prompt, clicks "Check Prompt" to score quality
 * - After analysis, "Start Loop" button becomes available
 * - Auto-enhance replaces prompt text with RALPH-structured version
 * - Analysis results are shown below the input
 * - Example prompts help users understand good prompt structure
 * - "Learned from Previous Loops" banner shows when context has mistakes
 *
 * CLAUDE NOTES:
 * - Check Prompt button is disabled while analyzing or when prompt is empty
 * - Start Loop requires analysis to have been run first
 * - The prompt textarea is resizable and supports multiline input
 * - RALPH = Review, Analyze, List, Plan, Handoff
 * - Example prompts demonstrate specificity (files, functions, behavior)
 * - Context banner only shows when there are recent mistakes to learn from
 */

import { useState, useCallback } from "react";
import type { PromptAnalysis, RalphLoopContext } from "@/types/ralph";

const EXAMPLE_PROMPTS = [
  {
    label: "Add a feature",
    prompt: `GOAL: Add CSV export functionality to the dashboard.

CONTEXT: The dashboard (src/components/dashboard/) displays health scores and quick wins. Users need to export this data.

REQUIREMENTS:
1. Add an "Export CSV" button to the dashboard header
2. Export should include: health score, component breakdown, and quick wins list
3. Use the browser's native download API
4. File should be named "health-report-{date}.csv"

SUCCESS CRITERIA: Clicking the button downloads a valid CSV file with all dashboard data.`,
  },
  {
    label: "Fix a bug",
    prompt: `GOAL: Fix file watcher timeout issue in src-tauri/src/core/watcher.rs

PROBLEM: The file watcher stops detecting changes after ~30 minutes of app usage. Users report needing to restart the app.

INVESTIGATION STEPS:
1. Check if the watcher thread is being dropped
2. Look for timeout configurations in notify-rs
3. Verify event channel isn't filling up

SUCCESS CRITERIA: File watcher continues to detect changes after 1+ hours of continuous use.`,
  },
  {
    label: "Refactor code",
    prompt: `GOAL: Migrate useHealth hook from useState/useEffect to React Query.

CURRENT STATE: src/hooks/useHealth.ts uses manual state management with useState and useEffect for data fetching.

REQUIREMENTS:
1. Install @tanstack/react-query if not present
2. Replace useState with useQuery for health data
3. Add automatic background refetching every 30 seconds
4. Preserve existing refresh() function API for manual refetch
5. Add proper loading and error states

SUCCESS CRITERIA: Hook works identically but with automatic caching and background updates.`,
  },
];

interface CommandCenterProps {
  analysis: PromptAnalysis | null;
  context: RalphLoopContext | null;
  analyzing: boolean;
  loading: boolean;
  onAnalyze: (prompt: string) => void;
  onStartLoop: (prompt: string) => void;
  onClearAnalysis: () => void;
}

export function CommandCenter({
  analysis,
  context,
  analyzing,
  loading,
  onAnalyze,
  onStartLoop,
  onClearAnalysis,
}: CommandCenterProps) {
  const [prompt, setPrompt] = useState("");

  const handleAnalyze = useCallback(() => {
    if (prompt.trim()) {
      onAnalyze(prompt.trim());
    }
  }, [prompt, onAnalyze]);

  const handleStartLoop = useCallback(() => {
    if (prompt.trim()) {
      onStartLoop(prompt.trim());
      setPrompt("");
      onClearAnalysis();
    }
  }, [prompt, onStartLoop, onClearAnalysis]);

  const handleApplyEnhanced = useCallback(
    (enhanced: string) => {
      setPrompt(enhanced);
      onAnalyze(enhanced);
    },
    [onAnalyze],
  );

  const handleUseExample = useCallback((examplePrompt: string) => {
    setPrompt(examplePrompt);
  }, []);

  const canAnalyze = prompt.trim().length > 0 && !analyzing;
  const canStart = analysis !== null && !loading;

  return (
    <div className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium text-neutral-300">RALPH Command Center</h3>
          <p className="mt-1 text-xs leading-relaxed text-neutral-400">
            The RALPH loop is an automated agentic coding technique that repeatedly feeds your prompt to Claude Code
            until the task is complete. Each iteration starts with a fresh context, solving the "context accumulation"
            problem where AI agents lose focus as conversations grow. Write a clear, structured prompt and let RALPH
            handle the rest.
          </p>
        </div>
        {analysis && (
          <button
            onClick={() => {
              setPrompt("");
              onClearAnalysis();
            }}
            className="shrink-0 text-xs text-neutral-500 transition-colors hover:text-neutral-300"
          >
            Clear
          </button>
        )}
      </div>

      {/* Learned from Previous Loops Banner */}
      {context && context.recentMistakes.length > 0 && (
        <div className="rounded-md border border-yellow-800 bg-yellow-950/30 p-3">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 shrink-0 text-yellow-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm font-medium text-yellow-400">
              Learned from Previous Loops
            </span>
          </div>
          <ul className="mt-2 space-y-1">
            {context.recentMistakes.slice(0, 3).map((mistake) => (
              <li key={mistake.id} className="text-xs text-yellow-500/80">
                • {mistake.description}
                {mistake.resolution && (
                  <span className="text-yellow-600/60"> → {mistake.resolution}</span>
                )}
              </li>
            ))}
          </ul>
          {context.recentMistakes.length > 3 && (
            <p className="mt-1 text-xs text-yellow-600/60">
              +{context.recentMistakes.length - 3} more learned patterns
            </p>
          )}
        </div>
      )}

      {/* Example Prompts */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-neutral-500">Examples:</span>
        {EXAMPLE_PROMPTS.map((example) => (
          <button
            key={example.label}
            onClick={() => handleUseExample(example.prompt)}
            className="rounded-full bg-neutral-800 px-3 py-1 text-xs text-neutral-300 transition-colors hover:bg-neutral-700 hover:text-neutral-100"
          >
            {example.label}
          </button>
        ))}
      </div>

      {/* Prompt Input */}
      <div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what you want Claude Code to do. Be specific about files, functions, and expected behavior..."
          rows={5}
          className="w-full resize-y rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleAnalyze}
          disabled={!canAnalyze}
          title="Check if your prompt has enough detail for Claude Code to work effectively"
          className="rounded-md bg-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {analyzing ? "Checking..." : "Check Prompt"}
        </button>
        <button
          onClick={handleStartLoop}
          disabled={!canStart}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Starting..." : "Start RALPH Loop"}
        </button>
        {analysis && (
          <span className={`text-sm font-medium ${
            analysis.qualityScore >= 70
              ? "text-green-400"
              : analysis.qualityScore >= 40
                ? "text-yellow-400"
                : "text-red-400"
          }`}>
            Score: {analysis.qualityScore}/100
          </span>
        )}
      </div>

      {/* Auto-Enhance Inline */}
      {analysis?.enhancedPrompt && (
        <button
          onClick={() => handleApplyEnhanced(analysis.enhancedPrompt!)}
          className="flex w-full items-center gap-2 rounded-md border border-blue-900 bg-blue-950/30 px-3 py-2 text-left text-sm text-blue-400 transition-colors hover:bg-blue-950/50"
        >
          <span className="shrink-0 font-medium">Auto-Enhance</span>
          <span className="text-xs text-blue-500">
            Apply RALPH structure to improve prompt quality
          </span>
        </button>
      )}
    </div>
  );
}
