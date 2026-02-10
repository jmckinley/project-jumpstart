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
    let sections: Vec<String> = vec![
        generate_header(project),
        generate_tech_stack(project),
        generate_project_structure(project),
        generate_commands(project),
        generate_documentation_format(project),
        generate_patterns(project),
        generate_current_focus(),
        generate_decisions(project),
        generate_notes(project),
    ];

    sections.join("\n---\n\n")
}

/// Generate a CLAUDE.md file using the Claude API for richer, AI-powered content.
/// Includes actual file content sampling for better context understanding.
pub async fn generate_claude_md_with_ai(
    project: &Project,
    client: &reqwest::Client,
    api_key: &str,
) -> Result<String, String> {
    let system = "You generate CLAUDE.md files for software projects. A CLAUDE.md file is \
        persistent developer documentation that helps AI coding assistants understand the project \
        even after context compaction. The information in CLAUDE.md survives long coding sessions. \
        \
        YOU HAVE BEEN GIVEN ACTUAL FILE CONTENTS - USE THEM! \
        The user has provided real code samples from their project. Analyze them to: \
        - Identify the ACTUAL libraries used (look at imports) \
        - Understand the REAL data models and their fields \
        - See the ACTUAL patterns and conventions used \
        - Find the REAL API endpoints, auth flows, state management \
        \
        CRITICAL REQUIREMENTS FOR QUALITY: \
        - The Overview must explain WHAT the app does based on the code you see, not generic descriptions \
        - If you see a Task type with fields, describe what tasks are in this app \
        - If you see Supabase imports, explain the Supabase integration specifically \
        - If you see useState/useEffect, note it's React with hooks \
        - Architectural Decisions must reference ACTUAL code patterns you observed \
        \
        SECTIONS TO INCLUDE (in order): \
        \
        1. **Overview** (H1 project name, then 2-3 sentences) \
           - WHAT: Specific app purpose derived from the code (e.g., 'Task management app for students tracking assignments') \
           - WHO: Target users inferred from features \
           - FLOW: Core user journey based on components/routes you see \
        \
        2. **Tech Stack** (table: Component | Technology | Notes) \
           - List EVERY library you see imported in the code samples \
           - Include auth, data fetching, state management, UI libraries \
           - Add notes about how each is used based on the code \
        \
        3. **Project Structure** (code block with tree) \
           - Show the directory structure from the file list \
           - Add inline comments explaining what each directory contains \
        \
        4. **Key Types & Data Models** \
           - Extract interfaces/types from the code samples \
           - Explain what each model represents \
           - Note relationships between models \
        \
        5. **Commands** (code block) \
           - Use the CORRECT package manager from package.json (npm/pnpm/yarn) \
           - Include all scripts from package.json if provided \
        \
        6. **Module Documentation Format** \
           - Show the exact @module header format for this language \
        \
        7. **Code Patterns** (bullet points) \
           - INFERRED from actual code: naming conventions, file organization \
           - State management approach (Zustand/Redux/Context) \
           - Data fetching patterns (SWR/React Query/fetch) \
           - Component patterns (functional, hooks usage) \
        \
        8. **Key Integrations** \
           - List external services FOUND in imports (Supabase, Firebase, Stripe, etc.) \
           - Explain how each is used based on the code \
        \
        9. **Architectural Decisions** (at least 3) \
           - Each must reference SPECIFIC code you saw \
           - Include WHY based on the patterns (infer rationale) \
        \
        10. **CLAUDE NOTES** (organized by topic) \
           - Specific gotchas from the code \
           - Non-obvious relationships \
           - Important constants or magic values \
        \
        BE EXTREMELY SPECIFIC. Reference actual type names, function names, and patterns from the provided code.";

    // Collect source file listing (top 50 files)
    let file_list = collect_source_files(&project.path, 50);

    // Sample key file contents for better AI understanding
    let file_samples = collect_key_file_contents(&project.path);

    let file_section = if file_list.is_empty() {
        "No source files detected yet.".to_string()
    } else {
        file_list.join("\n")
    };

    // Build extras string for AI context
    let extras_str = if let Some(ref extras) = project.stack_extras {
        format!(
            "- Authentication: {}\n\
             - Hosting: {}\n\
             - Payments: {}\n\
             - Monitoring: {}\n\
             - Email: {}\n\
             - Cache: {}",
            extras.auth.as_deref().unwrap_or("None"),
            extras.hosting.as_deref().unwrap_or("None"),
            extras.payments.as_deref().unwrap_or("None"),
            extras.monitoring.as_deref().unwrap_or("None"),
            extras.email.as_deref().unwrap_or("None"),
            extras.cache.as_deref().unwrap_or("None"),
        )
    } else {
        "No additional services configured".to_string()
    };

    let prompt = format!(
        "Generate a CLAUDE.md file for this project:\n\n\
        ## Project Metadata\n\
        - Name: {}\n\
        - Path: {}\n\
        - Language: {}\n\
        - Framework: {}\n\
        - Database: {}\n\
        - Testing: {}\n\
        - Styling: {}\n\
        - Type: {}\n\
        - Description: {}\n\n\
        ## Additional Services\n\
        {}\n\n\
        ## File List\n\
        ```\n{}\n```\n\n\
        ## Key File Contents\n\
        Below are actual contents of key files. USE THESE to understand the project:\n\n\
        {}\n\n\
        Generate a complete, SPECIFIC CLAUDE.md based on the actual code above. \
        Reference real type names, imports, and patterns you see. \
        Include information about the additional services (auth, hosting, payments, etc.) in the relevant sections. \
        Output ONLY the markdown content, no preamble.",
        project.name,
        project.path,
        project.language,
        project.framework.as_deref().unwrap_or("None"),
        project.database.as_deref().unwrap_or("None"),
        project.testing.as_deref().unwrap_or("None"),
        project.styling.as_deref().unwrap_or("None"),
        project.project_type,
        if project.description.is_empty() { "Not provided" } else { &project.description },
        extras_str,
        file_section,
        file_samples,
    );

    ai::call_claude(client, api_key, system, &prompt).await
}

/// Collect contents of key files for AI context.
/// Samples: package.json, main types, main component, config files.
fn collect_key_file_contents(project_path: &str) -> String {
    let mut samples = Vec::new();
    let root = std::path::Path::new(project_path);

    // Priority files to sample (in order)
    let priority_files = [
        // Config files (full content, usually small)
        ("package.json", 3000),
        ("Cargo.toml", 2000),
        ("pyproject.toml", 2000),
        ("go.mod", 1000),
        // Type definitions (critical for understanding data models)
        ("src/types/index.ts", 2500),
        ("src/types.ts", 2500),
        ("types.ts", 2500),
        ("src/types/index.d.ts", 2500),
        ("types/index.ts", 2500),
        // Main app/entry files
        ("src/App.tsx", 2000),
        ("src/App.ts", 2000),
        ("src/main.tsx", 1500),
        ("src/index.tsx", 1500),
        ("app/page.tsx", 2000),
        ("app/layout.tsx", 1500),
        ("src/lib.rs", 2000),
        ("src/main.rs", 2000),
        ("main.py", 2000),
        ("app.py", 2000),
        ("main.go", 2000),
        // Database/schema files
        ("prisma/schema.prisma", 2000),
        ("src/db/schema.ts", 2000),
        ("drizzle/schema.ts", 2000),
        // State management
        ("src/stores/index.ts", 1500),
        ("src/store/index.ts", 1500),
        ("src/context/index.tsx", 1500),
        // API routes
        ("src/api/index.ts", 1500),
        ("app/api/route.ts", 1500),
        ("src/routes/index.ts", 1500),
    ];

    let mut total_chars = 0;
    const MAX_TOTAL_CHARS: usize = 15000; // Leave room for system prompt

    for (rel_path, max_chars) in priority_files.iter() {
        if total_chars >= MAX_TOTAL_CHARS {
            break;
        }

        let full_path = root.join(rel_path);
        if full_path.exists() {
            if let Ok(content) = std::fs::read_to_string(&full_path) {
                let truncated: String = content.chars().take(*max_chars).collect();
                let was_truncated = content.len() > *max_chars;

                samples.push(format!(
                    "### {}{}\n```\n{}\n```\n",
                    rel_path,
                    if was_truncated { " (truncated)" } else { "" },
                    truncated
                ));

                total_chars += truncated.len();
            }
        }
    }

    // If we haven't found enough, scan for type files
    if samples.len() < 3 {
        if let Ok(types_found) = find_type_files(root) {
            for type_file in types_found.iter().take(3) {
                if total_chars >= MAX_TOTAL_CHARS {
                    break;
                }
                if let Ok(content) = std::fs::read_to_string(type_file) {
                    let truncated: String = content.chars().take(2000).collect();
                    let rel = type_file.strip_prefix(root).unwrap_or(type_file);
                    samples.push(format!(
                        "### {} (types)\n```\n{}\n```\n",
                        rel.display(),
                        truncated
                    ));
                    total_chars += truncated.len();
                }
            }
        }
    }

    if samples.is_empty() {
        "No key files found to sample.".to_string()
    } else {
        samples.join("\n")
    }
}

/// Find TypeScript/Rust/Python type definition files.
fn find_type_files(root: &std::path::Path) -> Result<Vec<std::path::PathBuf>, std::io::Error> {
    let mut results = Vec::new();

    fn walk_for_types(dir: &std::path::Path, results: &mut Vec<std::path::PathBuf>, depth: usize) {
        if depth > 4 || results.len() >= 5 {
            return;
        }

        let skip_dirs = ["node_modules", "target", ".git", "dist", "build", ".next"];

        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                let name = entry.file_name().to_string_lossy().to_string();

                if path.is_dir() && !skip_dirs.contains(&name.as_str()) && !name.starts_with('.') {
                    walk_for_types(&path, results, depth + 1);
                } else if path.is_file() {
                    // Look for type-heavy files
                    let is_type_file = name.contains("type")
                        || name.contains("model")
                        || name.contains("schema")
                        || name.contains("interface")
                        || (name.ends_with(".d.ts"));

                    if is_type_file && (name.ends_with(".ts") || name.ends_with(".rs") || name.ends_with(".py")) {
                        results.push(path);
                    }
                }
            }
        }
    }

    walk_for_types(root, &mut results, 0);
    Ok(results)
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

    // Add stack extras if present
    if let Some(ref extras) = project.stack_extras {
        if let Some(ref auth) = extras.auth {
            rows.push(format!("| **Authentication** | {} |", auth));
        }
        if let Some(ref hosting) = extras.hosting {
            rows.push(format!("| **Hosting** | {} |", hosting));
        }
        if let Some(ref payments) = extras.payments {
            rows.push(format!("| **Payments** | {} |", payments));
        }
        if let Some(ref monitoring) = extras.monitoring {
            rows.push(format!("| **Monitoring** | {} |", monitoring));
        }
        if let Some(ref email) = extras.email {
            rows.push(format!("| **Email** | {} |", email));
        }
        if let Some(ref cache) = extras.cache {
            rows.push(format!("| **Cache** | {} |", cache));
        }
    }

    format!(
        "## Tech Stack\n\n| Component | Technology |\n|-----------|------------|\n{}\n",
        rows.join("\n")
    )
}

fn generate_project_structure(project: &Project) -> String {
    // Collect top-level directories and key files
    let root = std::path::Path::new(&project.path);
    let mut structure_lines: Vec<String> = Vec::new();

    structure_lines.push(format!("{}/ ", project.name));

    if let Ok(entries) = std::fs::read_dir(root) {
        let skip_dirs = [
            "node_modules", "target", ".git", "dist", "build", ".next",
            "__pycache__", ".venv", "venv", "coverage", ".turbo", ".cache",
        ];

        let mut dirs: Vec<String> = Vec::new();
        let mut files: Vec<String> = Vec::new();

        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with('.') && name != ".env.example" {
                continue;
            }

            let path = entry.path();
            if path.is_dir() {
                if !skip_dirs.contains(&name.as_str()) {
                    dirs.push(name);
                }
            } else {
                // Only include important root files
                let important_files = [
                    "package.json", "Cargo.toml", "pyproject.toml", "go.mod",
                    "tsconfig.json", "vite.config.ts", "next.config.js",
                    "tailwind.config.js", "README.md", "CLAUDE.md",
                    ".env.example", "Dockerfile", "docker-compose.yml",
                ];
                if important_files.contains(&name.as_str()) || name.ends_with(".toml") || name.ends_with(".json") {
                    files.push(name);
                }
            }
        }

        dirs.sort();
        files.sort();

        for dir in &dirs {
            structure_lines.push(format!("├── {}/", dir));
            // Add one level of subdirectories for key folders
            if let Ok(sub_entries) = std::fs::read_dir(root.join(dir)) {
                let mut sub_items: Vec<(String, bool)> = Vec::new();
                for sub_entry in sub_entries.flatten().take(8) {
                    let sub_name = sub_entry.file_name().to_string_lossy().to_string();
                    if !sub_name.starts_with('.') {
                        sub_items.push((sub_name, sub_entry.path().is_dir()));
                    }
                }
                sub_items.sort_by(|a, b| a.0.cmp(&b.0));
                for (sub_name, is_dir) in sub_items.iter().take(6) {
                    if *is_dir {
                        structure_lines.push(format!("│   ├── {}/", sub_name));
                    } else {
                        structure_lines.push(format!("│   ├── {}", sub_name));
                    }
                }
                if sub_items.len() > 6 {
                    structure_lines.push("│   └── ...".to_string());
                }
            }
        }

        for file in &files {
            structure_lines.push(format!("├── {}", file));
        }
    }

    format!(
        "## Project Structure\n\n```\n{}\n```\n",
        structure_lines.join("\n")
    )
}

fn generate_documentation_format(project: &Project) -> String {
    let (format_example, lang_comment) = match project.language.as_str() {
        "TypeScript" | "JavaScript" => (
            r#"/**
 * @module [path/from/src]
 * @description [One-line description]
 *
 * PURPOSE:
 * - [Main responsibility]
 *
 * EXPORTS:
 * - [functionName] - [what it does]
 *
 * CLAUDE NOTES:
 * - [Important context for AI assistants]
 */"#,
            "JSDoc block comment"
        ),
        "Rust" => (
            r#"//! @module [path/from/src]
//! @description [One-line description]
//!
//! PURPOSE:
//! - [Main responsibility]
//!
//! EXPORTS:
//! - [function_name] - [what it does]
//!
//! CLAUDE NOTES:
//! - [Important context for AI assistants]"#,
            "Doc comment"
        ),
        "Python" => (
            r#""""
@module [path/from/src]
@description [One-line description]

PURPOSE:
- [Main responsibility]

EXPORTS:
- [function_name] - [what it does]

CLAUDE NOTES:
- [Important context for AI assistants]
""""#,
            "Docstring"
        ),
        "Go" => (
            r#"// Package [name] provides [description]
//
// @module [path/from/src]
// @description [One-line description]
//
// PURPOSE:
// - [Main responsibility]
//
// EXPORTS:
// - [FunctionName] - [what it does]
//
// CLAUDE NOTES:
// - [Important context for AI assistants]"#,
            "Package comment"
        ),
        _ => (
            r#"/**
 * @module [path/from/src]
 * @description [One-line description]
 *
 * PURPOSE:
 * - [Main responsibility]
 *
 * EXPORTS:
 * - [functionName] - [what it does]
 *
 * CLAUDE NOTES:
 * - [Important context for AI assistants]
 */"#,
            "Block comment"
        ),
    };

    format!(
        r#"## Module Documentation Format

Every source file should have a documentation header ({}) at the top:

```{}
{}
```

**Why this matters:**
- Headers survive context compaction in long AI sessions
- Makes codebase self-documenting for AI assistants
- Provides quick orientation when opening any file

**Update documentation when you:**
- Add or remove exports
- Change function signatures
- Discover important patterns or gotchas
"#,
        lang_comment,
        project.language.to_lowercase(),
        format_example
    )
}

fn generate_current_focus() -> String {
    r#"## Current Focus

**Status**: Active development
**Working on**: [Describe current task]
**Next up**: [What comes after]
**Blocked by**: Nothing

<!-- Update this section to help AI assistants understand project priorities -->
"#.to_string()
}

fn generate_decisions(project: &Project) -> String {
    let mut decisions: Vec<String> = Vec::new();

    // Add framework-specific decisions
    if let Some(ref fw) = project.framework {
        match fw.as_str() {
            "React" => {
                decisions.push("1. **React for UI**: Component-based architecture, large ecosystem".to_string());
            }
            "Next.js" => {
                decisions.push("1. **Next.js**: Server-side rendering, file-based routing, API routes".to_string());
            }
            "Tauri" => {
                decisions.push("1. **Tauri over Electron**: Smaller bundle size (~10MB vs ~150MB), better performance, native feel".to_string());
            }
            "FastAPI" => {
                decisions.push("1. **FastAPI**: Async support, automatic OpenAPI docs, Pydantic validation".to_string());
            }
            "Django" => {
                decisions.push("1. **Django**: Batteries-included, ORM, admin panel, mature ecosystem".to_string());
            }
            _ => {
                decisions.push(format!("1. **{}**: [Add rationale for choosing this framework]", fw));
            }
        }
    }

    // Add database decisions
    if let Some(ref db) = project.database {
        match db.as_str() {
            "PostgreSQL" => {
                decisions.push("2. **PostgreSQL**: ACID compliance, JSON support, extensibility".to_string());
            }
            "SQLite" => {
                decisions.push("2. **SQLite**: Zero-config, file-based, perfect for local-first apps".to_string());
            }
            "MongoDB" => {
                decisions.push("2. **MongoDB**: Flexible schema, horizontal scaling, document model".to_string());
            }
            _ => {
                decisions.push(format!("2. **{}**: [Add rationale for choosing this database]", db));
            }
        }
    }

    // Add styling decisions
    if let Some(ref style) = project.styling {
        match style.as_str() {
            "Tailwind CSS" => {
                decisions.push("3. **Tailwind CSS**: Utility-first, no context switching, consistent design".to_string());
            }
            "CSS Modules" => {
                decisions.push("3. **CSS Modules**: Scoped styles, no naming conflicts, works with any CSS".to_string());
            }
            _ => {
                decisions.push(format!("3. **{}**: [Add rationale for choosing this styling approach]", style));
            }
        }
    }

    if decisions.is_empty() {
        decisions.push("1. [Add key architectural decisions here]".to_string());
        decisions.push("2. [Document why you chose specific technologies]".to_string());
        decisions.push("3. [Note any important tradeoffs made]".to_string());
    }

    format!(
        "## Architectural Decisions\n\nKey decisions and their rationale (helps AI understand project constraints):\n\n{}\n",
        decisions.join("\n\n")
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
    let mut sections: Vec<String> = Vec::new();

    // General notes
    let mut general = vec![
        format!("- Project type: {}", project.project_type),
        format!("- Primary language: {}", project.language),
    ];
    if let Some(ref fw) = project.framework {
        general.push(format!("- Framework: {}", fw));
    }
    sections.push(format!("### General\n{}", general.join("\n")));

    // Language-specific notes
    let lang_notes = match project.language.as_str() {
        "TypeScript" | "JavaScript" => vec![
            "- Use functional components, not class components",
            "- Prefer `const` over `let`; never use `var`",
            "- Use named exports over default exports",
            "- Keep files focused; one component/function per file when possible",
        ],
        "Rust" => vec![
            "- All public functions should return `Result<T, E>` for fallible operations",
            "- Use `?` operator for error propagation",
            "- Prefer `&str` over `String` in function parameters",
            "- Run `cargo clippy` before committing",
        ],
        "Python" => vec![
            "- Use type hints for all function signatures",
            "- Follow PEP 8 style guidelines",
            "- Use `pathlib.Path` over string paths",
            "- Prefer f-strings for string formatting",
        ],
        "Go" => vec![
            "- Keep packages small and focused",
            "- Use `error` return values, not panics",
            "- Run `go fmt` before committing",
            "- Prefer composition over inheritance",
        ],
        _ => vec![
            "- Follow language-specific best practices",
            "- Keep code well-documented",
        ],
    };
    sections.push(format!("### {}\n{}", project.language, lang_notes.join("\n")));

    // Framework-specific notes
    if let Some(ref fw) = project.framework {
        let fw_notes = match fw.as_str() {
            "React" | "Next.js" => vec![
                "- Use hooks for state and side effects",
                "- Colocate related files (component, styles, tests)",
                "- Prefer server components where possible (Next.js)",
            ],
            "Tauri" => vec![
                "- All IPC commands are async",
                "- Commands return `Result<T, String>` for error handling",
                "- Use `State<AppState>` for shared application state",
                "- Frontend calls backend via `invoke()` from @tauri-apps/api",
            ],
            "FastAPI" => vec![
                "- Use Pydantic models for all request/response bodies",
                "- Use dependency injection for database sessions",
                "- Keep routes thin; business logic in services",
            ],
            "Django" => vec![
                "- Keep views thin; business logic in models or services",
                "- Use Django ORM; avoid raw SQL unless necessary",
                "- Run migrations with `python manage.py migrate`",
            ],
            _ => vec![],
        };
        if !fw_notes.is_empty() {
            sections.push(format!("### {}\n{}", fw, fw_notes.join("\n")));
        }
    }

    // File conventions
    let file_notes = ["- Update CLAUDE.md when project conventions change",
        "- Keep documentation headers current in all source files",
        "- Use forward slashes in paths (even on Windows)"];
    sections.push(format!("### Files & Documentation\n{}", file_notes.join("\n")));

    format!(
        "## CLAUDE NOTES\n\n{}\n\n---\n\n*Generated by Project Jumpstart. Update this file as your project evolves!*\n",
        sections.join("\n\n")
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
            stack_extras: None,
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
            stack_extras: None,
            health_score: 0,
            created_at: Utc::now(),
        };

        let content = generate_claude_md_content(&project);
        assert!(content.contains("# Simple"));
        assert!(content.contains("Go"));
        assert!(content.contains("go build"));
    }

    #[test]
    fn test_generate_project_with_extras() {
        use crate::models::project::StackExtras;

        let project = Project {
            id: "test-id".to_string(),
            name: "SaaS App".to_string(),
            path: "/tmp/saas".to_string(),
            description: "A B2B SaaS application".to_string(),
            project_type: "Web App".to_string(),
            language: "TypeScript".to_string(),
            framework: Some("Next.js".to_string()),
            database: Some("PostgreSQL".to_string()),
            testing: Some("Vitest".to_string()),
            styling: Some("Tailwind CSS".to_string()),
            stack_extras: Some(StackExtras {
                auth: Some("Clerk".to_string()),
                hosting: Some("Vercel".to_string()),
                payments: Some("Stripe".to_string()),
                monitoring: Some("PostHog".to_string()),
                email: Some("Resend".to_string()),
                cache: None,
            }),
            health_score: 0,
            created_at: Utc::now(),
        };

        let content = generate_claude_md_content(&project);
        assert!(content.contains("# SaaS App"));
        assert!(content.contains("Clerk"));
        assert!(content.contains("Vercel"));
        assert!(content.contains("Stripe"));
        assert!(content.contains("PostHog"));
        assert!(content.contains("Resend"));
        assert!(content.contains("Authentication"));
        assert!(content.contains("Hosting"));
        assert!(content.contains("Payments"));
        assert!(content.contains("Monitoring"));
        assert!(content.contains("Email"));
    }
}
