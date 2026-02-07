/**
 * @module components/team-templates/TeamTemplateEditor
 * @description Editor form for creating and editing team templates
 *
 * PURPOSE:
 * - Provide a form for creating new team templates or editing existing ones
 * - Show text inputs for name, description, pattern, category
 * - Inline teammate/task/hook editing with add/remove
 * - Lead spawn instructions textarea
 *
 * DEPENDENCIES:
 * - react (useState, useEffect) - Local form state
 * - @/types/team-template - TeamTemplate, OrchestrationPattern, TeamCategory, TeammateDef, TeamTaskDef, TeamHookDef
 * - @/data/teamCategories - TEAM_CATEGORIES for dropdown
 *
 * EXPORTS:
 * - TeamTemplateEditor - Team template editing form component
 *
 * PATTERNS:
 * - When template prop is null, form starts empty (create mode)
 * - When template prop is provided, form pre-fills (edit mode)
 * - Save button disabled when name is empty
 *
 * CLAUDE NOTES:
 * - Mirrors AgentEditor pattern but with team-specific fields
 * - Teammates, tasks, and hooks have inline add/remove editing
 * - Template with id="" is treated as pre-filled create (from library)
 */

import { useState, useEffect } from "react";
import type {
  TeamTemplate,
  OrchestrationPattern,
  TeamCategory,
  TeammateDef,
  TeamTaskDef,
  TeamHookDef,
} from "@/types/team-template";
import { TEAM_CATEGORIES } from "@/data/teamCategories";

interface TeamTemplateEditorProps {
  template: TeamTemplate | null;
  onSave: (
    name: string,
    description: string,
    orchestrationPattern: string,
    category: string,
    teammates: TeammateDef[],
    tasks: TeamTaskDef[],
    hooks: TeamHookDef[],
    leadSpawnInstructions: string,
  ) => void;
  onCancel: () => void;
}

const PATTERNS: { value: OrchestrationPattern; label: string }[] = [
  { value: "leader", label: "Leader" },
  { value: "pipeline", label: "Pipeline" },
  { value: "parallel", label: "Parallel" },
  { value: "swarm", label: "Swarm" },
  { value: "council", label: "Council" },
];

export function TeamTemplateEditor({ template, onSave, onCancel }: TeamTemplateEditorProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pattern, setPattern] = useState<OrchestrationPattern>("leader");
  const [category, setCategory] = useState<TeamCategory>("feature-development");
  const [teammates, setTeammates] = useState<TeammateDef[]>([]);
  const [tasks, setTasks] = useState<TeamTaskDef[]>([]);
  const [hooks, setHooks] = useState<TeamHookDef[]>([]);
  const [leadInstructions, setLeadInstructions] = useState("");

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description);
      setPattern(template.orchestrationPattern as OrchestrationPattern);
      setCategory(template.category as TeamCategory);
      setTeammates(template.teammates);
      setTasks(template.tasks);
      setHooks(template.hooks);
      setLeadInstructions(template.leadSpawnInstructions);
    } else {
      setName("");
      setDescription("");
      setPattern("leader");
      setCategory("feature-development");
      setTeammates([]);
      setTasks([]);
      setHooks([]);
      setLeadInstructions("");
    }
  }, [template]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim(), description.trim(), pattern, category, teammates, tasks, hooks, leadInstructions);
  };

  // Teammate helpers
  const addTeammate = () => {
    setTeammates([...teammates, { role: "", description: "", spawnPrompt: "" }]);
  };
  const updateTeammate = (index: number, field: keyof TeammateDef, value: string) => {
    const updated = [...teammates];
    updated[index] = { ...updated[index], [field]: value };
    setTeammates(updated);
  };
  const removeTeammate = (index: number) => {
    setTeammates(teammates.filter((_, i) => i !== index));
  };

  // Task helpers
  const addTask = () => {
    setTasks([...tasks, { id: `task-${tasks.length + 1}`, title: "", description: "", assignedTo: "", blockedBy: [] }]);
  };
  const updateTask = (index: number, field: keyof TeamTaskDef, value: string | string[]) => {
    const updated = [...tasks];
    updated[index] = { ...updated[index], [field]: value };
    setTasks(updated);
  };
  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  // Hook helpers
  const addHook = () => {
    setHooks([...hooks, { event: "", command: "", description: "" }]);
  };
  const updateHook = (index: number, field: keyof TeamHookDef, value: string) => {
    const updated = [...hooks];
    updated[index] = { ...updated[index], [field]: value };
    setHooks(updated);
  };
  const removeHook = (index: number) => {
    setHooks(hooks.filter((_, i) => i !== index));
  };

  const isEditing = template !== null && template.id !== "";
  const canSave = name.trim().length > 0;

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
      <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-neutral-400">
        {isEditing ? "Edit Team Template" : "New Team Template"}
      </h3>

      <div className="space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="team-name" className="mb-1.5 block text-xs font-medium text-neutral-400">Name</label>
          <input
            id="team-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Full Stack Feature Team"
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-400 outline-none focus:border-blue-600"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="team-desc" className="mb-1.5 block text-xs font-medium text-neutral-400">Description</label>
          <input
            id="team-desc"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this team's purpose"
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-400 outline-none focus:border-blue-600"
          />
        </div>

        {/* Pattern and Category */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="team-pattern" className="mb-1.5 block text-xs font-medium text-neutral-400">Pattern</label>
            <select
              id="team-pattern"
              value={pattern}
              onChange={(e) => setPattern(e.target.value as OrchestrationPattern)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 outline-none focus:border-blue-600"
            >
              {PATTERNS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="team-category" className="mb-1.5 block text-xs font-medium text-neutral-400">Category</label>
            <select
              id="team-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as TeamCategory)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 outline-none focus:border-blue-600"
            >
              {TEAM_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Teammates */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-medium text-neutral-400">Teammates</label>
            <button onClick={addTeammate} className="text-xs text-blue-400 hover:text-blue-300">+ Add Teammate</button>
          </div>
          {teammates.length === 0 ? (
            <p className="text-xs text-neutral-500">No teammates defined.</p>
          ) : (
            <div className="space-y-2">
              {teammates.map((mate, index) => (
                <div key={index} className="rounded-md border border-neutral-700 bg-neutral-800 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-400">Teammate {index + 1}</span>
                    <button onClick={() => removeTeammate(index)} className="text-neutral-500 hover:text-red-400">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={mate.role}
                    onChange={(e) => updateTeammate(index, "role", e.target.value)}
                    placeholder="Role name"
                    className="w-full rounded border border-neutral-600 bg-neutral-700 px-2 py-1 text-sm text-neutral-200"
                  />
                  <input
                    type="text"
                    value={mate.description}
                    onChange={(e) => updateTeammate(index, "description", e.target.value)}
                    placeholder="Role description"
                    className="w-full rounded border border-neutral-600 bg-neutral-700 px-2 py-1 text-sm text-neutral-200"
                  />
                  <textarea
                    value={mate.spawnPrompt}
                    onChange={(e) => updateTeammate(index, "spawnPrompt", e.target.value)}
                    placeholder="Spawn prompt..."
                    rows={3}
                    className="w-full resize-y rounded border border-neutral-600 bg-neutral-700 px-2 py-1 font-mono text-sm text-neutral-200"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tasks */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-medium text-neutral-400">Tasks</label>
            <button onClick={addTask} className="text-xs text-blue-400 hover:text-blue-300">+ Add Task</button>
          </div>
          {tasks.length === 0 ? (
            <p className="text-xs text-neutral-500">No tasks defined.</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((task, index) => (
                <div key={index} className="rounded-md border border-neutral-700 bg-neutral-800 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-400">Task {index + 1}</span>
                    <button onClick={() => removeTask(index)} className="text-neutral-500 hover:text-red-400">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={task.title}
                    onChange={(e) => updateTask(index, "title", e.target.value)}
                    placeholder="Task title"
                    className="w-full rounded border border-neutral-600 bg-neutral-700 px-2 py-1 text-sm text-neutral-200"
                  />
                  <input
                    type="text"
                    value={task.description}
                    onChange={(e) => updateTask(index, "description", e.target.value)}
                    placeholder="Task description"
                    className="w-full rounded border border-neutral-600 bg-neutral-700 px-2 py-1 text-sm text-neutral-200"
                  />
                  <input
                    type="text"
                    value={task.assignedTo}
                    onChange={(e) => updateTask(index, "assignedTo", e.target.value)}
                    placeholder="Assigned to (role name)"
                    className="w-full rounded border border-neutral-600 bg-neutral-700 px-2 py-1 text-sm text-neutral-200"
                  />
                  <input
                    type="text"
                    value={task.blockedBy.join(", ")}
                    onChange={(e) => updateTask(index, "blockedBy", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                    placeholder="Blocked by (comma-separated task IDs)"
                    className="w-full rounded border border-neutral-600 bg-neutral-700 px-2 py-1 text-sm text-neutral-200"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hooks */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-medium text-neutral-400">Hooks</label>
            <button onClick={addHook} className="text-xs text-blue-400 hover:text-blue-300">+ Add Hook</button>
          </div>
          {hooks.length === 0 ? (
            <p className="text-xs text-neutral-500">No hooks defined.</p>
          ) : (
            <div className="space-y-2">
              {hooks.map((hook, index) => (
                <div key={index} className="flex gap-2 rounded-md border border-neutral-700 bg-neutral-800 p-2">
                  <div className="flex-1 space-y-1">
                    <input
                      type="text"
                      value={hook.event}
                      onChange={(e) => updateHook(index, "event", e.target.value)}
                      placeholder="Event name"
                      className="w-full rounded border border-neutral-600 bg-neutral-700 px-2 py-1 text-sm text-neutral-200"
                    />
                    <input
                      type="text"
                      value={hook.command}
                      onChange={(e) => updateHook(index, "command", e.target.value)}
                      placeholder="Command"
                      className="w-full rounded border border-neutral-600 bg-neutral-700 px-2 py-1 text-sm text-neutral-200"
                    />
                    <input
                      type="text"
                      value={hook.description}
                      onChange={(e) => updateHook(index, "description", e.target.value)}
                      placeholder="Description"
                      className="w-full rounded border border-neutral-600 bg-neutral-700 px-2 py-1 text-sm text-neutral-200"
                    />
                  </div>
                  <button onClick={() => removeHook(index)} className="text-neutral-500 hover:text-red-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lead Instructions */}
        <div>
          <label htmlFor="lead-instructions" className="mb-1.5 block text-xs font-medium text-neutral-400">Lead Spawn Instructions</label>
          <textarea
            id="lead-instructions"
            value={leadInstructions}
            onChange={(e) => setLeadInstructions(e.target.value)}
            placeholder="Instructions for the lead agent coordinating this team..."
            rows={4}
            className="w-full resize-y rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 font-mono text-sm text-neutral-200 placeholder-neutral-400 outline-none focus:border-blue-600"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-neutral-800 pt-4">
          <button
            onClick={onCancel}
            className="rounded-md border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:border-neutral-600 hover:bg-neutral-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              canSave
                ? "bg-blue-600 text-white hover:bg-blue-500"
                : "cursor-not-allowed bg-neutral-800 text-neutral-600"
            }`}
          >
            {isEditing ? "Save Changes" : "Create Template"}
          </button>
        </div>
      </div>
    </div>
  );
}
