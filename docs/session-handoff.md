# Project Jumpstart — Session Handoff Document

Use this document to bootstrap a new Claude Code session with full project context.

---

## Project State

| Field | Value |
|-------|-------|
| **Branch** | `main` |
| **Latest Commit** | `abfb8f9` — feat: Smart Session Handoff + Dashboard 3-tier redesign |
| **Status** | Feature-complete (Beta Ready) |
| **Tests** | 1,470 total (1,033 frontend + 194 Rust + 243 E2E) |
| **Build** | Passing locally; CI triggers on `v*` tags |
| **Latest Tag** | `v1.0.0-beta.7` |

---

## Architecture Overview

**Tauri 2.0** desktop app: Rust backend (business logic, SQLite, AI) + React frontend (UI, state management).

```
project-jumpstart/
├── src-tauri/                  # Rust backend
│   └── src/
│       ├── commands/           # 21 IPC command handler modules (113 commands)
│       ├── core/               # 10 business logic modules
│       ├── models/             # 13 Serde data structure files
│       ├── db/                 # SQLite schema, migrations, connection (AppState)
│       ├── lib.rs              # Command registration (generate_handler![])
│       └── main.rs             # Entry point
├── src/                        # React/TypeScript frontend
│   ├── components/             # 33 directories, 155+ files, organized by section
│   ├── hooks/                  # Custom hooks — all call real Tauri backend via invoke()
│   ├── stores/                 # Zustand stores (project, onboarding, settings, toast)
│   ├── types/                  # TypeScript type definitions (mirrors Rust models)
│   ├── lib/tauri.ts            # IPC wrapper — 113 typed functions (1,016 lines)
│   └── data/                   # Static library data (skills, agents, templates, help)
├── e2e/                        # Playwright E2E tests (243 tests)
├── .claude/
│   ├── hooks/                  # 4 lifecycle hooks (Bash scripts)
│   ├── rules/                  # 5 always-loaded domain rules (Markdown)
│   ├── skills/                 # 4 on-demand context skills
│   └── compaction-logs/        # PreCompact context backups
├── docs/                       # Product docs
├── .github/workflows/          # CI/CD (release.yml)
├── CLAUDE.md                   # Project instructions (concise, references rules/skills)
├── CLAUDE.local.md             # Personal learnings (gitignored)
└── project-jumpstart-spec.md   # Full specification document
```

**Database**: SQLite at `~/.project-jumpstart/jumpstart.db`. 20+ tables. Schema in `src-tauri/src/db/schema.rs`, init in `db/mod.rs`. Auto-migrations on startup.

---

## Recent Changes (Latest Session — Feb 24, 2026)

### Smart Session Handoff + Dashboard 3-Tier Redesign (`abfb8f9`)

**What shipped**:
- `session_snapshots` DB table for persisting AI-generated session summaries
- 3 new Tauri commands: `generate_handoff_context`, `get_latest_snapshot`, `generate_session_start_script`
- `SessionSnapshot` model (`src-tauri/src/models/session_handoff.rs`)
- `pub(crate)` visibility for session analysis helpers
- SessionHandoff hero card component with expand/collapse, stat chips, Install Hook button
- Dashboard restructured into 3-tier layout: Hero (session handoff), Primary (health + editor), Supporting (quick wins + activity)
- QuickWins and RecentActivity compact modes
- `.claude/hooks/session-handoff.sh` — SessionStart hook reads latest snapshot via sqlite3

**Prior session** (Feb 23): Claude Code best practices compliance — fixed hook config schema, skill/agent export to `.claude/` with YAML frontmatter, `@import` directives, 4 new stack templates.

---

## All Sections & Key Files

### Core
| Section | Frontend | Backend | Hook |
|---------|----------|---------|------|
| **Dashboard** | `src/components/dashboard/` (HealthScore, ContextRotAlert, QuickWins, RecentActivity, SessionHandoff, SmartNextStep) | Health: `commands/claude_md.rs` → `core/health.rs` | — |
| **CLAUDE.md Editor** | `src/components/claude-md/` | `commands/claude_md.rs` | — |
| **Modules** | `src/components/modules/` | `commands/modules.rs` → `core/analyzer.rs` | — |

### Development
| Section | Frontend | Backend | Hook |
|---------|----------|---------|------|
| **Test Plans & TDD** | `src/components/test-plans/` | `commands/test_plans.rs` → `core/test_runner.rs` | — |
| **Skills** | `src/components/skills/` | `commands/skills.rs` | — |
| **Agents** | `src/components/agents/` | `commands/agents.rs` | — |
| **Team Templates** | `src/components/team-templates/` | `commands/team_templates.rs` | — |
| **RALPH** | `src/components/ralph/` | `commands/ralph.rs` | — |
| **Performance** | `src/components/performance/` | `commands/performance.rs` → `core/performance.rs` | — |

### Monitoring
| Section | Frontend | Backend | Hook |
|---------|----------|---------|------|
| **Claude Memory** | `src/components/memory/` | `commands/memory.rs` | `extract-learnings.sh`, `check-test-staleness.sh` |
| **Context Health** | `src/components/context/` | `commands/context.rs` | `pre-compact.sh` |

### Setup
| Section | Frontend | Backend | Hook |
|---------|----------|---------|------|
| **Enforcement** | `src/components/enforcement/` | `commands/enforcement.rs` | — |
| **Settings** | `src/components/settings/` | `commands/settings.rs` | — |
| **Help** | `src/components/help/` | — (static data in `src/data/pageHelpContent.ts`) | — |

### Special
| Feature | Frontend | Backend | Hook |
|---------|----------|---------|------|
| **Onboarding** | `src/components/onboarding/` | `commands/onboarding.rs` → `core/scanner.rs` | — |
| **Session Handoff** | `src/components/dashboard/SessionHandoff.tsx` | `commands/session_handoff.rs` | `session-handoff.sh` |
| **Freshness** | (integrated into modules/dashboard) | `commands/freshness.rs` → `core/freshness.rs` | — |
| **File Watcher** | (integrated into hooks) | `commands/watcher.rs` → `core/watcher.rs` | — |
| **Kickstart** | (integrated into modules) | `commands/kickstart.rs` | — |
| **Activity Feed** | (integrated into dashboard) | `commands/activity.rs` | — |

---

## Key Patterns

### Tauri Command Pattern
```rust
// src-tauri/src/commands/<module>.rs
#[tauri::command]
pub async fn command_name(
    param: String,
    optional_param: Option<String>,  // Frontend sends null, not undefined
    state: State<'_, AppState>,
) -> Result<ReturnType, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    // ... business logic
    Ok(result)
}
```
- Always async, returns `Result<T, String>`
- `State<'_, AppState>` for DB access
- Register in `lib.rs` (import + `generate_handler![]`)
- `#[serde(rename_all = "camelCase")]` on all structs

### React Component Pattern
```typescript
// src/components/<section>/ComponentName.tsx
/**
 * @module components/<section>/ComponentName
 * @description Brief description
 */
import { useState } from "react";
import { useCustomHook } from "@/hooks/useCustomHook";

interface ComponentNameProps { /* typed props */ }

export function ComponentName({ prop }: ComponentNameProps) {
  // shadcn/ui + Tailwind CSS
  return <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">...</div>;
}
```
- Every file has a module doc header
- shadcn/ui components + Tailwind utility classes
- Dark theme: neutral-800/900 backgrounds, neutral-100/200 text, violet/pink/blue accents

### Hook (Custom React) Pattern
```typescript
// src/hooks/useFeatureName.ts
export function useFeatureName(projectId?: string) {
  const [data, setData] = useState<Type[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await tauriLib.commandName(projectId ?? null);  // null not undefined
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  return { data, loading, load, ... };
}
```

### IPC Wrapper Pattern
```typescript
// src/lib/tauri.ts
export async function commandName(param: string, optional?: string): Promise<ReturnType> {
  return invoke<ReturnType>("command_name", { param, optional: optional ?? null });
}
```

### Test Patterns
```typescript
// Frontend: ComponentName.test.tsx (colocated)
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@/stores/toastStore", () => ({ useToastStore: { getState: () => ({ addToast: vi.fn() }) } }));

describe("ComponentName", () => {
  it("should render", () => {
    render(<Component />);
    expect(screen.getByText("Expected")).toBeInTheDocument();
  });
});
```
```rust
// Backend: inline #[cfg(test)] mod tests at bottom of source files
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test_name() { assert_eq!(func(input), expected); }
}
```

### Claude Code Hook Pattern
```bash
#!/usr/bin/env bash
# .claude/hooks/<hook-name>.sh
# Receives JSON on stdin: { "session_id", "transcript_path", "cwd", "hook_event_name" }
INPUT=$(cat -)
SESSION_ID=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('session_id',''))")
# ... hook logic
```

---

## Known Issues & Tech Debt

1. **Windows builds unsigned** — No Authenticode certificate yet; Windows Defender may flag the installer
2. **Tauri optional params** — Frontend must pass `null` not `undefined` for optional IPC parameters
3. **GenericDoc fallback** — Files without detected purpose get generic doc descriptions (TODO markers in `freshness.rs`)
4. **Toast mock requirement** — When adding `toastStore` import to any hook/component, must add `vi.mock("@/stores/toastStore", ...)` to all related test files
5. **Test assertion updates** — Adding optional callback params requires updating `toHaveBeenCalledWith` assertions in existing tests to include `undefined`
6. **macOS signing** — Release build requires 6 signing/notarization secrets in GitHub repo settings
7. **RALPH AI mode** — Requires API key; heuristic mode works but gives simpler feedback
8. **Health score polling** — Fixed cyclic JSON error (commit `55b33fc`), but watch for similar serialization issues in nested types

---

## Suggested Next Steps

1. **Bug fixes / polish** — Run through the app end-to-end and fix any rough edges before the next beta release
2. **Windows code signing** — Acquire an Authenticode certificate to avoid SmartScreen warnings
3. **Linux build** — Add Linux target to release workflow (AppImage or .deb)
4. **Auto-update (in-app)** — Tauri supports `tauri-plugin-updater` for checking and applying updates from GitHub Releases
5. **Onboarding refinements** — Test the flow with users unfamiliar with the project; iterate on copy and UX
6. **Performance benchmarks** — Measure scan/generation times on large codebases (1000+ files) and optimize if needed
7. **MCP server integration** — Expose key Jumpstart features as an MCP tool server for direct Claude Code access
8. **Cloud sync** — Optional cloud backup for learnings and session snapshots across machines

---

## Commands Reference

```bash
pnpm install              # Install dependencies
pnpm dev                  # Vite dev server only (port 1420)
pnpm tauri dev            # Full Tauri development (Rust + frontend)
pnpm build                # Build frontend only
pnpm tauri build          # Build distributable app (DMG/exe)
cargo test                # Rust tests (run from src-tauri/)
pnpm test                 # Frontend tests (Vitest, watch mode)
pnpm test --run           # Frontend tests (single run)
pnpm lint                 # ESLint
cargo clippy              # Rust linter
```

---

## How to Use This Document

Paste the following at the start of a new Claude Code session:

```
Read docs/session-handoff.md for full project context. Then read CLAUDE.md for rules and conventions.
```

Or, if the SessionStart hook is installed (`.claude/hooks/session-handoff.sh`), context from your last session is injected automatically.
