//! @module core/health
//! @description Project health score calculation engine
//!
//! PURPOSE:
//! - Calculate overall health score (0-100) based on documentation coverage
//! - Break down scores by component (CLAUDE.md, modules, freshness, skills, context, enforcement)
//! - Identify quick wins for score improvement
//! - Determine context rot risk level
//!
//! DEPENDENCIES:
//! - models::project - HealthScore, HealthComponents, QuickWin types
//! - core::freshness - Freshness scoring engine
//! - std::path::Path - File system checks
//!
//! EXPORTS:
//! - calculate_health - Calculate full health score for a project path
//! - estimate_tokens - Estimate token count for a string (chars / 4 approximation)
//!
//! PATTERNS:
//! - Component weights must sum to 100
//! - Quick wins are sorted by impact (highest first)
//! - Health score drives dashboard display
//!
//! CLAUDE NOTES:
//! - Weights: CLAUDE.md=25, Modules=25, Freshness=15, Skills=15, Context=10, Enforcement=10
//! - Phase 5 added freshness scoring via core::freshness engine
//! - Phase 6 added skills scoring: min(skill_count * 3, 15)
//! - Phase 9 added enforcement scoring: 5 for hooks + 5 for CI config
//! - Phase 10 added context scoring: based on persistent token usage vs 200k budget
//! - Freshness score is the average freshness of all documented files, scaled to weight
//! - Context rot risk is based on doc scores only (CLAUDE.md + modules + freshness)
//! - Risk thresholds: low (>=70% of doc max), medium (40-69%), high (<40%)

use crate::commands::enforcement;
use crate::core::freshness;
use crate::models::project::{HealthComponents, HealthScore, QuickWin};
use std::path::Path;

const WEIGHT_CLAUDE_MD: u32 = 25;
const WEIGHT_MODULE_DOCS: u32 = 25;
const WEIGHT_FRESHNESS: u32 = 15;
const WEIGHT_SKILLS: u32 = 15;
const WEIGHT_CONTEXT: u32 = 10;
const WEIGHT_ENFORCEMENT: u32 = 10;

/// Calculate the full health score for a project at the given path.
/// `skill_count` is the number of skills created for the project (from DB).
/// Checks for CLAUDE.md existence, module documentation coverage, freshness, skills.
pub fn calculate_health(project_path: &str, skill_count: u32) -> HealthScore {
    let path = Path::new(project_path);

    let claude_md_score = calculate_claude_md_score(path);
    let module_docs_score = calculate_module_docs_score(path);
    let freshness_score = calculate_freshness_score(project_path);
    let skills_score = calculate_skills_score(skill_count);
    let context_score = calculate_context_score(path);
    let enforcement_score = enforcement::calculate_enforcement_score(project_path);

    let total = claude_md_score + module_docs_score + freshness_score + skills_score
        + context_score + enforcement_score;

    // Context rot risk is based on documentation-specific scores (CLAUDE.md + modules + freshness),
    // not the full composite. A project with perfect docs but no skills/enforcement shouldn't
    // show a rot warning.
    let doc_score = claude_md_score + module_docs_score + freshness_score;
    let doc_max = WEIGHT_CLAUDE_MD + WEIGHT_MODULE_DOCS + WEIGHT_FRESHNESS; // 65
    let doc_pct = if doc_max > 0 { doc_score as f64 / doc_max as f64 * 100.0 } else { 0.0 };

    let context_rot_risk = if doc_pct >= 70.0 {
        "low".to_string()
    } else if doc_pct >= 40.0 {
        "medium".to_string()
    } else {
        "high".to_string()
    };

    let quick_wins = generate_quick_wins(
        path,
        claude_md_score,
        module_docs_score,
        freshness_score,
        skills_score,
        context_score,
        enforcement_score,
    );

    HealthScore {
        total,
        components: HealthComponents {
            claude_md: claude_md_score,
            module_docs: module_docs_score,
            freshness: freshness_score,
            skills: skills_score,
            context: context_score,
            enforcement: enforcement_score,
        },
        quick_wins,
        context_rot_risk,
    }
}

/// Estimate the number of tokens in a string (~4 chars per token).
pub fn estimate_tokens(content: &str) -> u32 {
    (content.len() as f64 / 4.0).ceil() as u32
}

/// Score the CLAUDE.md component (0-25 points).
/// - Exists: 10 points
/// - Has reasonable content (>200 chars): 10 points
/// - Has structure (## headings): 5 points
fn calculate_claude_md_score(project_path: &Path) -> u32 {
    let claude_md_path = project_path.join("CLAUDE.md");

    if !claude_md_path.exists() {
        return 0;
    }

    let content = match std::fs::read_to_string(&claude_md_path) {
        Ok(c) => c,
        Err(_) => return 0,
    };

    let mut score: u32 = 0;

    // File exists
    score += 10;

    // Has reasonable content
    if content.len() > 200 {
        score += 10;
    } else if content.len() > 50 {
        score += 5;
    }

    // Has structure (markdown headings)
    let heading_count = content.lines().filter(|l| l.starts_with("## ")).count();
    if heading_count >= 3 {
        score += 5;
    } else if heading_count >= 1 {
        score += 2;
    }

    score.min(WEIGHT_CLAUDE_MD)
}

/// Score the skills component (0-15 points).
/// Based on the number of skills created: min(skill_count * 3, 15).
/// 5+ skills = full score.
fn calculate_skills_score(skill_count: u32) -> u32 {
    (skill_count * 3).min(WEIGHT_SKILLS)
}

/// Score the freshness component (0-15 points).
/// Uses the freshness engine to calculate average freshness across documented files.
fn calculate_freshness_score(project_path: &str) -> u32 {
    let modules = match freshness::check_project_freshness(project_path) {
        Ok(m) => m,
        Err(_) => return 0,
    };

    if modules.is_empty() {
        return 0;
    }

    // Only consider files that have documentation (not "missing")
    let documented: Vec<&crate::models::module_doc::ModuleStatus> = modules
        .iter()
        .filter(|m| m.status != "missing")
        .collect();

    if documented.is_empty() {
        return 0;
    }

    let avg_freshness: f64 =
        documented.iter().map(|m| m.freshness_score as f64).sum::<f64>() / documented.len() as f64;

    let raw_score = (avg_freshness / 100.0 * WEIGHT_FRESHNESS as f64).round() as u32;
    raw_score.min(WEIGHT_FRESHNESS)
}

/// Score the context efficiency component (0-10 points).
/// Estimates persistent token usage (CLAUDE.md + doc headers + MCP configs) against the
/// 200k context budget. Lower usage means more headroom for conversations.
/// Scoring: <25% usage → 10pts, 25-50% → 8pts, 50-75% → 5pts, >75% → 2pts.
fn calculate_context_score(project_path: &Path) -> u32 {
    const CONTEXT_BUDGET: u32 = 200_000;

    if !project_path.exists() {
        return 0;
    }

    let mut persistent_tokens: u32 = 0;

    // CLAUDE.md tokens
    let claude_md = project_path.join("CLAUDE.md");
    if claude_md.exists() {
        if let Ok(content) = std::fs::read_to_string(&claude_md) {
            persistent_tokens += estimate_tokens(&content);
        }
    }

    // Doc header tokens from source files across the project
    persistent_tokens += estimate_dir_header_tokens(project_path);

    // MCP config tokens
    let mcp_json = project_path.join(".mcp.json");
    if mcp_json.exists() {
        if let Ok(content) = std::fs::read_to_string(&mcp_json) {
            persistent_tokens += estimate_tokens(&content);
            // Add overhead for tool schemas injected per server
            let server_count = count_mcp_servers(&content);
            persistent_tokens += server_count * 400;
        }
    }

    let claude_mcp = project_path.join(".claude").join("mcp_servers.json");
    if claude_mcp.exists() {
        if let Ok(content) = std::fs::read_to_string(&claude_mcp) {
            persistent_tokens += estimate_tokens(&content);
            let server_count = count_mcp_servers(&content);
            persistent_tokens += server_count * 400;
        }
    }

    let usage_pct = persistent_tokens as f64 / CONTEXT_BUDGET as f64 * 100.0;

    let score = if usage_pct < 25.0 {
        WEIGHT_CONTEXT // 10
    } else if usage_pct < 50.0 {
        8
    } else if usage_pct < 75.0 {
        5
    } else {
        2
    };

    score.min(WEIGHT_CONTEXT)
}

/// Recursively estimate tokens from documentation headers in source files.
fn estimate_dir_header_tokens(dir: &Path) -> u32 {
    let mut tokens: u32 = 0;
    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return 0,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        if name.starts_with('.')
            || name == "node_modules"
            || name == "target"
            || name == "dist"
            || name == "build"
        {
            continue;
        }

        if path.is_dir() {
            tokens += estimate_dir_header_tokens(&path);
        } else if is_documentable_file(&name) {
            if let Ok(content) = std::fs::read_to_string(&path) {
                let header: String = content.lines().take(30).collect::<Vec<_>>().join("\n");
                if header.contains("@module") || header.contains("@description") {
                    tokens += estimate_tokens(&header);
                }
            }
        }
    }

    tokens
}

/// Count MCP server entries in a JSON config string.
fn count_mcp_servers(content: &str) -> u32 {
    if let Ok(value) = serde_json::from_str::<serde_json::Value>(content) {
        let mcp_obj = value
            .get("mcpServers")
            .or_else(|| value.get("mcp_servers"))
            .or(Some(&value));

        if let Some(obj) = mcp_obj {
            if let Some(map) = obj.as_object() {
                return map.len() as u32;
            }
        }
    }
    0
}

/// Score the module documentation component (0-25 points).
/// Scans the entire project tree for source files with documentation headers.
fn calculate_module_docs_score(project_path: &Path) -> u32 {
    if !project_path.exists() {
        return 0;
    }

    let mut total_files = 0u32;
    let mut documented_files = 0u32;

    count_documented_files(project_path, &mut total_files, &mut documented_files);

    if total_files == 0 {
        return 0;
    }

    let coverage = (documented_files as f64) / (total_files as f64);
    let raw_score = (coverage * WEIGHT_MODULE_DOCS as f64).round() as u32;
    raw_score.min(WEIGHT_MODULE_DOCS)
}

/// Recursively count source files and check for documentation headers.
fn count_documented_files(dir: &Path, total: &mut u32, documented: &mut u32) {
    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden dirs and common non-source dirs
        if name.starts_with('.') || name == "node_modules" || name == "target" || name == "dist" || name == "build" {
            continue;
        }

        if path.is_dir() {
            count_documented_files(&path, total, documented);
        } else if is_documentable_file(&name) {
            *total += 1;
            if has_doc_header(&path) {
                *documented += 1;
            }
        }
    }
}

/// Check if a file is a source file that should have documentation.
fn is_documentable_file(name: &str) -> bool {
    let doc_extensions = [".ts", ".tsx", ".js", ".jsx", ".rs", ".py", ".go"];
    // Skip test files and config files
    if name.starts_with('.') || name == "mod.rs" || name == "main.rs" || name == "index.ts" {
        return false;
    }
    doc_extensions.iter().any(|ext| name.ends_with(ext))
}

/// Check if a file has a documentation header.
/// Looks for `@module` or `//! @module` patterns in the first 30 lines.
fn has_doc_header(path: &Path) -> bool {
    let content = match std::fs::read_to_string(path) {
        Ok(c) => c,
        Err(_) => return false,
    };

    let header_area: String = content.lines().take(30).collect::<Vec<_>>().join("\n");
    header_area.contains("@module") || header_area.contains("@description")
}

/// Generate quick win suggestions based on current scores.
fn generate_quick_wins(
    project_path: &Path,
    claude_md: u32,
    module_docs: u32,
    freshness: u32,
    skills: u32,
    context: u32,
    enforcement: u32,
) -> Vec<QuickWin> {
    let mut wins = Vec::new();

    if claude_md == 0 {
        wins.push(QuickWin {
            title: "Create CLAUDE.md".to_string(),
            description: "Generate a CLAUDE.md file to give Claude full project context. This is the single highest-impact improvement.".to_string(),
            impact: WEIGHT_CLAUDE_MD,
            effort: "low".to_string(),
        });
    } else if claude_md < WEIGHT_CLAUDE_MD {
        wins.push(QuickWin {
            title: "Improve CLAUDE.md".to_string(),
            description: "Add more sections and detail to your CLAUDE.md for better context.".to_string(),
            impact: WEIGHT_CLAUDE_MD - claude_md,
            effort: "low".to_string(),
        });
    }

    if module_docs < 5 {
        let src_dir = project_path.join("src");
        if src_dir.exists() {
            wins.push(QuickWin {
                title: "Add module documentation".to_string(),
                description: "Add documentation headers to source files so Claude understands each module's purpose.".to_string(),
                impact: WEIGHT_MODULE_DOCS,
                effort: "medium".to_string(),
            });
        }
    } else if module_docs < WEIGHT_MODULE_DOCS {
        wins.push(QuickWin {
            title: "Increase module doc coverage".to_string(),
            description: "Some source files are missing documentation headers.".to_string(),
            impact: WEIGHT_MODULE_DOCS - module_docs,
            effort: "medium".to_string(),
        });
    }

    if freshness == 0 && module_docs > 0 {
        wins.push(QuickWin {
            title: "Update stale documentation".to_string(),
            description: "Documentation headers are out of date. Re-generate module docs to match current code.".to_string(),
            impact: WEIGHT_FRESHNESS,
            effort: "medium".to_string(),
        });
    } else if freshness < WEIGHT_FRESHNESS && freshness > 0 {
        wins.push(QuickWin {
            title: "Fix outdated module docs".to_string(),
            description: "Some module documentation is stale — exports or imports have changed since docs were written.".to_string(),
            impact: WEIGHT_FRESHNESS - freshness,
            effort: "low".to_string(),
        });
    }

    if skills == 0 {
        wins.push(QuickWin {
            title: "Create reusable skills".to_string(),
            description: "Define skills to capture reusable patterns. Skills reduce token usage by avoiding re-explanation.".to_string(),
            impact: WEIGHT_SKILLS,
            effort: "medium".to_string(),
        });
    } else if skills < WEIGHT_SKILLS {
        wins.push(QuickWin {
            title: "Add more skills".to_string(),
            description: "More skills mean better pattern coverage. Use the pattern detector to find opportunities.".to_string(),
            impact: WEIGHT_SKILLS - skills,
            effort: "low".to_string(),
        });
    }

    if context < WEIGHT_CONTEXT {
        wins.push(QuickWin {
            title: "Reduce context overhead".to_string(),
            description: "Persistent context (docs, MCP configs) is consuming a large share of the context window. Consider trimming verbose documentation or removing unused MCP servers.".to_string(),
            impact: WEIGHT_CONTEXT - context,
            effort: "medium".to_string(),
        });
    }

    if enforcement == 0 {
        wins.push(QuickWin {
            title: "Set up enforcement".to_string(),
            description: "Install git hooks and CI checks to prevent undocumented code from being committed.".to_string(),
            impact: WEIGHT_ENFORCEMENT,
            effort: "low".to_string(),
        });
    } else if enforcement < WEIGHT_ENFORCEMENT {
        wins.push(QuickWin {
            title: "Add CI documentation checks".to_string(),
            description: "Add CI integration to enforce documentation on pull requests.".to_string(),
            impact: WEIGHT_ENFORCEMENT - enforcement,
            effort: "low".to_string(),
        });
    }

    // Sort by impact descending
    wins.sort_by(|a, b| b.impact.cmp(&a.impact));
    wins
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_estimate_tokens() {
        assert_eq!(estimate_tokens(""), 0);
        assert_eq!(estimate_tokens("hello world"), 3); // 11 chars / 4 = 2.75 -> 3
        assert_eq!(estimate_tokens("abcd"), 1); // 4 chars / 4 = 1
    }

    #[test]
    fn test_is_documentable_file() {
        assert!(is_documentable_file("App.tsx"));
        assert!(is_documentable_file("scanner.rs"));
        assert!(is_documentable_file("utils.py"));
        assert!(!is_documentable_file("mod.rs"));
        assert!(!is_documentable_file("main.rs"));
        assert!(!is_documentable_file("index.ts"));
        assert!(!is_documentable_file(".gitignore"));
        assert!(!is_documentable_file("readme.md"));
    }

    #[test]
    fn test_health_nonexistent_path() {
        let score = calculate_health("/nonexistent/path/12345", 0);
        assert_eq!(score.total, 0);
        assert_eq!(score.context_rot_risk, "high");
        assert!(!score.quick_wins.is_empty());
    }

    #[test]
    fn test_context_score_nonexistent_path() {
        let score = calculate_context_score(Path::new("/nonexistent/path/12345"));
        assert_eq!(score, 0);
    }

    #[test]
    fn test_count_mcp_servers() {
        let config = r#"{"mcpServers":{"fs":{"command":"npx"},"db":{"command":"python"}}}"#;
        assert_eq!(count_mcp_servers(config), 2);
        assert_eq!(count_mcp_servers("{}"), 0);
        assert_eq!(count_mcp_servers("invalid"), 0);
    }

    #[test]
    fn test_skills_score() {
        assert_eq!(calculate_skills_score(0), 0);
        assert_eq!(calculate_skills_score(1), 3);
        assert_eq!(calculate_skills_score(3), 9);
        assert_eq!(calculate_skills_score(5), 15);
        assert_eq!(calculate_skills_score(10), 15); // capped at weight
    }
}
