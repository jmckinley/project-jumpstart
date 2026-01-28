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
 *
 * DEPENDENCIES:
 * - @/types/ralph - PromptAnalysis type
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
 *
 * CLAUDE NOTES:
 * - Check Prompt button is disabled while analyzing or when prompt is empty
 * - Start Loop requires analysis to have been run first
 * - The prompt textarea is resizable and supports multiline input
 * - RALPH = Review, Analyze, List, Plan, Handoff
 * - Example prompts demonstrate specificity (files, functions, behavior)
 */

import { useState, useCallback } from "react";
import type { PromptAnalysis } from "@/types/ralph";

const EXAMPLE_PROMPTS = [
  {
    label: "Add a feature",
    prompt: "Add a 'Export to CSV' button to the dashboard that exports the current health score breakdown and quick wins list to a downloadable CSV file.",
  },
  {
    label: "Fix a bug",
    prompt: "The file watcher stops detecting changes after the app has been open for more than 30 minutes. Investigate src/core/watcher.rs and fix the timeout issue.",
  },
  {
    label: "Refactor code",
    prompt: "Refactor the useHealth hook to use React Query for caching and automatic background refetching instead of manual useState/useEffect patterns.",
  },
];

interface CommandCenterProps {
  analysis: PromptAnalysis | null;
  analyzing: boolean;
  loading: boolean;
  onAnalyze: (prompt: string) => void;
  onStartLoop: (prompt: string) => void;
  onClearAnalysis: () => void;
}

export function CommandCenter({
  analysis,
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
            RALPH helps Claude Code work more effectively by structuring tasks into clear phases:
            <span className="ml-1 font-medium text-neutral-300">R</span>eview context,
            <span className="ml-1 font-medium text-neutral-300">A</span>nalyze requirements,
            <span className="ml-1 font-medium text-neutral-300">L</span>ist steps,
            <span className="ml-1 font-medium text-neutral-300">P</span>lan implementation,
            <span className="ml-1 font-medium text-neutral-300">H</span>andoff with documentation.
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
