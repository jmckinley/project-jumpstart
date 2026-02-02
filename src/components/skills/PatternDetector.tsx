/**
 * @module components/skills/PatternDetector
 * @description Displays detected project patterns with frequency badges and allows creating skills from them
 *
 * PURPOSE:
 * - Show a list of detected recurring patterns in the project
 * - Display impact badge per pattern (High/Medium/Low based on frequency)
 * - Provide a "Create Skill" button per pattern to pre-fill a new skill from the suggested content
 * - Pass pattern ID to parent so pattern can be removed after skill creation
 * - Allow triggering a fresh pattern detection scan
 *
 * DEPENDENCIES:
 * - @/types/skill - Pattern type for list item rendering
 *
 * EXPORTS:
 * - PatternDetector - Pattern detection results component with create actions
 *
 * PATTERNS:
 * - "Detect Patterns" button triggers onDetect (parent calls detectProjectPatterns)
 * - Each pattern row shows description, impact badge, and a "Create Skill" button
 * - "Create Skill" calls onCreateFromPattern(patternId, description, suggestedSkill) to pre-fill the skill editor
 * - Only patterns with a non-null suggestedSkill show the "Create Skill" button
 *
 * CLAUDE NOTES:
 * - detecting prop controls the spinner state on the "Detect Patterns" button
 * - Impact badge: >= 10 = "High Impact" (green), >= 5 = "Medium Impact" (yellow), < 5 = "Low Impact" (neutral)
 * - Badge shows frequency count in tooltip on hover
 * - If no patterns are found, a placeholder message is shown
 * - The parent is responsible for managing the transition from pattern to skill editor
 * - Parent should call removePattern(patternId) after creating a skill to remove it from list
 */

import type { Pattern } from "@/types/skill";

interface PatternDetectorProps {
  patterns: Pattern[];
  detecting: boolean;
  onDetect: () => void;
  onCreateFromPattern: (patternId: string, description: string, content: string) => void;
}

function ImpactBadge({ frequency }: { frequency: number }) {
  let colorClasses: string;
  let label: string;

  if (frequency >= 10) {
    colorClasses = "bg-green-500/20 text-green-400";
    label = "High Impact";
  } else if (frequency >= 5) {
    colorClasses = "bg-yellow-500/20 text-yellow-400";
    label = "Medium Impact";
  } else {
    colorClasses = "bg-neutral-700 text-neutral-400";
    label = "Low Impact";
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClasses}`}
      title={`Found ${frequency} times in codebase`}
    >
      {label}
    </span>
  );
}

export function PatternDetector({
  patterns,
  detecting,
  onDetect,
  onCreateFromPattern,
}: PatternDetectorProps) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
      {/* Header with detect button */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium uppercase tracking-wider text-neutral-400">
          Detected Patterns
        </h3>
        <button
          onClick={onDetect}
          disabled={detecting}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            detecting
              ? "cursor-not-allowed bg-neutral-800 text-neutral-600"
              : "border border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-600 hover:bg-neutral-700"
          }`}
        >
          {detecting ? (
            <span className="flex items-center gap-2">
              <svg
                className="h-3.5 w-3.5 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
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
              Detecting...
            </span>
          ) : (
            "Detect Patterns"
          )}
        </button>
      </div>

      {/* Pattern list */}
      {patterns.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-neutral-500">No patterns detected yet.</p>
          <p className="mt-1 text-xs text-neutral-600">
            Click "Detect Patterns" to scan your project for recurring code
            patterns.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {patterns.map((pattern) => (
            <div
              key={pattern.id}
              className="flex items-center gap-3 rounded-md border border-neutral-800 bg-neutral-950 px-4 py-3"
            >
              {/* Pattern info */}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-neutral-300">
                  {pattern.description}
                </p>
              </div>

              {/* Impact badge */}
              <ImpactBadge frequency={pattern.frequency} />

              {/* Create Skill button */}
              {pattern.suggestedSkill && (
                <button
                  onClick={() =>
                    onCreateFromPattern(
                      pattern.id,
                      pattern.description,
                      pattern.suggestedSkill!,
                    )
                  }
                  className="shrink-0 rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-500"
                >
                  Create Skill
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
