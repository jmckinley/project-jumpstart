/**
 * @module components/test-plans/SubagentGenerator
 * @description Generate and export Claude Code subagent configurations
 *
 * PURPOSE:
 * - Generate subagent markdown files for TDD workflow
 * - Preview generated configurations
 * - Copy or download configs
 *
 * DEPENDENCIES:
 * - react (useState) - Local state for selection and preview
 *
 * EXPORTS:
 * - SubagentGenerator - Subagent configuration generator component
 *
 * PATTERNS:
 * - Select agent type to generate
 * - Preview in code block
 * - Copy to clipboard or download
 *
 * CLAUDE NOTES:
 * - Three agent types: tdd-test-writer, tdd-implementer, tdd-refactorer
 * - Each has specific tools and instructions
 * - Files go in .claude/agents/
 */

import { useState } from "react";

interface SubagentGeneratorProps {
  onGenerate: (agentType: string) => Promise<string | null>;
}

const agentTypes = [
  {
    id: "tdd-test-writer",
    name: "TDD Test Writer",
    description: "Writes failing tests for the red phase",
    icon: "🔴",
  },
  {
    id: "tdd-implementer",
    name: "TDD Implementer",
    description: "Writes minimal code to pass tests",
    icon: "🟢",
  },
  {
    id: "tdd-refactorer",
    name: "TDD Refactorer",
    description: "Cleans up code while keeping tests green",
    icon: "🔵",
  },
];

export function SubagentGenerator({ onGenerate }: SubagentGeneratorProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [generatedConfig, setGeneratedConfig] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (agentType: string) => {
    setSelectedType(agentType);
    setIsGenerating(true);
    setGeneratedConfig(null);

    const config = await onGenerate(agentType);
    setGeneratedConfig(config);
    setIsGenerating(false);
  };

  const handleCopy = async () => {
    if (!generatedConfig) return;
    await navigator.clipboard.writeText(generatedConfig);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!generatedConfig || !selectedType) return;
    const blob = new Blob([generatedConfig], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedType}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <h3 className="mb-1 text-sm font-medium text-neutral-200">
        Subagent Generator
      </h3>
      <p className="mb-4 text-xs text-neutral-500">
        Generate Claude Code subagent configurations for TDD workflow
      </p>

      {/* Agent type selection */}
      <div className="mb-4 space-y-2">
        {agentTypes.map((agent) => (
          <button
            key={agent.id}
            onClick={() => handleGenerate(agent.id)}
            disabled={isGenerating}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors ${
              selectedType === agent.id
                ? "bg-neutral-800 text-neutral-200"
                : "text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-300"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <span className="text-lg">{agent.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{agent.name}</p>
              <p className="text-xs text-neutral-500">{agent.description}</p>
            </div>
            {selectedType === agent.id && isGenerating && (
              <svg
                className="h-4 w-4 animate-spin text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            )}
          </button>
        ))}
      </div>

      {/* Generated config preview */}
      {generatedConfig && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">
              Generated Configuration:
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={handleDownload}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Download
              </button>
            </div>
          </div>
          <div className="max-h-64 overflow-auto rounded-md bg-neutral-950 p-3">
            <pre className="whitespace-pre-wrap font-mono text-xs text-neutral-300">
              {generatedConfig}
            </pre>
          </div>
          <p className="mt-2 text-xs text-neutral-600">
            Save this file to <code className="text-neutral-400">.claude/agents/</code> in
            your project
          </p>
        </div>
      )}
    </div>
  );
}
