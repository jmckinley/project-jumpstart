/**
 * @module components/ralph/PromptAnalyzer
 * @description Displays prompt quality analysis with criteria breakdown and suggestions
 *
 * PURPOSE:
 * - Show quality score as a visual gauge
 * - Display individual criteria scores (clarity, specificity, context, scope)
 * - Show improvement suggestions
 * - Provide auto-enhance button to apply RALPH structure
 *
 * DEPENDENCIES:
 * - @/types/ralph - PromptAnalysis, PromptCriterion types
 *
 * EXPORTS:
 * - PromptAnalyzer - Analysis results display component
 *
 * PATTERNS:
 * - Renders null when no analysis is provided
 * - Criteria are displayed as progress bars (0-25 each)
 * - Color coding: green (>=20), yellow (>=12), red (<12)
 * - Auto-enhance is only shown when enhancedPrompt is available
 *
 * CLAUDE NOTES:
 * - Quality score range is 0-100
 * - Each criterion max is 25
 * - Enhanced prompt is only generated when score < 70
 */

import type { PromptAnalysis } from "@/types/ralph";

interface PromptAnalyzerProps {
  analysis: PromptAnalysis | null;
  onApplyEnhanced?: (enhanced: string) => void;
}

function getScoreColor(score: number, max: number): string {
  const pct = (score / max) * 100;
  if (pct >= 80) return "bg-green-500";
  if (pct >= 48) return "bg-yellow-500";
  return "bg-red-500";
}

function getOverallColor(score: number): string {
  if (score >= 70) return "text-green-400";
  if (score >= 40) return "text-yellow-400";
  return "text-red-400";
}

function getOverallLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Needs Work";
}

export function PromptAnalyzer({ analysis, onApplyEnhanced }: PromptAnalyzerProps) {
  if (!analysis) return null;

  return (
    <div className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      {/* Overall Score */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-neutral-300">Prompt Quality</h3>
          <p className={`text-2xl font-bold ${getOverallColor(analysis.qualityScore)}`}>
            {analysis.qualityScore}
            <span className="text-sm font-normal text-neutral-500">/100</span>
          </p>
        </div>
        <div className={`rounded-md px-3 py-1 text-xs font-medium ${
          analysis.qualityScore >= 70
            ? "bg-green-950 text-green-400"
            : analysis.qualityScore >= 40
              ? "bg-yellow-950 text-yellow-400"
              : "bg-red-950 text-red-400"
        }`}>
          {getOverallLabel(analysis.qualityScore)}
        </div>
      </div>

      {/* Criteria Breakdown */}
      <div className="space-y-3">
        {analysis.criteria.map((criterion) => (
          <div key={criterion.name}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-400">{criterion.name}</span>
              <span className="text-xs text-neutral-500">
                {criterion.score}/{criterion.maxScore}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-neutral-800">
              <div
                className={`h-2 rounded-full transition-all ${getScoreColor(criterion.score, criterion.maxScore)}`}
                style={{ width: `${(criterion.score / criterion.maxScore) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-neutral-500">{criterion.feedback}</p>
          </div>
        ))}
      </div>

      {/* Suggestions */}
      {analysis.suggestions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-neutral-400">Suggestions</h4>
          <ul className="space-y-1">
            {analysis.suggestions.map((suggestion, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-neutral-500">
                <span className="mt-0.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Auto-Enhance Button */}
      {analysis.enhancedPrompt && onApplyEnhanced && (
        <button
          onClick={() => onApplyEnhanced(analysis.enhancedPrompt!)}
          className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
        >
          Auto-Enhance with RALPH Structure
        </button>
      )}
    </div>
  );
}
