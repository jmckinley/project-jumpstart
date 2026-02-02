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
 * - Support PRD mode for multi-story task execution
 *
 * DEPENDENCIES:
 * - @/types/ralph - PromptAnalysis, RalphLoopContext, PrdFile types
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
 * - PRD mode allows multi-story execution with fresh context per story
 *
 * CLAUDE NOTES:
 * - Check Prompt button is disabled while analyzing or when prompt is empty
 * - Start Loop requires analysis to have been run first (iterative mode only)
 * - PRD mode skips analysis and starts immediately with validated JSON
 * - The prompt textarea is resizable and supports multiline input
 * - RALPH = Review, Analyze, List, Plan, Handoff (our interpretation)
 * - Original "Ralph" is named after Ralph Wiggum from The Simpsons
 * - Example prompts demonstrate specificity (files, functions, behavior)
 * - Context banner only shows when there are recent mistakes to learn from
 */

import { useState, useCallback, useMemo } from "react";
import type { PromptAnalysis, RalphLoopContext, PrdFile } from "@/types/ralph";

type LoopMode = "iterative" | "prd";

const DEFAULT_PRD: PrdFile = {
  name: "My Feature",
  description: "Describe the overall goal here",
  branch: "feature/my-feature",
  testCommand: "pnpm test",
  typecheckCommand: "pnpm tsc --noEmit",
  maxIterationsPerStory: 3,
  stories: [
    {
      id: "story-1",
      title: "Story 1: Setup",
      description: "Set up the basic structure for the feature",
      acceptanceCriteria: "Files are created and compile successfully",
      priority: 1,
      completed: false,
    },
    {
      id: "story-2",
      title: "Story 2: Implementation",
      description: "Implement the main functionality",
      priority: 2,
      completed: false,
    },
    {
      id: "story-3",
      title: "Story 3: Tests",
      description: "Add tests for the new functionality",
      acceptanceCriteria: "All tests pass",
      priority: 3,
      completed: false,
    },
  ],
};

const EXAMPLE_PRD: PrdFile = {
  name: "Add CSV Export",
  description: "Add CSV export functionality to the dashboard",
  branch: "feature/csv-export",
  testCommand: "pnpm test",
  typecheckCommand: "pnpm tsc --noEmit",
  maxIterationsPerStory: 3,
  stories: [
    {
      id: "csv-1",
      title: "Add export utility function",
      description: "Create src/lib/csvExport.ts with a function that converts an array of objects to CSV format. Handle special characters and escaping properly.",
      acceptanceCriteria: "Function exists and handles edge cases",
      priority: 1,
      completed: false,
    },
    {
      id: "csv-2",
      title: "Add Export button to dashboard",
      description: "Add an 'Export CSV' button to the dashboard header in src/components/dashboard/. When clicked, it should export the current health data.",
      acceptanceCriteria: "Button is visible and clickable",
      priority: 2,
      completed: false,
    },
    {
      id: "csv-3",
      title: "Implement download trigger",
      description: "Wire up the button to generate and download the CSV file. Use the browser's native download API. Filename should be health-report-{date}.csv",
      acceptanceCriteria: "Clicking button downloads a valid CSV",
      priority: 3,
      completed: false,
    },
  ],
};

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
  onStartLoopPrd: (prdJson: string) => void;
  onClearAnalysis: () => void;
}

export function CommandCenter({
  analysis,
  context,
  analyzing,
  loading,
  onAnalyze,
  onStartLoop,
  onStartLoopPrd,
  onClearAnalysis,
}: CommandCenterProps) {
  const [mode, setMode] = useState<LoopMode>("iterative");
  const [prompt, setPrompt] = useState("");
  const [prdJson, setPrdJson] = useState(() => JSON.stringify(DEFAULT_PRD, null, 2));
  const [prdError, setPrdError] = useState<string | null>(null);

  // Validate PRD JSON
  const parsedPrd = useMemo(() => {
    try {
      const parsed = JSON.parse(prdJson) as PrdFile;
      if (!parsed.name || !parsed.stories || parsed.stories.length === 0) {
        setPrdError("PRD must have a name and at least one story");
        return null;
      }
      setPrdError(null);
      return parsed;
    } catch {
      setPrdError("Invalid JSON");
      return null;
    }
  }, [prdJson]);

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

  const handleStartLoopPrd = useCallback(() => {
    if (parsedPrd) {
      onStartLoopPrd(prdJson);
      setPrdJson(JSON.stringify(DEFAULT_PRD, null, 2));
    }
  }, [parsedPrd, prdJson, onStartLoopPrd]);

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
  const canStartPrd = parsedPrd !== null && !loading;

  return (
    <div className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium text-neutral-300">RALPH Command Center</h3>
          <p className="mt-1 text-xs leading-relaxed text-neutral-400">
            {mode === "iterative" ? (
              <>
                <strong>Iterative Mode:</strong> AI analyzes output after each execution and feeds issues to the next iteration.
                Best for complex, nuanced tasks where intelligent issue detection adds value.
              </>
            ) : (
              <>
                <strong>PRD Mode:</strong> Like the original "Ralph Wiggum" approach — each story gets fresh context,
                git commits between stories. Best for large PRDs with many independent stories.
              </>
            )}
          </p>
        </div>
        {(analysis || mode === "prd") && (
          <button
            onClick={() => {
              setPrompt("");
              onClearAnalysis();
              if (mode === "prd") {
                setPrdJson(JSON.stringify(DEFAULT_PRD, null, 2));
              }
            }}
            className="shrink-0 text-xs text-neutral-500 transition-colors hover:text-neutral-300"
          >
            Clear
          </button>
        )}
      </div>

      {/* Mode Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-neutral-500">Mode:</span>
        <div className="flex rounded-md border border-neutral-700">
          <button
            onClick={() => setMode("iterative")}
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              mode === "iterative"
                ? "bg-blue-600 text-white"
                : "bg-neutral-800 text-neutral-400 hover:text-neutral-200"
            } rounded-l-md`}
          >
            Iterative
          </button>
          <button
            onClick={() => setMode("prd")}
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              mode === "prd"
                ? "bg-purple-600 text-white"
                : "bg-neutral-800 text-neutral-400 hover:text-neutral-200"
            } rounded-r-md`}
          >
            PRD
          </button>
        </div>
        <a
          href="https://github.com/snarktank/ralph"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-neutral-500 hover:text-neutral-300"
        >
          What is Ralph?
        </a>
      </div>

      {/* Iterative Mode Content */}
      {mode === "iterative" && (
        <>
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
        </>
      )}

      {/* PRD Mode Content */}
      {mode === "prd" && (
        <>
          <div className="space-y-3 rounded-md border border-purple-800 bg-purple-950/20 p-3">
            <div>
              <p className="text-xs font-medium text-purple-200">How PRD Mode Works</p>
              <p className="mt-1 text-xs text-purple-300">
                Based on the "Ralph Wiggum" technique: each story gets a <strong>fresh Claude context</strong>,
                solving the "context accumulation" problem. Changes are <strong>committed to git</strong> between
                stories, so progress persists in your filesystem—not in AI memory.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="font-medium text-purple-200">Best For:</p>
                <ul className="mt-1 space-y-0.5 text-purple-300/90">
                  <li>• Large features with many tasks</li>
                  <li>• Overnight/long-running sessions</li>
                  <li>• Independent, well-scoped stories</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-purple-200">Tips:</p>
                <ul className="mt-1 space-y-0.5 text-purple-300/90">
                  <li>• Keep stories small (1 context window)</li>
                  <li>• Define clear acceptance criteria</li>
                  <li>• Configure test/typecheck commands</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Load Example Button */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">Template:</span>
            <button
              onClick={() => setPrdJson(JSON.stringify(EXAMPLE_PRD, null, 2))}
              className="rounded-full bg-purple-900/50 px-3 py-1 text-xs text-purple-200 transition-colors hover:bg-purple-900 hover:text-purple-100"
            >
              Load CSV Export Example
            </button>
            <button
              onClick={() => setPrdJson(JSON.stringify(DEFAULT_PRD, null, 2))}
              className="rounded-full bg-neutral-800 px-3 py-1 text-xs text-neutral-300 transition-colors hover:bg-neutral-700 hover:text-neutral-100"
            >
              Reset to Template
            </button>
          </div>

          {/* PRD JSON Editor */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-neutral-400">PRD JSON</label>
              {parsedPrd && (
                <span className="text-xs text-purple-300">
                  {parsedPrd.stories.length} stories • Branch: {parsedPrd.branch}
                </span>
              )}
            </div>
            <textarea
              value={prdJson}
              onChange={(e) => setPrdJson(e.target.value)}
              placeholder="Enter your PRD as JSON..."
              rows={12}
              className={`w-full resize-y rounded-md border bg-neutral-800 px-3 py-2 font-mono text-xs text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-1 ${
                prdError
                  ? "border-red-600 focus:border-red-600 focus:ring-red-600"
                  : "border-neutral-700 focus:border-purple-600 focus:ring-purple-600"
              }`}
            />
            {prdError && (
              <p className="mt-1 text-xs text-red-400">{prdError}</p>
            )}
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-300">
                PRD Field Reference
              </summary>
              <div className="mt-2 rounded bg-neutral-800/50 p-2 text-xs text-neutral-400">
                <div className="grid grid-cols-2 gap-2">
                  <div><code className="text-purple-300">name</code>: Feature name</div>
                  <div><code className="text-purple-300">branch</code>: Git branch to use</div>
                  <div><code className="text-purple-300">testCommand</code>: e.g., "pnpm test"</div>
                  <div><code className="text-purple-300">typecheckCommand</code>: e.g., "pnpm tsc"</div>
                  <div><code className="text-purple-300">maxIterationsPerStory</code>: Retry limit (1-5)</div>
                  <div><code className="text-purple-300">stories[].title</code>: Short task name</div>
                  <div><code className="text-purple-300">stories[].description</code>: What to do</div>
                  <div><code className="text-purple-300">stories[].acceptanceCriteria</code>: Done when...</div>
                </div>
              </div>
            </details>
          </div>

          {/* PRD Preview */}
          {parsedPrd && (
            <div className="rounded-md border border-neutral-700 bg-neutral-800/50 p-3">
              <h4 className="text-sm font-medium text-neutral-200">{parsedPrd.name}</h4>
              {parsedPrd.description && (
                <p className="mt-1 text-xs text-neutral-400">{parsedPrd.description}</p>
              )}
              <div className="mt-3 space-y-2">
                {parsedPrd.stories.map((story, index) => (
                  <div
                    key={story.id}
                    className="flex items-start gap-2 rounded bg-neutral-900/50 p-2"
                  >
                    <span className="shrink-0 rounded bg-purple-900 px-1.5 py-0.5 text-xs font-medium text-purple-200">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-neutral-200">{story.title}</p>
                      <p className="text-xs text-neutral-500 line-clamp-1">
                        {story.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Start PRD Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleStartLoopPrd}
              disabled={!canStartPrd}
              className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Starting..." : "Start PRD Loop"}
            </button>
            {parsedPrd && (
              <span className="text-xs text-neutral-500">
                Will create branch "{parsedPrd.branch}" and execute {parsedPrd.stories.length} stories
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
