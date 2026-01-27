//! @module commands/skills
//! @description Tauri IPC commands for skills management
//!
//! PURPOSE:
//! - List, create, update, and delete skills
//! - Detect repeated patterns that could become skills
//! - Track skill usage analytics
//!
//! DEPENDENCIES:
//! - tauri - Command macro and State
//! - models::skill - Skill data types
//!
//! EXPORTS:
//! - (none yet - commands will be added in Phase 6)
//!
//! PATTERNS:
//! - list_skills returns project and installed skills
//! - detect_patterns analyzes request history for patterns
//!
//! CLAUDE NOTES:
//! - Skills are reusable Claude Code patterns that reduce token usage
//! - Pattern detection runs on recent request history
