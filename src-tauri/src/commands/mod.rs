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
//! - agents - Agents management commands
//! - ralph - RALPH loop commands
//! - context - Context health commands
//! - enforcement - Git hooks and CI commands
//! - settings - User settings persistence
//! - activity - Activity feed logging and retrieval
//! - kickstart - Project kickstart prompt generation
//! - test_plans - Test plan management and TDD workflow commands
//! - session_analysis - AI-powered session transcript analysis
//! - memory - Memory management commands (sources, learnings, health, analysis)
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
pub mod agents;
pub mod ralph;
pub mod context;
pub mod enforcement;
pub mod settings;
pub mod activity;
pub mod watcher;
pub mod kickstart;
pub mod test_plans;
pub mod session_analysis;
pub mod team_templates;
pub mod memory;
pub mod performance;
