/**
 * @module components/skills/SkillEditor
 * @description Editor panel for creating and editing skills with name, description, and markdown content fields
 *
 * PURPOSE:
 * - Provide a form for creating new skills or editing existing ones
 * - Show text inputs for name and description
 * - Show a textarea for markdown content (the skill body)
 * - Provide Save and Cancel actions
 *
 * DEPENDENCIES:
 * - react (useState, useEffect) - Local form state and syncing from props
 * - @/types/skill - Skill type for initial form values
 *
 * EXPORTS:
 * - SkillEditor - Skill editing form component
 *
 * PATTERNS:
 * - When skill prop is null, the form starts empty (create mode)
 * - When skill prop is provided, the form pre-fills with existing values (edit mode)
 * - Form state resets whenever the skill prop reference changes
 * - onSave receives the (name, description, content) tuple
 * - Save button is disabled when name is empty
 *
 * CLAUDE NOTES:
 * - The content textarea is intended for markdown; no preview is shown in this component
 * - useEffect syncs form state from skill prop -- this fires when switching between skills
 * - The parent decides whether to call addSkill or editSkill based on whether a skill was selected
 * - Cancel clears the form and calls onCancel (parent typically deselects the skill)
 * - A skill with id="" is treated as a pre-filled create (from pattern detection), not an edit
 */

import { useState, useEffect } from "react";
import type { Skill } from "@/types/skill";

interface SkillEditorProps {
  skill: Skill | null;
  onSave: (name: string, description: string, content: string) => void;
  onCancel: () => void;
}

export function SkillEditor({ skill, onSave, onCancel }: SkillEditorProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");

  // Sync form state when the selected skill changes
  useEffect(() => {
    if (skill) {
      setName(skill.name);
      setDescription(skill.description);
      setContent(skill.content);
    } else {
      setName("");
      setDescription("");
      setContent("");
    }
  }, [skill]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim(), description.trim(), content);
  };

  const handleCancel = () => {
    setName("");
    setDescription("");
    setContent("");
    onCancel();
  };

  const isEditing = skill !== null && skill.id !== "";
  const canSave = name.trim().length > 0;

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
      <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-neutral-400">
        {isEditing ? "Edit Skill" : "New Skill"}
      </h3>

      <div className="space-y-4">
        {/* Name field */}
        <div>
          <label
            htmlFor="skill-name"
            className="mb-1.5 block text-xs font-medium text-neutral-400"
          >
            Name
          </label>
          <input
            id="skill-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. React Component Generator"
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-400 outline-none transition-colors focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
        </div>

        {/* Description field */}
        <div>
          <label
            htmlFor="skill-description"
            className="mb-1.5 block text-xs font-medium text-neutral-400"
          >
            Description
          </label>
          <input
            id="skill-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of what this skill does"
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-400 outline-none transition-colors focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
        </div>

        {/* Content textarea */}
        <div>
          <label
            htmlFor="skill-content"
            className="mb-1.5 block text-xs font-medium text-neutral-400"
          >
            Content (Markdown)
          </label>
          <textarea
            id="skill-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your skill instructions in markdown..."
            rows={12}
            className="w-full resize-y rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 font-mono text-sm text-neutral-200 placeholder-neutral-400 outline-none transition-colors focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-neutral-800 pt-4">
          <button
            onClick={handleCancel}
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
            {isEditing ? "Save Changes" : "Create Skill"}
          </button>
        </div>
      </div>
    </div>
  );
}
