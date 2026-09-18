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
* **Bidirectional Referential Integrity**: The dataset validator strictly enforces that any evidence referenced by a relationship points back to that relationship, and any evidence object is explicitly listed in its relationship's `evidenceIds`.

### 2. LinkedIn Connections as Raw Evidence, Not Inferred Warmth

A visible LinkedIn connection is a raw observational signal, not proof of a warm personal introduction route.

* Founders often have thousands of 1st-degree connections who have never met them and would ignore intro requests.
* Treating a connection edge as automatically "warm" causes high friction and damaging rejections.
* By representing LinkedIn links purely as raw relationships supported by `linkedin` evidence, downstream qualification engines can cleanly distinguish superficial connections from high-conviction, evidence-backed routes.
* **Recency does not equal strength**: Even a freshly observed 2026 LinkedIn connection remains a weak edge without corroborating interaction evidence.

### 3. Interaction Evidence Semantics (`observedAt` vs. `interaction.occurredAt`)

A major architectural invariant established in Batch 2.1 and finalized in Batch 2.2 is the separation of ingestion metadata from real-world human interactions:

$$\text{OBSERVATION TIME} \neq \text{INTERACTION TIME}$$

* **`RelationshipEvidence.observedAt`**: The timestamp when Arcstone ingested or observed the evidence record.
* **`RelationshipEvidence.interaction`**: An optional structured payload (`InteractionEvidenceDetails`) recording human communication facts:
  * **`occurredAt`**: Required non-empty ISO date string of when the actual human interaction took place.
  * **`reciprocity`**:
    * `"two_way"`: Two-way mutual communication (e.g. exchanged emails, attended meetings).
    * `"one_way"`: One-way outbound attempt (e.g. cold pitch email, unanswered outreach).
    * `"unknown"`: Communication direction cannot be verified from raw record.
  * **`status`**:
    * `"confirmed"`: Verified completed interaction.
    * `"unconfirmed"`: Pending or unverified interaction (e.g. calendar invite without proof of attendance).

#### Why `email_history` Alone Does Not Imply a Reciprocal Relationship

An outbound unreplied email is `email_history`, but it represents `reciprocity: "one_way"`. In a fundraising workflow, an unanswered outbound pitch does not establish an introduction pathway; treating it as a warm tie risks damaging outreach and reputational harm. Therefore, outbound outreach alone results in `confirmation_required` with `ONE_WAY_OUTREACH_ONLY`.

#### Interaction Metadata Category Restrictions

To prevent semantic smuggling, interaction metadata is permitted ONLY on evidence categories capable of carrying assertions about human communication:
* **Allowed**: `direct_interaction` (`email_history`, `meeting_history`) and `founder_asserted` (`crm_history`, `user_reported`).
* **Forbidden**: `public_context` (`company_website`, `press_release`, `news_article`, `portfolio_page`, `event_page`) and `platform_signal` (`linkedin`). A static LinkedIn link or public webpage cannot carry synthetic interaction metadata. This invariant is strictly enforced by `assertDatasetIntegrity`.

### 4. Semantic Direction vs. Traversal Permission

`Relationship.from` and `Relationship.to` describe the **semantic orientation** of the observed relationship, and `Relationship.direction` defines whether the underlying real-world relationship is intrinsically directional or symmetric.

Crucially: **Semantic direction is NOT traversal permission.**
Whether a path can traverse an edge in reverse (e.g. an advisee reaching out through their advisor) is determined by future Path Generation and Qualification rules, not hardcoded into the edge's factual storage.

Canonical semantic orientation conventions:
* `works_at`: Person $\rightarrow$ Organization (`directed`)
* `founder_of`: Person $\rightarrow$ Organization (`directed`)
* `advisor`: Advisor $\rightarrow$ Advised Person/Organization (`directed`)
* `mentor`: Mentor $\rightarrow$ Mentee Person (`directed`)
* `invested_in`: Person/Organization $\rightarrow$ Organization (`directed`)
* `board_member`: Person $\rightarrow$ Organization (`directed`)
* `linkedin_connection`: Person $\leftrightarrow$ Person (`bidirectional`)
* `colleague`: Person $\leftrightarrow$ Person (`bidirectional`)
* `former_colleague`: Person $\leftrightarrow$ Person (`bidirectional`)
* `co_invested`: Person/Organization $\leftrightarrow$ Person/Organization (`bidirectional`)
* `known_personally`: Person $\leftrightarrow$ Person (`bidirectional`)

### 5. Early Definition of `PathCandidate` and `PathScore` Without Premature Generation

`PathCandidate` and `PathScore` contracts are declared in Batch 1 to establish the target interface boundary without coupling to any heuristic or scoring formula.

* Prevents premature architectural assumptions about graph traversal or path ranking.
* Enables strict contract testing and ensures the data pipeline will consume well-typed inputs and emit standardized candidate structures.

### 6. Closing the Learning Loop via Outcomes and Feedback

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
