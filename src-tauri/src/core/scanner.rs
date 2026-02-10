//! @module core/scanner
//! @description Project detection and scanning engine
//!
//! PURPOSE:
//! - Detect project language from config files (package.json, Cargo.toml, etc.)
//! - Identify framework, database, testing, and styling from dependencies
//! - Count source files and detect CLAUDE.md presence
//! - Return DetectionResult with confidence levels per signal
//!
//! DEPENDENCIES:
//! - std::path - File path operations
//! - std::fs - File system reading
//! - serde_json - Parse package.json
//! - models::project - DetectionResult, DetectedValue types
//!
//! EXPORTS:
//! - scan_project_dir - Main scanning function that returns DetectionResult
//!
//! PATTERNS:
//! - High confidence: config file signals (package.json -> TypeScript/JavaScript)
//! - Medium confidence: dependency analysis (express -> Node.js API)
//! - Medium confidence: CDN detection from HTML script tags (cdn.tailwindcss.com -> Tailwind CSS)
//! - Low confidence: file extension counting (proportion-based: share * 0.85)
//! - Detection runs synchronously (project dirs are local)
//!
//! CLAUDE NOTES:
//! - Detection priority: config files > dependencies > CDN tags > file extensions
//! - Framework detection depends on language detection happening first
//! - All detected values include a "source" string explaining how they were found
//! - CDN detection scans .html files in project root for known CDN URLs
//! - Extension confidence uses proportion: (lang_count / total_source_files) * 0.85
//! - Chrome Extension detection: manifest.json with manifest_version field
//! - See spec Part 5.1 for full scanner specification

use std::collections::HashMap;
use std::fs;
use std::path::Path;

use crate::models::project::{DetectedValue, DetectionResult};

/// Scan a project directory and return detection results.
/// This is the primary entry point for project analysis.
pub fn scan_project_dir(path: &str) -> Result<DetectionResult, String> {
    let project_path = Path::new(path);

    if !project_path.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    if !project_path.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }

    let project_name = project_path
        .file_name()
        .and_then(|n| n.to_str())
        .map(|s| s.to_string());

    let has_existing_claude_md = project_path.join("CLAUDE.md").exists();
    let file_count = count_source_files(project_path);

    // Detect language (highest priority signal)
    let language = detect_language(project_path);

    // Detect framework (depends on language + config)
    let framework = detect_framework(project_path, &language);

    // Detect database
    let database = detect_database(project_path);

    // Detect testing framework
    let testing = detect_testing(project_path, &language);

    // Detect styling
    let styling = detect_styling(project_path);

    // Detect project type
    let project_type = detect_project_type(project_path, &language, &framework);

    // Overall confidence is based on highest signal strength
    let confidence = if language.as_ref().is_some_and(|l| l.confidence >= 0.9) {
        "high"
    } else if language.as_ref().is_some_and(|l| l.confidence >= 0.5) {
        "medium"
    } else if language.is_some() {
        "low"
    } else {
        "none"
    };

    Ok(DetectionResult {
        confidence: confidence.to_string(),
        language,
        framework,
        database,
        testing,
        styling,
        project_name,
        project_type,
        file_count,
        has_existing_claude_md,
    })
}

/// Count source files in the project directory (non-recursive for top-level,
/// recursive for src/ and lib/ directories). Excludes node_modules, target, .git, etc.
fn count_source_files(path: &Path) -> u32 {
    let mut count = 0u32;
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
    ];

    fn walk_dir(dir: &Path, count: &mut u32, ignore_dirs: &[&str], depth: u32) {
        if depth > 10 {
            return;
        }
        let entries = match fs::read_dir(dir) {
            Ok(e) => e,
            Err(_) => return,
        };
        for entry in entries.flatten() {
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();

            if path.is_dir() {
                if !ignore_dirs.contains(&name.as_str()) && !name.starts_with('.') {
                    walk_dir(&path, count, ignore_dirs, depth + 1);
                }
            } else if is_source_file(&name) {
                *count += 1;
            }
        }
    }

    walk_dir(path, &mut count, &ignore_dirs, 0);
    count
}

fn is_source_file(name: &str) -> bool {
    let source_extensions = [
        ".ts", ".tsx", ".js", ".jsx", ".rs", ".py", ".go", ".dart", ".java", ".kt", ".swift",
        ".rb", ".php", ".cs", ".cpp", ".c", ".h", ".vue", ".svelte",
    ];
    source_extensions.iter().any(|ext| name.ends_with(ext))
}

// ---------------------------------------------------------------------------
// Language detection
// ---------------------------------------------------------------------------

fn detect_language(path: &Path) -> Option<DetectedValue> {
    // Priority 1: Config file signals (high confidence)
    if let Some(lang) = detect_language_from_config(path) {
        return Some(lang);
    }

    // Priority 2: File extension counting (low confidence)
    detect_language_from_extensions(path)
}

fn detect_language_from_config(path: &Path) -> Option<DetectedValue> {
    // TypeScript: tsconfig.json present
    if path.join("tsconfig.json").exists() {
        return Some(DetectedValue {
            value: "TypeScript".to_string(),
            confidence: 0.95,
            source: "tsconfig.json found".to_string(),
        });
    }

    // Rust: Cargo.toml present
    if path.join("Cargo.toml").exists() {
        return Some(DetectedValue {
            value: "Rust".to_string(),
            confidence: 0.95,
            source: "Cargo.toml found".to_string(),
        });
    }

    // Python: pyproject.toml, setup.py, or requirements.txt
    if path.join("pyproject.toml").exists() {
        return Some(DetectedValue {
            value: "Python".to_string(),
            confidence: 0.95,
            source: "pyproject.toml found".to_string(),
        });
    }
    if path.join("setup.py").exists() || path.join("requirements.txt").exists() {
        return Some(DetectedValue {
            value: "Python".to_string(),
            confidence: 0.9,
            source: "setup.py or requirements.txt found".to_string(),
        });
    }

    // Go: go.mod present
    if path.join("go.mod").exists() {
        return Some(DetectedValue {
            value: "Go".to_string(),
            confidence: 0.95,
            source: "go.mod found".to_string(),
        });
    }

    // Dart/Flutter: pubspec.yaml
    if path.join("pubspec.yaml").exists() {
        return Some(DetectedValue {
            value: "Dart".to_string(),
            confidence: 0.95,
            source: "pubspec.yaml found".to_string(),
        });
    }

    // Java: pom.xml or build.gradle
    if path.join("pom.xml").exists() {
        return Some(DetectedValue {
            value: "Java".to_string(),
            confidence: 0.95,
            source: "pom.xml found".to_string(),
        });
    }
    if path.join("build.gradle").exists() || path.join("build.gradle.kts").exists() {
        return Some(DetectedValue {
            value: "Java".to_string(),
            confidence: 0.85,
            source: "build.gradle found".to_string(),
        });
    }

    // Ruby: Gemfile
    if path.join("Gemfile").exists() {
        return Some(DetectedValue {
            value: "Ruby".to_string(),
            confidence: 0.95,
            source: "Gemfile found".to_string(),
        });
    }

    // PHP: composer.json
    if path.join("composer.json").exists() {
        return Some(DetectedValue {
            value: "PHP".to_string(),
            confidence: 0.95,
            source: "composer.json found".to_string(),
        });
    }

    // JavaScript (without TypeScript): package.json exists but no tsconfig
    if path.join("package.json").exists() {
        return Some(DetectedValue {
            value: "JavaScript".to_string(),
            confidence: 0.8,
            source: "package.json found (no tsconfig.json)".to_string(),
        });
    }

    // Swift: Package.swift or .xcodeproj
    if path.join("Package.swift").exists() {
        return Some(DetectedValue {
            value: "Swift".to_string(),
            confidence: 0.95,
            source: "Package.swift found".to_string(),
        });
    }

    None
}

fn detect_language_from_extensions(path: &Path) -> Option<DetectedValue> {
    let mut ext_counts: HashMap<String, u32> = HashMap::new();
    let ignore_dirs = [
        "node_modules",
        "target",
        ".git",
        "dist",
        "build",
        "__pycache__",
    ];

    fn count_extensions(
        dir: &Path,
        counts: &mut HashMap<String, u32>,
        ignore_dirs: &[&str],
        depth: u32,
    ) {
        if depth > 5 {
            return;
        }
        let entries = match fs::read_dir(dir) {
            Ok(e) => e,
            Err(_) => return,
        };
        for entry in entries.flatten() {
            let p = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            if p.is_dir() {
                if !ignore_dirs.contains(&name.as_str()) && !name.starts_with('.') {
                    count_extensions(&p, counts, ignore_dirs, depth + 1);
                }
            } else if let Some(ext) = p.extension().and_then(|e| e.to_str()) {
                *counts.entry(ext.to_lowercase()).or_insert(0) += 1;
            }
        }
    }

    count_extensions(path, &mut ext_counts, &ignore_dirs, 0);

    let ext_to_lang = [
        ("ts", "TypeScript"),
        ("tsx", "TypeScript"),
        ("js", "JavaScript"),
        ("jsx", "JavaScript"),
        ("rs", "Rust"),
        ("py", "Python"),
        ("go", "Go"),
        ("dart", "Dart"),
        ("java", "Java"),
        ("kt", "Kotlin"),
        ("swift", "Swift"),
        ("rb", "Ruby"),
        ("php", "PHP"),
        ("cs", "C#"),
        ("cpp", "C++"),
        ("c", "C"),
        ("vue", "TypeScript"),
        ("svelte", "TypeScript"),
    ];

    let mut lang_counts: HashMap<&str, u32> = HashMap::new();
    let mut total_source_files: u32 = 0;
    for (ext, lang) in &ext_to_lang {
        if let Some(&count) = ext_counts.get(*ext) {
            *lang_counts.entry(lang).or_insert(0) += count;
            total_source_files += count;
        }
    }

    if total_source_files == 0 {
        return None;
    }

    lang_counts
        .into_iter()
        .max_by_key(|(_, count)| *count)
        .filter(|(_, count)| *count > 0)
        .map(|(lang, count)| {
            // Confidence is based on what share of source files belong to this language.
            // If 100% of source files are one language, confidence is 0.85.
            // Scaled down proportionally when mixed (e.g. 50% share -> 0.425).
            let share = count as f64 / total_source_files as f64;
            let confidence = share * 0.85;
            DetectedValue {
                value: lang.to_string(),
                confidence,
                source: format!(
                    "{}/{} source files ({:.0}%)",
                    count, total_source_files, share * 100.0
                ),
            }
        })
}

// ---------------------------------------------------------------------------
// Framework detection
// ---------------------------------------------------------------------------

fn detect_framework(path: &Path, language: &Option<DetectedValue>) -> Option<DetectedValue> {
    let lang = language.as_ref().map(|l| l.value.as_str()).unwrap_or("");

    match lang {
        "TypeScript" | "JavaScript" => detect_js_framework(path),
        "Python" => detect_python_framework(path),
        "Rust" => detect_rust_framework(path),
        "Go" => detect_go_framework(path),
        "Dart" => {
            if path.join("pubspec.yaml").exists() {
                let content = fs::read_to_string(path.join("pubspec.yaml")).unwrap_or_default();
                if content.contains("flutter:") {
                    return Some(DetectedValue {
                        value: "Flutter".to_string(),
                        confidence: 0.95,
                        source: "flutter dependency in pubspec.yaml".to_string(),
                    });
                }
            }
            None
        }
        "Ruby" => detect_ruby_framework(path),
        "PHP" => detect_php_framework(path),
        _ => None,
    }
}

fn detect_js_framework(path: &Path) -> Option<DetectedValue> {
    // Check for Chrome Extension (manifest.json with manifest_version)
    let manifest_path = path.join("manifest.json");
    if manifest_path.exists() {
        if let Ok(content) = fs::read_to_string(&manifest_path) {
            if let Ok(manifest) = serde_json::from_str::<serde_json::Value>(&content) {
                // Chrome extensions have manifest_version (2 or 3)
                if manifest.get("manifest_version").is_some() {
                    let version = manifest
                        .get("manifest_version")
                        .and_then(|v| v.as_u64())
                        .unwrap_or(0);
                    let source = format!("manifest.json with manifest_version {}", version);
                    return Some(DetectedValue {
                        value: "Chrome Extension".to_string(),
                        confidence: 0.95,
                        source,
                    });
                }
            }
        }
    }

    // Check for Tauri (structural signal, independent of package.json)
    if path.join("src-tauri").exists() {
        return Some(DetectedValue {
            value: "Tauri".to_string(),
            confidence: 0.95,
            source: "src-tauri directory found".to_string(),
        });
    }

    let pkg_json_path = path.join("package.json");
    if pkg_json_path.exists() {
        if let Ok(content) = fs::read_to_string(&pkg_json_path) {
            if let Ok(pkg) = serde_json::from_str::<serde_json::Value>(&content) {
                let deps = merge_deps(&pkg);

                // Check in priority order (most specific first)
                let frameworks = [
                    ("next", "Next.js"),
                    ("nuxt", "Nuxt"),
                    ("@remix-run/react", "Remix"),
                    ("@angular/core", "Angular"),
                    ("vue", "Vue"),
                    ("svelte", "Svelte"),
                    ("solid-js", "SolidJS"),
                    ("react", "React"),
                    ("express", "Express"),
                    ("fastify", "Fastify"),
                    ("hono", "Hono"),
                    ("@nestjs/core", "NestJS"),
                    ("electron", "Electron"),
                ];

                // Check for Vite (secondary signal, not a framework itself)
                let has_vite = deps.contains_key("vite");

                for (dep, name) in &frameworks {
                    if deps.contains_key(*dep) {
                        let source = if has_vite && *name != "Express" && *name != "Fastify" {
                            format!("{} + Vite in package.json dependencies", dep)
                        } else {
                            format!("{} in package.json dependencies", dep)
                        };
                        return Some(DetectedValue {
                            value: name.to_string(),
                            confidence: 0.9,
                            source,
                        });
                    }
                }
            }
        }
    }

    // Fallback: scan HTML files for CDN-loaded frameworks
    detect_framework_from_html(path)
}

/// Scan HTML files in the project root for CDN script tags that indicate frameworks.
fn detect_framework_from_html(path: &Path) -> Option<DetectedValue> {
    let cdn_frameworks = [
        ("unpkg.com/react", "React"),
        ("cdn.jsdelivr.net/npm/react", "React"),
        ("cdnjs.cloudflare.com/ajax/libs/react", "React"),
        ("unpkg.com/vue", "Vue"),
        ("cdn.jsdelivr.net/npm/vue", "Vue"),
        ("unpkg.com/@angular", "Angular"),
        ("cdn.jsdelivr.net/npm/@angular", "Angular"),
        ("unpkg.com/svelte", "Svelte"),
    ];

    scan_html_for_patterns(path, &cdn_frameworks, "CDN script tag in HTML")
}

/// Scan HTML files in the project root for patterns (CDN URLs).
/// Returns the first match found with the given source description.
fn scan_html_for_patterns(
    path: &Path,
    patterns: &[(&str, &str)],
    source_prefix: &str,
) -> Option<DetectedValue> {
    let entries = fs::read_dir(path).ok()?;
    for entry in entries.flatten() {
        let file_path = entry.path();
        if file_path.extension().and_then(|e| e.to_str()) == Some("html") {
            if let Ok(content) = fs::read_to_string(&file_path) {
                for (pattern, name) in patterns {
                    if content.contains(pattern) {
                        return Some(DetectedValue {
                            value: name.to_string(),
                            confidence: 0.8,
                            source: format!(
                                "{} ({})",
                                source_prefix,
                                file_path.file_name().unwrap_or_default().to_string_lossy()
                            ),
                        });
                    }
                }
            }
        }
    }
    None
}

fn detect_python_framework(path: &Path) -> Option<DetectedValue> {
    // Check pyproject.toml
    if let Ok(content) = fs::read_to_string(path.join("pyproject.toml")) {
        let frameworks = [
            ("django", "Django"),
            ("fastapi", "FastAPI"),
            ("flask", "Flask"),
            ("starlette", "Starlette"),
            ("tornado", "Tornado"),
        ];
        for (dep, name) in &frameworks {
            if content.to_lowercase().contains(dep) {
                return Some(DetectedValue {
                    value: name.to_string(),
                    confidence: 0.9,
                    source: format!("{} in pyproject.toml", dep),
                });
            }
        }
    }

    // Check requirements.txt
    if let Ok(content) = fs::read_to_string(path.join("requirements.txt")) {
        let frameworks = [
            ("django", "Django"),
            ("fastapi", "FastAPI"),
            ("flask", "Flask"),
        ];
        for (dep, name) in &frameworks {
            if content.to_lowercase().contains(dep) {
                return Some(DetectedValue {
                    value: name.to_string(),
                    confidence: 0.85,
                    source: format!("{} in requirements.txt", dep),
                });
            }
        }
    }

    None
}

fn detect_rust_framework(path: &Path) -> Option<DetectedValue> {
    if let Ok(content) = fs::read_to_string(path.join("Cargo.toml")) {
        let frameworks = [
            ("tauri", "Tauri"),
            ("actix-web", "Actix Web"),
            ("axum", "Axum"),
            ("rocket", "Rocket"),
            ("warp", "Warp"),
            ("leptos", "Leptos"),
            ("yew", "Yew"),
            ("dioxus", "Dioxus"),
        ];
        for (dep, name) in &frameworks {
            if content.contains(dep) {
                return Some(DetectedValue {
                    value: name.to_string(),
                    confidence: 0.9,
                    source: format!("{} in Cargo.toml dependencies", dep),
                });
            }
        }
    }
    None
}

fn detect_go_framework(path: &Path) -> Option<DetectedValue> {
    if let Ok(content) = fs::read_to_string(path.join("go.mod")) {
        let frameworks = [
            ("github.com/gin-gonic/gin", "Gin"),
            ("github.com/gofiber/fiber", "Fiber"),
            ("github.com/labstack/echo", "Echo"),
            ("github.com/gorilla/mux", "Gorilla Mux"),
        ];
        for (dep, name) in &frameworks {
            if content.contains(dep) {
                return Some(DetectedValue {
                    value: name.to_string(),
                    confidence: 0.9,
                    source: format!("{} in go.mod", dep),
                });
            }
        }
    }
    None
}

fn detect_ruby_framework(path: &Path) -> Option<DetectedValue> {
    if let Ok(content) = fs::read_to_string(path.join("Gemfile")) {
        if content.contains("rails") {
            return Some(DetectedValue {
                value: "Rails".to_string(),
                confidence: 0.9,
                source: "rails in Gemfile".to_string(),
            });
        }
        if content.contains("sinatra") {
            return Some(DetectedValue {
                value: "Sinatra".to_string(),
                confidence: 0.9,
                source: "sinatra in Gemfile".to_string(),
            });
        }
    }
    None
}

fn detect_php_framework(path: &Path) -> Option<DetectedValue> {
    if let Ok(content) = fs::read_to_string(path.join("composer.json")) {
        if content.contains("laravel/framework") {
            return Some(DetectedValue {
                value: "Laravel".to_string(),
                confidence: 0.9,
                source: "laravel/framework in composer.json".to_string(),
            });
        }
        if content.contains("symfony/") {
            return Some(DetectedValue {
                value: "Symfony".to_string(),
                confidence: 0.85,
                source: "symfony packages in composer.json".to_string(),
            });
        }
    }
    None
}

// ---------------------------------------------------------------------------
// Database detection
// ---------------------------------------------------------------------------

fn detect_database(path: &Path) -> Option<DetectedValue> {
    // Check package.json
    if let Ok(content) = fs::read_to_string(path.join("package.json")) {
        if let Ok(pkg) = serde_json::from_str::<serde_json::Value>(&content) {
            let deps = merge_deps(&pkg);
            let dbs = [
                ("pg", "PostgreSQL"),
                ("postgres", "PostgreSQL"),
                ("@prisma/client", "PostgreSQL"),
                ("mysql2", "MySQL"),
                ("mongodb", "MongoDB"),
                ("mongoose", "MongoDB"),
                ("better-sqlite3", "SQLite"),
                ("sqlite3", "SQLite"),
                ("redis", "Redis"),
                ("@supabase/supabase-js", "Supabase"),
                ("firebase", "Firebase"),
                ("firebase-admin", "Firebase"),
            ];
            for (dep, name) in &dbs {
                if deps.contains_key(*dep) {
                    return Some(DetectedValue {
                        value: name.to_string(),
                        confidence: 0.85,
                        source: format!("{} in package.json", dep),
                    });
                }
            }
        }
    }

    // Check Cargo.toml
    if let Ok(content) = fs::read_to_string(path.join("Cargo.toml")) {
        let dbs = [
            ("rusqlite", "SQLite"),
            ("sqlx", "PostgreSQL"),
            ("diesel", "PostgreSQL"),
            ("mongodb", "MongoDB"),
        ];
        for (dep, name) in &dbs {
            if content.contains(dep) {
                return Some(DetectedValue {
                    value: name.to_string(),
                    confidence: 0.85,
                    source: format!("{} in Cargo.toml", dep),
                });
            }
        }
    }

    // Check for Prisma schema
    if path.join("prisma").is_dir() || path.join("prisma/schema.prisma").exists() {
        if let Ok(content) = fs::read_to_string(path.join("prisma/schema.prisma")) {
            if content.contains("postgresql") {
                return Some(DetectedValue {
                    value: "PostgreSQL".to_string(),
                    confidence: 0.95,
                    source: "postgresql provider in prisma/schema.prisma".to_string(),
                });
            }
            if content.contains("mysql") {
                return Some(DetectedValue {
                    value: "MySQL".to_string(),
                    confidence: 0.95,
                    source: "mysql provider in prisma/schema.prisma".to_string(),
                });
            }
            if content.contains("sqlite") {
                return Some(DetectedValue {
                    value: "SQLite".to_string(),
                    confidence: 0.95,
                    source: "sqlite provider in prisma/schema.prisma".to_string(),
                });
            }
        }
    }

    // Check docker-compose for database services
    for dc_name in &["docker-compose.yml", "docker-compose.yaml", "compose.yml"] {
        if let Ok(content) = fs::read_to_string(path.join(dc_name)) {
            if content.contains("postgres") {
                return Some(DetectedValue {
                    value: "PostgreSQL".to_string(),
                    confidence: 0.8,
                    source: format!("postgres in {}", dc_name),
                });
            }
            if content.contains("mongo") {
                return Some(DetectedValue {
                    value: "MongoDB".to_string(),
                    confidence: 0.8,
                    source: format!("mongo in {}", dc_name),
                });
            }
            if content.contains("mysql") {
                return Some(DetectedValue {
                    value: "MySQL".to_string(),
                    confidence: 0.8,
                    source: format!("mysql in {}", dc_name),
                });
            }
        }
    }

    None
}

// ---------------------------------------------------------------------------
// Testing framework detection
// ---------------------------------------------------------------------------

fn detect_testing(path: &Path, language: &Option<DetectedValue>) -> Option<DetectedValue> {
    let lang = language.as_ref().map(|l| l.value.as_str()).unwrap_or("");

    match lang {
        "TypeScript" | "JavaScript" => {
            if let Ok(content) = fs::read_to_string(path.join("package.json")) {
                if let Ok(pkg) = serde_json::from_str::<serde_json::Value>(&content) {
                    let deps = merge_deps(&pkg);
                    let testers = [
                        ("vitest", "Vitest"),
                        ("jest", "Jest"),
                        ("@testing-library/react", "Testing Library"),
                        ("mocha", "Mocha"),
                        ("cypress", "Cypress"),
                        ("playwright", "Playwright"),
                        ("@playwright/test", "Playwright"),
                    ];
                    for (dep, name) in &testers {
                        if deps.contains_key(*dep) {
                            return Some(DetectedValue {
                                value: name.to_string(),
                                confidence: 0.9,
                                source: format!("{} in package.json", dep),
                            });
                        }
                    }
                }
            }
        }
        "Python" => {
            if path.join("pytest.ini").exists() || path.join("conftest.py").exists() {
                return Some(DetectedValue {
                    value: "pytest".to_string(),
                    confidence: 0.9,
                    source: "pytest config file found".to_string(),
                });
            }
            // Check pyproject.toml for pytest
            if let Ok(content) = fs::read_to_string(path.join("pyproject.toml")) {
                if content.contains("pytest") {
                    return Some(DetectedValue {
                        value: "pytest".to_string(),
                        confidence: 0.85,
                        source: "pytest in pyproject.toml".to_string(),
                    });
                }
            }
        }
        "Rust" => {
            // Rust has built-in testing; check for additional frameworks
            if let Ok(content) = fs::read_to_string(path.join("Cargo.toml")) {
                if content.contains("insta") {
                    return Some(DetectedValue {
                        value: "insta (snapshot)".to_string(),
                        confidence: 0.85,
                        source: "insta in Cargo.toml".to_string(),
                    });
                }
            }
            return Some(DetectedValue {
                value: "cargo test".to_string(),
                confidence: 0.9,
                source: "Built-in Rust test framework".to_string(),
            });
        }
        "Go" => {
            return Some(DetectedValue {
                value: "go test".to_string(),
                confidence: 0.9,
                source: "Built-in Go test framework".to_string(),
            });
        }
        _ => {}
    }

    None
}

// ---------------------------------------------------------------------------
// Styling detection
// ---------------------------------------------------------------------------

fn detect_styling(path: &Path) -> Option<DetectedValue> {
    // Check package.json for CSS frameworks
    if let Ok(content) = fs::read_to_string(path.join("package.json")) {
        if let Ok(pkg) = serde_json::from_str::<serde_json::Value>(&content) {
            let deps = merge_deps(&pkg);
            let styles = [
                ("tailwindcss", "Tailwind CSS"),
                ("@chakra-ui/react", "Chakra UI"),
                ("@mui/material", "Material UI"),
                ("styled-components", "Styled Components"),
                ("@emotion/react", "Emotion"),
                ("sass", "Sass/SCSS"),
                ("less", "Less"),
                ("bootstrap", "Bootstrap"),
            ];
            for (dep, name) in &styles {
                if deps.contains_key(*dep) {
                    return Some(DetectedValue {
                        value: name.to_string(),
                        confidence: 0.9,
                        source: format!("{} in package.json", dep),
                    });
                }
            }
        }
    }

    // Check for tailwind config file
    if path.join("tailwind.config.js").exists()
        || path.join("tailwind.config.ts").exists()
        || path.join("tailwind.config.mjs").exists()
    {
        return Some(DetectedValue {
            value: "Tailwind CSS".to_string(),
            confidence: 0.95,
            source: "tailwind.config file found".to_string(),
        });
    }

    // Fallback: scan HTML files for CDN-loaded styling libraries
    let cdn_styles = [
        ("cdn.tailwindcss.com", "Tailwind CSS"),
        ("cdn.jsdelivr.net/npm/tailwindcss", "Tailwind CSS"),
        ("cdn.jsdelivr.net/npm/bootstrap", "Bootstrap"),
        ("cdnjs.cloudflare.com/ajax/libs/bootstrap", "Bootstrap"),
        ("cdn.jsdelivr.net/npm/bulma", "Bulma"),
        ("cdnjs.cloudflare.com/ajax/libs/bulma", "Bulma"),
        ("fonts.googleapis.com/css", "Google Fonts"),
    ];

    scan_html_for_patterns(path, &cdn_styles, "CDN link in HTML")
}

// ---------------------------------------------------------------------------
// Project type detection
// ---------------------------------------------------------------------------

fn detect_project_type(
    path: &Path,
    language: &Option<DetectedValue>,
    framework: &Option<DetectedValue>,
) -> Option<String> {
    let fw = framework.as_ref().map(|f| f.value.as_str()).unwrap_or("");
    let lang = language.as_ref().map(|l| l.value.as_str()).unwrap_or("");

    // Framework-based detection
    match fw {
        "Next.js" | "Nuxt" | "Remix" | "SolidJS" | "Svelte" | "Angular" | "Vue" | "React" => {
            return Some("Web App".to_string())
        }
        "Express" | "Fastify" | "Hono" | "NestJS" | "Actix Web" | "Axum" | "Rocket" | "Warp"
        | "FastAPI" | "Django" | "Flask" | "Gin" | "Fiber" | "Rails" | "Laravel" => {
            return Some("API".to_string())
        }
        "Flutter" => return Some("Mobile".to_string()),
        "Tauri" | "Electron" => return Some("Desktop".to_string()),
        "Leptos" | "Yew" | "Dioxus" => return Some("Web App".to_string()),
        "Chrome Extension" => return Some("Extension".to_string()),
        _ => {}
    }

    // Language-based fallback
    if lang == "Swift" { return Some("Mobile".to_string()) }

    // Check for CLI indicators
    if path.join("src/main.rs").exists() && fw.is_empty() && lang == "Rust" {
        if let Ok(content) = fs::read_to_string(path.join("Cargo.toml")) {
            if content.contains("clap") || content.contains("structopt") {
                return Some("CLI".to_string());
            }
        }
    }

    None
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Merge dependencies and devDependencies from package.json into one map
fn merge_deps(pkg: &serde_json::Value) -> HashMap<String, bool> {
    let mut deps = HashMap::new();

    for key in &["dependencies", "devDependencies", "peerDependencies"] {
        if let Some(obj) = pkg.get(key).and_then(|v| v.as_object()) {
            for dep_name in obj.keys() {
                deps.insert(dep_name.clone(), true);
            }
        }
    }

    deps
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_scan_nonexistent_dir() {
        let result = scan_project_dir("/nonexistent/path/xyz");
        assert!(result.is_err());
    }

    #[test]
    fn test_scan_self() {
        // Scan our own project directory - should detect TypeScript + Tauri
        let result = scan_project_dir(env!("CARGO_MANIFEST_DIR").trim_end_matches("/src-tauri"));
        assert!(result.is_ok());
        let det = result.unwrap();
        assert_eq!(det.confidence, "high");
        assert!(det.language.is_some());
        assert_eq!(det.language.as_ref().unwrap().value, "TypeScript");
        assert!(det.file_count > 0);
    }

    #[test]
    fn test_is_source_file() {
        assert!(is_source_file("main.ts"));
        assert!(is_source_file("App.tsx"));
        assert!(is_source_file("lib.rs"));
        assert!(is_source_file("app.py"));
        assert!(!is_source_file("readme.md"));
        assert!(!is_source_file("image.png"));
    }

    #[test]
    fn test_merge_deps() {
        let json: serde_json::Value = serde_json::json!({
            "dependencies": { "react": "^18", "express": "^4" },
            "devDependencies": { "typescript": "^5", "vitest": "^1" }
        });
        let deps = merge_deps(&json);
        assert!(deps.contains_key("react"));
        assert!(deps.contains_key("express"));
        assert!(deps.contains_key("typescript"));
        assert!(deps.contains_key("vitest"));
        assert!(!deps.contains_key("lodash"));
    }

    #[test]
    fn test_chrome_extension_detection() {
        // Test Chrome Extension detection using a temp fixture
        let dir = tempfile::tempdir().expect("Failed to create temp dir");
        let manifest = serde_json::json!({
            "manifest_version": 3,
            "name": "Test Extension",
            "version": "1.0",
            "description": "A test Chrome extension",
            "permissions": ["storage"],
            "action": { "default_popup": "popup.html" }
        });
        std::fs::write(dir.path().join("manifest.json"), manifest.to_string())
            .expect("Failed to write manifest.json");
        // Need a JS file so language detection picks up JavaScript/TypeScript
        std::fs::write(dir.path().join("popup.js"), "console.log('hello');")
            .expect("Failed to write popup.js");

        let result = scan_project_dir(dir.path().to_str().unwrap());
        assert!(result.is_ok(), "Failed to scan chrome extension fixture");
        let det = result.unwrap();

        // Should detect Chrome Extension framework
        assert!(det.framework.is_some(), "Framework not detected");
        assert_eq!(det.framework.as_ref().unwrap().value, "Chrome Extension",
            "Expected Chrome Extension, got {:?}", det.framework);

        // Should detect Extension project type
        assert!(det.project_type.is_some(), "Project type not detected");
        assert_eq!(det.project_type.as_ref().unwrap(), "Extension",
            "Expected Extension project type, got {:?}", det.project_type);
    }
}
