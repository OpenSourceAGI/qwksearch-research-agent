use simulate_key::simulate_key;
use tauri::AppHandle;
use tauri_plugin_clipboard_manager::ClipboardExt;
use urlencoding::encode;

/// Reads the user's currently highlighted text by simulating `Ctrl+C` and
/// then reading the system clipboard.
///
/// Because there is no cross-platform OS API to access selected text directly,
/// this function synthesises a copy keystroke and waits for the clipboard to
/// settle before reading it.
///
/// Newlines and carriage returns in the copied text are normalised to spaces
/// so the result is safe to embed in a single-line URL query parameter.
///
/// # Parameters
/// - `app` — Application handle used to access the clipboard plugin.
///
/// # Returns
/// A percent-encoded [`String`] of the highlighted text, ready to append to a
/// URL query string. Returns an empty string if the clipboard is empty or
/// unreadable.
///
/// # Side Effects
/// - Simulates `Ctrl+C` via the [`simulate_key`] crate, overwriting the
///   current clipboard contents.
/// - Sleeps the calling thread for **600 ms** to allow the OS clipboard to
///   settle before reading.
///
/// # Example
/// ```rust
/// let query = selection::read_selected_text(&app_handle);
/// let url = format!("https://qwksearch.com/?q={}", query);
/// open::that(&url).ok();
/// ```
pub fn read_selected_text(app: &AppHandle) -> String {
    // Simulate Ctrl+C to copy the highlighted text into the clipboard.
    simulate_key("ctrl+c").ok();

    // Allow the OS time to process the copy event before we read the clipboard.
    std::thread::sleep(std::time::Duration::from_millis(600));

    let clipboard = app.clipboard();
    let content = match clipboard.read_text() {
        Ok(text) => text.replace('\r', " ").replace('\n', " "),
        Err(e) => {
            eprintln!("Failed to read clipboard: {}", e);
            String::new()
        }
    };

    encode(&content).to_string()
}
