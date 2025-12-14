---
name: Fix Tauri Build Cargo Error
overview: Fix the Tauri build error by ensuring Rust/Cargo is properly installed and accessible in the PATH. The error indicates that `cargo` command is not found when running `npm run tauri:build`.
todos: []
---

# Fix Tauri Build Cargo Error

## Problem

The `npm run tauri:build` command is failing because the `cargo` command is not found. Tauri requires Rust and Cargo to build the native application.

## Solution Steps
{"message":"Workflow was started"}
- On Windows, this typically installs to `%USERPROFILE%\.cargo\bin`
- The installer should automatically add Cargo to PATH

### 3. Verify PATH Configuration

- Ensure `%USERPROFILE%\.cargo\bin` is in the system PATH
- May need to restart PowerShell/terminal after installation
- Can verify with `$env:PATH -split ';' | Select-String cargo`

### 4. Retry Build

- Once Cargo is accessible, run `npm run tauri:build` again
- The build should proceed with Rust compilation

## Alternative: Check Existing Installation

If Rust was previously installed but not in PATH:

- Locate the Cargo installation directory
- Add it to PATH manually or restart terminal
- Verify with `cargo --version`

## Files Involved

- No code changes needed - this is an environment setup issue
- The Tauri project structure in `src-tauri/` is already correct