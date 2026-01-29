//! @module main
//! @description Application entry point for the Project Jumpstart desktop app
//!
//! PURPOSE:
//! - Bootstrap the Tauri application on desktop platforms
//! - Delegate to lib.rs run() for actual application setup
//!
//! DEPENDENCIES:
//! - project_jumpstart_lib - Main library crate containing app logic
//!
//! CLAUDE NOTES:
//! - The windows_subsystem attribute prevents a console window on Windows in release builds
//! - All application logic lives in lib.rs; this file is just the entry point
//! - App name: Project Jumpstart

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    project_jumpstart_lib::run()
}
