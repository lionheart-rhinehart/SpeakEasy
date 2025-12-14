mod audio;
mod clipboard;
mod commands;
mod config;
mod hotkeys;
mod llm;
mod secrets;
mod state;
mod transcription;

use state::AppState;
use std::sync::Mutex;
use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};
use tauri_plugin_autostart::MacosLauncher;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        // Autostart plugin: MacosLauncher is only used on macOS.
        // On Windows, this automatically uses the Registry (HKCU\Software\Microsoft\Windows\CurrentVersion\Run)
        // On Linux, this uses XDG autostart (~/.config/autostart/)
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .setup(|app| {
            // Initialize application state
            let state = AppState::new();
            app.manage(Mutex::new(state));

            // Set up system tray
            let show_item = MenuItem::with_id(app, "show", "Show SpeakEasy", true, None::<&str>)?;
            let settings_item = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

            let menu = Menu::with_items(app, &[&show_item, &settings_item, &quit_item])?;

            let icon = Image::from_path("icons/32x32.png").unwrap_or_else(|_| {
                // Fallback: create a simple colored icon
                Image::new_owned(vec![0, 100, 200, 255].repeat(16 * 16), 16, 16)
            });

            let _tray = TrayIconBuilder::new()
                .icon(icon)
                .menu(&menu)
                .tooltip("SpeakEasy - Press Ctrl+Space to record")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "settings" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            // Emit event to open settings
                            let _ = window.emit("open-settings", ());
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            log::info!("SpeakEasy initialized successfully with system tray");
            Ok(())
        })
        .on_window_event(|window, event| {
            // Minimize to tray instead of closing
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::start_recording,
            commands::stop_recording,
            commands::get_recording_state,
            commands::copy_to_clipboard,
            commands::paste_text,
            commands::simulate_copy,
            commands::get_selected_text,
            commands::get_audio_devices,
            commands::set_audio_device,
            commands::play_sound,
            commands::get_audio_level,
            commands::transcribe_audio,
            commands::set_api_key,
            commands::get_api_key,
            commands::show_recording_overlay,
            commands::hide_recording_overlay,
            commands::set_overlay_state,
            commands::get_usage_stats,
            commands::transform_with_webhook,
            commands::get_clipboard_text,
            commands::transform_with_gpt,
            commands::set_autostart,
            commands::get_autostart,
            commands::mark_usage_synced,
            commands::reset_usage_stats,
            commands::reset_monthly_usage,
            // Transform API key management (secure OS credential storage)
            commands::set_transform_api_key,
            commands::get_transform_api_key_status,
            commands::get_all_transform_api_key_statuses,
            commands::clear_transform_api_key,
            // Multi-provider LLM transform
            commands::transform_with_llm,
            commands::fetch_provider_models,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
