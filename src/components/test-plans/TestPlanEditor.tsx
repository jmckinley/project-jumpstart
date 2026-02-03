/**
 * @module components/test-plans/TestPlanEditor
 * @description Form for creating and editing test plans
 *
 * PURPOSE:
 * - Create new test plans with name, description, and target coverage
 * - Edit existing test plans
 * - Change plan status (draft, active, archived)
 *
 * DEPENDENCIES:
 * - react (useState, useEffect) - Form state management
 * - @/types/test-plan - TestPlan, TestPlanStatus types
 *
 * EXPORTS:
 * - TestPlanEditor - Test plan editor form component
 *
 * PATTERNS:
 * - Controlled form inputs with local state
 * - onSave callback with form data
 * - isEditing prop determines create vs edit mode
 *
 * CLAUDE NOTES:
 * - Target coverage defaults to 80%
 * - Status can only be changed in edit mode
 */

import { useState, useEffect } from "react";
import type { TestPlan, TestPlanStatus } from "@/types/test-plan";

interface TestPlanEditorProps {
  plan?: TestPlan | null;
  onSave: (data: {
    name: string;
    description: string;
    status?: TestPlanStatus;
    targetCoverage: number;
  }) => void;
  onCancel: () => void;
}

export function TestPlanEditor({ plan, onSave, onCancel }: TestPlanEditorProps) {
  const isEditing = !!plan;

  const [name, setName] = useState(plan?.name || "");
  const [description, setDescription] = useState(plan?.description || "");
  const [status, setStatus] = useState<TestPlanStatus>(plan?.status || "draft");
  const [targetCoverage, setTargetCoverage] = useState(plan?.targetCoverage || 80);

  useEffect(() => {
    if (plan) {
      setName(plan.name);
      setDescription(plan.description);
      setStatus(plan.status);
      setTargetCoverage(plan.targetCoverage);
    }
  }, [plan]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      description: description.trim(),
      status: isEditing ? status : undefined,
      targetCoverage,
    });
  };

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <h3 className="mb-4 text-sm font-medium text-neutral-200">
        {isEditing ? "Edit Test Plan" : "New Test Plan"}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-400">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., User Authentication Tests"
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-400">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of what this test plan covers..."
            rows={3}
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Target Coverage */}
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-400">
            Target Coverage: {targetCoverage}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={targetCoverage}
            onChange={(e) => setTargetCoverage(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
          <div className="mt-1 flex justify-between text-xs text-neutral-600">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Status (edit mode only) */}
        {isEditing && (
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-400">
              Status
            </label>
            <div className="flex gap-2">
              {(["draft", "active", "archived"] as TestPlanStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    status === s
                      ? s === "active"
                        ? "bg-green-500/20 text-green-400"
                        : s === "archived"
                        ? "bg-neutral-700 text-neutral-400"
                        : "bg-neutral-700 text-neutral-300"
                      : "border border-neutral-700 text-neutral-500 hover:border-neutral-600"
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-400 transition-colors hover:border-neutral-600 hover:text-neutral-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isEditing ? "Save Changes" : "Create Plan"}
          </button>
        </div>
      </form>
    </div>
  );
}
