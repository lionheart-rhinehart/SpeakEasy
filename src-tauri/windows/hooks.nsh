; NSIS installer hooks for SpeakEasy
; These hooks are executed during the installation process

!macro NSIS_HOOK_PREINSTALL
  ; Kill running SpeakEasy process so installer can overwrite files.
  ; Critical for auto-updates where the app triggers its own installer
  ; while still running — without this, the installer silently fails
  ; because the exe is locked by the running process.
  nsExec::ExecToLog 'taskkill /F /IM speakeasy.exe'
  nsExec::ExecToLog 'taskkill /F /IM SpeakEasy.exe'
  ; Brief delay to ensure process is fully terminated and file handles released
  Sleep 1000
  ; Remove old desktop shortcut before installing new one
  Delete "$DESKTOP\SpeakEasy.lnk"
!macroend
