//! @module commands/ralph
//! @description Tauri IPC commands for RALPH loop management
//!
//! PURPOSE:
//! - Analyze prompt quality for RALPH loops
//! - Start, pause, and monitor RALPH loops
//! - Track loop history and outcomes
//!
//! DEPENDENCIES:
//! - tauri - Command macro and State
//!
//! EXPORTS:
//! - (none yet - commands will be added in Phase 7)
//!
//! PATTERNS:
//! - analyze_ralph_prompt evaluates prompt quality before starting
//! - start_ralph_loop initiates an autonomous loop
//! - Loop monitor polls for status updates
//!
//! CLAUDE NOTES:
//! - RALPH = Review, Analyze, List, Plan, Handoff
//! - Safety settings control loop boundaries
