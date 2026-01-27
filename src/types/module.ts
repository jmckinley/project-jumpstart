/**
 * @module types/module
 * @description TypeScript type definitions for module documentation
 *
 * PURPOSE:
 * - Define ModuleStatus for tracking documentation state per file
 * - Define ModuleDoc for documentation content
 *
 * EXPORTS:
 * - ModuleStatus - Documentation status for a single file
 * - ModuleDoc - Parsed documentation header content
 *
 * PATTERNS:
 * - Types mirror Rust structs in models/module_doc.rs
 * - Status is a union type: "current" | "outdated" | "missing"
 *
 * CLAUDE NOTES:
 * - Keep in sync with Rust models in src-tauri/src/models/module_doc.rs
 */

export interface ModuleStatus {
  path: string;
  status: "current" | "outdated" | "missing";
  freshnessScore: number;
  changes?: string[];
  suggestedDoc?: ModuleDoc;
}

export interface ModuleDoc {
  modulePath: string;
  description: string;
  purpose: string[];
  dependencies: string[];
  exports: string[];
  patterns: string[];
  claudeNotes: string[];
}
