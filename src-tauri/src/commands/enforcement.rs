//! @module commands/enforcement
//! @description Tauri IPC commands for documentation enforcement (git hooks, CI)
//!
//! PURPOSE:
//! - Install and configure git pre-commit hooks
//! - Generate CI integration snippets
//! - Track enforcement events (blocks, warnings)
//!
//! DEPENDENCIES:
//! - tauri - Command macro and State
//!
//! EXPORTS:
//! - (none yet - commands will be added in Phase 9)
//!
//! PATTERNS:
//! - install_git_hooks sets up pre-commit documentation checks
//! - get_enforcement_events returns recent hook activity
//!
//! CLAUDE NOTES:
//! - Enforcement is the last layer of context rot prevention
//! - Git hooks can block or warn on undocumented/stale files
