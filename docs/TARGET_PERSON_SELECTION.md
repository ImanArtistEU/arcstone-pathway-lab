# Deterministic Target Person Selection Engine

## 1. Core Purpose & Architectural Position

Target Person Selection is the stage of Arcstone Pathway Intelligence that determines which specific individual within a target investor organization a startup should prioritize.

```
PathwayDataset
  ├── Relationship Qualification (Batch 2)
  ├── Path Generation & Traversal (Batch 3)
  ├── Path Rejection & Viability Filter (Batch 4)
  ├── Path Scoring & Priority Index (Batch 5)
  └── Target Person Selection Engine (Batch 6) [IMPLEMENTED]
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
```

1. **RIGHT PERSON ≠ EASIEST PERSON TO REACH**: An easy-to-reach junior non-investment contact or wrong-stage investor is not the right target. Functional role and thesis fit dominate access quality.
2. **TARGET FIT ≠ ACCESS QUALITY**: Mandate fit (functional role, stage, sector, geography) and graph access quality are evaluated separately before being combined into an overall target priority index.
3. **NO WARM PATH ≠ WRONG TARGET PERSON**: A candidate with zero warm introduction routes can still be selected as the primary target if they have superior mandate fit.
4. **SELECTION ≠ OUTREACH RECOMMENDATION**: Selection answers *WHO* to prioritize, not *HOW* or *WHEN* to reach out. It does NOT generate outreach copy or recommend actions.
5. **CANDIDATE DISCOVERY ≠ TARGET PERSON SELECTION**: Candidates are supplied explicitly in `TargetInvestor.candidatePersonIds`. Selection does not query external web directories or discover people.
6. **MISSING PERSON CONTEXT ≠ PERSON IRRELEVANCE**: If a candidate lacks a structured target person profile, selection fails cleanly with `insufficient_context` rather than silently ignoring the person.

---

## 3. Evaluation & Priority Formula

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
- `unknown`: **50** (unspecified/empty profile focus)
- `no_match`: **0** (explicit non-matching focus)

---

## 4. Dispositions & Ranking Rules

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

## 5. Non-Investment Contacts
Individuals with `investmentRole: "non_investment"` (e.g. HR, Operations, Event Managers) are assigned `selectable = false` and `overallTargetPriorityIndex = 0`. They remain visible in evaluations for graph context, but can NEVER be selected as a primary target.
