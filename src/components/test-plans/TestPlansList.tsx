/**
 * @module components/test-plans/TestPlansList
 * @description Displays a list of test plans with status badges and quick actions
 *
 * PURPOSE:
 * - Show all test plans for the active project
 * - Display status badges (draft, active, archived)
 * - Show coverage and test counts
 * - Allow selecting a plan for details
 *
 * DEPENDENCIES:
 * - @/types/test-plan - TestPlan, TestPlanStatus types
 *
 * EXPORTS:
 * - TestPlansList - Test plans list component
 *
 * PATTERNS:
 * - selectedId is controlled externally via props
 * - Status badge colors match plan status
 * - Coverage shows as progress bar vs target
 *
 * CLAUDE NOTES:
 * - Draft = gray, Active = green, Archived = neutral
 * - Coverage bar shows current vs target with different colors
 */

import type { TestPlan } from "@/types/test-plan";

interface TestPlansListProps {
  plans: TestPlan[];
  selectedId: string | null;
  onSelect: (plan: TestPlan) => void;
  onCreateNew: () => void;
  onDelete: (id: string) => void;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: "bg-neutral-700", text: "text-neutral-300" },
  active: { bg: "bg-green-500/20", text: "text-green-400" },
  archived: { bg: "bg-neutral-800", text: "text-neutral-500" },
};

export function TestPlansList({
  plans,
  selectedId,
  onSelect,
  onCreateNew,
  onDelete,
}: TestPlansListProps) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between px-2">
        <h3 className="text-xs font-medium uppercase tracking-wider text-neutral-500">
          Test Plans
        </h3>
        <button
          onClick={onCreateNew}
          className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-500"
        >
          + New Plan
        </button>
      </div>

      {/* Plans list */}
      <div className="max-h-[500px] space-y-1 overflow-y-auto">
        {plans.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-neutral-500">No test plans yet.</p>
            <p className="mt-1 text-xs text-neutral-600">
              Click "New Plan" to create one.
            </p>
          </div>
        ) : (
          plans.map((plan) => {
            const isSelected = plan.id === selectedId;
            const colors = statusColors[plan.status] || statusColors.draft;

            return (
              <button
                key={plan.id}
                onClick={() => onSelect(plan)}
                className={`group flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors ${
                  isSelected
                    ? "bg-neutral-800 text-neutral-100"
                    : "text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{plan.name}</p>
                    <span
                      className={`inline-flex rounded-full px-1.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
                    >
                      {plan.status}
                    </span>
                  </div>
                  {plan.description && (
                    <p className="mt-0.5 truncate text-xs text-neutral-500">
                      {plan.description}
                    </p>
                  )}
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-neutral-600">
                    <span>Target: {plan.targetCoverage}%</span>
                  </div>
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(plan.id);
                  }}
                  className="shrink-0 rounded p-0.5 text-neutral-600 opacity-0 transition-all hover:bg-neutral-700 hover:text-red-400 group-hover:opacity-100"
                  title="Delete plan"
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
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
