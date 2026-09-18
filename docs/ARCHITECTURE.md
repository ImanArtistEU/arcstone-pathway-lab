# Arcstone Pathway Intelligence Lab

## Purpose

This repository is an isolated prototype environment for developing and validating Arcstone's Pathway Intelligence system before integration into the main Arcstone product.

## Development principle

Every major capability must be:
1. independently testable,
2. explainable,
3. based on explicit evidence,
4. validated before product integration.

## Core Invariants

$$\mathbf{NETWORK\ VISIBILITY} \neq \mathbf{INTRODUCTION\ CREDIBILITY}$$

$$\mathbf{OBSERVATION\ TIME} \neq \mathbf{INTERACTION\ TIME}$$

$$\mathbf{OUTREACH} \neq \mathbf{RECIPROCAL\ RELATIONSHIP}$$

$$\mathbf{QUALIFICATION\ GATES\ TRAVERSAL}$$

$$\mathbf{STRUCTURAL\ CONTEXT} \neq \mathbf{INTRODUCTION\ EDGE}$$

$$\mathbf{PATH\ GENERATION} \neq \mathbf{PATH\ RANKING}$$

$$\mathbf{ANALYSIS\ ERROR} \neq \mathbf{NO\ KNOWN\ PATH}$$

$$\mathbf{POLICY\ FILTERING} \neq \mathbf{NO\ KNOWN\ PATH}$$

$$\mathbf{PATH\ EXISTENCE} \neq \mathbf{PATH\ VIABILITY}$$

$$\mathbf{REJECTION} \neq \mathbf{RANKING}$$

$$\mathbf{RETAINED} \neq \mathbf{RECOMMENDED}$$

$$\mathbf{ALL\ PATHS\ REJECTED} \neq \mathbf{COLD\ OUTREACH\ REQUIRED}$$

$$\mathbf{SCORE} \neq \mathbf{PROBABILITY}$$

$$\mathbf{SCORING} \neq \mathbf{RECOMMENDATION}$$

$$\mathbf{SCORING} \neq \mathbf{TARGET\ PERSON\ SELECTION}$$

$$\mathbf{REJECTED\ PATHS} \neq \mathbf{SCOREABLE\ PATHS}$$

$$\mathbf{WEAKEST\ LINK\ MATTERS}$$

1. **Network Visibility $\neq$ Introduction Credibility**: A weak tie or social graph connection may establish proximity, but Arcstone requires verifiable interaction or corroborated evidence before considering a relationship credible for a fundraising introduction.
2. **Observation Time $\neq$ Interaction Time**: The time Arcstone observes or ingests an evidence artifact (`observedAt`) is strictly decoupled from the time the human interaction occurred (`interaction.occurredAt`).
3. **Outreach $\neq$ Reciprocal Relationship**: One-way outbound outreach (e.g. unreplied email) does not constitute a reciprocal relationship and cannot qualify as introduction-eligible.
4. **Qualification Gates Traversal**: Raw relationships cannot enter graph traversal without satisfying qualification admission criteria (`eligible` or `confirmation_required` when permitted).
5. **Structural Context $\neq$ Introduction Edge**: Legal, organizational, and corporate affiliations (`works_at`, `board_member`, etc.) establish context, but organizations cannot introduce anyone. Pathways consist exclusively of person nodes.
6. **Path Generation $\neq$ Path Ranking**: Path discovery discovers all valid simple routes within depth bounds. Ranking, multi-dimensional scoring, and target selection occur in subsequent pipeline stages.
7. **Analysis Error $\neq$ No Known Path**: Input validation errors, missing entities, invalid reference dates, or unverified affiliations yield `executionStatus: "error"`, `disposition: null`, `coldOutreachRequired: null`. Arcstone never reports `no_known_path` when analysis fails.
8. **Policy Filtering $\neq$ No Known Path**: Excluding confirmation paths via `includeConfirmationRequired: false` yields `disposition: "confirmation_paths_filtered"` and `coldOutreachRequired: false`. Excluding routes by configuration is distinct from their absence in the network.
9. **Path Existence $\neq$ Path Viability**: A route existing structurally in the graph does not guarantee usability. Path Rejection filters out unreliable or data-flawed routes.
10. **Rejection $\neq$ Ranking**: Path Rejection applies pass/fail viability bounds without computing scores or ranking surviving routes.
11. **Retained $\neq$ Recommended**: Retained paths merely survive viability filters; recommendation decisions occur in subsequent pipeline stages.
12. **All Paths Rejected $\neq$ Cold Outreach Required**: Rejection evaluates candidate path viability; it does not decide outreach strategy.
13. **Score $\neq$ Probability**: Numeric priority scores are uncalibrated heuristics. An 82/100 index is not an 82% probability of introduction, meeting, or investment.
14. **Scoring $\neq$ Recommendation**: Path Scoring computes component scores and a priority index for retained paths. It does not select winners or recommend outreach.
15. **Scoring $\neq$ Target Person Selection**: Scoring evaluates route quality, not which decision-maker to target inside an investor organization.
16. **Rejected Paths $\neq$ Scoreable Paths**: Paths rejected by Path Rejection receive no score.
17. **Weakest Link Matters**: Path-level credibility and freshness are governed by the minimum component score across all steps in the path.

## Current status

Batch 5 — Deterministic Path Scoring / Priority Index operational.

## Graph Semantics & Path Traversal

* **Observed Semantic Facts**: Relationships store empirical facts rather than assumptions. `Relationship.from` and `Relationship.to` encode semantic direction (e.g., Advisor $\rightarrow$ Advised Person).
* **Direction vs. Traversal Permission**: Semantic edge direction is distinct from graph traversal permission. The fact that Marcus advises Elena does not prevent Elena from reaching Marcus; traversal rules are governed by centralized `TraversalPolicy`.
* **Person-Only Introduction Graph**: Only relationships between two person nodes enter traversal. Structural affiliations provide target context but are never traversed as hops.
* **Target Candidate Affiliation Verification**: Candidates must be verifiably affiliated via `currentOrganizationIds` or a structural `works_at` edge. Unverified affiliations fail closed.
* **Deterministic Bounded BFS**: Explores all simple paths from each founder to candidate target people up to `maxRelationshipHops` (default 3), eliminating cycles.
* **Deterministic Path Rejection**: Filters generated candidates based on hard data-quality rules (one-way outreach, invalid/future interaction dates) and compounding uncertainty limits (`maxConfirmationRequiredHops`).
* **Deterministic Path Scoring**: Computes four component scores (Relationship Credibility, Temporal Freshness, Confirmation Readiness, Path Efficiency) and a weighted overall Priority Index for retained paths using the weakest-link principle.
* **Primary Fixture Negative Control**: Primary demonstration network strictly isolates Case D (Aurora Global Ventures / Isabel Torres) with zero non-structural edges, ensuring an absolute negative control for Path Generation.
* **Referential Consistency**: Relationships and evidence are strictly bound with bidirectional referential integrity, preventing dangling or misattributed citations.

## Continuous Integration

GitHub Actions CI (`.github/workflows/ci.yml`) independently validates every commit and pull request targeting `main`:
* TypeScript typechecking (`npm run typecheck`)
* Unit & regression test suite (`npm run test`)
* ESLint validation (`npm run lint`)
* Production build (`npm run build`)

## Planned High-Level Deterministic Pipeline

```
PathwayDataset [IMPLEMENTED]
      ↓
Relationship Qualification [IMPLEMENTED]
      ↓
Path Generation [IMPLEMENTED]
      ↓
Path Rejection [IMPLEMENTED]
      ↓
Path Scoring [IMPLEMENTED]
      ↓
Target Person Selection [PLANNED]
      ↓
Explanation / Recommended Action [PLANNED]
      ↓
Outcome / Founder Feedback [PLANNED]
```
