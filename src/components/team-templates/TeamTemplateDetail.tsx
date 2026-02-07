/**
 * @module components/team-templates/TeamTemplateDetail
 * @description Detail panel for a selected library team template
 *
 * PURPOSE:
 * - Show team composition with all teammate roles and spawn prompts
 * - Display task flow with dependencies
 * - Display hooks configuration
 * - Show lead spawn instructions
 * - Provide "Add to Project" and "Deploy" actions
 *
 * DEPENDENCIES:
 * - @/types/team-template - ScoredTeamTemplate type
 * - @/components/ui/badge - Badge component
 *
 * EXPORTS:
 * - TeamTemplateDetail - Detail panel component
 *
 * PATTERNS:
 * - Content in scrollable area
 * - Teammates shown as list with expandable spawn prompts
 * - Tasks shown with dependency arrows
 * - Close button in top-right corner
 * - Actions at the bottom
 *
 * CLAUDE NOTES:
 * - Empty state shown when no template is selected
 * - onDeploy opens the deploy output panel
 * - onAdd saves the template to the project
 */

import type { ScoredTeamTemplate } from "@/types/team-template";
import { Badge } from "@/components/ui/badge";

interface TeamTemplateDetailProps {
  scoredTemplate: ScoredTeamTemplate | null;
  isAdded: boolean;
  onAdd: () => void;
  onDeploy: () => void;
  onClose: () => void;
}

const PATTERN_BADGE_STYLES: Record<string, string> = {
  leader: "bg-blue-900/40 text-blue-400",
  pipeline: "bg-amber-900/40 text-amber-400",
  parallel: "bg-green-900/40 text-green-400",
  swarm: "bg-purple-900/40 text-purple-400",
  council: "bg-rose-900/40 text-rose-400",
};

export function TeamTemplateDetail({
  scoredTemplate,
  isAdded,
  onAdd,
  onDeploy,
  onClose,
}: TeamTemplateDetailProps) {
  if (!scoredTemplate) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-500">
        <p className="text-sm">Select a team template to view details</p>
      </div>
    );
  }

  const { template, isRecommended, matchedTags } = scoredTemplate;
  const patternStyle = PATTERN_BADGE_STYLES[template.orchestrationPattern] ?? "bg-neutral-800 text-neutral-400";

  return (
    <div className="flex h-full flex-col rounded-lg border border-neutral-800 bg-neutral-900">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-neutral-800 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-neutral-100">
              {template.name}
            </h3>
            <Badge className={patternStyle}>
              {template.orchestrationPattern}
            </Badge>
            {isRecommended && (
              <Badge className="bg-green-900/40 text-green-400">
                Recommended
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-neutral-400">{template.description}</p>

          {/* Tags */}
          <div className="mt-3 flex flex-wrap gap-1">
            {template.tags.map((tag) => (
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
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Team Composition */}
        <div className="mb-6">
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
            Team Composition ({template.teammates.length} teammates)
          </h4>
          <div className="space-y-3">
            {template.teammates.map((mate) => (
              <div key={mate.role} className="rounded-md border border-neutral-800 p-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-900/40 text-xs font-medium text-blue-400">
                    {mate.role.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-neutral-200">{mate.role}</p>
                    <p className="mt-0.5 text-sm text-neutral-400">{mate.description}</p>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-blue-400 hover:text-blue-300">
                        View spawn prompt
                      </summary>
                      <pre className="mt-2 whitespace-pre-wrap break-words rounded-md bg-neutral-950 p-3 font-mono text-xs text-neutral-300">
                        {mate.spawnPrompt}
                      </pre>
                    </details>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Task Flow */}
        {template.tasks.length > 0 && (
          <div className="mb-6">
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
              Task Flow ({template.tasks.length} tasks)
            </h4>
            <div className="space-y-2">
              {template.tasks.map((task) => (
                <div key={task.id} className="rounded-md border border-neutral-800 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-neutral-200">{task.title}</p>
                      <p className="mt-0.5 text-sm text-neutral-400">{task.description}</p>
                    </div>
                    <Badge className="bg-neutral-800 text-neutral-400 shrink-0">
                      {task.assignedTo}
                    </Badge>
                  </div>
                  {task.blockedBy.length > 0 && (
                    <p className="mt-2 text-xs text-neutral-500">
                      Blocked by: {task.blockedBy.join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hooks */}
        {template.hooks.length > 0 && (
          <div className="mb-6">
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
              Hooks
            </h4>
            <div className="space-y-2">
              {template.hooks.map((hook) => (
                <div key={hook.event} className="rounded-md border border-neutral-800 p-3">
                  <p className="font-medium text-neutral-200">{hook.event}</p>
                  <code className="mt-1 block text-sm text-amber-400">{hook.command}</code>
                  <p className="mt-1 text-xs text-neutral-500">{hook.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lead Instructions */}
        {template.leadSpawnInstructions && (
          <div className="mb-6">
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
              Lead Instructions
            </h4>
            <pre className="whitespace-pre-wrap break-words rounded-md bg-neutral-950 p-3 font-mono text-xs text-neutral-300">
              {template.leadSpawnInstructions}
            </pre>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-neutral-800 p-4">
        <button
          onClick={onDeploy}
          className="text-sm text-blue-400 transition-colors hover:text-blue-300"
        >
          Deploy Output
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
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
