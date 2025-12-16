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
    Emitter, Listener, Manager,
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
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .setup(|app| {
            // Initialize application state
            let state = AppState::new();
            app.manage(Mutex::new(state));

            // Aggressive overlay status bar restoration -- always ensure overlay window exists
            // See README.md, 'Overlay Recording Status Bar Architecture & Troubleshooting', for context.
            // This forces the recording-overlay to exist even if Tauri fails to spawn it on startup or after reload/crash.
            {
                use tauri::Manager;
                let recording_overlay = app.get_webview_window("recording-overlay");
                log::info!("[aggressive-setup] Checking for pre-existing overlay window: {:#?}", recording_overlay.is_some());
                if recording_overlay.is_none() {
                    // Overlay window missing, forcibly create it
                    let overlay_window_result = tauri::WebviewWindowBuilder::new(
                        app,
                        "recording-overlay",
                        tauri::WebviewUrl::App("overlay.html".into())
                    )
                    .title("Recording")
                    .inner_size(300.0, 80.0)
                    .decorations(false)
                    .transparent(true)
                    .always_on_top(true)
                    .visible(false)
                    .focused(false)
                    .skip_taskbar(true)
                    .build();
                    match overlay_window_result {
                        Ok(_) => log::info!("[aggressive-setup] Overlay window created at startup (QA/robustness)."),
                        Err(e) => log::error!("[aggressive-setup] Failed to create overlay window: {}", e),
                    }
                } else {
                    // Window exists (likely dev reload); ensure it's clean and hidden
                    if let Some(overlay) = app.get_webview_window("recording-overlay") {
                        let _ = overlay.hide();
                        log::info!("[aggressive-setup] Overlay window exists and has been hidden for clean state.");
                    }
                }
            }

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

            // Setup global event listeners for display changes to reposition status bar
            let app_handle = app.handle().clone();
            app.handle().listen("tauri://scale-change", move |_event| {
                let app_clone = app_handle.clone();
                tauri::async_runtime::spawn(async move {
                    let _ = commands::show_status_bar(app_clone).await;
                });
            });

            let app_handle2 = app.handle().clone();
            app.handle().listen("tauri://resize", move |_event| {
                let app_clone = app_handle2.clone();
                tauri::async_runtime::spawn(async move {
                    let _ = commands::show_status_bar(app_clone).await;
                });
            });

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
            // Status bar window
            commands::show_status_bar,
            commands::set_status_bar_visibility,
            commands::enable_status_bar_click_through,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
