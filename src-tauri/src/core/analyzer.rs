//! @module core/analyzer
//! @description Code analysis engine for module documentation scanning and generation
//!
//! PURPOSE:
//! - Scan all source files in a project and determine documentation status
//! - Parse existing doc headers to extract structured ModuleDoc data
//! - Detect exports/imports via pattern matching
//! - Generate template-based documentation for undocumented files
//!
//! DEPENDENCIES:
//! - models::module_doc - ModuleStatus, ModuleDoc types
//! - std::path - File path operations
//! - std::fs - File system reading
//!
//! EXPORTS:
//! - scan_all_modules - Walk project files and return Vec<ModuleStatus>
//! - parse_doc_header - Extract ModuleDoc from file content
//! - generate_module_doc_for_file - Generate a ModuleDoc template for a file
//! - apply_doc_to_file - Prepend or replace doc header in a file
//! - detect_exports - Pattern-based export detection for a file's content
//! - detect_imports - Pattern-based import detection for a file's content
//! - is_documentable - Check if a filename should have documentation
//!
//! PATTERNS:
//! - Uses pattern-based detection (regex-like string matching), not tree-sitter AST
//! - Skips node_modules, target, dist, build, .git, __pycache__ directories
//! - Recognizes .ts, .tsx, .js, .jsx, .rs, .py, .go extensions
//! - Doc status: "current" (fresh), "outdated" (stale docs), "missing" (no header)
//! - Phase 5 freshness detection is integrated via core::freshness
//!
//! CLAUDE NOTES:
//! - TypeScript doc headers use /** ... */ with @module/@description
//! - Rust doc headers use //! with @module/@description
//! - Python doc headers use triple-quote docstrings with @module/@description
//! - The header_area is the first 40 lines of a file
//! - Exports detection is approximate — pattern-based, not tree-sitter
//! - walk_for_modules delegates to freshness::check_file_freshness for accurate status

use crate::models::module_doc::{ModuleDoc, ModuleStatus};
use std::fs;
use std::path::Path;

/// Directories to skip when scanning for modules.
const IGNORE_DIRS: &[&str] = &[
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

/// Extensions that should have documentation headers.
const DOC_EXTENSIONS: &[&str] = &[
    ".ts", ".tsx", ".js", ".jsx", ".rs", ".py", ".go",
];

/// Files to skip even if they have a documentable extension.
const SKIP_FILES: &[&str] = &[
    "mod.rs",
    "main.rs",
    "lib.rs",
    "index.ts",
    "index.js",
    "main.ts",
    "main.tsx",
    "vite-env.d.ts",
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/// Scan all source files in a project directory and return their documentation status.
/// Returns a list of ModuleStatus entries, one per documentable source file.
pub fn scan_all_modules(project_path: &str) -> Result<Vec<ModuleStatus>, String> {
    let path = Path::new(project_path);
    if !path.exists() {
        return Err(format!("Path does not exist: {}", project_path));
    }
    if !path.is_dir() {
        return Err(format!("Path is not a directory: {}", project_path));
    }

    let mut results = Vec::new();
    walk_for_modules(path, project_path, &mut results);

    // Sort by path for consistent display
    results.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(results)
}

/// Parse a file's content and extract its documentation header as a ModuleDoc.
/// Returns None if no valid doc header is found.
pub fn parse_doc_header(content: &str) -> Option<ModuleDoc> {
    let header_area: String = content.lines().take(40).collect::<Vec<_>>().join("\n");

    // Check for @module marker
    if !header_area.contains("@module") {
        return None;
    }

    let module_path = extract_field(&header_area, "@module");
    let description = extract_field(&header_area, "@description");

    if module_path.is_empty() && description.is_empty() {
        return None;
    }

    let purpose = extract_list_section(content, "PURPOSE:");
    let dependencies = extract_list_section(content, "DEPENDENCIES:");
    let exports = extract_list_section(content, "EXPORTS:");
    let patterns = extract_list_section(content, "PATTERNS:");
    let claude_notes = extract_list_section(content, "CLAUDE NOTES:");

    Some(ModuleDoc {
        module_path,
        description,
        purpose,
        dependencies,
        exports,
        patterns,
        claude_notes,
    })
}

/// Generate a template ModuleDoc for a source file.
/// Reads the file, detects exports/imports, and builds a documentation template.
pub fn generate_module_doc_for_file(
    file_path: &str,
    project_path: &str,
) -> Result<ModuleDoc, String> {
    let content = fs::read_to_string(file_path)
        .map_err(|e| format!("Failed to read {}: {}", file_path, e))?;

    let rel_path = make_relative_path(file_path, project_path);
    let ext = Path::new(file_path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");

    let exports = detect_exports(&content, ext);
    let imports = detect_imports(&content, ext);
    let description = infer_description(&rel_path, &exports);

    // Build a module path (e.g., "components/dashboard/HealthScore")
    let module_path = rel_path
        .trim_start_matches("src/")
        .trim_start_matches("src-tauri/src/")
        .trim_end_matches(&format!(".{}", ext))
        .to_string();

    Ok(ModuleDoc {
        module_path,
        description,
        purpose: vec![format!(
            "TODO: Describe the main responsibility of {}",
            Path::new(file_path)
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("this module")
        )],
        dependencies: imports
            .into_iter()
            .map(|i| format!("{} - TODO: why needed", i))
            .collect(),
        exports: exports
            .into_iter()
            .map(|e| format!("{} - TODO: what it does", e))
            .collect(),
        patterns: vec!["TODO: Describe usage patterns".to_string()],
        claude_notes: vec!["TODO: Add important context for Claude".to_string()],
    })
}

/// Apply a ModuleDoc as a documentation header to a file.
/// If the file already has a doc header, it is replaced. Otherwise, the header is prepended.
pub fn apply_doc_to_file(file_path: &str, doc: &ModuleDoc) -> Result<(), String> {
    let content = fs::read_to_string(file_path)
        .map_err(|e| format!("Failed to read {}: {}", file_path, e))?;

    let ext = Path::new(file_path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");

    let header = format_doc_header(doc, ext);
    let new_content = if has_doc_header(&content) {
        replace_doc_header(&content, &header, ext)
    } else {
        format!("{}\n{}", header, content)
    };

    fs::write(file_path, new_content)
        .map_err(|e| format!("Failed to write {}: {}", file_path, e))?;

    Ok(())
}

// ---------------------------------------------------------------------------
// File walking
// ---------------------------------------------------------------------------

fn walk_for_modules(dir: &Path, project_path: &str, results: &mut Vec<ModuleStatus>) {
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
            if !IGNORE_DIRS.contains(&name.as_str()) {
                walk_for_modules(&path, project_path, results);
            }
        } else if is_documentable(&name) {
            let abs_path = path.to_string_lossy().to_string();
            let rel_path = make_relative_path(&abs_path, project_path);

            // Delegate to freshness engine for accurate status/score
            let freshness = super::freshness::check_file_freshness(&abs_path, project_path);

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

pub fn is_documentable(name: &str) -> bool {
    if SKIP_FILES.contains(&name) {
        return false;
    }
    if name.starts_with('.') {
        return false;
    }
    // Skip test files
    if name.contains(".test.") || name.contains(".spec.") || name.starts_with("test_") {
        return false;
    }
    DOC_EXTENSIONS.iter().any(|ext| name.ends_with(ext))
}

// ---------------------------------------------------------------------------
// Doc header detection and parsing
// ---------------------------------------------------------------------------

fn has_doc_header(content: &str) -> bool {
    let header_area: String = content.lines().take(40).collect::<Vec<_>>().join("\n");
    header_area.contains("@module") || header_area.contains("@description")
}

/// Extract the value following a field marker like "@module" or "@description".
fn extract_field(header: &str, field: &str) -> String {
    for line in header.lines() {
        let trimmed = line
            .trim()
            .trim_start_matches("/**")
            .trim_start_matches("*/")
            .trim_start_matches("*")
            .trim_start_matches("//!")
            .trim_start_matches("//")
            .trim_start_matches('#')
            .trim();

        if trimmed.starts_with(field) {
            return trimmed
                .trim_start_matches(field)
                .trim()
                .to_string();
        }
    }
    String::new()
}

/// Extract a bullet-list section (e.g., "PURPOSE:\n * - item1\n * - item2").
fn extract_list_section(content: &str, section_name: &str) -> Vec<String> {
    let mut items = Vec::new();
    let mut in_section = false;

    // Only look at the header area (first 60 lines to accommodate large headers)
    for line in content.lines().take(60) {
        let trimmed = line
            .trim()
            .trim_start_matches("/**")
            .trim_start_matches("*/")
            .trim_start_matches("*")
            .trim_start_matches("//!")
            .trim_start_matches("//")
            .trim_start_matches('#')
            .trim();

        if trimmed.starts_with(section_name) {
            in_section = true;
            continue;
        }

        if in_section {
            if trimmed.starts_with("- ") {
                items.push(trimmed.trim_start_matches("- ").to_string());
            } else if trimmed.is_empty() || trimmed == "*" || trimmed == "//!" {
                // Empty line: might be between sections, continue looking
            } else if trimmed.ends_with(':')
                && trimmed.chars().next().map_or(false, |c| c.is_uppercase())
            {
                // Found another section header, stop
                break;
            }
        }
    }

    items
}

// ---------------------------------------------------------------------------
// Export / import detection (pattern-based)
// ---------------------------------------------------------------------------

pub fn detect_exports(content: &str, ext: &str) -> Vec<String> {
    let mut exports = Vec::new();

    match ext {
        "ts" | "tsx" | "js" | "jsx" => {
            for line in content.lines() {
                let trimmed = line.trim();

                // export function name(
                if trimmed.starts_with("export function ") || trimmed.starts_with("export async function ") {
                    if let Some(name) = extract_ts_function_name(trimmed) {
                        exports.push(name);
                    }
                }
                // export const name
                else if trimmed.starts_with("export const ") {
                    if let Some(name) = extract_ts_const_name(trimmed) {
                        exports.push(name);
                    }
                }
                // export interface name
                else if trimmed.starts_with("export interface ") {
                    if let Some(name) = extract_word_after(trimmed, "export interface ") {
                        exports.push(name);
                    }
                }
                // export type name
                else if trimmed.starts_with("export type ") && !trimmed.starts_with("export type {") {
                    if let Some(name) = extract_word_after(trimmed, "export type ") {
                        exports.push(name);
                    }
                }
                // export class name
                else if trimmed.starts_with("export class ") {
                    if let Some(name) = extract_word_after(trimmed, "export class ") {
                        exports.push(name);
                    }
                }
                // export default function Name
                else if trimmed.starts_with("export default function ") {
                    if let Some(name) = extract_ts_function_name(
                        trimmed.trim_start_matches("export default "),
                    ) {
                        exports.push(format!("{} (default)", name));
                    }
                }
            }
        }
        "rs" => {
            for line in content.lines() {
                let trimmed = line.trim();

                // pub fn name
                if trimmed.starts_with("pub fn ") || trimmed.starts_with("pub async fn ") {
                    if let Some(name) = extract_rust_fn_name(trimmed) {
                        exports.push(name);
                    }
                }
                // pub struct Name
                else if trimmed.starts_with("pub struct ") {
                    if let Some(name) = extract_word_after(trimmed, "pub struct ") {
                        exports.push(name);
                    }
                }
                // pub enum Name
                else if trimmed.starts_with("pub enum ") {
                    if let Some(name) = extract_word_after(trimmed, "pub enum ") {
                        exports.push(name);
                    }
                }
                // pub const NAME
                else if trimmed.starts_with("pub const ") {
                    if let Some(name) = extract_word_after(trimmed, "pub const ") {
                        // Remove the `: type` part
                        let name = name.trim_end_matches(':').to_string();
                        exports.push(name);
                    }
                }
                // pub type Name
                else if trimmed.starts_with("pub type ") {
                    if let Some(name) = extract_word_after(trimmed, "pub type ") {
                        exports.push(name);
                    }
                }
                // pub trait Name
                else if trimmed.starts_with("pub trait ") {
                    if let Some(name) = extract_word_after(trimmed, "pub trait ") {
                        exports.push(name);
                    }
                }
            }
        }
        "py" => {
            for line in content.lines() {
                let trimmed = line.trim();

                // def function_name(
                if trimmed.starts_with("def ") || trimmed.starts_with("async def ") {
                    let after = trimmed
                        .trim_start_matches("async ")
                        .trim_start_matches("def ");
                    if let Some(paren_pos) = after.find('(') {
                        let name = &after[..paren_pos];
                        if !name.starts_with('_') {
                            exports.push(name.to_string());
                        }
                    }
                }
                // class ClassName
                else if trimmed.starts_with("class ") {
                    if let Some(name) = extract_word_after(trimmed, "class ") {
                        let name = name.trim_end_matches(':').trim_end_matches('(').to_string();
                        exports.push(name);
                    }
                }
            }
        }
        "go" => {
            for line in content.lines() {
                let trimmed = line.trim();

                // func FunctionName(
                if trimmed.starts_with("func ") {
                    let after = trimmed.trim_start_matches("func ");
                    // Skip methods (func (r *Receiver) Name)
                    if !after.starts_with('(') {
                        if let Some(paren_pos) = after.find('(') {
                            let name = &after[..paren_pos];
                            // Go exported functions start with uppercase
                            if name.chars().next().map_or(false, |c| c.is_uppercase()) {
                                exports.push(name.to_string());
                            }
                        }
                    }
                }
                // type TypeName struct/interface
                else if trimmed.starts_with("type ") {
                    if let Some(name) = extract_word_after(trimmed, "type ") {
                        if name.chars().next().map_or(false, |c| c.is_uppercase()) {
                            exports.push(name);
                        }
                    }
                }
            }
        }
        _ => {}
    }

    exports
}

pub fn detect_imports(content: &str, ext: &str) -> Vec<String> {
    let mut imports = Vec::new();

    match ext {
        "ts" | "tsx" | "js" | "jsx" => {
            for line in content.lines() {
                let trimmed = line.trim();
                // import ... from "path"
                if trimmed.starts_with("import ") {
                    if let Some(from_idx) = trimmed.find(" from ") {
                        let path_part = &trimmed[from_idx + 6..];
                        let path = path_part
                            .trim()
                            .trim_end_matches(';')
                            .trim()
                            .trim_matches('"')
                            .trim_matches('\'');
                        // Only include non-node_modules imports
                        if path.starts_with("@/") || path.starts_with("./") || path.starts_with("../") {
                            imports.push(path.to_string());
                        }
                    }
                }
            }
        }
        "rs" => {
            for line in content.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with("use crate::") {
                    let module = trimmed
                        .trim_start_matches("use crate::")
                        .trim_end_matches(';')
                        .to_string();
                    imports.push(module);
                }
            }
        }
        "py" => {
            for line in content.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with("from ") || trimmed.starts_with("import ") {
                    if !trimmed.starts_with("from __future__") {
                        let module = trimmed
                            .trim_start_matches("from ")
                            .trim_start_matches("import ")
                            .split_whitespace()
                            .next()
                            .unwrap_or("")
                            .to_string();
                        if !module.is_empty() {
                            imports.push(module);
                        }
                    }
                }
            }
        }
        "go" => {
            // Go imports are complex (import blocks), just grab simple ones
            for line in content.lines() {
                let trimmed = line.trim().trim_matches('"');
                if trimmed.contains('/') && !trimmed.starts_with("//") && !trimmed.starts_with("func") {
                    // Inside import block
                    if !trimmed.contains("func") && !trimmed.contains("var") {
                        // This is simplified; real Go import detection would parse import blocks
                    }
                }
            }
        }
        _ => {}
    }

    imports
}

// ---------------------------------------------------------------------------
// Doc header formatting
// ---------------------------------------------------------------------------

fn format_doc_header(doc: &ModuleDoc, ext: &str) -> String {
    match ext {
        "ts" | "tsx" | "js" | "jsx" => format_ts_doc_header(doc),
        "rs" => format_rust_doc_header(doc),
        "py" => format_python_doc_header(doc),
        "go" => format_go_doc_header(doc),
        _ => format_ts_doc_header(doc), // fallback
    }
}

fn format_ts_doc_header(doc: &ModuleDoc) -> String {
    let mut lines = Vec::new();
    lines.push("/**".to_string());
    lines.push(format!(" * @module {}", doc.module_path));
    lines.push(format!(" * @description {}", doc.description));
    lines.push(" *".to_string());

    if !doc.purpose.is_empty() {
        lines.push(" * PURPOSE:".to_string());
        for item in &doc.purpose {
            lines.push(format!(" * - {}", item));
        }
        lines.push(" *".to_string());
    }

    if !doc.dependencies.is_empty() {
        lines.push(" * DEPENDENCIES:".to_string());
        for item in &doc.dependencies {
            lines.push(format!(" * - {}", item));
        }
        lines.push(" *".to_string());
    }

    if !doc.exports.is_empty() {
        lines.push(" * EXPORTS:".to_string());
        for item in &doc.exports {
            lines.push(format!(" * - {}", item));
        }
        lines.push(" *".to_string());
    }

    if !doc.patterns.is_empty() {
        lines.push(" * PATTERNS:".to_string());
        for item in &doc.patterns {
            lines.push(format!(" * - {}", item));
        }
        lines.push(" *".to_string());
    }

    if !doc.claude_notes.is_empty() {
        lines.push(" * CLAUDE NOTES:".to_string());
        for item in &doc.claude_notes {
            lines.push(format!(" * - {}", item));
        }
    }

    lines.push(" */".to_string());
    lines.join("\n")
}

fn format_rust_doc_header(doc: &ModuleDoc) -> String {
    let mut lines = Vec::new();
    lines.push(format!("//! @module {}", doc.module_path));
    lines.push(format!("//! @description {}", doc.description));
    lines.push("//!".to_string());

    if !doc.purpose.is_empty() {
        lines.push("//! PURPOSE:".to_string());
        for item in &doc.purpose {
            lines.push(format!("//! - {}", item));
        }
        lines.push("//!".to_string());
    }

    if !doc.dependencies.is_empty() {
        lines.push("//! DEPENDENCIES:".to_string());
        for item in &doc.dependencies {
            lines.push(format!("//! - {}", item));
        }
        lines.push("//!".to_string());
    }

    if !doc.exports.is_empty() {
        lines.push("//! EXPORTS:".to_string());
        for item in &doc.exports {
            lines.push(format!("//! - {}", item));
        }
        lines.push("//!".to_string());
    }

    if !doc.patterns.is_empty() {
        lines.push("//! PATTERNS:".to_string());
        for item in &doc.patterns {
            lines.push(format!("//! - {}", item));
        }
        lines.push("//!".to_string());
    }

    if !doc.claude_notes.is_empty() {
        lines.push("//! CLAUDE NOTES:".to_string());
        for item in &doc.claude_notes {
            lines.push(format!("//! - {}", item));
        }
    }

    lines.join("\n")
}

fn format_python_doc_header(doc: &ModuleDoc) -> String {
    let mut lines = Vec::new();
    lines.push("\"\"\"".to_string());
    lines.push(format!("@module {}", doc.module_path));
    lines.push(format!("@description {}", doc.description));
    lines.push(String::new());

    if !doc.purpose.is_empty() {
        lines.push("PURPOSE:".to_string());
        for item in &doc.purpose {
            lines.push(format!("- {}", item));
        }
        lines.push(String::new());
    }

    if !doc.exports.is_empty() {
        lines.push("EXPORTS:".to_string());
        for item in &doc.exports {
            lines.push(format!("- {}", item));
        }
        lines.push(String::new());
    }

    if !doc.claude_notes.is_empty() {
        lines.push("CLAUDE NOTES:".to_string());
        for item in &doc.claude_notes {
            lines.push(format!("- {}", item));
        }
    }

    lines.push("\"\"\"".to_string());
    lines.join("\n")
}

fn format_go_doc_header(doc: &ModuleDoc) -> String {
    let mut lines = Vec::new();
    lines.push(format!("// @module {}", doc.module_path));
    lines.push(format!("// @description {}", doc.description));
    lines.push("//".to_string());

    if !doc.purpose.is_empty() {
        lines.push("// PURPOSE:".to_string());
        for item in &doc.purpose {
            lines.push(format!("// - {}", item));
        }
        lines.push("//".to_string());
    }

    if !doc.exports.is_empty() {
        lines.push("// EXPORTS:".to_string());
        for item in &doc.exports {
            lines.push(format!("// - {}", item));
        }
        lines.push("//".to_string());
    }

    if !doc.claude_notes.is_empty() {
        lines.push("// CLAUDE NOTES:".to_string());
        for item in &doc.claude_notes {
            lines.push(format!("// - {}", item));
        }
    }

    lines.join("\n")
}

/// Replace an existing doc header in a file with a new one.
fn replace_doc_header(content: &str, new_header: &str, ext: &str) -> String {
    let lines: Vec<&str> = content.lines().collect();

    // Find the end of the existing doc header
    let header_end = match ext {
        "ts" | "tsx" | "js" | "jsx" => {
            // Find closing */
            lines
                .iter()
                .position(|l| l.trim() == "*/")
                .map(|i| i + 1)
                .unwrap_or(0)
        }
        "rs" => {
            // Find last consecutive //! line
            let mut last_doc = 0;
            for (i, line) in lines.iter().enumerate() {
                let trimmed = line.trim();
                if trimmed.starts_with("//!") {
                    last_doc = i + 1;
                } else if !trimmed.is_empty() {
                    break;
                }
            }
            last_doc
        }
        "py" => {
            // Find closing """
            let mut in_docstring = false;
            let mut end = 0;
            for (i, line) in lines.iter().enumerate() {
                let trimmed = line.trim();
                if i == 0 && trimmed == "\"\"\"" {
                    in_docstring = true;
                } else if in_docstring && trimmed.contains("\"\"\"") {
                    end = i + 1;
                    break;
                }
            }
            end
        }
        _ => 0,
    };

    if header_end == 0 {
        // No header found, prepend
        return format!("{}\n{}", new_header, content);
    }

    let remaining = lines[header_end..].join("\n");
    format!("{}\n{}", new_header, remaining)
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

fn make_relative_path(file_path: &str, project_path: &str) -> String {
    let normalized_file = file_path.replace('\\', "/");
    let normalized_project = project_path.replace('\\', "/");

    if let Some(stripped) = normalized_file.strip_prefix(&normalized_project) {
        stripped.trim_start_matches('/').to_string()
    } else {
        normalized_file
    }
}

fn extract_ts_function_name(line: &str) -> Option<String> {
    let after = line
        .trim_start_matches("export ")
        .trim_start_matches("default ")
        .trim_start_matches("async ")
        .trim_start_matches("function ");

    after.find('(').map(|pos| after[..pos].trim().to_string())
}

fn extract_ts_const_name(line: &str) -> Option<String> {
    let after = line.trim_start_matches("export const ");
    // Find either = or : (for typed constants)
    let end = after
        .find('=')
        .or_else(|| after.find(':'))
        .or_else(|| after.find(' '));

    end.map(|pos| after[..pos].trim().to_string())
}

fn extract_rust_fn_name(line: &str) -> Option<String> {
    let after = line
        .trim_start_matches("pub ")
        .trim_start_matches("async ")
        .trim_start_matches("fn ");

    // Handle generic parameters
    let end = after
        .find('(')
        .or_else(|| after.find('<'));

    end.map(|pos| after[..pos].trim().to_string())
}

fn extract_word_after(line: &str, prefix: &str) -> Option<String> {
    if !line.starts_with(prefix) {
        return None;
    }
    let after = &line[prefix.len()..];
    let end = after
        .find(|c: char| !c.is_alphanumeric() && c != '_')
        .unwrap_or(after.len());

    if end > 0 {
        Some(after[..end].to_string())
    } else {
        None
    }
}

fn infer_description(rel_path: &str, exports: &[String]) -> String {
    let file_stem = Path::new(rel_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("module");

    if exports.len() == 1 {
        format!(
            "Module providing {} functionality",
            exports[0].replace('_', " ")
        )
    } else if exports.is_empty() {
        format!("TODO: Describe what {} does", file_stem)
    } else {
        format!(
            "Module providing {} and {} more exports",
            exports[0].replace('_', " "),
            exports.len() - 1
        )
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_ts_doc_header() {
        let content = r#"/**
 * @module components/dashboard/HealthScore
 * @description Displays the project health score with visual breakdown
 *
 * PURPOSE:
 * - Render health score circle
 * - Show component breakdown bars
 *
 * EXPORTS:
 * - HealthScore - Main component
 * - HealthScoreProps - Props interface
 *
 * CLAUDE NOTES:
 * - Score range is 0-100
 */

import React from "react";
export function HealthScore() {}
"#;

        let doc = parse_doc_header(content).unwrap();
        assert_eq!(doc.module_path, "components/dashboard/HealthScore");
        assert_eq!(
            doc.description,
            "Displays the project health score with visual breakdown"
        );
        assert_eq!(doc.purpose.len(), 2);
        assert_eq!(doc.exports.len(), 2);
        assert_eq!(doc.claude_notes.len(), 1);
    }

    #[test]
    fn test_parse_rust_doc_header() {
        let content = r#"//! @module core/scanner
//! @description Project detection and scanning engine
//!
//! PURPOSE:
//! - Detect project language
//! - Identify framework
//!
//! EXPORTS:
//! - scan_project_dir - Main scanning function
"#;

        let doc = parse_doc_header(content).unwrap();
        assert_eq!(doc.module_path, "core/scanner");
        assert_eq!(doc.description, "Project detection and scanning engine");
        assert_eq!(doc.purpose.len(), 2);
        assert_eq!(doc.exports.len(), 1);
    }

    #[test]
    fn test_no_doc_header() {
        let content = "const x = 1;\nconsole.log(x);\n";
        assert!(parse_doc_header(content).is_none());
    }

    #[test]
    fn test_detect_ts_exports() {
        let content = r#"
import { invoke } from "@tauri-apps/api/core";

export interface Project {
  id: string;
  name: string;
}

export type ProjectType = "web" | "api";

export const LANGUAGES = ["TypeScript", "Rust"] as const;

export function getProject(id: string): Promise<Project> {
  return invoke("get_project", { id });
}

export async function listProjects(): Promise<Project[]> {
  return invoke("list_projects");
}

export class ProjectManager {
  constructor() {}
}
"#;

        let exports = detect_exports(content, "ts");
        assert!(exports.contains(&"Project".to_string()));
        assert!(exports.contains(&"ProjectType".to_string()));
        assert!(exports.contains(&"LANGUAGES".to_string()));
        assert!(exports.contains(&"getProject".to_string()));
        assert!(exports.contains(&"listProjects".to_string()));
        assert!(exports.contains(&"ProjectManager".to_string()));
    }

    #[test]
    fn test_detect_rust_exports() {
        let content = r#"
use serde::{Deserialize, Serialize};

pub struct Project {
    pub id: String,
}

pub enum Status {
    Active,
    Inactive,
}

pub const MAX_SIZE: u32 = 100;

pub fn calculate_health(path: &str) -> u32 {
    0
}

pub async fn fetch_data() -> Result<(), String> {
    Ok(())
}

fn private_function() {}
"#;

        let exports = detect_exports(content, "rs");
        assert!(exports.contains(&"Project".to_string()));
        assert!(exports.contains(&"Status".to_string()));
        assert!(exports.contains(&"MAX_SIZE".to_string()));
        assert!(exports.contains(&"calculate_health".to_string()));
        assert!(exports.contains(&"fetch_data".to_string()));
        assert!(!exports.contains(&"private_function".to_string()));
    }

    #[test]
    fn test_detect_python_exports() {
        let content = r#"
import os
from pathlib import Path

def calculate_score(value: int) -> float:
    return value / 100.0

async def fetch_data():
    pass

class HealthMonitor:
    def __init__(self):
        pass

def _private_helper():
    pass
"#;

        let exports = detect_exports(content, "py");
        assert!(exports.contains(&"calculate_score".to_string()));
        assert!(exports.contains(&"fetch_data".to_string()));
        assert!(exports.contains(&"HealthMonitor".to_string()));
        assert!(!exports.contains(&"_private_helper".to_string()));
    }

    #[test]
    fn test_detect_ts_imports() {
        let content = r#"
import { invoke } from "@tauri-apps/api/core";
import { useProjectStore } from "@/stores/projectStore";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/project";
import React from "react";
"#;

        let imports = detect_imports(content, "ts");
        assert!(imports.contains(&"@/stores/projectStore".to_string()));
        assert!(imports.contains(&"@/lib/utils".to_string()));
        assert!(imports.contains(&"@/types/project".to_string()));
        // External deps should not be included
        assert!(!imports.contains(&"react".to_string()));
    }

    #[test]
    fn test_format_ts_doc_header() {
        let doc = ModuleDoc {
            module_path: "hooks/useHealth".to_string(),
            description: "Custom hook for health scores".to_string(),
            purpose: vec!["Fetch health data".to_string()],
            dependencies: vec!["@/lib/tauri - IPC calls".to_string()],
            exports: vec!["useHealth - Hook function".to_string()],
            patterns: vec!["Call refresh() on mount".to_string()],
            claude_notes: vec!["Score range 0-100".to_string()],
        };

        let header = format_ts_doc_header(&doc);
        assert!(header.starts_with("/**"));
        assert!(header.ends_with(" */"));
        assert!(header.contains("@module hooks/useHealth"));
        assert!(header.contains("PURPOSE:"));
        assert!(header.contains("- Fetch health data"));
    }

    #[test]
    fn test_make_relative_path() {
        assert_eq!(
            make_relative_path(
                "/home/user/project/src/App.tsx",
                "/home/user/project"
            ),
            "src/App.tsx"
        );
        assert_eq!(
            make_relative_path(
                "/home/user/project/src-tauri/src/lib.rs",
                "/home/user/project"
            ),
            "src-tauri/src/lib.rs"
        );
    }

    #[test]
    fn test_is_documentable() {
        assert!(is_documentable("App.tsx"));
        assert!(is_documentable("scanner.rs"));
        assert!(is_documentable("utils.py"));
        assert!(is_documentable("handler.go"));
        assert!(!is_documentable("mod.rs"));
        assert!(!is_documentable("main.rs"));
        assert!(!is_documentable("lib.rs"));
        assert!(!is_documentable("index.ts"));
        assert!(!is_documentable(".gitignore"));
        assert!(!is_documentable("readme.md"));
        assert!(!is_documentable("App.test.tsx"));
        assert!(!is_documentable("scanner.spec.ts"));
        assert!(!is_documentable("test_scanner.py"));
    }
}
