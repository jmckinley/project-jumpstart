//! @module core/generator
//! @description CLAUDE.md generation with AI enhancement and template fallback
//!
//! PURPOSE:
//! - Generate CLAUDE.md content from project data using AI when an API key is available
//! - Fall back to template-based generation when no API key is configured
//! - Create structured documentation following the standard CLAUDE.md format
//! - Include tech stack, project structure, and key conventions
//!
//! DEPENDENCIES:
//! - models::project - Project struct for project data
//! - core::ai - Claude API caller for AI-powered generation
//! - reqwest - HTTP client (passed through for API calls)
//!
//! EXPORTS:
//! - generate_claude_md_content - Template-based CLAUDE.md generation (fallback)
//! - generate_claude_md_with_ai - AI-powered CLAUDE.md generation
//!
//! PATTERNS:
//! - Template sections are built with helper functions
//! - AI generation sends project metadata + file list to Claude
//! - generate_claude_md_with_ai is async, generate_claude_md_content is sync
//!
//! CLAUDE NOTES:
//! - generate_claude_md_content is the synchronous template fallback
//! - generate_claude_md_with_ai uses the Anthropic API for richer output
//! - AI prompt includes project name, language, framework, and source file listing
//! - The generated content includes: overview, tech stack, structure, commands, patterns, notes

use crate::core::ai;
use crate::models::project::Project;

/// Generate a complete CLAUDE.md file from project configuration data.
/// Returns the full markdown content as a string.
pub fn generate_claude_md_content(project: &Project) -> String {
    let mut sections: Vec<String> = Vec::new();

    sections.push(generate_header(project));
    sections.push(generate_tech_stack(project));
    sections.push(generate_commands(project));
    sections.push(generate_patterns(project));
    sections.push(generate_notes(project));

    sections.join("\n---\n\n")
}

/// Generate a CLAUDE.md file using the Claude API for richer, AI-powered content.
/// Falls back gracefully if the API call fails.
pub async fn generate_claude_md_with_ai(
    project: &Project,
    client: &reqwest::Client,
    api_key: &str,
) -> Result<String, String> {
    let system = "You generate CLAUDE.md files for software projects. A CLAUDE.md file is a \
        developer documentation file that helps AI coding assistants understand the project. \
        Include sections for: Overview, Tech Stack (as a markdown table), Commands (common dev commands \
        in a code block), Code Patterns (bullet points of conventions), and CLAUDE NOTES (important \
        reminders). Keep the output concise and practical. Use markdown formatting.";

    // Collect source file listing (top 100 files)
    let file_list = collect_source_files(&project.path, 100);
    let file_section = if file_list.is_empty() {
        "No source files detected yet.".to_string()
    } else {
        file_list.join("\n")
    };

    let prompt = format!(
        "Generate a CLAUDE.md file for this project:\n\n\
        - Name: {}\n\
        - Path: {}\n\
        - Language: {}\n\
        - Framework: {}\n\
        - Database: {}\n\
        - Testing: {}\n\
        - Styling: {}\n\
        - Type: {}\n\
        - Description: {}\n\n\
        Source files:\n{}\n\n\
        Generate a complete CLAUDE.md with all sections. Output ONLY the markdown content, no extra explanation.",
        project.name,
        project.path,
        project.language,
        project.framework.as_deref().unwrap_or("None"),
        project.database.as_deref().unwrap_or("None"),
        project.testing.as_deref().unwrap_or("None"),
        project.styling.as_deref().unwrap_or("None"),
        project.project_type,
        if project.description.is_empty() { "Not provided" } else { &project.description },
        file_section,
    );

    ai::call_claude(client, api_key, system, &prompt).await
}

/// Collect source file paths from a project directory (relative paths, limited to max_files).
fn collect_source_files(project_path: &str, max_files: usize) -> Vec<String> {
    let mut files = Vec::new();
    let root = std::path::Path::new(project_path);
    if root.exists() {
        collect_files_recursive(root, project_path, &mut files, max_files);
    }
    files
}

fn collect_files_recursive(
    dir: &std::path::Path,
    project_path: &str,
    files: &mut Vec<String>,
    max_files: usize,
) {
    if files.len() >= max_files {
        return;
    }

    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    let skip_dirs = [
        "node_modules", "target", ".git", "dist", "build", ".next",
        "__pycache__", ".venv", "venv", "coverage", ".turbo",
    ];

    for entry in entries.flatten() {
        if files.len() >= max_files {
            return;
        }
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        if name.starts_with('.') {
            continue;
        }

        if path.is_dir() {
            if !skip_dirs.contains(&name.as_str()) {
                collect_files_recursive(&path, project_path, files, max_files);
            }
        } else {
            let source_exts = [".ts", ".tsx", ".js", ".jsx", ".rs", ".py", ".go", ".toml", ".json"];
            if source_exts.iter().any(|ext| name.ends_with(ext)) {
                let abs = path.to_string_lossy().to_string();
                let rel = abs
                    .strip_prefix(project_path)
                    .unwrap_or(&abs)
                    .trim_start_matches('/')
                    .to_string();
                files.push(rel);
            }
        }
    }
}

fn generate_header(project: &Project) -> String {
    let desc = if project.description.is_empty() {
        format!("A {} project built with {}", project.project_type, project.language)
    } else {
        project.description.clone()
    };

    format!(
        "# {}\n\n## Overview\n\n{}\n",
        project.name, desc
    )
}

fn generate_tech_stack(project: &Project) -> String {
    let mut rows = Vec::new();

    rows.push(format!("| **Language** | {} |", project.language));

    if let Some(ref fw) = project.framework {
        rows.push(format!("| **Framework** | {} |", fw));
    }

    if let Some(ref db) = project.database {
        rows.push(format!("| **Database** | {} |", db));
    }

    if let Some(ref test) = project.testing {
        rows.push(format!("| **Testing** | {} |", test));
    }

    if let Some(ref style) = project.styling {
        rows.push(format!("| **Styling** | {} |", style));
    }

    if !project.project_type.is_empty() {
        rows.push(format!("| **Type** | {} |", project.project_type));
    }

    format!(
        "## Tech Stack\n\n| Component | Technology |\n|-----------|------------|\n{}\n",
        rows.join("\n")
    )
}

fn generate_commands(project: &Project) -> String {
    let commands = match project.language.as_str() {
        "TypeScript" | "JavaScript" => {
            let pm = "pnpm"; // Default to pnpm per project conventions
            let mut cmds = vec![
                format!("{} install              # Install dependencies", pm),
                format!("{} dev                  # Start development server", pm),
                format!("{} build                # Build for production", pm),
                format!("{} lint                 # Run linter", pm),
            ];
            if let Some(ref test) = project.testing {
                cmds.push(format!("{} test                 # Run {} tests", pm, test));
            }
            cmds
        }
        "Rust" => {
            let mut cmds = vec![
                "cargo build             # Build project".to_string(),
                "cargo run               # Run project".to_string(),
                "cargo test              # Run tests".to_string(),
                "cargo clippy            # Run linter".to_string(),
            ];
            if project.framework.as_deref() == Some("Tauri") {
                cmds.push("pnpm tauri dev          # Start Tauri development".to_string());
                cmds.push("pnpm tauri build        # Build distributable app".to_string());
            }
            cmds
        }
        "Python" => {
            let mut cmds = vec![
                "pip install -r requirements.txt  # Install dependencies".to_string(),
            ];
            if let Some(ref fw) = project.framework {
                match fw.as_str() {
                    "Django" => {
                        cmds.push("python manage.py runserver  # Start dev server".to_string());
                        cmds.push("python manage.py test       # Run tests".to_string());
                    }
                    "FastAPI" => {
                        cmds.push("uvicorn main:app --reload   # Start dev server".to_string());
                    }
                    "Flask" => {
                        cmds.push("flask run                   # Start dev server".to_string());
                    }
                    _ => {}
                }
            }
            if let Some(ref test) = project.testing {
                cmds.push(format!("{}                          # Run tests", test));
            }
            cmds
        }
        "Go" => {
            vec![
                "go build ./...            # Build project".to_string(),
                "go run .                  # Run project".to_string(),
                "go test ./...             # Run tests".to_string(),
                "go vet ./...              # Run linter".to_string(),
            ]
        }
        _ => {
            vec!["# Add your project commands here".to_string()]
        }
    };

    format!(
        "## Commands\n\n```bash\n{}\n```\n",
        commands.join("\n")
    )
}

fn generate_patterns(project: &Project) -> String {
    let mut patterns = Vec::new();

    // Language-specific patterns
    match project.language.as_str() {
        "TypeScript" | "JavaScript" => {
            patterns.push("- Use functional components and hooks (no class components)".to_string());
            patterns.push("- Prefer `const` over `let`; avoid `var`".to_string());
        }
        "Rust" => {
            patterns.push("- Use `Result<T, E>` for fallible operations".to_string());
            patterns.push("- Prefer `&str` over `String` in function parameters".to_string());
        }
        "Python" => {
            patterns.push("- Use type hints for function signatures".to_string());
            patterns.push("- Follow PEP 8 style guidelines".to_string());
        }
        _ => {}
    }

    // Framework-specific patterns
    if let Some(ref fw) = project.framework {
        match fw.as_str() {
            "React" | "Next.js" => {
                patterns.push("- One component per file".to_string());
                patterns.push("- Props interface defined above component".to_string());
            }
            "Tauri" => {
                patterns.push("- All Tauri commands are async and return `Result<T, String>`".to_string());
                patterns.push("- Use `State<AppState>` for shared application state".to_string());
            }
            "Django" => {
                patterns.push("- Use class-based views for CRUD operations".to_string());
                patterns.push("- Keep business logic in models or services, not views".to_string());
            }
            "FastAPI" => {
                patterns.push("- Use Pydantic models for request/response validation".to_string());
                patterns.push("- Use dependency injection for shared resources".to_string());
            }
            _ => {}
        }
    }

    // Styling patterns
    if let Some(ref style) = project.styling {
        match style.as_str() {
            "Tailwind CSS" => {
                patterns.push("- Use Tailwind utility classes for all styling".to_string());
                patterns.push("- Avoid inline styles and CSS files".to_string());
            }
            "CSS Modules" => {
                patterns.push("- Use CSS Modules for component-scoped styles".to_string());
            }
            _ => {}
        }
    }

    // Database patterns
    if let Some(ref db) = project.database {
        match db.as_str() {
            "PostgreSQL" | "MySQL" | "SQLite" => {
                patterns.push("- Use migrations for all schema changes".to_string());
                patterns.push("- Store timestamps in UTC".to_string());
            }
            "MongoDB" => {
                patterns.push("- Use schema validation for collections".to_string());
            }
            _ => {}
        }
    }

    if patterns.is_empty() {
        patterns.push("- Add your project patterns and conventions here".to_string());
    }

    format!(
        "## Code Patterns\n\n{}\n",
        patterns.join("\n")
    )
}

fn generate_notes(project: &Project) -> String {
    let mut notes = Vec::new();

    notes.push(format!("- Project type: {}", project.project_type));
    notes.push(format!("- Primary language: {}", project.language));

    if let Some(ref fw) = project.framework {
        notes.push(format!("- Framework: {}", fw));
    }

    notes.push("- Always update this file when project conventions change".to_string());
    notes.push("- Keep documentation headers current in all source files".to_string());

    format!(
        "## CLAUDE NOTES\n\n{}\n\n---\n\n*Generated by Claude Code Copilot. Update this file as your project evolves!*\n",
        notes.join("\n")
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    #[test]
    fn test_generate_basic_project() {
        let project = Project {
            id: "test-id".to_string(),
            name: "My App".to_string(),
            path: "/tmp/myapp".to_string(),
            description: "A cool web application".to_string(),
            project_type: "Web App".to_string(),
            language: "TypeScript".to_string(),
            framework: Some("React".to_string()),
            database: Some("PostgreSQL".to_string()),
            testing: Some("Vitest".to_string()),
            styling: Some("Tailwind CSS".to_string()),
            health_score: 0,
            created_at: Utc::now(),
        };

        let content = generate_claude_md_content(&project);
        assert!(content.contains("# My App"));
        assert!(content.contains("A cool web application"));
        assert!(content.contains("TypeScript"));
        assert!(content.contains("React"));
        assert!(content.contains("PostgreSQL"));
        assert!(content.contains("Vitest"));
        assert!(content.contains("Tailwind CSS"));
        assert!(content.contains("## Commands"));
        assert!(content.contains("## Code Patterns"));
    }

    #[test]
    fn test_generate_minimal_project() {
        let project = Project {
            id: "test-id".to_string(),
            name: "Simple".to_string(),
            path: "/tmp/simple".to_string(),
            description: "".to_string(),
            project_type: "CLI".to_string(),
            language: "Go".to_string(),
            framework: None,
            database: None,
            testing: None,
            styling: None,
            health_score: 0,
            created_at: Utc::now(),
        };

        let content = generate_claude_md_content(&project);
        assert!(content.contains("# Simple"));
        assert!(content.contains("Go"));
        assert!(content.contains("go build"));
    }
}
