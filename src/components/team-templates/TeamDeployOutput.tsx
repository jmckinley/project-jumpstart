/**
 * @module components/team-templates/TeamDeployOutput
 * @description Deploy output view with format selector, code preview, copy and download
 *
 * PURPOSE:
 * - Generate deploy output for a team template in multiple formats
 * - Preview the generated output in a code block
 * - Provide copy to clipboard and download actions
 * - Support three formats: prompt (paste-ready), script (shell), config (directory)
 *
 * DEPENDENCIES:
 * - react (useState) - Local state for format selection and preview
 * - @/types/team-template - TeamTemplate, LibraryTeamTemplate types
 *
 * EXPORTS:
 * - TeamDeployOutput - Deploy output panel component
 *
 * PATTERNS:
 * - Mirrors SubagentGenerator component pattern
 * - Format selector with three options
 * - Code preview with copy and download buttons
 * - Back button to return to library/detail view
 *
 * CLAUDE NOTES:
 * - "prompt" format is the primary deliverable (paste into Claude Code)
 * - "script" format generates a shell script
 * - "config" format generates a .claude/teams/ directory structure
 * - Output is generated via backend Tauri command (pure string templating)
 */

import { useState, useEffect } from "react";
import type { TeamTemplate, LibraryTeamTemplate } from "@/types/team-template";

interface TeamDeployOutputProps {
  template: TeamTemplate | LibraryTeamTemplate;
  onGenerate: (template: TeamTemplate | LibraryTeamTemplate, format: string) => Promise<string | null>;
  onBack: () => void;
}

type OutputFormat = "prompt" | "script" | "config";

const FORMAT_OPTIONS: { id: OutputFormat; label: string; description: string }[] = [
  {
    id: "prompt",
    label: "Lead Prompt",
    description: "Paste into Claude Code to spawn the team via Agent Teams",
  },
  {
    id: "script",
    label: "Shell Script",
    description: "Enables Agent Teams, copies prompt to clipboard, launches Claude Code",
  },
  {
    id: "config",
    label: "Setup Files",
    description: "Reusable prompt files and settings.json snippet",
  },
];

export function TeamDeployOutput({
  template,
  onGenerate,
  onBack,
}: TeamDeployOutputProps) {
  const [format, setFormat] = useState<OutputFormat>("prompt");
  const [output, setOutput] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const generate = async () => {
      setGenerating(true);
      setOutput(null);
      const result = await onGenerate(template, format);
      setOutput(result);
      setGenerating(false);
    };
    generate();
  }, [template, format, onGenerate]);

  const handleCopy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!output) return;
    const ext = format === "script" ? "sh" : format === "config" ? "md" : "md";
    const name = template.name.toLowerCase().replace(/\s+/g, "-");
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}-team.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-neutral-200">
            Deploy: {template.name}
          </h3>
          <p className="mt-0.5 text-xs text-neutral-500">
            Generate deployment output in your preferred format
          </p>
        </div>
        <button
          onClick={onBack}
          className="text-sm text-neutral-400 transition-colors hover:text-neutral-200"
        >
          Back
        </button>
      </div>

      {/* Format selector */}
      <div className="mb-4 space-y-2">
        {FORMAT_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setFormat(opt.id)}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors ${
              format === opt.id
                ? "bg-neutral-800 text-neutral-200"
                : "text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-300"
            }`}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{opt.label}</p>
              <p className="text-xs text-neutral-500">{opt.description}</p>
            </div>
            {format === opt.id && (
              <svg className="h-4 w-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        ))}
      </div>

      {/* Output preview */}
      {generating ? (
        <div className="flex h-40 items-center justify-center rounded-md bg-neutral-950">
          <p className="text-sm text-neutral-500">Generating...</p>
        </div>
      ) : output ? (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">
              Generated Output:
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
          <div className="max-h-96 overflow-auto rounded-md bg-neutral-950 p-3">
            <pre className="whitespace-pre-wrap font-mono text-xs text-neutral-300">
              {output}
            </pre>
          </div>
          {format === "prompt" && (
            <p className="mt-2 text-xs text-neutral-600">
              Enable Agent Teams in <code className="text-neutral-400">~/.claude/settings.json</code>, then paste this into Claude Code
            </p>
          )}
          {format === "script" && (
            <p className="mt-2 text-xs text-neutral-600">
              Save as <code className="text-neutral-400">.sh</code> and run — it sets up Agent Teams and launches Claude Code
            </p>
          )}
          {format === "config" && (
            <p className="mt-2 text-xs text-neutral-600">
              Save these files to your project for reuse — paste the team prompt to deploy
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
