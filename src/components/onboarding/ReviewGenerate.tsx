/**
 * @module components/onboarding/ReviewGenerate
 * @description Step 4 of onboarding wizard - summary of all selections with "Create Project" button
 *
 * PURPOSE:
 * - Display a read-only summary of all wizard selections
 * - Show project info: name, path, language, framework, database, testing, styling, type
 * - Show "What We'll Create" list based on selected goals and options
 * - Provide "Create Project" button that saves the project via Tauri backend
 * - Call onComplete callback with the created project on success
 *
 * DEPENDENCIES:
 * - @/stores/onboardingStore - useOnboardingStore for all wizard state
 * - @/lib/tauri - saveProject() to persist the project configuration
 * - @/types/project - Project, ProjectSetup types; GOALS constant for label lookup
 *
 * EXPORTS:
 * - ReviewGenerate - Step 4 wizard component (props: onComplete callback)
 *
 * PATTERNS:
 * - Builds a ProjectSetup object from store state and passes to saveProject()
 * - Summary rows show label + value pairs in a grid
 * - "What We'll Create" section lists items based on goals, generateModuleDocs, setupEnforcement
 * - Error state shown inline if project creation fails
 * - Button shows loading spinner during save
 *
 * CLAUDE NOTES:
 * - ProjectSetup requires: path, name, description, projectType, language, framework,
 *   database, testing, styling, goals, generateModuleDocs, setupEnforcement
 * - path comes from projectPath in the store
 * - onComplete receives the created Project object (with id, healthScore, createdAt from backend)
 * - Always reset generating state in finally block
 */

import { useState } from "react";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { saveProject } from "@/lib/tauri";
import type { Project, ProjectSetup } from "@/types/project";
import { GOALS } from "@/types/project";

interface ReviewGenerateProps {
  onComplete: (project: Project) => void;
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="text-sm text-neutral-400">{label}</span>
      <span className="text-sm font-medium text-neutral-100">
        {value || "Not set"}
      </span>
    </div>
  );
}

export function ReviewGenerate({ onComplete }: ReviewGenerateProps) {
  const projectPath = useOnboardingStore((s) => s.projectPath);
  const projectName = useOnboardingStore((s) => s.projectName);
  const projectDescription = useOnboardingStore((s) => s.projectDescription);
  const projectType = useOnboardingStore((s) => s.projectType);
  const language = useOnboardingStore((s) => s.language);
  const framework = useOnboardingStore((s) => s.framework);
  const database = useOnboardingStore((s) => s.database);
  const testing = useOnboardingStore((s) => s.testing);
  const styling = useOnboardingStore((s) => s.styling);
  const goals = useOnboardingStore((s) => s.goals);
  const generateModuleDocs = useOnboardingStore((s) => s.generateModuleDocs);
  const setupEnforcement = useOnboardingStore((s) => s.setupEnforcement);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedGoalLabels = GOALS.filter((g) => goals.includes(g.id)).map(
    (g) => g.label
  );

  const handleCreate = async () => {
    if (!projectPath || !projectName || !language) return;

    setError(null);
    setSaving(true);

    try {
      const setup: ProjectSetup = {
        path: projectPath,
        name: projectName,
        description: projectDescription,
        projectType,
        language,
        framework,
        database,
        testing,
        styling,
        goals,
        generateModuleDocs,
        setupEnforcement,
      };

      const project = await saveProject(setup);
      onComplete(project);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create project"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h2 className="mb-1 text-xl font-semibold text-neutral-100">
        Review & Create
      </h2>
      <p className="mb-6 text-sm text-neutral-400">
        Review your project configuration before creating it.
      </p>

      {/* Project Summary */}
      <div className="mb-6 rounded-lg border border-neutral-800 bg-neutral-900 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Project Summary
        </h3>
        <div className="divide-y divide-neutral-800">
          <SummaryRow label="Name" value={projectName} />
          <SummaryRow label="Path" value={projectPath} />
          <SummaryRow label="Type" value={projectType} />
          <SummaryRow label="Language" value={language} />
          <SummaryRow label="Framework" value={framework} />
          <SummaryRow label="Database" value={database} />
          <SummaryRow label="Testing" value={testing} />
          <SummaryRow label="Styling" value={styling} />
        </div>
        {projectDescription && (
          <div className="mt-3 border-t border-neutral-800 pt-3">
            <span className="text-xs text-neutral-500">Description</span>
            <p className="mt-1 text-sm text-neutral-300">
              {projectDescription}
            </p>
          </div>
        )}
      </div>

      {/* What We'll Create */}
      <div className="mb-6 rounded-lg border border-neutral-800 bg-neutral-900 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
          What We'll Create
        </h3>
        <ul className="flex flex-col gap-2">
          <li className="flex items-center gap-2 text-sm text-neutral-300">
            <svg
              className="h-4 w-4 shrink-0 text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            CLAUDE.md file with project configuration
          </li>

          {selectedGoalLabels.map((label) => (
            <li
              key={label}
              className="flex items-center gap-2 text-sm text-neutral-300"
            >
              <svg
                className="h-4 w-4 shrink-0 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Skill: {label}
            </li>
          ))}

          {generateModuleDocs && (
            <li className="flex items-center gap-2 text-sm text-neutral-300">
              <svg
                className="h-4 w-4 shrink-0 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Module documentation headers for all source files
            </li>
          )}

          {setupEnforcement && (
            <li className="flex items-center gap-2 text-sm text-neutral-300">
              <svg
                className="h-4 w-4 shrink-0 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Git hooks and CI enforcement checks
            </li>
          )}
        </ul>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-4 rounded-md border border-red-800/50 bg-red-900/20 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Create Button */}
      <button
        onClick={handleCreate}
        disabled={saving || !projectPath || !projectName || !language}
        className={`w-full rounded-lg px-6 py-3 text-sm font-medium transition-colors ${
          saving || !projectPath || !projectName || !language
            ? "cursor-not-allowed bg-neutral-800 text-neutral-500"
            : "bg-blue-600 text-white hover:bg-blue-500"
        }`}
      >
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-400 border-t-white" />
            Creating Project...
          </span>
        ) : (
          "Create Project"
        )}
      </button>
    </div>
  );
}
