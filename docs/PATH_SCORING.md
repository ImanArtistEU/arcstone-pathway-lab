# Path Scoring & Priority Index Engine

## Purpose

Path Scoring answers the priority description question:

> **How should Arcstone describe the relative quality of each surviving introduction pathway using the evidence currently available?**

After invalid or overly speculative paths have been filtered out by Path Rejection, Path Scoring calculates deterministic, explainable component scores and an overall Priority Index for retained paths.

---

## Core Invariants

### 1. Invariant: Score $\neq$ Probability

$$\mathbf{Score} \neq \mathbf{Probability}$$

A score of **82 / 100** does **NOT** mean an 82% chance of introduction, meeting, or investment. Scores are **uncalibrated heuristic priority indices** used to structure human decision-making.

### 2. Invariant: Scoring $\neq$ Recommendation

$$\mathbf{Scoring} \neq \mathbf{Recommendation}$$

Path Scoring calculates priority indices for surviving routes. It does not select a "winning" route, recommend outreach actions, or label paths as "best".

### 3. Invariant: Scoring $\neq$ Target Person Selection

$$\mathbf{Scoring} \neq \mathbf{Target\ Person\ Selection}$$

Path Scoring evaluates route quality. It does not choose which decision-maker inside an investor organization to target.

### 4. Invariant: Rejected Paths $\neq$ Scoreable Paths

$$\mathbf{Rejected\ Paths} \neq \mathbf{Scoreable\ Paths}$$

Paths rejected by Path Rejection receive **NO SCORE**. A rejected path is never assigned an `overallPriorityIndex`.

### 5. Invariant: Weakest Link Control

$$\mathbf{Path\ Credibility} = \min_{i} (\mathbf{Step\ Credibility}_i)$$

$$\mathbf{Path\ Freshness} = \min_{i} (\mathbf{Step\ Freshness}_i)$$

An introduction pathway is a chain. A weak or stale intermediary cannot be "averaged away" by another strong intermediary. The weakest link governs path-level credibility and freshness.

### 6. Invariant: Explanation Must Match Actual Evidence

$$\mathbf{Explanation} \subseteq \mathbf{Computed\ Step\ Evidence}$$

Path explanations are generated strictly from computed step-level evidence snapshots (`stepScores`). An explanation never hardcodes assumptions (such as "Both hops" or assuming all steps are direct interactions) and never claims evidence not present in the step snapshot.

### 7. Invariant: Malformed Path $\neq$ Scoreable Path

$$\mathbf{Malformed\ Path} \Rightarrow \mathbf{Execution\ Error}$$

The scoring engine validates every retained path before scoring. If any retained path is structurally invalid (e.g. status is `rejected`, zero steps, step length mismatch, invalid recency, or invalid/missing `EvidenceSummary`), scoring fails closed with `executionStatus: "error"`. `EvidenceSummary` is strictly validated and never fabricated inside scoring.

### 8. Invariant: Scoring Output is Immutable from Upstream State

$$\mathbf{ScoredPath.path} \cap \mathbf{UpstreamPath} = \emptyset \quad (\text{Deep Cloned})$$

Scored paths deep-clone all nested arrays (`nodes`, `relationshipIds`, `requiresConfirmationRelationshipIds`, `steps`, `qualificationReasonCodes`, `qualificationEvidenceSummary`) so post-scoring mutations to output objects cannot corrupt upstream state.

---

## Scoring Dimensions & Default Policy

The Priority Index is computed from four weighted component scores:

$$\text{Overall Priority Index} = \mathbf{round}\left( 0.45 \cdot \text{Credibility} + 0.25 \cdot \text{Freshness} + 0.20 \cdot \text{Readiness} + 0.10 \cdot \text{Efficiency} \right)$$

| Dimension | Default Weight | Range | Definition |
| :--- | :---: | :---: | :--- |
| **Relationship Credibility** | **45%** | 0–100 | Minimum step credibility based on evidence type and qualification tier. |
| **Temporal Freshness** | **25%** | 0–100 | Minimum step freshness based on recency bucket. |
| **Confirmation Readiness** | **20%** | 0–100 | Friction penalty based on count of confirmation-required hops. |
| **Path Efficiency** | **10%** | 0–100 | Friction penalty based on total relationship hop count. |

---

## Component Formulas & Tiers

### 1. Relationship Credibility Tiers (Per Step)

#### Eligible Relationships
* **`RECENT_DIRECT_INTERACTION`**: 100 (Recent confirmed direct interaction)
* **`RECENT_INTERNAL_EVIDENCE`**: 90 (Recent founder-asserted internal evidence)
* **Eligible Fallback**: 85

#### Confirmation-Required Relationships
* **Confirmed Historical Interaction** (`confirmedTwoWayInteraction > 0`): 75
* **Founder-Asserted Confirmation** (`founderAsserted > 0`): 65
* **Unconfirmed Interaction** (`unconfirmedInteraction > 0`): 50
* **Platform Signal / LinkedIn** (`platformSignal > 0`): 40
* **Public Context** (`publicContext > 0`): 35
* **Confirmation Fallback**: 45

### 2. Temporal Freshness Mapping (Per Step)
* **`recent`**: 100
* **`aging`**: 70
* **`stale`**: 35
* **`unknown`**: 50

### 3. Confirmation Readiness Formula (Path-Level)

$$\text{Confirmation Readiness} = \max\left(0, 100 - (\text{Confirmation Hop Count} \times 45)\right)$$

* 0 confirmation hops: 100
* 1 confirmation hop: 55
* 2 confirmation hops: 10
* $\ge 3$ confirmation hops: 0

### 4. Path Efficiency Formula (Path-Level)

$$\text{Path Efficiency} = \max\left(0, 100 - (\max(0, \text{Hop Count} - 1) \times 20)\right)$$

* 1 relationship hop: 100
* 2 relationship hops: 80
* 3 relationship hops: 60

---

## Order Preservation ($\text{Scoring} \neq \text{Ranking}$)

Path Scoring strictly preserves the order of `rejectionResult.retainedPaths`. It does **NOT** reorder or sort paths by score. Ordering and recommendation decisions are deferred to subsequent decision stages.

---

## Current Demo Scores

Under default policy (`2026-09-18` reference date):

* **Horizon Ventures** (Elena $\rightarrow$ Marcus $\rightarrow$ Sarah):
  - **Priority Index**: **98 / 100**
  - **Credibility**: 100 | **Freshness**: 100 | **Readiness**: 100 | **Efficiency**: 80
  - Status: `uncalibrated_heuristic` (`isProbability: false`)
* **Beacon Capital** (Elena $\rightarrow$ David):
  - **Priority Index**: **52 / 100**
  - **Credibility**: 40 | **Freshness**: 50 | **Readiness**: 55 | **Efficiency**: 100
  - Status: `uncalibrated_heuristic` (`isProbability: false`)
* **Summit Ridge Capital**: **NOT SCORED** (Rejected by Path Rejection for excess confirmation hops).
* **Aurora Global Ventures**: **NOT SCORED** (No generated path).

---

## Calibration Requirement & Limitations

> [!IMPORTANT]
> All weights and score values in Batch 5 are working **product hypotheses**. They are **uncalibrated heuristics**.
>
> In future iterations, these weights must be empirically calibrated using actual fundraising outcome feedback:
> * Founder confirms relationship
> * Intro requested
> * Intro accepted
> * Reply received
> * Meeting booked
> * Investor pass
> * Investment completed
