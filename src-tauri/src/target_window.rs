//! Cursor Lock: capture a target window while the user designates it, then
//! deliver transcribed/transformed text to that exact window later — even after
//! the user has navigated away.
//!
//! The hard part is foregrounding a *background* window. Per MSDN's
//! `SetForegroundWindow` Remarks, a background process is normally refused and
//! the system just flashes the taskbar button. We use the documented
//! `SPI_SETFOREGROUNDLOCKTIMEOUT = 0` lever (the same one AutoHotkey's
//! `WinActivate` uses) plus `AttachThreadInput`, and — critically — we VERIFY
//! that the target actually became the foreground before any paste occurs.
//! Callers MUST honor `focus_window_robust`'s return value: if it is false,
//! do NOT paste, or the text would land in whatever app the user is now using.

use std::sync::Mutex;

/// Separately-managed Tauri state holding the currently-armed paste target.
#[derive(Default)]
pub struct TargetState {
    pub target: Mutex<Option<TargetWindow>>,
}

/// A captured destination window. HWNDs are stored as `isize` so this is
/// trivially `Send`/`Sync` across the Tauri command threads.
#[derive(Clone)]
pub struct TargetWindow {
    pub hwnd: isize,
    pub focus_hwnd: isize,
    pub title: String,
}

// ───────────────────────────── Windows implementation ─────────────────────────────

/// Capture the current foreground window as a paste target.
/// `our_hwnds` are SpeakEasy's own window handles — we refuse to lock onto them.
/// Returns `None` if there is no foreground window or it belongs to us.
#[cfg(target_os = "windows")]
pub fn capture_foreground(our_hwnds: &[isize]) -> Option<TargetWindow> {
    use windows::Win32::UI::WindowsAndMessaging::{
        GetForegroundWindow, GetGUIThreadInfo, GetWindowTextW, GetWindowThreadProcessId,
        GUITHREADINFO,
    };

    unsafe {
        let fg = GetForegroundWindow();
        if fg.0.is_null() {
            return None;
        }
        let hwnd_val = fg.0 as isize;
        if our_hwnds.contains(&hwnd_val) {
            // Don't lock onto SpeakEasy's own window/overlay.
            return None;
        }

        // Focused child control (valid here because `fg` IS the foreground window).
        let tid = GetWindowThreadProcessId(fg, None);
        let mut gui = GUITHREADINFO {
            cbSize: std::mem::size_of::<GUITHREADINFO>() as u32,
            ..Default::default()
        };
        let focus_hwnd = if GetGUIThreadInfo(tid, &mut gui).is_ok() {
            gui.hwndFocus.0 as isize
        } else {
            0
        };

        // Window title (fall back to a placeholder if empty/titleless).
        let mut buf = [0u16; 512];
        let len = GetWindowTextW(fg, &mut buf);
        let mut title = if len > 0 {
            String::from_utf16_lossy(&buf[..len as usize])
        } else {
            String::new()
        };
        if title.trim().is_empty() {
            title = "(window)".to_string();
        }

        Some(TargetWindow {
            hwnd: hwnd_val,
            focus_hwnd,
            title,
        })
    }
}

/// Force `hwnd` to the foreground and focus the captured control.
/// Returns `true` ONLY if the target actually became the foreground window —
/// the caller MUST NOT paste when this returns `false`.
#[cfg(target_os = "windows")]
pub fn focus_window_robust(hwnd_val: isize, focus_val: isize) -> bool {
    use std::ffi::c_void;
    use windows::Win32::Foundation::{BOOL, HWND};
    use windows::Win32::System::Threading::{AttachThreadInput, GetCurrentThreadId};
    use windows::Win32::UI::Input::KeyboardAndMouse::SetFocus;
    use windows::Win32::UI::WindowsAndMessaging::{
        BringWindowToTop, GetForegroundWindow, GetWindowThreadProcessId, IsIconic, IsWindow,
        SetForegroundWindow, ShowWindow, SystemParametersInfoW, SPIF_SENDCHANGE,
        SPI_GETFOREGROUNDLOCKTIMEOUT, SPI_SETFOREGROUNDLOCKTIMEOUT, SW_RESTORE,
        SYSTEM_PARAMETERS_INFO_UPDATE_FLAGS,
    };

    unsafe {
        let hwnd = HWND(hwnd_val as *mut c_void);

        // Guard against a stale/closed handle (could otherwise activate a recycled HWND).
        if !IsWindow(hwnd).as_bool() {
            return false;
        }

        // Save then zero the foreground-lock timeout so SetForegroundWindow is allowed.
        let mut old_timeout: u32 = 0;
        let _ = SystemParametersInfoW(
            SPI_GETFOREGROUNDLOCKTIMEOUT,
            0,
            Some(&mut old_timeout as *mut u32 as *mut c_void),
            SYSTEM_PARAMETERS_INFO_UPDATE_FLAGS(0),
        );
        let _ = SystemParametersInfoW(
            SPI_SETFOREGROUNDLOCKTIMEOUT,
            0,
            None,
            SPIF_SENDCHANGE,
        );

        // Attach our input thread to the current foreground thread (secondary aid).
        let fg = GetForegroundWindow();
        let fg_tid = GetWindowThreadProcessId(fg, None);
        let our_tid = GetCurrentThreadId();
        let attached =
            fg_tid != 0 && fg_tid != our_tid && AttachThreadInput(our_tid, fg_tid, BOOL(1)).as_bool();

        if IsIconic(hwnd).as_bool() {
            let _ = ShowWindow(hwnd, SW_RESTORE);
        }
        let _ = BringWindowToTop(hwnd);
        let _ = SetForegroundWindow(hwnd);

        if focus_val != 0 {
            let fhwnd = HWND(focus_val as *mut c_void);
            if IsWindow(fhwnd).as_bool() {
                let _ = SetFocus(fhwnd);
            }
        }

        if attached {
            let _ = AttachThreadInput(our_tid, fg_tid, BOOL(0));
        }

        // Restore the previous foreground-lock timeout.
        let _ = SystemParametersInfoW(
            SPI_SETFOREGROUNDLOCKTIMEOUT,
            0,
            Some(old_timeout as usize as *mut c_void),
            SPIF_SENDCHANGE,
        );

        // The ONLY trustworthy success signal.
        GetForegroundWindow().0 as isize == hwnd_val
    }
}

/// True if `hwnd_val` is the current foreground window (used to re-verify
/// immediately before paste/Enter, in case the user clicked away).
#[cfg(target_os = "windows")]
pub fn is_foreground(hwnd_val: isize) -> bool {
    use windows::Win32::UI::WindowsAndMessaging::GetForegroundWindow;
    unsafe { GetForegroundWindow().0 as isize == hwnd_val }
}

/// Simulate a single Enter keypress (mirrors the SendInput idiom in clipboard.rs).
#[cfg(target_os = "windows")]
pub fn simulate_enter() {
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYBD_EVENT_FLAGS, KEYEVENTF_KEYUP,
        VK_RETURN,
    };

    unsafe {
        let down = INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VK_RETURN,
                    wScan: 0,
                    dwFlags: KEYBD_EVENT_FLAGS(0),
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };
        let up = INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VK_RETURN,
                    wScan: 0,
                    dwFlags: KEYEVENTF_KEYUP,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };
        SendInput(&[down], std::mem::size_of::<INPUT>() as i32);
        std::thread::sleep(std::time::Duration::from_millis(20));
        SendInput(&[up], std::mem::size_of::<INPUT>() as i32);
    }
}

// ───────────────────────────── Non-Windows stubs ─────────────────────────────

#[cfg(not(target_os = "windows"))]
pub fn capture_foreground(_our_hwnds: &[isize]) -> Option<TargetWindow> {
    None
}

#[cfg(not(target_os = "windows"))]
pub fn focus_window_robust(_hwnd_val: isize, _focus_val: isize) -> bool {
    false
}

#[cfg(not(target_os = "windows"))]
pub fn is_foreground(_hwnd_val: isize) -> bool {
    false
}

#[cfg(not(target_os = "windows"))]
pub fn simulate_enter() {}
