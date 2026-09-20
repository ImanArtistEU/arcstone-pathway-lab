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

1. `startup.csv` — Startup entity details (name, stage, sector, geography).
2. `campaign.csv` — Fundraising campaign details (round, status, creation date).
3. `organizations.csv` — Companies, VC funds, corporate entities, advisory firms in your network.
4. `people.csv` — Founders, advisors, VC partners, colleagues, intermediaries.
5. `targets.csv` — Target investor organizations and candidate contacts at each firm.
6. `relationships.csv` — Person-to-person and person-to-org connections (`founder_of`, `advisor`, `works_at`, `co_invested`, `linkedin_connection`, etc.).
7. `evidence.csv` — Evidence artifacts supporting each relationship (emails, meetings, board decks, public records).
8. `target-person-profiles.csv` — Candidate investor profiles (role, investment focus arrays for stage/sector/geography).

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

## 2. Eleven Nontechnical Pilot Review Questions

After completing a pilot run, evaluate your results using these 11 strategic review questions:

1. **Import Cleanliness:** Did the harness successfully ingest your network export without parse errors or formatting rejections?
2. **Data Completeness:** Were any relationships or evidence items unexpectedly dropped during validation?
3. **Route Reality:** Did the generated routes match your intuitive understanding of your warm intro network?
4. **Rejection Quality:** Did path rejection remove any pathways you considered valid, or retain any you considered invalid?
5. **Score Alignment:** Were the relative priority index scores aligned with your actual relationship trust levels?
6. **Mandate Accuracy:** Did target person selection identify the right investor at each firm based on investment focus?
7. **Access vs Mandate:** How often did the model select a candidate with no known warm path over an easy-to-reach contact with zero mandate fit?
8. **Selection Ambiguity:** Were any target investors flagged as ambiguous due to tied priority index scores?
9. **Context Impact:** Did incomplete startup or investor profile context affect the mandate fit evaluation?
10. **Diagnostic Distribution:** Which diagnostic flags (`NO_KNOWN_PATH`, `ALL_PATHS_REJECTED`, `CONFIRMATION_REQUIRED`, etc.) occurred most frequently across your target investor list?
11. **Data Quality Gaps:** What data quality gaps (missing dates, vague evidence descriptions, missing focus tags) were revealed by the pilot run?

---

## 3. Architecture & Data Contract Summary

```
CSV Bundle (8 CSVs)
   │
   ▼
loadPilotCsvBundle() ──► Dataset Integrity Check
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
