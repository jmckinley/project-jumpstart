# Project Jumpstart

A desktop application that helps you apply Claude Code best practices to your projects in minutes. Prevent context rot with persistent documentation.

![macOS](https://img.shields.io/badge/macOS-11%2B-blue)
![Tauri](https://img.shields.io/badge/Tauri-2.0-orange)
![License](https://img.shields.io/badge/license-MIT-green)

## What is Context Rot?

When working with Claude Code, context gets lost after ~30 minutes of conversation. Your carefully explained project structure, conventions, and decisions disappear. You start over, re-explaining the same things.

**Project Jumpstart solves this** by generating persistent documentation that Claude reads every time it opens a file.

## Features

### Documentation
- **Auto-generate CLAUDE.md** - Project-level documentation that survives context loss
- **Module Documentation** - File headers with PURPOSE, EXPORTS, PATTERNS, and CLAUDE NOTES
- **Freshness Tracking** - Know when documentation is stale and needs updating

### One-Click Solutions
- **Skills from Patterns** - Detect code patterns and create comprehensive skills with one click
- **Suggested Agents** - Context-aware agent recommendations based on your tech stack
- **Git Enforcement** - One-click git init + auto-update hooks for doc enforcement

### AI-Powered Tools
- **Skills Library** - 50+ pre-built prompts for common tasks, scored by relevance
- **Agents Library** - Reusable agent configurations for specialized tasks
- **RALPH Loops** - Prompt optimization with Auto-Enhance for complex tasks

### Team Templates (New!)
- **8 Pre-Built Teams** - Full Stack Feature, TDD Pipeline, Code Review Council, and more
- **5 Orchestration Patterns** - Leader, Pipeline, Parallel, Swarm, Council
- **Deploy Output** - Generate paste-ready lead prompts, shell scripts, or config directories
- **Relevance Scoring** - Teams ranked by match with your project's tech stack
- **Customizable** - Save templates to your project and edit teammates, tasks, and hooks

### TDD Workflow & Test Plans
- **AI Test Generation** - One-click "Generate Tests" button analyzes your code and creates test cases
- **Test Cases Manager** - Filterable list with search, type, priority, and status filters
- **Framework Detection** - Auto-detects Vitest, Jest, Pytest, Cargo, Playwright, Mocha, Cypress
- **TDD Workflow** - Guided Red → Green → Refactor cycle with auto-generated prompts
- **Claude Code Integration** - Generate subagent configs and PostToolUse hooks for automated testing

### Claude Code Hooks
- **Session Learning Extraction** - Auto-extract preferences, solutions, patterns from conversations
- **CLAUDE.local.md** - Personal learnings accumulate over time (gitignored)
- **Deduplication** - Intelligent filtering to avoid duplicate learnings
- **Categorized Insights** - [Preference], [Solution], [Pattern], [Gotcha] tags

### User Experience
- **Per-Page Help** - Contextual ? icon on each page with concepts and tips
- **Auto-opens on first visit** - Learn features as you explore, stays closed after

### Monitoring
- **Context Health** - Track token usage and identify context bloat
- **Enforcement** - Git hooks (warn/block/auto-update) and CI snippets

## Download

Download the latest release for macOS:

**[Latest Release](https://github.com/jmckinley/project-jumpstart/releases/latest)** (macOS, Apple Silicon, signed and notarized)

### Installation

1. Download the DMG file
2. Open the DMG and drag "Project Jumpstart" to Applications
3. Launch the app (signed and notarized, no Gatekeeper issues)

For detailed usage of every feature, see the **[User Guide](docs/user-guide.md)**.

### Requirements

- macOS 11+ (Big Sur or later)
- Apple Silicon Mac (M1/M2/M3)
- Anthropic API key (required for AI-powered features)

## Getting Started

1. Launch the app - you'll see a welcome screen
2. Enter your Anthropic API key (strongly recommended)
3. Click "Get Started" and select a project folder
4. Follow the onboarding wizard to detect your tech stack
5. Generate your CLAUDE.md and module documentation

## Tech Stack Detection

Project Jumpstart automatically detects:

| Category | Detected Technologies |
|----------|----------------------|
| **Languages** | TypeScript, JavaScript, Python, Rust, Go, Java, Kotlin, Swift |
| **Frameworks** | React, Next.js, Vue, Angular, Svelte, Express, FastAPI, Django, Tauri, Electron |
| **Mobile** | Android, iOS, SwiftUI, Jetpack Compose |
| **Testing** | Vitest, Jest, Pytest, Playwright |
| **Styling** | Tailwind CSS, Sass/SCSS, CSS Modules |
| **Databases** | PostgreSQL, MySQL, SQLite, MongoDB, Supabase, Firebase, Prisma |

## Skills Library

50+ pre-built skills organized by category:

- **Code Review** - Grill Me on Changes, Two-Claude Review, Skeptical Review
- **Prompting Patterns** - Fresh Start Pattern, Prove It Works
- **Language Patterns** - TypeScript, Python, Rust, Go, Java, Kotlin, Swift idioms
- **UI/UX** - Accessibility, responsive design, loading states, form UX
- **Testing** - TDD workflow, unit/integration/E2E tests, framework detection, AI suggestions
- **Documentation** - Module headers, API docs, README generation
- **Database** - Supabase, Firebase, Prisma, Drizzle, MongoDB patterns

Skills are scored by relevance to your project's detected tech stack. Create custom skills from detected patterns with comprehensive templates.

## Development

### Prerequisites

- Node.js 18+
- pnpm
- Rust (for Tauri backend)

### Setup

```bash
# Clone the repo
git clone https://github.com/jmckinley/project-jumpstart.git
cd project-jumpstart

# Install dependencies
pnpm install

# Run in development mode
pnpm tauri dev

# Build for production
pnpm tauri build
```

### Project Structure

```
project-jumpstart/
├── src/                    # React frontend
│   ├── components/         # UI components by feature
│   │   ├── agents/         # Agent management & library
│   │   ├── team-templates/ # Team template library & deploy
│   │   ├── test-plans/     # TDD workflow & test management
│   │   ├── skills/         # Skills workshop & library
│   │   └── ...             # dashboard, claude-md, modules, etc.
│   ├── stores/             # Zustand state
│   ├── hooks/              # Custom hooks (all call Tauri backend)
│   ├── lib/                # Utilities & relevance scoring
│   ├── data/               # Static library data (skills, agents, teams)
│   └── types/              # TypeScript type definitions
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── commands/       # IPC handlers (15 modules)
│   │   ├── core/           # Business logic (scanner, AI, test runner)
│   │   ├── models/         # Data structures (serde)
│   │   └── db/             # SQLite schema & migrations
│   └── Cargo.toml
├── .claude/                # Claude Code configuration
│   ├── hooks/              # Session lifecycle hooks
│   │   └── extract-learnings.sh  # Auto-extract session learnings
│   └── settings.json       # Hook registrations
├── docs/                   # Documentation
│   └── user-guide.md       # User guide
├── CLAUDE.md               # Project documentation (team-shared)
└── CLAUDE.local.md         # Personal learnings (gitignored)
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Tauri 2.0 |
| Frontend | React 18 + TypeScript |
| UI | shadcn/ui + Tailwind CSS |
| State | Zustand |
| Backend | Rust |
| Database | SQLite (rusqlite) |
| AI | Anthropic Claude API |

## Contributing

Contributions are welcome! Please read the CLAUDE.md file for coding conventions and documentation requirements.

## License

MIT License - see LICENSE file for details.

## Feedback

Please report issues at: https://github.com/jmckinley/project-jumpstart-feedback/issues
