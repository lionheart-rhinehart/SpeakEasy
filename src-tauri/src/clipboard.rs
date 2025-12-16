use anyhow::Result;

/// Copy text to the system clipboard (persists after our app releases it)
pub fn copy_text(text: &str) -> Result<()> {
    // Use clipboard-win on Windows for persistent clipboard
    #[cfg(target_os = "windows")]
    {
        use clipboard_win::{formats, set_clipboard};
        set_clipboard(formats::Unicode, text)
            .map_err(|e| anyhow::anyhow!("Failed to set clipboard: {:?}", e))?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        use arboard::Clipboard;
        let mut clipboard = Clipboard::new()?;
        clipboard.set_text(text)?;
    }

    log::info!("Copied {} characters to clipboard", text.len());
    Ok(())
}

/// Get text from the system clipboard
pub fn get_text() -> Result<String> {
    #[cfg(target_os = "windows")]
    {
        use clipboard_win::{formats, get_clipboard};
        let text: String = get_clipboard(formats::Unicode)
            .map_err(|e| anyhow::anyhow!("Failed to get clipboard: {:?}", e))?;
        Ok(text)
    }

    #[cfg(not(target_os = "windows"))]
    {
        use arboard::Clipboard;
        let mut clipboard = Clipboard::new()?;
        let text = clipboard.get_text()?;
        Ok(text)
    }
}

/// Simulate paste keystroke - uses multiple strategies for maximum compatibility
/// Terminal applications (CMD, PowerShell, Windows Terminal, Claude Code) often
/// don't respond to standard Ctrl+V simulation, so we try multiple approaches.
pub fn simulate_paste() -> Result<()> {
    use std::thread;
    use std::time::Duration;

    // Longer delay to ensure the target window is fully focused and ready
    thread::sleep(Duration::from_millis(150));

    // On Windows, try the Windows API SendInput approach first (most reliable for terminals)
    #[cfg(target_os = "windows")]
    {
        if let Ok(()) = simulate_paste_windows_api() {
            log::info!("Paste successful via Windows SendInput API");
            return Ok(());
        }
        log::warn!("Windows SendInput paste failed, trying Shift+Insert fallback");

        // Try Shift+Insert as fallback (works in many terminals)
        thread::sleep(Duration::from_millis(50));
        if let Ok(()) = simulate_shift_insert() {
            log::info!("Paste successful via Shift+Insert");
            return Ok(());
        }
        log::warn!("Shift+Insert failed, trying rdev Ctrl+V fallback");
    }

    // Fallback to rdev simulation (works for most GUI apps)
    simulate_paste_rdev()
}

/// Windows-specific paste using SendInput API - more reliable for terminal apps
#[cfg(target_os = "windows")]
fn simulate_paste_windows_api() -> Result<()> {
    use std::thread;
    use std::time::Duration;
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYBD_EVENT_FLAGS, KEYEVENTF_KEYUP,
        VK_CONTROL, VK_V,
    };

    unsafe {
        // Press Ctrl
        let ctrl_down = INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VK_CONTROL,
                    wScan: 0,
                    dwFlags: KEYBD_EVENT_FLAGS(0),
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };

        // Press V
        let v_down = INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VK_V,
                    wScan: 0,
                    dwFlags: KEYBD_EVENT_FLAGS(0),
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };

        // Release V
        let v_up = INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VK_V,
                    wScan: 0,
                    dwFlags: KEYEVENTF_KEYUP,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };

        // Release Ctrl
        let ctrl_up = INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VK_CONTROL,
                    wScan: 0,
                    dwFlags: KEYEVENTF_KEYUP,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };

        // Send all inputs
        let inputs = [ctrl_down, v_down];
        let sent = SendInput(&inputs, std::mem::size_of::<INPUT>() as i32);
        if sent != 2 {
            return Err(anyhow::anyhow!("SendInput failed for key down"));
        }

        thread::sleep(Duration::from_millis(30));

        let inputs = [v_up, ctrl_up];
        let sent = SendInput(&inputs, std::mem::size_of::<INPUT>() as i32);
        if sent != 2 {
            return Err(anyhow::anyhow!("SendInput failed for key up"));
        }
    }

    Ok(())
}

/// Simulate Shift+Insert paste (common terminal paste shortcut)
#[cfg(target_os = "windows")]
fn simulate_shift_insert() -> Result<()> {
    use std::thread;
    use std::time::Duration;
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYBD_EVENT_FLAGS, KEYEVENTF_KEYUP,
        VK_INSERT, VK_SHIFT,
    };

    unsafe {
        let shift_down = INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VK_SHIFT,
                    wScan: 0,
                    dwFlags: KEYBD_EVENT_FLAGS(0),
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };

        let insert_down = INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VK_INSERT,
                    wScan: 0,
                    dwFlags: KEYBD_EVENT_FLAGS(0),
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };

        let insert_up = INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VK_INSERT,
                    wScan: 0,
                    dwFlags: KEYEVENTF_KEYUP,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };

        let shift_up = INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VK_SHIFT,
                    wScan: 0,
                    dwFlags: KEYEVENTF_KEYUP,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };

        let inputs = [shift_down, insert_down];
        let sent = SendInput(&inputs, std::mem::size_of::<INPUT>() as i32);
        if sent != 2 {
            return Err(anyhow::anyhow!("SendInput failed for Shift+Insert down"));
        }

        thread::sleep(Duration::from_millis(30));

        let inputs = [insert_up, shift_up];
        let sent = SendInput(&inputs, std::mem::size_of::<INPUT>() as i32);
        if sent != 2 {
            return Err(anyhow::anyhow!("SendInput failed for Shift+Insert up"));
        }
    }

    Ok(())
}

/// Fallback paste using rdev library (cross-platform, but less reliable for terminals)
fn simulate_paste_rdev() -> Result<()> {
    use rdev::{simulate, EventType, Key};
    use std::thread;
    use std::time::Duration;

    // Press Ctrl
    simulate(&EventType::KeyPress(Key::ControlLeft))
        .map_err(|e| anyhow::anyhow!("Failed to press Ctrl: {:?}", e))?;

    thread::sleep(Duration::from_millis(30));

    // Press V
    simulate(&EventType::KeyPress(Key::KeyV))
        .map_err(|e| anyhow::anyhow!("Failed to press V: {:?}", e))?;

    thread::sleep(Duration::from_millis(30));

    // Release V
    simulate(&EventType::KeyRelease(Key::KeyV))
        .map_err(|e| anyhow::anyhow!("Failed to release V: {:?}", e))?;

    thread::sleep(Duration::from_millis(30));

    // Release Ctrl
    simulate(&EventType::KeyRelease(Key::ControlLeft))
        .map_err(|e| anyhow::anyhow!("Failed to release Ctrl: {:?}", e))?;

    log::info!("Simulated paste keystroke via rdev");
    Ok(())
}

/// Simulate Ctrl+C keystroke to copy selected text - uses multiple strategies for maximum compatibility
pub fn simulate_copy() -> Result<()> {
    use std::thread;
    use std::time::Duration;

    // Small delay to ensure the target window is focused
    thread::sleep(Duration::from_millis(50));

    // On Windows, try the Windows API SendInput approach first (most reliable)
    #[cfg(target_os = "windows")]
    {
        if let Ok(()) = simulate_copy_windows_api() {
            log::info!("Copy successful via Windows SendInput API");
            return Ok(());
        }
        log::warn!("Windows SendInput copy failed, trying rdev Ctrl+C fallback");
    }

    // Fallback to rdev simulation (cross-platform)
    simulate_copy_rdev()
}

/// Windows-specific copy using SendInput API - more reliable for editor apps like VS Code/Cursor
#[cfg(target_os = "windows")]
fn simulate_copy_windows_api() -> Result<()> {
    use std::thread;
    use std::time::Duration;
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYBD_EVENT_FLAGS, KEYEVENTF_KEYUP,
        VK_C, VK_CONTROL,
    };

    unsafe {
        // Press Ctrl
        let ctrl_down = INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VK_CONTROL,
                    wScan: 0,
                    dwFlags: KEYBD_EVENT_FLAGS(0),
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };

        // Press C
        let c_down = INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VK_C,
                    wScan: 0,
                    dwFlags: KEYBD_EVENT_FLAGS(0),
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };

        // Release C
        let c_up = INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VK_C,
                    wScan: 0,
                    dwFlags: KEYEVENTF_KEYUP,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };

        // Release Ctrl
        let ctrl_up = INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VK_CONTROL,
                    wScan: 0,
                    dwFlags: KEYEVENTF_KEYUP,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };

        // Send key down events
        let inputs = [ctrl_down, c_down];
        let sent = SendInput(&inputs, std::mem::size_of::<INPUT>() as i32);
        if sent != 2 {
            return Err(anyhow::anyhow!("SendInput failed for Ctrl+C key down"));
        }

        thread::sleep(Duration::from_millis(30));

        // Send key up events
        let inputs = [c_up, ctrl_up];
        let sent = SendInput(&inputs, std::mem::size_of::<INPUT>() as i32);
        if sent != 2 {
            return Err(anyhow::anyhow!("SendInput failed for Ctrl+C key up"));
        }
    }

    Ok(())
}

/// Fallback copy using rdev library (cross-platform, but less reliable for some apps)
fn simulate_copy_rdev() -> Result<()> {
    use rdev::{simulate, EventType, Key};
    use std::thread;
    use std::time::Duration;

    // Press Ctrl
    simulate(&EventType::KeyPress(Key::ControlLeft))
        .map_err(|e| anyhow::anyhow!("Failed to press Ctrl: {:?}", e))?;

    thread::sleep(Duration::from_millis(20));

    // Press C
    simulate(&EventType::KeyPress(Key::KeyC))
        .map_err(|e| anyhow::anyhow!("Failed to press C: {:?}", e))?;

    thread::sleep(Duration::from_millis(20));

    // Release C
    simulate(&EventType::KeyRelease(Key::KeyC))
        .map_err(|e| anyhow::anyhow!("Failed to release C: {:?}", e))?;

    thread::sleep(Duration::from_millis(20));

    // Release Ctrl
    simulate(&EventType::KeyRelease(Key::ControlLeft))
        .map_err(|e| anyhow::anyhow!("Failed to release Ctrl: {:?}", e))?;

    log::info!("Simulated copy keystroke via rdev");
    Ok(())
}

/// Capture selected text from the focused application.
/// This simulates Ctrl+C, polls the clipboard for changes, and returns the selected text.
/// Returns an error if no selection is detected (clipboard doesn't change within timeout).
/// Does NOT restore the clipboard afterward - the selected text remains on the clipboard.
pub fn get_selected_text() -> Result<String> {
    use std::thread;
    use std::time::{Duration, Instant};

    // Read the clipboard before we simulate copy
    let before = get_text().unwrap_or_default();
    log::info!(
        "get_selected_text: clipboard before copy = {} chars",
        before.len()
    );

    // Simulate copy
    simulate_copy()?;

    // Poll the clipboard for changes (up to 500ms)
    let timeout = Duration::from_millis(500);
    let poll_interval = Duration::from_millis(25);
    let start = Instant::now();

    loop {
        thread::sleep(poll_interval);

        let current = get_text().unwrap_or_default();
        let current_trimmed = current.trim();

        // Success: clipboard changed AND is non-empty
        if !current_trimmed.is_empty() && current != before {
            log::info!("get_selected_text: captured {} chars", current.len());
            return Ok(current);
        }

        // Timeout reached
        if start.elapsed() >= timeout {
            log::warn!(
                "get_selected_text: clipboard did not change within {}ms",
                timeout.as_millis()
            );
            return Err(anyhow::anyhow!(
                "NoSelectionDetected: No text was selected or copy failed"
            ));
        }
    }
}
