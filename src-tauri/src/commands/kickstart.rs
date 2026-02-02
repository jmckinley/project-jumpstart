//! @module commands/kickstart
//! @description Tauri IPC commands for generating project kickstart prompts and inferring tech stacks
//!
//! PURPOSE:
//! - Generate a comprehensive Claude Code kickstart prompt for new/empty projects
//! - Use AI to create CLAUDE.md-style documentation based on user input
//! - Infer optimal tech stack based on project description and features
//! - Help users bootstrap new projects with best practices
//!
//! DEPENDENCIES:
//! - tauri - Command macro and State
//! - db::AppState - Database and HTTP client access
//! - core::ai - Claude API caller
//! - serde - JSON serialization for input/output
//!
//! EXPORTS:
//! - generate_kickstart_prompt - Generate a kickstart prompt from user input
//! - generate_kickstart_claude_md - Generate and save initial CLAUDE.md from kickstart input
//! - infer_tech_stack - Use AI to suggest optimal tech stack based on project description
//!
//! PATTERNS:
//! - Uses core::ai::call_claude for AI generation
//! - Returns full prompt text with token estimate
//! - Token estimate uses rough approximation (4 chars = 1 token)
//! - Stack inference returns suggestions with reasoning
//!
//! CLAUDE NOTES:
//! - System prompt instructs Claude to generate CLAUDE.md-style content
//! - Output includes: Overview, Tech Stack, Architecture, Structure, Conventions, Roadmap
//! - Stack inference distinguishes between user selections and AI suggestions
//! - App name: Project Jumpstart

use serde::{Deserialize, Serialize};
use tauri::State;

use crate::core::ai;
use crate::core::crypto;
use crate::db::AppState;

/// Tech stack preferences for the new project
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TechPreferences {
    pub language: String,
    pub framework: Option<String>,
    pub database: Option<String>,
    pub styling: Option<String>,
}

/// User-provided information about the new project
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KickstartInput {
    pub app_purpose: String,
    pub target_users: String,
    pub key_features: Vec<String>,
    pub tech_preferences: TechPreferences,
    pub constraints: Option<String>,
}

/// Generated kickstart prompt with metadata
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KickstartPrompt {
    pub full_prompt: String,
    pub token_estimate: u32,
}

/// A single tech stack suggestion with reasoning
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StackSuggestion {
    pub value: String,
    pub reason: String,
    pub confidence: String, // "high", "medium", "low"
}

/// Input for tech stack inference
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InferStackInput {
    pub app_purpose: String,
    pub target_users: String,
    pub key_features: Vec<String>,
    pub constraints: Option<String>,
    /// User's current selections (may be partial)
    pub current_language: Option<String>,
    pub current_framework: Option<String>,
    pub current_database: Option<String>,
    pub current_styling: Option<String>,
}

/// Result of tech stack inference
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InferredStack {
    pub language: Option<StackSuggestion>,
    pub framework: Option<StackSuggestion>,
    pub database: Option<StackSuggestion>,
    pub styling: Option<StackSuggestion>,
    pub warnings: Vec<String>,
}

const KICKSTART_SYSTEM_PROMPT: &str = r#"You are an expert software architect helping users bootstrap new projects with Claude Code best practices.

Your task is to generate a comprehensive CLAUDE.md-style project documentation file that will serve as the foundation for AI-assisted development.

The output should be well-structured markdown following this format:

1. **Project Overview** - Brief description of the app, its purpose, and target users
2. **Tech Stack Table** - A markdown table listing all technologies with notes
3. **Project Structure** - Directory tree with explanations for key folders
4. **Architecture Notes** - Key architectural decisions and patterns to follow
5. **Coding Conventions** - File naming, code patterns, testing approach
6. **Implementation Roadmap** - Phased approach to building the app
7. **CLAUDE NOTES** - Important reminders and gotchas for Claude Code sessions

Keep the content practical and actionable. Focus on decisions that affect day-to-day development.
Use best practices for the specified tech stack.
Do not include any preamble or meta-commentary - just output the markdown content directly."#;

/// Generate a kickstart prompt for a new project based on user input.
#[tauri::command]
pub async fn generate_kickstart_prompt(
    input: KickstartInput,
    state: State<'_, AppState>,
) -> Result<KickstartPrompt, String> {
    // Get API key from database
    let api_key = {
        let db = state
            .db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;

        let encrypted = db
            .query_row(
                "SELECT value FROM settings WHERE key = 'anthropic_api_key'",
                [],
                |row| row.get::<_, String>(0),
            )
            .map_err(|_| "Anthropic API key not configured. Set it in Settings.".to_string())?;

        // Decrypt if encrypted
        if encrypted.starts_with("enc:") {
            crypto::decrypt(&encrypted[4..])
                .map_err(|e| format!("Failed to decrypt API key: {}", e))?
        } else {
            encrypted
        }
    };

    // Build the user prompt
    let features_list = input
        .key_features
        .iter()
        .map(|f| format!("- {}", f))
        .collect::<Vec<_>>()
        .join("\n");

    let tech_stack = format!(
        "Language: {}\nFramework: {}\nDatabase: {}\nStyling: {}",
        input.tech_preferences.language,
        input.tech_preferences.framework.as_deref().unwrap_or("None specified"),
        input.tech_preferences.database.as_deref().unwrap_or("None specified"),
        input.tech_preferences.styling.as_deref().unwrap_or("None specified"),
    );

    let constraints_section = input
        .constraints
        .as_ref()
        .map(|c| format!("\n\nConstraints/Requirements:\n{}", c))
        .unwrap_or_default();

    let user_prompt = format!(
        r#"Generate a CLAUDE.md kickstart document for a new project with the following details:

**App Purpose:**
{}

**Target Users:**
{}

**Key Features:**
{}

**Tech Stack:**
{}{}

Please generate a comprehensive CLAUDE.md file that will help Claude Code understand and work with this project effectively."#,
        input.app_purpose,
        input.target_users,
        features_list,
        tech_stack,
        constraints_section
    );

    // Call Claude API
    let full_prompt = ai::call_claude(
        &state.http_client,
        &api_key,
        KICKSTART_SYSTEM_PROMPT,
        &user_prompt,
    )
    .await?;

    // Estimate tokens (rough approximation: 4 chars = 1 token)
    let token_estimate = (full_prompt.len() as u32) / 4;

    Ok(KickstartPrompt {
        full_prompt,
        token_estimate,
    })
}

const CLAUDE_MD_SYSTEM_PROMPT: &str = r#"You are an expert software architect creating a CLAUDE.md file for a new project.

CLAUDE.md is a special file that helps Claude Code (an AI coding assistant) understand the project. It should contain:

1. **Project Overview** - Brief description of what the app does
2. **Tech Stack** - A markdown table with Component | Technology | Notes columns
3. **Project Structure** - Expected directory structure with explanations
4. **Commands** - Common development commands (install, dev, build, test, lint)
5. **Code Patterns** - Key patterns and conventions to follow
6. **CLAUDE NOTES** - Important reminders for Claude Code sessions

Keep it concise and practical. This file will be read by an AI assistant at the start of coding sessions, so focus on information that helps with day-to-day development.

Output only the markdown content, no preamble or explanation."#;

/// Generate and save an initial CLAUDE.md file from kickstart input.
#[tauri::command]
pub async fn generate_kickstart_claude_md(
    input: KickstartInput,
    project_path: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    // Get API key from database
    let api_key = {
        let db = state
            .db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;

        let encrypted = db
            .query_row(
                "SELECT value FROM settings WHERE key = 'anthropic_api_key'",
                [],
                |row| row.get::<_, String>(0),
            )
            .map_err(|_| "Anthropic API key not configured. Set it in Settings.".to_string())?;

        // Decrypt if encrypted
        if encrypted.starts_with("enc:") {
            crypto::decrypt(&encrypted[4..])
                .map_err(|e| format!("Failed to decrypt API key: {}", e))?
        } else {
            encrypted
        }
    };

    // Build the user prompt
    let features_list = input
        .key_features
        .iter()
        .map(|f| format!("- {}", f))
        .collect::<Vec<_>>()
        .join("\n");

    let tech_stack = format!(
        "Language: {}\nFramework: {}\nDatabase: {}\nStyling: {}",
        input.tech_preferences.language,
        input.tech_preferences.framework.as_deref().unwrap_or("None"),
        input.tech_preferences.database.as_deref().unwrap_or("None"),
        input.tech_preferences.styling.as_deref().unwrap_or("None"),
    );

    let constraints_section = input
        .constraints
        .as_ref()
        .map(|c| format!("\n\nConstraints/Requirements:\n{}", c))
        .unwrap_or_default();

    let user_prompt = format!(
        r#"Create a CLAUDE.md file for this new project:

**App Purpose:**
{}

**Target Users:**
{}

**Key Features:**
{}

**Tech Stack:**
{}{}

Generate a well-structured CLAUDE.md that will help Claude Code understand and work with this project."#,
        input.app_purpose,
        input.target_users,
        features_list,
        tech_stack,
        constraints_section
    );

    // Call Claude API
    let content = ai::call_claude(
        &state.http_client,
        &api_key,
        CLAUDE_MD_SYSTEM_PROMPT,
        &user_prompt,
    )
    .await?;

    // Save to project path
    let claude_md_path = std::path::Path::new(&project_path).join("CLAUDE.md");
    std::fs::write(&claude_md_path, &content)
        .map_err(|e| format!("Failed to write CLAUDE.md: {}", e))?;

    Ok(content)
}

const INFER_STACK_SYSTEM_PROMPT: &str = r#"You are an expert software architect helping users choose the best tech stack for their project.

Based on the project description, target users, and key features, recommend the optimal tech stack.

IMPORTANT: Only suggest from these ALLOWED OPTIONS (mainstream, well-supported technologies):

LANGUAGES: TypeScript, JavaScript, Python, Rust, Go, Dart, Java, Kotlin, Swift, Ruby, PHP

FRAMEWORKS (by language):
- TypeScript/JavaScript: React, Next.js, Vue, Nuxt, Angular, Svelte, Express, NestJS, Tauri, Electron
- Python: Django, FastAPI, Flask
- Rust: Tauri, Actix Web, Axum
- Go: Gin, Fiber, Echo
- Dart: Flutter
- Java/Kotlin: Spring Boot
- Swift: SwiftUI, Vapor

DATABASES: PostgreSQL, MySQL, SQLite, MongoDB, Redis, Supabase, Firebase, DynamoDB, Pinecone, PlanetScale, Neon

STYLING: Tailwind CSS, CSS Modules, Styled Components, Sass/SCSS, Material UI, Chakra UI

RULES:
1. ONLY suggest from the allowed options above - never suggest obscure or niche technologies
2. Consider the user's existing selections - don't change them unless there's a compatibility issue
3. For each suggestion, provide a brief reason (1 sentence max)
4. Rate your confidence as "high", "medium", or "low"
5. Flag any compatibility warnings between technologies

You must respond with valid JSON in this exact format (no markdown, no explanation):
{
  "language": {"value": "TypeScript", "reason": "Best for React web apps with type safety", "confidence": "high"},
  "framework": {"value": "Next.js", "reason": "Ideal for real-time features with built-in API routes", "confidence": "high"},
  "database": {"value": "Supabase", "reason": "Real-time sync out of the box for collaboration", "confidence": "medium"},
  "styling": {"value": "Tailwind CSS", "reason": "Rapid UI development with utility classes", "confidence": "high"},
  "warnings": ["Consider adding Redis for session management at scale"]
}

If the user already selected a value and it's appropriate, return null for that field.
Only suggest alternatives if there's a clear mismatch with the project requirements."#;

/// Infer optimal tech stack based on project description and features.
#[tauri::command]
pub async fn infer_tech_stack(
    input: InferStackInput,
    state: State<'_, AppState>,
) -> Result<InferredStack, String> {
    // Get API key from database
    let api_key = {
        let db = state
            .db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;

        let encrypted = db
            .query_row(
                "SELECT value FROM settings WHERE key = 'anthropic_api_key'",
                [],
                |row| row.get::<_, String>(0),
            )
            .map_err(|_| "Anthropic API key not configured. Set it in Settings.".to_string())?;

        if encrypted.starts_with("enc:") {
            crypto::decrypt(&encrypted[4..])
                .map_err(|e| format!("Failed to decrypt API key: {}", e))?
        } else {
            encrypted
        }
    };

    // Build the user prompt
    let features_list = input
        .key_features
        .iter()
        .map(|f| format!("- {}", f))
        .collect::<Vec<_>>()
        .join("\n");

    let current_selections = format!(
        "Current user selections:\n- Language: {}\n- Framework: {}\n- Database: {}\n- Styling: {}",
        input.current_language.as_deref().unwrap_or("Not selected"),
        input.current_framework.as_deref().unwrap_or("Not selected"),
        input.current_database.as_deref().unwrap_or("Not selected"),
        input.current_styling.as_deref().unwrap_or("Not selected"),
    );

    let constraints_section = input
        .constraints
        .as_ref()
        .map(|c| format!("\n\nConstraints/Requirements:\n{}", c))
        .unwrap_or_default();

    let user_prompt = format!(
        r#"Analyze this project and recommend the optimal tech stack:

**App Purpose:**
{}

**Target Users:**
{}

**Key Features:**
{}

{}{}

Respond with JSON only. For any field where the user's selection is appropriate, return null for that field."#,
        input.app_purpose,
        input.target_users,
        features_list,
        current_selections,
        constraints_section
    );

    // Call Claude API
    let response = ai::call_claude(
        &state.http_client,
        &api_key,
        INFER_STACK_SYSTEM_PROMPT,
        &user_prompt,
    )
    .await?;

    // Parse the JSON response
    let inferred: InferredStack = serde_json::from_str(&response)
        .map_err(|e| format!("Failed to parse AI response: {}. Response was: {}", e, response))?;

    Ok(inferred)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deserialize_input() {
        let json = r#"{
            "appPurpose": "A todo app",
            "targetUsers": "Developers",
            "keyFeatures": ["Add tasks", "Mark complete"],
            "techPreferences": {
                "language": "TypeScript",
                "framework": "React",
                "database": null,
                "styling": "Tailwind CSS"
            },
            "constraints": null
        }"#;

        let input: KickstartInput = serde_json::from_str(json).unwrap();
        assert_eq!(input.app_purpose, "A todo app");
        assert_eq!(input.key_features.len(), 2);
        assert_eq!(input.tech_preferences.language, "TypeScript");
        assert_eq!(input.tech_preferences.framework, Some("React".to_string()));
        assert!(input.tech_preferences.database.is_none());
    }
}
