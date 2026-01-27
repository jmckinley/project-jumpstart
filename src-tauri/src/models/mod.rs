//! @module models/mod
//! @description Data model definitions for the application
//!
//! PURPOSE:
//! - Define all shared data structures
//! - Provide serialization/deserialization for IPC
//! - Mirror TypeScript types defined in the frontend
//!
//! EXPORTS:
//! - project - Project, HealthScore, DetectionResult types
//! - module_doc - ModuleStatus, ModuleDoc types
//! - skill - Skill, Pattern types
//!
//! PATTERNS:
//! - All models derive Serialize, Deserialize for Tauri IPC
//! - Models are shared between commands and core modules
//! - Keep in sync with TypeScript types in src/types/
//!
//! CLAUDE NOTES:
//! - When modifying a model, update the corresponding TypeScript type
//! - See spec Part 6 for full data model definitions

pub mod project;
pub mod module_doc;
pub mod skill;
