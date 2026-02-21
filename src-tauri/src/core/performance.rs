//! @module core/performance
//! @description Performance engineering analysis engine
//!
//! PURPOSE:
//! - Scan project source files for code-level performance issues
//! - Analyze project structure for architecture-level findings
//! - Score projects across 6 performance categories (0-100 total)
//! - Generate actionable suggestions for each issue found
//!
//! DEPENDENCIES:
//! - models::performance - PerformanceReview, PerformanceComponents, PerformanceIssue, ArchitectureFinding
//! - std::path::Path - File system traversal
//! - std::fs - File reading
//! - uuid - Unique IDs for reviews and issues
//!
//! EXPORTS:
//! - analyze_project - Run full performance analysis on a project path
//!
//! PATTERNS:
//! - Heuristic-based scanning using regex/string matching on source files
//! - Scoring starts at max per category, deducts per issue found
//! - Code-level detectors scan individual source files
//! - Architecture-level detectors scan config/structure files
//!
//! CLAUDE NOTES:
//! - Component max values: queryPatterns=20, rendering=20, memory=15, bundle=15, caching=15, apiDesign=15
//! - Severity deductions: critical=-5, warning=-3, info=-1
//! - All scores floor at 0
//! - This is heuristic analysis, not AST-based; uses string/regex matching

use crate::models::performance::{
    ArchitectureFinding, PerformanceComponents, PerformanceIssue, PerformanceReview,
};
use std::path::Path;
use uuid::Uuid;

const MAX_QUERY_PATTERNS: u32 = 20;
const MAX_RENDERING: u32 = 20;
const MAX_MEMORY: u32 = 15;
const MAX_BUNDLE: u32 = 15;
const MAX_CACHING: u32 = 15;
const MAX_API_DESIGN: u32 = 15;

/// Run a full performance analysis on a project.
pub fn analyze_project(project_path: &str) -> PerformanceReview {
    let path = Path::new(project_path);
    let mut issues: Vec<PerformanceIssue> = Vec::new();

    // Scan source files for code-level issues
    scan_source_files(path, &mut issues);

    // Calculate component scores based on issues
    let components = calculate_scores(&issues);

    // Scan for architecture-level findings
    let architecture_findings = scan_architecture(path);

    // Calculate overall score (sum of components, adjusted by architecture)
    let component_total = components.query_patterns
        + components.rendering
        + components.memory
        + components.bundle
        + components.caching
        + components.api_design;

    // Deduct for architecture warnings/missing
    let arch_deduction: u32 = architecture_findings
        .iter()
        .map(|f| match f.status.as_str() {
            "warning" => 2,
            "missing" => 1,
            _ => 0,
        })
        .sum();

    let overall_score = component_total.saturating_sub(arch_deduction).min(100);

    PerformanceReview {
        id: Uuid::new_v4().to_string(),
        project_id: String::new(),
        overall_score,
        components,
        issues,
        architecture_findings,
        created_at: chrono::Utc::now().to_rfc3339(),
    }
}

/// Calculate component scores by deducting from max per issue severity.
fn calculate_scores(issues: &[PerformanceIssue]) -> PerformanceComponents {
    let mut query_patterns = MAX_QUERY_PATTERNS as i32;
    let mut rendering = MAX_RENDERING as i32;
    let mut memory = MAX_MEMORY as i32;
    let mut bundle = MAX_BUNDLE as i32;
    let mut caching = MAX_CACHING as i32;
    let mut api_design = MAX_API_DESIGN as i32;

    for issue in issues {
        let deduction = match issue.severity.as_str() {
            "critical" => 5,
            "warning" => 3,
            "info" => 1,
            _ => 0,
        };

        match issue.category.as_str() {
            "query-patterns" => query_patterns -= deduction,
            "rendering" => rendering -= deduction,
            "memory" => memory -= deduction,
            "bundle" => bundle -= deduction,
            "caching" => caching -= deduction,
            "api-design" => api_design -= deduction,
            _ => {}
        }
    }

    PerformanceComponents {
        query_patterns: query_patterns.max(0) as u32,
        rendering: rendering.max(0) as u32,
        memory: memory.max(0) as u32,
        bundle: bundle.max(0) as u32,
        caching: caching.max(0) as u32,
        api_design: api_design.max(0) as u32,
    }
}

/// Recursively scan source files for code-level performance issues.
fn scan_source_files(dir: &Path, issues: &mut Vec<PerformanceIssue>) {
    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip non-source directories
        if name.starts_with('.')
            || name == "node_modules"
            || name == "target"
            || name == "dist"
            || name == "build"
            || name == ".git"
        {
            continue;
        }

        if path.is_dir() {
            scan_source_files(&path, issues);
        } else if is_scannable_file(&name) {
            if let Ok(content) = std::fs::read_to_string(&path) {
                let rel_path = path.to_string_lossy().to_string();
                scan_file_content(&content, &rel_path, &name, issues);
            }
        }
    }
}

/// Check if a file should be scanned for performance issues.
fn is_scannable_file(name: &str) -> bool {
    let extensions = [
        ".ts", ".tsx", ".js", ".jsx", ".rs", ".py", ".go", ".java", ".kt",
    ];
    extensions.iter().any(|ext| name.ends_with(ext))
        && !name.ends_with(".test.ts")
        && !name.ends_with(".test.tsx")
        && !name.ends_with(".spec.ts")
        && !name.ends_with(".spec.tsx")
        && !name.ends_with(".test.js")
        && !name.ends_with(".test.jsx")
}

/// Scan file content for various performance anti-patterns.
fn scan_file_content(
    content: &str,
    file_path: &str,
    file_name: &str,
    issues: &mut Vec<PerformanceIssue>,
) {
    let lines: Vec<&str> = content.lines().collect();

    detect_n_plus_one(content, &lines, file_path, issues);
    detect_rerender_risks(content, &lines, file_path, file_name, issues);
    detect_memory_leaks(content, &lines, file_path, issues);
    detect_expensive_operations(content, &lines, file_path, issues);
}

/// Detect N+1 query patterns: DB calls inside loops.
fn detect_n_plus_one(
    content: &str,
    lines: &[&str],
    file_path: &str,
    issues: &mut Vec<PerformanceIssue>,
) {
    // Pattern: for/while loop containing query/fetch/select calls
    let query_keywords = ["query", "fetch", "findOne", "findMany", "select", "execute"];
    let mut in_loop = false;
    let mut loop_start_line = 0;

    for (i, line) in lines.iter().enumerate() {
        let trimmed = line.trim();

        // Check for loop start
        if trimmed.starts_with("for ")
            || trimmed.starts_with("for(")
            || trimmed.starts_with("while ")
            || trimmed.starts_with("while(")
            || trimmed.contains(".forEach(")
            || trimmed.contains(".map(")
        {
            in_loop = true;
            loop_start_line = i + 1;
        }

        // Check for query inside loop
        if in_loop {
            for keyword in &query_keywords {
                if trimmed.contains(keyword) && !trimmed.starts_with("//") && !trimmed.starts_with("*") {
                    issues.push(PerformanceIssue {
                        id: Uuid::new_v4().to_string(),
                        category: "query-patterns".to_string(),
                        severity: "critical".to_string(),
                        title: "Potential N+1 query pattern".to_string(),
                        description: format!(
                            "Database/API call `{}` found inside a loop starting at line {}.",
                            keyword, loop_start_line
                        ),
                        file_path: Some(file_path.to_string()),
                        line_number: Some((i + 1) as u32),
                        suggestion: "Batch the queries before the loop or use eager loading/joins."
                            .to_string(),
                    });
                    in_loop = false; // Only report once per loop
                    break;
                }
            }
        }

        // Simple brace-based loop end detection
        if in_loop && trimmed == "}" {
            in_loop = false;
        }
    }

    // Pattern: .map(async => await fetch) — async map with await
    if content.contains(".map(async") && content.contains("await") {
        if let Some(line_num) = lines
            .iter()
            .position(|l| l.contains(".map(async"))
        {
            issues.push(PerformanceIssue {
                id: Uuid::new_v4().to_string(),
                category: "query-patterns".to_string(),
                severity: "warning".to_string(),
                title: "Sequential async operations in map".to_string(),
                description: "Using .map(async ...) with await runs operations sequentially."
                    .to_string(),
                file_path: Some(file_path.to_string()),
                line_number: Some((line_num + 1) as u32),
                suggestion: "Use Promise.all() to run operations in parallel, or batch the queries."
                    .to_string(),
            });
        }
    }
}

/// Detect React re-render risks.
fn detect_rerender_risks(
    content: &str,
    lines: &[&str],
    file_path: &str,
    file_name: &str,
    issues: &mut Vec<PerformanceIssue>,
) {
    // Only check React/JSX files
    if !file_name.ends_with(".tsx") && !file_name.ends_with(".jsx") {
        return;
    }

    // Check for inline object literals in JSX (style={{ }})
    for (i, line) in lines.iter().enumerate() {
        let trimmed = line.trim();
        if trimmed.contains("style={{") || trimmed.contains("style={ {") {
            issues.push(PerformanceIssue {
                id: Uuid::new_v4().to_string(),
                category: "rendering".to_string(),
                severity: "info".to_string(),
                title: "Inline style object in JSX".to_string(),
                description: "Inline style objects create new references on every render."
                    .to_string(),
                file_path: Some(file_path.to_string()),
                line_number: Some((i + 1) as u32),
                suggestion:
                    "Move style objects outside the component or use useMemo."
                        .to_string(),
            });
        }
    }

    // Check for inline arrow functions in JSX event handlers that could cause re-renders
    // in child components (onClick={() => ...} pattern)
    let has_memo = content.contains("React.memo") || content.contains("memo(");
    if !has_memo {
        // Count inline handlers as a signal, not individual issues
        let inline_handler_count = lines
            .iter()
            .filter(|l| {
                let t = l.trim();
                (t.contains("onClick={()") || t.contains("onChange={()") || t.contains("onSubmit={()"))
                    && !t.starts_with("//")
            })
            .count();

        if inline_handler_count >= 3 {
            issues.push(PerformanceIssue {
                id: Uuid::new_v4().to_string(),
                category: "rendering".to_string(),
                severity: "warning".to_string(),
                title: "Multiple inline handlers without memo".to_string(),
                description: format!(
                    "Found {} inline event handlers. Component is not wrapped in React.memo.",
                    inline_handler_count
                ),
                file_path: Some(file_path.to_string()),
                line_number: None,
                suggestion: "Use useCallback for handlers passed to child components, or wrap children in React.memo."
                    .to_string(),
            });
        }
    }
}

/// Detect potential memory leak patterns.
fn detect_memory_leaks(
    content: &str,
    lines: &[&str],
    file_path: &str,
    issues: &mut Vec<PerformanceIssue>,
) {
    // addEventListener without removeEventListener
    let has_add = content.contains("addEventListener");
    let has_remove = content.contains("removeEventListener");
    if has_add && !has_remove {
        if let Some(line_num) = lines.iter().position(|l| l.contains("addEventListener")) {
            issues.push(PerformanceIssue {
                id: Uuid::new_v4().to_string(),
                category: "memory".to_string(),
                severity: "warning".to_string(),
                title: "addEventListener without cleanup".to_string(),
                description: "Event listener added but no removeEventListener found in file."
                    .to_string(),
                file_path: Some(file_path.to_string()),
                line_number: Some((line_num + 1) as u32),
                suggestion: "Add removeEventListener in cleanup (useEffect return or componentWillUnmount)."
                    .to_string(),
            });
        }
    }

    // setInterval without clearInterval
    let has_set_interval = content.contains("setInterval");
    let has_clear_interval = content.contains("clearInterval");
    if has_set_interval && !has_clear_interval {
        if let Some(line_num) = lines.iter().position(|l| l.contains("setInterval")) {
            issues.push(PerformanceIssue {
                id: Uuid::new_v4().to_string(),
                category: "memory".to_string(),
                severity: "warning".to_string(),
                title: "setInterval without clearInterval".to_string(),
                description: "Interval timer set but never cleared in this file."
                    .to_string(),
                file_path: Some(file_path.to_string()),
                line_number: Some((line_num + 1) as u32),
                suggestion: "Store the interval ID and call clearInterval in cleanup."
                    .to_string(),
            });
        }
    }

    // subscribe without unsubscribe
    let has_subscribe = content.contains(".subscribe(");
    let has_unsubscribe = content.contains("unsubscribe") || content.contains(".unsubscribe");
    if has_subscribe && !has_unsubscribe {
        if let Some(line_num) = lines.iter().position(|l| l.contains(".subscribe(")) {
            issues.push(PerformanceIssue {
                id: Uuid::new_v4().to_string(),
                category: "memory".to_string(),
                severity: "warning".to_string(),
                title: "Subscription without cleanup".to_string(),
                description: "Observable/event subscription without unsubscribe found."
                    .to_string(),
                file_path: Some(file_path.to_string()),
                line_number: Some((line_num + 1) as u32),
                suggestion: "Store the subscription and call unsubscribe in cleanup."
                    .to_string(),
            });
        }
    }
}

/// Detect expensive operations in hot paths.
fn detect_expensive_operations(
    _content: &str,
    lines: &[&str],
    file_path: &str,
    issues: &mut Vec<PerformanceIssue>,
) {
    let mut in_loop = false;

    for (i, line) in lines.iter().enumerate() {
        let trimmed = line.trim();

        if trimmed.starts_with("for ")
            || trimmed.starts_with("for(")
            || trimmed.starts_with("while ")
            || trimmed.contains(".forEach(")
            || trimmed.contains(".map(")
        {
            in_loop = true;
        }

        if in_loop {
            // new RegExp in loop
            if trimmed.contains("new RegExp") && !trimmed.starts_with("//") {
                issues.push(PerformanceIssue {
                    id: Uuid::new_v4().to_string(),
                    category: "query-patterns".to_string(),
                    severity: "warning".to_string(),
                    title: "RegExp construction in loop".to_string(),
                    description: "Creating new RegExp objects inside a loop is expensive."
                        .to_string(),
                    file_path: Some(file_path.to_string()),
                    line_number: Some((i + 1) as u32),
                    suggestion: "Move RegExp construction outside the loop."
                        .to_string(),
                });
            }

            // JSON.parse in loop
            if trimmed.contains("JSON.parse") && !trimmed.starts_with("//") {
                issues.push(PerformanceIssue {
                    id: Uuid::new_v4().to_string(),
                    category: "query-patterns".to_string(),
                    severity: "info".to_string(),
                    title: "JSON.parse in loop".to_string(),
                    description: "Parsing JSON inside a loop can be expensive for large payloads."
                        .to_string(),
                    file_path: Some(file_path.to_string()),
                    line_number: Some((i + 1) as u32),
                    suggestion: "Consider parsing once before the loop if possible."
                        .to_string(),
                });
            }
        }

        if in_loop && trimmed == "}" {
            in_loop = false;
        }
    }
}

/// Scan project structure for architecture-level findings.
fn scan_architecture(project_path: &Path) -> Vec<ArchitectureFinding> {
    let mut findings = Vec::new();

    check_bundle_size(project_path, &mut findings);
    check_caching_strategy(project_path, &mut findings);
    check_api_design(project_path, &mut findings);
    check_database_patterns(project_path, &mut findings);

    findings
}

/// Check for heavy dependencies that impact bundle size.
fn check_bundle_size(project_path: &Path, findings: &mut Vec<ArchitectureFinding>) {
    let pkg_json = project_path.join("package.json");
    if !pkg_json.exists() {
        return;
    }

    let content = match std::fs::read_to_string(&pkg_json) {
        Ok(c) => c,
        Err(_) => return,
    };

    let heavy_deps = [
        ("moment", "moment.js is 300KB+. Use date-fns or dayjs instead."),
        ("\"lodash\"", "Full lodash is 70KB+. Use lodash-es or individual imports."),
    ];

    for (dep, recommendation) in &heavy_deps {
        if content.contains(dep) {
            findings.push(ArchitectureFinding {
                id: Uuid::new_v4().to_string(),
                category: "bundle".to_string(),
                status: "warning".to_string(),
                title: format!("Heavy dependency: {}", dep.trim_matches('"')),
                description: format!("package.json includes {}", dep.trim_matches('"')),
                recommendation: recommendation.to_string(),
            });
        }
    }

    // Count total dependencies
    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&content) {
        let dep_count = parsed
            .get("dependencies")
            .and_then(|d| d.as_object())
            .map(|d| d.len())
            .unwrap_or(0);

        if dep_count > 50 {
            findings.push(ArchitectureFinding {
                id: Uuid::new_v4().to_string(),
                category: "bundle".to_string(),
                status: "warning".to_string(),
                title: "Large dependency count".to_string(),
                description: format!("{} production dependencies detected.", dep_count),
                recommendation:
                    "Audit dependencies with `npx depcheck` to remove unused packages."
                        .to_string(),
            });
        } else {
            findings.push(ArchitectureFinding {
                id: Uuid::new_v4().to_string(),
                category: "bundle".to_string(),
                status: "good".to_string(),
                title: "Reasonable dependency count".to_string(),
                description: format!("{} production dependencies.", dep_count),
                recommendation: String::new(),
            });
        }
    }
}

/// Check for caching strategy.
fn check_caching_strategy(project_path: &Path, findings: &mut Vec<ArchitectureFinding>) {
    let pkg_json = project_path.join("package.json");
    let content = pkg_json
        .exists()
        .then(|| std::fs::read_to_string(&pkg_json).ok())
        .flatten()
        .unwrap_or_default();

    let has_react_query = content.contains("@tanstack/react-query") || content.contains("react-query");
    let has_swr = content.contains("\"swr\"");
    let has_redis = content.contains("redis") || content.contains("ioredis");

    if has_react_query || has_swr {
        findings.push(ArchitectureFinding {
            id: Uuid::new_v4().to_string(),
            category: "caching".to_string(),
            status: "good".to_string(),
            title: "Client-side data caching".to_string(),
            description: format!(
                "Using {} for client-side caching.",
                if has_react_query { "React Query" } else { "SWR" }
            ),
            recommendation: String::new(),
        });
    } else if content.contains("\"react\"") {
        findings.push(ArchitectureFinding {
            id: Uuid::new_v4().to_string(),
            category: "caching".to_string(),
            status: "missing".to_string(),
            title: "No client-side data caching".to_string(),
            description: "No React Query or SWR detected for client-side caching.".to_string(),
            recommendation:
                "Consider adding @tanstack/react-query or SWR for API response caching."
                    .to_string(),
        });
    }

    if has_redis {
        findings.push(ArchitectureFinding {
            id: Uuid::new_v4().to_string(),
            category: "caching".to_string(),
            status: "good".to_string(),
            title: "Server-side caching".to_string(),
            description: "Redis detected for server-side caching.".to_string(),
            recommendation: String::new(),
        });
    }
}

/// Check for API design patterns.
fn check_api_design(project_path: &Path, findings: &mut Vec<ArchitectureFinding>) {
    let pkg_json = project_path.join("package.json");
    let content = pkg_json
        .exists()
        .then(|| std::fs::read_to_string(&pkg_json).ok())
        .flatten()
        .unwrap_or_default();

    // Check for rate limiting
    let has_rate_limit = content.contains("rate-limit")
        || content.contains("express-rate-limit")
        || content.contains("bottleneck");

    if !has_rate_limit && (content.contains("express") || content.contains("fastify") || content.contains("hono")) {
        findings.push(ArchitectureFinding {
            id: Uuid::new_v4().to_string(),
            category: "api-design".to_string(),
            status: "missing".to_string(),
            title: "No rate limiting".to_string(),
            description: "API server detected but no rate limiting package found.".to_string(),
            recommendation: "Add express-rate-limit or similar to protect API endpoints."
                .to_string(),
        });
    }

    // Check for response compression
    let has_compression = content.contains("compression") || content.contains("shrink-ray");
    if !has_compression && (content.contains("express") || content.contains("fastify")) {
        findings.push(ArchitectureFinding {
            id: Uuid::new_v4().to_string(),
            category: "api-design".to_string(),
            status: "missing".to_string(),
            title: "No response compression".to_string(),
            description: "API server detected without compression middleware.".to_string(),
            recommendation: "Add the compression package for gzip/brotli response compression."
                .to_string(),
        });
    }
}

/// Check for database design patterns.
fn check_database_patterns(project_path: &Path, findings: &mut Vec<ArchitectureFinding>) {
    let pkg_json = project_path.join("package.json");
    let content = pkg_json
        .exists()
        .then(|| std::fs::read_to_string(&pkg_json).ok())
        .flatten()
        .unwrap_or_default();

    // Check for ORM/query builder with connection pooling
    let has_prisma = content.contains("prisma");
    let has_drizzle = content.contains("drizzle");
    let has_typeorm = content.contains("typeorm");
    let has_orm = has_prisma || has_drizzle || has_typeorm;

    if has_orm {
        findings.push(ArchitectureFinding {
            id: Uuid::new_v4().to_string(),
            category: "api-design".to_string(),
            status: "good".to_string(),
            title: "ORM/Query builder detected".to_string(),
            description: format!(
                "Using {}.",
                if has_prisma { "Prisma" } else if has_drizzle { "Drizzle" } else { "TypeORM" }
            ),
            recommendation: String::new(),
        });
    }

    // Check for connection pooling (Rust)
    let cargo_toml = project_path.join("Cargo.toml");
    if cargo_toml.exists() {
        if let Ok(cargo_content) = std::fs::read_to_string(&cargo_toml) {
            if cargo_content.contains("r2d2") || cargo_content.contains("deadpool") || cargo_content.contains("bb8") {
                findings.push(ArchitectureFinding {
                    id: Uuid::new_v4().to_string(),
                    category: "api-design".to_string(),
                    status: "good".to_string(),
                    title: "Connection pooling detected".to_string(),
                    description: "Database connection pool library found in Cargo.toml.".to_string(),
                    recommendation: String::new(),
                });
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_scores_no_issues() {
        let issues: Vec<PerformanceIssue> = vec![];
        let scores = calculate_scores(&issues);

        assert_eq!(scores.query_patterns, MAX_QUERY_PATTERNS);
        assert_eq!(scores.rendering, MAX_RENDERING);
        assert_eq!(scores.memory, MAX_MEMORY);
        assert_eq!(scores.bundle, MAX_BUNDLE);
        assert_eq!(scores.caching, MAX_CACHING);
        assert_eq!(scores.api_design, MAX_API_DESIGN);
    }

    #[test]
    fn test_calculate_scores_critical_deduction() {
        let issues = vec![PerformanceIssue {
            id: "1".to_string(),
            category: "query-patterns".to_string(),
            severity: "critical".to_string(),
            title: "N+1".to_string(),
            description: "test".to_string(),
            file_path: None,
            line_number: None,
            suggestion: "fix".to_string(),
        }];
        let scores = calculate_scores(&issues);

        assert_eq!(scores.query_patterns, MAX_QUERY_PATTERNS - 5);
        assert_eq!(scores.rendering, MAX_RENDERING); // unchanged
    }

    #[test]
    fn test_calculate_scores_warning_deduction() {
        let issues = vec![PerformanceIssue {
            id: "1".to_string(),
            category: "rendering".to_string(),
            severity: "warning".to_string(),
            title: "test".to_string(),
            description: "test".to_string(),
            file_path: None,
            line_number: None,
            suggestion: "fix".to_string(),
        }];
        let scores = calculate_scores(&issues);

        assert_eq!(scores.rendering, MAX_RENDERING - 3);
    }

    #[test]
    fn test_calculate_scores_info_deduction() {
        let issues = vec![PerformanceIssue {
            id: "1".to_string(),
            category: "memory".to_string(),
            severity: "info".to_string(),
            title: "test".to_string(),
            description: "test".to_string(),
            file_path: None,
            line_number: None,
            suggestion: "fix".to_string(),
        }];
        let scores = calculate_scores(&issues);

        assert_eq!(scores.memory, MAX_MEMORY - 1);
    }

    #[test]
    fn test_calculate_scores_floors_at_zero() {
        // Enough criticals to go below zero
        let issues: Vec<PerformanceIssue> = (0..10)
            .map(|i| PerformanceIssue {
                id: i.to_string(),
                category: "memory".to_string(),
                severity: "critical".to_string(),
                title: "test".to_string(),
                description: "test".to_string(),
                file_path: None,
                line_number: None,
                suggestion: "fix".to_string(),
            })
            .collect();
        let scores = calculate_scores(&issues);

        assert_eq!(scores.memory, 0);
    }

    #[test]
    fn test_calculate_scores_multiple_categories() {
        let issues = vec![
            PerformanceIssue {
                id: "1".to_string(),
                category: "query-patterns".to_string(),
                severity: "critical".to_string(),
                title: "N+1".to_string(),
                description: "test".to_string(),
                file_path: None,
                line_number: None,
                suggestion: "fix".to_string(),
            },
            PerformanceIssue {
                id: "2".to_string(),
                category: "rendering".to_string(),
                severity: "warning".to_string(),
                title: "rerender".to_string(),
                description: "test".to_string(),
                file_path: None,
                line_number: None,
                suggestion: "fix".to_string(),
            },
            PerformanceIssue {
                id: "3".to_string(),
                category: "bundle".to_string(),
                severity: "info".to_string(),
                title: "big".to_string(),
                description: "test".to_string(),
                file_path: None,
                line_number: None,
                suggestion: "fix".to_string(),
            },
        ];
        let scores = calculate_scores(&issues);

        assert_eq!(scores.query_patterns, MAX_QUERY_PATTERNS - 5);
        assert_eq!(scores.rendering, MAX_RENDERING - 3);
        assert_eq!(scores.bundle, MAX_BUNDLE - 1);
        assert_eq!(scores.memory, MAX_MEMORY); // no memory issues
    }

    #[test]
    fn test_is_scannable_file() {
        assert!(is_scannable_file("app.ts"));
        assert!(is_scannable_file("App.tsx"));
        assert!(is_scannable_file("main.rs"));
        assert!(is_scannable_file("utils.py"));
        assert!(is_scannable_file("handler.go"));
        assert!(!is_scannable_file("App.test.tsx"));
        assert!(!is_scannable_file("utils.spec.ts"));
        assert!(!is_scannable_file("readme.md"));
        assert!(!is_scannable_file("package.json"));
    }

    #[test]
    fn test_detect_n_plus_one_in_loop() {
        let content = r#"
for (const user of users) {
    const posts = await db.query("SELECT * FROM posts WHERE user_id = ?", user.id);
}
"#;
        let lines: Vec<&str> = content.lines().collect();
        let mut issues = Vec::new();
        detect_n_plus_one(content, &lines, "test.ts", &mut issues);

        assert!(!issues.is_empty());
        assert_eq!(issues[0].category, "query-patterns");
        assert_eq!(issues[0].severity, "critical");
    }

    #[test]
    fn test_detect_n_plus_one_async_map() {
        let content = r#"
const results = await items.map(async (item) => {
    return await fetch(`/api/items/${item.id}`);
});
"#;
        let lines: Vec<&str> = content.lines().collect();
        let mut issues = Vec::new();
        detect_n_plus_one(content, &lines, "test.ts", &mut issues);

        let async_map_issues: Vec<&PerformanceIssue> = issues
            .iter()
            .filter(|i| i.title.contains("Sequential async"))
            .collect();
        assert!(!async_map_issues.is_empty());
    }

    #[test]
    fn test_detect_memory_leak_add_event_listener() {
        let content = r#"
window.addEventListener("resize", handleResize);
"#;
        let lines: Vec<&str> = content.lines().collect();
        let mut issues = Vec::new();
        detect_memory_leaks(content, &lines, "test.ts", &mut issues);

        assert!(!issues.is_empty());
        assert_eq!(issues[0].category, "memory");
        assert!(issues[0].title.contains("addEventListener"));
    }

    #[test]
    fn test_detect_memory_leak_set_interval() {
        let content = r#"
const id = setInterval(() => tick(), 1000);
"#;
        let lines: Vec<&str> = content.lines().collect();
        let mut issues = Vec::new();
        detect_memory_leaks(content, &lines, "test.ts", &mut issues);

        assert!(!issues.is_empty());
        assert!(issues[0].title.contains("setInterval"));
    }

    #[test]
    fn test_no_memory_leak_with_cleanup() {
        let content = r#"
window.addEventListener("resize", handleResize);
return () => window.removeEventListener("resize", handleResize);
"#;
        let lines: Vec<&str> = content.lines().collect();
        let mut issues = Vec::new();
        detect_memory_leaks(content, &lines, "test.ts", &mut issues);

        assert!(issues.is_empty());
    }

    #[test]
    fn test_detect_rerender_inline_style() {
        let content = r#"
export function App() {
    return <div style={{ color: "red" }}>Hello</div>;
}
"#;
        let lines: Vec<&str> = content.lines().collect();
        let mut issues = Vec::new();
        detect_rerender_risks(content, &lines, "App.tsx", "App.tsx", &mut issues);

        let style_issues: Vec<&PerformanceIssue> = issues
            .iter()
            .filter(|i| i.title.contains("Inline style"))
            .collect();
        assert!(!style_issues.is_empty());
    }

    #[test]
    fn test_detect_expensive_regexp_in_loop() {
        let content = r#"
for (const item of items) {
    const re = new RegExp(item.pattern);
    if (re.test(text)) count++;
}
"#;
        let lines: Vec<&str> = content.lines().collect();
        let mut issues = Vec::new();
        detect_expensive_operations(content, &lines, "test.ts", &mut issues);

        assert!(!issues.is_empty());
        assert!(issues[0].title.contains("RegExp"));
    }

    #[test]
    fn test_analyze_nonexistent_project() {
        let review = analyze_project("/nonexistent/path/12345");

        // Should return a valid review with max scores (no issues found)
        assert!(review.issues.is_empty());
        assert_eq!(review.overall_score, 100);
    }

    #[test]
    fn test_overall_score_calculation() {
        let issues = vec![
            PerformanceIssue {
                id: "1".to_string(),
                category: "query-patterns".to_string(),
                severity: "critical".to_string(),
                title: "test".to_string(),
                description: "test".to_string(),
                file_path: None,
                line_number: None,
                suggestion: "fix".to_string(),
            },
        ];
        let scores = calculate_scores(&issues);
        let total = scores.query_patterns + scores.rendering + scores.memory
            + scores.bundle + scores.caching + scores.api_design;

        assert_eq!(total, 95); // 100 - 5 (one critical)
    }
}
