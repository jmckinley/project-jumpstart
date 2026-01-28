/**
 * @module types/enforcement
 * @description TypeScript type definitions for documentation enforcement (git hooks, CI, events)
 *
 * PURPOSE:
 * - Define EnforcementEvent for tracking hook/CI activity
 * - Define HookStatus for git hook installation state
 * - Define CiSnippet for CI integration templates
 *
 * EXPORTS:
 * - EnforcementEvent - A hook block/warning event record
 * - HookStatus - Git hook installation status
 * - CiSnippet - CI template with provider and content
 *
 * PATTERNS:
 * - EnforcementEvent.eventType: "block" | "warning" | "info"
 * - EnforcementEvent.source: "hook" | "ci" | "watcher"
 * - HookStatus.mode: "block" | "warn" | "none" | "external"
 * - CiSnippet.provider: "github_actions" | "gitlab_ci"
 *
 * CLAUDE NOTES:
 * - Keep in sync with Rust models in src-tauri/src/models/enforcement.rs
 * - Enforcement contributes 10% to the overall health score (5 hooks + 5 CI)
 * - Hook modes: "block" (fail commit) or "warn" (allow but log)
 */

export interface EnforcementEvent {
  id: string;
  projectId: string;
  eventType: string;
  source: string;
  message: string;
  filePath: string | null;
  createdAt: string;
}

export interface HookStatus {
  installed: boolean;
  hookPath: string;
  mode: string;
  hasHusky: boolean;
}

export interface CiSnippet {
  provider: string;
  name: string;
  description: string;
  filename: string;
  content: string;
}
