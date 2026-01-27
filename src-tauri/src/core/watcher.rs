//! @module core/watcher
//! @description File system watcher for project change monitoring
//!
//! PURPOSE:
//! - Watch project directories for file changes
//! - Debounce rapid file system events
//! - Emit structured change events to the frontend
//!
//! DEPENDENCIES:
//! - notify - Cross-platform file watching
//! - tokio - Async runtime for debouncing
//!
//! EXPORTS:
//! - (none yet - will be added in Phase 2)
//!
//! PATTERNS:
//! - Uses notify-rs for cross-platform watching
//! - Debounces events within a configurable window
//! - Special handling for CLAUDE.md and .claude/ directory changes
//!
//! CLAUDE NOTES:
//! - File events: Created, Modified, Deleted, Renamed
//! - CLAUDE.md changes trigger immediate freshness recalculation
//! - See spec Part 5.2 for full watcher specification
