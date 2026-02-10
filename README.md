# Project Jumpstart

A desktop application that helps you apply Claude Code best practices to your projects in minutes. Prevent context rot with persistent documentation.

![macOS](https://img.shields.io/badge/macOS-11%2B-blue)
![Tauri](https://img.shields.io/badge/Tauri-2.0-orange)
![License](https://img.shields.io/badge/license-MIT-green)

## What is Context Rot?

When working with Claude Code, context gets lost after ~30 minutes of conversation. Your carefully explained project structure, conventions, and decisions disappear. You start over, re-explaining the same things.

**Project Jumpstart solves this** by generating persistent documentation that Claude reads every time it opens a file.

## Key Features

- **CLAUDE.md Generation & Editing** — Automatically generates a comprehensive CLAUDE.md file tailored to your project's tech stack, with a live editor, markdown preview, and AI-powered section suggestions to keep your project memory sharp.

- **Project Kickstart** — Bootstraps brand-new or undocumented projects from scratch, generating foundational documentation, folder structure guidance, and starter prompts so Claude Code is productive from the very first session.

- **Context Rot Prevention** — Continuously monitors documentation freshness with staleness detection, health scoring, and context rot alerts so your project docs never silently drift out of date.

- **Module Documentation Engine** — Scans your codebase with tree-sitter AST analysis, identifies undocumented files, and batch-generates standardized documentation headers that survive context compaction across long sessions.

- **Skills & Agents Workshop** — Create, manage, and discover reusable Skills (repeatable prompts) and Agents (specialized personas) from curated libraries, with relevance scoring that recommends the right tools for your project.

- **Team Templates & Deploy** — Choose from 8 pre-built multi-agent team configurations (leader, pipeline, parallel, swarm, council patterns) and deploy them as paste-ready prompts, shell scripts, or config directories personalized to your tech stack.

- **TDD Workflow & Test Plans** — Organize test plans with coverage goals, manage individual test cases by priority and type, and follow a guided Red-Green-Refactor workflow with auto-detected test frameworks and AI-generated test suggestions.

- **Enforcement & Git Hooks** — Install git hooks that enforce documentation standards at commit time, with four modes from gentle warnings to fully automatic AI-powered doc generation, ensuring every commit keeps your project context intact.

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
