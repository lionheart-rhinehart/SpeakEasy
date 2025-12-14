---
name: Create wrapup slash command
overview: Create the `/wrapup` slash command file that instructs agents to automatically run the end-of-task workflow with appropriate arguments based on what was done in the chat session.
todos: []
---

# Create Wrapup Slash Command

## Current Status

All core functionality is complete and tested:

- [`scripts/wrapup.mjs`](scripts/wrapup.mjs) - fully automated, accepts CLI arguments
- [`package.json`](package.json) - has `wrapup` script
- [`wrapup.bat`](wrapup.bat) - Windows shortcut
- Lessons learned auto-generation working

## What Needs to Be Done

1. **Rename temp API key file** - Rename `openai-api-key.md` to `.temp-openai-key.md` so the secret scanner ignores it
2. **Update secret scanner** - Add logic to ignore files with `.temp` in the name (temporary/example files)
3. **Create slash command** - Create [`.cursor/prompts/wrapup.md`](.cursor/prompts/wrapup.md) WITHOUT `--skip-secrets` (secret scan should run by default)

## The Slash Command File

Will create [`.cursor/prompts/wrapup.md`](.cursor/prompts/wrapup.md) with instructions for agents to:

1. **Review the chat** - summarize what was accomplished
2. **Run the wrapup command** with these arguments:
   ```
   npm run wrapup -- --area "<area>" --title "<title>" --summary "<summary>" --problem "<problem>" --fix "<fix>"
   ```

3. **Report results** - tell you what lessons-learned file was created

## Key Instructions for Agents

The slash command will tell agents:

- **Secret scan runs by default** (catches accidental commits of real secrets)
- **Infer the area** from context (frontend, backend, tauri, devops, bugfix, etc.)
- **Create a short title** from what was done
- **Summarize the work** in one sentence
- **Include problem/fix** only if something broke
- **Optional flags**: `--skip-gates`, `--skip-secrets` (only if needed), `--no-git`, `--github-private`

## Example Usage

After you finish a chat session, you type:

```
/wrapup
```

The agent reads the prompt, reviews the chat, and runs:

```
npm run wrapup -- --area "frontend" --title "fix-settings-lint" --summary "Fixed ESLint warning in SettingsPanel useEffect hook"
```

(Secret scan runs automatically and fails if any real secrets are found)

Then reports back to you.

## Files to Change

1. Rename [`openai-api-key.md`](openai-api-key.md) → `.temp-openai-key.md`
2. Update [`scripts/wrapup.mjs`](scripts/wrapup.mjs) - Add `.temp` to ignored file patterns in secret scanner
3. Create [`.cursor/prompts/wrapup.md`](.cursor/prompts/wrapup.md) - The slash command (secret scan runs by default)