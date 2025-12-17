//! Windows-specific window subclassing for enforcing always-on-top behavior.
//!
//! This module uses Win32 API window subclassing to intercept WM_WINDOWPOSCHANGING messages
//! and force HWND_TOPMOST z-order. This is more reliable than simply setting alwaysOnTop
//! because it prevents OTHER applications from overriding our z-order.
//!
//! Reference: https://github.com/tauri-apps/tauri/issues/5656

use anyhow::Result;

/// Unique identifier for our subclass (can be any non-zero value)
const SUBCLASS_ID: usize = 1;

/// Apply topmost enforcement subclass to a Tauri window.
/// This intercepts z-order changes and forces the window to stay topmost.
#[cfg(target_os = "windows")]
pub fn apply_topmost_subclass(window: &tauri::WebviewWindow) -> Result<()> {
    use raw_window_handle::{HasWindowHandle, RawWindowHandle};
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::Shell::SetWindowSubclass;

    // Get the raw window handle
    let handle = window
        .window_handle()
        .map_err(|e| anyhow::anyhow!("Failed to get window handle: {}", e))?;

    let hwnd = match handle.as_raw() {
        RawWindowHandle::Win32(win32_handle) => {
            HWND(win32_handle.hwnd.get() as *mut std::ffi::c_void)
        }
        _ => return Err(anyhow::anyhow!("Not a Win32 window")),
    };

    unsafe {
        // Install our subclass procedure
        let result = SetWindowSubclass(hwnd, Some(topmost_subclass_proc), SUBCLASS_ID, 0);

        if result.as_bool() {
            log::info!(
                "[window_topmost] Successfully applied topmost subclass to window {:?}",
                hwnd
            );
            Ok(())
        } else {
            Err(anyhow::anyhow!("SetWindowSubclass failed"))
        }
    }
}

/// Remove the topmost enforcement subclass from a Tauri window.
#[cfg(target_os = "windows")]
pub fn remove_topmost_subclass(window: &tauri::WebviewWindow) -> Result<()> {
    use raw_window_handle::{HasWindowHandle, RawWindowHandle};
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::Shell::RemoveWindowSubclass;

    let handle = window
        .window_handle()
        .map_err(|e| anyhow::anyhow!("Failed to get window handle: {}", e))?;

    let hwnd = match handle.as_raw() {
        RawWindowHandle::Win32(win32_handle) => {
            HWND(win32_handle.hwnd.get() as *mut std::ffi::c_void)
        }
        _ => return Err(anyhow::anyhow!("Not a Win32 window")),
    };

    unsafe {
        let result = RemoveWindowSubclass(hwnd, Some(topmost_subclass_proc), SUBCLASS_ID);

        if result.as_bool() {
            log::info!(
                "[window_topmost] Successfully removed topmost subclass from window {:?}",
                hwnd
            );
            Ok(())
        } else {
            // Not an error if subclass wasn't installed
            log::warn!(
                "[window_topmost] RemoveWindowSubclass returned false for {:?}",
                hwnd
            );
            Ok(())
        }
    }
}

/// The subclass procedure that intercepts window messages.
/// When WM_WINDOWPOSCHANGING is received, we modify the WINDOWPOS structure
/// to force HWND_TOPMOST z-order.
#[cfg(target_os = "windows")]
unsafe extern "system" fn topmost_subclass_proc(
    hwnd: windows::Win32::Foundation::HWND,
    msg: u32,
    wparam: windows::Win32::Foundation::WPARAM,
    lparam: windows::Win32::Foundation::LPARAM,
    _uidsubclass: usize,
    _dwrefdata: usize,
) -> windows::Win32::Foundation::LRESULT {
    use windows::Win32::UI::Shell::DefSubclassProc;
    use windows::Win32::UI::WindowsAndMessaging::{
        HWND_TOPMOST, SWP_NOZORDER, WINDOWPOS, WM_WINDOWPOSCHANGING,
    };

    if msg == WM_WINDOWPOSCHANGING {
        let pos = lparam.0 as *mut WINDOWPOS;
        if !pos.is_null() {
            // Force the window to stay at HWND_TOPMOST z-order
            (*pos).hwndInsertAfter = HWND_TOPMOST;

            // Clear SWP_NOZORDER flag to ensure our z-order change takes effect
            (*pos).flags = windows::Win32::UI::WindowsAndMessaging::SET_WINDOW_POS_FLAGS(
                (*pos).flags.0 & !SWP_NOZORDER.0,
            );

            log::trace!("[window_topmost] Intercepted WM_WINDOWPOSCHANGING, forcing HWND_TOPMOST");
        }
    }

    // Call the next handler in the chain
    DefSubclassProc(hwnd, msg, wparam, lparam)
}

/// No-op on non-Windows platforms
#[cfg(not(target_os = "windows"))]
pub fn apply_topmost_subclass(_window: &tauri::WebviewWindow) -> Result<()> {
    Ok(())
}

/// No-op on non-Windows platforms
#[cfg(not(target_os = "windows"))]
pub fn remove_topmost_subclass(_window: &tauri::WebviewWindow) -> Result<()> {
    Ok(())
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_subclass_id_nonzero() {
        assert_ne!(super::SUBCLASS_ID, 0);
    }
}
