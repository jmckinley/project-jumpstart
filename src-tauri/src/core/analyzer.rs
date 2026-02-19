//! @module core/analyzer
//! @description Code analysis engine for module documentation scanning and generation
//!
//! PURPOSE:
//! - Scan all source files in a project and determine documentation status
//! - Parse existing doc headers to extract structured ModuleDoc data
//! - Detect exports/imports via pattern matching
//! - Generate template-based documentation for undocumented files
//! - Generate AI-powered documentation when an API key is available
//!
//! DEPENDENCIES:
//! - models::module_doc - ModuleStatus, ModuleDoc types
//! - core::ai - Claude API caller for AI-powered doc generation
//! - std::path - File path operations
//! - std::fs - File system reading
//!
//! EXPORTS:
//! - scan_all_modules - Walk project files and return Vec<ModuleStatus>
//! - parse_doc_header - Extract ModuleDoc from file content
//! - generate_module_doc_for_file - Generate a ModuleDoc template for a file
//! - generate_module_doc_with_ai - Generate a ModuleDoc using the Claude API
//! - apply_doc_to_file - Prepend or replace doc header in a file
//! - detect_exports - Pattern-based export detection for a file's content
//! - detect_imports - Pattern-based import detection for a file's content
//! - is_documentable - Check if a filename should have documentation
//!
//! PATTERNS:
//! - Uses pattern-based detection (regex-like string matching), not tree-sitter AST
//! - Skips node_modules, target, dist, build, .git, __pycache__ directories
//! - Recognizes .ts, .tsx, .js, .jsx, .rs, .py, .go, .java, .kt, .swift extensions
//! - Doc status: "current" (fresh), "outdated" (stale docs), "missing" (no header)
//! - Phase 5 freshness detection is integrated via core::freshness
//! - AI generation truncates file content to ~8k chars to stay within prompt limits
//!
//! CLAUDE NOTES:
//! - TypeScript/JS doc headers use /** ... */ with @module/@description (JSDoc)
//! - Rust doc headers use //! with @module/@description
//! - Python doc headers use triple-quote docstrings with @module/@description
//! - Go doc headers use // with @module/@description
//! - Java doc headers use /** ... */ with @module/@description (Javadoc)
//! - Kotlin doc headers use /** ... */ with @module/@description (KDoc)
//! - Swift doc headers use /// with @module/@description (Swift markup)
//! - The header_area is the first 40 lines of a file
//! - Exports detection is approximate — pattern-based, not tree-sitter
//! - walk_for_modules delegates to freshness::check_file_freshness for accurate status
//! - generate_module_doc_with_ai parses structured JSON from AI response into ModuleDoc

use crate::core::ai;
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
    ".ts", ".tsx", ".js", ".jsx", ".rs", ".py", ".go", ".java", ".kt", ".swift",
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
    walk_for_modules(path, project_path, &mut results, 0);

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
/// Uses smart inference based on file paths, naming conventions, and code patterns.
pub fn generate_module_doc_for_file(
    file_path: &str,
    project_path: &str,
) -> Result<ModuleDoc, String> {
    // Guard against extremely large files (>2MB) to prevent OOM
    let file_size = fs::metadata(file_path).map(|m| m.len()).unwrap_or(0);
    if file_size > 2_000_000 {
        return Err(format!("File too large to generate docs ({} bytes): {}", file_size, file_path));
    }

    let content = fs::read_to_string(file_path)
        .map_err(|e| format!("Failed to read {}: {}", file_path, e))?;

    let rel_path = make_relative_path(file_path, project_path);
    let ext = Path::new(file_path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");

    let exports = detect_exports(&content, ext);
    let imports = detect_imports(&content, ext);

    // Build a module path (e.g., "components/dashboard/HealthScore")
    let module_path = rel_path
        .trim_start_matches("src/")
        .trim_start_matches("src-tauri/src/")
        .trim_end_matches(&format!(".{}", ext))
        .to_string();

    // Smart inference based on file location and content
    let description = infer_description(&rel_path, &exports, &content);
    let purpose = infer_purpose(&rel_path, &exports, &content);
    let patterns = infer_patterns(&rel_path, ext, &exports, &content);
    let claude_notes = infer_claude_notes(&rel_path, ext, &exports, &imports);

    Ok(ModuleDoc {
        module_path,
        description,
        purpose,
        dependencies: imports
            .into_iter()
            .map(|i| infer_dependency_description(&i))
            .collect(),
        exports: exports
            .into_iter()
            .map(|e| infer_export_description(&e, &rel_path))
            .collect(),
        patterns,
        claude_notes,
    })
}

/// Generate a ModuleDoc using the Claude API for richer, AI-powered documentation.
/// Reads the file content, detects exports/imports, and sends them to Claude.
pub async fn generate_module_doc_with_ai(
    file_path: &str,
    project_path: &str,
    content: &str,
    exports: &[String],
    imports: &[String],
    client: &reqwest::Client,
    api_key: &str,
) -> Result<ModuleDoc, String> {
    let rel_path = make_relative_path(file_path, project_path);
    let ext = Path::new(file_path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");

    let module_path = rel_path
        .trim_start_matches("src/")
        .trim_start_matches("src-tauri/src/")
        .trim_end_matches(&format!(".{}", ext))
        .to_string();

    // Truncate content to ~12k chars to provide more context while staying within limits
    let truncated_content: String = content.chars().take(12000).collect();

    let system = r#"You are a technical documentation generator. Analyze source code and produce JSON documentation.

ABSOLUTE REQUIREMENTS FOR EACH FIELD:

description: ONE sentence about what this module DOES (use a verb) and its PRIMARY PURPOSE.
  TERRIBLE: "Function module", "Helpers for X", "Component for rendering"
  MEDIOCRE: "Renders task cards with status indicators"
  EXCELLENT: "Custom hook managing form state, validation errors, and async submission with debounce"
  BEST: "Zustand store for user authentication providing JWT token storage, session persistence, and auto-refresh"

purpose: 2-4 bullet points each starting with an ACTION VERB. Be specific about WHAT the code does.
  TERRIBLE: "Handle data", "Manage state", "Provide utilities"
  GOOD: "Fetch user profiles from /api/users endpoint", "Cache responses in localStorage for 1 hour", "Retry failed requests with exponential backoff up to 3 times"

exports: Format as "ExportName (type) - what it does/returns"
  Types: function, interface, type, class, const, hook, component
  TERRIBLE: "MyComponent - Component", "helper - Exported value"
  GOOD: "calculateTotal (function) - Sums prices and applies membership discount percentage"
  GOOD: "UserState (interface) - Shape with id, email, roles array, and lastLogin timestamp"

dependencies: Format as "import/path - specific reason needed"
  TERRIBLE: "react - React library"
  GOOD: "@/stores/authStore - Provides useAuth hook for JWT token and user session"

patterns: HOW to use this module with specific method calls
  TERRIBLE: "Import as needed", "Use appropriately"
  GOOD: "Call useAuth() at component top; destructure { user, isLoading, signOut }"

claude_notes: 2-4 SPECIFIC insights about code behavior
  TERRIBLE: "Update docs when changed", "See related files"
  GOOD: "Uses optimistic updates - UI changes immediately, then syncs to server on success"
  GOOD: "Tokens refresh 5 minutes before expiry to prevent mid-request failures"

OUTPUT: Return ONLY valid JSON, no markdown fences or explanation.
{
  "description": "One sentence description here",
  "purpose": ["Verb phrase 1", "Verb phrase 2"],
  "dependencies": ["path - reason"],
  "exports": ["Name (type) - description"],
  "patterns": ["Specific usage instruction"],
  "claude_notes": ["Actual insight from code"]
}"#;

    let prompt = format!(
        "Generate module documentation for this file:\n\n\
        Module path: {}\n\
        File extension: .{}\n\
        Detected exports: {}\n\
        Detected imports: {}\n\n\
        File content:\n```\n{}\n```",
        module_path,
        ext,
        exports.join(", "),
        imports.join(", "),
        truncated_content,
    );

    let response = ai::call_claude(client, api_key, system, &prompt).await?;

    // Strip markdown code fences if present (AI sometimes wraps in ```json ... ```)
    let cleaned_response = response
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();

    // Parse AI response as JSON into ModuleDoc fields
    match serde_json::from_str::<serde_json::Value>(cleaned_response) {
        Ok(val) => {
            let get_string = |key: &str| -> String {
                val.get(key)
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string()
            };
            let get_vec = |key: &str| -> Vec<String> {
                val.get(key)
                    .and_then(|v| v.as_array())
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|item| item.as_str().map(|s| s.to_string()))
                            .collect()
                    })
                    .unwrap_or_default()
            };

            Ok(ModuleDoc {
                module_path,
                description: get_string("description"),
                purpose: get_vec("purpose"),
                dependencies: get_vec("dependencies"),
                exports: get_vec("exports"),
                patterns: get_vec("patterns"),
                claude_notes: get_vec("claude_notes"),
            })
        }
        Err(_) => {
            // AI returned non-JSON; use the response as a description and fall back
            Ok(ModuleDoc {
                module_path,
                description: cleaned_response.lines().next().unwrap_or("AI-generated module").to_string(),
                purpose: vec!["See AI-generated description above".to_string()],
                dependencies: imports
                    .iter()
                    .map(|i| format!("{} - imported dependency", i))
                    .collect(),
                exports: exports
                    .iter()
                    .map(|e| format!("{} - exported symbol", e))
                    .collect(),
                patterns: vec!["Review AI output for usage patterns".to_string()],
                claude_notes: vec!["Documentation generated by AI — review for accuracy".to_string()],
            })
        }
    }
}

/// Apply a ModuleDoc as a documentation header to a file.
/// If the file already has a doc header, it is replaced. Otherwise, the header is prepended.
pub fn apply_doc_to_file(file_path: &str, doc: &ModuleDoc) -> Result<(), String> {
    // Guard against extremely large files (>2MB) to prevent OOM
    let file_size = fs::metadata(file_path).map(|m| m.len()).unwrap_or(0);
    if file_size > 2_000_000 {
        return Err(format!("File too large to apply docs ({} bytes): {}", file_size, file_path));
    }

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

fn walk_for_modules(dir: &Path, project_path: &str, results: &mut Vec<ModuleStatus>, depth: usize) {
    const MAX_DEPTH: usize = 10;
    if depth > MAX_DEPTH {
        return;
    }

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
                walk_for_modules(&path, project_path, results, depth + 1);
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
                && trimmed.chars().next().is_some_and(|c| c.is_uppercase())
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
                // export default Identifier (e.g., "export default Button")
                else if trimmed.starts_with("export default ") && !trimmed.contains("function") && !trimmed.contains("{") {
                    let rest = trimmed.trim_start_matches("export default ").trim();
                    // Get the identifier (first word, stop at punctuation)
                    let name: String = rest.chars().take_while(|c| c.is_alphanumeric() || *c == '_').collect();
                    if !name.is_empty() && name.chars().next().map(|c| c.is_alphabetic()).unwrap_or(false) {
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
                            if name.chars().next().is_some_and(|c| c.is_uppercase()) {
                                exports.push(name.to_string());
                            }
                        }
                    }
                }
                // type TypeName struct/interface
                else if trimmed.starts_with("type ") {
                    if let Some(name) = extract_word_after(trimmed, "type ") {
                        if name.chars().next().is_some_and(|c| c.is_uppercase()) {
                            exports.push(name);
                        }
                    }
                }
            }
        }
        "java" => {
            for line in content.lines() {
                let trimmed = line.trim();

                // public class ClassName
                if trimmed.contains("class ") && trimmed.starts_with("public ") {
                    if let Some(name) = extract_word_after(trimmed, "class ") {
                        exports.push(name);
                    }
                }
                // public interface InterfaceName
                else if trimmed.contains("interface ") && trimmed.starts_with("public ") {
                    if let Some(name) = extract_word_after(trimmed, "interface ") {
                        exports.push(name);
                    }
                }
                // public enum EnumName
                else if trimmed.contains("enum ") && trimmed.starts_with("public ") {
                    if let Some(name) = extract_word_after(trimmed, "enum ") {
                        exports.push(name);
                    }
                }
                // public method declarations
                else if trimmed.starts_with("public ") && trimmed.contains("(") && !trimmed.contains("class ") {
                    // Extract method name before (
                    let without_public = trimmed.trim_start_matches("public ");
                    let without_modifiers = without_public
                        .trim_start_matches("static ")
                        .trim_start_matches("final ")
                        .trim_start_matches("abstract ")
                        .trim_start_matches("synchronized ");
                    // Skip return type to get method name
                    if let Some(paren_pos) = without_modifiers.find('(') {
                        let before_paren = &without_modifiers[..paren_pos];
                        if let Some(name) = before_paren.split_whitespace().last() {
                            if !name.is_empty() {
                                exports.push(name.to_string());
                            }
                        }
                    }
                }
            }
        }
        "kt" => {
            for line in content.lines() {
                let trimmed = line.trim();

                // fun functionName(
                if trimmed.starts_with("fun ") || trimmed.contains(" fun ") {
                    let after = if trimmed.starts_with("fun ") {
                        trimmed.trim_start_matches("fun ")
                    } else if let Some(pos) = trimmed.find(" fun ") {
                        &trimmed[pos + 5..]
                    } else {
                        continue;
                    };
                    if let Some(paren_pos) = after.find('(') {
                        let name = after[..paren_pos].trim();
                        // Skip extension functions with receiver type
                        if !name.contains('.') && !name.is_empty() {
                            exports.push(name.to_string());
                        }
                    }
                }
                // class ClassName
                else if trimmed.starts_with("class ") || trimmed.contains(" class ") {
                    if let Some(name) = extract_word_after(trimmed, "class ") {
                        let name = name.trim_end_matches('(').trim_end_matches(':');
                        exports.push(name.to_string());
                    }
                }
                // data class DataClassName
                else if trimmed.contains("data class ") {
                    if let Some(name) = extract_word_after(trimmed, "data class ") {
                        let name = name.trim_end_matches('(');
                        exports.push(name.to_string());
                    }
                }
                // object ObjectName
                else if trimmed.starts_with("object ") {
                    if let Some(name) = extract_word_after(trimmed, "object ") {
                        exports.push(name);
                    }
                }
                // interface InterfaceName
                else if trimmed.starts_with("interface ") || trimmed.contains(" interface ") {
                    if let Some(name) = extract_word_after(trimmed, "interface ") {
                        exports.push(name);
                    }
                }
            }
        }
        "swift" => {
            for line in content.lines() {
                let trimmed = line.trim();

                // func functionName(
                if trimmed.starts_with("func ") || trimmed.contains(" func ") {
                    let after = if trimmed.starts_with("func ") {
                        trimmed.trim_start_matches("func ")
                    } else if let Some(pos) = trimmed.find(" func ") {
                        &trimmed[pos + 6..]
                    } else {
                        continue;
                    };
                    if let Some(paren_pos) = after.find('(') {
                        let name = after[..paren_pos].trim();
                        if !name.is_empty() {
                            exports.push(name.to_string());
                        }
                    }
                }
                // class ClassName
                else if trimmed.starts_with("class ") || trimmed.contains(" class ") {
                    if let Some(name) = extract_word_after(trimmed, "class ") {
                        let name = name.trim_end_matches(':').trim_end_matches('{');
                        exports.push(name.trim().to_string());
                    }
                }
                // struct StructName
                else if trimmed.starts_with("struct ") || trimmed.contains(" struct ") {
                    if let Some(name) = extract_word_after(trimmed, "struct ") {
                        let name = name.trim_end_matches(':').trim_end_matches('{');
                        exports.push(name.trim().to_string());
                    }
                }
                // enum EnumName
                else if trimmed.starts_with("enum ") || trimmed.contains(" enum ") {
                    if let Some(name) = extract_word_after(trimmed, "enum ") {
                        let name = name.trim_end_matches(':').trim_end_matches('{');
                        exports.push(name.trim().to_string());
                    }
                }
                // protocol ProtocolName
                else if trimmed.starts_with("protocol ") {
                    if let Some(name) = extract_word_after(trimmed, "protocol ") {
                        let name = name.trim_end_matches(':').trim_end_matches('{');
                        exports.push(name.trim().to_string());
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
                if (trimmed.starts_with("from ") || trimmed.starts_with("import "))
                    && !trimmed.starts_with("from __future__") {
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
        "java" | "kt" => {
            for line in content.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with("import ") {
                    let import_path = trimmed
                        .trim_start_matches("import ")
                        .trim_start_matches("static ")
                        .trim_end_matches(';')
                        .trim();
                    // Skip java.* and kotlin.* standard library imports
                    if !import_path.starts_with("java.")
                        && !import_path.starts_with("javax.")
                        && !import_path.starts_with("kotlin.")
                        && !import_path.starts_with("kotlinx.")
                    {
                        imports.push(import_path.to_string());
                    }
                }
            }
        }
        "swift" => {
            for line in content.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with("import ") {
                    let import_path = trimmed
                        .trim_start_matches("import ")
                        .trim();
                    // Skip Foundation, UIKit, SwiftUI standard imports
                    if !import_path.is_empty()
                        && import_path != "Foundation"
                        && import_path != "UIKit"
                        && import_path != "SwiftUI"
                        && import_path != "Combine"
                    {
                        imports.push(import_path.to_string());
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
        "java" => format_java_doc_header(doc),
        "kt" => format_kotlin_doc_header(doc),
        "swift" => format_swift_doc_header(doc),
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

fn format_java_doc_header(doc: &ModuleDoc) -> String {
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

fn format_kotlin_doc_header(doc: &ModuleDoc) -> String {
    // KDoc uses the same format as Javadoc
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

fn format_swift_doc_header(doc: &ModuleDoc) -> String {
    // Swift uses /// style documentation comments
    let mut lines = Vec::new();
    lines.push(format!("/// @module {}", doc.module_path));
    lines.push(format!("/// @description {}", doc.description));
    lines.push("///".to_string());

    if !doc.purpose.is_empty() {
        lines.push("/// PURPOSE:".to_string());
        for item in &doc.purpose {
            lines.push(format!("/// - {}", item));
        }
        lines.push("///".to_string());
    }

    if !doc.dependencies.is_empty() {
        lines.push("/// DEPENDENCIES:".to_string());
        for item in &doc.dependencies {
            lines.push(format!("/// - {}", item));
        }
        lines.push("///".to_string());
    }

    if !doc.exports.is_empty() {
        lines.push("/// EXPORTS:".to_string());
        for item in &doc.exports {
            lines.push(format!("/// - {}", item));
        }
        lines.push("///".to_string());
    }

    if !doc.patterns.is_empty() {
        lines.push("/// PATTERNS:".to_string());
        for item in &doc.patterns {
            lines.push(format!("/// - {}", item));
        }
        lines.push("///".to_string());
    }

    if !doc.claude_notes.is_empty() {
        lines.push("/// CLAUDE NOTES:".to_string());
        for item in &doc.claude_notes {
            lines.push(format!("/// - {}", item));
        }
    }

    lines.join("\n")
}

/// Replace an existing doc header in a file with a new one.
fn replace_doc_header(content: &str, new_header: &str, ext: &str) -> String {
    let lines: Vec<&str> = content.lines().collect();

    // Find the end of the existing doc header
    let header_end = match ext {
        "ts" | "tsx" | "js" | "jsx" | "java" | "kt" => {
            // Find closing */ (Javadoc/KDoc/JSDoc style)
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
        "swift" => {
            // Find last consecutive /// line
            let mut last_doc = 0;
            for (i, line) in lines.iter().enumerate() {
                let trimmed = line.trim();
                if trimmed.starts_with("///") {
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

// ---------------------------------------------------------------------------
// Smart inference functions for template-based doc generation
// ---------------------------------------------------------------------------

/// Infer a meaningful description from file path, exports, and content.
fn infer_description(rel_path: &str, exports: &[String], content: &str) -> String {
    let file_stem = Path::new(rel_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("module");

    // Check for specific file patterns
    if rel_path.contains("/hooks/") || file_stem.starts_with("use") {
        let hook_name = file_stem.strip_prefix("use").unwrap_or(file_stem);
        return format!("Custom React hook for {} state and actions", camel_to_words(hook_name));
    }

    if rel_path.contains("/components/") {
        if exports.len() == 1 {
            return format!("{} UI component", exports[0]);
        }
        return format!("{} UI component with related utilities", pascal_to_words(file_stem));
    }

    if rel_path.contains("/stores/") || file_stem.ends_with("Store") {
        let store_name = file_stem.strip_suffix("Store").unwrap_or(file_stem);
        return format!("Zustand store for {} state management", camel_to_words(store_name));
    }

    if rel_path.contains("/lib/") || rel_path.contains("/utils/") {
        return format!("Utility functions for {}", camel_to_words(file_stem));
    }

    if rel_path.contains("/types/") {
        return format!("TypeScript type definitions for {}", camel_to_words(file_stem));
    }

    if rel_path.contains("/commands/") {
        return format!("Tauri IPC command handlers for {}", camel_to_words(file_stem));
    }

    if rel_path.contains("/core/") {
        return format!("Core {} business logic", camel_to_words(file_stem));
    }

    if rel_path.contains("/models/") {
        return format!("Data models and types for {}", camel_to_words(file_stem));
    }

    if rel_path.contains("/db/") {
        return format!("Database operations for {}", camel_to_words(file_stem));
    }

    // Check content for clues
    if (content.contains("async fn") || content.contains("async function"))
        && (content.contains("Result<") || content.contains("Promise<"))
        && exports.len() == 1
    {
        return format!("Async {} operations", camel_to_words(&exports[0]));
    }

    // Fallback based on exports
    if exports.len() == 1 {
        format!("{} implementation", pascal_to_words(&exports[0]))
    } else if exports.is_empty() {
        format!("{} module", pascal_to_words(file_stem))
    } else {
        format!(
            "{} with {} related exports",
            pascal_to_words(&exports[0]),
            exports.len() - 1
        )
    }
}

/// Infer purpose bullet points from file location and exports.
fn infer_purpose(rel_path: &str, exports: &[String], content: &str) -> Vec<String> {
    let mut purposes = Vec::new();
    let file_stem = Path::new(rel_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("module");

    // Hook-specific purposes
    if rel_path.contains("/hooks/") || file_stem.starts_with("use") {
        purposes.push("Encapsulate related state logic".to_string());
        if content.contains("useState") {
            purposes.push("Manage local component state".to_string());
        }
        if content.contains("useEffect") {
            purposes.push("Handle side effects and lifecycle".to_string());
        }
        if content.contains("useCallback") || content.contains("useMemo") {
            purposes.push("Optimize re-renders with memoization".to_string());
        }
        if content.contains("invoke(") || content.contains("invoke<") {
            purposes.push("Bridge frontend to Tauri backend via IPC".to_string());
        }
    }
    // Component-specific purposes
    else if rel_path.contains("/components/") {
        purposes.push(format!("Render {} UI elements", pascal_to_words(file_stem)));
        if content.contains("onClick") || content.contains("onSubmit") || content.contains("onChange") {
            purposes.push("Handle user interactions".to_string());
        }
        if content.contains("props") || content.contains("Props") {
            purposes.push("Accept configuration via props".to_string());
        }
    }
    // Store-specific purposes
    else if rel_path.contains("/stores/") || file_stem.ends_with("Store") {
        purposes.push("Provide global state container".to_string());
        purposes.push("Expose actions for state mutations".to_string());
        if content.contains("persist") {
            purposes.push("Persist state across sessions".to_string());
        }
    }
    // Command-specific purposes (Tauri)
    else if rel_path.contains("/commands/") {
        purposes.push("Handle IPC calls from frontend".to_string());
        if content.contains("State<") {
            purposes.push("Access shared application state".to_string());
        }
        if content.contains("db.") || content.contains("database") {
            purposes.push("Perform database operations".to_string());
        }
    }
    // Core logic purposes
    else if rel_path.contains("/core/") {
        purposes.push(format!("Implement {} business logic", camel_to_words(file_stem)));
        if content.contains("pub fn") || content.contains("export function") {
            purposes.push("Expose public API for other modules".to_string());
        }
    }
    // Type definition purposes
    else if rel_path.contains("/types/") {
        purposes.push("Define TypeScript interfaces and types".to_string());
        purposes.push("Ensure type safety across the codebase".to_string());
    }
    // Utility purposes
    else if rel_path.contains("/lib/") || rel_path.contains("/utils/") {
        purposes.push("Provide reusable helper functions".to_string());
        if content.contains("export const") {
            purposes.push("Export shared constants".to_string());
        }
    }

    // Generic fallback based on exports
    if purposes.is_empty() {
        for export in exports.iter().take(3) {
            purposes.push(format!("Provide {} functionality", camel_to_words(export)));
        }
    }

    if purposes.is_empty() {
        purposes.push(format!("Implement {} logic", pascal_to_words(file_stem)));
    }

    purposes
}

/// Infer usage patterns from file type and content.
fn infer_patterns(rel_path: &str, ext: &str, exports: &[String], content: &str) -> Vec<String> {
    let mut patterns = Vec::new();
    let file_stem = Path::new(rel_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("module");

    // Hook patterns
    if rel_path.contains("/hooks/") || file_stem.starts_with("use") {
        patterns.push(format!("Call {}() at the top of functional components", file_stem));
        patterns.push("Destructure returned values for state and actions".to_string());
    }
    // Component patterns
    else if rel_path.contains("/components/") {
        if let Some(main_export) = exports.first() {
            patterns.push(format!("Import and render <{} /> in parent components", main_export));
        }
        if content.contains("interface") && content.contains("Props") {
            patterns.push("Pass required props as defined in the Props interface".to_string());
        }
    }
    // Store patterns
    else if rel_path.contains("/stores/") || file_stem.ends_with("Store") {
        if let Some(main_export) = exports.first() {
            patterns.push(format!("Use {}(selector) to subscribe to specific state slices", main_export));
        }
        patterns.push("Call actions directly from the store hook".to_string());
    }
    // Tauri command patterns
    else if rel_path.contains("/commands/") {
        patterns.push("Commands are async and return Result<T, String>".to_string());
        patterns.push("Use State<AppState> for shared application state".to_string());
        patterns.push("Map errors to strings with .map_err(|e| e.to_string())".to_string());
    }

    // Language-specific patterns
    match ext {
        "ts" | "tsx" => {
            if content.contains("export default") {
                patterns.push("Use default import for the main export".to_string());
            } else if !exports.is_empty() {
                patterns.push("Use named imports: { ... } from".to_string());
            }
        }
        "rs" => {
            if content.contains("Result<") {
                patterns.push("Handle Results with ? operator or match".to_string());
            }
            if content.contains("async fn") {
                patterns.push("Await async functions or spawn as tasks".to_string());
            }
        }
        "py" => {
            if content.contains("async def") {
                patterns.push("Use await when calling async functions".to_string());
            }
            if content.contains("class ") {
                patterns.push("Instantiate classes before calling methods".to_string());
            }
        }
        _ => {}
    }

    if patterns.is_empty() {
        patterns.push("Import and use exports as needed".to_string());
    }

    patterns
}

/// Infer Claude-specific notes from code characteristics.
fn infer_claude_notes(rel_path: &str, ext: &str, exports: &[String], imports: &[String]) -> Vec<String> {
    let mut notes = Vec::new();
    let file_stem = Path::new(rel_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("module");

    // Note about file location
    if rel_path.contains("/components/") {
        notes.push("This is a React component - prefer composition over prop drilling".to_string());
    } else if rel_path.contains("/hooks/") {
        notes.push("Custom hooks should follow Rules of Hooks".to_string());
    } else if rel_path.contains("/commands/") {
        notes.push("Tauri commands are registered in lib.rs invoke_handler".to_string());
    } else if rel_path.contains("/core/") {
        notes.push("Core modules should be framework-agnostic when possible".to_string());
    }

    // Note about exports count
    if exports.len() > 5 {
        notes.push(format!("Large module with {} exports - consider splitting", exports.len()));
    }

    // Note about dependencies
    if imports.len() > 8 {
        notes.push(format!("Has {} imports - high coupling, review dependencies", imports.len()));
    }

    // Language-specific notes
    match ext {
        "ts" | "tsx" => {
            if file_stem.starts_with("use") {
                notes.push("Hook names must start with 'use' for React rules".to_string());
            }
        }
        "rs" => {
            notes.push("Run cargo clippy before committing changes".to_string());
        }
        "py" => {
            notes.push("Follow PEP 8 style guidelines".to_string());
        }
        _ => {}
    }

    // Always add a reminder
    if notes.is_empty() {
        notes.push(format!("Update this documentation when {} changes significantly", file_stem));
    }

    notes
}

/// Infer a description for a dependency based on its import path.
fn infer_dependency_description(import_path: &str) -> String {
    // Common import patterns
    if import_path.contains("/stores/") {
        return format!("{} - Global state management", import_path);
    }
    if import_path.contains("/hooks/") {
        return format!("{} - Custom hook utilities", import_path);
    }
    if import_path.contains("/lib/") || import_path.contains("/utils/") {
        return format!("{} - Utility functions", import_path);
    }
    if import_path.contains("/types/") {
        return format!("{} - Type definitions", import_path);
    }
    if import_path.contains("/components/ui/") {
        return format!("{} - UI primitive component", import_path);
    }
    if import_path.contains("/components/") {
        return format!("{} - UI component", import_path);
    }
    if import_path.starts_with("@tauri-apps/") {
        return format!("{} - Tauri API binding", import_path);
    }
    if import_path.starts_with("@/") {
        return format!("{} - Internal module", import_path);
    }
    if import_path.starts_with("crate::") {
        let module = import_path.trim_start_matches("crate::");
        return format!("{} - Internal crate module", module);
    }

    format!("{} - Imported dependency", import_path)
}

/// Infer a description for an export based on naming conventions.
fn infer_export_description(export_name: &str, rel_path: &str) -> String {
    let name_lower = export_name.to_lowercase();

    // Hook exports
    if export_name.starts_with("use") {
        let hook_purpose = export_name.strip_prefix("use").unwrap_or(export_name);
        return format!("{} - React hook for {} state/actions", export_name, camel_to_words(hook_purpose));
    }

    // Interface/Type exports
    if export_name.ends_with("Props") {
        let component = export_name.strip_suffix("Props").unwrap_or(export_name);
        return format!("{} - Props interface for {} component", export_name, component);
    }
    if export_name.ends_with("State") {
        let domain = export_name.strip_suffix("State").unwrap_or(export_name);
        return format!("{} - State shape for {}", export_name, domain);
    }
    if export_name.ends_with("Config") || export_name.ends_with("Options") {
        return format!("{} - Configuration type", export_name);
    }

    // Constants
    if export_name.chars().all(|c| c.is_uppercase() || c == '_') {
        return format!("{} - Constant value", export_name);
    }

    // Common function patterns
    if name_lower.starts_with("get") {
        let target = export_name.strip_prefix("get").unwrap_or(export_name);
        return format!("{} - Retrieves {}", export_name, camel_to_words(target));
    }
    if name_lower.starts_with("set") {
        let target = export_name.strip_prefix("set").unwrap_or(export_name);
        return format!("{} - Updates {}", export_name, camel_to_words(target));
    }
    if name_lower.starts_with("create") {
        let target = export_name.strip_prefix("create").unwrap_or(export_name);
        return format!("{} - Creates new {}", export_name, camel_to_words(target));
    }
    if name_lower.starts_with("delete") || name_lower.starts_with("remove") {
        return format!("{} - Removes item", export_name);
    }
    if name_lower.starts_with("update") {
        let target = export_name.strip_prefix("update").unwrap_or(export_name);
        return format!("{} - Modifies {}", export_name, camel_to_words(target));
    }
    if name_lower.starts_with("handle") {
        let event = export_name.strip_prefix("handle").unwrap_or(export_name);
        return format!("{} - Event handler for {}", export_name, camel_to_words(event));
    }
    if name_lower.starts_with("on") && export_name.len() > 2 {
        let event = &export_name[2..];
        return format!("{} - Callback for {} events", export_name, camel_to_words(event));
    }
    if name_lower.starts_with("is") || name_lower.starts_with("has") || name_lower.starts_with("can") {
        return format!("{} - Boolean check", export_name);
    }
    if name_lower.starts_with("calculate") || name_lower.starts_with("compute") {
        return format!("{} - Calculates derived value", export_name);
    }
    if name_lower.starts_with("parse") {
        return format!("{} - Parses input data", export_name);
    }
    if name_lower.starts_with("format") {
        return format!("{} - Formats output data", export_name);
    }
    if name_lower.starts_with("validate") {
        return format!("{} - Validates input", export_name);
    }
    if name_lower.starts_with("fetch") || name_lower.starts_with("load") {
        return format!("{} - Async data fetching", export_name);
    }
    if name_lower.starts_with("save") || name_lower.starts_with("store") {
        return format!("{} - Persists data", export_name);
    }

    // Check if it's likely a component (PascalCase in components folder)
    if rel_path.contains("/components/") && export_name.chars().next().is_some_and(|c| c.is_uppercase()) {
        return format!("{} - React component", export_name);
    }

    // Default
    format!("{} - Exported function/value", export_name)
}

/// Convert camelCase or PascalCase to lowercase words.
fn camel_to_words(s: &str) -> String {
    let mut result = String::new();
    for (i, c) in s.chars().enumerate() {
        if c.is_uppercase() && i > 0 {
            result.push(' ');
        }
        result.push(c.to_ascii_lowercase());
    }
    result
}

/// Convert PascalCase to title case words.
fn pascal_to_words(s: &str) -> String {
    let mut result = String::new();
    for (i, c) in s.chars().enumerate() {
        if c.is_uppercase() && i > 0 {
            result.push(' ');
            result.push(c.to_ascii_lowercase());
        } else if i == 0 {
            result.push(c.to_ascii_uppercase());
        } else {
            result.push(c);
        }
    }
    result
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
