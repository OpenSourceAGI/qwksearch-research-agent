use enigo::{Direction::Release, Enigo, Keyboard, Settings};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, ShortcutState};

use crate::selection;

/// Creates the global-shortcut plugin with the hotkey event handler attached.
///
/// This returns the plugin instance to be added to the Tauri builder chain
/// via `.plugin()`.  No shortcuts are registered here — call [`register`]
/// inside the setup hook after the plugin is initialised.
///
/// # Example
/// ```rust
/// tauri::Builder::default()
///     .plugin(hotkeys::plugin())
///     .setup(|app| { hotkeys::register(app); Ok(()) })
/// ```
pub fn plugin() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    tauri_plugin_global_shortcut::Builder::new()
        .with_handler(|app, shortcut, event| {
            println!(
                "[hotkeys] handler fired: shortcut={:?} state={:?}",
                shortcut, event.state
            );
            if event.state == ShortcutState::Released {
                search_selection_immediate(app, shortcut);
            }
        })
        .build()
}

/// Registers the `Alt+`` ` `` hotkey after the global-shortcut plugin is ready.
///
/// Registration failures are logged as warnings instead of panicking the
/// app.  Note: [`GlobalShortcutExt::is_registered`] only reflects the
/// *current* process's state, so it cannot detect OS-level conflicts from
/// other apps or stale instances — we skip the check and let `register`
/// report the real error.
///
/// # Parameters
/// - `app` — Mutable reference to the running [`tauri::App`].
pub fn register(app: &mut tauri::App) {
    let session_type = std::env::var("XDG_SESSION_TYPE").unwrap_or_else(|_| "unknown".into());
    let gdk_backend = std::env::var("GDK_BACKEND").unwrap_or_else(|_| "unset".into());
    // println!("[hotkeys] XDG_SESSION_TYPE={session_type}, GDK_BACKEND={gdk_backend}");

    let gs = app.handle().global_shortcut();
    match gs.register("Alt+`") {
        Ok(_) => println!("[hotkeys] Alt+` registered globally: {}", gs.is_registered("Alt+`")),
        Err(e) => eprintln!(
            "[hotkeys] FAILED to register Alt+`: {}. Is another instance or app using it?",
            e
        ),
    }
}

/// Handles the `Alt+`` ` `` hotkey.
///
/// 1. Emits a `shortcut-event` Tauri event so the frontend can react.
/// 2. Shows the hidden `main` webview window.
/// 3. Releases the OS-held `Alt` (`0x12`) and backtick (`0xC0`) keys so
///    subsequent key simulations are not tainted by held modifiers.
/// 4. Reads the user's highlighted text via [`selection::read_selected_text`].
/// 5. Opens the selection in QwkSearch with `first=true`, triggering an
///    immediate search rather than a suggestion list.
/// 
/// # Parameters
/// - `app`      — Handle to the running application.
/// - `shortcut` — The matched hotkey descriptor supplied by the OS.
fn search_selection_immediate(app: &AppHandle, shortcut: &tauri_plugin_global_shortcut::Shortcut) {
    println!(
        "[hotkeys] search_selection_immediate: matches Alt+Backquote = {}",
        shortcut.matches(Modifiers::ALT, Code::Backquote)
    );
    if shortcut.matches(Modifiers::ALT, Code::Backquote) {
        let _ = app.emit("shortcut-event", "Alt+` triggered");

        if let Some(window) = app.get_webview_window("main") {
            let _ = window.show();
        }

        // Release modifier keys before simulating Ctrl+C, otherwise the OS
        // may interpret the synthesised copy as Alt+Ctrl+C.
        let mut enigo = Enigo::new(&Settings::default()).unwrap();
        let _ = enigo.raw(0x12, Release); // 0x12 — virtual key code for Alt
        let _ = enigo.raw(0xC0, Release); // 0xC0 — virtual key code for backtick

        let query = selection::read_selected_text(app);
        let url = format!("https://qwksearch.com/?first=true&q={}", query);
        println!("{}", url);

        if let Err(e) = open::that(&url) {
            eprintln!("Error opening URL: {}", e);
        }
    }
}
