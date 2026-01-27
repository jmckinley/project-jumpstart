//! @module commands/freshness
//! @description Tauri IPC commands for documentation freshness detection
//!
//! PURPOSE:
//! - Detect stale documentation across the project
//! - Calculate freshness scores per file
//! - Provide staleness signals to the frontend
//!
//! DEPENDENCIES:
//! - tauri - Command macro and State
//! - core::freshness - Staleness detection logic
//!
//! EXPORTS:
//! - (none yet - commands will be added in Phase 5)
//!
//! PATTERNS:
//! - get_stale_files returns files with outdated docs
//! - Freshness score is 0-100 (100 = perfectly current)
//!
//! CLAUDE NOTES:
//! - Staleness detection compares documented vs actual exports/imports
//! - Uses tree-sitter AST comparison for accuracy
