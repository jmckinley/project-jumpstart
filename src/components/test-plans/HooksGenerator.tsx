/**
 * @module components/test-plans/HooksGenerator
 * @description Generate Claude Code hooks configuration for multiple hook events
 *
 * PURPOSE:
 * - Generate PostToolUse hooks for automatic test execution
 * - Generate PreCompact hooks for context preservation
 * - Generate SessionEnd hooks for learning extraction
 * - Generate skill-level hooks in YAML frontmatter format
 * - Configure file patterns and commands per hook type
 * - Preview and export hooks configuration
 *
 * DEPENDENCIES:
 * - react (useState) - Local state for form and preview
 *
 * EXPORTS:
 * - HooksGenerator - Hooks configuration generator component
 *
 * PATTERNS:
 * - Tab selection for hook type (PostToolUse, PreCompact, SessionEnd, Skill)
 * - Form for command, file patterns, timeout
 * - Preview generated JSON or YAML
 * - Copy to clipboard
 *
 * CLAUDE NOTES:
 * - PostToolUse hooks run after Edit/Write operations
 * - PreCompact hooks run before context compaction
 * - SessionEnd hooks run at end of session
 * - Skill hooks use YAML frontmatter in SKILL.md files
 * - Matcher filters by tool and file path pattern
 */

import { useState } from "react";

type HookType = "post-tool-use" | "pre-compact" | "session-end" | "skill";

interface HookTypeConfig {
  id: HookType;
  label: string;
  description: string;
  defaultCommand: string;
  showFilePatterns: boolean;
  showMatcher: boolean;
  outputFormat: "json" | "yaml";
}

const HOOK_TYPES: HookTypeConfig[] = [
  {
    id: "post-tool-use",
    label: "PostToolUse",
    description: "Auto-run tests after file edits",
    defaultCommand: "pnpm vitest run --reporter=verbose",
    showFilePatterns: true,
    showMatcher: true,
    outputFormat: "json",
  },
  {
    id: "pre-compact",
    label: "PreCompact",
    description: "Preserve context before compaction",
    defaultCommand: ".claude/hooks/pre-compact.sh",
    showFilePatterns: false,
    showMatcher: false,
    outputFormat: "json",
  },
  {
    id: "session-end",
    label: "SessionEnd",
    description: "Extract learnings at session end",
    defaultCommand: ".claude/hooks/extract-learnings.sh",
    showFilePatterns: false,
    showMatcher: false,
    outputFormat: "json",
  },
  {
    id: "skill",
    label: "Skill Hook",
    description: "Attach hooks to a SKILL.md file",
    defaultCommand: "pnpm test --run",
    showFilePatterns: true,
    showMatcher: false,
    outputFormat: "yaml",
  },
];

interface HooksGeneratorProps {
  defaultCommand?: string;
  onGenerate: (testCommand: string, filePatterns?: string[]) => Promise<string | null>;
}

function generatePreCompactConfig(command: string, timeout: number): string {
  return JSON.stringify(
    {
      hooks: {
        PreCompact: [
          {
            matcher: "",
            hooks: [
              {
                type: "command",
                command,
                description: "Save critical context before compaction",
                timeout,
              },
            ],
          },
        ],
      },
    },
    null,
    2,
  );
}

function generateSessionEndConfig(command: string, timeout: number): string {
  return JSON.stringify(
    {
      hooks: {
        SessionEnd: [
          {
            matcher: "",
            hooks: [
              {
                type: "command",
                command,
                description: "Extract learnings from session transcript",
                timeout,
              },
            ],
          },
        ],
      },
    },
    null,
    2,
  );
}

function generateSkillHookYaml(
  command: string,
  event: string,
  filePatterns: string[],
): string {
  const patternsLine =
    filePatterns.length > 0
      ? `\nfile_patterns:\n${filePatterns.map((p) => `  - "${p}"`).join("\n")}`
      : "";

  return `---
hooks:
  - event: ${event}
    command: "${command}"${patternsLine}
---

# Your Skill Name

Description of what this skill does.

## Instructions

Your skill instructions here...`;
}

export function HooksGenerator({ defaultCommand, onGenerate }: HooksGeneratorProps) {
  const [activeHookType, setActiveHookType] = useState<HookType>("post-tool-use");
  const [testCommand, setTestCommand] = useState(
    defaultCommand || "pnpm vitest run --reporter=verbose",
  );
  const [filePatterns, setFilePatterns] = useState("*.ts,*.tsx");
  const [timeout, setTimeout_] = useState(30000);
  const [skillEvent, setSkillEvent] = useState("PostToolUse");
  const [generatedConfig, setGeneratedConfig] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeConfig = HOOK_TYPES.find((h) => h.id === activeHookType)!;

  const handleHookTypeChange = (type: HookType) => {
    setActiveHookType(type);
    setGeneratedConfig(null);
    const config = HOOK_TYPES.find((h) => h.id === type)!;
    setTestCommand(config.defaultCommand);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    const patterns = filePatterns
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    let config: string | null = null;

    switch (activeHookType) {
      case "post-tool-use":
        config = await onGenerate(testCommand, patterns.length > 0 ? patterns : undefined);
        break;
      case "pre-compact":
        config = generatePreCompactConfig(testCommand, timeout);
        break;
      case "session-end":
        config = generateSessionEndConfig(testCommand, timeout);
        break;
      case "skill":
        config = generateSkillHookYaml(testCommand, skillEvent, patterns);
        break;
    }

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
        Generate Claude Code hooks for automation
      </p>

      {/* Hook Type Tabs */}
      <div className="mb-4 flex flex-wrap gap-1">
        {HOOK_TYPES.map((hookType) => (
          <button
            key={hookType.id}
            onClick={() => handleHookTypeChange(hookType.id)}
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
              activeHookType === hookType.id
                ? "bg-blue-600 text-white"
                : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
            }`}
          >
            {hookType.label}
          </button>
        ))}
      </div>

      {/* Description */}
      <p className="mb-3 text-xs text-neutral-500">{activeConfig.description}</p>

      {/* Form */}
      <div className="mb-4 space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-400">
            {activeHookType === "skill" ? "Hook Command" : "Command"}
          </label>
          <input
            type="text"
            value={testCommand}
            onChange={(e) => setTestCommand(e.target.value)}
            placeholder={activeConfig.defaultCommand}
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 font-mono text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {activeConfig.showFilePatterns && (
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
              Hook triggers when files matching these patterns are edited
            </p>
          </div>
        )}

        {activeHookType === "skill" && (
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-400">
              Hook Event
            </label>
            <select
              value={skillEvent}
              onChange={(e) => setSkillEvent(e.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 focus:border-blue-500 focus:outline-none"
            >
              <option value="PostToolUse">PostToolUse (after file edits)</option>
              <option value="PreToolUse">PreToolUse (before tool execution)</option>
              <option value="Stop">Stop (at session end)</option>
            </select>
          </div>
        )}

        {(activeHookType === "pre-compact" || activeHookType === "session-end") && (
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-400">
              Timeout (ms)
            </label>
            <input
              type="number"
              value={timeout}
              onChange={(e) => setTimeout_(Number(e.target.value))}
              min={1000}
              max={120000}
              step={1000}
              className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 focus:border-blue-500 focus:outline-none"
            />
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={isGenerating || !testCommand.trim()}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGenerating
            ? "Generating..."
            : `Generate ${activeConfig.outputFormat === "yaml" ? "YAML" : "JSON"} Config`}
        </button>
      </div>

      {/* Generated config preview */}
      {generatedConfig && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">
              Generated {activeConfig.outputFormat === "yaml" ? "YAML" : "JSON"}:
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
            {activeHookType === "skill" ? (
              <>
                Add this frontmatter to your{" "}
                <code className="text-neutral-400">.claude/skills/*/SKILL.md</code>
              </>
            ) : (
              <>
                Merge into{" "}
                <code className="text-neutral-400">.claude/settings.json</code> or{" "}
                <code className="text-neutral-400">~/.claude/settings.json</code>
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
