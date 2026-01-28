//! @module commands/watcher
//! @description Tauri IPC commands for file watcher management
//!
//! PURPOSE:
//! - Start watching a project directory for source file changes
//! - Stop watching when project changes or app closes
//!
//! DEPENDENCIES:
//! - tauri - Command macro, State, AppHandle
//! - core::watcher - ProjectWatcher for actual file watching
//! - db::AppState - Shared state holding the watcher instance
//!
//! EXPORTS:
//! - start_file_watcher - Start watching a project directory
//! - stop_file_watcher - Stop the current watcher
//!
//! PATTERNS:
//! - Only one watcher runs at a time (stored in AppState)
//! - Starting a new watcher automatically stops the previous one
//! - The watcher emits "file-changed" events to the frontend
//!
//! CLAUDE NOTES:
//! - The watcher is stored as Option<ProjectWatcher> in AppState
//! - Dropping the previous watcher automatically cleans up its resources
//! - start_file_watcher requires both the project path and a Tauri AppHandle

use tauri::{AppHandle, State};

use crate::core::watcher::ProjectWatcher;
use crate::db::AppState;

/// Start watching a project directory for file changes.
/// Stops any existing watcher before starting a new one.
#[tauri::command]
pub async fn start_file_watcher(
    project_path: String,
    app_handle: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    // Stop existing watcher first
    {
        let mut watcher_guard = state
            .watcher
            .lock()
            .map_err(|e| format!("Failed to lock watcher: {}", e))?;
        *watcher_guard = None;
    }

    let new_watcher = ProjectWatcher::start(app_handle, project_path)?;

    {
        let mut watcher_guard = state
            .watcher
            .lock()
            .map_err(|e| format!("Failed to lock watcher: {}", e))?;
        *watcher_guard = Some(new_watcher);
    }

    Ok(())
}

/// Stop the current file watcher.
#[tauri::command]
pub async fn stop_file_watcher(state: State<'_, AppState>) -> Result<(), String> {
    let mut watcher_guard = state
        .watcher
        .lock()
        .map_err(|e| format!("Failed to lock watcher: {}", e))?;
    *watcher_guard = None;
    Ok(())
}
