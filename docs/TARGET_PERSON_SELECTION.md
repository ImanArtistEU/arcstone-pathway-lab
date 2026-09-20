# Deterministic Target Person Selection Engine

## 1. Core Purpose & Architectural Position

Target Person Selection is the stage of Arcstone Pathway Intelligence that determines which specific individual within a target investor organization a startup should prioritize.

```
PathwayDataset
  ├── Relationship Qualification (Batch 2)
  ├── Path Generation & Traversal (Batch 3)
  ├── Path Rejection & Viability Filter (Batch 4)
  ├── Path Scoring & Priority Index (Batch 5)
  └── Target Person Selection Engine (Batch 6 & 6.1) [IMPLEMENTED]
```

It answers the core product question:
> **"Who at this fund should this startup actually prioritize?"**

---

## 2. Fundamental Invariants

```
RIGHT PERSON ≠ EASIEST PERSON TO REACH
TARGET FIT ≠ ACCESS QUALITY
NO WARM PATH ≠ WRONG TARGET PERSON
SELECTION ≠ OUTREACH RECOMMENDATION
CANDIDATE DISCOVERY ≠ TARGET PERSON SELECTION
MISSING PERSON CONTEXT ≠ PERSON IRRELEVANCE
MISSING STARTUP CONTEXT ≠ NO MATCH
MALFORMED PROFILE ≠ VALID PROFILE
EXPLANATION MUST MATCH ACTUAL FIT
CURRENT AFFILIATION MUST ACTUALLY BE CURRENT
MISSING STARTUP RECORD ≠ ORGANIZATION FALLBACK
```

1. **RIGHT PERSON ≠ EASIEST PERSON TO REACH**: An easy-to-reach junior non-investment contact or wrong-stage investor is not the right target. Functional role and thesis fit dominate access quality.
2. **TARGET FIT ≠ ACCESS QUALITY**: Mandate fit (functional role, stage, sector, geography) and graph access quality are evaluated separately before being combined into an overall target priority index.
3. **NO WARM PATH ≠ WRONG TARGET PERSON**: A candidate with zero warm introduction routes can still be selected as the primary target if they have superior mandate fit.
4. **SELECTION ≠ OUTREACH RECOMMENDATION**: Selection answers *WHO* to prioritize, not *HOW* or *WHEN* to reach out. It does NOT generate outreach copy or recommend actions.
5. **CANDIDATE DISCOVERY ≠ TARGET PERSON SELECTION**: Candidates are supplied explicitly in `TargetInvestor.candidatePersonIds`. Selection does not query external web directories or discover people.
6. **MISSING PERSON CONTEXT ≠ PERSON IRRELEVANCE**: If a candidate lacks a structured target person profile, selection fails cleanly with `insufficient_context` rather than silently ignoring the person.
7. **MISSING STARTUP CONTEXT ≠ NO MATCH**: Missing startup stage, sector, or geography context results in `unknown` (score 50), regardless of candidate profile focus.
8. **MALFORMED PROFILE ≠ VALID PROFILE**: Focus arrays (`stageFocus`, `sectorFocus`, `geographyFocus`) require valid non-empty strings. Malformed elements or metadata types fail closed with explicit errors.
9. **EXPLANATION MUST MATCH ACTUAL FIT**: Explanations state actual computed fit statuses and access indices without qualitative claims ("strong", "weak", "excellent").
10. **CURRENT AFFILIATION MUST ACTUALLY BE CURRENT**: Candidate affiliation with the target investor organization requires a `currentOrganizationIds` snapshot match OR an active `works_at` relationship verified against `referenceDate` (`startedAt <= referenceDate` and `endedAt > referenceDate`).
11. **MISSING STARTUP RECORD ≠ ORGANIZATION FALLBACK**: Target Person Selection requires an actual `Startup` record in `dataset.startups`. `Organization` fallback is forbidden.

---

## 3. Context & Stage Rules

- **Fundraising Stage Context**: `Campaign.round` is the primary stage context. `Startup.stage` is used as fallback only when `Campaign.round` is absent/blank at runtime. If both are absent, stage fit is `unknown`.
- **Startup Context Source**: Resolved strictly from `TargetInvestor` $\rightarrow$ `Campaign` $\rightarrow$ `dataset.startups`. Missing startup records yield `executionStatus: "error"`.

---

## 4. Evaluation & Priority Formula

Target Priority Index is an uncalibrated heuristic on a `0 - 100` scale.

```
mandateFitIndex = round(
  0.40 * investmentRoleScore +
  0.25 * stageFitScore +
  0.25 * sectorFitScore +
  0.10 * geographyFitScore
)

accessQualityIndex = max(overallPriorityIndex among candidate's scored paths)

overallTargetPriorityIndex = round(
  0.70 * mandateFitIndex +
  0.30 * accessQualityIndex
)
```

### Functional Role Scores
- `lead_investor`: **100**
- `investment_team`: **80**
- `sourcing`: **60**
- `unknown`: **50**
- `non_investment`: **0** (`selectable = false`)

### Thesis Fit Scores (Stage, Sector, Geography)
- `match`: **100** (exact match or broad terms `"all"`, `"generalist"`, `"global"`)
- `unknown`: **50** (unspecified/empty profile focus or missing startup context)
- `no_match`: **0** (explicit non-matching focus)

---

## 5. Dispositions & Ranking Rules

Candidates are ranked deterministically by:
1. `overallTargetPriorityIndex` DESC
2. `mandateFitIndex` DESC
3. `accessQualityIndex` DESC
4. `investmentRoleScore` DESC

If two or more candidates tie across **ALL 4** substantive dimensions, selection returns:
- `disposition`: `"ambiguous_top_candidates"`
- `primaryTargetPersonId`: `undefined`
- `topCandidatePersonIds`: Array of tied candidate IDs.

---

## 6. Non-Investment Contacts
Individuals with `investmentRole: "non_investment"` (e.g. HR, Operations, Event Managers) are assigned `selectable = false` and `overallTargetPriorityIndex = 0`. They remain visible in evaluations for graph context, but can NEVER be selected as a primary target.
