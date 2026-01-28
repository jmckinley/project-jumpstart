//! @module core/watcher
//! @description File system watcher for real-time project change monitoring
//!
//! PURPOSE:
//! - Watch project directories for source file changes
//! - Debounce rapid file system events (500ms window)
//! - Emit structured change events to the frontend via Tauri events
//! - Filter to relevant source files and CLAUDE.md
//!
//! DEPENDENCIES:
//! - notify - Cross-platform file watching (RecommendedWatcher)
//! - tauri - AppHandle for event emission
//! - tokio - Async runtime for debounce timing
//! - serde - Serialization for event payload
//!
//! EXPORTS:
//! - ProjectWatcher - Struct wrapping the notify watcher
//! - FileChangePayload - Event payload sent to frontend
//!
//! PATTERNS:
//! - start() creates a watcher, spawns a debounce task, returns ProjectWatcher
//! - stop() drops the watcher (cleanup is automatic via Drop)
//! - Events are emitted as "file-changed" Tauri events
//! - Only source files (.ts/.tsx/.js/.jsx/.rs/.py/.go) and CLAUDE.md trigger events
//!
//! CLAUDE NOTES:
//! - The watcher uses notify-rs with recursive mode
//! - Debounce is implemented via a tokio channel + sleep, not notify's built-in debouncer
//! - ProjectWatcher is stored in AppState behind a std::sync::Mutex<Option<...>>
//! - The frontend listens for "file-changed" events via @tauri-apps/api/event

use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::path::Path;
use std::sync::mpsc;
use tauri::{AppHandle, Emitter};

/// Payload emitted to the frontend when a file changes.
#[derive(Debug, Clone, Serialize)]
pub struct FileChangePayload {
    pub path: String,
    pub kind: String,
}

/// A file system watcher for a single project directory.
/// Dropping this struct stops the watcher automatically.
pub struct ProjectWatcher {
    _watcher: RecommendedWatcher,
}

// notify::RecommendedWatcher is not Send on all platforms, but we only store it
// behind a std::sync::Mutex in AppState, which is fine for single-threaded access.
unsafe impl Send for ProjectWatcher {}

/// Source file extensions that should trigger file-changed events.
const WATCHED_EXTENSIONS: &[&str] = &[
    "ts", "tsx", "js", "jsx", "rs", "py", "go",
];

/// Check if a file path should trigger a change event.
fn is_watched_file(path: &Path) -> bool {
    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("");

    // Always watch CLAUDE.md
    if name == "CLAUDE.md" {
        return true;
    }

    // Check extension
    path.extension()
        .and_then(|e| e.to_str())
        .map(|ext| WATCHED_EXTENSIONS.contains(&ext))
        .unwrap_or(false)
}

/// Map a notify event kind to a simple string.
fn event_kind_str(kind: &notify::EventKind) -> &'static str {
    match kind {
        notify::EventKind::Create(_) => "create",
        notify::EventKind::Modify(_) => "modify",
        notify::EventKind::Remove(_) => "remove",
        _ => "other",
    }
}

impl ProjectWatcher {
    /// Start watching a project directory for source file changes.
    /// Emits "file-changed" events to the frontend via the AppHandle.
    pub fn start(app_handle: AppHandle, project_path: String) -> Result<Self, String> {
        let path = Path::new(&project_path);
        if !path.exists() {
            return Err(format!("Path does not exist: {}", project_path));
        }

        let (tx, rx) = mpsc::channel::<Event>();

        let mut watcher = RecommendedWatcher::new(
            move |res: Result<Event, notify::Error>| {
                if let Ok(event) = res {
                    let _ = tx.send(event);
                }
            },
            Config::default(),
        )
        .map_err(|e| format!("Failed to create watcher: {}", e))?;

        watcher
            .watch(path, RecursiveMode::Recursive)
            .map_err(|e| format!("Failed to start watching: {}", e))?;

        // Spawn a debounce task that collects events and emits after 500ms of quiet
        let handle = app_handle.clone();
        std::thread::spawn(move || {
            use std::collections::HashSet;
            use std::time::{Duration, Instant};

            let debounce_ms = Duration::from_millis(500);
            let mut pending: HashSet<String> = HashSet::new();
            let mut pending_kind: std::collections::HashMap<String, String> =
                std::collections::HashMap::new();
            let mut last_event = Instant::now();

            loop {
                match rx.recv_timeout(debounce_ms) {
                    Ok(event) => {
                        for path in &event.paths {
                            if is_watched_file(path) {
                                let path_str = path.to_string_lossy().to_string();
                                let kind = event_kind_str(&event.kind).to_string();
                                pending.insert(path_str.clone());
                                pending_kind.insert(path_str, kind);
                            }
                        }
                        last_event = Instant::now();
                    }
                    Err(mpsc::RecvTimeoutError::Timeout) => {
                        if !pending.is_empty() && last_event.elapsed() >= debounce_ms {
                            for path in pending.drain() {
                                let kind = pending_kind
                                    .remove(&path)
                                    .unwrap_or_else(|| "modify".to_string());
                                let _ = handle.emit(
                                    "file-changed",
                                    FileChangePayload {
                                        path,
                                        kind,
                                    },
                                );
                            }
                            pending_kind.clear();
                        }
                    }
                    Err(mpsc::RecvTimeoutError::Disconnected) => {
                        // Watcher was dropped, exit the thread
                        break;
                    }
                }
            }
        });

        Ok(ProjectWatcher {
            _watcher: watcher,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_is_watched_file() {
        assert!(is_watched_file(&PathBuf::from("src/App.tsx")));
        assert!(is_watched_file(&PathBuf::from("src/main.rs")));
        assert!(is_watched_file(&PathBuf::from("lib/utils.py")));
        assert!(is_watched_file(&PathBuf::from("handler.go")));
        assert!(is_watched_file(&PathBuf::from("CLAUDE.md")));
        assert!(!is_watched_file(&PathBuf::from("README.md")));
        assert!(!is_watched_file(&PathBuf::from("package.json")));
        assert!(!is_watched_file(&PathBuf::from("image.png")));
    }

    #[test]
    fn test_event_kind_str() {
        assert_eq!(
            event_kind_str(&notify::EventKind::Create(notify::event::CreateKind::File)),
            "create"
        );
        assert_eq!(
            event_kind_str(&notify::EventKind::Modify(notify::event::ModifyKind::Data(
                notify::event::DataChange::Content
            ))),
            "modify"
        );
        assert_eq!(
            event_kind_str(&notify::EventKind::Remove(notify::event::RemoveKind::File)),
            "remove"
        );
    }
}
