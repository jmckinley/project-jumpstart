/**
 * @module types/session-handoff
 * @description TypeScript type definitions for Session Handoff feature
 *
 * PURPOSE:
 * - Define SessionSnapshot interface matching Rust model
 * - Provide types for session handoff IPC calls
 *
 * EXPORTS:
 * - SessionSnapshot - Captured session state for handoff to next session
 *
 * PATTERNS:
 * - Types mirror Rust structs in models/session_handoff.rs
 * - Use camelCase (TypeScript convention), Rust uses snake_case
 *
 * CLAUDE NOTES:
 * - Keep in sync with Rust models in src-tauri/src/models/session_handoff.rs
 * - Tauri IPC automatically converts snake_case to camelCase
 */

export interface SessionSnapshot {
  id: string;
  projectId: string;
  sessionId: string;
  summary: string;
  pendingItems: string[];
  gitState: string;
  nextSteps: string[];
  filesModified: string[];
  createdAt: string;
}
