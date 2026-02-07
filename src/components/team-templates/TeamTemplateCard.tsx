/**
 * @module components/team-templates/TeamTemplateCard
 * @description Card component for displaying a team template in the library grid
 *
 * PURPOSE:
 * - Display template name, description, pattern badge, and teammate count
 * - Show "Recommended" badge for relevant templates
 * - Show "Add" button or "Added" indicator
 * - Handle click to select for detail view
 *
 * DEPENDENCIES:
 * - @/types/team-template - ScoredTeamTemplate type
 * - @/components/ui/badge - Badge component for pattern and tags
 *
 * EXPORTS:
 * - TeamTemplateCard - Library template card component
 *
 * PATTERNS:
 * - Card is clickable to select
 * - Add button stops propagation to not trigger select
 * - Pattern badge is color-coded (leader=blue, pipeline=amber, parallel=green, swarm=purple, council=rose)
 * - Recommended badge is green
 *
 * CLAUDE NOTES:
 * - isAdded shows checkmark instead of Add button
 * - Teammate count shown as a stat
 * - Card has hover state and selected state
 */

import type { ScoredTeamTemplate } from "@/types/team-template";
import { Badge } from "@/components/ui/badge";

interface TeamTemplateCardProps {
  scoredTemplate: ScoredTeamTemplate;
  isAdded: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onAdd: () => void;
}

const PATTERN_BADGE_STYLES: Record<string, string> = {
  leader: "bg-blue-900/40 text-blue-400",
  pipeline: "bg-amber-900/40 text-amber-400",
  parallel: "bg-green-900/40 text-green-400",
  swarm: "bg-purple-900/40 text-purple-400",
  council: "bg-rose-900/40 text-rose-400",
};

export function TeamTemplateCard({
  scoredTemplate,
  isAdded,
  isSelected,
  onSelect,
  onAdd,
}: TeamTemplateCardProps) {
  const { template, isRecommended } = scoredTemplate;
  const patternStyle = PATTERN_BADGE_STYLES[template.orchestrationPattern] ?? "bg-neutral-800 text-neutral-400";

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdded) {
      onAdd();
    }
  };

  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-lg border p-4 transition-colors ${
        isSelected
          ? "border-blue-600 bg-blue-950/20"
          : "border-neutral-800 bg-neutral-900 hover:border-neutral-700"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate font-medium text-neutral-100">
              {template.name}
            </h4>
            <Badge className={patternStyle}>
              {template.orchestrationPattern}
            </Badge>
            {isRecommended && (
              <Badge className="bg-green-900/40 text-green-400">
                Recommended
              </Badge>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-neutral-400">
            {template.description}
          </p>
        </div>

        <button
          onClick={handleAddClick}
          disabled={isAdded}
          className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            isAdded
              ? "cursor-default bg-neutral-800 text-neutral-500"
              : "bg-blue-600 text-white hover:bg-blue-500"
          }`}
        >
          {isAdded ? (
            <span className="flex items-center gap-1">
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
              Added
            </span>
          ) : (
            "Add"
          )}
        </button>
      </div>

      {/* Stats row */}
      <div className="mt-3 flex items-center gap-4 text-xs text-neutral-500">
        <span>{template.teammates.length} teammates</span>
        <span>{template.tasks.length} tasks</span>
        {template.hooks.length > 0 && <span>{template.hooks.length} hooks</span>}
      </div>

      {/* Tags */}
      <div className="mt-2 flex flex-wrap gap-1">
        {template.tags.slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400"
          >
            {tag}
          </span>
        ))}
        {template.tags.length > 4 && (
          <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-500">
            +{template.tags.length - 4}
          </span>
        )}
      </div>
    </div>
  );
}
