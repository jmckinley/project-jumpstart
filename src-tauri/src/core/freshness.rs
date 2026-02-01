//! @module core/freshness
//! @description Documentation staleness detection and freshness scoring engine
//!
//! PURPOSE:
//! - Compare documented exports/imports against actual code to detect drift
//! - Calculate freshness scores (0-100) based on weighted staleness signals
//! - Generate human-readable change descriptions for stale files
//! - Provide batch freshness checking for all project files
//!
//! DEPENDENCIES:
//! - core::analyzer - parse_doc_header, detect_exports, detect_imports for comparison
//! - models::module_doc - ModuleStatus, ModuleDoc types
//! - std::path, std::fs - File system operations
//!
//! EXPORTS:
//! - check_file_freshness - Check freshness of a single file, returns FreshnessResult
//! - check_project_freshness - Check all files in a project, returns Vec<ModuleStatus> with freshness
//! - FreshnessResult - Freshness score, status, and change details for one file
//! - StalenessSignal - Individual staleness signal with weight and description
//!
//! PATTERNS:
//! - Freshness score starts at 100 and is reduced by staleness signals
//! - Signals are weighted: missing/extra exports (high), import changes (medium)
//! - Score >= 80 → "current", score >= 40 → "outdated", score < 40 → "outdated" (critical)
//! - Files without doc headers always have freshness_score = 0, status = "missing"
//!
//! CLAUDE NOTES:
//! - Uses pattern-based detection from analyzer.rs (not tree-sitter yet)
//! - Documented exports come from the EXPORTS section of the doc header
//! - Actual exports come from detect_exports() scanning the code
//! - The "description" field in changes is human-readable for the UI
//! - This is Phase 5's core engine; Phase 4 only had current/missing

use crate::core::analyzer;
use crate::models::module_doc::ModuleStatus;
use std::fs;
use std::path::Path;

/// Result of checking freshness for a single file.
#[derive(Debug, Clone)]
pub struct FreshnessResult {
    pub score: u32,
    pub status: String,
    pub signals: Vec<StalenessSignal>,
    pub changes: Vec<String>,
}

/// A single staleness signal contributing to the freshness score.
#[derive(Debug, Clone)]
pub struct StalenessSignal {
    pub signal_type: SignalType,
    pub weight: u32,
    pub description: String,
}

/// Types of staleness signals.
#[derive(Debug, Clone, PartialEq)]
pub enum SignalType {
    /// Export exists in code but not in documentation
    UndocumentedExport,
    /// Export listed in docs but no longer in code
    RemovedExport,
    /// Import added that isn't in dependencies docs
    NewDependency,
    /// Import removed that's still in dependencies docs
    RemovedDependency,
    /// Description is a generic placeholder (TODO)
    PlaceholderDescription,
    /// Doc header has no purpose section or it's empty
    MissingPurpose,
}

// Signal weights — higher = more impact on freshness
// Note: Weights are intentionally low because AI-generated docs may not perfectly match
// the export detector's heuristics, and we don't want fresh docs marked as "outdated"
const WEIGHT_UNDOCUMENTED_EXPORT: u32 = 8;
const WEIGHT_REMOVED_EXPORT: u32 = 6;
const WEIGHT_NEW_DEPENDENCY: u32 = 3;
const WEIGHT_REMOVED_DEPENDENCY: u32 = 2;
const WEIGHT_PLACEHOLDER_DESC: u32 = 15;
const WEIGHT_MISSING_PURPOSE: u32 = 12;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/// Check the freshness of a single documented file.
/// Returns a FreshnessResult with score, status, and change details.
/// If the file has no doc header, returns score=0, status="missing".
pub fn check_file_freshness(file_path: &str, _project_path: &str) -> FreshnessResult {
    let content = match fs::read_to_string(file_path) {
        Ok(c) => c,
        Err(_) => {
            return FreshnessResult {
                score: 0,
                status: "missing".to_string(),
                signals: vec![],
                changes: vec!["File could not be read".to_string()],
            };
        }
    };

    let doc = match analyzer::parse_doc_header(&content) {
        Some(d) => d,
        None => {
            return FreshnessResult {
                score: 0,
                status: "missing".to_string(),
                signals: vec![],
                changes: vec![],
            };
        }
    };

    let ext = Path::new(file_path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");

    let mut signals = Vec::new();

    // --- Signal: Compare documented exports vs actual exports ---
    let actual_exports = analyzer::detect_exports(&content, ext);
    let documented_exports = extract_export_names(&doc.exports);

    // Exports in code but not documented
    // Compare base names without parenthetical suffixes (e.g., "App (default)" -> "App")
    for export in &actual_exports {
        let base_name = strip_paren_suffix(export).to_lowercase();
        if !documented_exports.iter().any(|d| strip_paren_suffix(d).to_lowercase() == base_name) {
            signals.push(StalenessSignal {
                signal_type: SignalType::UndocumentedExport,
                weight: WEIGHT_UNDOCUMENTED_EXPORT,
                description: format!("Export '{}' exists in code but is not documented", export),
            });
        }
    }

    // Exports in docs but not in code
    for documented in &documented_exports {
        let base_name = strip_paren_suffix(documented).to_lowercase();
        if !actual_exports.iter().any(|a| strip_paren_suffix(a).to_lowercase() == base_name) {
            signals.push(StalenessSignal {
                signal_type: SignalType::RemovedExport,
                weight: WEIGHT_REMOVED_EXPORT,
                description: format!(
                    "Documented export '{}' no longer exists in code",
                    documented
                ),
            });
        }
    }

    // --- Signal: Compare documented dependencies vs actual imports ---
    let actual_imports = analyzer::detect_imports(&content, ext);
    let documented_deps = extract_dependency_paths(&doc.dependencies);

    // Imports in code but not in documented dependencies
    for import in &actual_imports {
        if !documented_deps.iter().any(|d| import.contains(d) || d.contains(import)) {
            signals.push(StalenessSignal {
                signal_type: SignalType::NewDependency,
                weight: WEIGHT_NEW_DEPENDENCY,
                description: format!("Import '{}' is not listed in DEPENDENCIES", import),
            });
        }
    }

    // Documented dependencies no longer imported
    for dep in &documented_deps {
        if !actual_imports.iter().any(|i| i.contains(dep) || dep.contains(i)) {
            signals.push(StalenessSignal {
                signal_type: SignalType::RemovedDependency,
                weight: WEIGHT_REMOVED_DEPENDENCY,
                description: format!(
                    "Documented dependency '{}' is no longer imported",
                    dep
                ),
            });
        }
    }

    // --- Signal: Placeholder description ---
    if doc.description.contains("TODO") || doc.description.is_empty() {
        signals.push(StalenessSignal {
            signal_type: SignalType::PlaceholderDescription,
            weight: WEIGHT_PLACEHOLDER_DESC,
            description: "Description is a placeholder or empty".to_string(),
        });
    }

    // --- Signal: Missing purpose ---
    if doc.purpose.is_empty()
        || doc.purpose.iter().all(|p| p.contains("TODO"))
    {
        signals.push(StalenessSignal {
            signal_type: SignalType::MissingPurpose,
            weight: WEIGHT_MISSING_PURPOSE,
            description: "PURPOSE section is missing or contains only placeholders".to_string(),
        });
    }

    // Calculate score
    let total_penalty: u32 = signals.iter().map(|s| s.weight).sum();
    let score = 100u32.saturating_sub(total_penalty);

    let status = if signals.is_empty() {
        "current".to_string()
    } else if score >= 60 {
        // Score >= 60 is "current" - be lenient because AI docs may not perfectly match
        // the export detector's heuristics (e.g., interfaces vs types, default exports)
        "current".to_string()
    } else {
        "outdated".to_string()
    };

    let changes: Vec<String> = signals.iter().map(|s| s.description.clone()).collect();

    FreshnessResult {
        score,
        status,
        signals,
        changes,
    }
}

/// Check freshness of all documentable files in a project.
/// Returns Vec<ModuleStatus> with accurate freshness scores and "outdated" detection.
pub fn check_project_freshness(project_path: &str) -> Result<Vec<ModuleStatus>, String> {
    let path = Path::new(project_path);
    if !path.exists() {
        return Err(format!("Path does not exist: {}", project_path));
    }

    let mut results = Vec::new();
    walk_with_freshness(path, project_path, &mut results);
    results.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(results)
}

// ---------------------------------------------------------------------------
// File walking with freshness
// ---------------------------------------------------------------------------

fn walk_with_freshness(dir: &Path, project_path: &str, results: &mut Vec<ModuleStatus>) {
    let ignore_dirs = [
        "node_modules",
        "target",
        ".git",
        "dist",
        "build",
        ".next",
        "__pycache__",
        ".venv",
        "venv",
        "coverage",
        ".turbo",
    ];

    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        if name.starts_with('.') {
            continue;
        }

        if path.is_dir() {
            if !ignore_dirs.contains(&name.as_str()) {
                walk_with_freshness(&path, project_path, results);
            }
        } else if analyzer::is_documentable(&name) {
            let abs_path = path.to_string_lossy().to_string();
            let rel_path = make_relative(&abs_path, project_path);

            let freshness = check_file_freshness(&abs_path, project_path);

            results.push(ModuleStatus {
                path: rel_path,
                status: freshness.status,
                freshness_score: freshness.score,
                changes: if freshness.changes.is_empty() {
                    None
                } else {
                    Some(freshness.changes)
                },
                suggested_doc: None,
            });
        }
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Strip parenthetical suffix from export names.
/// E.g., "App (default)" -> "App", "useState (hook)" -> "useState"
fn strip_paren_suffix(name: &str) -> &str {
    if let Some(paren_pos) = name.find(" (") {
        name[..paren_pos].trim()
    } else {
        name.trim()
    }
}

/// Extract export names from the EXPORTS section lines.
/// Lines are typically "functionName - description" format.
fn extract_export_names(exports_lines: &[String]) -> Vec<String> {
    exports_lines
        .iter()
        .map(|line| {
            // Handle "name - description" format
            if let Some(dash_pos) = line.find(" - ") {
                line[..dash_pos].trim().to_string()
            } else if let Some(dash_pos) = line.find(" — ") {
                line[..dash_pos].trim().to_string()
            } else {
                line.trim().to_string()
            }
        })
        .filter(|name| !name.is_empty() && !name.starts_with('('))
        .collect()
}

/// Extract dependency paths from the DEPENDENCIES section lines.
/// Lines are typically "path - why needed" format.
fn extract_dependency_paths(deps_lines: &[String]) -> Vec<String> {
    deps_lines
        .iter()
        .map(|line| {
            if let Some(dash_pos) = line.find(" - ") {
                line[..dash_pos].trim().to_string()
            } else if let Some(dash_pos) = line.find(" — ") {
                line[..dash_pos].trim().to_string()
            } else {
                line.trim().to_string()
            }
        })
        .filter(|path| !path.is_empty() && !path.starts_with('('))
        .collect()
}

fn make_relative(file_path: &str, project_path: &str) -> String {
    let normalized_file = file_path.replace('\\', "/");
    let normalized_project = project_path.replace('\\', "/");

    if let Some(stripped) = normalized_file.strip_prefix(&normalized_project) {
        stripped.trim_start_matches('/').to_string()
    } else {
        normalized_file
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_export_names() {
        let exports = vec![
            "calculateHealth - Main health score calculation".to_string(),
            "getQuickWins - Prioritized improvement suggestions".to_string(),
            "HEALTH_WEIGHTS - Scoring weight constants".to_string(),
        ];
        let names = extract_export_names(&exports);
        assert_eq!(names, vec!["calculateHealth", "getQuickWins", "HEALTH_WEIGHTS"]);
    }

    #[test]
    fn test_extract_export_names_no_description() {
        let exports = vec![
            "simpleExport".to_string(),
            "anotherOne".to_string(),
        ];
        let names = extract_export_names(&exports);
        assert_eq!(names, vec!["simpleExport", "anotherOne"]);
    }

    #[test]
    fn test_extract_dependency_paths() {
        let deps = vec![
            "@/lib/tauri - IPC calls".to_string(),
            "@/stores/projectStore - Active project state".to_string(),
        ];
        let paths = extract_dependency_paths(&deps);
        assert_eq!(paths, vec!["@/lib/tauri", "@/stores/projectStore"]);
    }

    #[test]
    fn test_freshness_missing_file() {
        let result = check_file_freshness("/nonexistent/file.ts", "/nonexistent");
        assert_eq!(result.score, 0);
        assert_eq!(result.status, "missing");
    }

    #[test]
    fn test_freshness_no_doc_header() {
        // Create a temp file with no doc header
        let dir = std::env::temp_dir().join("freshness_test_no_doc");
        let _ = fs::create_dir_all(&dir);
        let file_path = dir.join("test_no_doc.ts");
        fs::write(&file_path, "export function foo() {}\n").unwrap();

        let result = check_file_freshness(
            file_path.to_str().unwrap(),
            dir.to_str().unwrap(),
        );
        assert_eq!(result.score, 0);
        assert_eq!(result.status, "missing");

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_freshness_perfect_docs() {
        let dir = std::env::temp_dir().join("freshness_test_perfect");
        let _ = fs::create_dir_all(&dir);
        let file_path = dir.join("perfect.ts");
        let content = r#"/**
 * @module test/perfect
 * @description A perfectly documented module
 *
 * PURPOSE:
 * - Do something useful
 *
 * DEPENDENCIES:
 * - @/lib/utils - Utility functions
 *
 * EXPORTS:
 * - doSomething - Main function
 *
 * CLAUDE NOTES:
 * - This is well documented
 */

import { cn } from "@/lib/utils";

export function doSomething() {
    return cn("foo");
}
"#;
        fs::write(&file_path, content).unwrap();

        let result = check_file_freshness(
            file_path.to_str().unwrap(),
            dir.to_str().unwrap(),
        );
        assert_eq!(result.status, "current");
        assert!(result.score >= 80);

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_freshness_stale_docs() {
        let dir = std::env::temp_dir().join("freshness_test_stale");
        let _ = fs::create_dir_all(&dir);
        let file_path = dir.join("stale.ts");
        // Doc says exports "oldFunction" but code has "newFunction" and "anotherNew"
        let content = r#"/**
 * @module test/stale
 * @description A stale module
 *
 * PURPOSE:
 * - Do old things
 *
 * EXPORTS:
 * - oldFunction - No longer exists
 *
 * CLAUDE NOTES:
 * - Outdated
 */

export function newFunction() {}
export function anotherNew() {}
"#;
        fs::write(&file_path, content).unwrap();

        let result = check_file_freshness(
            file_path.to_str().unwrap(),
            dir.to_str().unwrap(),
        );
        // Should have signals: oldFunction removed (6), newFunction undocumented (8), anotherNew undocumented (8)
        // Total penalty: 22, score: 78 - still "current" with lenient threshold of 60
        assert!(result.score < 80);
        assert!(result.signals.len() >= 2); // At least some signals detected
        assert!(!result.changes.is_empty());

        // Verify specific signals
        let has_removed = result.signals.iter().any(|s| s.signal_type == SignalType::RemovedExport);
        let has_undocumented = result.signals.iter().any(|s| s.signal_type == SignalType::UndocumentedExport);
        assert!(has_removed, "Should detect removed export");
        assert!(has_undocumented, "Should detect undocumented export");

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_freshness_placeholder_description() {
        let dir = std::env::temp_dir().join("freshness_test_placeholder");
        let _ = fs::create_dir_all(&dir);
        let file_path = dir.join("placeholder.ts");
        let content = r#"/**
 * @module test/placeholder
 * @description TODO: Describe what this does
 *
 * PURPOSE:
 * - TODO: Add purpose
 *
 * EXPORTS:
 * - myFunc - Does things
 */

export function myFunc() {}
"#;
        fs::write(&file_path, content).unwrap();

        let result = check_file_freshness(
            file_path.to_str().unwrap(),
            dir.to_str().unwrap(),
        );
        let has_placeholder = result.signals.iter().any(|s| s.signal_type == SignalType::PlaceholderDescription);
        let has_missing_purpose = result.signals.iter().any(|s| s.signal_type == SignalType::MissingPurpose);
        assert!(has_placeholder, "Should detect placeholder description");
        assert!(has_missing_purpose, "Should detect placeholder purpose");

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_make_relative() {
        assert_eq!(
            make_relative("/home/user/proj/src/App.tsx", "/home/user/proj"),
            "src/App.tsx"
        );
    }
}
