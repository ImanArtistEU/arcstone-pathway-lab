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

$$\mathbf{EXPLANATION\ MUST\ MATCH\ EVIDENCE}$$

$$\mathbf{MALFORMED\ PATH} \neq \mathbf{SCOREABLE\ PATH}$$

$$\mathbf{SCORING\ OUTPUT\ MUST\ NOT\ MUTATE\ UPSTREAM\ STATE}$$

$$\mathbf{RIGHT\ PERSON} \neq \mathbf{EASIEST\ PERSON\ TO\ REACH}$$

$$\mathbf{TARGET\ FIT} \neq \mathbf{ACCESS\ QUALITY}$$

$$\mathbf{NO\ WARM\ PATH} \neq \mathbf{WRONG\ TARGET\ PERSON}$$

$$\mathbf{SELECTION} \neq \mathbf{OUTREACH\ RECOMMENDATION}$$

$$\mathbf{CANDIDATE\ DISCOVERY} \neq \mathbf{TARGET\ PERSON\ SELECTION}$$

$$\mathbf{MISSING\ PERSON\ CONTEXT} \neq \mathbf{PERSON\ IRRELEVANCE}$$

$$\mathbf{MISSING\ STARTUP\ CONTEXT} \neq \mathbf{NO\ MATCH}$$

$$\mathbf{MALFORMED\ PROFILE} \neq \mathbf{VALID\ PROFILE}$$

$$\mathbf{EXPLANATION\ MUST\ MATCH\ ACTUAL\ FIT}$$

$$\mathbf{CURRENT\ AFFILIATION\ MUST\ ACTUALLY\ BE\ CURRENT}$$

$$\mathbf{MISSING\ STARTUP\ RECORD} \neq \mathbf{ORGANIZATION\ FALLBACK}$$

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
18. **Explanation Must Match Evidence**: Path-level text explanations are derived strictly from computed step-level evidence snapshots without hardcoded assumptions or unverified evidence claims.
19. **Malformed Path $\neq$ Scoreable Path**: Retained path shapes are validated before scoring; malformed, zero-step, or invalid paths fail closed with explicit execution error states.
20. **Scoring Output Must Not Mutate Upstream State**: Output scored path candidates are deep-cloned across all nested structures to guarantee upstream immutability.
21. **Right Person $\neq$ Easiest Person to Reach**: Functional role and mandate thesis fit dominate access quality. A junior non-investment contact is excluded regardless of path score.
22. **Target Fit $\neq$ Access Quality**: Mandate fit and graph access quality are calculated independently before combining into an overall priority index.
23. **No Warm Path $\neq$ Wrong Target Person**: Candidates with zero warm paths can still be selected as primary target if mandate fit is superior.
24. **Selection $\neq$ Outreach Recommendation**: Selection answers *WHO* to prioritize, not *HOW* to reach out or message them.
25. **Candidate Discovery $\neq$ Target Person Selection**: Candidates are supplied explicitly in `TargetInvestor.candidatePersonIds`. Selection does not discover external people.
26. **Missing Person Context $\neq$ Person Irrelevance**: Missing target person profiles yield `insufficient_context` rather than silent candidate exclusion.

27. **Missing Startup Context $\neq$ No Match**: Missing startup stage, sector, or geography context yields `unknown` (score 50), not `no_match`.
28. **Malformed Profile $\neq$ Valid Profile**: Profile focus arrays must contain non-empty strings and metadata strings must be valid types; malformed profiles fail closed.
29. **Explanation Must Match Actual Fit**: Candidate explanations are derived strictly from computed role, stage, sector, geography, and access indices without qualitative claims.
30. **Current Affiliation Must Actually Be Current**: `works_at` affiliations are temporally evaluated against `referenceDate` (`startedAt <= referenceDate` and `endedAt > referenceDate`); stale or future affiliations do not verify.
31. **Missing Startup Record $\neq$ Organization Fallback**: Target Person Selection requires an actual `Startup` record from `dataset.startups`; `Organization` fallback is forbidden.

32. **EXPLANATION ≠ INVENTION**: Explanations must be derived strictly from computed evaluation results, evidence objects, or candidate scores.
33. **PREFERRED ROUTE ≠ GUARANTEED ROUTE**: Path recommendations represent relative priority indices, not guaranteed introduction success.
34. **NO WARM PATH ≠ DIRECT OUTREACH RECOMMENDED**: When a target person is selected but no warm route exists, activation type is `relationship_discovery_required`. Cold outreach / message copy is NEVER recommended.
35. **ROUTE RECOMMENDATION SCOPE**: Route selection ONLY considers retained scored paths (`scoringResult.scoredPaths`) where `path.targetPersonId === primaryTargetPersonId`.
36. **TIED ROUTES ≠ ARBITRARY WINNER**: If multiple top routes share the highest score for the primary target, disposition is `ambiguous_top_routes` and `recommendedPathId` is `undefined`. No arbitrary tie-breaking is permitted.
37. **WHY THIS ROUTE MUST BE COMPARATIVE**: Why-preferred statements compare the top route against alternative retained scored routes across credibility, freshness, confirmation, and efficiency.
38. **EVIDENCE EXISTENCE ≠ ARCSTONE OBSERVABILITY**: Evidence existing in external history does not imply Arcstone has access or authorization to observe it.
39. **PRIVATE COMMUNICATION ≠ ACCESSIBLE EVIDENCE**: Private email/calendar records are ONLY observable when a connected campaign founder is a direct endpoint.
40. **PUBLIC PROXIMITY ≠ CONFIRMED INTERPERSONAL RELATIONSHIP**: Public co-investment, board, or news listings prove structural context, but CANNOT produce confirmed direct two-way interaction.
41. **USER ASSERTION ≠ VERIFIED INTERACTION**: User-reported evidence records founder assertions without raw system log verification.
42. **CONNECTED FOUNDER DATA ≠ THIRD-PARTY INBOX ACCESS**: Founder inbox authorization NEVER grants observability into private communications between third parties.

## Current status

Batch 8.1 — Evidence Observability & Provenance Hardening implemented.

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

## High-Level Deterministic Pipeline

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
Target Person Selection [IMPLEMENTED]
      ↓
Path Explanation & Activation Plan [IMPLEMENTED]
      ↓
Outcome / Founder Feedback [PLANNED]
```

## Validation Harness

* **Pilot Harness (`analyzePilotDataset`, `loadPilotCsvBundle`, `runPilot.ts`)**: A wrapper validation harness that ingests real-world CSV dataset bundles, normalizes raw entities, validates strict contract constraints (single startup, single campaign, derived founders, candidate people, status requirements), and executes the frozen decision pipeline. It is strictly decoupled from pipeline heuristics, never mutates state, and guarantees 100% deterministic, byte-equivalent JSON and Markdown report outputs for identical inputs and reference dates.

