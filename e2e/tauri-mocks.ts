/**
 * @module e2e/tauri-mocks
 * @description Mock Tauri IPC calls for E2E testing
 *
 * PURPOSE:
 * - Provide mock implementations of Tauri commands
 * - Enable testing without the Rust backend
 * - Return realistic test data
 */

import { Page } from "@playwright/test";

export interface MockProject {
  id: string;
  name: string;
  path: string;
  language: string;
  framework: string | null;
  healthScore: number;
  createdAt: string;
  testing: string | null;
}

export const mockProjects: MockProject[] = [
  {
    id: "test-project-1",
    name: "test-project",
    path: "/Users/test/test-project",
    language: "TypeScript",
    framework: "React",
    healthScore: 75,
    createdAt: new Date().toISOString(),
    testing: "vitest",
  },
  {
    id: "empty-project",
    name: "empty-project",
    path: "/Users/test/empty-project",
    language: "TypeScript",
    framework: null,
    healthScore: 0,
    createdAt: new Date().toISOString(),
    testing: null,
  },
];

export const mockHealthScore = {
  total: 75,
  components: {
    claudeMd: 20,
    moduleDocs: 15,
    freshness: 12,
    skills: 10,
    context: 8,
    enforcement: 10,
  },
  quickWins: [
    {
      title: "Add documentation to 5 modules",
      description: "Improve module coverage from 60% to 80%",
      impact: 10,
      effort: "medium",
    },
  ],
  contextRotRisk: "low" as const,
};

export const mockModules = [
  { path: "src/App.tsx", status: "current", freshnessScore: 95 },
  { path: "src/main.tsx", status: "current", freshnessScore: 100 },
  { path: "src/components/Sidebar.tsx", status: "outdated", freshnessScore: 45 },
  { path: "src/hooks/useHealth.ts", status: "missing", freshnessScore: 0 },
];

export const mockClaudeMdContent = `# Test Project

## Overview
A test project for E2E testing.

## Tech Stack
| Layer | Technology |
|-------|------------|
| Language | TypeScript |
| Framework | React |

## Commands
\`\`\`bash
pnpm install
pnpm dev
pnpm test
\`\`\`
`;

export const mockSessionAnalysis = {
  recommendations: [
    {
      recType: "test",
      title: "Add tests for SmartNextStep component",
      reason: "Component has complex conditional logic",
      details: "Test all recommendation priority combinations",
      priority: 1,
    },
    {
      recType: "pattern",
      title: "Document dismiss persistence pattern",
      reason: "Skip/Later logic is non-obvious",
      details: "Add to CLAUDE.md: permanent dismissals use { permanent: true }",
      priority: 2,
    },
  ],
  sessionSummary: "Working on SmartNextStep improvements and session analysis",
  analyzedAt: new Date().toISOString(),
  messagesAnalyzed: 30,
};

export const mockSkills = [
  {
    id: "skill-1",
    name: "Component Creator",
    description: "Creates React components with tests",
    content: "Create a new React component...",
    projectId: "test-project-1",
    usageCount: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const mockAgents = [
  {
    id: "agent-1",
    name: "TDD Agent",
    description: "Test-driven development workflow",
    tier: "essential",
    category: "testing",
    instructions: "Follow red-green-refactor...",
    workflow: null,
    tools: null,
    triggerPatterns: null,
    projectId: "test-project-1",
    usageCount: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const mockActivities = [
  {
    id: "act-1",
    activityType: "doc_generated",
    message: "Generated documentation for App.tsx",
    createdAt: new Date().toISOString(),
  },
  {
    id: "act-2",
    activityType: "skill_used",
    message: "Used Component Creator skill",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

export const mockMemorySources = [
  {
    path: "/Users/test/test-project/CLAUDE.md",
    sourceType: "claude-md",
    name: "CLAUDE.md",
    lineCount: 112,
    sizeBytes: 4500,
    lastModified: new Date().toISOString(),
    description: "Project memory file",
  },
  {
    path: "/Users/test/test-project/.claude/rules/testing.md",
    sourceType: "rules",
    name: "testing.md",
    lineCount: 80,
    sizeBytes: 2200,
    lastModified: new Date().toISOString(),
    description: "Testing rules",
  },
  {
    path: "/Users/test/test-project/.claude/skills/tdd-workflow/SKILL.md",
    sourceType: "skills",
    name: "tdd-workflow",
    lineCount: 45,
    sizeBytes: 1200,
    lastModified: new Date().toISOString(),
    description: "TDD workflow skill",
  },
  {
    path: "/Users/test/test-project/CLAUDE.local.md",
    sourceType: "local-md",
    name: "CLAUDE.local.md",
    lineCount: 30,
    sizeBytes: 900,
    lastModified: new Date().toISOString(),
    description: "Personal learnings",
  },
];

export const mockLearnings = [
  {
    id: "learn-1",
    sessionId: "session-abc",
    category: "Preference",
    content: "User prefers terse responses without excessive explanation",
    topic: "workflow",
    confidence: "medium",
    status: "active",
    sourceFile: "CLAUDE.local.md",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "learn-2",
    sessionId: "session-abc",
    category: "Solution",
    content: "SQLite database locked error: ensure db.lock() is released before next call",
    topic: "debugging",
    confidence: "high",
    status: "verified",
    sourceFile: "CLAUDE.local.md",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "learn-3",
    sessionId: "session-def",
    category: "Pattern",
    content: "Always run tests after modifying Rust files",
    topic: "patterns",
    confidence: "high",
    status: "active",
    sourceFile: "CLAUDE.local.md",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const mockMemoryHealth = {
  totalSources: 4,
  totalLines: 267,
  totalLearnings: 3,
  activeLearnings: 2,
  claudeMdLines: 112,
  claudeMdScore: 85,
  rulesFileCount: 1,
  skillsCount: 1,
  estimatedTokenUsage: 15000,
  healthRating: "excellent",
};

export const mockClaudeMdAnalysis = {
  totalLines: 112,
  estimatedTokens: 4500,
  score: 85,
  sections: ["Overview", "Tech Stack", "Commands", "Status"],
  suggestions: [
    {
      suggestionType: "move",
      message: "Move documentation format to .claude/rules/documentation.md",
      lineRange: [50, 80],
      target: ".claude/rules/documentation.md",
    },
  ],
  linesToRemove: [],
  linesToMove: [
    {
      lineRange: [50, 80],
      contentPreview: "### TypeScript/React Documentation Format...",
      targetFile: ".claude/rules/documentation.md",
      reason: "Path-specific content belongs in rules file",
    },
  ],
};

export const mockSettings: Record<string, string> = {
  anthropic_api_key: "sk-ant-test-key-12345",
  has_seen_welcome: "true",
  last_active_project_id: "test-project-1",
};

/**
 * Set up Tauri API mocks on a page
 */
export async function setupTauriMocks(page: Page, options: {
  hasApiKey?: boolean;
  hasClaudeMd?: boolean;
  isEmptyProject?: boolean;
  projectId?: string;
  hasTestFramework?: boolean;
  hasClaudeCodeHooks?: boolean;
} = {}) {
  const {
    hasApiKey = true,
    hasClaudeMd = true,
    isEmptyProject = false,
    projectId = "test-project-1",
    hasTestFramework = true,
    hasClaudeCodeHooks = false,
  } = options;

  // Use route interception to inject mocks before any scripts load
  await page.route("**/*", async (route) => {
    await route.continue();
  });

  await page.addInitScript(({ hasApiKey, hasClaudeMd, isEmptyProject, projectId, hasTestFramework, hasClaudeCodeHooks, mocks }) => {
    // Store settings in memory - always include has_seen_welcome to bypass first-run
    const settingsStore: Record<string, string> = {
      ...mocks.settings,
      has_seen_welcome: "true",
      last_active_project_id: "test-project-1",
    };
    if (hasApiKey) {
      settingsStore["anthropic_api_key"] = "sk-ant-test-key-12345";
    } else {
      delete settingsStore["anthropic_api_key"];
    }

    // Mock window.__TAURI_INTERNALS__ (Tauri v2 API)
    const mockInvoke = async (cmd: string, args?: Record<string, unknown>) => {
      console.log(`[Mock] invoke: ${cmd}`, args);

      switch (cmd) {
        case "list_projects":
          // Adjust testing field based on hasTestFramework option
          return mocks.projects.map((p: { id: string; testing: string | null }) => ({
            ...p,
            testing: hasTestFramework ? (p.testing || "vitest") : null,
          }));

        case "get_project":
          const project = mocks.projects.find((p: { id: string }) => p.id === args?.id) || mocks.projects[0];
          return {
            ...project,
            testing: hasTestFramework ? (project.testing || "vitest") : null,
          };

        case "get_health_score":
          return mocks.healthScore;

        case "scan_modules":
          return isEmptyProject ? [] : mocks.modules;

        case "read_claude_md":
          if (!hasClaudeMd) {
            return { exists: false, content: "", tokenEstimate: 0 };
          }
          return {
            exists: true,
            content: mocks.claudeMdContent,
            tokenEstimate: 500,
          };

        case "get_setting":
          const key = args?.key as string;
          return settingsStore[key] || null;

        case "save_setting":
          settingsStore[args?.key as string] = args?.value as string;
          return null;

        case "get_all_settings":
          return settingsStore;

        case "validate_api_key":
          return hasApiKey;

        case "list_skills":
          return mocks.skills;

        case "list_agents":
          return mocks.agents;

        case "get_recent_activities":
          return mocks.activities;

        case "get_hook_status":
          return { installed: false, hookPath: "", mode: "off", hasHusky: false };

        case "analyze_session":
          await new Promise(r => setTimeout(r, 500));
          return mocks.sessionAnalysis;

        case "get_session_transcript":
          return ["[user]: test message", "[assistant]: test response"];

        case "generate_kickstart_prompt":
          await new Promise(r => setTimeout(r, 500));
          return {
            fullPrompt: "# Test Kickstart Prompt\n\nThis is a generated kickstart prompt...",
            tokenEstimate: 200,
          };

        case "generate_kickstart_claude_md":
          await new Promise(r => setTimeout(r, 500));
          return mocks.claudeMdContent;

        case "generate_claude_md":
          await new Promise(r => setTimeout(r, 500));
          return mocks.claudeMdContent;

        case "write_claude_md":
          return null;

        case "start_file_watcher":
        case "stop_file_watcher":
          return null;

        case "check_freshness":
          return { score: 85, status: "current", changes: [] };

        case "get_stale_files":
          return [];

        case "list_test_plans":
          return [];

        case "detect_project_test_framework":
          if (!hasTestFramework) {
            return null;
          }
          return {
            name: "vitest",
            command: "pnpm vitest run",
            configFile: "vitest.config.ts",
            coverageCommand: "pnpm vitest run --coverage",
          };

        case "check_hooks_configured":
          return hasClaudeCodeHooks;

        case "generate_hooks_config":
          return JSON.stringify({
            hooks: [{
              event: "PostToolUse",
              filter: { toolName: { oneOf: ["Edit", "Write"] } },
              command: args?.testCommand || "pnpm vitest run",
            }]
          }, null, 2);

        case "log_activity":
          return {
            id: `act-${Date.now()}`,
            projectId: args?.projectId,
            activityType: args?.activityType,
            message: args?.message,
            createdAt: new Date().toISOString(),
          };

        case "list_memory_sources":
          return mocks.memorySources;

        case "list_learnings":
          return mocks.learnings;

        case "get_memory_health":
          return mocks.memoryHealth;

        case "analyze_claude_md":
          await new Promise(r => setTimeout(r, 300));
          return mocks.claudeMdAnalysis;

        case "update_learning_status":
          const learning = mocks.learnings.find((l: { id: string }) => l.id === args?.id);
          if (learning) {
            return { ...learning, status: args?.status };
          }
          return null;

        case "promote_learning":
          return null;

        case "list_team_templates":
          return [];

        default:
          console.warn(`[Mock] Unhandled command: ${cmd}`);
          return null;
      }
    };

    // Define __TAURI_INTERNALS__ before any module loads
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      value: {
        invoke: mockInvoke,
        transformCallback: (callback: Function, once: boolean) => {
          const id = Math.random();
          // @ts-ignore
          window[`_${id}`] = callback;
          return id;
        },
        convertFileSrc: (path: string) => path,
      },
      writable: false,
      configurable: false,
    });

    // Also define __TAURI__ for compatibility
    Object.defineProperty(window, "__TAURI__", {
      value: {
        core: { invoke: mockInvoke },
        event: {
          listen: (event: string, callback: Function) => {
            console.log(`[Mock] listen: ${event}`);
            return Promise.resolve(() => {});
          },
          emit: (event: string, payload?: unknown) => {
            console.log(`[Mock] emit: ${event}`, payload);
            return Promise.resolve();
          },
        },
      },
      writable: false,
      configurable: false,
    });

    console.log("[Mock] Tauri mocks installed");
  }, {
    hasApiKey,
    hasClaudeMd,
    isEmptyProject,
    projectId,
    hasTestFramework,
    hasClaudeCodeHooks,
    mocks: {
      projects: mockProjects,
      healthScore: mockHealthScore,
      modules: mockModules,
      claudeMdContent: mockClaudeMdContent,
      sessionAnalysis: mockSessionAnalysis,
      skills: mockSkills,
      agents: mockAgents,
      activities: mockActivities,
      settings: mockSettings,
      memorySources: mockMemorySources,
      learnings: mockLearnings,
      memoryHealth: mockMemoryHealth,
      claudeMdAnalysis: mockClaudeMdAnalysis,
    },
  });
}
