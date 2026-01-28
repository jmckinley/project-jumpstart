/**
 * @module components/skills/SkillsList
 * @description Displays a filterable list of skills with tabs for project and all skills, selection, and delete actions
 *
 * PURPOSE:
 * - Show all available skills in a scrollable list
 * - Provide tab-style sections for "Project" and "All" skills
 * - Highlight the selected skill and allow clicking to preview/edit
 * - Expose a "New Skill" button for creating new skills
 * - Allow deleting individual skills via an inline delete button
 *
 * DEPENDENCIES:
 * - react (useState) - Local state for the active tab
 * - @/types/skill - Skill type for list item rendering
 *
 * EXPORTS:
 * - SkillsList - Skills list component with tab filtering, selection, and delete
 *
 * PATTERNS:
 * - selectedId is controlled externally via props
 * - Tab state is managed locally: "project" shows skills with a projectId, "all" shows everything
 * - Each skill row shows name, truncated description, and usage count badge
 * - The "New Skill" button at the top calls onCreateNew
 * - Delete button per skill calls onDelete(id)
 *
 * CLAUDE NOTES:
 * - "Project" tab filters to skills where projectId is non-null
 * - "All" tab shows all skills regardless of projectId
 * - Clicking a skill row triggers onSelect(skill) for preview/editing
 * - Delete button uses event.stopPropagation to avoid triggering row selection
 * - Usage count is displayed as a small badge on the right of each row
 */

import { useState } from "react";
import type { Skill } from "@/types/skill";

interface SkillsListProps {
  skills: Skill[];
  selectedId: string | null;
  onSelect: (skill: Skill) => void;
  onCreateNew: () => void;
  onDelete: (id: string) => void;
}

type TabValue = "project" | "all";

export function SkillsList({
  skills,
  selectedId,
  onSelect,
  onCreateNew,
  onDelete,
}: SkillsListProps) {
  const [activeTab, setActiveTab] = useState<TabValue>("project");

  const filteredSkills =
    activeTab === "project"
      ? skills.filter((s) => s.projectId !== null)
      : skills;

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
      {/* Header with New Skill button */}
      <div className="mb-3 flex items-center justify-between px-2">
        <h3 className="text-xs font-medium uppercase tracking-wider text-neutral-500">
          Skills
        </h3>
        <button
          onClick={onCreateNew}
          className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-500"
        >
          + New Skill
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-3 flex gap-1 rounded-md bg-neutral-950 p-1">
        <button
          onClick={() => setActiveTab("project")}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTab === "project"
              ? "bg-neutral-800 text-neutral-200"
              : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          Project
          <span className="ml-1.5 inline-flex items-center rounded-full bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-400">
            {skills.filter((s) => s.projectId !== null).length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("all")}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTab === "all"
              ? "bg-neutral-800 text-neutral-200"
              : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          All
          <span className="ml-1.5 inline-flex items-center rounded-full bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-400">
            {skills.length}
          </span>
        </button>
      </div>

      {/* Skills list */}
      <div className="max-h-[500px] space-y-1 overflow-y-auto">
        {filteredSkills.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-neutral-500">
              {activeTab === "project"
                ? "No project skills yet."
                : "No skills created yet."}
            </p>
            <p className="mt-1 text-xs text-neutral-600">
              Click "New Skill" to create one.
            </p>
          </div>
        ) : (
          filteredSkills.map((skill) => {
            const isSelected = skill.id === selectedId;

            return (
              <button
                key={skill.id}
                onClick={() => onSelect(skill)}
                className={`group flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors ${
                  isSelected
                    ? "bg-neutral-800 text-neutral-100"
                    : "text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{skill.name}</p>
                  {skill.description && (
                    <p className="mt-0.5 truncate text-xs text-neutral-500">
                      {skill.description}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {/* Usage count badge */}
                  <span className="inline-flex items-center rounded-full bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-500">
                    {skill.usageCount}x
                  </span>

                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(skill.id);
                    }}
                    className="rounded p-0.5 text-neutral-600 opacity-0 transition-all hover:bg-neutral-700 hover:text-red-400 group-hover:opacity-100"
                    title="Delete skill"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
