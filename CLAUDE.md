# Project Jumpstart

## Overview

Desktop application (Tauri 2.0 + React) that automatically applies and enforces Claude Code best practices. The core mission is **preventing context rot** through persistent documentation.

**Full Specification**: `project-jumpstart-spec.md`

---

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| **Framework** | Tauri 2.0 | Rust backend + web frontend |
| **Frontend** | React 18 + TypeScript | Vite for bundling |
| **UI** | shadcn/ui + Tailwind CSS | Consistent, modern components |
| **State** | Zustand | Simple, TypeScript-friendly |
| **Backend** | Rust | Performance for file watching, parsing |
| **Database** | SQLite (rusqlite) | Local-first, no server |
| **Code Parsing** | tree-sitter | Language-aware AST analysis |
| **File Watching** | notify-rs | Cross-platform, efficient |
| **AI** | Anthropic API | Claude for generation |
| **Package Manager** | pnpm | Fast, efficient |

---

## Project Structure

```
project-jumpstart/
├── src-tauri/                      # Rust backend
│   ├── src/
│   │   ├── main.rs                 # Entry point (delegates to lib.rs)
│   │   ├── lib.rs                  # App config, command registration
│   │   ├── commands/               # IPC command handlers
│   │   │   ├── mod.rs
│   │   │   ├── project.rs          # Project CRUD
│   │   │   ├── onboarding.rs       # Setup wizard
│   │   │   ├── claude_md.rs        # CLAUDE.md operations
│   │   │   ├── modules.rs          # Module documentation
│   │   │   ├── freshness.rs        # Staleness detection
│   │   │   ├── skills.rs           # Skills management
│   │   │   ├── agents.rs           # Agents management
│   │   │   ├── ralph.rs            # RALPH loops
│   │   │   ├── context.rs          # Context health
│   │   │   ├── enforcement.rs      # Git hooks, CI
│   │   │   ├── settings.rs         # User preferences
│   │   │   ├── activity.rs         # Activity logging
│   │   │   ├── watcher.rs          # File watcher control
│   │   │   ├── kickstart.rs        # Project kickstart prompts
│   │   │   └── test_plans.rs       # TDD workflow & test plans
│   │   ├── core/                   # Business logic
│   │   │   ├── mod.rs
│   │   │   ├── scanner.rs          # Project detection
│   │   │   ├── watcher.rs          # File system watcher (notify-rs)
│   │   │   ├── analyzer.rs         # Code analysis
│   │   │   ├── generator.rs        # AI generation
│   │   │   ├── freshness.rs        # Staleness calculation
│   │   │   ├── health.rs           # Health scoring
│   │   │   ├── ai.rs               # Anthropic API client
│   │   │   ├── crypto.rs           # Encrypted settings storage
│   │   │   └── test_runner.rs      # Test framework detection/execution
│   │   ├── models/                 # Data structures
│   │   │   ├── mod.rs
│   │   │   ├── project.rs
│   │   │   ├── module_doc.rs       # Module documentation model
│   │   │   ├── skill.rs
│   │   │   ├── agent.rs
│   │   │   ├── ralph.rs
│   │   │   ├── context.rs
│   │   │   ├── enforcement.rs
│   │   │   └── test_plan.rs        # Test plan, case, run, TDD session models
│   │   └── db/                     # Database layer
│   │       ├── mod.rs              # Connection, AppState
│   │       └── schema.rs           # SQLite migrations
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── src/                            # React frontend
│   ├── components/
│   │   ├── ui/                     # shadcn primitives (button, card, badge)
│   │   ├── layout/                 # App shell
│   │   │   ├── Sidebar.tsx         # Navigation + project selector
│   │   │   ├── MainPanel.tsx       # Content router
│   │   │   └── StatusBar.tsx
│   │   ├── onboarding/             # Setup wizard
│   │   │   ├── WizardShell.tsx     # Wizard container
│   │   │   ├── FirstUseWelcome.tsx # Initial welcome screen
│   │   │   ├── ProjectSelect.tsx   # Folder picker
│   │   │   ├── AnalysisResults.tsx # Tech stack detection results
│   │   │   ├── GoalsSelect.tsx     # Goal selection
│   │   │   └── ReviewGenerate.tsx  # Final review + generate
│   │   ├── dashboard/              # Main dashboard
│   │   │   ├── HealthScore.tsx     # Circular score + breakdown
│   │   │   ├── QuickWins.tsx       # Improvement suggestions
│   │   │   ├── ContextRotAlert.tsx # Staleness warning banner
│   │   │   ├── RecentActivity.tsx  # Activity timeline
│   │   │   └── RefreshDocsButton.tsx # One-click doc refresh
│   │   ├── claude-md/              # CLAUDE.md editor
│   │   │   ├── Editor.tsx          # Monaco editor + preview
│   │   │   ├── Preview.tsx         # Markdown preview
│   │   │   └── Suggestions.tsx     # Section suggestions
│   │   ├── modules/                # Module documentation
│   │   │   ├── FileTree.tsx        # File tree with status icons
│   │   │   ├── DocStatus.tsx       # Coverage stats bar
│   │   │   ├── DocPreview.tsx      # Generated doc preview
│   │   │   ├── BatchGenerator.tsx  # Batch generation controls
│   │   │   └── ProjectKickstart.tsx # Empty project bootstrapper
│   │   ├── skills/                 # Skills workshop
│   │   │   ├── SkillsList.tsx      # Skills list with tabs
│   │   │   ├── SkillEditor.tsx     # Skill create/edit form
│   │   │   ├── PatternDetector.tsx # Pattern detection display
│   │   │   ├── SkillLibrary.tsx    # Curated skill library
│   │   │   ├── SkillLibraryCard.tsx
│   │   │   ├── SkillLibraryDetail.tsx
│   │   │   └── SkillCategoryFilter.tsx
│   │   ├── agents/                 # Agents management
│   │   │   ├── AgentsList.tsx      # Agents list
│   │   │   ├── AgentEditor.tsx     # Agent create/edit form
│   │   │   ├── AgentLibrary.tsx    # Curated agent library
│   │   │   ├── AgentLibraryCard.tsx
│   │   │   ├── AgentLibraryDetail.tsx
│   │   │   └── AgentCategoryFilter.tsx
│   │   ├── test-plans/             # TDD workflow & test plans
│   │   │   ├── TestPlansList.tsx   # Test plans list with status
│   │   │   ├── TestPlanEditor.tsx  # Plan create/edit form
│   │   │   ├── TestCasesList.tsx   # Test cases list with filters
│   │   │   ├── TestCaseEditor.tsx  # Case create/edit form
│   │   │   ├── TestRunProgress.tsx # Live execution progress
│   │   │   ├── TestRunHistory.tsx  # Historical test runs
│   │   │   ├── TestCoverageChart.tsx # Coverage trend chart
│   │   │   ├── TestSuggestions.tsx # AI-generated suggestions
│   │   │   ├── TDDWorkflow.tsx     # Red-green-refactor guide
│   │   │   ├── TDDPhaseCard.tsx    # Individual phase card
│   │   │   ├── SubagentGenerator.tsx # Claude subagent config
│   │   │   └── HooksGenerator.tsx  # PostToolUse hooks config
│   │   ├── ralph/                  # RALPH command center
│   │   │   ├── CommandCenter.tsx   # Prompt input + controls
│   │   │   ├── PromptAnalyzer.tsx  # Analysis display
│   │   │   └── LoopMonitor.tsx     # Active loop monitor
│   │   ├── context/                # Context health
│   │   │   ├── HealthMonitor.tsx   # Health overview + checkpoints
│   │   │   ├── TokenBreakdown.tsx  # Token usage chart
│   │   │   └── McpOptimizer.tsx    # MCP server status
│   │   ├── enforcement/            # Enforcement
│   │   │   ├── GitHookSetup.tsx    # Git hook installer
│   │   │   └── CISetup.tsx         # CI template snippets
│   │   ├── settings/               # Settings
│   │   │   └── SettingsView.tsx    # API key + preferences
│   │   └── help/                   # Help
│   │       └── HelpView.tsx        # Documentation links
│   ├── hooks/                      # Custom hooks (all call real Tauri backend)
│   │   ├── useProject.ts
│   │   ├── useOnboarding.ts
│   │   ├── useClaudeMd.ts
│   │   ├── useModules.ts
│   │   ├── useHealth.ts
│   │   ├── useSkills.ts
│   │   ├── useAgents.ts
│   │   ├── useRalph.ts
│   │   ├── useContextHealth.ts
│   │   ├── useEnforcement.ts
│   │   ├── useRefreshDocs.ts
│   │   ├── useSectionCompletion.ts
│   │   ├── useTestPlans.ts         # Test plan CRUD & execution
│   │   └── useTDDWorkflow.ts       # TDD session state management
│   ├── stores/                     # Zustand stores
│   │   ├── projectStore.ts
│   │   ├── onboardingStore.ts
│   │   └── settingsStore.ts
│   ├── data/                       # Static data
│   │   ├── skillLibrary.ts         # Curated skill definitions
│   │   ├── skillCategories.ts
│   │   ├── agentLibrary.ts         # Curated agent definitions
│   │   ├── agentCategories.ts
│   │   └── stackTemplates.ts       # Tech stack templates
│   ├── types/                      # TypeScript types
│   │   ├── index.ts
│   │   ├── project.ts
│   │   ├── module.ts
│   │   ├── skill.ts
│   │   ├── agent.ts
│   │   ├── health.ts
│   │   ├── ralph.ts
│   │   ├── enforcement.ts
│   │   ├── kickstart.ts
│   │   └── test-plan.ts            # Test plan, case, run, TDD types
│   ├── lib/                        # Utilities
│   │   ├── tauri.ts                # Tauri IPC wrapper (50+ commands)
│   │   ├── utils.ts                # General utilities
│   │   ├── skillRelevance.ts       # Skill recommendation logic
│   │   └── agentRelevance.ts       # Agent recommendation logic
│   ├── test/                       # Test setup
│   │   └── setup.ts
│   ├── App.tsx                     # Root component
│   └── main.tsx                    # Entry point
│
├── .claude/                        # Claude Code configuration
│   ├── hooks/                      # Session lifecycle hooks
│   │   └── extract-learnings.sh    # Auto-extract learnings at session end
│   ├── settings.json               # Hook registrations
│   └── settings.local.json         # Local permissions (gitignored)
│
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
├── vitest.config.ts                # Test configuration
├── project-jumpstart-spec.md       # Full product specification
├── CLAUDE.md                       # This file (project memory)
└── CLAUDE.local.md                 # Personal learnings (gitignored, auto-populated)
```

---

## Commands

```bash
# Development
pnpm install              # Install dependencies
pnpm dev                  # Start Vite dev server only
pnpm tauri dev            # Start full Tauri development

# Building
pnpm build                # Build frontend
pnpm tauri build          # Build distributable app

# Testing
cargo test                # Run Rust tests
pnpm test                 # Run frontend tests
pnpm lint                 # Run ESLint
cargo clippy              # Run Rust linter

# Database
# SQLite DB is at: ~/.project-jumpstart/jumpstart.db
```

---

## ⚠️ CRITICAL: Module Documentation Requirements

### Every File MUST Have Documentation

This is the **most important rule** in this project. Every source file needs a documentation header at the top because:

1. **These headers survive context compaction** — When context fills up after 30+ minutes, Claude loses memory. But file headers are always visible when a file is opened.

2. **We're building a documentation tool** — If we don't document our own code, we're hypocrites.

3. **Self-hosting** — The app is now feature-complete; use Project Jumpstart on itself for documentation maintenance.

---

### TypeScript/React Documentation Format

```typescript
/**
 * @module [path/from/src]
 * @description [One-line description of what this module does]
 * 
 * PURPOSE:
 * - [Main responsibility #1]
 * - [Main responsibility #2]
 * 
 * DEPENDENCIES:
 * - [import path] - [why it's needed]
 * 
 * EXPORTS:
 * - [functionName] - [what it does]
 * - [ComponentName] - [what it renders]
 * - [TypeName] - [what it represents]
 * 
 * PATTERNS:
 * - [How this module should be used]
 * - [Important conventions]
 * 
 * CLAUDE NOTES:
 * - [Things I should always remember about this module]
 * - [Common mistakes to avoid]
 * - [Related files to check]
 */
```

### Rust Documentation Format

```rust
//! @module [path/from/src]
//! @description [One-line description]
//!
//! PURPOSE:
//! - [Main responsibility]
//!
//! DEPENDENCIES:
//! - [crate/module] - [why needed]
//!
//! EXPORTS:
//! - [function_name] - [what it does]
//! - [StructName] - [what it represents]
//!
//! PATTERNS:
//! - [Usage patterns]
//!
//! CLAUDE NOTES:
//! - [Important context]
```

---

### When to Update Documentation

**ALWAYS update the module documentation when you:**

| Change Type | Action Required |
|-------------|-----------------|
| Add new export | Add to EXPORTS section |
| Remove export | Remove from EXPORTS section |
| Change function signature | Update EXPORTS description |
| Add import | Add to DEPENDENCIES if significant |
| Remove import | Remove from DEPENDENCIES |
| Change module purpose | Update @description and PURPOSE |
| Fix bug revealing behavior | Add to CLAUDE NOTES |
| Add pattern/convention | Add to PATTERNS |

### Documentation Checklist

**Before completing ANY file modification, verify:**

- [ ] `@description` accurately describes the module
- [ ] All current exports are listed in EXPORTS
- [ ] Removed exports are deleted from docs
- [ ] Significant dependencies are documented
- [ ] CLAUDE NOTES contain helpful reminders
- [ ] PATTERNS describe how to use this module

---

### Example: Creating a New File

```typescript
// ❌ BAD - No documentation
export function calculateHealth(project: Project): HealthScore {
  // ...
}

// ✅ GOOD - Proper documentation
/**
 * @module core/health
 * @description Calculates project health scores based on documentation coverage and freshness
 * 
 * PURPOSE:
 * - Calculate overall health score (0-100)
 * - Break down scores by component (CLAUDE.md, modules, freshness, etc.)
 * - Identify quick wins for score improvement
 * 
 * DEPENDENCIES:
 * - @/types/project - Project and HealthScore types
 * - @/core/modules - Module scanner for coverage data
 * - @/core/freshness - Staleness detection
 * 
 * EXPORTS:
 * - calculateHealth - Main health score calculation
 * - getComponentScores - Individual component breakdowns
 * - getQuickWins - Prioritized improvement suggestions
 * - HEALTH_WEIGHTS - Scoring weight constants
 * 
 * PATTERNS:
 * - Call calculateHealth() to get full score
 * - Use getQuickWins() for dashboard display
 * - Weights are configurable but must sum to 100
 * 
 * CLAUDE NOTES:
 * - Health score range is 0-100
 * - Quick wins are sorted by impact/effort ratio
 * - Component scores can exceed their weight (capped at weight max)
 */

import { Project, HealthScore } from '@/types/project';
import { getModuleCoverage } from '@/core/modules';
import { getFreshnessStats } from '@/core/freshness';

export const HEALTH_WEIGHTS = {
  claudeMd: 25,
  moduleDocs: 25,
  freshness: 15,
  skills: 15,
  context: 10,
  enforcement: 10,
} as const;

export function calculateHealth(project: Project): HealthScore {
  // Implementation...
}
```

---

### Example: Modifying an Existing File

When you add a new function, UPDATE the docs:

```typescript
/**
 * @module core/health
 * @description Calculates project health scores based on documentation coverage and freshness
 * 
 * EXPORTS:
 * - calculateHealth - Main health score calculation
 * - getComponentScores - Individual component breakdowns
 * - getQuickWins - Prioritized improvement suggestions
 * - HEALTH_WEIGHTS - Scoring weight constants
 * - calculateTrend - NEW: Calculate health score trend over time   // ← ADDED
 * 
 * CLAUDE NOTES:
 * - Health score range is 0-100
 * - Quick wins are sorted by impact/effort ratio
 * - calculateTrend requires at least 2 historical data points     // ← ADDED
 */
```

---

## Code Patterns

### Tauri Commands (Rust)

All Tauri commands follow this pattern:

```rust
#[tauri::command]
pub async fn command_name(
    arg: ArgType,
    state: State<'_, AppState>
) -> Result<ReturnType, String> {
    // Get data from state
    let db = state.db.lock().await;
    
    // Do work
    let result = do_something(&db, arg)?;
    
    // Return success
    Ok(result)
}
```

**Rules:**
- Always async
- Always return `Result<T, String>`
- Use `State` for shared app state
- Map errors to strings with `.map_err(|e| e.to_string())`

### React Components

```typescript
/**
 * @module components/dashboard/HealthScore
 * @description Displays the project health score with visual breakdown
 * ... full header ...
 */

interface HealthScoreProps {
  score: number;
  components: ComponentScores;
  onComponentClick?: (component: string) => void;
}

export function HealthScore({ score, components, onComponentClick }: HealthScoreProps) {
  return (
    <Card>
      {/* Implementation */}
    </Card>
  );
}
```

**Rules:**
- One component per file
- Props interface defined above component
- Use shadcn/ui primitives
- Tailwind for all styling

### Zustand Stores

```typescript
/**
 * @module stores/projectStore
 * @description Global state for project management
 * ... full header ...
 */

interface ProjectState {
  projects: Project[];
  activeProject: Project | null;
  loading: boolean;
  
  // Actions
  setProjects: (projects: Project[]) => void;
  setActiveProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  removeProject: (id: string) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  activeProject: null,
  loading: false,
  
  setProjects: (projects) => set({ projects }),
  setActiveProject: (activeProject) => set({ activeProject }),
  addProject: (project) => set((state) => ({ 
    projects: [...state.projects, project] 
  })),
  removeProject: (id) => set((state) => ({ 
    projects: state.projects.filter(p => p.id !== id) 
  })),
}));
```

### Tauri API Calls (Frontend)

```typescript
/**
 * @module lib/tauri
 * @description Type-safe wrapper for Tauri IPC calls
 * ... full header ...
 */

import { invoke } from '@tauri-apps/api/core';

export async function getProjects(): Promise<Project[]> {
  return invoke<Project[]>('list_projects');
}

export async function addProject(path: string): Promise<Project> {
  return invoke<Project>('add_project', { path });
}

export async function scanProject(path: string): Promise<DetectionResult> {
  return invoke<DetectionResult>('scan_project', { path });
}
```

---

## Current Status

**Status**: Feature-Complete (Beta Ready)
**Last Updated**: February 2026

### Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Onboarding Wizard | ✅ Complete | Project selection, tech stack detection, CLAUDE.md generation |
| Dashboard | ✅ Complete | Health score, quick wins, context rot alerts, activity feed |
| CLAUDE.md Editor | ✅ Complete | Live preview, section suggestions, AI-powered generation |
| Module Documentation | ✅ Complete | File tree, doc preview, batch generation |
| Project Kickstart | ✅ Complete | Empty project bootstrapping with AI prompts |
| Skills Workshop | ✅ Complete | CRUD, pattern detection, skill library |
| Agents Management | ✅ Complete | CRUD, library, AI-enhanced instructions |
| Test Plans & TDD | ✅ Complete | Test plans CRUD, TDD workflow, framework detection, AI suggestions |
| RALPH Command Center | ✅ Complete | Prompt analysis (heuristic + AI), loop monitoring |
| Context Health | ✅ Complete | Token breakdown, MCP status, checkpoints |
| Enforcement | ✅ Complete | Git hooks, CI integration snippets |
| Settings | ✅ Complete | API key management, preferences |
| File Watcher | ✅ Complete | notify-rs with debounce, event emission |
| Database | ✅ Complete | SQLite with full schema, migrations |

### What's NOT Code (Platform/Deployment)

- **macOS Notarization**: Configured and working with Apple credentials
- **Windows/Linux Builds**: Not yet configured (platform config, not code)
- **E2E Tests**: Would be nice but 581 unit tests (502 frontend + 79 Rust) provide good coverage

---

## Important Decisions

Record key architectural decisions here so they survive context loss:

1. **Tauri over Electron**: 10MB bundle vs 150MB, better performance, native feel

2. **SQLite over IndexedDB**: Rust-native, better querying, file-based backup

3. **tree-sitter for parsing**: Language-aware AST analysis, supports many languages

4. **Zustand over Redux**: Simpler API, less boilerplate, TypeScript-friendly

5. **shadcn/ui over other libraries**: Copy-paste components, full customization, Tailwind-native

6. **Auto-update enforcement mode**: Git hooks can auto-generate missing docs via API at commit time. Uses curl to call Anthropic API directly from the shell script, reading API key from `~/.project-jumpstart/settings.json`. Four modes: off (no checks), warn (allow with warnings), block (fail commit), auto-update (generate and stage).

7. **Enforcement settings sync**: Settings and Enforcement tabs share the same enforcement level. Changing one updates the other. When installing auto-update hook, the API key is decrypted from SQLite and exported to settings.json for the shell script to read.

8. **TDD Workflow with Claude Code integration**: Test Plans section includes TDD red-green-refactor workflow, framework auto-detection (Vitest, Jest, Pytest, Cargo, etc.), AI-powered test suggestions, and generators for Claude Code subagent configs and PostToolUse hooks.

9. **Session learning extraction**: A `SessionEnd` hook (`.claude/hooks/extract-learnings.sh`) auto-extracts user preferences, solutions, patterns, and gotchas from conversation transcripts. Learnings are appended to `CLAUDE.local.md` (personal, gitignored) with deduplication against existing entries. Uses Claude API for intelligent extraction.

10. **Dynamic vs static documentation**: CLAUDE.md contains static project documentation. For auto-discovered content (hooks, scripts, etc.), use backtick shell commands that execute at load time. CLAUDE.local.md contains auto-extracted session learnings that accumulate over time.

---

## Key Types Reference

```typescript
// Project
interface Project {
  id: string;
  name: string;
  path: string;
  language: string;
  framework: string | null;
  healthScore: number;
  createdAt: Date;
}

// Health Score
interface HealthScore {
  total: number;
  components: {
    claudeMd: number;
    moduleDocs: number;
    freshness: number;
    skills: number;
    context: number;
    enforcement: number;
  };
  quickWins: QuickWin[];
  contextRotRisk: 'low' | 'medium' | 'high';
}

// Module Documentation
interface ModuleDoc {
  module: string;
  description: string;
  purpose: string[];
  dependencies: string[];
  exports: string[];
  patterns: string[];
  claudeNotes: string[];
}

interface ModuleStatus {
  path: string;
  status: 'current' | 'outdated' | 'missing';
  freshnessScore: number;
  changes?: string[];
}

// Skills
interface Skill {
  id: string;
  name: string;
  description: string;
  content: string;
  projectId: string | null;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

// Agents
interface Agent {
  id: string;
  name: string;
  description: string;
  tier: string;           // 'essential' | 'advanced' | 'specialized'
  category: string;
  instructions: string;
  workflow: AgentWorkflowStep[] | null;
  tools: AgentTool[] | null;
  triggerPatterns: string[] | null;
  projectId: string | null;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

// RALPH
interface RalphAnalysis {
  score: number;          // 0-100
  issues: RalphIssue[];
  suggestions: string[];
  optimizedPrompt: string | null;
}

interface RalphLoop {
  id: string;
  prompt: string;
  status: 'active' | 'paused' | 'completed';
  iterations: number;
  createdAt: string;
}

// Context Health
interface ContextHealth {
  totalTokens: number;
  utilization: number;    // 0-100%
  breakdown: TokenBreakdown;
  risk: 'low' | 'medium' | 'high';
}

// Enforcement
interface HookStatus {
  installed: boolean;
  hookPath: string;
  mode: 'off' | 'warn' | 'block' | 'auto-update' | 'external' | 'none';
  hasHusky: boolean;
}

// Detection Result
interface DetectionResult {
  confidence: 'high' | 'medium' | 'low' | 'none';
  language: { value: string; confidence: number; source: string } | null;
  framework: { value: string; confidence: number; source: string } | null;
  buildTool: { value: string; confidence: number; source: string } | null;
  testFramework: { value: string; confidence: number; source: string } | null;
}

// Test Plans
interface TestPlan {
  id: string;
  projectId: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'archived';
  targetCoverage: number;
  createdAt: string;
  updatedAt: string;
}

interface TestCase {
  id: string;
  planId: string;
  name: string;
  description: string;
  filePath: string | null;
  testType: 'unit' | 'integration' | 'e2e';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'passing' | 'failing' | 'skipped';
}

interface TDDSession {
  id: string;
  projectId: string;
  featureName: string;
  testFilePath: string | null;
  currentPhase: 'red' | 'green' | 'refactor';
  phaseStatus: 'pending' | 'active' | 'complete' | 'failed';
  redPrompt: string | null;
  greenPrompt: string | null;
  refactorPrompt: string | null;
  completedAt: string | null;
}

interface TestFrameworkInfo {
  name: string;
  command: string;
  configFile: string | null;
  coverageCommand: string | null;
}
```

---

## CLAUDE NOTES

### General
- **App is feature-complete** — all sections fully implemented
- Always read the spec file for detailed requirements
- Use pnpm, not npm or yarn
- Target macOS first, then Windows/Linux
- Every file needs a documentation header (see above)
- 581 unit tests (502 frontend + 79 Rust) provide good coverage

### AI Integration
- Anthropic API key stored encrypted in settings
- AI features have graceful fallbacks (heuristics/templates)
- RALPH uses heuristic analysis first, AI as enhancement
- Module docs can generate from AI or use templates
- Agent instructions can be AI-enhanced

### Rust
- All Tauri commands must be async
- All commands return `Result<T, String>`
- Use `tokio` for async runtime
- Prefer `anyhow` for error handling internally, convert to String at boundary
- File watcher uses notify-rs v7 with 500ms debounce

### React
- Use functional components only
- Use shadcn/ui for all UI primitives
- Use Tailwind classes, never CSS files
- Prefer composition over prop drilling
- All hooks call real Tauri backend (no mock data)

### Database
- SQLite database location: `~/.project-jumpstart/jumpstart.db`
- Settings JSON for hooks: `~/.project-jumpstart/settings.json` (auto-generated, 0600 permissions)
- Use migrations for schema changes
- All timestamps in UTC
- Full schema includes: projects, skills, agents, activities, checkpoints, ralph_loops, settings, test_plans, test_cases, test_runs, test_case_results, tdd_sessions

### File Paths
- Use forward slashes even on Windows (Tauri normalizes)
- Store relative paths in DB when possible
- Resolve to absolute only when needed

### Testing
- Frontend tests: `pnpm test`
- Backend tests: `cargo test`
- Test files colocated with source (`.test.ts`, `.test.tsx`)

### TDD Workflow Feature
- **Test Plans**: Organize tests into plans with target coverage goals
- **Test Cases**: Track individual test cases with type (unit/integration/e2e) and priority
- **Framework Detection**: Auto-detects Vitest, Jest, Pytest, Cargo test, Playwright, Mocha, Cypress
- **TDD Phases**: Red (write failing test) → Green (make it pass) → Refactor (clean up)
- **AI Suggestions**: Generate test suggestions from code analysis via Claude API
- **Subagent Configs**: Generate Claude Code subagent markdown for automated TDD
- **PostToolUse Hooks**: Generate hooks JSON to auto-run tests after code changes

### Claude Code Hooks
- **Location**: `.claude/hooks/` directory with shell scripts
- **Registration**: `.claude/settings.json` defines which hooks run on which events
- **extract-learnings.sh**: SessionEnd hook that auto-extracts learnings from transcripts
- **Hook Input**: JSON on stdin with `session_id`, `transcript_path`, `cwd`, `hook_event_name`
- **Learnings Output**: Appended to `CLAUDE.local.md` with categories: [Preference], [Solution], [Pattern], [Gotcha]

### macOS Build & Notarization
- **Apple ID**: john@greatfallsventures.com
- **App Password**: hiam-ebkk-xrha-djbz
- **Team ID**: KACZ4GS4RL
- **Signing Identity**: Developer ID Application: John McKinley (KACZ4GS4RL)

To build with notarization:
```bash
export APPLE_ID="john@greatfallsventures.com"
export APPLE_PASSWORD="hiam-ebkk-xrha-djbz"
export APPLE_TEAM_ID="KACZ4GS4RL"
pnpm tauri build
```

---

## Spec Reference

The full product specification is in `project-jumpstart-spec.md`. Key sections:

- **Part 2**: Onboarding flow with wireframes
- **Part 3**: Main UI wireframes
- **Part 4**: Context rot prevention system
- **Part 5**: Core engine specs
- **Part 6**: Data models
- **Part 7**: Tauri commands
- **Part 8**: Implementation roadmap

---

## Changelog

| Date | Change |
|------|--------|
| Feb 3, 2026 | Added TDD Workflow & Test Plans feature: test framework detection, plan/case management, TDD red-green-refactor workflow, AI-powered test suggestions, subagent/hooks generation. |
| Jan 31, 2026 | Added enforcement settings sync between Settings and Enforcement tabs. Four modes: off, warn, block, auto-update. API key exported to settings.json for auto-update hook. |
| Jan 31, 2026 | Added auto-update enforcement mode with AI-powered doc generation at commit time. |
| Jan 2026 | Updated to reflect feature-complete status. All sections implemented. |

---

*Remember: Update this file and all module documentation as the project evolves!*
