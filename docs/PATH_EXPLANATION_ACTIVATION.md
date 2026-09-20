# Path Explanation & Activation Plan Specification (Batch 8)

## 1. Overview & Purpose

The Path Explanation & Activation Plan layer sits downstream of Target Person Selection in the Arcstone Pathway decision engine:

PathwayDataset
  → Relationship Qualification
  → Path Generation
  → Path Rejection
  → Path Scoring
  → Target Person Selection
  → **Path Explanation & Activation Plan**

This layer transforms raw pipeline data, scores, and relationship evidence into deterministic, factual explanations and structured activation steps for founders.

## 2. Core Invariants & Rules

1. **FROZEN UPSTREAM ENGINE**: This stage MUST NOT recompute upstream scores, rerun qualification, modify path rejection filters, or adjust selection weights.
2. **EXPLANATION ≠ INVENTION**: Every explanation bullet must be derived from actual pipeline evaluation results, evidence objects, or candidate scores.
3. **PREFERRED ROUTE ≠ GUARANTEED ROUTE**: Path recommendations represent relative scores under the current model; they do not guarantee introduction success.
4. **NO WARM PATH ≠ DIRECT OUTREACH RECOMMENDED**: When a target person is selected but no warm route exists, disposition is `no_retained_route_to_primary_target` and activation type is `relationship_discovery_required`. Cold outreach / direct messaging copy is NEVER recommended.
5. **ROUTE RECOMMENDATION SCOPE**: Route selection ONLY considers retained scored paths (`scoringResult.scoredPaths`) where `path.targetPersonId === primaryTargetPersonId`.
6. **TIE HANDLING**: If multiple routes share the highest score for the primary target, disposition is `ambiguous_top_routes` and `recommendedPathId` is `undefined`. No arbitrary tie-breaking is permitted.

## 3. Explanation Structure

- **Target Person Decision**: Explains why the lead partner was chosen, incorporating stage, sector, and geography match statuses, investment role, mandate index, and access quality. Includes explicit candidate comparisons.
- **Preferred Route**: Selects top scored path, formats full human route (e.g. `Elena Vance → Marcus Vance → Sarah Chen`), and provides comparative why-preferred statements.
- **Connection Evidence**: Details each hop, qualification status, recency, and underlying evidence items.
- **Weakest Link**: Identifies the bottleneck step (`bottleneckRelationshipId` or confirmation-required step) and provides recommended verification.
- **Activation Plan**: Generates deterministic action steps (`direct_relationship_activation`, `request_intro_from_intermediary`, `verify_then_request_intro`, `multi_hop_activation`, `relationship_discovery_required`).
- **Alternatives Considered**: Documents alternative retained routes and rejected routes to the primary target.
