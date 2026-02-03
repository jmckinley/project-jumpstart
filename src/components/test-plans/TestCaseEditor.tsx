/**
 * @module components/test-plans/TestCaseEditor
 * @description Form for creating and editing test cases
 *
 * PURPOSE:
 * - Create new test cases with name, description, file path, type, and priority
 * - Edit existing test cases
 * - Link test cases to actual test files
 *
 * DEPENDENCIES:
 * - react (useState, useEffect) - Form state management
 * - @/types/test-plan - TestCase, TestType, TestPriority types
 *
 * EXPORTS:
 * - TestCaseEditor - Test case editor form component
 *
 * PATTERNS:
 * - Controlled form inputs with local state
 * - File path is optional but recommended
 * - Type and priority have sensible defaults
 *
 * CLAUDE NOTES:
 * - Default type is "unit"
 * - Default priority is "medium"
 * - Status cannot be manually set (determined by test runs)
 */

import { useState, useEffect } from "react";
import type { TestCase, TestType, TestPriority } from "@/types/test-plan";

interface TestCaseEditorProps {
  testCase?: TestCase | null;
  planId: string;
  onSave: (data: {
    name: string;
    description: string;
    filePath?: string;
    testType: TestType;
    priority: TestPriority;
  }) => void;
  onCancel: () => void;
}

export function TestCaseEditor({ testCase, planId: _planId, onSave, onCancel }: TestCaseEditorProps) {
  const isEditing = !!testCase;

  const [name, setName] = useState(testCase?.name || "");
  const [description, setDescription] = useState(testCase?.description || "");
  const [filePath, setFilePath] = useState(testCase?.filePath || "");
  const [testType, setTestType] = useState<TestType>(testCase?.testType || "unit");
  const [priority, setPriority] = useState<TestPriority>(testCase?.priority || "medium");

  useEffect(() => {
    if (testCase) {
      setName(testCase.name);
      setDescription(testCase.description);
      setFilePath(testCase.filePath || "");
      setTestType(testCase.testType);
      setPriority(testCase.priority);
    }
  }, [testCase]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      description: description.trim(),
      filePath: filePath.trim() || undefined,
      testType,
      priority,
    });
  };

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <h3 className="mb-4 text-sm font-medium text-neutral-200">
        {isEditing ? "Edit Test Case" : "New Test Case"}
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
            placeholder="e.g., should validate email format"
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
            placeholder="What this test verifies..."
            rows={2}
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* File Path */}
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-400">
            Test File Path (optional)
          </label>
          <input
            type="text"
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            placeholder="e.g., src/components/Button.test.tsx"
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Type and Priority row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Test Type */}
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-400">
              Type
            </label>
            <div className="flex gap-1">
              {(["unit", "integration", "e2e"] as TestType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTestType(t)}
                  className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                    testType === t
                      ? "bg-blue-600 text-white"
                      : "border border-neutral-700 text-neutral-500 hover:border-neutral-600"
                  }`}
                >
                  {t === "e2e" ? "E2E" : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-400">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TestPriority)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-sm text-neutral-300"
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

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
            {isEditing ? "Save Changes" : "Add Test Case"}
          </button>
        </div>
      </form>
    </div>
  );
}
