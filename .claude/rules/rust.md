---
paths:
  - "src-tauri/**/*.rs"
---

# Rust / Tauri Patterns

## Tauri Commands

All Tauri commands follow this pattern:

```rust
#[tauri::command]
pub async fn command_name(
    arg: ArgType,
    state: State<'_, AppState>
) -> Result<ReturnType, String> {
    let db = state.db.lock().unwrap();
    let result = do_something(&db, arg).map_err(|e| e.to_string())?;
    Ok(result)
}
```

**Rules:**
- Always async
- Always return `Result<T, String>`
- Use `State<'_, AppState>` for shared state
- Map errors to strings with `.map_err(|e| e.to_string())`
- Register new commands in both `commands/mod.rs` AND `lib.rs` invoke_handler

## Error Handling

- Use `anyhow` internally, convert to `String` at command boundary
- `#[serde(rename_all = "camelCase")]` handles TS camelCase <-> Rust snake_case

## Database

- SQLite at `~/.project-jumpstart/jumpstart.db`
- Settings JSON for hooks: `~/.project-jumpstart/settings.json` (0600 permissions)
- Use migrations for schema changes (see `db/schema.rs`)
- All timestamps in UTC, ISO 8601 TEXT
- IDs are UUID v4 TEXT

## Async Runtime

- Use `tokio` for async
- File watcher uses notify-rs v7 with 500ms debounce
- `reqwest::Client` shared via AppState for HTTP calls
