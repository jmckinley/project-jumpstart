# Project Jumpstart User Guide

A complete guide to using Project Jumpstart for Claude Code best practices.

---

## Table of Contents

1. [Installation](#installation)
2. [Getting Started](#getting-started)
3. [Dashboard](#dashboard)
4. [CLAUDE.md Editor](#claudemd-editor)
5. [Module Documentation](#module-documentation)
6. [Project Kickstart](#project-kickstart)
7. [Skills Workshop](#skills-workshop)
8. [Agents](#agents)
9. [Team Templates](#team-templates)
10. [Test Plans & TDD](#test-plans--tdd)
11. [RALPH Command Center](#ralph-command-center)
12. [Context Health](#context-health)
13. [Enforcement](#enforcement)
14. [Settings](#settings)
15. [Session Learning Hooks](#session-learning-hooks)

---

## Installation

### Download

Download the latest release from [GitHub Releases](https://github.com/jmckinley/project-jumpstart/releases/latest).

### macOS

1. Download the `.dmg` file
2. Open the DMG and drag **Project Jumpstart** to your Applications folder
3. Launch the app — it is signed and notarized, so no Gatekeeper warnings

### Requirements

- macOS 11+ (Big Sur or later)
- Apple Silicon (M1/M2/M3/M4)
- Anthropic API key (for AI-powered features like doc generation and test suggestions)

---

## Getting Started

### First Launch

1. **Welcome screen** appears on first launch
2. Enter your **Anthropic API key** (recommended — enables AI features)
3. Click **Get Started**

### Adding a Project

1. Click **New Project** in the sidebar
2. Select your project folder
3. Project Jumpstart scans for tech stack (language, framework, build tool, test framework)
4. Review the detected stack and adjust if needed
5. Choose your goals (documentation, testing, enforcement, etc.)
6. Click **Generate** to create your CLAUDE.md

### Switching Projects

Use the **project selector** dropdown at the top of the sidebar. All data (skills, agents, team templates, test plans) is scoped per project.

---

## Dashboard

The dashboard gives you a quick overview of your project's documentation health.

### Health Score

A 0-100 score based on:
- CLAUDE.md quality (25%)
- Module documentation coverage (25%)
- Documentation freshness (15%)
- Skills configured (15%)
- Context health (10%)
- Enforcement setup (10%)

### Quick Wins

High-impact, low-effort improvements to boost your score. Click any quick win to navigate directly to that section.

### Smart Next Step

An adaptive recommendation card that suggests what to do next based on your project's current state. It detects missing API keys, uncreated CLAUDE.md, low module coverage, and more.

### Refresh Docs

Click **Refresh Docs** in the dashboard header to regenerate stale documentation using AI. This updates both CLAUDE.md and outdated module headers.

---

## CLAUDE.md Editor

Edit your project's CLAUDE.md file — the central document that gives Claude context about your codebase.

### Live Preview

The editor shows a split view with the raw markdown on the left and rendered preview on the right.

### AI Suggestions

Click suggestion chips to have AI generate content for missing sections (Overview, Commands, Patterns, etc.).

### Tips

- Keep the Overview concise but comprehensive
- Document commands developers run frequently
- Add CLAUDE NOTES for things you want Claude to always remember
- The editor auto-saves on changes

---

## Module Documentation

Add structured documentation headers to every source file so Claude understands each module's purpose without reading all the code.

### File Tree

Browse your project's source files with status indicators:
- **Green** = documented (current)
- **Yellow** = documented but outdated
- **Red** = missing documentation

### Generate Docs

1. Click a file in the tree to preview its documentation
2. For files with existing docs, the preview loads instantly
3. For undocumented files, AI generates a new doc header
4. Click **Apply** to write the header to the file
5. Click **Regenerate** to get a fresh AI-generated version

### Batch Generation

Select multiple files and click **Generate Selected** to document them all at once. Progress is tracked with a progress bar.

### Coverage Stats

The coverage bar at the top shows how many files have documentation. Aim for 80%+.

---

## Project Kickstart

For brand-new or undocumented projects, **Project Kickstart** generates everything you need to make Claude Code productive from the very first session.

### When to Use

- Starting a new project from scratch
- Onboarding an existing project that has no CLAUDE.md
- Bootstrapping documentation for a project you just inherited

### How to Use

1. Navigate to the **Modules** tab
2. If your project has no CLAUDE.md, you'll see the Kickstart interface
3. Fill in your project details:
   - Project name and description
   - Language and framework
   - Key goals and constraints
4. Click **Generate** to create a complete starter prompt
5. Review the generated output — edit if needed
6. Click **Copy** to copy the prompt
7. Paste it into Claude Code to bootstrap your project

### What Gets Generated

- A comprehensive CLAUDE.md tailored to your tech stack
- Module documentation templates for your file structure
- Recommended skills and agents for your project type
- Project structure guidance and conventions
- Token usage estimate for the generated context

---

## Skills Workshop

Skills are reusable prompt snippets that teach Claude specific tasks or patterns for your project.

### Skill Library

Browse 50+ pre-built skills organized by category:
- Code Review, Prompting Patterns, Language Idioms
- UI/UX, Testing, Documentation, Database
- DevOps, Security, Performance

Skills are **scored by relevance** to your project's detected tech stack. Recommended skills appear first.

### My Skills

View, edit, and delete skills saved to your project. Click **New Skill** to create a custom one.

### Pattern Detection

Click **Detect Patterns** to scan your codebase for recurring patterns. Convert detected patterns into skills with one click.

---

## Agents

Agents are specialized configurations that tell Claude how to handle complex, multi-step tasks.

### Agent Library

Browse pre-built agents across categories:
- Testing, Debugging, Code Review
- Documentation, Refactoring, DevOps
- Performance, Security, Architecture

Agents are scored by relevance and can be added to your project with one click.

### My Agents

Manage project-specific agents. Each agent has:
- **Name and description**
- **Tier** (Basic, Standard, Advanced)
- **Instructions** (detailed prompt for Claude)
- **Workflow** (step-by-step procedure)
- **Tools** (allowed tool list)
- **Trigger patterns** (when to activate)

### Enhance with AI

Click **Enhance** on any agent to have AI improve its instructions based on your project context.

---

## Team Templates

Team Templates let you deploy multi-agent team compositions for Claude Code's **Agent Teams** feature. Multiple Claude Code instances coordinate via shared task lists and peer messaging.

### Team Library

Browse 8 pre-built team templates:

| Template | Pattern | Teammates | Use Case |
|----------|---------|-----------|----------|
| Full Stack Feature Team | Leader | 4 | Coordinated frontend + backend + testing |
| TDD Pipeline Team | Pipeline | 3 | Sequential test → implement → refactor |
| Code Review Council | Council | 3 | Multi-perspective security + perf + style review |
| Parallel Test Suite Builder | Parallel | 3 | Simultaneous unit + integration + E2E tests |
| Migration & Upgrade Team | Leader | 3 | Framework upgrades and API migrations |
| Documentation Sprint Team | Swarm | 3 | Comprehensive docs across the codebase |
| Monorepo Refactor Team | Pipeline | 4 | Large-scale code restructuring |
| DevOps Setup Team | Parallel | 3 | CI/CD, Docker, and deployment config |

### Orchestration Patterns

- **Leader** — One lead agent coordinates specialists
- **Pipeline** — Agents work in sequence, each building on the previous
- **Parallel** — Agents work simultaneously on independent tasks
- **Swarm** — Agents self-organize around available work
- **Council** — Agents provide independent assessments, then reconcile

### Deploying a Team

1. Browse the library and select a template
2. Click **Deploy** to generate output
3. Choose a format:
   - **Lead Prompt** (recommended) — Paste-ready markdown for a Claude Code session
   - **Shell Script** — Executable bash script
   - **Config Directory** — `.claude/teams/` directory structure
4. Click **Copy** or **Download**
5. Paste the lead prompt into a Claude Code session to spawn the team

### My Teams

Save templates to your project for customization:
1. Click **Add** on a library template
2. Switch to the **My Teams** tab
3. Edit teammates, tasks, hooks, and lead instructions
4. Deploy your customized version

---

## Test Plans & TDD

### Test Plans

Organize tests into plans with coverage targets:
1. Click **Create Plan** — set a name, description, and target coverage
2. Add test cases manually or use **AI Generate**
3. Track status: pending, passing, failing, skipped
4. Run tests to see execution progress and history

### AI Test Generation

1. Click **Generate Tests** in the hero section
2. AI analyzes your codebase and suggests test cases
3. Cases are auto-categorized by type (unit/integration/E2E) and priority
4. Accept or dismiss suggestions

### TDD Workflow

The **TDD Workflow** tab guides you through Red-Green-Refactor:

1. **Red** — Write a failing test (AI generates the test prompt)
2. **Green** — Write minimal code to make it pass
3. **Refactor** — Clean up while tests stay green

### Tools

The **Tools** tab generates configs for Claude Code:
- **Subagent Config** — Markdown for a TDD subagent that Claude can spawn
- **PostToolUse Hooks** — JSON config to auto-run tests after every file edit

---

## RALPH Command Center

RALPH (Review, Analyze, List, Plan, Handoff) helps you write better prompts before sending them to Claude.

### Prompt Analysis

1. Enter a prompt in the text area
2. Click **Analyze** to get a quality score (0-100)
3. Review issues and suggestions
4. Click **Auto-Enhance** to improve the prompt with AI

### Quality Scoring

Prompts are scored on:
- Clarity — Is the intent unambiguous?
- Specificity — Are requirements detailed?
- Context — Does it provide enough background?
- Scope — Is the task appropriately sized?

### Loop Monitoring

Track long-running iterative Claude sessions. Each loop shows:
- Status (active, paused, completed)
- Iteration count
- Start time and duration

---

## Context Health

Monitor how much context Claude has available and optimize what's included.

### Token Breakdown

See how your context window is being used:
- CLAUDE.md content
- Module documentation headers
- Skills and agent configs
- Conversation history

### Checkpoints

Create checkpoints before major operations. If context gets too large, you can reference what was in scope.

### MCP Servers

View configured MCP (Model Context Protocol) servers and their status. MCP servers can offload capabilities so Claude doesn't need them in context.

### Tips

- Keep context utilization under 80%
- Documentation headers help Claude understand code without reading it all
- Use MCP servers for external capabilities (databases, APIs, etc.)

---

## Enforcement

Automate documentation standards with git hooks and CI integration.

### Git Hooks

Install a pre-commit hook with one click. Choose a mode:

| Mode | Behavior |
|------|----------|
| **Warn** | Show warnings for missing docs, allow commit |
| **Block** | Fail the commit if docs are missing |
| **Auto-Update** | Automatically generate missing docs at commit time (requires API key) |

### CI Integration

Copy ready-made CI snippets for:
- GitHub Actions
- GitLab CI
- Generic shell scripts

These check documentation coverage and freshness in your pipeline.

---

## Settings

### API Key

Enter your Anthropic API key to enable AI features. The key is:
- Stored **encrypted** locally in SQLite
- Never sent to external servers
- Required for: doc generation, test suggestions, prompt enhancement, session learning extraction

### Enforcement Level

Set the enforcement mode (syncs with the Enforcement page):
- Off, Warn, Block, or Auto-Update

---

## Session Learning Hooks

Project Jumpstart includes a `SessionEnd` hook that automatically extracts learnings from your Claude Code sessions.

### How It Works

1. When a Claude Code session ends, the hook reads the conversation transcript
2. It calls Claude API to extract actionable insights
3. Learnings are appended to `CLAUDE.local.md` (personal, gitignored)
4. Next session, Claude automatically reads these learnings

### Learning Categories

- **[Preference]** — User style and communication preferences
- **[Solution]** — Specific solutions to problems encountered
- **[Pattern]** — Recurring patterns and conventions
- **[Gotcha]** — Pitfalls and things to watch out for

### Setup

The hook is pre-configured in `.claude/settings.json`. It requires:
- An Anthropic API key in your Project Jumpstart settings
- Claude Code with hooks support enabled

### Viewing Learnings

Open `CLAUDE.local.md` in your project root to see accumulated learnings. This file is gitignored so it stays personal.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Click logo | Navigate to Dashboard |
| Project dropdown | Switch between projects |

---

## Troubleshooting

### App won't open on macOS

The app is signed and notarized. If you still get a Gatekeeper warning:
1. Right-click the app and select **Open**
2. Click **Open** in the dialog

### AI features not working

1. Go to **Settings** and verify your API key is entered
2. Check that the key is valid (starts with `sk-ant-`)
3. Ensure you have API credits remaining

### Database location

All data is stored in `~/.project-jumpstart/jumpstart.db`. To reset:
1. Quit Project Jumpstart
2. Delete `~/.project-jumpstart/`
3. Relaunch the app

### Getting help

Report issues at: [github.com/jmckinley/project-jumpstart/issues](https://github.com/jmckinley/project-jumpstart/issues)
