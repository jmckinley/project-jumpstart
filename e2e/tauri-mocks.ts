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
    context: 7,
    enforcement: 7,
    tests: 0,
    performance: 4,
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

export const mockPerformanceReview = {
  id: "perf-review-1",
  projectId: "test-project-1",
  overallScore: 72,
  components: {
    queryPatterns: 16,
    rendering: 14,
    memory: 12,
    bundle: 10,
    caching: 10,
    apiDesign: 10,
  },
  issues: [
    {
      id: "issue-1",
      category: "query-patterns",
      severity: "critical" as const,
      title: "N+1 query detected in user loader",
      description: "Database query inside a loop fetches users one at a time instead of batching.",
      filePath: "src/services/userService.ts",
      lineNumber: 42,
      suggestion: "Use a batch query with WHERE id IN (...) to fetch all users at once.",
    },
    {
      id: "issue-2",
      category: "rendering",
      severity: "warning" as const,
      title: "Inline object in JSX prop",
      description: "Passing inline style object causes unnecessary re-renders on every parent render.",
      filePath: "src/components/Card.tsx",
      lineNumber: 15,
      suggestion: "Extract the style object to a constant outside the component or use useMemo.",
    },
    {
      id: "issue-3",
      category: "memory",
      severity: "warning" as const,
      title: "Event listener without cleanup",
      description: "addEventListener called without corresponding removeEventListener in cleanup.",
      filePath: "src/hooks/useResize.ts",
      lineNumber: 8,
      suggestion: "Return a cleanup function from useEffect that calls removeEventListener.",
    },
    {
      id: "issue-4",
      category: "bundle",
      severity: "info" as const,
      title: "Heavy dependency detected: moment.js",
      description: "moment.js adds ~300KB to bundle. Consider lighter alternatives.",
      filePath: "package.json",
      lineNumber: null,
      suggestion: "Replace with date-fns or dayjs for a significantly smaller bundle.",
    },
  ],
  architectureFindings: [
    {
      id: "arch-1",
      category: "caching",
      status: "good" as const,
      title: "React Query configured for data fetching",
      description: "The project uses React Query with appropriate stale time and cache settings.",
      recommendation: "",
    },
    {
      id: "arch-2",
      category: "api-design",
      status: "warning" as const,
      title: "No API rate limiting detected",
      description: "API endpoints do not appear to implement rate limiting.",
      recommendation: "Add rate limiting middleware to prevent abuse and ensure fair usage.",
    },
    {
      id: "arch-3",
      category: "database",
      status: "missing" as const,
      title: "No database connection pooling",
      description: "Database connections are created per-request without pooling.",
      recommendation: "Configure connection pooling (e.g., PgBouncer or built-in pool) to reduce connection overhead.",
    },
    {
      id: "arch-4",
      category: "bundle",
      status: "good" as const,
      title: "Tree-shaking enabled via ESM imports",
      description: "The project uses ES module imports which enables tree-shaking during bundling.",
      recommendation: "",
    },
  ],
  createdAt: new Date().toISOString(),
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
    scope: "project",
    lineCount: 112,
    sizeBytes: 4500,
    lastModified: new Date().toISOString(),
    description: "Project memory file",
  },
  {
    path: "/Users/test/test-project/.claude/rules/testing.md",
    sourceType: "rules",
    name: "testing.md",
    scope: "project",
    lineCount: 80,
    sizeBytes: 2200,
    lastModified: new Date().toISOString(),
    description: "Testing rules",
  },
  {
    path: "/Users/test/test-project/.claude/skills/tdd-workflow/SKILL.md",
    sourceType: "skills",
    name: "tdd-workflow",
    scope: "project",
    lineCount: 45,
    sizeBytes: 1200,
    lastModified: new Date().toISOString(),
    description: "TDD workflow skill",
  },
  {
    path: "/Users/test/test-project/CLAUDE.local.md",
    sourceType: "local-md",
    name: "CLAUDE.local.md",
    scope: "project",
    lineCount: 30,
    sizeBytes: 900,
    lastModified: new Date().toISOString(),
    description: "Personal learnings",
  },
  {
    path: "/Users/test/.claude/CLAUDE.md",
    sourceType: "claude-md",
    name: "~/.claude/CLAUDE.md",
    scope: "global",
    lineCount: 15,
    sizeBytes: 400,
    lastModified: new Date().toISOString(),
    description: "Global Claude Code instructions",
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

export const mockTestStalenessReport = {
  checkedFiles: 3,
  staleCount: 1,
  results: [
    {
      sourceFile: "src/components/App.tsx",
      testFile: "src/components/App.test.tsx",
      isStale: true,
      reason: "src/components/App.tsx was modified but src/components/App.test.tsx was not",
    },
    {
      sourceFile: "src/hooks/useHealth.ts",
      testFile: null,
      isStale: false,
      reason: "No corresponding test file found",
    },
    {
      sourceFile: "src/lib/utils.ts",
      testFile: "src/lib/utils.test.ts",
      isStale: false,
      reason: "Test file was also modified",
    },
  ],
  checkedAt: new Date().toISOString(),
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

export const mockPatterns = [
  {
    id: "pattern-1",
    description: "React component with useState and useEffect hooks",
    frequency: 12,
    suggestedSkill: "Create a reusable React hook pattern with state management and side effects.",
  },
  {
    id: "pattern-2",
    description: "API fetch with error handling",
    frequency: 6,
    suggestedSkill: null,
  },
];

export const mockPromptAnalysis = {
  qualityScore: 72,
  criteria: [
    { name: "Clarity", score: 20, maxScore: 25, feedback: "Prompt is mostly clear but could specify file targets" },
    { name: "Specificity", score: 15, maxScore: 25, feedback: "Could be more specific about expected behavior" },
    { name: "Context", score: 22, maxScore: 25, feedback: "Good project context provided" },
    { name: "Scope", score: 15, maxScore: 25, feedback: "Scope is reasonable but could be more focused" },
  ],
  suggestions: [
    "Add specific file paths to target",
    "Include expected test outcomes",
    "Specify error handling requirements",
  ],
  enhancedPrompt: "## Task\nAdd user authentication with JWT tokens.\n\n## Files\n- src/auth/login.ts\n- src/middleware/auth.ts\n\n## Requirements\n1. Implement login endpoint\n2. Add JWT token generation\n3. Create auth middleware\n\n## Tests\n- Verify login returns token\n- Verify middleware rejects invalid tokens",
};

export const mockRalphLoop = {
  id: "loop-1",
  projectId: "test-project-1",
  prompt: "Add user authentication with JWT",
  enhancedPrompt: null,
  status: "completed" as const,
  qualityScore: 72,
  iterations: 3,
  outcome: "Successfully implemented JWT authentication with login, middleware, and tests.",
  startedAt: new Date(Date.now() - 3600000).toISOString(),
  pausedAt: null,
  completedAt: new Date().toISOString(),
  createdAt: new Date(Date.now() - 3600000).toISOString(),
  mode: "iterative" as const,
  currentStory: null,
  totalStories: null,
};

export const mockRalphMistakes = [
  {
    id: "mistake-1",
    projectId: "test-project-1",
    loopId: "loop-1",
    mistakeType: "implementation" as const,
    description: "Forgot to hash passwords before storing",
    context: "During JWT auth implementation",
    resolution: "Added bcrypt hashing to user registration",
    learnedPattern: "Always hash passwords with bcrypt before storage",
    createdAt: new Date().toISOString(),
  },
];

export const mockRalphContext = {
  claudeMdSummary: "TypeScript + React project with Vitest testing",
  recentMistakes: [
    {
      id: "mistake-1",
      projectId: "test-project-1",
      loopId: "loop-1",
      mistakeType: "implementation" as const,
      description: "Forgot to hash passwords",
      context: null,
      resolution: "Added bcrypt",
      learnedPattern: "Always hash passwords",
      createdAt: new Date().toISOString(),
    },
  ],
  projectPatterns: ["React hooks pattern", "Tauri IPC pattern"],
};

export const mockTestPlan = {
  id: "plan-1",
  projectId: "test-project-1",
  name: "Authentication Tests",
  description: "Test plan for user authentication features",
  status: "active" as const,
  targetCoverage: 80,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const mockTestPlanSummary = {
  plan: {
    id: "plan-1",
    projectId: "test-project-1",
    name: "Authentication Tests",
    description: "Test plan for user authentication features",
    status: "active" as const,
    targetCoverage: 80,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  totalCases: 3,
  passingCases: 2,
  failingCases: 1,
  pendingCases: 0,
  skippedCases: 0,
  lastRun: null,
  currentCoverage: 65,
  coverageTrend: [50, 55, 60, 65],
};

export const mockTestCases = [
  {
    id: "case-1",
    planId: "plan-1",
    name: "Login returns JWT token",
    description: "Verify that valid credentials return a JWT token",
    filePath: "src/auth/login.test.ts",
    testType: "unit" as const,
    priority: "high" as const,
    status: "passing" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "case-2",
    planId: "plan-1",
    name: "Auth middleware rejects invalid token",
    description: "Verify middleware blocks requests with invalid tokens",
    filePath: "src/middleware/auth.test.ts",
    testType: "unit" as const,
    priority: "high" as const,
    status: "passing" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "case-3",
    planId: "plan-1",
    name: "Full auth flow e2e",
    description: "End-to-end test of registration, login, and authenticated request",
    filePath: "e2e/auth.spec.ts",
    testType: "e2e" as const,
    priority: "medium" as const,
    status: "failing" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const mockTestRun = {
  id: "run-1",
  planId: "plan-1",
  status: "passed" as const,
  totalTests: 3,
  passedTests: 2,
  failedTests: 1,
  skippedTests: 0,
  durationMs: 4500,
  coveragePercent: 65,
  stdout: "Test Suites: 2 passed, 1 failed\nTests: 2 passed, 1 failed",
  stderr: "",
  startedAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
};

export const mockTestSuggestions = [
  {
    name: "Test error handling for network failures",
    description: "Verify graceful error handling when API calls fail",
    testType: "unit" as const,
    priority: "high" as const,
    rationale: "Network error handling is critical for user experience",
    suggestedFilePath: "src/services/api.test.ts",
  },
  {
    name: "Test form validation rules",
    description: "Ensure form inputs are validated before submission",
    testType: "integration" as const,
    priority: "medium" as const,
    rationale: "Form validation prevents invalid data from reaching the backend",
    suggestedFilePath: "src/components/Form.test.tsx",
  },
];

export const mockTddSession = {
  id: "tdd-1",
  projectId: "test-project-1",
  featureName: "Add logout button",
  testFilePath: "src/components/Logout.test.tsx",
  currentPhase: "red" as const,
  phaseStatus: "pending" as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const mockContextHealth = {
  totalTokens: 84600,
  usagePercent: 42.3,
  breakdown: {
    conversation: 45000,
    code: 25000,
    mcp: 8600,
    skills: 6000,
  },
  rotRisk: "low" as const,
};

export const mockMcpServers = [
  {
    name: "filesystem",
    status: "configured",
    tokenOverhead: 3200,
    recommendation: "keep",
    description: "File system access for reading and writing files",
  },
  {
    name: "github",
    status: "configured",
    tokenOverhead: 5400,
    recommendation: "optimize",
    description: "GitHub API integration for PRs, issues, and repos",
  },
];

export const mockCheckpoints = [
  {
    id: "chk-1",
    projectId: "test-project-1",
    label: "Before refactor",
    summary: "Stable state before auth refactoring",
    tokenSnapshot: 78000,
    contextPercent: 39,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const mockEnforcementEvents = [
  {
    id: "evt-1",
    projectId: "test-project-1",
    eventType: "warning",
    source: "hook",
    message: "Missing @module header in src/utils/helpers.ts",
    filePath: "src/utils/helpers.ts",
    createdAt: new Date().toISOString(),
  },
  {
    id: "evt-2",
    projectId: "test-project-1",
    eventType: "block",
    source: "hook",
    message: "Commit blocked: 2 files missing documentation headers",
    filePath: null,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

export const mockCiSnippets = [
  {
    provider: "github_actions",
    name: "Doc Check Workflow",
    description: "GitHub Actions workflow that checks for missing documentation headers",
    filename: ".github/workflows/doc-check.yml",
    content: "name: Doc Check\non:\n  pull_request:\n    branches: [main]\njobs:\n  check:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: ./scripts/check-docs.sh",
  },
  {
    provider: "gitlab_ci",
    name: "Doc Check Pipeline",
    description: "GitLab CI pipeline for documentation enforcement",
    filename: ".gitlab-ci.yml",
    content: "doc-check:\n  stage: test\n  script:\n    - ./scripts/check-docs.sh\n  only:\n    - merge_requests",
  },
];

export const mockTeamTemplate = {
  id: "team-1",
  name: "Full Stack Feature Team",
  description: "A team for building full-stack features end-to-end",
  orchestrationPattern: "leader" as const,
  category: "feature-development" as const,
  teammates: [
    { role: "Frontend Dev", description: "React component development", spawnPrompt: "Build React components with tests" },
    { role: "Backend Dev", description: "API endpoint development", spawnPrompt: "Build API endpoints with validation" },
  ],
  tasks: [
    { id: "task-1", title: "Build UI Components", description: "Create React components for the feature", assignedTo: "Frontend Dev", blockedBy: [] as string[] },
    { id: "task-2", title: "Build API Endpoints", description: "Create API endpoints for the feature", assignedTo: "Backend Dev", blockedBy: [] as string[] },
  ],
  hooks: [
    { event: "PostToolUse", command: "pnpm test", description: "Run tests after file changes" },
  ],
  leadSpawnInstructions: "Coordinate the Frontend Dev and Backend Dev to build the feature end-to-end. Ensure tests pass before marking complete.",
  projectId: "test-project-1",
  usageCount: 2,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
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
  noProjects?: boolean;
} = {}) {
  const {
    hasApiKey = true,
    hasClaudeMd = true,
    isEmptyProject = false,
    projectId = "test-project-1",
    hasTestFramework = true,
    hasClaudeCodeHooks = false,
    noProjects = false,
  } = options;

  // Use route interception to inject mocks before any scripts load
  await page.route("**/*", async (route) => {
    await route.continue();
  });

  await page.addInitScript(({ hasApiKey, hasClaudeMd, isEmptyProject, projectId, hasTestFramework, hasClaudeCodeHooks, noProjects, mocks }) => {
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
          if (noProjects) return [];
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
          return { installed: false, hookPath: "", mode: "off", hasHusky: false, hasGit: true, version: null, outdated: false, currentVersion: "4.0.0" };

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
          return [mocks.testPlan];

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

        case "check_test_staleness":
          await new Promise(r => setTimeout(r, 200));
          return mocks.testStalenessReport;

        case "list_team_templates":
          return [mocks.teamTemplate];

        case "analyze_performance":
          await new Promise(r => setTimeout(r, 500));
          return mocks.performanceReview;

        case "list_performance_reviews":
          return [];

        case "get_performance_review":
          return mocks.performanceReview;

        case "delete_performance_review":
          return null;

        case "remediate_performance_file":
          await new Promise(r => setTimeout(r, 300));
          return (args?.issues || []).map((issue: { id: string }) => ({
            issueId: issue.id,
            filePath: args?.filePath || "",
            status: "fixed",
            message: "Applied AI fix",
          }));

        // Skills CRUD
        case "create_skill":
          return { id: `skill-${Date.now()}`, name: args?.name, description: args?.description, content: args?.content, projectId: args?.projectId || "test-project-1", usageCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        case "update_skill":
          return { ...mocks.skills[0], name: args?.name || mocks.skills[0].name, description: args?.description || mocks.skills[0].description, content: args?.content || mocks.skills[0].content, updatedAt: new Date().toISOString() };
        case "delete_skill":
          return null;
        case "detect_patterns":
          await new Promise(r => setTimeout(r, 300));
          return mocks.patterns;
        case "increment_skill_usage":
          return 1;

        // Agents CRUD
        case "create_agent":
          return { id: `agent-${Date.now()}`, name: args?.name, description: args?.description, tier: args?.tier || "essential", category: args?.category || "testing", instructions: args?.instructions || "", workflow: args?.workflow || null, tools: args?.tools || null, triggerPatterns: args?.triggerPatterns || null, projectId: args?.projectId || "test-project-1", usageCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        case "update_agent":
          return { ...mocks.agents[0], name: args?.name || mocks.agents[0].name, description: args?.description || mocks.agents[0].description, updatedAt: new Date().toISOString() };
        case "delete_agent":
          return null;
        case "increment_agent_usage":
          return 1;
        case "enhance_agent_instructions":
          await new Promise(r => setTimeout(r, 500));
          return "# Enhanced Instructions\n\nYou are an expert test-driven development agent.\n\n## Workflow\n1. Write a failing test\n2. Implement minimal code to pass\n3. Refactor while green\n\n## Rules\n- Never skip the red phase\n- Keep tests atomic and focused";

        // Team Templates CRUD
        case "create_team_template":
          return { id: `team-${Date.now()}`, name: args?.name, description: args?.description, orchestrationPattern: args?.orchestrationPattern || "leader", category: args?.category || "feature-development", teammates: JSON.parse((args?.teammatesJson as string) || "[]"), tasks: JSON.parse((args?.tasksJson as string) || "[]"), hooks: JSON.parse((args?.hooksJson as string) || "[]"), leadSpawnInstructions: args?.leadSpawnInstructions || "", projectId: args?.projectId || "test-project-1", usageCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        case "update_team_template":
          return { ...mocks.teamTemplate, name: args?.name || mocks.teamTemplate.name, description: args?.description || mocks.teamTemplate.description, updatedAt: new Date().toISOString() };
        case "delete_team_template":
          return null;
        case "increment_team_template_usage":
          return 1;
        case "generate_team_deploy_output":
          await new Promise(r => setTimeout(r, 500));
          return "# Team Deploy Output\n\nLead Agent: Coordinate the team.\n\n## Teammates\n- Frontend Dev: Build React components\n- Backend Dev: Build API endpoints\n\n## Tasks\n1. Build UI Components\n2. Build API Endpoints";

        // RALPH
        case "analyze_ralph_prompt":
          await new Promise(r => setTimeout(r, 300));
          return mocks.promptAnalysis;
        case "analyze_ralph_prompt_with_ai":
          await new Promise(r => setTimeout(r, 500));
          return mocks.promptAnalysis;
        case "start_ralph_loop":
          await new Promise(r => setTimeout(r, 300));
          return { ...mocks.ralphLoop, id: `loop-${Date.now()}`, status: "running", prompt: args?.prompt, qualityScore: args?.qualityScore || 72 };
        case "start_ralph_loop_prd":
          await new Promise(r => setTimeout(r, 300));
          return { ...mocks.ralphLoop, id: `loop-${Date.now()}`, status: "running", mode: "prd", currentStory: 0, totalStories: 3 };
        case "pause_ralph_loop":
          return null;
        case "resume_ralph_loop":
          return null;
        case "kill_ralph_loop":
          return null;
        case "list_ralph_loops":
          return [mocks.ralphLoop];
        case "list_ralph_mistakes":
          return mocks.ralphMistakes;
        case "get_ralph_context":
          return mocks.ralphContext;
        case "record_ralph_mistake":
          return { id: `mistake-${Date.now()}`, projectId: args?.projectId, loopId: args?.loopId, mistakeType: args?.mistakeType, description: args?.description, context: args?.context || null, resolution: args?.resolution || null, learnedPattern: args?.learnedPattern || null, createdAt: new Date().toISOString() };
        case "update_claude_md_with_pattern":
          return null;

        // Test Plans CRUD
        case "get_test_plan":
          return mocks.testPlanSummary;
        case "create_test_plan":
          return { id: `plan-${Date.now()}`, projectId: args?.projectId || "test-project-1", name: args?.name, description: args?.description || "", status: "draft", targetCoverage: args?.targetCoverage || 80, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        case "update_test_plan":
          return { ...mocks.testPlan, name: args?.name || mocks.testPlan.name, status: args?.status || mocks.testPlan.status, updatedAt: new Date().toISOString() };
        case "delete_test_plan":
          return null;
        case "list_test_cases":
          return mocks.testCases;
        case "create_test_case":
          return { id: `case-${Date.now()}`, planId: args?.planId, name: args?.name, description: args?.description || "", filePath: args?.filePath || null, testType: args?.testType || "unit", priority: args?.priority || "medium", status: "pending", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        case "update_test_case":
          return { ...mocks.testCases[0], status: args?.status || mocks.testCases[0].status, updatedAt: new Date().toISOString() };
        case "delete_test_case":
          return null;
        case "run_test_plan":
          await new Promise(r => setTimeout(r, 500));
          return mocks.testRun;
        case "get_test_runs":
          return [mocks.testRun];
        case "generate_test_suggestions":
          await new Promise(r => setTimeout(r, 500));
          return mocks.testSuggestions;

        // TDD Workflow
        case "create_tdd_session":
          return { ...mocks.tddSession, id: `tdd-${Date.now()}`, featureName: args?.featureName, testFilePath: args?.testFilePath || null };
        case "update_tdd_session":
          return { ...mocks.tddSession, currentPhase: args?.phase || mocks.tddSession.currentPhase, phaseStatus: args?.phaseStatus || mocks.tddSession.phaseStatus, updatedAt: new Date().toISOString() };
        case "get_tdd_session":
          return mocks.tddSession;
        case "list_tdd_sessions":
          return [mocks.tddSession];
        case "generate_subagent_config":
          return `# ${args?.agentType || "TDD"} Subagent\n\nYou are a specialized ${args?.agentType || "TDD"} agent.\n\n## Instructions\n- Follow red-green-refactor cycle\n- Write minimal code to pass tests\n- Keep tests focused and atomic`;

        // Context Health
        case "get_context_health":
          return mocks.contextHealth;
        case "get_mcp_status":
          return mocks.mcpServers;
        case "create_checkpoint":
          return { id: `chk-${Date.now()}`, projectId: args?.projectId || "test-project-1", label: args?.label, summary: args?.summary || "", tokenSnapshot: 84600, contextPercent: 42.3, createdAt: new Date().toISOString() };
        case "list_checkpoints":
          return mocks.checkpoints;

        // Enforcement
        case "install_git_hooks":
          await new Promise(r => setTimeout(r, 300));
          return { installed: true, hookPath: ".git/hooks/pre-commit", mode: args?.mode || "warn", hasHusky: false, hasGit: true, version: "4.0.0", outdated: false, currentVersion: "4.0.0" };
        case "get_hook_health":
          return { consecutiveFailures: 0, lastFailureFile: null, lastFailureReason: null, lastFailureTime: null, downgraded: false, downgradeTime: null, totalSuccesses: 0, totalFailures: 0 };
        case "reset_hook_health":
          return null;
        case "get_enforcement_events":
          return mocks.enforcementEvents;
        case "get_ci_snippets":
          await new Promise(r => setTimeout(r, 300));
          return mocks.ciSnippets;
        case "init_git":
          return null;

        // Dialog plugin (used by pickFolder)
        case "plugin:dialog|open":
          return "/test/project/path";

        // Onboarding
        case "scan_project":
          return {
            confidence: "high",
            language: { value: "TypeScript", confidence: 0.9, source: "package.json" },
            framework: { value: "React", confidence: 0.8, source: "package.json" },
            database: null,
            testing: { value: "Vitest", confidence: 0.7, source: "vitest.config.ts" },
            styling: { value: "Tailwind CSS", confidence: 0.8, source: "tailwind.config.js" },
            projectName: "test-project",
            projectType: "Web App",
            fileCount: 42,
            hasExistingClaudeMd: false,
          };
        case "save_project":
          return {
            id: `proj-${Date.now()}`,
            name: args?.name || "test-project",
            path: args?.path || "/test/project",
            language: args?.language || "TypeScript",
            framework: args?.framework || "React",
            database: args?.database || null,
            testing: args?.testing || "Vitest",
            styling: args?.styling || "Tailwind CSS",
            healthScore: 50,
            createdAt: new Date().toISOString(),
            description: args?.description || "",
            projectType: args?.projectType || "Web App",
          };

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
    noProjects,
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
      testStalenessReport: mockTestStalenessReport,
      claudeMdAnalysis: mockClaudeMdAnalysis,
      performanceReview: mockPerformanceReview,
      patterns: mockPatterns,
      promptAnalysis: mockPromptAnalysis,
      ralphLoop: mockRalphLoop,
      ralphMistakes: mockRalphMistakes,
      ralphContext: mockRalphContext,
      testPlan: mockTestPlan,
      testPlanSummary: mockTestPlanSummary,
      testCases: mockTestCases,
      testRun: mockTestRun,
      testSuggestions: mockTestSuggestions,
      tddSession: mockTddSession,
      contextHealth: mockContextHealth,
      mcpServers: mockMcpServers,
      checkpoints: mockCheckpoints,
      enforcementEvents: mockEnforcementEvents,
      ciSnippets: mockCiSnippets,
      teamTemplate: mockTeamTemplate,
    },
  });
}
