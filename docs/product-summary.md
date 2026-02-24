# Project Jumpstart — Product Summary

## What It Is

Project Jumpstart is a desktop application that prevents **context rot** — the gradual decay of project documentation, conventions, and institutional knowledge that happens as codebases evolve. Built with Tauri 2.0 (Rust + React), it ships as a lightweight ~7MB native app for macOS and Windows. It integrates deeply with Claude Code to keep `CLAUDE.md` files, module documentation, test plans, and team workflows fresh, accurate, and actionable.

## The Problem: Context Rot

Every development team hits the same wall:

- **Documentation drifts** from reality within weeks of being written
- **New sessions start cold** — developers (and AI assistants) waste time re-discovering project conventions
- **Tribal knowledge lives in people's heads**, not in the codebase
- **AI assistants hallucinate** when their context files are stale or incomplete
- **Team patterns go undocumented** — the same mistakes repeat across sessions

Context rot is invisible until it causes real damage: wrong assumptions, duplicated work, broken conventions, and AI-generated code that doesn't match your project's patterns.

Project Jumpstart makes context rot a solved problem.

---

## Feature Inventory

### Core

#### 1. Dashboard
The command center showing project health at a glance.

- **Health Score** — 0–100 composite rating across 8 components (documentation coverage, freshness, test coverage, CLAUDE.md quality, enforcement, skill usage, context health, performance)
- **Context Rot Alert** — Lists files with outdated documentation, prioritized by impact
- **Quick Wins** — Ranked improvement actions with estimated points impact
- **Recent Activity** — Timeline of generations, scans, and edits
- **Session Handoff Hero Card** — AI-powered snapshot of your last session with summary, pending items, and next steps
- **Smart Next Step** — Contextual recommendation for what to work on

#### 2. CLAUDE.md Editor
Split-pane editor for your project's primary AI context file.

- **Live preview** with real-time rendering
- **Token count** display (know your context budget)
- **Freshness indicator** — Is this file current?
- **AI suggestions panel** — Improvements based on project analysis
- **One-click generation** from project scan data
- **@import directive support** — Reference rules and skills files

#### 3. Module Documentation
Automated file-level documentation management across your entire codebase.

- **File tree with status icons** — Current, Outdated, Missing at a glance
- **AI-powered doc generation** — Understands your code's purpose, exports, dependencies, and patterns
- **Template fallback** — Works without an API key using smart templates
- **Batch operations** — Generate docs for all missing/outdated files at once
- **Doc application** — Writes formatted headers directly into source files
- **Project Kickstart** — Bootstrap documentation for brand-new projects

### Development

#### 4. Test Plans & TDD
Full test management with integrated TDD workflow support.

- **Test plan CRUD** — Create, organize, and track test plans per project
- **Test case management** — Create cases with type, priority, and status filtering
- **TDD workflow** — Guided Red/Green/Refactor phases with session tracking
- **Test framework auto-detection** — Discovers your test runner and counts existing tests
- **AI-powered test suggestions** — Generate test cases from code analysis
- **Test staleness detection** — Flags tests that haven't been updated since their source changed
- **Test run execution and history** — Track pass/fail rates over time
- **Subagent config generation** — Export test-runner agent configurations
- **PostToolUse hooks config** — Auto-run tests after code changes

#### 5. Skills Workshop
Create, manage, and discover reusable prompt patterns for Claude Code.

- **Skill editor** with markdown support
- **Pattern detection** — Analyzes your project for recurring patterns worth capturing
- **Skill library** — Browse and install pre-built skills
- **Usage analytics** — Track token savings and invocation counts
- **Export to `.claude/skills/`** — YAML frontmatter format for Claude Code native loading
- **Categories** — Project-specific, installed, and suggested skills

#### 6. Agents
Build and manage specialized AI agents for complex multi-step tasks.

- **Agent editor** — Define instructions, tools, workflows, and trigger patterns
- **Agent library** with categories (code review, testing, documentation, deployment, etc.)
- **AI-powered instruction enhancement** — Refine agent prompts via Claude API
- **Tier system** — Basic, Standard, Advanced complexity levels
- **Usage analytics** and invocation tracking
- **Export to `.claude/agents/`** — Markdown format with YAML frontmatter

#### 7. Team Templates
Pre-configured multi-agent team compositions for common workflows.

- **5 orchestration patterns** — Leader-led, Pipeline, Parallel, Swarm, Council
- **Template library** — Browse by pattern and use case
- **Deploy with paste-ready prompts** — Copy directly into Claude Code
- **Project context personalization** — Auto-substitutes your tech stack, test commands, and conventions
- **Custom template creation** — Design your own team compositions
- **Hooks section rendering** — Generates JSON hook configurations

#### 8. RALPH (Review, Analyze, List, Plan, Handoff)
Iterative prompt quality analysis and refinement engine.

- **Heuristic scoring** — Clarity, specificity, context, and scope analysis (no API key needed)
- **AI-powered enhancement** — Deep prompt analysis via Claude API
- **Loop execution** — Start, pause, resume, and kill analysis loops
- **Iterative refinement** — Extracts issues and suggests improvements across rounds
- **Mistake recording** — Log errors for pattern learning
- **CLAUDE.md pattern injection** — Push discovered patterns directly into your context file

#### 9. Performance Engineering
Full-stack performance analysis with AI-powered remediation.

- **Code analysis** — Identifies performance anti-patterns in source files
- **Architecture analysis** — Reviews structure for scalability issues
- **Performance scoring** — Composite score across 8 component types
- **Issue severity ranking** — Critical, high, medium, low prioritization
- **AI per-file remediation** — Generates targeted fixes for each issue
- **Batch remediation** — Fix multiple files with progress tracking and cancellation

### Monitoring

#### 10. Claude Memory
Manage and leverage extracted learnings from Claude Code sessions.

- **Memory dashboard** — Health metrics for your knowledge base
- **Learning browser** — Browse, filter, and manage extracted insights
- **CLAUDE.md analyzer** — Quality scoring with actionable improvement suggestions
- **Test staleness alerts** — Detects when tests lag behind source changes
- **Learning lifecycle** — Active, verified, deprecated, archived statuses
- **Learning promotion** — Move insights to CLAUDE.md or rules files
- **Memory source discovery** — Visualizes all context sources (CLAUDE.md, rules, skills, hooks)

#### 11. Context Health
Monitor and optimize your Claude Code context window usage.

- **Token usage visualization** — See how much context budget you're using
- **Token breakdown chart** — Conversation, code, MCP servers, skills
- **MCP server overhead detection** — Identifies expensive tool servers
- **Context rot risk assessment** — Low/medium/high with explanations
- **Context checkpoints** — Save and restore context snapshots
- **MCP recommendations** — Suggestions for reducing context overhead

### Setup

#### 12. Enforcement (Git Hooks & CI)
Automated documentation quality gates at commit time.

- **Pre-commit hook installation** — One-click setup
- **Three enforcement modes** — Block (reject commit), Warn (allow with notice), Auto-update (fix and commit)
- **Self-healing hooks** — Automatic recovery from corruption with health tracking
- **Version management** — Detect outdated hooks and upgrade
- **CI integration templates** — GitHub Actions and GitLab CI snippets
- **Event logging** — Track all enforcement actions
- **Hook health monitoring** — Consecutive failure tracking with auto-downgrade after 3 failures

#### 13. Settings
Application configuration and API key management.

- **Anthropic API key** — Encrypted storage with validation testing
- **Model selection** — Choose which Claude model to use
- **Hook mode configuration** — Block, warn, or auto-update
- **File watcher settings** — Configure real-time monitoring
- **Graceful fallback** — All features work without an API key (heuristic mode)

#### 14. Help
Contextual guidance for every section.

- **Page-specific help** — Each section has tailored concepts and tips
- **Key terminology** — Definitions for context rot, freshness, health score, etc.
- **Getting started workflows** — Actionable steps for each feature

### Special Features

#### Session Handoff (Smart Context Injection)
Zero-ramp-up session starts powered by AI transcript analysis.

- **AI-powered snapshot capture** — Summarizes what happened, what's pending, and what's next
- **SessionStart hook** — Automatically injects previous session context
- **Git state detection** — Captures branch, modified files, and dirty status
- **One-click hook installation** — Register the handoff hook from the dashboard

#### Onboarding Flow
Guided project setup with intelligent detection.

- **Project scanning** — Auto-detects language, framework, database, testing, and styling
- **Tech stack selection** — Visual cards for choosing your stack
- **Goals and preferences** — Writing features, tests, docs, code review, debugging, refactoring
- **CLAUDE.md generation** — Creates a comprehensive context file from your selections
- **Health score baseline** — Shows your starting point after setup
- **Empty project support** — Kickstart workflow for new codebases

#### Memory Hooks (Claude Code Integration)
Four lifecycle hooks that keep your knowledge base fresh.

- **SessionEnd: Learning Extraction** — Extracts insights from transcripts with semantic deduplication
- **SessionEnd: Test Staleness** — Detects when tests haven't kept up with source changes
- **PreCompact: Context Backup** — Saves critical context before Claude Code compacts the conversation
- **SessionStart: Session Handoff** — Injects previous session context for continuity

#### File Watcher
Real-time documentation monitoring.

- **Filesystem monitoring** — Watches for changes with 500ms debounce
- **Auto-refresh** — Updates dashboard and freshness on file changes
- **CLAUDE.md tracking** — Special handling for context file modifications

#### Freshness Engine
Documentation staleness detection at file and project level.

- **Change detection** — New exports, removed exports, signature changes, import changes
- **Single-file freshness** — Check any file's documentation currency
- **Project-wide scanning** — Find all stale files across the codebase

---

## User Segments & Value Propositions

### Solo Developers Using Claude Code

**Central Pitch**: Stop re-explaining your project to Claude every session. Jumpstart keeps your context files fresh so Claude always knows your codebase.

**Top 5 Features**:
1. **Session Handoff** — Every new session starts with full context of what you did last time
2. **CLAUDE.md Editor** — Keep your primary context file accurate with token budget awareness
3. **Module Documentation** — Auto-generate file headers so Claude understands your code structure
4. **Skills Workshop** — Capture your recurring patterns as reusable skills
5. **Health Score Dashboard** — One number tells you if your project context is healthy

**Example Workflow**:
1. Open Jumpstart, see health score dropped to 72 (was 85 last week)
2. Dashboard shows 3 files have outdated docs after yesterday's refactor
3. Click "Quick Wins" → batch-regenerate docs for stale files
4. Health score recovers to 88
5. Start a new Claude Code session — the SessionStart hook injects your last session's context, pending items, and suggested next steps automatically

### Team Leads & Engineering Managers

**Central Pitch**: Standardize how your team works with AI. Deploy consistent agent teams, enforce documentation standards, and ensure every developer's Claude sessions build on shared knowledge.

**Top 5 Features**:
1. **Team Templates** — Deploy pre-configured multi-agent teams with one paste
2. **Enforcement (Git Hooks)** — Block commits with missing or stale documentation
3. **RALPH** — Review prompt quality before expensive AI operations
4. **Agents Library** — Standardize code review, testing, and deployment agents across the team
5. **Performance Engineering** — Catch architectural issues before they ship

**Example Workflow**:
1. Create a "Code Review Pipeline" team template with Leader, Reviewer, and Test-Writer agents
2. Deploy it across your team — each developer gets a paste-ready prompt personalized to their project's stack
3. Set enforcement to "auto-update" mode — stale docs get fixed automatically at commit time
4. Use RALPH to refine your team's common prompts for clarity and specificity
5. Weekly: check Performance Engineering for codebase-wide anti-patterns

### Enterprise & Compliance-Oriented Teams

**Central Pitch**: Auditable documentation enforcement with self-healing hooks and CI integration. Every file is documented, every change is tracked, every convention is enforced.

**Top 5 Features**:
1. **Enforcement with CI Integration** — GitHub Actions and GitLab CI templates for pipeline-level enforcement
2. **Self-Healing Git Hooks** — Hooks recover from corruption automatically, with health monitoring and auto-downgrade
3. **Context Health Monitoring** — Track MCP server overhead and context window usage across the team
4. **Memory Management** — Extracted learnings are preserved, deduplicated, and promoted to shared docs
5. **Test Plans & TDD** — Formal test plans with case tracking, execution history, and coverage metrics

**Example Workflow**:
1. Install pre-commit hooks across all repositories (one-click per project)
2. Set mode to "block" — no commit goes through without current documentation
3. Add CI snippet to GitHub Actions — pull requests are checked for doc freshness
4. Hook health dashboard shows all hooks are green; auto-downgrade protects against false blocks
5. Quarterly: export Memory learnings to team wiki for onboarding new developers

### Open Source Maintainers

**Central Pitch**: Make your project contributor-friendly. Auto-generated documentation means new contributors understand your codebase immediately, and Jumpstart keeps it current as the code evolves.

**Top 5 Features**:
1. **Module Documentation (Batch)** — Generate docs for your entire codebase in one operation
2. **CLAUDE.md Generation** — Create a comprehensive AI-friendly project context file from a scan
3. **Freshness Engine** — Know exactly which docs are stale after a release
4. **Skills Workshop** — Document your project's patterns so contributors (and their AI tools) follow conventions
5. **Project Kickstart** — Bootstrap documentation for new projects or major refactors

**Example Workflow**:
1. Run module scan — see that 40% of files have no doc headers
2. Batch-generate docs for all missing files (AI-powered or template fallback)
3. Generate a CLAUDE.md from scan results — contributors' AI tools now understand your project
4. Export key patterns as skills — convention-following code from day one
5. After each release: re-scan for freshness, batch-update stale docs, commit

---

## Technical Specifications

| Spec | Detail |
|------|--------|
| **Framework** | Tauri 2.0 (Rust backend + React frontend) |
| **Frontend** | React 19.1 + TypeScript 5.8 + Vite 7.0 |
| **UI Library** | shadcn/ui + Tailwind CSS 4.0 |
| **State Management** | Zustand 5.0 |
| **Database** | SQLite via rusqlite 0.31 (bundled) |
| **AI Integration** | Anthropic Claude API (optional — all features have heuristic fallbacks) |
| **Package Manager** | pnpm |
| **Test Suite** | 1,470 tests (1,033 Vitest + 194 Cargo + 243 Playwright E2E) |
| **macOS Bundle** | ~7MB signed & notarized DMG |
| **Windows Bundle** | NSIS .exe + .msi installer |
| **IPC Commands** | 113 Tauri commands across 21 modules |
| **Core Engine** | 10 Rust modules (scanner, analyzer, generator, health, freshness, AI, performance, crypto, test runner, watcher) |
| **Frontend Components** | 155+ TypeScript/React files across 33 component directories |
| **Data Models** | 13 Rust model files, mirrored in TypeScript types |
| **Database Tables** | 20+ tables (projects, modules, skills, agents, templates, test plans, learnings, sessions, etc.) |
| **Lifecycle Hooks** | 4 (SessionStart, SessionEnd x2, PreCompact) |
| **Skills** | 4 built-in (tauri-patterns, tdd-workflow, team-templates, freshness-engine) |
| **Rules** | 5 always-loaded domain rules (documentation, testing, rust, react, database) |
| **Platform** | macOS (signed), Windows (unsigned beta) |
| **Encryption** | AES-GCM for API key storage |
| **File Watching** | notify-rs with 500ms debounce |
| **Parsing** | tree-sitter for language-aware AST analysis |
