# /initial-setup-step2-srs-analyze-and-skills - SRS Analysis & Skills Generation

Comprehensive analysis of the SRS document followed by automatic generation of technology skills. This step validates the SRS (12 quality gates) and then creates Claude Code skills for identified technologies. This is Step 2 of the project setup workflow.

## Usage

```
/initial-setup-step2-srs-analyze-and-skills [path/to/srs.md]
```

If no path is provided, search for `docs/srs/SRS*.md` or SRS files in the current directory.

## What This Step Does

This is a combined step that:
1. **Analyzes the SRS** through 17 comprehensive analysis steps with 12 quality gates
2. **Generates technology skills** for each technology identified in the SRS

By combining analysis and skills generation, we eliminate a manual handoff and ensure skills are always generated immediately after SRS validation.

## Prerequisites

1. `/initial-setup-step1-srs-creation` completed
2. SRS document available

---

# PART 1: SRS ANALYSIS

## Process Overview

This command performs 17 comprehensive analysis steps with 12 quality gates. The steps are ordered to catch **blocking issues early** before investing time in detailed analysis.

**Step Order Rationale:**
1. First, validate structure and language quality (Steps 1-3)
2. Then, verify platform/technology feasibility (Step 4) - catches fundamental blockers
3. **If blockers found:** Interactive resolution loop (Step 4.7) until resolved
4. Only then, perform detailed requirement analysis (Steps 5-14)
5. Generate report (Steps 15-16)
6. **Apply recommendations interactively (Step 17)** - auto-fix objective gaps, ask about subjective decisions

---

## Step 1: Load and Parse the SRS Document

1. Read the SRS file specified in $ARGUMENTS (or find it in `docs/srs/`)
2. Identify the document structure and sections
3. Create output in same location as SRS: `docs/srs/`
4. Create working analysis document at `docs/srs/analysis-report.md`

---

## Step 2: Structure Validation (IEEE 830-1993)

Check for required sections and rate completeness:

**Required Sections Checklist:**
- [ ] **Introduction** (Purpose, scope, definitions, references, overview)
- [ ] **Overall Description** (Product perspective, features, user characteristics, constraints, assumptions)
- [ ] **Specific Requirements** (Functional, Non-functional, Interface, System)
- [ ] **Appendices** (optional but recommended)

**Scoring:**
- Each main section present: +10 points
- Each subsection present: +5 points
- Grade: A (90+), B (80-89), C (70-79), D (60-69), F (<60)

---

## Step 3: Ambiguous Language Detection (STRICT MODE)

⛔ **CRITICAL: This is a BLOCKING gate. ANY ambiguous language results in Grade F.**

**REQUIRED: Use Grep to systematically search for each flagged term pattern:**

```
1. Grep: "user-friendly|easy to use|intuitive"
2. Grep: "fast|quick|responsive|efficient"
3. Grep: "flexible|scalable|robust"
4. Grep: "as needed|if necessary|when appropriate"
5. Grep: "etc\.|and so on|and more"
6. Grep: "some|several|many|few"
7. Grep: "usually|generally|typically"
8. Grep: "may|might|could"
9. Grep: "simple|straightforward|obvious"
10. Grep: "adequate|sufficient|reasonable"
11. Grep: "minimal|maximum|optimal"
12. Grep: "soon|later|eventually"
```

For EACH match found, document with line number, context, and recommended fix.

---

## Step 4: Technology Risk Research (BLOCKING)

⛔ **CRITICAL: This step catches fundamental platform/technology blockers BEFORE detailed requirement analysis.**

⚠️ **REQUIRED: Perform web searches to verify each technology mentioned in the SRS.**

### 4.1-4.6: Research and Validation
- Platform Compatibility Check
- Third-Party Service Health Check
- Version Pinning Audit
- Assumption Validation
- Dependency Chain Analysis
- Technology Risk Summary

### 4.7: Blocker Resolution Flow (INTERACTIVE)

When a blocking issue is found, STOP and:
1. Present blocker details with evidence
2. Research and present alternatives
3. Open interactive discussion with user
4. Update the SAME SRS file after decision
5. Re-run analysis until all blockers pass

---

## Steps 5-14: Detailed Analysis

- **Step 5:** Measurability Audit
- **Step 6:** Gap Analysis Checklist
- **Step 7:** User Journey Validation
- **Step 8:** Cross-Requirement Consistency Check
- **Step 9:** Security Threat Modeling (STRIDE)
- **Step 10:** Data Flow Validation
- **Step 11:** Testability Audit
- **Step 12:** Implementation Dependency Graph
- **Step 13:** Regulatory/Compliance Check
- **Step 14:** Documentation Completeness & Performance Validation

---

## Step 15: Generate Quality Gates Summary

12 quality gates with BLOCKING and IMPORTANT categories:

**BLOCKING GATES (Must Pass):**
1. Ambiguous Language (STRICT)
2. Platform Compatibility
3. Security Threats
4. Regulatory Compliance

**IMPORTANT GATES (Should Pass):**
5-12. Measurability, Technology Risk, Dependency Health, User Journey, Consistency, Testability, Documentation, Performance

---

## Step 16: Generate Analysis Report

Create comprehensive report at `docs/srs/analysis-report.md` with all findings.

---

## Step 17: Apply Recommendations (INTERACTIVE)

- **OBJECTIVE** fixes: Auto-apply without asking
- **SUBJECTIVE** decisions: Ask user with options
- **INFORMATIONAL** notes: Add to "Known Considerations" section

Update SRS status to "Validated - Ready for Implementation" when complete.

---

# PART 2: SKILLS GENERATION

After SRS analysis passes all blocking gates, automatically proceed to skills generation.

## Step 18: Extract Technologies from SRS

Read the validated SRS and identify all technologies mentioned:

```
Technologies Found:
- Frontend: [Framework] v[Version]
- Backend: [Framework] v[Version]
- Database: [Type]
- APIs: [List]
- Libraries: [List]
```

---

## Step 19: Check Existing Skills

For each technology, check:
1. Central skills repo: `D:\Claude CODE\claude-skills\[technology]/`
2. Project skills location: `.claude/skills/[technology]/`

---

## Step 20: Freshness Check

For existing skills, read frontmatter and web search for current version:

| Scenario | Status | Action |
|----------|--------|--------|
| Skill version = Current version | CURRENT | Use as-is |
| Minor version behind | MINOR UPDATE | Flag for user |
| Major version behind | OUTDATED | Regenerate |
| `last_verified` > 90 days ago | STALE | Re-verify |
| No version header | LEGACY | Regenerate |

---

## Step 21: Report Skills Status

```markdown
## Technology Skills Status

| Technology | Location | Skill Ver | Current Ver | Status | Action |
|------------|----------|-----------|-------------|--------|--------|
| Next.js | central | 16.1 | 16.1 | CURRENT | Pull |
| Supabase | central | 2.85.0 | 2.89.0 | MINOR | Flag |
| Tailwind | - | - | 4.1.18 | MISSING | Generate |

### Action Plan:
1. Pull from central: Next.js, Supabase
2. Generate new: Tailwind

Proceed? [Waiting for confirmation]
```

---

## Step 22: Pull/Generate Skills

**For skills in central repo:**
- Pull from `D:\Claude CODE\claude-skills\` using `/skills-pull` logic

**For missing skills:**
- Use the skill generation prompt from `docs/_SKILL-GENERATION-PROMPT.md`
- Output 4 files per skill: SKILL.md, patterns.md, troubleshooting.md, reference.md
- Save to `.claude/skills/[technology-name]/`

---

## Step 23: Skills Review

```markdown
## Skills Ready for Review

Skills in `.claude/skills/`:
- next-js/ (pulled from central)
- supabase/ (pulled from central)
- tailwind/ (generated, v4.1.18)

Please review generated skills for accuracy.
When satisfied, proceed to Step 3.

Ready to continue? [Waiting for confirmation]
```

---

## Output

**From Analysis:**
1. Analysis Report: `docs/srs/analysis-report.md`
2. Updated SRS with fixes applied

**From Skills:**
3. Technology skills in `.claude/skills/[technology]/`
4. Skills status report

---

## Quality Checklist

Before completing:
- [ ] Read the entire SRS document
- [ ] Executed ALL analysis steps
- [ ] All 12 quality gates evaluated
- [ ] Recommendations applied interactively
- [ ] Technologies extracted from SRS
- [ ] Existing skills checked for freshness
- [ ] Missing/outdated skills generated
- [ ] User confirmed skill generation

---

## Next Step

After completing this command:
→ Run `/initial-setup-step3-checkpoint-and-build-order` to verify structure and generate work queue
