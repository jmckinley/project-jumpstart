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
//! - parse_module_doc - Parse existing doc header from a file (local, no AI)
//! - generate_module_doc - Generate a doc template for a single file (uses AI if available)
//! - apply_module_doc - Write a doc header to a file
//! - batch_generate_docs - Generate and apply docs to multiple files
//!
//! PATTERNS:
//! - All commands are async and return Result<T, String>
//! - scan_modules returns Vec<ModuleStatus> for the file tree UI
//! - parse_module_doc is fast (local only) - use for instant preview of existing docs
//! - generate_module_doc is slow (AI call) - use when generating new docs
//! - apply_module_doc writes the doc header to the actual file
//! - batch_generate_docs combines generate + apply for multiple files
//!
//! CLAUDE NOTES:
//! - Commands registered in lib.rs invoke_handler
//! - project_path is the root project directory
//! - file_path is the absolute path to a single source file

use tauri::State;

use crate::core::ai;
use crate::core::analyzer;
use crate::db::{self, AppState};
use crate::models::module_doc::{ModuleDoc, ModuleStatus};

/// Scan all source files in a project and return their documentation status.
/// Used by the file tree UI to show status icons (current/missing).
#[tauri::command]
pub async fn scan_modules(project_path: String) -> Result<Vec<ModuleStatus>, String> {
    analyzer::scan_all_modules(&project_path)
}

/// Parse and return the existing documentation header from a file.
/// This is a fast, local-only operation that does NOT call AI.
/// Use this for previewing existing docs; use generate_module_doc for generating new ones.
#[tauri::command]
pub async fn parse_module_doc(
    file_path: String,
    project_path: String,
) -> Result<Option<ModuleDoc>, String> {
    let content = std::fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read {}: {}", file_path, e))?;

    // Parse existing doc header (returns None if no valid header)
    if let Some(mut doc) = analyzer::parse_doc_header(&content) {
        // If module_path is empty, fill it in from the file path
        if doc.module_path.is_empty() {
            let rel_path = file_path
                .strip_prefix(&project_path)
                .unwrap_or(&file_path)
                .trim_start_matches('/')
                .trim_start_matches("src/")
                .trim_start_matches("src-tauri/src/");
            let ext = std::path::Path::new(&file_path)
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("");
            doc.module_path = rel_path.trim_end_matches(&format!(".{}", ext)).to_string();
        }
        Ok(Some(doc))
    } else {
        Ok(None)
    }
}

/// Generate a documentation template for a single source file.
/// Tries AI generation first if API key is configured, falls back to template.
/// Returns the ModuleDoc without writing it to disk — the UI can preview it first.
#[tauri::command]
pub async fn generate_module_doc(
    file_path: String,
    project_path: String,
    state: State<'_, AppState>,
) -> Result<ModuleDoc, String> {
    // Try AI generation if API key is available
    let api_key_result = {
        let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
        ai::get_api_key(&db)
    };

    if let Ok(api_key) = api_key_result {
        let content = std::fs::read_to_string(&file_path)
            .map_err(|e| format!("Failed to read {}: {}", file_path, e))?;

        let ext = std::path::Path::new(&file_path)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("");

        let exports = analyzer::detect_exports(&content, ext);
        let imports = analyzer::detect_imports(&content, ext);

        match analyzer::generate_module_doc_with_ai(
            &file_path,
            &project_path,
            &content,
            &exports,
            &imports,
            &state.http_client,
            &api_key,
        )
        .await
        {
            Ok(doc) => return Ok(doc),
            Err(_) => {
                // Fall through to template generation
            }
        }
    }

    analyzer::generate_module_doc_for_file(&file_path, &project_path)
}

/// Apply a ModuleDoc header to a source file on disk.
/// If the file already has a doc header, it is replaced.
#[tauri::command]
pub async fn apply_module_doc(
    file_path: String,
    doc: ModuleDoc,
    state: State<'_, AppState>,
) -> Result<(), String> {
    analyzer::apply_doc_to_file(&file_path, &doc)?;

    // Log activity
    let filename = std::path::Path::new(&file_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("file");
    // Log activity (best-effort, non-critical)
    match state.db.lock() {
        Ok(db) => {
            let mut stmt = db
                .prepare("SELECT id, path FROM projects")
                .ok();
            if let Some(ref mut s) = stmt {
                let _ = s
                    .query_map([], |row| {
                        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
                    })
                    .ok()
                    .map(|rows| {
                        for r in rows.flatten() {
                            if file_path.starts_with(&r.1) {
                                let _ = db::log_activity_db(
                                    &db,
                                    &r.0,
                                    "generate",
                                    &format!("Applied docs to {}", filename),
                                );
                                break;
                            }
                        }
                    });
            }
        }
        Err(e) => eprintln!("Failed to lock DB for activity logging: {}", e),
    }

    Ok(())
}

/// Batch generate and apply documentation for multiple files.
/// Uses AI generation if API key is available, falls back to template.
/// Returns the updated status for each file after generation.
#[tauri::command]
pub async fn batch_generate_docs(
    file_paths: Vec<String>,
    project_path: String,
    state: State<'_, AppState>,
) -> Result<Vec<ModuleStatus>, String> {
    let api_key_result = {
        let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
        ai::get_api_key(&db)
    };

    let mut results = Vec::new();

    for file_path in &file_paths {
        let doc_result = if let Ok(ref api_key) = api_key_result {
            // Try AI generation — skip files >2MB to prevent OOM
            let content = std::fs::metadata(file_path)
                .ok()
                .filter(|m| m.len() <= 2_000_000)
                .and_then(|_| std::fs::read_to_string(file_path).ok());
            if let Some(content) = content {
                let ext = std::path::Path::new(file_path)
                    .extension()
                    .and_then(|e| e.to_str())
                    .unwrap_or("");
                let exports = analyzer::detect_exports(&content, ext);
                let imports = analyzer::detect_imports(&content, ext);

                match analyzer::generate_module_doc_with_ai(
                    file_path,
                    &project_path,
                    &content,
                    &exports,
                    &imports,
                    &state.http_client,
                    api_key,
                )
                .await
                {
                    Ok(doc) => Ok(doc),
                    Err(_) => analyzer::generate_module_doc_for_file(file_path, &project_path),
                }
            } else {
                analyzer::generate_module_doc_for_file(file_path, &project_path)
            }
        } else {
            analyzer::generate_module_doc_for_file(file_path, &project_path)
        };

        match doc_result {
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

    // Log activity (best-effort, non-critical)
    let count = file_paths.len();
    match state.db.lock() {
        Ok(db) => {
            if let Ok(pid) = db.query_row(
                "SELECT id FROM projects WHERE path = ?1",
                [&project_path],
                |row| row.get::<_, String>(0),
            ) {
                let _ = db::log_activity_db(
                    &db,
                    &pid,
                    "generate",
                    &format!("Generated docs for {} files", count),
                );
            }
        }
        Err(e) => eprintln!("Failed to lock DB for activity logging: {}", e),
    }

    Ok(results)
}
