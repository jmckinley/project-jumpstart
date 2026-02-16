---
paths:
  - "src-tauri/src/db/**/*.rs"
  - "src-tauri/src/commands/**/*.rs"
---

# Database Patterns

## Schema

- All tables in `db/schema.rs` using `CREATE TABLE IF NOT EXISTS`
- New tables: add SQL in `create_tables()` function
- Schema changes: add migration function (e.g., `migrate_add_*`)
- Call migrations in `db/mod.rs` after `create_tables()`

## Tables

Full schema: projects, module_docs, freshness_history, skills, patterns, agents,
ralph_loops, checkpoints, enforcement_events, settings, activities, ralph_mistakes,
test_plans, test_cases, test_runs, test_case_results, tdd_sessions, team_templates, learnings

## Conventions

- IDs: TEXT (UUID v4 strings)
- Timestamps: TEXT in ISO 8601 format (UTC)
- JSON columns: TEXT with serde_json serialization
- Foreign keys: reference parent table ID
- Indexes: create for frequently queried foreign keys

## Connection Access

```rust
let db = state.db.lock().unwrap();
db.execute("INSERT INTO ...", params![...])?;
db.query_row("SELECT ...", params![...], |row| { ... })?;
```

## Settings

- Key-value store in `settings` table
- `get_setting` / `save_setting` commands for CRUD
- Sensitive values (API keys) encrypted via `core::crypto`
