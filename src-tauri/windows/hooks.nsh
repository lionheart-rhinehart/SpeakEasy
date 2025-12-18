; NSIS installer hooks for SpeakEasy
; These hooks are executed during the installation process

!macro NSIS_HOOK_PREINSTALL
  ; Remove old desktop shortcut before installing new one
  ; This prevents duplicate shortcuts when reinstalling/updating
  ; The Delete command is a no-op if the file doesn't exist
  Delete "$DESKTOP\SpeakEasy.lnk"
!macroend
