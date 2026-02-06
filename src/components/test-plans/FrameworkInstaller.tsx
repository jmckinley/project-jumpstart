/**
 * @module components/test-plans/FrameworkInstaller
 * @description One-click test framework installation for projects without tests
 *
 * PURPOSE:
 * - Detect project type and recommend appropriate test frameworks
 * - Provide one-click installation commands
 * - Guide users through framework setup
 *
 * DEPENDENCIES:
 * - react - Component rendering
 * - @/stores/projectStore - Active project info
 *
 * EXPORTS:
 * - FrameworkInstaller - Framework installation helper component
 *
 * PATTERNS:
 * - Recommends frameworks based on detected project type
 * - Shows install command and copies to clipboard
 * - Opens terminal with install command when possible
 *
 * CLAUDE NOTES:
 * - TypeScript/React projects: Vitest (recommended) or Jest
 * - Node.js projects: Jest or Mocha
 * - E2E testing: Playwright (recommended) or Cypress
 * - Rust projects: cargo test (built-in)
 * - Python projects: pytest
 * - Go projects: go test (built-in)
 */

import { useState, useMemo } from "react";
import { useProjectStore } from "@/stores/projectStore";

interface FrameworkOption {
  name: string;
  description: string;
  installCommand: string;
  configCommand?: string;
  recommended?: boolean;
  type: "unit" | "e2e" | "both";
}

export function FrameworkInstaller() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [installing, setInstalling] = useState<string | null>(null);

  const frameworkOptions = useMemo<FrameworkOption[]>(() => {
    if (!activeProject) return [];

    const { language, framework } = activeProject;
    const options: FrameworkOption[] = [];

    // TypeScript/JavaScript projects
    if (language === "typescript" || language === "javascript") {
      // Check if it's a Vite/React project
      const isVite = framework?.toLowerCase().includes("vite") ||
                     framework?.toLowerCase().includes("react");

      if (isVite) {
        options.push({
          name: "Vitest",
          description: "Fast unit testing powered by Vite. Best for Vite/React projects.",
          installCommand: "pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom",
          configCommand: "pnpm vitest init",
          recommended: true,
          type: "unit",
        });
      }

      options.push({
        name: "Jest",
        description: "Popular testing framework with great ecosystem support.",
        installCommand: "pnpm add -D jest @types/jest ts-jest",
        configCommand: "pnpm jest --init",
        recommended: !isVite,
        type: "unit",
      });

      options.push({
        name: "Playwright",
        description: "Modern E2E testing with auto-wait and cross-browser support.",
        installCommand: "pnpm add -D @playwright/test && pnpm playwright install",
        configCommand: "pnpm playwright init",
        recommended: true,
        type: "e2e",
      });

      options.push({
        name: "Cypress",
        description: "E2E testing with time-travel debugging and real browser testing.",
        installCommand: "pnpm add -D cypress",
        configCommand: "pnpm cypress open",
        type: "e2e",
      });

      options.push({
        name: "Testcontainers",
        description: "Spin up Docker containers for integration tests (databases, queues, etc.).",
        installCommand: "pnpm add -D testcontainers",
        type: "unit",
      });
    }

    // Rust projects
    if (language === "rust") {
      options.push({
        name: "cargo test",
        description: "Built-in Rust testing. No installation needed - just add #[test] functions.",
        installCommand: "# No installation needed - cargo test is built-in",
        recommended: true,
        type: "both",
      });

      options.push({
        name: "cargo-tarpaulin",
        description: "Code coverage for Rust projects.",
        installCommand: "cargo install cargo-tarpaulin",
        type: "unit",
      });
    }

    // Python projects
    if (language === "python") {
      options.push({
        name: "pytest",
        description: "Simple and powerful testing for Python with great plugin ecosystem.",
        installCommand: "pip install pytest pytest-cov",
        recommended: true,
        type: "unit",
      });

      options.push({
        name: "Selenium",
        description: "Browser automation for E2E testing. Works with Chrome, Firefox, Safari.",
        installCommand: "pip install selenium webdriver-manager",
        type: "e2e",
      });

      options.push({
        name: "Playwright for Python",
        description: "Modern E2E testing with auto-wait and cross-browser support.",
        installCommand: "pip install playwright && playwright install",
        recommended: true,
        type: "e2e",
      });

      options.push({
        name: "Testcontainers",
        description: "Spin up Docker containers for integration tests (databases, queues, etc.).",
        installCommand: "pip install testcontainers",
        type: "unit",
      });
    }

    // Go projects
    if (language === "go") {
      options.push({
        name: "go test",
        description: "Built-in Go testing. No installation needed - just create _test.go files.",
        installCommand: "# No installation needed - go test is built-in",
        recommended: true,
        type: "unit",
      });

      options.push({
        name: "Testcontainers for Go",
        description: "Spin up Docker containers for integration tests (databases, queues, etc.).",
        installCommand: "go get github.com/testcontainers/testcontainers-go",
        type: "unit",
      });
    }

    // Java projects
    if (language === "java") {
      options.push({
        name: "JUnit 5",
        description: "The standard testing framework for Java with modern features.",
        installCommand: "# Add to pom.xml: org.junit.jupiter:junit-jupiter:5.10.0",
        recommended: true,
        type: "unit",
      });

      options.push({
        name: "Testcontainers",
        description: "Spin up Docker containers for integration tests. The original Testcontainers.",
        installCommand: "# Add to pom.xml: org.testcontainers:testcontainers:1.19.0",
        recommended: true,
        type: "unit",
      });

      options.push({
        name: "Selenium",
        description: "Browser automation for E2E testing. Industry standard for Java.",
        installCommand: "# Add to pom.xml: org.seleniumhq.selenium:selenium-java:4.15.0",
        type: "e2e",
      });
    }

    return options;
  }, [activeProject]);

  const handleCopyCommand = async (command: string) => {
    await navigator.clipboard.writeText(command);
    setCopiedCommand(command);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  const handleInstall = async (option: FrameworkOption) => {
    // Copy to clipboard and show instructions
    await handleCopyCommand(option.installCommand);
    setInstalling(option.name);

    // Clear after 5 seconds
    setTimeout(() => setInstalling(null), 5000);
  };

  if (!activeProject) {
    return null;
  }

  const unitFrameworks = frameworkOptions.filter(f => f.type === "unit" || f.type === "both");
  const e2eFrameworks = frameworkOptions.filter(f => f.type === "e2e" || f.type === "both");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
        <div className="flex items-start gap-3">
          <svg
            className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <h3 className="font-medium text-yellow-300">No Test Framework Detected</h3>
            <p className="mt-1 text-sm text-yellow-200/70">
              Add a test framework to enable TDD workflow, test execution, and AI-powered test suggestions.
            </p>
          </div>
        </div>
      </div>

      {/* Unit Test Frameworks */}
      {unitFrameworks.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-medium text-neutral-300">
            Unit Testing
          </h4>
          <div className="space-y-3">
            {unitFrameworks.map((option) => (
              <FrameworkCard
                key={option.name}
                option={option}
                copied={copiedCommand === option.installCommand}
                installing={installing === option.name}
                onCopy={() => handleCopyCommand(option.installCommand)}
                onInstall={() => handleInstall(option)}
              />
            ))}
          </div>
        </div>
      )}

      {/* E2E Frameworks */}
      {e2eFrameworks.length > 0 && e2eFrameworks.some(f => f.type === "e2e") && (
        <div>
          <h4 className="mb-3 text-sm font-medium text-neutral-300">
            End-to-End Testing
          </h4>
          <div className="space-y-3">
            {e2eFrameworks.filter(f => f.type === "e2e").map((option) => (
              <FrameworkCard
                key={option.name}
                option={option}
                copied={copiedCommand === option.installCommand}
                installing={installing === option.name}
                onCopy={() => handleCopyCommand(option.installCommand)}
                onInstall={() => handleInstall(option)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      {installing && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
          <h4 className="font-medium text-blue-300">Installation Steps</h4>
          <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-blue-200/70">
            <li>Open your terminal in the project directory</li>
            <li>Paste the copied command (Cmd+V)</li>
            <li>Wait for installation to complete</li>
            <li>Refresh this page to detect the new framework</li>
          </ol>
        </div>
      )}
    </div>
  );
}

interface FrameworkCardProps {
  option: FrameworkOption;
  copied: boolean;
  installing: boolean;
  onCopy: () => void;
  onInstall: () => void;
}

function FrameworkCard({ option, copied, installing, onCopy, onInstall }: FrameworkCardProps) {
  const isBuiltIn = option.installCommand.startsWith("#");

  return (
    <div
      className={`rounded-lg border p-4 ${
        option.recommended
          ? "border-green-500/30 bg-green-500/5"
          : "border-neutral-700 bg-neutral-800/50"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h5 className="font-medium text-neutral-200">{option.name}</h5>
            {option.recommended && (
              <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">
                Recommended
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-neutral-400">{option.description}</p>
        </div>
      </div>

      {/* Install command */}
      <div className="mt-3">
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded bg-neutral-900 px-3 py-2 font-mono text-xs text-neutral-300">
            {option.installCommand}
          </code>
          {!isBuiltIn && (
            <button
              onClick={onCopy}
              className="rounded-md border border-neutral-600 p-2 text-neutral-400 transition-colors hover:border-neutral-500 hover:text-neutral-300"
              title="Copy command"
            >
              {copied ? (
                <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Action button */}
      {!isBuiltIn && (
        <div className="mt-3">
          <button
            onClick={onInstall}
            disabled={installing}
            className={`w-full rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              option.recommended
                ? "bg-green-600 text-white hover:bg-green-500"
                : "bg-neutral-700 text-neutral-200 hover:bg-neutral-600"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {installing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Command Copied - Run in Terminal
              </span>
            ) : (
              `Install ${option.name}`
            )}
          </button>
        </div>
      )}

      {/* Built-in notice */}
      {isBuiltIn && (
        <div className="mt-3 rounded-md bg-neutral-900 p-3 text-xs text-neutral-400">
          <p>
            <strong className="text-neutral-300">Ready to use!</strong> This test framework is built into your language.
            Just create test files and run the test command.
          </p>
        </div>
      )}
    </div>
  );
}
