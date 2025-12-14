@echo off
REM Wrap-up: One-command end-of-task workflow
REM Double-click this file or run from terminal

cd /d "%~dp0"
npm run wrapup %*
pause
