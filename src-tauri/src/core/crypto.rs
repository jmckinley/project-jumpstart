//! @module core/crypto
//! @description AES-256-GCM encryption for sensitive data like API keys
//!
//! PURPOSE:
//! - Encrypt API keys before storing in SQLite
//! - Decrypt API keys when reading from SQLite
//! - Derive encryption key from machine-specific identifier
//!
//! DEPENDENCIES:
//! - aes-gcm - AES-256-GCM authenticated encryption
//! - rand - Cryptographically secure random number generation
//! - base64 - Encoding encrypted data for storage
//! - sha2 - SHA-256 for key derivation
//! - machine-uid - Machine-specific identifier for key derivation
//!
//! EXPORTS:
//! - encrypt - Encrypt a plaintext string, returns base64-encoded ciphertext
//! - decrypt - Decrypt base64-encoded ciphertext, returns plaintext
//!
//! PATTERNS:
//! - Encryption key is derived from machine ID + app salt (never stored)
//! - Each encryption uses a random 12-byte nonce (prepended to ciphertext)
//! - Encrypted values are base64-encoded for safe storage in SQLite TEXT columns
//!
//! CLAUDE NOTES:
//! - The "enc:" prefix in settings distinguishes encrypted from plain values
//! - Key derivation is deterministic per-machine (same key derived each time)
//! - If machine ID unavailable, falls back to a static seed (less secure but functional)
//! - App name: Project Jumpstart

use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use rand::RngCore;
use sha2::{Digest, Sha256};

/// Application-specific salt for key derivation.
/// This ensures our derived keys are unique to Project Jumpstart.
const APP_SALT: &[u8] = b"project-jumpstart-v1-2024";

/// Derive a 256-bit encryption key from the machine ID and app salt.
///
/// The key derivation uses SHA-256 to combine:
/// - Machine-specific identifier (from machine-uid crate)
/// - Application salt constant
///
/// This ensures the key is:
/// - Unique per machine (different machines have different keys)
/// - Unique per application (different apps with same machine have different keys)
/// - Deterministic (same machine + app always derives same key)
fn derive_key() -> [u8; 32] {
    let machine_id = machine_uid::get()
        .unwrap_or_else(|_| "fallback-machine-id-project-jumpstart".to_string());

    let mut hasher = Sha256::new();
    hasher.update(machine_id.as_bytes());
    hasher.update(APP_SALT);

    let result = hasher.finalize();
    let mut key = [0u8; 32];
    key.copy_from_slice(&result);
    key
}

/// Encrypt a plaintext string using AES-256-GCM.
///
/// # Arguments
/// * `plaintext` - The string to encrypt
///
/// # Returns
/// * `Ok(String)` - Base64-encoded ciphertext (nonce prepended)
/// * `Err(String)` - Error message if encryption fails
///
/// # Format
/// The output is base64(nonce || ciphertext || auth_tag) where:
/// - nonce: 12 bytes (random per encryption)
/// - ciphertext: same length as plaintext
/// - auth_tag: 16 bytes (authentication tag from GCM)
pub fn encrypt(plaintext: &str) -> Result<String, String> {
    let key = derive_key();
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| format!("Failed to create cipher: {}", e))?;

    // Generate random 12-byte nonce
    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    // Encrypt the plaintext
    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| format!("Encryption failed: {}", e))?;

    // Prepend nonce to ciphertext and base64 encode
    let mut result = nonce_bytes.to_vec();
    result.extend(ciphertext);

    Ok(BASE64.encode(&result))
}

/// Decrypt a base64-encoded ciphertext using AES-256-GCM.
///
/// # Arguments
/// * `encoded` - Base64-encoded ciphertext (from encrypt())
///
/// # Returns
/// * `Ok(String)` - Decrypted plaintext
/// * `Err(String)` - Error message if decryption fails
///
/// # Security
/// Decryption will fail with an authentication error if:
/// - The ciphertext was tampered with
/// - The wrong key is used (different machine)
/// - The nonce was corrupted
pub fn decrypt(encoded: &str) -> Result<String, String> {
    let data = BASE64
        .decode(encoded)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    if data.len() < 13 {
        // Need at least 12 bytes nonce + 1 byte ciphertext (min for GCM auth tag)
        return Err("Invalid encrypted data: too short".to_string());
    }

    let (nonce_bytes, ciphertext) = data.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);

    let key = derive_key();
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| format!("Failed to create cipher: {}", e))?;

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| "Decryption failed: invalid key or corrupted data".to_string())?;

    String::from_utf8(plaintext).map_err(|e| format!("Invalid UTF-8 in decrypted data: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let original = "sk-ant-api03-test-key-12345";
        let encrypted = encrypt(original).expect("Encryption should succeed");
        let decrypted = decrypt(&encrypted).expect("Decryption should succeed");
        assert_eq!(original, decrypted);
    }

    #[test]
    fn test_encrypt_produces_different_output_each_time() {
        let original = "test-secret";
        let encrypted1 = encrypt(original).expect("Encryption should succeed");
        let encrypted2 = encrypt(original).expect("Encryption should succeed");
        // Due to random nonce, same plaintext produces different ciphertext
        assert_ne!(encrypted1, encrypted2);
    }

    #[test]
    fn test_decrypt_invalid_base64() {
        let result = decrypt("not-valid-base64!!!");
        assert!(result.is_err());
    }

    #[test]
    fn test_decrypt_too_short() {
        let result = decrypt("YWJj"); // "abc" in base64, only 3 bytes
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("too short"));
    }

    #[test]
    fn test_decrypt_tampered_data() {
        let original = "secret-key";
        let encrypted = encrypt(original).expect("Encryption should succeed");

        // Tamper with the encrypted data
        let mut data = BASE64.decode(&encrypted).unwrap();
        if let Some(byte) = data.last_mut() {
            *byte ^= 0xFF; // Flip bits in last byte
        }
        let tampered = BASE64.encode(&data);

        let result = decrypt(&tampered);
        assert!(result.is_err());
    }

    #[test]
    fn test_empty_string() {
        let original = "";
        let encrypted = encrypt(original).expect("Encryption should succeed");
        let decrypted = decrypt(&encrypted).expect("Decryption should succeed");
        assert_eq!(original, decrypted);
    }

    #[test]
    fn test_unicode_string() {
        let original = "API密钥🔐テスト";
        let encrypted = encrypt(original).expect("Encryption should succeed");
        let decrypted = decrypt(&encrypted).expect("Decryption should succeed");
        assert_eq!(original, decrypted);
    }
}
