# Wrap Up Session

You are completing a development session. Your job is to wrap up by:

1. Summarize what was done in this chat session
2. Run the wrapup command with appropriate arguments
3. Report the result to the user

## Review the Chat

Analyze what was accomplished:
- What was the user's goal or problem?
- What changes were made to the codebase?
- Were there any problems encountered? How were they solved?
- What area of the codebase was affected?

## Run the Wrapup Command

**IMPORTANT:** First ensure you are in the project root directory, then execute:

```bash
npm run wrapup -- --area "<AREA>" --title "<SHORT-TITLE>" --summary "<SUMMARY>" [--problem "<PROBLEM>"] [--fix "<FIX>"]
```

**Required Arguments:**
- --area: frontend, backend, tauri, devops, bugfix, feature, refactor, or docs
- --title: Short kebab-case title (e.g., fix-settings-lint-error)
- --summary: One sentence describing what was done

**Optional Arguments:**
- --problem: What went wrong (only if something broke)
- --fix: How it was solved (only if there was a problem)

**Flags (use when appropriate):**
- --skip-gates: Skip lint/typecheck/build (use for quick documentation-only changes)
- --skip-secrets: Skip secret scan
- --no-git: Don't commit changes

## Examples

Bug fix:
```bash
npm run wrapup -- --area "bugfix" --title "fix-settings-lint-error" --summary "Fixed ESLint warning in SettingsPanel useEffect hook" --problem "ESLint warning about missing dependency" --fix "Added fetchModelsForProvider to dependency array"
```

Feature work:
```bash
npm run wrapup -- --area "frontend" --title "add-dark-mode" --summary "Added dark mode toggle to settings panel with theme persistence"
```

## Report Results

After running, tell the user:
- Whether wrapup succeeded or failed
- The lessons-learned file that was created
- Any warnings or issues encountered

