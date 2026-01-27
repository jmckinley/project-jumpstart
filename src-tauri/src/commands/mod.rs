//! @module commands/mod
//! @description Module declarations for all Tauri IPC command handlers
//!
//! PURPOSE:
//! - Re-export all command modules for use in lib.rs
//! - Organize IPC commands by domain
//!
//! EXPORTS:
//! - project - Project CRUD commands
//! - onboarding - Setup wizard commands
//! - claude_md - CLAUDE.md operations
//! - modules - Module documentation commands
//! - freshness - Staleness detection commands
//! - skills - Skills management commands
//! - ralph - RALPH loop commands
//! - context - Context health commands
//! - enforcement - Git hooks and CI commands
//!
//! PATTERNS:
//! - Each submodule contains #[tauri::command] functions
//! - All commands are async and return Result<T, String>
//! - Commands are registered in lib.rs invoke_handler
//!
//! CLAUDE NOTES:
//! - When adding a new command module, add it here AND register its commands in lib.rs

pub mod project;
pub mod onboarding;
pub mod claude_md;
pub mod modules;
pub mod freshness;
pub mod skills;
pub mod ralph;
pub mod context;
pub mod enforcement;
