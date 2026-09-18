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

1. **Network Visibility $\neq$ Introduction Credibility**: A weak tie or social graph connection may establish proximity, but Arcstone requires verifiable interaction or corroborated evidence before considering a relationship credible for a fundraising introduction.
2. **Observation Time $\neq$ Interaction Time**: The time Arcstone observes or ingests an evidence artifact (`observedAt`) is strictly decoupled from the time the human interaction occurred (`interaction.occurredAt`).
3. **Outreach $\neq$ Reciprocal Relationship**: One-way outbound outreach (e.g. unreplied email) does not constitute a reciprocal relationship and cannot qualify as introduction-eligible.
4. **Qualification Gates Traversal**: Raw relationships cannot enter graph traversal without satisfying qualification admission criteria (`eligible` or `confirmation_required` when permitted).
5. **Structural Context $\neq$ Introduction Edge**: Legal, organizational, and corporate affiliations (`works_at`, `board_member`, etc.) establish context, but organizations cannot introduce anyone. Pathways consist exclusively of person nodes.
6. **Path Generation $\neq$ Path Ranking**: Path discovery discovers all valid simple routes within depth bounds. Ranking, multi-dimensional scoring, and target selection occur in subsequent pipeline stages.

## Current status

Batch 3 — Deterministic Path Generation & Traversal Engine operational.

## Graph Semantics & Path Traversal

* **Observed Semantic Facts**: Relationships store empirical facts rather than assumptions. `Relationship.from` and `Relationship.to` encode semantic direction (e.g., Advisor $\rightarrow$ Advised Person).
* **Direction vs. Traversal Permission**: Semantic edge direction is distinct from graph traversal permission. The fact that Marcus advises Elena does not prevent Elena from reaching Marcus; traversal rules are governed by centralized `TraversalPolicy`.
* **Person-Only Introduction Graph**: Only relationships between two person nodes enter traversal. Structural affiliations provide target context but are never traversed as hops.
* **Deterministic Bounded BFS**: Explores all simple paths from each founder to candidate target people up to `maxRelationshipHops` (default 3), eliminating cycles.
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
Path Rejection [PLANNED]
      ↓
Path Scoring [PLANNED]
      ↓
Target Person Selection [PLANNED]
      ↓
Explanation / Recommended Action [PLANNED]
      ↓
Outcome / Founder Feedback [PLANNED]
```
