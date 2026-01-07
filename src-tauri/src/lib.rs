mod commands;
mod models;

use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            load_image,
            analyze_image,
            adjust_brightness,
            adjust_contrast,
            convert_to_grayscale,
            save_image
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
