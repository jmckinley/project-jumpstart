//! @module commands/settings
//! @description Tauri IPC commands for user settings persistence with encryption
//!
//! PURPOSE:
//! - Read and write user settings (key-value pairs) from SQLite
//! - Provide typed setting retrieval
//! - Support settings UI in the frontend
//! - Encrypt sensitive settings (API keys) at rest
//!
//! DEPENDENCIES:
//! - tauri - Command macro and State
//! - db::AppState - Database connection for settings table
//! - rusqlite - SQLite queries
//! - core::crypto - AES-256-GCM encryption for sensitive values
//!
//! EXPORTS:
//! - get_setting - Read a single setting by key (decrypts if encrypted)
//! - save_setting - Write a single setting key-value pair (encrypts API keys)
//! - get_all_settings - Read all settings as a flat map (decrypts encrypted values)
//! - validate_api_key - Validate an API key format and test with minimal API call
//!
//! PATTERNS:
//! - Settings are stored as TEXT key-value pairs in the settings table
//! - Keys use dot notation: "enforcement.level", "notifications.enabled"
//! - Values are always strings; the frontend converts to appropriate types
//! - save_setting uses INSERT OR REPLACE for upsert behavior
//! - Encrypted values are prefixed with "enc:" to distinguish from plain values
//! - API keys (anthropic_api_key) are automatically encrypted
//!
//! CLAUDE NOTES:
//! - The settings table was created in Phase 1 (schema.rs) with key TEXT PRIMARY KEY, value TEXT
//! - API keys are encrypted using AES-256-GCM with machine-specific key
//! - Default values are handled on the frontend (settingsStore.ts), not here
//! - App name: Project Jumpstart

use std::collections::HashMap;
use tauri::State;

use crate::core::crypto;
use crate::db::AppState;

/// Keys that should be encrypted when stored
const ENCRYPTED_KEYS: &[&str] = &["anthropic_api_key"];

/// Read a single setting value by key. Returns None (null) if not found.
/// Automatically decrypts values that were stored encrypted (prefixed with "enc:").
#[tauri::command]
pub async fn get_setting(
    key: String,
    state: State<'_, AppState>,
) -> Result<Option<String>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let result = db.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        rusqlite::params![key],
        |row| row.get::<_, String>(0),
    );

    match result {
        Ok(value) => {
            // Check if value is encrypted (prefixed with "enc:")
            if let Some(stripped) = value.strip_prefix("enc:") {
                let decrypted = crypto::decrypt(stripped)
                    .map_err(|e| format!("Failed to decrypt setting '{}': {}", key, e))?;
                Ok(Some(decrypted))
            } else {
                Ok(Some(value))
            }
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Failed to read setting: {}", e)),
    }
}

/// Write a setting key-value pair. Creates or updates (upsert).
/// Automatically encrypts sensitive settings (API keys) before storing.
#[tauri::command]
pub async fn save_setting(
    key: String,
    value: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    // Encrypt sensitive values
    let stored_value = if ENCRYPTED_KEYS.contains(&key.as_str()) && !value.is_empty() {
        let encrypted = crypto::encrypt(&value)
            .map_err(|e| format!("Failed to encrypt setting '{}': {}", key, e))?;
        format!("enc:{}", encrypted)
    } else {
        value
    };

    db.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        rusqlite::params![key, stored_value],
    )
    .map_err(|e| format!("Failed to save setting: {}", e))?;

    Ok(())
}

/// Read all settings as a HashMap.
/// Automatically decrypts encrypted values.
#[tauri::command]
pub async fn get_all_settings(
    state: State<'_, AppState>,
) -> Result<HashMap<String, String>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let mut stmt = db
        .prepare("SELECT key, value FROM settings")
        .map_err(|e| format!("Failed to query settings: {}", e))?;

    let rows = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| format!("Failed to read settings: {}", e))?;

    let mut settings = HashMap::new();
    for (key, value) in rows.flatten() {
        // Decrypt encrypted values
        let decrypted_value = if let Some(stripped) = value.strip_prefix("enc:") {
            crypto::decrypt(stripped).unwrap_or_else(|_| {
                // If decryption fails, return empty string (key may have changed)
                String::new()
            })
        } else {
            value
        };
        settings.insert(key, decrypted_value);
    }

    Ok(settings)
}

/// Validate an Anthropic API key by checking format and making a minimal API call.
/// Returns Ok(true) if valid, Err(message) if invalid.
#[tauri::command]
pub async fn validate_api_key(
    api_key: String,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    // Format validation: must start with "sk-ant-" and be at least 20 characters
    if !api_key.starts_with("sk-ant-") {
        return Err("Invalid API key format: must start with 'sk-ant-'".to_string());
    }
    if api_key.len() < 20 {
        return Err("Invalid API key format: key is too short".to_string());
    }

    // Make a minimal API call to verify the key works
    // We use a very short max_tokens to minimize cost
    let body = serde_json::json!({
        "model": crate::core::ai::MODEL,
        "max_tokens": 1,
        "messages": [
            {
                "role": "user",
                "content": "Hi"
            }
        ]
    });

    let response = state
        .http_client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", &api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Failed to connect to API: {}", e))?;

    let status = response.status();
    if status.is_success() {
        Ok(true)
    } else if status.as_u16() == 401 {
        Err("Invalid API key: authentication failed".to_string())
    } else if status.as_u16() == 403 {
        Err("API key does not have permission to access this resource".to_string())
    } else {
        let error_text = response.text().await.unwrap_or_default();
        Err(format!("API validation failed ({}): {}", status, error_text))
    }
}

#[cfg(test)]
mod tests {
    // Settings commands require a State<AppState> which needs a full Tauri test harness.
    // The SQL queries are straightforward (single-table CRUD), so they are
    // validated through integration testing and the schema tests.
}
