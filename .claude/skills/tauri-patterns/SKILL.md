# Tauri 2.0 Patterns for Project Jumpstart

## Command Registration Checklist

When adding a new Tauri command:

1. Create the command function in `src-tauri/src/commands/<domain>.rs`
2. Add `pub mod <domain>;` to `src-tauri/src/commands/mod.rs`
3. Import the command in `src-tauri/src/lib.rs`
4. Add to `invoke_handler` in `lib.rs`
5. Add TypeScript wrapper in `src/lib/tauri.ts`
6. Add TypeScript types in `src/types/<domain>.ts`

## AppState Structure

```rust
pub struct AppState {
    pub db: Mutex<Connection>,      // SQLite connection
    pub http_client: reqwest::Client, // Shared HTTP client
    pub watcher: Mutex<Option<...>>,  // File watcher handle
}
```

## IPC Serialization

- Rust structs use `#[serde(rename_all = "camelCase")]`
- TypeScript receives camelCase fields automatically
- Optional params: frontend must pass `null` not `undefined`
- JSON columns: stored as TEXT, parsed with `serde_json`

## Plugin Usage

- `tauri-plugin-dialog`: Native file/folder picker
- `tauri-plugin-opener`: Open URLs in default browser
- File watcher: `notify-rs` v7 with custom debounce (500ms)
