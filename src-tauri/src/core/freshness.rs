//! @module core/freshness
//! @description Documentation staleness detection and scoring
//!
//! PURPOSE:
//! - Calculate freshness scores for documented files
//! - Detect when code changes have made documentation stale
//! - Track freshness history for trend analysis
//!
//! DEPENDENCIES:
//! - core::analyzer - AST comparison for export/import changes
//! - chrono - Timestamp comparison
//!
//! EXPORTS:
//! - (none yet - will be added in Phase 5)
//!
//! PATTERNS:
//! - Freshness score: 0-100 (100 = perfectly current)
//! - Multiple staleness signals are weighted and combined
//! - History tracking enables trend visualization
//!
//! CLAUDE NOTES:
//! - Staleness signals: code modified after docs, new exports undocumented,
//!   removed exports still in docs, import changes, signature changes
//! - See spec Part 4.4 for signal weights
