//! @module lib
//! @description Core library entry point for Claude Code Copilot Tauri application
//!
//! PURPOSE:
//! - Configure and launch the Tauri application
//! - Register all IPC command handlers
//! - Initialize plugins, database, and application state
//!
//! DEPENDENCIES:
//! - tauri - Application framework
//! - tauri::Manager - Trait for app.manage() state injection
//! - tauri_plugin_opener - System URL/file opener
//! - tauri_plugin_dialog - Native file/folder dialogs
//! - commands - IPC command handlers (onboarding, project, claude_md, modules, freshness, skills, ralph)
//! - core - Business logic modules (scanner, generator, health, analyzer, freshness)
//! - models - Data structures
//! - db - Database layer and AppState
//!
//! EXPORTS:
//! - run - Main application entry point
//!
//! PATTERNS:
//! - All Tauri commands are registered in the invoke_handler
//! - Plugins are initialized before command registration
//! - AppState is managed via Tauri's .manage() and accessed with State<AppState>
//!
//! CLAUDE NOTES:
//! - Add new command modules to both mod declarations and invoke_handler
//! - The run function is called from main.rs (desktop) and mobile entry points
//! - Database is initialized before the app starts via .setup()
//! - Dialog plugin enables native folder picker for onboarding

mod commands;
mod core;
mod db;
mod models;

use std::sync::Mutex;

use tauri::Manager;

use commands::claude_md::{generate_claude_md, get_health_score, read_claude_md, write_claude_md};
use commands::freshness::{check_freshness, get_stale_files};
use commands::modules::{apply_module_doc, batch_generate_docs, generate_module_doc, scan_modules};
use commands::onboarding::{save_project, scan_project};
use commands::project::{get_project, list_projects, remove_project};
use commands::ralph::{
    analyze_ralph_prompt, list_ralph_loops, pause_ralph_loop, start_ralph_loop,
};
use commands::skills::{
    create_skill, delete_skill, detect_patterns, increment_skill_usage, list_skills, update_skill,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let conn = db::init_db().expect("Failed to initialize database");
            app.manage(db::AppState {
                db: Mutex::new(conn),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            scan_project,
            save_project,
            list_projects,
            get_project,
            remove_project,
            read_claude_md,
            write_claude_md,
            generate_claude_md,
            get_health_score,
            scan_modules,
            generate_module_doc,
            apply_module_doc,
            batch_generate_docs,
            check_freshness,
            get_stale_files,
            list_skills,
            create_skill,
            update_skill,
            delete_skill,
            detect_patterns,
            increment_skill_usage,
            analyze_ralph_prompt,
            start_ralph_loop,
            pause_ralph_loop,
            list_ralph_loops,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
