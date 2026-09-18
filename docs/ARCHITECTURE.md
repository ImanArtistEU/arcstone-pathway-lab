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

1. **Network Visibility $\neq$ Introduction Credibility**: A weak tie or social graph connection may establish proximity, but Arcstone requires verifiable interaction or corroborated evidence before considering a relationship credible for a fundraising introduction.
2. **Observation Time $\neq$ Interaction Time**: The time Arcstone observes or ingests an evidence artifact (`observedAt`) is strictly decoupled from the time the human interaction occurred (`interaction.occurredAt`).
3. **Outreach $\neq$ Reciprocal Relationship**: One-way outbound outreach (e.g. unreplied email) does not constitute a reciprocal relationship and cannot qualify as introduction-eligible.

## Current status

Batch 2.2 — Qualification Contract Completion operational.

## Graph Semantics & Qualification Contract

* **Observed Semantic Facts**: Relationships store empirical facts rather than assumptions. `Relationship.from` and `Relationship.to` encode semantic direction (e.g., Advisor $\rightarrow$ Advised Person).
* **Direction vs. Traversal Permission**: Semantic edge direction is distinct from graph traversal permission. The fact that Marcus advises Elena does not prevent Elena from reaching Marcus; traversal rules are governed by downstream engines.
* **Relationship Qualification Contract**: Evaluates introduction usability deterministically. Qualification requires:
  1. Structural integrity and validated interaction metadata schema (`occurredAt`, `reciprocity`, `status`).
  2. Interaction metadata restricted strictly to human interaction categories (`direct_interaction`, `founder_asserted`).
  3. Valid reference evaluation date (`referenceDate`). Non-structural evaluations without a valid reference date yield `confirmation_required` with `INVALID_REFERENCE_DATE`.
  4. Precise evidence provenance: reason codes (`RECENT_DIRECT_INTERACTION` vs `RECENT_INTERNAL_EVIDENCE`) reflect the specific winning evidence record rather than aggregate heuristics.
* **Primary Fixture Negative Control**: Primary demonstration network strictly isolates Case D (Aurora Global Ventures / Isabel Torres) with zero non-structural edges, ensuring an absolute negative control for the future Path Generation engine. Edge cases (such as one-way unreplied emails) are isolated in separate test fixtures.
* **Path Generation**: Future path search determines valid traversals from founder to candidate target investors.
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
Path Generation [PLANNED]
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
