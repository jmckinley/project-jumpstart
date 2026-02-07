//! @module core/ai
//! @description Centralized Anthropic API caller for AI-powered generation
//!
//! PURPOSE:
//! - Provide a single function to call the Claude API
//! - Handle request construction, authentication, and response parsing
//! - Read the API key from the settings table
//!
//! DEPENDENCIES:
//! - reqwest - HTTP client for API calls
//! - serde_json - JSON request/response handling
//! - rusqlite - Database access for API key retrieval
//!
//! EXPORTS:
//! - MODEL - The Claude model ID string (single source of truth for all callers)
//! - call_claude - Send a prompt to the Claude API and return the text response
//! - get_api_key - Read and decrypt the Anthropic API key from the settings table
//!
//! PATTERNS:
//! - call_claude is async and returns Result<String, String>
//! - API key is stored as "anthropic_api_key" in the settings table
//! - Model used: claude-sonnet-4-5-20250929
//! - Errors are mapped to descriptive strings for IPC
//!
//! CLAUDE NOTES:
//! - The API key is stored encrypted in SQLite settings table (prefixed with "enc:")
//! - get_api_key automatically decrypts the key before returning
//! - max_tokens defaults to 4096 for generation requests
//! - Response format: { content: [{ type: "text", text: "..." }] }

use rusqlite::Connection;
use serde_json::json;

pub const MODEL: &str = "claude-sonnet-4-5-20250929";
const API_URL: &str = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION: &str = "2023-06-01";

/// Call the Claude API with a system prompt and user prompt.
/// Returns the text content from the first response block.
pub async fn call_claude(
    client: &reqwest::Client,
    api_key: &str,
    system: &str,
    prompt: &str,
) -> Result<String, String> {
    let body = json!({
        "model": MODEL,
        "max_tokens": 4096,
        "system": system,
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ]
    });

    let response = client
        .post(API_URL)
        .header("x-api-key", api_key)
        .header("anthropic-version", ANTHROPIC_VERSION)
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("API request failed: {}", e))?;

    let status = response.status();
    let response_text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read API response: {}", e))?;

    if !status.is_success() {
        return Err(format!("API returned status {}: {}", status, response_text));
    }

    let parsed: serde_json::Value = serde_json::from_str(&response_text)
        .map_err(|e| format!("Failed to parse API response: {}", e))?;

    parsed["content"]
        .as_array()
        .and_then(|arr| arr.first())
        .and_then(|block| block["text"].as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| "API response did not contain expected text content".to_string())
}

/// Read the Anthropic API key from the settings table.
/// Automatically decrypts if the value is encrypted (prefixed with "enc:").
/// Returns Ok(key) if found, Err if not configured.
pub fn get_api_key(db: &Connection) -> Result<String, String> {
    let value = db
        .query_row(
            "SELECT value FROM settings WHERE key = 'anthropic_api_key'",
            [],
            |row| row.get::<_, String>(0),
        )
        .map_err(|_| "Anthropic API key not configured. Set it in Settings.".to_string())?;

    // Decrypt if encrypted (prefixed with "enc:")
    if value.starts_with("enc:") {
        crate::core::crypto::decrypt(&value[4..])
            .map_err(|e| format!("Failed to decrypt API key: {}", e))
    } else {
        Ok(value)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_api_response() {
        let response_json = r#"{
            "id": "msg_123",
            "type": "message",
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": "Hello, world!"
                }
            ],
            "model": "claude-sonnet-4-5-20250929",
            "stop_reason": "end_turn"
        }"#;

        let parsed: serde_json::Value = serde_json::from_str(response_json).unwrap();
        let text = parsed["content"]
            .as_array()
            .and_then(|arr| arr.first())
            .and_then(|block| block["text"].as_str())
            .map(|s| s.to_string());

        assert_eq!(text, Some("Hello, world!".to_string()));
    }

    #[test]
    fn test_parse_empty_content() {
        let response_json = r#"{"content": []}"#;
        let parsed: serde_json::Value = serde_json::from_str(response_json).unwrap();
        let text = parsed["content"]
            .as_array()
            .and_then(|arr| arr.first())
            .and_then(|block| block["text"].as_str());

        assert!(text.is_none());
    }
}
