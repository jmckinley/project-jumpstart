/**
 * @module components/onboarding/GoalsSelect
 * @description Step 3 of onboarding wizard - checkbox list for goals and context rot options
 *
 * PURPOSE:
 * - Display all available goals as a checkbox list
 * - Allow toggling individual goals on/off
 * - Show "Generate module documentation" and "Set up enforcement" checkboxes
 * - Provide context about what each selection enables
 *
 * DEPENDENCIES:
 * - @/stores/onboardingStore - useOnboardingStore for goals state
 * - @/types/project - GOALS constant with id, label, and skill mappings
 *
 * EXPORTS:
 * - GoalsSelect - Step 3 wizard component
 *
 * PATTERNS:
 * - Each goal maps to a skill that will be configured for the project
 * - Goals are toggled via useOnboardingStore.toggleGoal()
 * - Module docs and enforcement are separate boolean flags
 * - Goals section and options section are visually distinct card groups
 *
 * CLAUDE NOTES:
 * - GOALS constant has { id, label, skill } shape
 * - Default goals are ["features", "tests", "reviews", "debugging", "documentation"] (set in store initial state)
 * - generateModuleDocs defaults to true, setupEnforcement defaults to false (opt-in)
 * - These selections influence what gets generated in step 4
 */

import { useOnboardingStore } from "@/stores/onboardingStore";
import { GOALS } from "@/types/project";

export function GoalsSelect() {
  const goals = useOnboardingStore((s) => s.goals);
  const generateModuleDocs = useOnboardingStore((s) => s.generateModuleDocs);
  const setupEnforcement = useOnboardingStore((s) => s.setupEnforcement);
  const toggleGoal = useOnboardingStore((s) => s.toggleGoal);
  const setGenerateModuleDocs = useOnboardingStore(
    (s) => s.setGenerateModuleDocs
  );
  const setSetupEnforcement = useOnboardingStore((s) => s.setSetupEnforcement);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h2 className="mb-1 text-xl font-semibold text-neutral-100">
        What will you use Claude Code for?
      </h2>
      <p className="mb-6 text-sm text-neutral-400">
        Select the tasks you want to optimize. We'll configure skills and
        documentation patterns for each.
      </p>

      {/* Goals Checkboxes */}
      <div className="mb-6 rounded-lg border border-neutral-800 bg-neutral-900 p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Goals
        </h3>
        <div className="flex flex-col gap-3">
          {GOALS.map((goal) => {
            const isChecked = goals.includes(goal.id);
            return (
              <label
                key={goal.id}
                className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-neutral-800"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleGoal(goal.id)}
                  className="h-4 w-4 rounded border-neutral-600 bg-neutral-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                />
                <div className="flex flex-col">
                  <span className="text-sm text-neutral-100">{goal.label}</span>
                  <span className="text-xs text-neutral-500">
                    Enables: {goal.skill}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Context Rot Prevention Options */}
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Context Rot Prevention
        </h3>
        <div className="flex flex-col gap-3">
          {/* Generate Module Docs */}
          <label className="flex cursor-pointer items-start gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-neutral-800">
            <input
              type="checkbox"
              checked={generateModuleDocs}
              onChange={(e) => setGenerateModuleDocs(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-neutral-600 bg-neutral-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
            />
            <div className="flex flex-col">
              <span className="text-sm text-neutral-100">
                Generate module documentation for all files
              </span>
              <span className="text-xs leading-relaxed text-neutral-500">
                Adds documentation headers to every source file so Claude always
                has context, even after long sessions.
              </span>
            </div>
          </label>

          {/* Set Up Enforcement */}
          <label className="flex cursor-pointer items-start gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-neutral-800">
            <input
              type="checkbox"
              checked={setupEnforcement}
              onChange={(e) => setSetupEnforcement(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-neutral-600 bg-neutral-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
            />
            <div className="flex flex-col gap-1">
              <span className="text-sm text-neutral-100">
                Install pre-commit hook for automatic doc enforcement
              </span>
              <span className="text-xs leading-relaxed text-neutral-500">
                Installs a git pre-commit hook that checks staged files for
                missing documentation headers. In auto-update mode, it uses the
                Anthropic API to generate headers automatically before each
                commit. Includes self-healing: if AI output corrupts a file, the
                hook restores the original and continues safely.
              </span>
              <span className="text-xs leading-relaxed text-neutral-400">
                You can configure or remove the hook at any time from the
                Enforcement section.
              </span>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
