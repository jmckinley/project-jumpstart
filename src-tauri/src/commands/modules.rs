//! @module commands/modules
//! @description Tauri IPC commands for module documentation management
//!
//! PURPOSE:
//! - Scan project files for documentation status
//! - Generate documentation for individual files
//! - Apply generated documentation to files
//! - Batch generate documentation for multiple files
//!
//! DEPENDENCIES:
//! - tauri - Command macro and State
//! - core::analyzer - Module scanning, doc generation, doc application
//! - models::module_doc - ModuleStatus, ModuleDoc types
//!
//! EXPORTS:
//! - scan_modules - Scan all source files and return documentation status
//! - generate_module_doc - Generate a doc template for a single file
//! - apply_module_doc - Write a doc header to a file
//! - batch_generate_docs - Generate and apply docs to multiple files
//!
//! PATTERNS:
//! - All commands are async and return Result<T, String>
//! - scan_modules returns Vec<ModuleStatus> for the file tree UI
//! - generate_module_doc returns a ModuleDoc without writing to disk
//! - apply_module_doc writes the doc header to the actual file
//! - batch_generate_docs combines generate + apply for multiple files
//!
//! CLAUDE NOTES:
//! - Commands registered in lib.rs invoke_handler
//! - project_path is the root project directory
//! - file_path is the absolute path to a single source file

use crate::core::analyzer;
use crate::models::module_doc::{ModuleDoc, ModuleStatus};

/// Scan all source files in a project and return their documentation status.
/// Used by the file tree UI to show status icons (current/missing).
#[tauri::command]
pub async fn scan_modules(project_path: String) -> Result<Vec<ModuleStatus>, String> {
    analyzer::scan_all_modules(&project_path)
}

/// Generate a documentation template for a single source file.
/// Returns the ModuleDoc without writing it to disk — the UI can preview it first.
#[tauri::command]
pub async fn generate_module_doc(
    file_path: String,
    project_path: String,
) -> Result<ModuleDoc, String> {
    analyzer::generate_module_doc_for_file(&file_path, &project_path)
}

/// Apply a ModuleDoc header to a source file on disk.
/// If the file already has a doc header, it is replaced.
#[tauri::command]
pub async fn apply_module_doc(file_path: String, doc: ModuleDoc) -> Result<(), String> {
    analyzer::apply_doc_to_file(&file_path, &doc)
}

/// Batch generate and apply documentation for multiple files.
/// Returns the updated status for each file after generation.
#[tauri::command]
pub async fn batch_generate_docs(
    file_paths: Vec<String>,
    project_path: String,
) -> Result<Vec<ModuleStatus>, String> {
    let mut results = Vec::new();

    for file_path in &file_paths {
        match analyzer::generate_module_doc_for_file(file_path, &project_path) {
            Ok(doc) => {
                if let Err(e) = analyzer::apply_doc_to_file(file_path, &doc) {
                    results.push(ModuleStatus {
                        path: file_path.clone(),
                        status: "missing".to_string(),
                        freshness_score: 0,
                        changes: Some(vec![format!("Failed to apply: {}", e)]),
                        suggested_doc: Some(doc),
                    });
                } else {
                    results.push(ModuleStatus {
                        path: file_path.clone(),
                        status: "current".to_string(),
                        freshness_score: 100,
                        changes: None,
                        suggested_doc: None,
                    });
                }
            }
            Err(e) => {
                results.push(ModuleStatus {
                    path: file_path.clone(),
                    status: "missing".to_string(),
                    freshness_score: 0,
                    changes: Some(vec![format!("Failed to generate: {}", e)]),
                    suggested_doc: None,
                });
            }
        }
    }

    Ok(results)
}
