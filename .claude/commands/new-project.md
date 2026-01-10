# /new-project - Create New Project from High Level Vibing

Create a new project folder with the High Level Vibing framework files.

## When to Use
- Starting a brand new project
- Must be run from the High Level Vibing workspace (the factory)

## Workflow

### Step 1: Get Project Name
Ask the user:
```
What's the project name?
```

Wait for response. The name will be used to create the folder.

### Step 2: Get Brief Description (Optional)
Ask the user:
```
Brief description of the project? (optional - press Enter to skip)
```

If provided, this will be saved as `project-brief.md` in the new project.

### Step 3: Create Project Structure

Execute these operations:

1. **Create the project folder:**
   ```
   D:\Claude CODE\<ProjectName>\
   ```

2. **Copy FRAMEWORK files from High Level Vibing:**

   **COPY these (framework core):**
   ```
   .claude/                    → Full folder (settings, skills, manifest)
   CHEAT-SHEET.md             → Reference document
   docs/_*.md                  → Template files (skill generation, freshness check)
   ```

   **DO NOT copy (project-specific to High Level Vibing):**
   ```
   docs/srs/*.md              → Each project creates its own SRS
   docs/workflow-*.md         → Each project has its own log
   docs/lessons-learned/      → Each project has its own (folder)
   START HERE/                → Only needed in High Level Vibing
   Any source code files      → Each project builds its own
   ```

3. **Create empty docs structure:**
   ```
   D:\Claude CODE\<ProjectName>\docs\
   D:\Claude CODE\<ProjectName>\docs\srs\
   ```

4. **Verify skills/project/ folder exists:**
   ```
   D:\Claude CODE\<ProjectName>\.claude\skills\project\
   ```
   This folder is for project-specific skills that will NEVER be synced.

5. **Create workflow development log:**
   ```markdown
   # Workflow Development Log

   > Project: <ProjectName>
   > Created: <timestamp>
   > Framework: High Level Vibing v2.0.0

   ---

   ## Sessions

   [Sessions will be logged here by /wrapup]
   ```
   Save to: `D:\Claude CODE\<ProjectName>\docs\workflow-development-log.md`

6. **Initialize git repository:**
   ```bash
   cd D:\Claude CODE\<ProjectName>
   git init
   git add .
   git commit -m "Initial project setup

   Created with High Level Vibing framework v2.0.0

   🤖 Generated with Claude Code"
   ```

**Why this split?**
- Framework files = reusable across ALL projects (synced via `/system-upgrade-pull`)
- Template files (`docs/_*.md`) = reference docs needed by skill generation commands
- Project files = unique to each project, created fresh each time
- `skills/project/` = sacred folder for project-specific skills (never overwritten)
- `settings.json` = project-specific MCP permissions (never overwritten by sync)
- `settings.local.json` = additional project-specific overrides (never overwritten)

7. **If description provided, create project-brief.md:**
   ```markdown
   # <ProjectName>

   ## Description
   <user's description>

   ## Created
   <current date>

   ## Next Steps
   1. Run /initial-setup-step1-srs-creation to create the SRS
   2. Follow the 4-step workflow to completion
   3. Begin building!
   ```

### Step 4: Output Success Message

Display:
```
✓ Created D:\Claude CODE\<ProjectName>\
✓ Copied .claude folder (settings + skills + manifest)
✓ Copied template files (docs/_SKILL-GENERATION-PROMPT.md, etc.)
✓ Created docs/ structure
✓ Created skills/project/ folder (for project-specific skills)
✓ Created workflow-development-log.md
✓ Initialized git repository
✓ Saved project-brief.md (if description provided)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEXT STEPS:

1. Open the new project in VS Code:
   File → Open Folder → D:\Claude CODE\<ProjectName>

2. Run the SRS creation workflow:
   /initial-setup-step1-srs-creation

3. Follow the 4-step setup process

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Important Notes

- This skill should ONLY be run from High Level Vibing workspace
- User skills (slash commands) are at user level and will work automatically in the new project
- Project skills (tech docs) are copied with the .claude folder
- The user must manually switch workspaces after creation

## Example Interaction

```
User: /new-project

AI: What's the project name?

User: Command Center

AI: Brief description of the project? (optional - press Enter to skip)

User: AI-powered dashboard with chat interface for managing Meta Ads, Gmail, Calendar, and ClickUp

AI: ✓ Created D:\Claude CODE\Command Center\
    ✓ Copied .claude folder (settings + skills + manifest)
    ✓ Copied template files (docs/_SKILL-GENERATION-PROMPT.md, etc.)
    ✓ Created docs/ structure
    ✓ Created skills/project/ folder (for project-specific skills)
    ✓ Created workflow-development-log.md
    ✓ Initialized git repository
    ✓ Saved project-brief.md

    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    NEXT STEPS:

    1. Open the new project in VS Code:
       File → Open Folder → D:\Claude CODE\Command Center

    2. Run the SRS creation workflow:
       /initial-setup-step1-srs-creation

    3. Follow the 4-step setup process

    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Error Handling

- If folder already exists: Ask user if they want to overwrite or choose different name
- If not in High Level Vibing: Warn user and suggest switching workspaces
- If copy fails: Report specific error and suggest manual copy
