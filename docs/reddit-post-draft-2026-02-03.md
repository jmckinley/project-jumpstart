# Reddit Post Draft - Project Jumpstart Update

**Date:** 2026-02-03

---

## Title Options:
1. **I built auto-learning for Claude Code's new memory system - it extracts learnings from every session**
2. **The new Claude Code memory hierarchy is great, but manual. So I automated it.**
3. **Project Jumpstart update: TDD workflow + auto-populated CLAUDE.local.md**
4. **Claude Code's memory system + SessionEnd hooks = automatic learning**

---

## Post:

**TL;DR:** Added two major features to Project Jumpstart: (1) a TDD workflow that generates Claude Code subagents and hooks for automated testing, and (2) a session hook that auto-extracts learnings from conversations and saves them for future sessions.

---

### The Problem

Claude Code is incredible, but two things kept frustrating me:

1. **Testing feels manual** - I'd explain TDD to Claude, walk through red-green-refactor, then do it all again next session
2. **Learnings disappear** - We'd figure out a great solution together, session ends, gone forever

### What I Built

**1. TDD Workflow & Test Plans**

A full test management system with:
- Test framework auto-detection (Vitest, Jest, Pytest, Cargo, Playwright, etc.)
- Guided Red → Green → Refactor workflow with auto-generated prompts
- AI-powered test suggestions from code analysis
- **The cool part:** One-click generation of Claude Code subagent configs and PostToolUse hooks

So instead of explaining TDD every time, I can generate a `tdd-test-writer` subagent that knows exactly how to write failing tests for my stack.

**2. Session Learning Extraction (Complements the New Memory System)**

If you haven't seen it yet, Claude Code recently shipped a proper **5-tier memory hierarchy**:
1. Managed policy (org-wide)
2. `CLAUDE.md` (project, git-tracked)
3. `.claude/rules/*.md` (modular rules, git-tracked)
4. `~/.claude/CLAUDE.md` (user-wide personal prefs)
5. `CLAUDE.local.md` (project-local, auto-gitignored)

Plus the `/memory` command to edit any of these, `@path` imports, and path-specific rules with YAML frontmatter. It's a huge upgrade.

**But it's all manual.** You have to remember to add things.

So I built a `SessionEnd` hook that automatically populates tier 5 (`CLAUDE.local.md`) by analyzing what happened in the session. Now you get:
- **Static docs** you carefully write → `CLAUDE.md`
- **Auto-accumulated learnings** from actual work → `CLAUDE.local.md`

The hook:
- Reads the conversation transcript (Claude Code exposes `transcript_path` to hooks!)
- Calls Claude API to extract: preferences, solutions, patterns, gotchas
- Appends to `CLAUDE.local.md` (personal, gitignored)
- Deduplicates against existing learnings

After a few sessions, you end up with stuff like:
```
## Session abc123 (2026-02-03 17:30)

- [Preference] User prefers terse responses without excessive explanation
- [Solution] For "database locked" error, use .lock().await pattern
- [Pattern] Always run tests after modifying Rust files
- [Gotcha] The legacy API endpoint /v1/users is deprecated, use /v2/users
```

Since `CLAUDE.local.md` is part of the new memory hierarchy, it gets loaded automatically at session start. The new memory system handles the *structure*, this hook handles the *content*. Claude literally learns from working with you.

### How It Works

The hook is surprisingly simple. Claude Code passes JSON to hooks on stdin:
```json
{
  "session_id": "abc123",
  "transcript_path": "/path/to/transcript.jsonl",
  "cwd": "/path/to/project"
}
```

The script reads the transcript, sends it to Claude API for analysis, and appends new learnings. ~100 lines of bash.

### What's Next

Thinking about:
- A `/remember` slash command for manual "save this" moments
- Smarter deduplication (semantic similarity, not just text matching)
- Learning decay (old learnings get archived)

### Links

- GitHub: [github.com/jmckinley/project-jumpstart](https://github.com/jmckinley/project-jumpstart)
- Download (macOS): [Latest Release](https://github.com/jmckinley/project-jumpstart/releases/latest)

Would love feedback, especially from heavy Claude Code users. Anyone else building hooks for session persistence?

---

## Suggested Subreddits:
- r/ClaudeAI
- r/LocalLLaMA (if they allow Claude content)
- r/MachineLearning (Show & Tell thread)
