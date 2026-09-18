# Pathway Intelligence Domain Model

This document outlines the core data structures and architectural design decisions governing the Arcstone Pathway Intelligence domain model.

## Core Principle

$$\text{DATA} \longrightarrow \text{EVIDENCE} \longrightarrow \text{DECISION} \longrightarrow \text{ACTION} \longrightarrow \text{OUTCOME} \longrightarrow \text{LEARNING}$$

Batch 1 establishes the **DATA** and **EVIDENCE** foundation. It records observable facts without prematurely deciding relationship strength, warmth, or route viability.

---

## Major Domain Entities

| Entity | Description |
|---|---|
| **`Startup`** | The company raising capital or seeking strategic introductions. |
| **`Person`** | Any human participant in the network (founder, advisor, investor, colleague). Can be associated with multiple organizations. |
| **`Organization`** | Formal institutions across categories (`startup`, `vc_fund`, `angel_group`, `accelerator`, `corporate`, `university`, `advisory_firm`, `other`). |
| **`Relationship`** | An edge linking two entities (`person -> person`, `person -> organization`, or `organization -> organization`) with defined category, direction, and time bounds. |
| **`RelationshipEvidence`** | Discrete factual records supporting an observed relationship (e.g., public filings, portfolio pages, calendar meetings). |
| **`FundraisingCampaign`** | A round-specific fundraising context binding a startup and its founders. |
| **`TargetInvestor`** | An investor organization and candidate decision-makers targeted within a campaign. |
| **`PathCandidate`** | Future contract representing an evaluated multi-node route from founder to target investor. |
| **`PathScore`** | Future scoring contract holding multi-dimensional metrics (`overall`, `relationshipStrength`, `relevance`, `confidence`, `recency`, `friction`). |
| **`PathOutcome` / `FounderFeedback`** | Ground truth feedback and real-world results from recommended introductions. |

---

## Key Design Decisions

### 1. Separation of `Relationship` and `RelationshipEvidence`

A relationship is an abstract semantic link between two network entities (e.g., "Elena Vance is an advisor to Nexus AI", or "Marcus Thorne co-invested with Sarah Chen").

Separating `RelationshipEvidence` from `Relationship` ensures:
* **Multiple corroborating sources**: A single relationship can be substantiated by multiple distinct artifacts (e.g., SEC filing, portfolio directory, calendar logs).
* **Source attribution and timestamping**: Each piece of evidence retains its origin, retrieval timestamp, and provenance.
* **Auditability and Explainability**: When recommendations are surfaced, the system can cite explicit evidentiary records rather than opaque graph weights.

### 2. LinkedIn Connections as Raw Evidence, Not Inferred Warmth

A visible LinkedIn connection is a raw observational signal, not proof of a warm personal introduction route.

* Founders often have thousands of 1st-degree connections who have never met them and would ignore intro requests.
* Treating a connection edge as automatically "warm" causes high friction and damaging rejections.
* By representing LinkedIn links purely as raw relationships supported by `linkedin` evidence, downstream qualification engines can cleanly distinguish superficial connections from high-conviction, evidence-backed routes.

### 3. Early Definition of `PathCandidate` and `PathScore` Without Premature Generation

`PathCandidate` and `PathScore` contracts are declared in Batch 1 to establish the target interface boundary without coupling to any heuristic or scoring formula.

* Prevents premature architectural assumptions about graph traversal or path ranking.
* Enables strict contract testing and ensures the data pipeline will consume well-typed inputs and emit standardized candidate structures.

### 4. Closing the Learning Loop via Outcomes and Feedback

The system is designed to learn from ground-truth results rather than static assumptions:

```
Recommended Action
       │
       ▼
Actual Outcome (e.g., intro_requested, meeting_booked, no_response)
       │
       ▼
Founder Feedback (e.g., accurate, inaccurate, unknown)
       │
       ▼
Calibration & Weight Adjustment (Future Batches)
```

By recording `PathOutcome` and `FounderFeedback` against specific evaluated paths, Arcstone will continuously calibrate relationship qualification thresholds and scoring heuristics against real fundraising outcomes.
