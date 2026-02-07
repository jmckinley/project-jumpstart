/**
 * @module components/team-templates/TeamTemplatesList
 * @description List component for displaying saved project team templates
 *
 * PURPOSE:
 * - Display all team templates for the current project
 * - Allow selecting a template for editing
 * - Provide delete action for each template
 * - Show "New Template" button
 *
 * DEPENDENCIES:
 * - @/types/team-template - TeamTemplate type
 * - @/components/ui/badge - Badge component
 *
 * EXPORTS:
 * - TeamTemplatesList - Project team templates list component
 *
 * PATTERNS:
 * - Mirrors AgentsList component pattern
 * - Selected template is highlighted
 * - Delete button with confirmation
 *
 * CLAUDE NOTES:
 * - Templates sorted by usage count (most used first)
 * - Empty state shows message with create CTA
 * - Pattern badge is color-coded
 */

import type { TeamTemplate } from "@/types/team-template";
import { Badge } from "@/components/ui/badge";

interface TeamTemplatesListProps {
  templates: TeamTemplate[];
  selectedId: string | null;
  onSelect: (template: TeamTemplate) => void;
  onCreateNew: () => void;
  onDelete: (id: string) => void;
}

const PATTERN_BADGE_STYLES: Record<string, string> = {
  leader: "bg-blue-900/40 text-blue-400",
  pipeline: "bg-amber-900/40 text-amber-400",
  parallel: "bg-green-900/40 text-green-400",
  swarm: "bg-purple-900/40 text-purple-400",
  council: "bg-rose-900/40 text-rose-400",
};

export function TeamTemplatesList({
  templates,
  selectedId,
  onSelect,
  onCreateNew,
  onDelete,
}: TeamTemplatesListProps) {
  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this team template?")) {
      onDelete(id);
    }
  };

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium uppercase tracking-wider text-neutral-400">
          My Teams
        </h3>
        <button
          onClick={onCreateNew}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-500"
        >
          New Template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center text-center">
          <p className="text-sm text-neutral-400">No team templates yet.</p>
          <p className="mt-1 text-xs text-neutral-500">
            Create one or add from the library.
          </p>
        </div>
      ) : (
        <div className="max-h-[400px] space-y-2 overflow-y-auto pr-1">
          {templates.map((template) => (
            <div
              key={template.id}
              onClick={() => onSelect(template)}
              className={`group cursor-pointer rounded-md border p-3 transition-colors ${
                selectedId === template.id
                  ? "border-blue-600 bg-blue-950/20"
                  : "border-neutral-800 bg-neutral-850 hover:border-neutral-700"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="truncate text-sm font-medium text-neutral-200">
                      {template.name}
                    </h4>
                    <Badge
                      className={
                        PATTERN_BADGE_STYLES[template.orchestrationPattern] ??
                        "bg-neutral-800 text-neutral-400"
                      }
                    >
                      {template.orchestrationPattern}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-neutral-500">
                    {template.teammates.length} teammates, {template.tasks.length} tasks
                  </p>
                  <p className="mt-1 text-xs text-neutral-600">
                    Used {template.usageCount} time{template.usageCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDeleteClick(e, template.id)}
                  className="shrink-0 rounded p-1 text-neutral-500 opacity-0 transition-opacity hover:bg-neutral-700 hover:text-red-400 group-hover:opacity-100"
                  title="Delete template"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
