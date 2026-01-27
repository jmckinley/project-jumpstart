# Claude Code Copilot

## Overview

Desktop application (Tauri 2.0 + React) that automatically applies and enforces Claude Code best practices. The core mission is **preventing context rot** through persistent documentation.

**Full Specification**: `claude-code-copilot-desktop-spec-v2.md`

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
claude-code-copilot/
├── src-tauri/                      # Rust backend
│   ├── src/
│   │   ├── main.rs                 # Entry point, Tauri setup
│   │   ├── commands/               # IPC command handlers
│   │   │   ├── mod.rs
│   │   │   ├── project.rs          # Project CRUD
│   │   │   ├── onboarding.rs       # Setup wizard
│   │   │   ├── claude_md.rs        # CLAUDE.md operations
│   │   │   ├── modules.rs          # Module documentation
│   │   │   ├── freshness.rs        # Staleness detection
│   │   │   ├── skills.rs           # Skills management
│   │   │   ├── ralph.rs            # RALPH loops
│   │   │   ├── context.rs          # Context health
│   │   │   └── enforcement.rs      # Git hooks, CI
│   │   ├── core/                   # Business logic
│   │   │   ├── mod.rs
│   │   │   ├── scanner.rs          # Project detection
│   │   │   ├── watcher.rs          # File system watcher
│   │   │   ├── analyzer.rs         # Code analysis
│   │   │   ├── generator.rs        # AI generation
│   │   │   ├── freshness.rs        # Staleness calculation
│   │   │   └── health.rs           # Health scoring
│   │   ├── models/                 # Data structures
│   │   │   ├── mod.rs
│   │   │   ├── project.rs
│   │   │   ├── module.rs
│   │   │   └── skill.rs
│   │   └── db/                     # Database layer
│   │       ├── mod.rs
│   │       └── schema.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── src/                            # React frontend
│   ├── components/
│   │   ├── ui/                     # shadcn primitives
│   │   ├── layout/                 # App shell
│   │   │   ├── Sidebar.tsx
│   │   │   ├── MainPanel.tsx
│   │   │   └── StatusBar.tsx
│   │   ├── onboarding/             # Setup wizard
│   │   │   ├── WizardShell.tsx
│   │   │   ├── ProjectSelect.tsx
│   │   │   ├── AnalysisResults.tsx
│   │   │   ├── TechStackSelect.tsx
│   │   │   ├── GoalsSelect.tsx
│   │   │   └── GenerationProgress.tsx
│   │   ├── dashboard/              # Main dashboard
│   │   │   ├── HealthScore.tsx
│   │   │   ├── QuickWins.tsx
│   │   │   ├── ContextRotAlert.tsx
│   │   │   └── RecentActivity.tsx
│   │   ├── claude-md/              # CLAUDE.md editor
│   │   │   ├── Editor.tsx
│   │   │   ├── Preview.tsx
│   │   │   └── Suggestions.tsx
│   │   ├── modules/                # Module documentation
│   │   │   ├── FileTree.tsx
│   │   │   ├── DocStatus.tsx
│   │   │   ├── DocPreview.tsx
│   │   │   └── BatchGenerator.tsx
│   │   ├── skills/                 # Skills workshop
│   │   │   ├── SkillsList.tsx
│   │   │   ├── SkillEditor.tsx
│   │   │   └── PatternDetector.tsx
│   │   ├── ralph/                  # RALPH command center
│   │   │   ├── CommandCenter.tsx
│   │   │   ├── PromptAnalyzer.tsx
│   │   │   └── LoopMonitor.tsx
│   │   ├── context/                # Context health
│   │   │   ├── HealthMonitor.tsx
│   │   │   ├── TokenBreakdown.tsx
│   │   │   └── McpOptimizer.tsx
│   │   └── enforcement/            # Enforcement
│   │       ├── GitHookSetup.tsx
│   │       └── CISetup.tsx
│   ├── hooks/                      # Custom hooks
│   │   ├── useProject.ts
│   │   ├── useOnboarding.ts
│   │   ├── useClaudeMd.ts
│   │   ├── useModules.ts
│   │   └── useHealth.ts
│   ├── stores/                     # Zustand stores
│   │   ├── projectStore.ts
│   │   ├── onboardingStore.ts
│   │   └── settingsStore.ts
│   ├── types/                      # TypeScript types
│   │   ├── index.ts
│   │   ├── project.ts
│   │   ├── module.ts
│   │   └── health.ts
│   ├── lib/                        # Utilities
│   │   ├── tauri.ts                # Tauri API wrapper
│   │   └── utils.ts
│   ├── App.tsx
│   └── main.tsx
│
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
├── claude-code-copilot-desktop-spec-v2.md
└── CLAUDE.md                       # This file
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
# SQLite DB is at: ~/.claude-code-copilot/copilot.db
```

---

## ⚠️ CRITICAL: Module Documentation Requirements

### Every File MUST Have Documentation

This is the **most important rule** in this project. Every source file needs a documentation header at the top because:

1. **These headers survive context compaction** — When context fills up after 30+ minutes, Claude loses memory. But file headers are always visible when a file is opened.

2. **We're building a documentation tool** — If we don't document our own code, we're hypocrites.

3. **Self-hosting** — Once v1.0 ships, we'll use Copilot on itself.

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

## Current Focus

**Phase**: 1 - Foundation
**Working on**: Initial project setup
**Next up**: Basic layout components
**Blocked by**: Nothing

---

## Important Decisions

Record key architectural decisions here so they survive context loss:

1. **Tauri over Electron**: 10MB bundle vs 150MB, better performance, native feel

2. **SQLite over IndexedDB**: Rust-native, better querying, file-based backup

3. **tree-sitter for parsing**: Language-aware AST analysis, supports many languages

4. **Zustand over Redux**: Simpler API, less boilerplate, TypeScript-friendly

5. **shadcn/ui over other libraries**: Copy-paste components, full customization, Tailwind-native

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

// Module Status
interface ModuleStatus {
  path: string;
  status: 'current' | 'outdated' | 'missing';
  freshnessScore: number;
  changes?: string[];
}

// Detection Result
interface DetectionResult {
  confidence: 'high' | 'medium' | 'low' | 'none';
  language: { value: string; confidence: number; source: string } | null;
  framework: { value: string; confidence: number; source: string } | null;
  // ... other detected values
}
```

---

## CLAUDE NOTES

### General
- Always read the spec file for detailed requirements
- Use pnpm, not npm or yarn
- Target macOS first, then Windows/Linux
- Every file needs a documentation header (see above)

### Rust
- All Tauri commands must be async
- All commands return `Result<T, String>`
- Use `tokio` for async runtime
- Prefer `anyhow` for error handling internally, convert to String at boundary

### React
- Use functional components only
- Use shadcn/ui for all UI primitives
- Use Tailwind classes, never CSS files
- Prefer composition over prop drilling

### Database
- SQLite database location: `~/.claude-code-copilot/copilot.db`
- Use migrations for schema changes
- All timestamps in UTC

### File Paths
- Use forward slashes even on Windows (Tauri normalizes)
- Store relative paths in DB when possible
- Resolve to absolute only when needed

---

## Spec Reference

The full product specification is in `claude-code-copilot-desktop-spec-v2.md`. Key sections:

- **Part 2**: Onboarding flow with wireframes
- **Part 3**: Main UI wireframes
- **Part 4**: Context rot prevention system
- **Part 5**: Core engine specs
- **Part 6**: Data models
- **Part 7**: Tauri commands
- **Part 8**: Implementation roadmap

---

*Remember: Update this file and all module documentation as the project evolves!*
