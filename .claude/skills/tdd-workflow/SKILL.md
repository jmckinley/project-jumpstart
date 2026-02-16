# TDD Workflow in Project Jumpstart

## Test Framework Detection

Auto-detects: Vitest, Jest, Pytest, Cargo test, Playwright, Mocha, Cypress.
Detection logic in `src-tauri/src/core/test_runner.rs`.

## TDD Phases

1. **Red**: Write a failing test that defines expected behavior
2. **Green**: Write minimal code to make the test pass
3. **Refactor**: Clean up while keeping tests green

## Test Plans

- Organize tests into plans with target coverage goals (default 80%)
- Each plan has test cases with type (unit/integration/e2e) and priority
- Test runs track pass/fail/skip counts and coverage

## AI Test Generation

- Uses Anthropic API to analyze codebase and suggest test cases
- Requires API key in Settings
- Suggestions can be auto-accepted into a new plan

## Claude Code Integration

- **Subagent configs**: Generate markdown for automated TDD subagents
- **PostToolUse hooks**: Generate settings.json to auto-run tests after file edits
- Hooks render with resolved test commands (e.g., `pnpm test --run`)

## Key Files

- Backend: `src-tauri/src/commands/test_plans.rs`, `src-tauri/src/core/test_runner.rs`
- Frontend: `src/components/test-plans/`, `src/hooks/useTestPlans.ts`, `src/hooks/useTDDWorkflow.ts`
- Types: `src/types/test-plan.ts`, `src-tauri/src/models/test_plan.rs`
