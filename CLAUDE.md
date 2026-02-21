# Project Jumpstart

Desktop application (Tauri 2.0 + React) that prevents context rot through persistent documentation.

**Full Specification**: `project-jumpstart-spec.md`

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Tauri 2.0 (Rust + web) |
| Frontend | React 18 + TypeScript + Vite |
| UI | shadcn/ui + Tailwind CSS |
| State | Zustand |
| Database | SQLite (rusqlite) |
| AI | Anthropic API |
| Package Manager | **pnpm** (not npm/yarn) |

## Commands

```bash
pnpm install              # Install dependencies
pnpm dev                  # Vite dev server only
pnpm tauri dev            # Full Tauri development
pnpm build                # Build frontend
pnpm tauri build          # Build distributable app
cargo test                # Rust tests (from src-tauri/)
pnpm test                 # Frontend tests (Vitest)
pnpm lint                 # ESLint
cargo clippy              # Rust linter
```

## Project Structure

See tree in `project-jumpstart-spec.md` Part 3. Key directories:

- `src-tauri/src/commands/` - Tauri IPC command handlers
- `src-tauri/src/core/` - Business logic (scanner, analyzer, generator, AI)
- `src-tauri/src/models/` - Rust data structures (serde)
- `src-tauri/src/db/` - SQLite schema and connection
- `src/components/` - React components by section
- `src/hooks/` - Custom hooks (all call real Tauri backend)
- `src/types/` - TypeScript type definitions
- `src/lib/tauri.ts` - IPC wrapper (60+ commands)
- `src/data/` - Static library data (skills, agents, templates)

## Rules & Documentation

Detailed rules are in `.claude/rules/`:
- `documentation.md` - Module doc header format and update checklist
- `testing.md` - Vitest/Cargo test patterns, TDD workflow
- `rust.md` - Tauri command patterns, error handling
- `react.md` - Component patterns, shadcn/ui, Tailwind
- `database.md` - SQLite schema, migrations, conventions

**Every file MUST have a documentation header** - see `.claude/rules/documentation.md`.

## Current Status

**Feature-Complete (Beta Ready)** | 1,310 tests (918 frontend + 149 Rust + 243 E2E)

All sections implemented: Onboarding, Dashboard, CLAUDE.md Editor, Modules, Test Plans & TDD, Skills, Agents, Team Templates, RALPH, Context Health, Performance, Enforcement, Settings, Memory Management.

## Important Decisions

1. **Tauri over Electron**: 10MB vs 150MB bundle
2. **SQLite over IndexedDB**: Rust-native, better querying
3. **tree-sitter for parsing**: Language-aware AST analysis
4. **Zustand over Redux**: Simpler API, TypeScript-friendly
5. **shadcn/ui**: Copy-paste components, Tailwind-native
6. **Auto-update enforcement**: Git hooks generate missing docs via API at commit time
7. **Session learning extraction**: SessionEnd hook extracts learnings to CLAUDE.local.md
8. **PreCompact hook**: Saves context before compaction to prevent context rot

## CLAUDE NOTES

### Gotchas
- Frontend must pass `null` not `undefined` for optional Tauri IPC params
- `#[serde(rename_all = "camelCase")]` handles TS <-> Rust case conversion
- When adding optional callback params, update existing test assertions
- macOS release build fails without signing certificate secrets
- Team template library data is in `src/data/teamTemplateLibrary.ts`

### AI Integration
- API key stored encrypted in settings; AI features have graceful fallbacks
- RALPH uses heuristic analysis first, AI as enhancement
- Module docs can generate from AI or templates

### Build & Release
- macOS: signed + notarized DMG via release workflow
- Windows: NSIS .exe + .msi (unsigned beta)
- CI: `.github/workflows/release.yml` triggers on `v*` tags

### Memory Management
- `.claude/hooks/extract-learnings.sh` - SessionEnd: extracts learnings with semantic dedup
- `.claude/hooks/check-test-staleness.sh` - SessionEnd: detects stale tests after source changes
- `.claude/hooks/pre-compact.sh` - PreCompact: saves context before compaction
- `.claude/skills/` - On-demand context (tauri-patterns, tdd-workflow, team-templates, freshness-engine)
- `.claude/rules/` - Always-loaded domain rules (documentation, testing, rust, react, database)
- `CLAUDE.local.md` - Personal learnings (gitignored, auto-populated)

## Changelog

| Date | Change |
|------|--------|
| Feb 21, 2026 | Performance Engineering section: heuristic-based code/architecture analysis, health score integration (8 components), Resend reclassified to auth. Comprehensive E2E tests for all sections (243 Playwright tests). 1,310 total tests. |
| Feb 16, 2026 | Test Staleness Detection: SessionEnd hook, Rust backend command, TestStalenessAlert UI in Memory Dashboard. Shell script + backend detect stale tests via git diff. |
| Feb 16, 2026 | Added Memory Management feature: memory dashboard, learning browser, CLAUDE.md analyzer. Slimmed CLAUDE.md, added rules files, PreCompact hook, skills directory, upgraded learning extraction. |
| Feb 10, 2026 | Added Windows build to release workflow |
| Feb 7, 2026 | Deploy output personalization, team templates, resilient auto-update hook |
| Feb 3, 2026 | TDD Workflow & Test Plans feature |
| Jan 31, 2026 | Auto-update enforcement mode, enforcement settings sync |

*Update this file and all module documentation as the project evolves!*
