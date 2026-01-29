# Project Jumpstart

A desktop application that helps you apply Claude Code best practices to your projects in minutes. Prevent context rot with persistent documentation.

![macOS](https://img.shields.io/badge/macOS-11%2B-blue)
![Tauri](https://img.shields.io/badge/Tauri-2.0-orange)
![License](https://img.shields.io/badge/license-MIT-green)

## What is Context Rot?

When working with Claude Code, context gets lost after ~30 minutes of conversation. Your carefully explained project structure, conventions, and decisions disappear. You start over, re-explaining the same things.

**Project Jumpstart solves this** by generating persistent documentation that Claude reads every time it opens a file.

## Features

- **Auto-generate CLAUDE.md** - Project-level documentation that survives context loss
- **Module Documentation** - File headers with PURPOSE, EXPORTS, PATTERNS, and CLAUDE NOTES
- **Freshness Tracking** - Know when documentation is stale and needs updating
- **Skills Library** - 46+ pre-built prompts for common tasks, scored by relevance to your tech stack
- **Agents Library** - Reusable agent configurations for specialized tasks
- **RALPH Loops** - Prompt optimization for complex multi-step tasks
- **Context Health Monitor** - Track token usage and identify context bloat
- **Enforcement** - Git hooks and CI snippets to maintain documentation standards

## Download

Download the latest release for macOS:

**[Project Jumpstart v0.1.0-beta](https://github.com/jmckinley/project-jumpstart/releases/tag/v0.1.0-beta)** (11 MB, Universal Binary)

### Installation

1. Download the DMG file
2. Open the DMG and drag "Project Jumpstart" to Applications
3. **First launch**: Right-click the app → "Open" → "Open" (required for unsigned apps)

### Requirements

- macOS 11+ (Big Sur or later)
- Works on both Intel and Apple Silicon Macs
- Anthropic API key (strongly recommended for AI features)

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

46+ pre-built skills organized by category:

- **Language Patterns** - TypeScript, Python, Rust, Go, Java, Kotlin, Swift idioms
- **UI/UX** - Accessibility, responsive design, loading states, form UX, animations
- **Testing** - Unit tests, integration tests, E2E with Playwright
- **Documentation** - Module headers, API docs, README generation
- **Database** - Supabase, Firebase, Prisma, Drizzle, MongoDB patterns
- **And more...**

Skills are scored by relevance to your project's detected tech stack.

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
│   ├── components/         # UI components
│   ├── stores/             # Zustand state
│   ├── hooks/              # Custom hooks
│   ├── lib/                # Utilities
│   └── data/               # Skills/agents library
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── commands/       # IPC handlers
│   │   ├── core/           # Business logic
│   │   ├── models/         # Data structures
│   │   └── db/             # SQLite database
│   └── Cargo.toml
└── CLAUDE.md               # Project documentation
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

Please report issues at: https://github.com/jmckinley/project-jumpstart/issues
