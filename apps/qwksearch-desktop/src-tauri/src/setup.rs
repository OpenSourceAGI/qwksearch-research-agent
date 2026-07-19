use tauri::Manager;
use tauri::window::WindowBuilder;

use crate::hotkeys;

/// Builds and launches the Tauri application event loop.
///
/// Responsible for:
/// - Setting Linux-specific Wayland / WebKit environment variables.
/// - Registering all Tauri plugins.
/// - Creating the initial hidden [`WindowBuilder`] window.
/// - Delegating global hotkey binding to [`hotkeys::bind`].
///
/// # Plugins
/// | Plugin                          | Purpose                                           |
/// |---------------------------------|---------------------------------------------------|
/// | `tauri_plugin_clipboard_manager`| Clipboard read access for [`crate::selection`]    |
/// | `tauri_plugin_autostart`        | Launch on login via macOS `LaunchAgent`           |
/// | `tauri_plugin_shell`            | Shell command access for the frontend             |
///
/// # Panics
/// Panics with `"error while running tauri application"` if the Tauri event
/// loop encounters an unrecoverable error.
pub fn launch() {
    // Wayland / WebKit compatibility flags required on Linux.
    #[cfg(target_os = "linux")]
    {
        std::env::set_var("GDK_BACKEND", "wayland");
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(tauri_plugin_shell::init())
        // Add the global-shortcut plugin to the builder chain so it
        // initialises with the other plugins — before the setup hook.
        .plugin(hotkeys::plugin())
        .setup(|app| {
            #[cfg(desktop)]
            {
                WindowBuilder::new(app, "QwkSearch")
                    .title("QwkSearch")
                    .inner_size(100.0, 100.0)
                    .visible(false)
                    .build()?;

                // Register shortcuts now that the plugin is ready.
                hotkeys::register(app);

                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
