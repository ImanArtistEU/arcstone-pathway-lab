# Path Generation & Traversal Engine

## Core Purpose

Path generation answers a concrete structural question:

> **What known person-to-person introduction routes exist from the campaign founder(s) to candidate decision-makers inside a target investor organization?**

It discovers valid candidate routes through the qualified relationship network.

$$\mathbf{Path\ Discovery} \neq \mathbf{Path\ Ranking}$$

A discovered route is **not** necessarily the recommended route. Batch 3 discovers routes; subsequent pipeline stages decide path rejection, multi-dimensional scoring, target person selection, and recommended actions.

---

## Core Invariants

### 1. Invariant: Qualification Gates Traversal

$$\mathbf{Qualification\ Status} \implies \mathbf{Traversal\ Admission}$$

A relationship edge existing in the raw dataset does not make it traversable. It enters the traversal graph if and only if it has been evaluated by the Relationship Qualification Engine and satisfies:
* `status === "eligible"`, OR
* `status === "confirmation_required"` (when `policy.includeConfirmationRequired === true`).

Edges with status `ineligible` or `structural` are strictly barred from entering the introduction graph.

### 2. Invariant: Structural Context $\neq$ Introduction Edge

$$\mathbf{Structural\ Context} \neq \mathbf{Introduction\ Edge}$$

Structural relationships (such as `works_at`, `founder_of`, `board_member`, `invested_in`, `portfolio_founder`) define legal, institutional, or economic affiliations. They establish candidate investor affiliation (e.g. *"Sarah Chen works at Horizon Ventures"*), but an organization cannot facilitate or send a personal introduction.

Therefore, intro pathways consist **exclusively of person nodes** connected through qualified non-structural relationships. Structural edges are never traversed as hops.

### 3. Invariant: Organization $\neq$ Introducer

$$\mathbf{Organization} \neq \mathbf{Introducer}$$

Only human entities (`type: "person"`) possess social capital and the agency to introduce third parties. Any relationship with an organization endpoint (`Person → Org`, `Org → Person`, `Org → Org`) cannot serve as an introduction hop.

### 4. Invariant: Semantic Direction $\neq$ Traversal Direction

$$\mathbf{Semantic\ Direction} \neq \mathbf{Traversal\ Direction}$$

`Relationship.from` and `Relationship.to` define empirical semantic facts (e.g. `Marcus Thorne` advises `Elena Vance`). However, introduction workflows often require navigating against semantic direction:
* Advisees regularly request introductions through their advisors (`Elena → Marcus`).
* Mentees reach out through mentors (`Mentee → Mentor`).
* Introduced parties coordinate through the introducer.

---

## Traversal Policy

Traversal direction is governed centrally by `lib/pathway/traversalPolicy.ts`:

1. **Bidirectional Relationships** (`direction === "bidirectional"`):
   Traversable in both directions (`from → to` with `traversedReverse = false`, `to → from` with `traversedReverse = true`).
2. **Directed Relationships with Permitted Reverse Traversal**:
   For relationship types `advisor`, `mentor`, and `introduced`, reverse traversal (`to → from`) is explicitly permitted with `traversedReverse = true`.
3. **Other Directed Relationships**:
   Follow strictly `from → to` (`traversedReverse = false`). No reverse traversal is synthesized.

---

## Bounded Graph Search Algorithm

1. **Algorithm**: Bounded Breadth-First Search (BFS) starting independently from each campaign founder ID (`campaign.founderPersonIds`).
2. **Simple Path / Cycle Prevention**: Each candidate path tracks its set of visited person IDs. No person node may appear more than once in the same path.
3. **Target Candidate Termination**: As soon as a path reaches any candidate person ID in `targetInvestor.candidatePersonIds`, that path is emitted as a `PathCandidate` and its branch is **not** expanded further.
4. **Depth Bound (`maxRelationshipHops`)**:
   Paths are bounded to a maximum number of relationship hops (default: 3).

> [!IMPORTANT]
> `maxRelationshipHops = 3` is a working prototype **product hypothesis**, not a mathematical constant. Routes beyond 3 hops (e.g. Founder → Intermediary A → Intermediary B → Partner) suffer severe social decay and high drop-off in early-stage fundraising. This threshold will be calibrated against real introduction conversion rates in future batches.

---

## Multi-Founder & Multi-Target Support

* **Multi-Founder**: When a campaign has multiple founders, BFS searches independently from each founder. Every `PathCandidate` explicitly records `sourceFounderPersonId`.
* **Multi-Target Decision-Makers**: When a `TargetInvestor` lists multiple candidate decision-makers, routes to all candidates are preserved. Target selection is deferred to later pipeline stages.

---

## Path Classification & Dispositions

### Candidate Path Status (`PathCandidate.status`)
* **`eligible`**: Every relationship hop in the path is qualified as `eligible`.
  `requiresConfirmationRelationshipIds: []`.
* **`candidate`**: The path exists structurally, but one or more relationship hops have qualification status `confirmation_required`.
  `requiresConfirmationRelationshipIds` contains the specific relationship IDs requiring verification.

### Target Investor Dispositions (`PathGenerationResult.disposition`)
* **`eligible_path_available`**: At least one fully eligible path exists to a candidate decision-maker. `coldOutreachRequired = false`.
* **`confirmation_path_available`**: No fully eligible path exists, but at least one confirmation-required path exists. `coldOutreachRequired = false`.
  *(Note: This does not claim a guaranteed warm intro; it signals that founder confirmation is required before proceeding.)*
* **`no_known_path`**: Zero traversable paths exist within configured bounds. `coldOutreachRequired = true`.

---

## Determinism & Stable Identifiers

* **Path IDs**: Fully deterministic string format:
  `path:<targetInvestorId>:<sourceFounderPersonId>:<targetPersonId>:<rel1>[:rev]>...><relN>[:rev]`
* **Enumeration Order**: Paths are sorted first by hop count ascending, then alphabetically by stable path ID. This represents stable enumeration, not quality ranking.

---

## Limitations

* **No Ranking or Scoring**: Batch 3 does not compute path scores, tie-strength metrics, or "best path" badges.
* **No Rejection Logic**: Sub-optimal or conflicting paths are not pruned beyond cycle elimination and depth limits.
* **Pure Static Inference**: The engine operates strictly over static `PathwayDataset` data without external enrichment or dynamic LLM inference.
