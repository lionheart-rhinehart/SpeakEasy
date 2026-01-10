---
description: Analyze Facebook ad campaign performance and generate actionable copywriter brief
---

# Facebook Campaign Analysis

You are about to run a comprehensive ad performance analysis. This will generate a copywriter brief with actual images, hook patterns, and actionable insights.

---

## STEP 0: GATHER INFORMATION (REQUIRED FIRST)

**Before doing ANY analysis, you MUST ask these 3 questions using AskUserQuestion:**

### Question 1: Account Name
Ask the user for the Facebook Ads account name they want to analyze.
- This is a free text input
- Example: "Genesis Sports Performance"

### Question 2: Date Range
Ask the user to select a date range:
- Last 30 days (Recommended)
- Last 90 days
- Last 12 months
- Custom range (let them specify)

### Question 3: Primary Conversion Goal
Ask the user what conversion they're optimizing for:
- Leads (Recommended) - uses action_type "lead"
- Purchases - uses action_type "purchase"
- Link Clicks - uses action_type "link_click"
- Other (let them specify the action_type)

**CRITICAL: The conversion goal determines the `action_type` used for ALL filtering and cost-per-conversion calculations throughout the entire analysis.**

**DO NOT PROCEED until you have answers to all 3 questions.**

---

## STEP 1: Find the Account

Use `get_ad_accounts` to list all accessible accounts, then find the one matching the user's account name.

```
get_ad_accounts()
```

Search through the results for a name match (case-insensitive, partial match OK). Extract the `account_id` (format: `act_XXXXXXXXX`).

If no match found, show the user the list of available accounts and ask them to clarify.

---

## STEP 2: Pull Performance Data

Use `get_insights` with the account ID and user's date range:

```
get_insights(
  object_id: "[ACCOUNT_ID]",
  time_range: {"since": "[START_DATE]", "until": "[END_DATE]"},
  level: "ad",
  limit: 50
)
```

**Extract conversions using EXACT MATCH based on user's goal:**

```javascript
// If user selected "Leads":
conversions = actions.find(a => a.action_type === "lead")?.value || 0

// If user selected "Purchases":
conversions = actions.find(a => a.action_type === "purchase")?.value || 0

// If user selected "Link Clicks":
conversions = actions.find(a => a.action_type === "link_click")?.value || 0
```

**WARNING:** Do NOT use regex or contains matching. There are 7+ action types containing "lead" - using contains will break the count.

**Filter & Sort:**
1. Keep only ads where conversions > 0
2. Calculate cost-per-conversion: `spend / conversions`
3. Sort by cost-per-conversion ascending (lowest/best first)
4. Take the **top 5** performers

If fewer than 5 ads have conversions, paginate using the `after` cursor to pull more data.

---

## STEP 3: Pull Creative Content

For each of the top 5 ads, use `get_ad_creatives`:

```
get_ad_creatives(ad_id: "[AD_ID]")
```

**Extract from standard creatives:**
| Data Point | Location |
|------------|----------|
| Body text | `object_story_spec.link_data.message` OR `object_story_spec.video_data.message` |
| Headline | `object_story_spec.link_data.name` |

**Extract from dynamic creatives (if `asset_feed_spec` exists):**
| Data Point | Location |
|------------|----------|
| All body variants | `asset_feed_spec.bodies[].text` |
| All headline variants | `asset_feed_spec.titles[].text` |

**CRITICAL:** Capture the COMPLETE body text. Never truncate hooks or copy.

---

## STEP 4: Get & Embed Images

**For each of the top 5 ads, you MUST retrieve and embed the actual image.**

```
get_ad_image(ad_id: "[AD_ID]")
```

The image will be returned for visual analysis. You must:
1. Analyze the image (Claude is multimodal)
2. **EMBED the actual image in the final report** - not just a description

For each image, document:
| Element | What to Capture |
|---------|-----------------|
| Subject matter | What's shown? (athlete, facility, equipment, testimonial) |
| Text overlay | Any text on the image? Quote it exactly |
| Color/mood | Dominant colors, energy level |
| Target audience signals | Who is this designed to appeal to? |
| Why it works | Psychological triggers |

---

## STEP 5: Analyze Patterns

For each ad, identify:

### A. Audience Signals
- Who is being addressed? (Parent / Athlete / Both)
- Age indicators
- Sport-specific language
- Geographic callouts

### B. Pain Points
- What problem does the hook address?
- What fear or frustration is triggered?
- Quote the exact phrases used

### C. Hook Pattern
Classify using these patterns:

| Pattern | Signal |
|---------|--------|
| Direct Question | "Is your...?" "Are you...?" |
| Loss Aversion | "Don't lose..." "While others gain..." |
| Urgency/Deadline | "By [date]..." "Week X Alert" |
| Curiosity Gap | "What no one tells you..." |
| Fear/Consequence | "By then, it's too late" |
| Social Proof | "Athletes like [name]..." |
| Specificity | Concrete numbers/claims |

### D. Copy Structure
- Framework: PAS, AIDA, Before/After
- Word count
- Sections: Hook → Agitate → Solution → Proof → CTA

### E. CTA Language
- What is the call to action?
- What urgency/incentive is offered?

---

## STEP 6: Synthesize & Generate Templates

Across all 5 ads, identify:

1. **Primary Audience Segment** - Who are we really talking to?
2. **Top 3 Pain Points** - Ranked by cost-per-conversion
3. **Winning Hook Patterns** - Which types appear in best performers?
4. **Copy Structure Blueprint** - Common flow and length
5. **CTA Bank** - All CTAs used, with performance
6. **Visual Patterns** - What image types work?

Create 2-3 fill-in-the-blank templates based on winners.

---

## OUTPUT FORMAT

Generate the report in this exact structure:

```markdown
# [Account Name] - Copywriter Brief

**Generated:** [Today's Date] | **Period:** [Date Range] | **Goal:** [Conversion Type] | **Top Performer:** $XX.XX per [conversion]

---

## 1. AUDIENCE SNAPSHOT

| Segment | Who They Are | What They Want |
|---------|--------------|----------------|
| **Primary** | [Description] | [Goal] |
| **Secondary** | [Description] | [Goal] |

**Buyer vs. User:** [Who pays vs. who uses]

---

## 2. PAIN POINTS (Ranked by Cost-Per-Conversion)

| Rank | Pain Point | Best Cost | Example Phrase |
|------|------------|-----------|----------------|
| 1 | [Pain] | $XX | "[Exact quote]" |
| 2 | [Pain] | $XX | "[Exact quote]" |
| 3 | [Pain] | $XX | "[Exact quote]" |

---

## 3. HOOK FORMULAS THAT WORK

### Pattern A: [Name] - $XX avg cost

**Template:**
[Hook structure]

**Winner Example:**
> "[Full hook text - DO NOT TRUNCATE]"

**Fill-in-the-blank:**
> [Template with brackets for customization]

---

## 4. COPY STRUCTURE BLUEPRINT

| Section | Word Count | Purpose | Example Phrases |
|---------|------------|---------|-----------------|
| Hook | ~XX words | [Purpose] | "[phrase]" |
| Agitate | ~XX words | [Purpose] | "[phrase]" |
| Solution | ~XX words | [Purpose] | "[phrase]" |
| Proof | ~XX words | [Purpose] | "[phrase]" |
| CTA | ~XX words | [Purpose] | "[phrase]" |

**Total copy length:** ~XXX words

---

## 5. CTA BANK

| CTA Type | Phrase | Cost |
|----------|--------|------|
| Primary | "[CTA]" | $XX |
| Urgency | "[CTA]" | $XX |

---

## 6. TOP PERFORMING ADS WITH IMAGES

### Ad 1: [Ad Name] - $XX.XX per [conversion]

**Performance:** X [conversions] | $X spend | X% CTR

[EMBED ACTUAL IMAGE HERE]

| Element | Finding |
|---------|---------|
| Subject | [Description] |
| Text Overlay | "[Exact text]" |
| Colors/Mood | [Description] |
| Why It Works | [Explanation] |

**Full Copy:**
> [COMPLETE ad copy - DO NOT TRUNCATE]

**Hook Pattern:** [Pattern name]
**Copy Structure:** [Framework used]

---

(Repeat for all 5 top performers)

---

## 7. READY-TO-USE TEMPLATES

### Template A: [Pattern Name]
Based on $XX winner:

```
[HOOK - pattern type]
[AGITATE - 2-3 sentences deepening pain]
[SOLUTION - introduce offer]
[PROOF - guarantee or result]
[CTA - action + urgency]
```

---

## 8. QUICK REFERENCE CARD

| Element | Use This |
|---------|----------|
| Target | [5 words] |
| Main Pain | [Pain point] |
| Best Hook Type | [Type] |
| Proof Format | [Format] |
| CTA Style | [Style] |
| Copy Length | ~XXX words |
| Top Phrase | "[Phrase]" |
```

---

## STEP 7: Save the Report

Save the completed report to:

```
analysis report/[account-name-lowercase-dashes]-analysis-[YYYY-MM-DD].md
```

Example: `analysis report/genesis-sports-performance-analysis-2025-12-26.md`

---

## VALIDATION CHECKLIST

Before finalizing, verify:

- [ ] All 3 questions were asked and answered before analysis began
- [ ] Correct action_type used based on user's conversion goal
- [ ] All 5 top ads analyzed with complete (not truncated) copy
- [ ] All 5 images retrieved and EMBEDDED in report
- [ ] Pain points ranked by actual cost-per-conversion
- [ ] At least 2 fill-in-the-blank templates provided
- [ ] Quick reference card completed
- [ ] Report saved to `analysis report/` folder
