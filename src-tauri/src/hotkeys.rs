use anyhow::Result;
use rdev::{listen, Event, EventType, Key};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;

/// Parse a hotkey string like "Ctrl+Shift+Space" into keys
pub fn parse_hotkey(hotkey: &str) -> Vec<Key> {
    hotkey
        .split('+')
        .filter_map(|part| match part.trim().to_lowercase().as_str() {
            "ctrl" | "control" => Some(Key::ControlLeft),
            "shift" => Some(Key::ShiftLeft),
            "alt" => Some(Key::Alt),
            "space" => Some(Key::Space),
            "tab" => Some(Key::Tab),
            "enter" | "return" => Some(Key::Return),
            "escape" | "esc" => Some(Key::Escape),
            "backspace" => Some(Key::Backspace),
            "delete" | "del" => Some(Key::Delete),
            "home" => Some(Key::Home),
            "end" => Some(Key::End),
            "pageup" => Some(Key::PageUp),
            "pagedown" => Some(Key::PageDown),
            "up" => Some(Key::UpArrow),
            "down" => Some(Key::DownArrow),
            "left" => Some(Key::LeftArrow),
            "right" => Some(Key::RightArrow),
            "f1" => Some(Key::F1),
            "f2" => Some(Key::F2),
            "f3" => Some(Key::F3),
            "f4" => Some(Key::F4),
            "f5" => Some(Key::F5),
            "f6" => Some(Key::F6),
            "f7" => Some(Key::F7),
            "f8" => Some(Key::F8),
            "f9" => Some(Key::F9),
            "f10" => Some(Key::F10),
            "f11" => Some(Key::F11),
            "f12" => Some(Key::F12),
            "a" => Some(Key::KeyA),
            "b" => Some(Key::KeyB),
            "c" => Some(Key::KeyC),
            "d" => Some(Key::KeyD),
            "e" => Some(Key::KeyE),
            "f" => Some(Key::KeyF),
            "g" => Some(Key::KeyG),
            "h" => Some(Key::KeyH),
            "i" => Some(Key::KeyI),
            "j" => Some(Key::KeyJ),
            "k" => Some(Key::KeyK),
            "l" => Some(Key::KeyL),
            "m" => Some(Key::KeyM),
            "n" => Some(Key::KeyN),
            "o" => Some(Key::KeyO),
            "p" => Some(Key::KeyP),
            "q" => Some(Key::KeyQ),
            "r" => Some(Key::KeyR),
            "s" => Some(Key::KeyS),
            "t" => Some(Key::KeyT),
            "u" => Some(Key::KeyU),
            "v" => Some(Key::KeyV),
            "w" => Some(Key::KeyW),
            "x" => Some(Key::KeyX),
            "y" => Some(Key::KeyY),
            "z" => Some(Key::KeyZ),
            "0" => Some(Key::Num0),
            "1" => Some(Key::Num1),
            "2" => Some(Key::Num2),
            "3" => Some(Key::Num3),
            "4" => Some(Key::Num4),
            "5" => Some(Key::Num5),
            "6" => Some(Key::Num6),
            "7" => Some(Key::Num7),
            "8" => Some(Key::Num8),
            "9" => Some(Key::Num9),
            _ => None,
        })
        .collect()
}

/// Global hotkey listener state
pub struct HotkeyListener {
    running: Arc<AtomicBool>,
}

impl HotkeyListener {
    pub fn new() -> Self {
        Self {
            running: Arc::new(AtomicBool::new(false)),
        }
    }

    /// Start listening for global hotkeys
    pub fn start<F>(&self, hotkey: &str, callback: F) -> Result<()>
    where
        F: Fn() + Send + 'static,
    {
        let target_keys = parse_hotkey(hotkey);
        let running = self.running.clone();
        running.store(true, Ordering::SeqCst);

        let mut pressed_keys: Vec<Key> = Vec::new();

        thread::spawn(move || {
            let callback_fn = move |event: Event| {
                if !running.load(Ordering::SeqCst) {
                    return;
                }

                match event.event_type {
                    EventType::KeyPress(key) => {
                        if !pressed_keys.contains(&key) {
                            pressed_keys.push(key);
                        }

                        // Check if all target keys are pressed
                        if target_keys.iter().all(|k| pressed_keys.contains(k)) {
                            callback();
                        }
                    }
                    EventType::KeyRelease(key) => {
                        pressed_keys.retain(|k| k != &key);
                    }
                    _ => {}
                }
            };

            if let Err(e) = listen(callback_fn) {
                log::error!("Error listening for hotkeys: {:?}", e);
            }
        });

        Ok(())
    }

    /// Stop listening for hotkeys
    pub fn stop(&self) {
        self.running.store(false, Ordering::SeqCst);
    }
}

impl Default for HotkeyListener {
    fn default() -> Self {
        Self::new()
    }
}
