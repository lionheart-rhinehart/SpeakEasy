# /initial-setup-step3-checkpoint-and-build-order - Final Verification & Build Queue

Create project structure, verify all prerequisites, and generate the build order queue. This is the final checkpoint before development begins. This is Step 3 of the project setup workflow.

## Usage

```
/initial-setup-step3-checkpoint-and-build-order [--force]
```

Use `--force` to overwrite existing files (use with caution).

## What This Step Does

This combined step:
1. **Creates project structure** based on tech stack from SRS
2. **Verifies all prerequisites** are in place
3. **Generates build order** from SRS features for parallel development

## Prerequisites

1. `/initial-setup-step2-srs-analyze-and-skills` completed and passed
2. SRS document validated with all gates passing
3. Technology skills generated

---

# PART 1: PROJECT STRUCTURE & VERIFICATION

## Step 1: SRS-Driven Analysis

Read and extract from SRS:

**Technology Extraction:**
```
Tech Stack:
- Frontend: [Framework] + [Language]
- Backend: [Framework] + [Language]
- Database: [Type]
- Testing: [Frameworks]
- DevOps: [Tools]
```

**Architecture Pattern & Project Type**

---

## Step 2: Generate Folder Structure

Based on extracted tech stack, create appropriate structure:

**For React/Next.js Frontend:**
```
src/
├── app/                 # Next.js App Router
├── components/
│   ├── ui/
│   ├── forms/
│   └── layouts/
├── hooks/
├── lib/
├── services/
├── stores/
├── types/
└── styles/
```

**For Python/Node.js Backend:** (similar patterns)

**Common Directories (all projects):**
```
project-root/
├── .claude/
│   ├── settings.json
│   ├── skills/
│   └── rules/
├── docs/
│   ├── srs/
│   ├── features/
│   ├── architecture/
│   └── workflow-development-log.md
├── CLAUDE.md
├── README.md
└── .gitignore
```

---

## Step 3: Generate CLAUDE.md

Create project-specific CLAUDE.md with:
- Overview from SRS
- Tech stack
- Quick start commands
- Project structure
- Development guidelines
- Architecture overview
- Features list
- Security requirements
- Environment variables

---

## Step 4: Generate Settings & Hooks

Create `.claude/settings.json` with:
- Permission deny rules for secrets
- Allow rules for common commands
- Hooks for formatters/linters based on tech stack

---

## Step 5: Generate Project Rules

Create `.claude/rules/` with:
- `code-style.md` - Language-specific rules
- `testing.md` - Testing requirements from SRS
- `security.md` - Security requirements from SRS

---

## Step 6: Generate Standard Files

- **.gitignore** - Based on tech stack
- **README.md** - Project documentation
- **.env.example** - Environment variable template

---

## Step 7: Verification Checklist

Before proceeding to build order, verify:

**SRS Ready:**
- [ ] `docs/srs/SRS-*.md` exists
- [ ] `docs/srs/analysis-report.md` shows all gates PASS
- [ ] No blocking issues remain

**Skills Ready:**
- [ ] `.claude/skills/` contains technology skills
- [ ] All SRS technologies have corresponding skills

**Project Structure Ready:**
- [ ] `CLAUDE.md` exists and customized
- [ ] `.claude/settings.json` configured
- [ ] `.claude/rules/` contains project rules
- [ ] `docs/workflow-development-log.md` exists

**Build Environment Ready:**
- [ ] `.gitignore` covers tech stack
- [ ] `.env.example` lists required variables
- [ ] `README.md` has getting started instructions

---

# PART 2: BUILD ORDER GENERATION

After verification passes, automatically generate the build order.

## Step 8: Read SRS Features

Parse the SRS document for features:

```markdown
Looking for:
- Feature IDs (F-001, F-002, etc.)
- Feature names
- Dependencies (e.g., "Depends on: F-001")
- Priority indicators
```

---

## Step 9: Build Dependency Graph

Create a directed graph of feature dependencies:

```
F-001 (Auth) ──┬──> F-002 (Profile)
               └──> F-005 (Dashboard)

F-003 (Catalog) ───> F-004 (Cart) ───> F-006 (Checkout)
```

**Detect Issues:**
- Circular dependencies (error)
- Missing dependencies (warning)
- Orphan features (info)

---

## Step 10: Topological Sort

Order features so dependencies come first:

**Priority Tiebreaker:**
1. Explicit priority in SRS (High > Medium > Low)
2. Number of dependents (more dependents = earlier)
3. Feature ID (F-001 before F-002)

---

## Step 11: Generate Build Order File

Create `docs/build-order.md`:

```markdown
# Build Order

Generated: [Timestamp]
Total Features: X

## Queue

| # | ID | Feature | Status | Worker | Dependencies | Updated |
|---|-----|---------|--------|--------|--------------|---------|
| 1 | F-001 | User Authentication | pending | - | none | - |
| 2 | F-003 | Product Catalog | pending | - | none | - |
| 3 | F-002 | User Profile | pending | - | F-001 | - |

## Status Key
- `pending` - Available for claiming
- `in-progress` - Being built
- `completed` - Done
- `blocked` - Dependencies not complete

## Dependency Graph
[Visual representation]
```

---

## Step 12: Display Summary

```
═══════════════════════════════════════════════════════════════
              CHECKPOINT COMPLETE & BUILD ORDER READY
═══════════════════════════════════════════════════════════════

## Project Structure Created

├── .claude/
│   ├── settings.json          ✓
│   └── rules/                 ✓
├── docs/
│   ├── srs/                   ✓
│   ├── features/              ✓
│   └── workflow-development-log.md  ✓
├── CLAUDE.md                  ✓
├── README.md                  ✓
└── .gitignore                 ✓

## Verification Status

SRS Ready:           ✓ PASS
Skills Ready:        ✓ PASS
Structure Ready:     ✓ PASS
Environment Ready:   ✓ PASS

## Build Order Generated

Source: docs/srs/SRS-MyProject.md
Output: docs/build-order.md

QUEUE SUMMARY:
┌─────┬───────┬─────────────────────┬──────────────┐
│  #  │  ID   │ Feature             │ Dependencies │
├─────┼───────┼─────────────────────┼──────────────┤
│  1  │ F-001 │ User Authentication │ none         │
│  2  │ F-003 │ Product Catalog     │ none         │
│  3  │ F-002 │ User Profile        │ F-001        │
└─────┴───────┴─────────────────────┴──────────────┘

READY TO CLAIM (no dependencies):
├── F-001 User Authentication
└── F-003 Product Catalog

═══════════════════════════════════════════════════════════════
Ready for development!

Next: /initial-setup-step4-project-start
═══════════════════════════════════════════════════════════════
```

---

## Output

**From Checkpoint:**
1. Complete folder structure
2. CLAUDE.md customized
3. Settings and rules
4. README.md and .gitignore
5. workflow-development-log.md

**From Build Order:**
6. `docs/build-order.md` - Work queue for parallel development

---

## Error Handling

**Circular Dependency Detected:**
```
ERROR: Circular dependency detected
F-002 → F-004 → F-006 → F-002

Fix the SRS to remove circular dependencies.
```

**Missing Features:**
```
ERROR: No features found in SRS

Expected format:
### F-001: Feature Name
**Dependencies:** None or F-XXX
```

**Previous Steps Incomplete:**
```
ERROR: Prerequisites not met

Missing:
- SRS analysis report not found
- Skills not generated

Run /initial-setup-step2-srs-analyze-and-skills first.
```

---

## Quality Checklist

Before completing:
- [ ] Folder structure matches tech stack
- [ ] CLAUDE.md has all project-specific info
- [ ] Settings have appropriate formatters/linters
- [ ] Rules reflect SRS requirements
- [ ] workflow-development-log.md created
- [ ] SRS parsed successfully
- [ ] All features extracted with IDs
- [ ] Dependencies validated
- [ ] Build order file created

---

## Next Step

After completing this command:
→ Run `/initial-setup-step4-project-start` to begin implementing features
