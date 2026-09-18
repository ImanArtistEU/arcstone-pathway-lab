# Arcstone Pathway Intelligence Lab

## Purpose

This repository is an isolated prototype environment for developing and validating Arcstone's Pathway Intelligence system before integration into the main Arcstone product.

## Development principle

Every major capability must be:
1. independently testable,
2. explainable,
3. based on explicit evidence,
4. validated before product integration.

## Current status

Batch 1 — Domain model and synthetic network fixtures.

## Graph Semantics

* **Observed Semantic Facts**: Relationships store empirical facts rather than assumptions. `Relationship.from` and `Relationship.to` encode semantic direction (e.g., Advisor $\rightarrow$ Advised Person).
* **Direction vs. Traversal Permission**: Semantic edge direction is distinct from graph traversal permission. The fact that Marcus advises Elena does not prevent Elena from reaching Marcus; traversal rules are governed by downstream engines.
* **Relationship Qualification**: Future deterministic rules evaluate relationship usability, freshness, and evidence weight.
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
Relationship Qualification [PLANNED]
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
