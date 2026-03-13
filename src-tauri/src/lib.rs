mod audio;
mod clipboard;
mod commands;
mod config;
mod diagnostics;
mod feedback;
mod hotkeys;
mod license;
mod llm;
mod secrets;
mod state;
mod transcription;
mod window_topmost;

use state::AppState;
use std::sync::Mutex;
use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_log::{Target, TargetKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::LogDir { file_name: None }),
                ])
                .level(log::LevelFilter::Info)
                .max_file_size(5_000_000)
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepOne)
                .build(),
        )
        .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            // When a second instance tries to start, focus the existing instance
            log::info!("Second instance attempted with args: {:?}, cwd: {}", args, cwd);
            
            // If the second instance was NOT started with --minimized, show the main window
            let should_show = !args.iter().any(|arg| arg == "--minimized");
            
            if should_show {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                    log::info!("Focused existing instance's main window");
                }
            } else {
                log::info!("Second instance with --minimized flag; keeping window hidden");
            }
        }))
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
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            log::info!("=== SpeakEasy v1.0.2 starting up ===");

            // Initialize application state
            let state = AppState::new();
            app.manage(Mutex::new(state));
            
            // Handle --minimized flag: if present, hide the main window
            let args: Vec<String> = std::env::args().collect();
            let is_minimized = args.iter().any(|arg| arg == "--minimized");
            
            if is_minimized {
                log::info!("Started with --minimized flag, hiding main window");
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }

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
                        Ok(_) => {
                            log::info!("[aggressive-setup] Overlay window created at startup (QA/robustness).");
                            // Apply topmost subclass immediately after creation
                            if let Some(overlay) = app.get_webview_window("recording-overlay") {
                                if let Err(e) = window_topmost::apply_topmost_subclass(&overlay) {
                                    log::warn!("[aggressive-setup] Failed to apply topmost subclass: {}", e);
                                } else {
                                    log::info!("[aggressive-setup] Applied topmost subclass for z-order enforcement");
                                }
                            }
                        }
                        Err(e) => log::error!("[aggressive-setup] Failed to create overlay window: {}", e),
                    }
                } else {
                    // Window exists (likely dev reload); ensure it's clean and hidden
                    if let Some(overlay) = app.get_webview_window("recording-overlay") {
                        let _ = overlay.hide();
                        // Apply topmost subclass to existing window as well
                        if let Err(e) = window_topmost::apply_topmost_subclass(&overlay) {
                            log::warn!("[aggressive-setup] Failed to apply topmost subclass to existing window: {}", e);
                        } else {
                            log::info!("[aggressive-setup] Applied topmost subclass to existing overlay window");
                        }
                        log::info!("[aggressive-setup] Overlay window exists and has been hidden for clean state.");
                    }
                }
            }

            // Ensure voice-review window exists for voice command disambiguation
            {
                use tauri::Manager;
                let voice_review = app.get_webview_window("voice-review");
                log::info!("[aggressive-setup] Checking for voice-review window: {:#?}", voice_review.is_some());
                if voice_review.is_none() {
                    let voice_review_result = tauri::WebviewWindowBuilder::new(
                        app,
                        "voice-review",
                        tauri::WebviewUrl::App("voice-review.html".into())
                    )
                    .title("Voice Review")
                    .inner_size(400.0, 300.0)
                    .decorations(false)
                    .transparent(true)
                    .always_on_top(true)
                    .visible(false)
                    .focused(true) // Needs focus for keyboard input
                    .skip_taskbar(true)
                    .build();
                    match voice_review_result {
                        Ok(_) => {
                            log::info!("[aggressive-setup] Voice review window created at startup.");
                        }
                        Err(e) => log::error!("[aggressive-setup] Failed to create voice review window: {}", e),
                    }
                } else {
                    // Window exists; ensure it's hidden
                    if let Some(vr) = app.get_webview_window("voice-review") {
                        let _ = vr.hide();
                        log::info!("[aggressive-setup] Voice review window exists and has been hidden.");
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

            log::info!("SpeakEasy initialized successfully with system tray");

            // Auto-report error logs to Supabase (fire-and-forget, non-blocking)
            tokio::spawn(async {
                // 5-second delay: let startup finish and flush any new errors to the log file
                tokio::time::sleep(std::time::Duration::from_secs(5)).await;
                if let Err(e) = diagnostics::upload_diagnostics().await {
                    log::warn!("Diagnostic upload failed (non-fatal): {}", e);
                }
            });

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
            // URL opening (Chrome-first) and profile discovery
            commands::open_url_in_chrome,
            commands::list_chrome_profiles,
            commands::debug_chrome_paths,
            // User settings persistence (file-based, survives reinstalls)
            commands::load_user_settings,
            commands::save_user_settings,
            // Voice review window commands
            commands::show_voice_review,
            commands::hide_voice_review,
            commands::emit_voice_review_result,
            commands::get_voice_review_data,
            commands::clear_voice_review_data,
            // Main window topmost control (for profile chooser modal)
            commands::set_main_window_topmost,
            // Profile chooser: bring main window to front when showing modal
            commands::bring_main_to_front,
            commands::remove_main_topmost,
            // License management
            commands::activate_license,
            commands::validate_license,
            commands::get_license_info,
            commands::deactivate_license,
            commands::get_machine_id,
            commands::check_if_admin,
            commands::activate_as_admin,
            // Feedback submission
            commands::submit_feedback,
            commands::upload_feedback_attachment,
            // Diagnostic log reporting
            commands::send_diagnostics,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
