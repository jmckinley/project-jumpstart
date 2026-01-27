# Claude Code Copilot - Desktop Application Specification v2.0

## Executive Summary

**Product**: Claude Code Copilot
**Platform**: Desktop-first (macOS, Windows, Linux) with mobile companion
**Tech Stack**: Tauri 2.0 + React + TypeScript + Rust
**Purpose**: Automatically apply and enforce Claude Code best practices

### One-Liner
*"Best practices for Claude Code — automatically applied and enforced."*

### The Core Problem: Context Rot

When Claude Code runs for 30+ minutes, context fills up and auto-compacts. After compaction:
- Claude forgets WHY decisions were made
- Loses track of overall architecture
- Repeats mistakes already fixed
- *"The art went away and it was just frustration"* — Community feedback

**The Antidote**: Persistent project knowledge that survives compaction:
1. **CLAUDE.md** — Always in context, always current
2. **Module descriptions** — In-file documentation Claude reads every time
3. **Skills** — Reusable patterns that don't need re-explaining

### The Solution

A desktop application that:
1. **Analyzes** your project automatically (or guides manual setup for new projects)
2. **Generates** CLAUDE.md, module docs, and skills
3. **Enforces** documentation standards continuously
4. **Monitors** context health and MCP overhead
5. **Prevents** context rot through persistent knowledge

---

## Table of Contents

1. [Product Architecture](#part-1-product-architecture)
2. [Onboarding Flow](#part-2-onboarding-flow)
3. [Main Application Interface](#part-3-main-application-interface)
4. [Context Rot Prevention System](#part-4-context-rot-prevention-system)
5. [Core Engine Specifications](#part-5-core-engine-specifications)
6. [Data Models](#part-6-data-models)
7. [Tauri Commands (IPC)](#part-7-tauri-commands-ipc)
8. [Implementation Roadmap](#part-8-implementation-roadmap)
9. [Mobile Companion](#part-9-mobile-companion)
10. [Pricing & Metrics](#part-10-pricing-and-metrics)

---

## Part 1: Product Architecture

### 1.1 System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLAUDE CODE COPILOT                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                        DESKTOP APP (Tauri 2.0)                        │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐   │ │
│  │  │    React UI     │  │    Tauri IPC    │  │     Rust Core       │   │ │
│  │  │   (Frontend)    │◄─►│    (Bridge)     │◄─►│    (Backend)        │   │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────┘   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│                                    ▼                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                          CORE ENGINE (Rust)                           │ │
│  │                                                                       │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │ │
│  │  │   Project   │ │  CLAUDE.md  │ │   Module    │ │    Skill    │    │ │
│  │  │   Scanner   │ │   Manager   │ │  Doc Manager│ │   Engine    │    │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │ │
│  │                                                                       │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │ │
│  │  │    File     │ │   Context   │ │   Health    │ │     AI      │    │ │
│  │  │   Watcher   │ │   Monitor   │ │   Scorer    │ │   Client    │    │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │ │
│  │                                                                       │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │ │
│  │  │   RALPH     │ │  Freshness  │ │     MCP     │ │ Enforcement │    │ │
│  │  │   Manager   │ │  Detector   │ │  Optimizer  │ │   Engine    │    │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │ │
│  │                                                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│                ┌───────────────────┼───────────────────┐                   │
│                ▼                   ▼                   ▼                   │
│   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐        │
│   │   File System   │   │   Claude Code   │   │   Claude API    │        │
│   │   (Projects)    │   │    (Process)    │   │  (Generation)   │        │
│   └─────────────────┘   └─────────────────┘   └─────────────────┘        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Choices

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **App Framework** | Tauri 2.0 | Small bundle (~10MB vs Electron's 150MB+), fast startup, native feel |
| **Frontend** | React 18 + TypeScript | Ecosystem, component libraries, hiring pool |
| **UI Components** | shadcn/ui + Tailwind | Modern, customizable, consistent |
| **State Management** | Zustand | Simple, performant, TypeScript-friendly |
| **Backend** | Rust | Performance for file watching, parsing, analysis |
| **Database** | SQLite (rusqlite) | Local-first, no server dependency |
| **IPC** | Tauri Commands | Type-safe frontend ↔ backend communication |
| **File Watching** | notify-rs | Cross-platform, efficient, debounced |
| **Markdown** | pulldown-cmark | Fast Rust markdown parser |
| **Code Parsing** | tree-sitter | Language-aware AST parsing for doc detection |
| **AI Integration** | Anthropic API | Generate descriptions, skills, CLAUDE.md |

### 1.3 Directory Structure

```
claude-code-copilot/
├── src-tauri/                      # Rust backend
│   ├── src/
│   │   ├── main.rs                # Entry point
│   │   ├── commands/              # Tauri IPC commands
│   │   │   ├── mod.rs
│   │   │   ├── project.rs         # Project management
│   │   │   ├── onboarding.rs      # Setup wizard
│   │   │   ├── claude_md.rs       # CLAUDE.md operations
│   │   │   ├── modules.rs         # Module documentation
│   │   │   ├── freshness.rs       # Doc freshness detection
│   │   │   ├── skills.rs          # Skills management
│   │   │   ├── ralph.rs           # RALPH loop control
│   │   │   ├── context.rs         # Context health
│   │   │   └── enforcement.rs     # Git hooks, CI
│   │   ├── core/                  # Core engine
│   │   │   ├── mod.rs
│   │   │   ├── scanner.rs         # Project scanner/detector
│   │   │   ├── watcher.rs         # File system watcher
│   │   │   ├── analyzer.rs        # Code analyzer (tree-sitter)
│   │   │   ├── generator.rs       # AI-powered generation
│   │   │   ├── freshness.rs       # Staleness detection
│   │   │   ├── health.rs          # Health score calculator
│   │   │   └── config.rs          # Configuration management
│   │   ├── models/                # Data models
│   │   └── db/                    # Database layer
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── src/                            # React frontend
│   ├── components/
│   │   ├── ui/                    # shadcn components
│   │   ├── layout/                # Sidebar, MainPanel, StatusBar
│   │   ├── onboarding/            # Setup wizard screens
│   │   ├── dashboard/             # Health, QuickWins, Alerts
│   │   ├── claude-md/             # Editor, Preview, Suggestions
│   │   ├── modules/               # FileTree, DocStatus, BatchGen
│   │   ├── skills/                # SkillsList, Editor, Patterns
│   │   ├── ralph/                 # CommandCenter, Analyzer, Monitor
│   │   ├── context/               # HealthMonitor, TokenBreakdown, MCP
│   │   └── enforcement/           # GitHooks, CI, Alerts
│   ├── hooks/
│   ├── stores/
│   ├── lib/
│   ├── App.tsx
│   └── main.tsx
│
├── package.json
└── README.md
```

---

## Part 2: Onboarding Flow

### 2.1 Decision Tree

```
                          User adds project folder
                                    │
                                    ▼
                      ┌─────────────────────────┐
                      │    Scan for signals     │
                      │  (package.json, etc.)   │
                      └────────────┬────────────┘
                                   │
                ┌──────────────────┴──────────────────┐
                │                                     │
                ▼                                     ▼
       ┌───────────────┐                     ┌───────────────┐
       │ Signals found │                     │ Empty/minimal │
       │(existing proj)│                     │ (new project) │
       └───────┬───────┘                     └───────┬───────┘
               │                                     │
               ▼                                     ▼
       ┌───────────────┐                     ┌───────────────┐
       │  Auto-detect  │                     │ Guided manual │
       │ + Confirm/Edit│                     │    wizard     │
       └───────┬───────┘                     └───────┬───────┘
               │                                     │
               └──────────────────┬──────────────────┘
                                  │
                                  ▼
                      ┌─────────────────────────┐
                      │   Select goals & prefs  │
                      └────────────┬────────────┘
                                   │
                                   ▼
                      ┌─────────────────────────┐
                      │   Review & Generate     │
                      └────────────┬────────────┘
                                   │
                                   ▼
                      ┌─────────────────────────┐
                      │      Dashboard          │
                      └─────────────────────────┘
```

### 2.2 Onboarding Screens

**Screen 1: Welcome / Add Project**
- Drop folder or click to browse
- Works with existing projects OR empty folders

**Screen 2a: Existing Project - Analysis Results**
- Shows auto-detected: Language, Framework, Database, Testing, Styling
- Each field is a dropdown (editable)
- "✓ Auto-detected" indicator
- Manual fields: Project Type, Description, Team Size

**Screen 2b: New/Empty Project - Guided Setup**
- Project name & description
- Project type selector (Web App, API, Mobile, CLI, etc.)
- Visual cards for selection

**Screen 3: Tech Stack Selection (for new projects)**
- Language grid (TypeScript, Python, Dart, Rust, Go, etc.)
- Framework options (based on language)
- Visual card selection

**Screen 4: Additional Options**
- Database selection (Postgres, MongoDB, Supabase, Firebase, etc.)
- ORM dropdown
- Testing frameworks
- Styling approach

**Screen 5: Goals & Preferences**
- Checkbox list of goals:
  - ☑ Writing new features faster → Creates generators
  - ☑ Writing tests → Creates test-agent
  - ☐ Code reviews → Creates code-reviewer
  - ☐ Refactoring → Creates refactor-agent
  - ☐ Debugging → Creates debug-agent
  - ☑ Documentation → Creates docs-agent
- Context rot prevention options:
  - ☑ Generate module documentation for all files
  - ☑ Set up documentation enforcement

**Screen 6: Review & Generate**
- Project summary
- "What We'll Create" list
- Estimated health score
- [Create Everything] button

**Screen 7: Generation Progress**
- Animated progress bar
- Checkmarks for completed items
- Current item being generated

**Screen 8: Success → Dashboard**
- "Project configured successfully!"
- Health score display
- Next steps guide
- Immediate access to all features

---

## Part 3: Main Application Interface

### 3.1 Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🛡️ Claude Code Copilot                                    ─ □ ✕        │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌───────┬───────────────────────────────────────────────────────────┐  │
│ │       │  [Project Selector ▼]          Health: 85/100 █████████░  │  │
│ │ SIDE  ├───────────────────────────────────────────────────────────┤  │
│ │ BAR   │                                                           │  │
│ │       │                    MAIN CONTENT AREA                      │  │
│ │       │                                                           │  │
│ │       │         (Changes based on sidebar selection)              │  │
│ │       │                                                           │  │
│ └───────┴───────────────────────────────────────────────────────────┘  │
│ ┌───────────────────────────────────────────────────────────────────┐  │
│ │ 🧠 Context: 72% │ 💰 $3.20 │ ⏱️ 45m │ 🔄 RALPH: Idle │ ● Connected │  │
│ └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Sidebar Navigation

- **Dashboard** — Overview, health score, quick wins, alerts
- **CLAUDE.md** — Editor with live preview, suggestions
- **Modules** — File tree, documentation status, batch generation
  - Badge shows outdated count
- **Skills** — Workshop, pattern detection, analytics
- **RALPH** — Command center, prompt analyzer, loop monitor
- **Context** — Health monitor, token breakdown, MCP optimizer
- **Enforcement** — Git hooks, CI setup, real-time alerts
- **Settings**
- **Help**

### 3.3 Dashboard Features

1. **Health Score Card**
   - Overall score (0-100)
   - Component breakdown (CLAUDE.md, Modules, Freshness, Skills, Context, Enforcement)
   - Visual progress bars

2. **Context Rot Alert** (if applicable)
   - Lists files with outdated documentation
   - [Update All Docs] [Review Each] [Dismiss]

3. **Quick Wins**
   - Prioritized list of improvements
   - Points impact shown
   - One-click fix buttons

4. **Recent Activity**
   - Timeline of changes, generations, alerts

### 3.4 CLAUDE.md Editor

- Split view: Editor | Preview
- Preview shows "Claude's Understanding"
- Token count display
- Freshness indicator
- Suggestions panel with one-click additions
- Auto-update from project detection

### 3.5 Module Documentation

- File tree with status icons (✅ Current, ⚠️ Outdated, ❌ Missing)
- Selected file shows:
  - Current documentation
  - Detected changes (for outdated)
  - Suggested update
- Batch operations:
  - Select all missing
  - Select all outdated
  - Generate selected

### 3.6 Skills Workshop

- Skills list (Project, Installed, Suggested)
- Skill editor with markdown support
- Pattern detector showing repeated request types
- Analytics: usage count, token savings

### 3.7 RALPH Command Center

- Prompt input with quality analyzer
- Auto-enhance button
- Safety settings panel
- Loop monitor for active/recent loops

### 3.8 Context Health

- Token usage visualization
- Breakdown chart (Conversation, Code, MCP, Skills)
- MCP server list with recommendations
- Persistent knowledge summary
- Checkpoint management

### 3.9 Enforcement

- Git hooks status and configuration
- CI integration snippets
- Real-time monitoring settings
- Event log

---

## Part 4: Context Rot Prevention System

### 4.1 The Problem

Context compaction causes Claude to lose:
- Why decisions were made
- Overall architecture understanding
- Previous mistakes and their fixes
- Project-specific patterns and conventions

### 4.2 The Solution: Persistent Knowledge

**What survives compaction:**
1. System prompt
2. CLAUDE.md
3. Recent conversation
4. Currently open files (including their doc headers)

**Our job:** Keep CLAUDE.md and module docs fresh and complete.

### 4.3 Module Documentation Standard

```typescript
/**
 * @module [path/from/src]
 * @description [One-line description]
 * 
 * PURPOSE:
 * - [Responsibility #1]
 * - [Responsibility #2]
 * 
 * DEPENDENCIES:
 * - [path] - [why needed]
 * 
 * EXPORTS:
 * - [name] - [description]
 * 
 * PATTERNS:
 * - [Usage patterns]
 * 
 * CLAUDE NOTES:
 * - [Important reminders for Claude]
 */
```

### 4.4 Freshness Detection

**Staleness signals:**
| Signal | Weight | Detection Method |
|--------|--------|------------------|
| Code modified after docs | High | Timestamps |
| New exports not documented | High | AST comparison |
| Removed exports still in docs | High | AST comparison |
| Import changes | Medium | Import diff |
| Function signatures changed | Medium | AST comparison |
| File renamed/moved | High | Git history |

### 4.5 Enforcement Layers

1. **Visibility** — Dashboard shows coverage and freshness %
2. **Real-time Alerts** — Desktop notifications when staleness detected
3. **Git Hooks** — Block/warn on undocumented or stale files
4. **CI Integration** — PR checks for documentation coverage

---

## Part 5: Core Engine Specifications

### 5.1 Project Scanner
- Detects language from config files (high confidence)
- Analyzes dependencies (medium confidence)
- Counts file extensions (low confidence)
- Returns `DetectionResult` with confidence levels

### 5.2 File Watcher
- Uses notify-rs for cross-platform watching
- Debounces rapid changes
- Emits events: Created, Modified, Deleted, Renamed
- Special handling for CLAUDE.md and skills

### 5.3 Freshness Detector
- Uses tree-sitter for AST parsing
- Compares documented vs actual exports/imports
- Calculates staleness probability
- Tracks history for trend analysis

### 5.4 CLAUDE.md Manager
- Parses and analyzes existing CLAUDE.md
- Generates new CLAUDE.md from project analysis
- Suggests updates based on file changes
- Tracks token count

### 5.5 Module Doc Manager
- Scans all source files for doc headers
- Generates documentation using AI
- Applies documentation to files
- Tracks coverage statistics

### 5.6 Health Score Calculator

**Weights:**
| Component | Weight | Criteria |
|-----------|--------|----------|
| CLAUDE.md | 25% | Exists, complete, fresh |
| Module Docs | 25% | Coverage % |
| Doc Freshness | 15% | % current (not stale) |
| Skills | 15% | Pattern coverage |
| Context Efficiency | 10% | MCP overhead |
| Enforcement | 10% | Hooks/CI configured |

---

## Part 6: Data Models

### 6.1 Key Types

```typescript
// Project Setup (from onboarding)
interface ProjectSetup {
  path: string;
  name: string;
  description: string;
  projectType: ProjectType;
  language: Language;
  framework: string | null;
  database: Database | null;
  goals: Goal[];
  generateModuleDocs: boolean;
  setupEnforcement: boolean;
}

// Detection Result
interface DetectionResult {
  confidence: 'high' | 'medium' | 'low' | 'none';
  language: DetectedValue<Language> | null;
  framework: DetectedValue<string> | null;
  // ... other detected values
  fileCount: number;
  hasExistingClaudeMd: boolean;
}

// Health Score
interface HealthScore {
  total: number;
  components: HealthComponents;
  quickWins: QuickWin[];
  contextRotRisk: 'low' | 'medium' | 'high';
}

// Module Status
interface ModuleStatus {
  path: string;
  status: 'current' | 'outdated' | 'missing';
  freshnessScore: number;
  changes?: string[];
  suggestedDoc?: ModuleDoc;
}

// Context Health
interface ContextHealth {
  totalTokens: number;
  usagePercent: number;
  breakdown: TokenBreakdown;
  mcpServers: McpServerStatus[];
  rotRisk: 'low' | 'medium' | 'high';
}
```

### 6.2 Database Tables

- `projects` — Project metadata and health scores
- `module_docs` — Documentation status per file
- `freshness_history` — Staleness tracking over time
- `skills` — User and project skills
- `patterns` — Detected request patterns
- `ralph_loops` — RALPH loop history
- `checkpoints` — Context checkpoints
- `enforcement_events` — Hook blocks, warnings
- `settings` — User preferences

---

## Part 7: Tauri Commands (IPC)

### Command Groups

1. **Onboarding**: `scan_project`, `generate_project_config`
2. **Project**: `list_projects`, `add_project`, `get_project_health`
3. **CLAUDE.md**: `analyze_claude_md`, `generate_claude_md`, `auto_update_claude_md`
4. **Modules**: `scan_modules`, `get_stale_files`, `generate_module_doc`, `batch_generate_docs`
5. **Skills**: `list_skills`, `create_skill`, `detect_patterns`
6. **RALPH**: `analyze_ralph_prompt`, `start_ralph_loop`, `pause_ralph_loop`
7. **Context**: `get_context_health`, `get_mcp_status`, `create_checkpoint`
8. **Enforcement**: `install_git_hooks`, `get_enforcement_events`

---

## Part 8: Implementation Roadmap

| Phase | Weeks | Focus |
|-------|-------|-------|
| 1 | 1-2 | Foundation: Tauri, React, SQLite, layout |
| 2 | 3-4 | Onboarding & Detection |
| 3 | 5-6 | CLAUDE.md Manager |
| 4 | 7-8 | Module Documentation - Core |
| 5 | 9-10 | Freshness Detection |
| 6 | 11-12 | Skills Workshop |
| 7 | 13-14 | RALPH Command Center |
| 8 | 15-16 | Context Health & MCP |
| 9 | 17-18 | Enforcement |
| 10 | 19-20 | Polish & Launch |

**Total: 20 weeks to v1.0**

---

## Part 9: Mobile Companion

### Features (MVP)
- Project health scores (read-only)
- Documentation coverage alerts
- RALPH loop status
- Push notifications
- Emergency stop

### Technology
- React Native or Flutter
- WebSocket connection to desktop
- FCM/APNS for push

### Timeline
- After desktop v1.0 stable
- Estimated: 4-6 weeks

---

## Part 10: Pricing and Metrics

### Pricing

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0 | 1 project, basic health, 10 AI generations/month |
| **Pro** | $19/mo | Unlimited projects, full features, enforcement |
| **Team** | $29/user/mo | + Shared skills, team dashboards, SSO |

### Success Metrics

**User:** Projects added, health improvement, coverage improvement
**Product:** DAU/WAU, feature adoption, RALPH completions
**Business:** Free→Pro conversion, churn, NPS
**Quality:** Crash rate, AI accuracy, false positive rate

---

## Appendix A: Development Standards - Self-Documentation

### The Irony
We're building an app that enforces documentation for users. We MUST follow the same standards ourselves.

### Rule: Every Module Gets a Header

Every `.ts`, `.tsx`, `.rs` file in this project MUST have a documentation header. This is non-negotiable because:
1. These headers survive context compaction
2. They help Claude understand the codebase across sessions
3. We're dogfooding our own product

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
 * 
 * PATTERNS:
 * - [How this module should be used]
 * 
 * CLAUDE NOTES:
 * - [Important things to remember about this module]
 * - [Common mistakes to avoid]
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
//!
//! CLAUDE NOTES:
//! - [Important context]
```

### When to Update Documentation

**ALWAYS update the module documentation when you:**
1. Add a new export (function, component, type, struct)
2. Remove an export
3. Change function signatures
4. Add or remove dependencies/imports
5. Change the module's purpose or responsibilities
6. Fix a bug that reveals important behavior

### Documentation Update Checklist

Before finishing any file modification:
- [ ] Does the @description still accurately describe the module?
- [ ] Are all current exports listed?
- [ ] Are removed exports deleted from the docs?
- [ ] Are new dependencies documented?
- [ ] Are CLAUDE NOTES still accurate?

### Enforcement During Development

When working on this project with Claude Code:
1. Claude will add headers to all new files
2. Claude will update headers when modifying files
3. If Claude forgets, remind it: "Update the module documentation"

### Self-Hosting (Dogfooding)

Once v1.0 is complete, we will use Claude Code Copilot on its own codebase to:
- Monitor our documentation coverage
- Detect stale documentation
- Enforce via git hooks

This is the ultimate dogfooding.

---

## Appendix B: Feature Summary

### Core Features
- ✅ Project auto-detection (language, framework, database)
- ✅ Manual setup wizard for new projects
- ✅ CLAUDE.md generation and management
- ✅ Module documentation generation
- ✅ Documentation freshness detection
- ✅ Health score dashboard
- ✅ Quick wins recommendations

### Advanced Features
- ✅ Skills workshop with pattern detection
- ✅ RALPH command center with prompt analysis
- ✅ Context health monitoring
- ✅ MCP overhead optimization
- ✅ Git hook enforcement
- ✅ Real-time file watching and alerts

### Integrations
- ✅ Claude API for AI generation
- ✅ Git/Husky for pre-commit hooks
- ✅ GitHub Actions / GitLab CI templates

---

*Document Version: 2.0*
*Last Updated: January 27, 2026*
