/**
 * @module components/skills/SkillLibraryDetail
 * @description Detail panel for a selected library skill
 *
 * PURPOSE:
 * - Show full skill content in a formatted view
 * - Provide "Add to Project" action
 * - Provide "Customize in Expert Mode" link
 *
 * DEPENDENCIES:
 * - @/lib/skillRelevance - ScoredSkill type
 * - @/components/ui/badge - Badge component
 *
 * EXPORTS:
 * - SkillLibraryDetail - Detail panel component
 *
 * PATTERNS:
 * - Content is displayed in a scrollable pre block with markdown styling
 * - Close button in top-right corner
 * - Actions at the bottom
 *
 * CLAUDE NOTES:
 * - Content is markdown but displayed as preformatted text for simplicity
 * - onCustomize pre-fills the skill editor with this content
 * - Empty state shown when no skill is selected
 */

import type { ScoredSkill } from "@/lib/skillRelevance";
import { Badge } from "@/components/ui/badge";

interface SkillLibraryDetailProps {
  scoredSkill: ScoredSkill | null;
  isAdded: boolean;
  onAdd: () => void;
  onCustomize: () => void;
  onClose: () => void;
}

export function SkillLibraryDetail({
  scoredSkill,
  isAdded,
  onAdd,
  onCustomize,
  onClose,
}: SkillLibraryDetailProps) {
  if (!scoredSkill) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-500">
        <p className="text-sm">Select a skill to view details</p>
      </div>
    );
  }

  const { skill, isRecommended, matchedTags } = scoredSkill;

  return (
    <div className="flex h-full flex-col rounded-lg border border-neutral-800 bg-neutral-900">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-neutral-800 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-neutral-100">
              {skill.name}
            </h3>
            {isRecommended && (
              <Badge className="bg-green-900/40 text-green-400">
                Recommended
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-neutral-400">{skill.description}</p>

          {/* Tags */}
          <div className="mt-3 flex flex-wrap gap-1">
            {skill.tags.map((tag) => (
              <span
                key={tag}
                className={`rounded-full px-2 py-0.5 text-xs ${
                  matchedTags.includes(tag)
                    ? "bg-blue-900/40 text-blue-400"
                    : "bg-neutral-800 text-neutral-400"
                }`}
              >
                {tag}
                {matchedTags.includes(tag) && tag !== "universal" && " (match)"}
              </span>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          className="shrink-0 rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-neutral-300">
          {skill.content}
        </pre>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-neutral-800 p-4">
        <button
          onClick={onCustomize}
          className="text-sm text-blue-400 transition-colors hover:text-blue-300"
        >
          Customize in Expert Mode
        </button>

        <button
          onClick={onAdd}
          disabled={isAdded}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            isAdded
              ? "cursor-default bg-neutral-800 text-neutral-500"
              : "bg-blue-600 text-white hover:bg-blue-500"
          }`}
        >
          {isAdded ? (
            <span className="flex items-center gap-1.5">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Added to Project
            </span>
          ) : (
            "Add to Project"
          )}
        </button>
      </div>
    </div>
  );
}
