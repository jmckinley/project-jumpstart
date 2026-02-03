//! @module core/mod
//! @description Module declarations for core business logic
//!
//! PURPOSE:
//! - Re-export all core engine modules
//! - Organize business logic by domain
//!
//! EXPORTS:
//! - scanner - Project detection and scanning
//! - watcher - File system change monitoring
//! - analyzer - Code analysis via tree-sitter
//! - generator - AI-powered content generation
//! - freshness - Documentation staleness detection
//! - health - Health score calculation
//! - crypto - API key encryption/decryption
//! - test_runner - Test framework detection and execution
//!
//! PATTERNS:
//! - Core modules contain business logic, not IPC handling
//! - Commands call into core modules for actual work
//!
//! CLAUDE NOTES:
//! - Core is the heart of the application; commands are thin wrappers
//! - Each module should be independently testable
//! - App name: Project Jumpstart

pub mod ai;
pub mod scanner;
pub mod watcher;
pub mod analyzer;
pub mod generator;
pub mod freshness;
pub mod health;
pub mod crypto;
pub mod test_runner;
