# Arcstone Pathway Intelligence — Real-Data Pilot Harness Guide

## Executive Overview

The **Real-Data Pilot Harness** enables founders and investment teams to run Arcstone's deterministic synthetic decision pipeline (`PathwayDataset` $\rightarrow$ `Relationship Qualification` $\rightarrow$ `Path Generation` $\rightarrow$ `Path Rejection` $\rightarrow$ `Path Scoring` $\rightarrow$ `Target Person Selection`) against real network and campaign data imported from simple CSV bundles.

### Critical Privacy and Safety Invariants
> [!CAUTION]
> **REAL DATA $\neq$ SOURCE CODE**
> **PRIVATE NETWORK DATA MUST NOT BE COMMITTED TO GIT.**
> All real network exports, pilot CSV bundles, and output reports must reside strictly within `.gitignore`'d directories (`private-data/` or `pilot-output/`).

> [!IMPORTANT]
> **FROZEN DECISION PIPELINE**
> The pilot harness is a diagnostic wrapper *outside* the core decision pipeline. It does **NOT** tune scoring weights, adjust selection heuristics, add web scraping, or alter qualification rules. It exists to evaluate current model behavior against empirical reality.

> [!NOTE]
> **SINGLE-STARTUP / SINGLE-CAMPAIGN CONTRACT (v1)**
> Each pilot CSV bundle represents **EXACTLY 1 STARTUP** and **EXACTLY 1 FUNDRAISING CAMPAIGN**. The campaign's active founders are explicitly specified in `campaign.csv founderPersonIds`. This identifies the founders actively participating in THIS fundraising campaign (not every person who has ever founded the company).

---

## 1. Quick Start Guide for Founders

### Step 1: Copy CSV Templates
Copy the committed CSV templates from `data/templates/real-pilot/` to a local, git-ignored folder:

```bash
mkdir -p private-data/my-startup-pilot
cp data/templates/real-pilot/*.csv private-data/my-startup-pilot/
```

### Step 2: Populate CSV Files
Open the CSV files in your spreadsheet editor (e.g., Google Sheets, Excel, Numbers) or text editor and populate your campaign data:

1. `startup.csv` — Single startup details (name, stage, sector, geography).
2. `campaign.csv` — Single fundraising campaign details (active founder IDs, round, status, creation date).
3. `organizations.csv` — Companies, VC funds, corporate entities, advisory firms in your network.
4. `people.csv` — Founders, advisors, VC partners, colleagues, intermediaries.
5. `targets.csv` — Target investor organizations and candidate contacts at each firm.
6. `relationships.csv` — Person-to-person and person-to-org connections (`founder_of`, `advisor`, `works_at`, `co_invested`, `linkedin_connection`, etc.).
7. `evidence.csv` — Evidence artifacts supporting each relationship (emails, meetings, board decks, public records).
8. `target-person-profiles.csv` — Candidate investor profiles (role, investment focus arrays for stage/sector/geography).

### Field Requirement Matrix
The pilot harness enforces strict entity validation while permitting reasonable optionality:

| File | Required Fields | Optional Fields | Notes / Mapping Rules |
| :--- | :--- | :--- | :--- |
| `startup.csv` | `startupId`, `name` | `website`, `geography`, `sector`, `stage` | Blank optional cells yield `undefined`. Headers mandatory. |
| `campaign.csv` | `campaignId`, `startupId`, `founderPersonIds`, `status`, `createdAt` | `round` | `founderPersonIds` is pipe-delimited list of active campaign founders (at least 1 required). Blank `round` maps to `""` (empty string). Headers mandatory. |
| `evidence.csv` | `evidenceId`, `relationshipId`, `type`, `description` | `observedAt`, `sourceName`, `sourceUrl` | Blank optional cells yield `undefined`. Populated `observedAt` must be valid date. Headers mandatory. |
| `evidence.csv` (interaction) | N/A | `interactionOccurredAt`, `interactionReciprocity`, `interactionStatus` | Optional, but if ANY interaction field is populated, all three are required. |

### Multi-Value Formatting
For fields supporting multiple values (e.g., `candidatePersonIds`, `evidenceIds`, `stageFocus`, `sectorFocus`, `geographyFocus`), use the pipe character (`|`) as a delimiter:
* Example: `Seed|Series A`
* Example: `Enterprise Software|AI|Fintech`
* Blank cells represent empty arrays (`[]`). Do not use double pipes (`||`) or duplicate values within a single cell.

### Step 3: Run Pilot Analysis
Execute the local CLI script specifying your input directory and reference date (YYYY-MM-DD):

```bash
npm run pilot:analyze -- --input private-data/my-startup-pilot --reference-date 2026-09-18
```

### Step 4: Review Output Reports
The harness generates two diagnostic files under `pilot-output/<bundle-name>/`:
1. `report.json` — Structured JSON payload containing full execution metadata and evaluations.
2. `report.md` — Nontechnical Markdown summary suitable for review and discussion.

---

## 2. Nontechnical Strategic Pilot Review Questions

After completing a pilot run, evaluate your results using these strategic review questions to assess product validity and uncover real-world data gaps:

1. **Target Person Selection:** Did Arcstone pick the right target person at this fund?
2. **Selection Root Cause:** If not, why? (wrong sector focus, wrong stage focus, wrong role title, missing target profile)
3. **Pathway Quality:** Did Arcstone find the best introduction pathway?
4. **Missing Warm Paths:** Did Arcstone miss a warm path that the founder actually has?
5. **Invalid Warm Paths:** Did Arcstone output a warm path that is actually dead, invalid, or inappropriate?
6. **False Rejections:** Where are we rejecting warm paths that a human partner would actually take?
7. **Mandate Dominance without Paths:** Where are we ranking an investor high based on mandate fit when no usable path exists?
8. **Real-World Evidence Gaps:** Which evidence types in real data are missing timestamps or sources, and how does that affect freshness scoring?
9. **Tie-Breaking Needs:** How often does target person selection tie, and what additional data (e.g. recent deals) would break the tie?
10. **No Known Path Accuracy:** Did the system classify a path as "No Known Path" when a real path exists?
11. **Analysis Error Decoupling:** Did the system classify an analysis error as "No Known Path"? (Analysis errors MUST emit `ANALYSIS_ERROR`, never `NO_KNOWN_PATH`).
12. **Confirmation Visibility:** Were confirmation-required paths highlighted properly in the report?
13. **Mandate vs Access Dominance:** Is the primary person selected truly the best contact based on mandate fit, or just the easiest person to reach?
14. **Context Completeness:** Is any required startup or investor context missing from the CSV bundle?
15. **Loader & Integrity Stability:** Did any dataset loading error or integrity error prevent analysis?

---

## 3. Architecture & Data Contract Summary

```
CSV Bundle (8 CSVs)
   │
   ▼
loadPilotCsvBundle() ──► Single Startup & Campaign Integrity Check
   │
   ▼
analyzePilotDataset()
   │
   ├──► generatePathsForTarget()
   ├──► applyPathRejection()
   ├──► scoreRetainedPaths()
   └──► selectTargetPerson()
   │
   ▼
Report Generator (JSON & MD)
```
