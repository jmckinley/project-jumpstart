/**
 * @module components/hooks/QuickHooksSetup
 * @description One-click Claude Code hooks setup for TDD workflow
 *
 * PURPOSE:
 * - Provide quick hooks setup that can be used in multiple places
 * - Auto-detect test command based on detected framework
 * - Track when hooks are installed to avoid duplicate prompts
 * - Generate and copy hooks configuration
 *
 * DEPENDENCIES:
 * - react - Component rendering and state
 * - @/lib/tauri - generateHooksConfig, logActivity
 * - @/stores/projectStore - Active project info
 *
 * EXPORTS:
 * - QuickHooksSetup - Compact hooks setup component
 * - QuickHooksSetupProps - Props interface
 *
 * PATTERNS:
 * - Detects framework from project or passed prop
 * - Generates appropriate test command for detected framework
 * - Copies config to clipboard with instructions
 * - Logs activity when hooks are configured
 *
 * CLAUDE NOTES:
 * - Use variant="compact" for dashboard/sidebar placement
 * - Use variant="full" for dedicated setup view
 * - Framework detection: vitest, jest, pytest, cargo, go
 * - After setup, records activity to prevent duplicate suggestions
 */

import { useState, useMemo } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { generateHooksConfig, logActivity } from "@/lib/tauri";

export interface QuickHooksSetupProps {
  /** Display variant - compact for widgets, full for dedicated section */
  variant?: "compact" | "full";
  /** Optional framework override (otherwise detected from project) */
  framework?: string;
  /** Callback when hooks are successfully configured */
  onSetupComplete?: () => void;
  /** Hide the component if hooks are already set up */
  hideIfConfigured?: boolean;
}

interface FrameworkConfig {
  name: string;
  testCommand: string;
  filePatterns: string[];
}

const FRAMEWORK_CONFIGS: Record<string, FrameworkConfig> = {
  vitest: {
    name: "Vitest",
    testCommand: "pnpm vitest run --reporter=verbose",
    filePatterns: ["*.ts", "*.tsx"],
  },
  jest: {
    name: "Jest",
    testCommand: "pnpm jest --passWithNoTests",
    filePatterns: ["*.ts", "*.tsx", "*.js", "*.jsx"],
  },
  pytest: {
    name: "pytest",
    testCommand: "pytest -v",
    filePatterns: ["*.py"],
  },
  cargo: {
    name: "cargo test",
    testCommand: "cargo test",
    filePatterns: ["*.rs"],
  },
  go: {
    name: "go test",
    testCommand: "go test ./...",
    filePatterns: ["*.go"],
  },
  mocha: {
    name: "Mocha",
    testCommand: "pnpm mocha",
    filePatterns: ["*.ts", "*.js"],
  },
  playwright: {
    name: "Playwright",
    testCommand: "pnpm playwright test",
    filePatterns: ["*.ts", "*.tsx"],
  },
};

export function QuickHooksSetup({
  variant = "compact",
  framework: frameworkProp,
  onSetupComplete,
}: QuickHooksSetupProps) {
  const activeProject = useProjectStore((s) => s.activeProject);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatedConfig, setGeneratedConfig] = useState<string | null>(null);

  // Detect framework from project or prop
  const detectedFramework = useMemo(() => {
    const fw = frameworkProp?.toLowerCase() || activeProject?.testing?.toLowerCase() || "";

    if (fw.includes("vitest")) return "vitest";
    if (fw.includes("jest")) return "jest";
    if (fw.includes("pytest")) return "pytest";
    if (fw.includes("cargo") || activeProject?.language === "rust") return "cargo";
    if (fw.includes("go") || activeProject?.language === "go") return "go";
    if (fw.includes("mocha")) return "mocha";
    if (fw.includes("playwright")) return "playwright";

    // Default based on language
    if (activeProject?.language === "typescript" || activeProject?.language === "javascript") {
      return "vitest"; // Recommend Vitest for TS/JS
    }
    if (activeProject?.language === "python") return "pytest";

    return null;
  }, [frameworkProp, activeProject]);

  const frameworkConfig = detectedFramework ? FRAMEWORK_CONFIGS[detectedFramework] : null;

  const handleSetup = async () => {
    if (!frameworkConfig || !activeProject) return;

    setIsGenerating(true);
    try {
      const config = await generateHooksConfig(
        frameworkConfig.testCommand,
        frameworkConfig.filePatterns
      );

      setGeneratedConfig(config);

      // Copy to clipboard
      await navigator.clipboard.writeText(config);
      setCopied(true);

      // Log activity to track that hooks were set up
      await logActivity(
        activeProject.id,
        "hooks_configured",
        `Generated PostToolUse hooks for ${frameworkConfig.name}`
      );

      onSetupComplete?.();

      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      console.error("Failed to generate hooks config:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!frameworkConfig) {
    return null;
  }

  if (variant === "compact") {
    return (
      <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
        <div className="flex items-start gap-3">
          <svg
            className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <div className="flex-1">
            <h4 className="font-medium text-blue-300">Auto-Run Tests on File Changes</h4>
            <p className="mt-1 text-sm text-blue-200/70">
              Set up Claude Code hooks to automatically run {frameworkConfig.name} after every file edit.
            </p>
            <button
              onClick={handleSetup}
              disabled={isGenerating}
              className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? "Generating..." : copied ? "Copied to Clipboard!" : "Set Up Hooks"}
            </button>
            {copied && (
              <p className="mt-2 text-xs text-blue-200/70">
                Paste into <code className="text-blue-300">.claude/settings.json</code>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Full variant
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
          <svg
            className="h-5 w-5 text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
        <div>
          <h3 className="font-medium text-neutral-200">Claude Code Hooks</h3>
          <p className="text-sm text-neutral-500">Auto-run tests on every file change</p>
        </div>
      </div>

      <p className="text-sm text-neutral-400 mb-4">
        PostToolUse hooks automatically run your test suite whenever Claude edits a file.
        This enables true TDD workflow where tests run after every change.
      </p>

      <div className="rounded-md bg-neutral-800/50 p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-neutral-400">Detected Framework</span>
          <span className="text-xs font-medium text-green-400">{frameworkConfig.name}</span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-neutral-400">Test Command</span>
          <code className="text-xs text-neutral-300">{frameworkConfig.testCommand}</code>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-neutral-400">File Patterns</span>
          <code className="text-xs text-neutral-300">{frameworkConfig.filePatterns.join(", ")}</code>
        </div>
      </div>

      <button
        onClick={handleSetup}
        disabled={isGenerating}
        className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isGenerating ? "Generating..." : copied ? "Copied! Paste into .claude/settings.json" : "Generate & Copy Hooks Config"}
      </button>

      {generatedConfig && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-neutral-400">Generated Configuration:</span>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(generatedConfig);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              {copied ? "Copied!" : "Copy Again"}
            </button>
          </div>
          <div className="max-h-48 overflow-auto rounded-md bg-neutral-950 p-3">
            <pre className="whitespace-pre-wrap font-mono text-xs text-neutral-300">
              {generatedConfig}
            </pre>
          </div>
          <div className="mt-3 rounded-md bg-neutral-800/50 p-3">
            <p className="text-xs text-neutral-400">
              <strong className="text-neutral-300">Next Steps:</strong>
            </p>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-xs text-neutral-400">
              <li>Create <code className="text-neutral-300">.claude/settings.json</code> in your project root</li>
              <li>Paste the configuration above</li>
              <li>Claude Code will now run tests after every file edit</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
