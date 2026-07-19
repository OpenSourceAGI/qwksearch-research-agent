#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

// Rust 2015 edition (no `edition` key in Cargo.toml) requires explicit
// `extern crate` declarations in the crate root for every third-party dep.
extern crate enigo;
extern crate open;
extern crate simulate_key;
extern crate tauri;
extern crate tauri_plugin_autostart;
extern crate tauri_plugin_clipboard_manager;
extern crate tauri_plugin_global_shortcut;
extern crate urlencoding;

mod hotkeys;
mod selection;
mod setup;

/// Application entry point. Delegates entirely to [`setup::launch`].
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn main() {
    setup::launch();
}
