# /initial-setup-step1-srs-creation - Guided SRS Creation from Idea to Specification

Transform your project idea into a complete, validation-ready Software Requirements Specification through guided brainstorming and progressive refinement. This is Step 1 of the project setup workflow.

## Usage

```
/initial-setup-step1-srs-creation [project-name]
/initial-setup-step1-srs-creation    # Prompts for project name
```

Run this command at the START of a new project, before any analysis or implementation.

## Process Overview

This command guides you through 5 stages:

| Stage | Purpose | Your Role |
|-------|---------|-----------|
| 1. BRAINSTORM | Pure idea capture | Talk freely about your vision |
| 2. DISCOVER | Fill gaps with questions | Answer what's asked |
| 3. VERIFY | Confirm understanding | Say "Yes, you understand" when accurate |
| 4. RESEARCH | Verify technical assumptions | Review findings, make decisions |
| 5. GENERATE | Create SRS document | Review final output |

**Output:** Complete SRS in IEEE 830 format, ready for Phase 1 validation.

---

## CRITICAL: Responsive Listening

**User feedback ALWAYS overrides stage sequence.**

If the user at ANY point:
- Says "go research this", "look this up", "search for..."
- Indicates you don't understand something: "you're missing...", "that's not how X works"
- Mentions a domain/technology you're unfamiliar with
- Expresses frustration that you're not listening

**IMMEDIATELY:**
1. **STOP** asking questions or following the stage script
2. **ACKNOWLEDGE** what they're asking for
3. **PERFORM WEB SEARCHES** on the requested topic
4. **RETURN** with findings before continuing

### Examples

❌ **Wrong:** User says "go research Facebook Ads Manager" → You ask another discovery question

✅ **Right:** User says "go research Facebook Ads Manager" → You immediately search and come back with campaign structure, API capabilities, rate limits, etc.

❌ **Wrong:** User says "you don't understand how ClickUp webhooks work" → You continue with your assumptions

✅ **Right:** User says "you don't understand how ClickUp webhooks work" → You search for ClickUp webhook documentation, understand the limitations, then update your understanding

### Why This Matters

The user knows their domain. If they're telling you to research something, they've identified a knowledge gap that will lead to a bad SRS. **Trust their judgment and act on it.**

---

## Stage 1: Brainstorm

### Opening

Say exactly this:

> "Tell me about what you're building."

Then **STOP** and let the user talk.

### Rules for This Stage

- **NO structure enforcement** - let ideas flow freely
- **NO interrupting** with clarifications or questions
- **NO requirements language** - this isn't documentation yet
- **ONLY listen** - use brief acknowledgments: "Got it", "Keep going", "What else?"
- **Capture everything** mentally: problem, users, features, success criteria, constraints, preferences
- **EXCEPTION:** If user says "go research X" or indicates you need domain knowledge, STOP and do web searches immediately (see CRITICAL: Responsive Listening above)

### Transition

When the user indicates they've shared everything (natural pause, "that's about it", etc.), move to Stage 2.

If the user asks "what else should I tell you?" respond:

> "Whatever feels important. Is there anything else on your mind about this project?"

---

## Stage 2: Discover

### Purpose

Fill gaps in understanding through targeted questions. Ask based on what's MISSING from brainstorm, not a rote list.

### Question Bank

Select questions based on gaps. Maximum 10-12 questions total.

#### Users & Problem (if unclear)

- "You mentioned [user type]. Walk me through a typical day for them - what frustrates them that your app would fix?"
- "When this works perfectly, what does [user] tell their friend about it? What's the 'wow' moment?"
- "Who else might use this that we haven't discussed?"
- "What would make someone STOP using this? What's the dealbreaker?"

#### Features & Workflows (if unclear)

- "You mentioned [feature]. Walk me through it step by step - what does the user see and do?"
- "What's the first thing someone does when they open the app? What about the second time?"
- "What happens when things go wrong? Network down, server error, user mistake?"
- "Is there anything users should NOT be able to do?"

#### Technical (if unclear)

- "You mentioned [technology]. Is that a hard requirement or are you open to alternatives?"
- "What devices/platforms does this need to work on? Any specific versions?"
- "Does this need to integrate with anything else? Other apps, APIs, services?"
- "What data needs to be stored? Any sensitive information?"
- "How many users are you expecting? 10? 100? 10,000?"

#### Success & Constraints (if unclear)

- "If you could only launch with 3 features, which three?"
- "What's your timeline? Any hard deadlines?"
- "Any legal or compliance requirements? GDPR, HIPAA, accessibility?"
- "What would make you say 'this project failed'?"

### Question Approach

- **Skip** questions already answered in brainstorm
- **Follow threads** - if something interesting comes up, dig deeper
- **Acknowledge** each answer before the next question
- **Don't interrogate** - this should feel like a conversation
- **LISTEN FOR RESEARCH REQUESTS** - if user says "go research X" or "you don't understand X", STOP questions immediately and do web searches (see CRITICAL: Responsive Listening above)

### Transition

When all major gaps are filled and the user seems satisfied, move to Stage 3.

---

## Stage 3: Verify

### Purpose

Explicit confirmation that you understand the vision before generating anything.

### Create This Summary

```markdown
## What I Understand

**The Problem:**
[2-3 sentences describing the core problem being solved]

**The Users:**
| User Type | Description | Primary Goal |
|-----------|-------------|--------------|
| [Type] | [Who they are] | [What they want] |

**The Solution:**
[3-5 sentences describing what the system does]

**Core Features (in priority order):**
1. **[Feature Name]** - [One sentence description]
2. **[Feature Name]** - [One sentence description]
3. **[Feature Name]** - [One sentence description]
[Continue for all features mentioned]

**Technical Approach:**
- Platform: [web / mobile / desktop / etc.]
- Technologies mentioned: [list any preferences stated]
- Integrations needed: [list external services]
- Scale expectations: [user count, data volume if mentioned]

**Key Constraints:**
- [Constraint 1]
- [Constraint 2]

**Success Looks Like:**
[1-2 sentences on success criteria]
```

### Checkpoint

After presenting the summary, say:

> "Is this accurate? Please tell me:
> 1. What did I get WRONG?
> 2. What did I MISS?
> 3. Anything you want to CHANGE now that you see it written out?
>
> Say **'Yes, you understand'** when this is accurate, and I'll verify the technical details before generating your SRS."

### Gate

- **MUST** receive explicit "Yes, you understand" or clear equivalent
- If corrections provided → update summary → re-verify
- **Loop until confirmed** - do not proceed without explicit approval

---

## Stage 4: Research

### Purpose

Verify technical assumptions DURING creation to catch issues before they reach validation.

### Required Searches

Perform these searches based on what was discussed:

#### A. Platform Compatibility (if multi-platform)

```
Search: "[technology] iOS limitations 2024 2025"
Search: "[technology] Android limitations 2024 2025"
Search: "[technology] browser compatibility"
```

Build a platform matrix and note any limitations that affect features.

#### B. External Dependencies (for each service mentioned)

```
Search: "[service] API rate limits"
Search: "[service] API pricing tiers"
Search: "[service] API deprecation 2024 2025"
Search: "[service] known issues outages"
```

Document rate limits, costs, and risks for each dependency.

#### C. Technology Validation (for each technology mentioned)

```
Search: "[technology] latest stable version December 2025"
Search: "[technology] production ready"
```

Confirm versions are current and suitable for production.

#### D. Regulatory Check (if applicable)

```
Search: "[industry] compliance requirements"
Search: "[data type] data protection regulations"
```

Note any compliance requirements that affect the design.

### Blocker Resolution

If research reveals a potential issue:

1. **Present the finding:**
   > "I found something to consider: [describe issue with evidence from search]"

2. **Research alternatives:**
   ```
   Search: "[blocked functionality] alternative approaches"
   Search: "[problem] workaround solutions"
   ```

3. **Present options:**
   > "Here are some alternatives:
   > - **Option A:** [description, tradeoffs]
   > - **Option B:** [description, tradeoffs]
   >
   > Which approach would you prefer?"

4. **Update understanding** based on user's decision
5. **Continue** to Stage 5

### Transition

Once all technical aspects are verified (or alternatives chosen for blockers), move to Stage 5.

---

## Stage 5: Generate

### Purpose

Produce a complete SRS in IEEE 830 format that will pass Phase 1 validation.

### Output Location

```
docs/srs/SRS-[Project-Name].md
```

Also create notes file:
```
docs/srs/creation-notes.md
```

### SRS Structure

Generate the following structure (matching existing v2 SRS format):

```markdown
# Software Requirements Specification

## [Project Name]

**Version:** 1.0
**Date:** [Current Date]
**Status:** Draft - Pending Validation

---

## Table of Contents
[Auto-generate based on sections]

---

## 1. Introduction

### 1.1 Purpose
[Why this document exists, who it's for]

### 1.2 Scope
[What the system does and doesn't do]

### 1.3 Definitions, Acronyms, and Abbreviations
| Term | Definition |
|------|------------|

### 1.4 References
[Links to external docs, APIs, research sources from Stage 4]

### 1.5 Overview
[Document structure guide]

---

## 2. Overall Description

### 2.1 Product Perspective
[System context diagram - ASCII art showing major components]

### 2.2 Product Functions
| Function | Description |
|----------|-------------|

### 2.3 User Classes and Characteristics
| User Type | Description | Technical Level | Access Level |
|-----------|-------------|-----------------|--------------|

### 2.4 Operating Environment
**Server Environment:**
[From research - specific versions]

**Client Environment:**
[From research - platforms, versions, limitations]

**External Services:**
| Service | Purpose | Rate Limits | Status |
|---------|---------|-------------|--------|

### 2.5 Design and Implementation Constraints
| Constraint | Impact | Mitigation |
|------------|--------|------------|

### 2.6 Assumptions and Dependencies
| Assumption | Validated | Evidence |
|------------|-----------|----------|
[Include research sources]

---

## 3. System Features and Requirements

### 3.1 [Feature Name] (F-100)

#### 3.1.1 Description
[Feature description]

#### 3.1.2 Functional Requirements
| ID | Requirement | Priority |
|----|-------------|----------|
| F-101 | System SHALL [specific, measurable action] | Must Have |
| F-102 | System SHALL [specific, measurable action] | Should Have |

[Repeat section 3.X for each feature group: F-200, F-300, etc.]

---

## 4. External Interface Requirements

### 4.1 User Interfaces
[Describe each UI with key elements]

### 4.2 Hardware Interfaces
[If applicable]

### 4.3 Software Interfaces
| System | Protocol | Purpose | Authentication |
|--------|----------|---------|----------------|

### 4.4 Communication Interfaces
[Protocols, ports, formats]

---

## 5. Non-Functional Requirements

### 5.1 Performance Requirements
| ID | Requirement | Metric | Target |
|----|-------------|--------|--------|
| NFR-P01 | [Specific performance requirement] | [Unit] | [Value] |

### 5.2 Safety Requirements
| ID | Requirement | Priority |
|----|-------------|----------|

### 5.3 Security Requirements
| ID | Requirement | Priority |
|----|-------------|----------|
[Cover STRIDE: Spoofing, Tampering, Repudiation, Information Disclosure, DoS, Elevation of Privilege]

### 5.4 Software Quality Attributes
| Attribute | Requirement | Metric |
|-----------|-------------|--------|
| Availability | [Specific target] | [e.g., 99.9% uptime] |
| Maintainability | [Specific target] | [e.g., deploy in < 1 hour] |

### 5.5 Business Rules
| ID | Rule |
|----|------|
| BR-01 | [Specific business rule] |

---

## 6. Database Requirements

### 6.1 Entity Relationship Diagram
```
[ASCII ERD showing tables and relationships]
```

### 6.2 Table Specifications
#### [Table Name]
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|

### 6.3 Indexes
| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|

### 6.4 Data Retention
| Data Type | Retention Period | Deletion Method |
|-----------|------------------|-----------------|

---

## 7. API Specifications

### 7.1 API Overview
- **Base URL:** `[URL]`
- **Protocol:** REST / GraphQL
- **Format:** JSON
- **Authentication:** [Method]

### 7.2 [Endpoint Group]

#### [METHOD] /endpoint
**Purpose:** [What it does]

**Request:**
```json
{
  "field": "value"
}
```

**Response (200):**
```json
{
  "field": "value"
}
```

**Errors:**
| Code | Meaning |
|------|---------|

[Repeat for each endpoint]

---

## 8. Security Requirements

### 8.1 Authentication
[Specific auth requirements]

### 8.2 Authorization
[Role-based access details]

### 8.3 Data Protection
[Encryption, handling requirements]

### 8.4 API Security
[Rate limiting, validation, CORS]

---

## 9. System Architecture

### 9.1 High-Level Architecture
```
[ASCII architecture diagram]
```

### 9.2 Component Description
| Layer | Component | Technology | Responsibility |
|-------|-----------|------------|----------------|

### 9.3 Deployment Architecture
```
[ASCII deployment diagram]
```

### 9.4 Technology Stack Summary
| Layer | Technology | Version | Notes |
|-------|------------|---------|-------|
[From Stage 4 research - confirmed versions]

---

## 10. Appendices

### 10.1 Glossary
[Terms and definitions]

### 10.2 [Integration Setup Guides]
[If complex integrations]

### 10.3 Implementation Phases
| Phase | Features | Milestone |
|-------|----------|-----------|
| 1 | [Core features] | MVP |
| 2 | [Secondary features] | Beta |
[etc.]

### 10.4 Known Limitations
| Limitation | Impact | Mitigation |
|------------|--------|------------|
[From Stage 4 research]

### 10.5 Success Criteria
| Metric | Target | Measurement |
|--------|--------|-------------|

---

## Document Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Author | | | |
| Reviewer | | | |
| Approver | | | |
```

### Requirement Writing Rules

**ALWAYS use this pattern:**
```
System SHALL [specific action] [measurable criteria]
```

**NEVER use these terms:**
- "user-friendly", "easy to use", "intuitive"
- "fast", "quick", "responsive", "efficient"
- "flexible", "scalable", "robust"
- "as needed", "if necessary", "when appropriate"
- "etc.", "and so on", "and more"
- "some", "several", "many", "few"
- "usually", "generally", "typically"
- "may", "might", "could"
- "simple", "straightforward", "obvious"
- "adequate", "sufficient", "reasonable"
- "minimal", "maximum", "optimal" (without numbers)
- "soon", "later", "eventually"

**ALWAYS include:**
- Specific numbers: "within 500ms", "maximum 25 per 24 hours"
- Specific units: "5MB file size limit", "100 concurrent users"
- Specific conditions: "when status equals 'Approved'"
- Specific success criteria: "user completes flow in under 3 minutes"

### STRIDE Security Coverage

For each data entry point (user input, API endpoint), ensure requirements exist for:
- **Spoofing:** Authentication requirement
- **Tampering:** Input validation requirement
- **Repudiation:** Audit logging requirement
- **Information Disclosure:** Encryption/access control requirement
- **Denial of Service:** Rate limiting requirement
- **Elevation of Privilege:** Authorization requirement

### User Journey Completeness

For each user type, ensure requirements cover:
- First-time experience (onboarding)
- Happy path (normal usage)
- Error paths (what goes wrong)
- Return experience (subsequent visits)
- Exit/cleanup (account deletion, data export if applicable)

---

## Self-Validation Checklist

Before outputting the final SRS, verify:

### Structure (IEEE 830)
- [ ] All 10 sections present with subsections
- [ ] Table of contents accurate
- [ ] Requirement IDs assigned (F-XXX, NFR-XXX)

### Language Quality
- [ ] ZERO instances of ambiguous language
- [ ] All requirements use "SHALL" language
- [ ] All requirements have measurable criteria with units

### Technical Validation
- [ ] All platforms verified via web search (Stage 4)
- [ ] All external dependencies documented with rate limits
- [ ] All technology versions confirmed current
- [ ] Platform compatibility matrix included if multi-platform

### Completeness
- [ ] All user types have complete journey coverage
- [ ] All features have error handling requirements
- [ ] All integrations have authentication specified
- [ ] Security requirements cover STRIDE categories
- [ ] MoSCoW prioritization on all requirements

### Formatting
- [ ] ASCII diagrams for architecture and ERD
- [ ] JSON examples for all API endpoints
- [ ] Tables used consistently
- [ ] Glossary includes all technical terms

### Validation-Ready
- [ ] This SRS should pass Gate 1 (Ambiguous Language) - BLOCKING
- [ ] This SRS should pass Gate 2 (Platform Compatibility) - BLOCKING
- [ ] This SRS should pass Gate 3 (Security Threats) - BLOCKING
- [ ] This SRS should pass Gate 4 (Regulatory Compliance) - BLOCKING

---

## Notes File Structure

Also create `docs/srs/creation-notes.md`:

```markdown
# SRS Creation Notes: [Project Name]

**Created:** [Date]

## Brainstorm Capture
[Raw notes from Stage 1]

## Discovery Questions Asked
[Questions and key answers from Stage 2]

## Research Findings

### Platform Compatibility
[Results from Stage 4 searches]

### External Dependencies
[Rate limits, pricing, risks discovered]

### Technology Versions
[Confirmed versions]

### Blockers Resolved
[Issues found and decisions made]

## Decisions Log
| Decision | Options Considered | Choice | Rationale |
|----------|-------------------|--------|-----------|
```

---

## Next Steps

After completing this command:

1. **Start a NEW conversation** (fresh eyes for validation)
2. Run: `/initial-setup-step2-srs-analyze [path-to-srs]`
3. The SRS should pass quickly if this process was followed correctly

---

## Error Handling

### If user is vague during brainstorm
Don't interrupt. After they pause:
> "That's a good start. Is there anything else about [most unclear aspect] you want to share?"

### If user gets stuck on questions
Offer concrete examples:
> "For example, in apps like [similar product], users typically [scenario]. Does yours work similarly?"

### If scope seems too large
> "This is ambitious! If you had to launch with just the essentials, which 3 features would be in v1?"

Use their answer to set MoSCoW priorities (Must/Should/Could Have).

### If research finds a blocker
1. Don't alarm the user - present as "something to consider"
2. Always research and present alternatives
3. Let user decide direction
4. Update the SRS based on their decision
