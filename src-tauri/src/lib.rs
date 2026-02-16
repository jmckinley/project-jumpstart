//! @module lib
//! @description Core library entry point for Project Jumpstart Tauri application
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
//! - commands - IPC command handlers (onboarding, project, claude_md, modules, freshness, skills, ralph, context, enforcement, settings, test_plans, memory)
//! - core - Business logic modules (scanner, generator, health, analyzer, freshness, test_runner)
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

use commands::activity::{get_recent_activities, log_activity};
use commands::claude_md::{generate_claude_md, get_health_score, read_claude_md, write_claude_md};
use commands::context::{create_checkpoint, get_context_health, get_mcp_status, list_checkpoints};
use commands::freshness::{check_freshness, get_stale_files};
use commands::modules::{apply_module_doc, batch_generate_docs, generate_module_doc, parse_module_doc, scan_modules};
use commands::onboarding::{check_git_installed, install_git, save_project, scan_project};
use commands::project::{get_project, list_projects, remove_project};
use commands::ralph::{
    analyze_ralph_prompt, analyze_ralph_prompt_with_ai, kill_ralph_loop, list_ralph_loops,
    list_ralph_mistakes, pause_ralph_loop, resume_ralph_loop, start_ralph_loop, start_ralph_loop_prd,
    get_ralph_context, record_ralph_mistake, update_claude_md_with_pattern,
};
use commands::enforcement::{
    check_hooks_configured, get_ci_snippets, get_enforcement_events, get_hook_status, init_git, install_git_hooks,
};
use commands::settings::{get_all_settings, get_setting, save_setting, validate_api_key};
use commands::watcher::{start_file_watcher, stop_file_watcher};
use commands::skills::{
    create_skill, delete_skill, detect_patterns, increment_skill_usage, list_skills, update_skill,
};
use commands::agents::{
    create_agent, delete_agent, enhance_agent_instructions, increment_agent_usage, list_agents, update_agent,
};
use commands::kickstart::{generate_kickstart_prompt, generate_kickstart_claude_md, infer_tech_stack};
use commands::test_plans::{
    list_test_plans, get_test_plan, create_test_plan, update_test_plan, delete_test_plan,
    list_test_cases, create_test_case, update_test_case, delete_test_case,
    detect_project_test_framework, run_test_plan, get_test_runs, generate_test_suggestions,
    create_tdd_session, update_tdd_session, get_tdd_session, list_tdd_sessions,
    generate_subagent_config, generate_hooks_config,
};
use commands::session_analysis::{analyze_session, get_session_transcript};
use commands::team_templates::{
    list_team_templates, create_team_template, update_team_template, delete_team_template,
    increment_team_template_usage, generate_team_deploy_output,
};
use commands::memory::{
    list_memory_sources, list_learnings, update_learning_status, analyze_claude_md,
    get_memory_health, promote_learning,
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
                http_client: reqwest::Client::new(),
                watcher: Mutex::new(None),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            scan_project,
            save_project,
            check_git_installed,
            install_git,
            list_projects,
            get_project,
            remove_project,
            read_claude_md,
            write_claude_md,
            generate_claude_md,
            get_health_score,
            scan_modules,
            parse_module_doc,
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
            list_agents,
            create_agent,
            update_agent,
            delete_agent,
            increment_agent_usage,
            enhance_agent_instructions,
            analyze_ralph_prompt,
            analyze_ralph_prompt_with_ai,
            start_ralph_loop,
            start_ralph_loop_prd,
            pause_ralph_loop,
            resume_ralph_loop,
            kill_ralph_loop,
            list_ralph_loops,
            list_ralph_mistakes,
            get_ralph_context,
            record_ralph_mistake,
            update_claude_md_with_pattern,
            get_context_health,
            get_mcp_status,
            create_checkpoint,
            list_checkpoints,
            install_git_hooks,
            init_git,
            get_hook_status,
            check_hooks_configured,
            get_enforcement_events,
            get_ci_snippets,
            get_setting,
            save_setting,
            get_all_settings,
            validate_api_key,
            log_activity,
            get_recent_activities,
            start_file_watcher,
            stop_file_watcher,
            generate_kickstart_prompt,
            generate_kickstart_claude_md,
            infer_tech_stack,
            // Test Plan Manager commands
            list_test_plans,
            get_test_plan,
            create_test_plan,
            update_test_plan,
            delete_test_plan,
            list_test_cases,
            create_test_case,
            update_test_case,
            delete_test_case,
            detect_project_test_framework,
            run_test_plan,
            get_test_runs,
            generate_test_suggestions,
            create_tdd_session,
            update_tdd_session,
            get_tdd_session,
            list_tdd_sessions,
            generate_subagent_config,
            generate_hooks_config,
            // Session Analysis commands
            analyze_session,
            get_session_transcript,
            // Team Template commands
            list_team_templates,
            create_team_template,
            update_team_template,
            delete_team_template,
            increment_team_template_usage,
            generate_team_deploy_output,
            // Memory Management commands
            list_memory_sources,
            list_learnings,
            update_learning_status,
            analyze_claude_md,
            get_memory_health,
            promote_learning,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
