/**
 * @module components/test-plans/HooksGenerator
 * @description Generate PostToolUse hooks configuration for automatic test runs
 *
 * PURPOSE:
 * - Generate Claude Code hooks for automatic test execution
 * - Configure file patterns and test commands
 * - Preview and export hooks configuration
 *
 * DEPENDENCIES:
 * - react (useState) - Local state for form and preview
 *
 * EXPORTS:
 * - HooksGenerator - Hooks configuration generator component
 *
 * PATTERNS:
 * - Form for test command and file patterns
 * - Preview generated JSON
 * - Copy to clipboard
 *
 * CLAUDE NOTES:
 * - PostToolUse hooks run after Edit/Write operations
 * - Matcher filters by tool and file path pattern
 * - Test command runs automatically after matching edits
 */

import { useState } from "react";

interface HooksGeneratorProps {
  defaultCommand?: string;
  onGenerate: (testCommand: string, filePatterns?: string[]) => Promise<string | null>;
}

export function HooksGenerator({ defaultCommand, onGenerate }: HooksGeneratorProps) {
  const [testCommand, setTestCommand] = useState(
    defaultCommand || "pnpm vitest run --reporter=verbose"
  );
  const [filePatterns, setFilePatterns] = useState("*.ts,*.tsx");
  const [generatedConfig, setGeneratedConfig] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    const patterns = filePatterns
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    const config = await onGenerate(testCommand, patterns.length > 0 ? patterns : undefined);
    setGeneratedConfig(config);
    setIsGenerating(false);
  };

  const handleCopy = async () => {
    if (!generatedConfig) return;
    await navigator.clipboard.writeText(generatedConfig);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <h3 className="mb-1 text-sm font-medium text-neutral-200">
        Hooks Generator
      </h3>
      <p className="mb-4 text-xs text-neutral-500">
        Generate PostToolUse hooks to auto-run tests after file edits
      </p>

      {/* Form */}
      <div className="mb-4 space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-400">
            Test Command
          </label>
          <input
            type="text"
            value={testCommand}
            onChange={(e) => setTestCommand(e.target.value)}
            placeholder="pnpm vitest run"
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 font-mono text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-400">
            File Patterns (comma-separated)
          </label>
          <input
            type="text"
            value={filePatterns}
            onChange={(e) => setFilePatterns(e.target.value)}
            placeholder="*.ts,*.tsx"
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-blue-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-neutral-600">
            Tests will run when files matching these patterns are edited
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating || !testCommand.trim()}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGenerating ? "Generating..." : "Generate Hooks Config"}
        </button>
      </div>

      {/* Generated config preview */}
      {generatedConfig && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">
              Generated Configuration:
            </span>
            <button
              onClick={handleCopy}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="max-h-48 overflow-auto rounded-md bg-neutral-950 p-3">
            <pre className="whitespace-pre-wrap font-mono text-xs text-neutral-300">
              {generatedConfig}
            </pre>
          </div>
          <p className="mt-2 text-xs text-neutral-600">
            Add this to your{" "}
            <code className="text-neutral-400">.claude/settings.json</code> or{" "}
            <code className="text-neutral-400">~/.claude/settings.json</code>
          </p>
        </div>
      )}
    </div>
  );
}
