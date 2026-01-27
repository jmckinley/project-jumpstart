//! @module commands/context
//! @description Tauri IPC commands for context health monitoring
//!
//! PURPOSE:
//! - Monitor token usage and context budget
//! - Track MCP server overhead
//! - Manage context checkpoints
//!
//! DEPENDENCIES:
//! - tauri - Command macro and State
//! - core::health - Health score calculation
//!
//! EXPORTS:
//! - (none yet - commands will be added in Phase 8)
//!
//! PATTERNS:
//! - get_context_health returns current ContextHealth
//! - get_mcp_status lists MCP servers with recommendations
//! - create_checkpoint saves current context state
//!
//! CLAUDE NOTES:
//! - Context health is critical for preventing context rot
//! - MCP overhead can significantly impact available context
