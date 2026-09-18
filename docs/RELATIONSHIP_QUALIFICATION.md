# Relationship Qualification Engine

## Core Purpose

Relationship qualification answers a single, operational question:

> **Can Arcstone credibly consider this relationship usable in a future fundraising introduction pathway?**

It does **not** attempt to calculate personal friendship, measure subjective closeness, or generate path recommendations. Instead, it deterministically classifies whether there is adequate evidentiary support to present a relationship as an introduction route without misrepresenting superficial network proximity or unreciprocated outreach as a warm personal introduction.

$$\mathbf{Network\ Visibility} \neq \mathbf{Introduction\ Credibility}$$

---

## Core Invariants

### 1. Invariant: Observation Time $\neq$ Interaction Time

$$\mathbf{Observation\ Time} \neq \mathbf{Interaction\ Time}$$

* `observedAt`: When Arcstone observed, ingested, or recorded this evidence artifact (e.g. crawler ingestion timestamp or onboarding survey submission date).
* `interaction.occurredAt`: When the underlying human interaction actually happened.

*Example*: A founder completes onboarding today (`observedAt: 2026-09-18`) and states: *"I last spoke to this former colleague when we both worked at Acuna Labs in May 2016."*
The observation is recent; the interaction occurred in 2016. Recency evaluation must strictly use the interaction date (`2016-05-30`), classifying the relationship as `stale` (> 730 days).

### 2. Invariant: Outreach $\neq$ Reciprocal Relationship

$$\mathbf{Outreach} \neq \mathbf{Reciprocal\ Relationship}$$

* `reciprocity: "two_way"`: Both parties demonstrably engaged and replied.
* `reciprocity: "one_way"`: One side initiated contact, with no demonstrated reply.
* `status: "confirmed"`: The interaction itself is known to have occurred.
* `status: "unconfirmed"`: The record suggests or schedules an interaction (such as an unverified calendar invite), but completion is unconfirmed.

*Example*: A founder sends an unsolicited pitch email to a VC partner last week (`reciprocity: "one_way"`). Even though the outreach occurred very recently, it is **outreach**, not a reciprocal relationship. It cannot qualify as `eligible` and yields `status: confirmation_required` with reason code `ONE_WAY_OUTREACH_ONLY`.

---

## Conceptual Research Rationale

Social network theory recognizes that tie strength is multidimensional. Granovetter's classic "strength of weak ties" demonstrates that acquaintances often provide novel network reach. However, fundraising introductions require more than mere reach: they demand **credibility, social capital, and willingness to facilitate**.

A founder reaching out through an unverified weak tie (e.g. an uncorroborated LinkedIn connection, unreplied outreach, or co-conference attendee) risks burned bridges, unanswered emails, and damaged reputation. Arcstone therefore deliberately separates **network visibility** from **introduction credibility**.

---

## Working Product Hypotheses (Important Notice)

> [!IMPORTANT]
> The thresholds (<= 365 days for `recent`, 366–730 days for `aging`, > 730 days for `stale`) and eligibility rules implemented in Batch 2 and 2.1 are **prototype product hypotheses**, NOT academically proven fundraising constants or scientific truths.
>
> In production, these hypotheses **must** be continuously calibrated against real-world fundraising outcomes:
> * Founder feedback (`accurate` vs `inaccurate`)
> * Introduction request acceptance rates
> * Intermediary reply rates
> * Investor meetings booked
> * Downstream investment outcomes

---

## Relationship Classification

Every relationship edge is deterministically classified into one of three semantic classes:

1. **`structural`**: Formal organizational, legal, or economic positions (e.g., `works_at`, `founder_of`, `invested_in`, `board_member`).
   * *Status*: `structural`
   * *Role*: Provides factual entity context; not an interpersonal introduction edge itself.
2. **`interpersonal`**: Human-to-human relationships with inherent communication or advisory potential (e.g., `advisor`, `mentor`, `colleague`, `former_colleague`, `known_personally`, `introduced`).
   * *Status*: Can qualify as `eligible` or `confirmation_required` depending on recency and verified interaction evidence.
3. **`network_signal`**: Proximal or associative ties (e.g., `linkedin_connection`, `co_invested`, `accelerator_cohort`, `university_connection`, `event_connection`).
   * *Status*: Default `confirmation_required` unless corroborated by verified direct interaction.

---

## Evidence Categorization and Interaction Metadata

Evidence is partitioned into four categories:

* **`direct_interaction`** (`email_history`, `meeting_history`): Direct communication records.
* **`founder_asserted`** (`crm_history`, `user_reported`): First-party recorded data from founder records or onboarding disclosures.
* **`public_context`** (`company_website`, `portfolio_page`, `press_release`, `news_article`, `public_profile`, `event_page`, `manual_research`): Publicly corroborating directories and announcements.
* **`platform_signal`** (`linkedin`): Social network connection states.

### Interaction Details (`InteractionEvidenceDetails`)

```typescript
export interface InteractionEvidenceDetails {
  occurredAt: string;
  reciprocity: "two_way" | "one_way" | "unknown";
  status: "confirmed" | "unconfirmed";
}
```

* For introduction **eligibility**, direct interaction evidence must have:
  * `status === "confirmed"`
  * `reciprocity === "two_way"`
  * `occurredAt` within the `recent` window (<= 365 days).

---

## Why LinkedIn-Only Is Insufficient

A 1st-degree LinkedIn connection indicates network registration, not relationship warmth or willingness to facilitate an introduction.
* Founders and investors often accumulate thousands of connections without ever conversing.
* Treating LinkedIn connections as automatic introductions generates high friction and high rejection rates.
* **Recency invariant**: Even a recently established LinkedIn connection without interaction records yields `status: confirmation_required` with reason codes `LINKEDIN_ONLY` and `NO_DIRECT_INTERACTION`.

---

## Why Public Co-Occurrence Is Insufficient

Two investors appearing on the same portfolio page or press release proves co-investment context. It does **not** prove they talk, like each other, or would introduce a third party.
* **Rule I**: Multiple public sources alone cannot upgrade a network signal into `eligible`. Five press articles are still not five interactions.
* Co-investment edges (`co_invested`) remain `confirmation_required` unless backed by direct communication (e.g. board email threads or verified meetings).

---

## Historical Fallbacks & Temporal Integrity

1. **`former_colleague` fallback**: `relationship.endedAt` may serve as a conservative fallback when explicit interaction records are absent. This fallback **never** qualifies an edge as `eligible`; it only differentiates `aging` from `stale`.
2. **Future dates**: Purported interaction dates after `referenceDate` yield `status: confirmation_required`, `recency: unknown`, and reason code `FUTURE_INTERACTION_DATE`.
3. **Invalid interaction dates**: Unparseable date strings in `interaction.occurredAt` yield `status: confirmation_required`, `recency: unknown`, and reason code `INVALID_INTERACTION_DATE`.
4. **Invalid reference evaluation date**: A valid `referenceDate` is strictly required for temporal qualification. Any non-structural relationship evaluated against an invalid or unparseable `referenceDate` deterministically yields `status: confirmation_required`, `recency: unknown`, and reason code `INVALID_REFERENCE_DATE`. It can never become eligible. Structural relationships remain `status: structural`.

---

## Qualification Reason Provenance

In Batch 2.2, eligibility reason codes strictly reflect the actual evidence record that establishes the winning/latest qualifying confirmed two-way interaction:

* If the winning confirmed two-way interaction comes from a `direct_interaction` record (`email_history`, `meeting_history`), the engine emits `RECENT_DIRECT_INTERACTION`.
* If the winning confirmed two-way interaction comes from a `founder_asserted` record (`crm_history`, `user_reported`), the engine emits `RECENT_INTERNAL_EVIDENCE`.

Reason assignment is **not** inferred from aggregate counts. For example, if a relationship has older or one-way emails alongside a fresh, confirmed two-way CRM advisory entry, the winning interaction is founder-asserted, correctly emitting `RECENT_INTERNAL_EVIDENCE` rather than `RECENT_DIRECT_INTERACTION`.

---

## Fixture Integrity & Case D Negative Control

The primary demonstration dataset (`pathwayDemoDataset`) strictly isolates **Case D — No Known Path** (Aurora Global Ventures / Isabel Torres):
* Founder Elena Vance has zero network ties or outreach edges to Isabel Torres or Aurora Global Ventures.
* The only relationship involving Isabel in `pathwayDemoDataset` is her structural employment affiliation (`works_at` Aurora Global Ventures).
* Outbound outreach edge cases (such as cold unreplied emails) are isolated in `data/fixtures/qualification-edge-cases.ts` to prevent contamination of Case D as a pure zero-path benchmark for future graph traversal.

---

## Reason Codes and Determinism

Qualification decisions emit machine-readable reason codes alongside template explanations:

| Reason Code | Meaning |
|---|---|
| `STRUCTURAL_RELATIONSHIP` | Organizational or formal role; not an intro edge. |
| `RECENT_DIRECT_INTERACTION` | Verified two-way email or meeting within recent window (<= 365 days). |
| `RECENT_INTERNAL_EVIDENCE` | Verified founder-asserted two-way interaction within recent window. |
| `LINKEDIN_ONLY` | Supported exclusively by platform connection signal. |
| `PUBLIC_CONTEXT_ONLY` | Supported only by public pages/press without direct communication. |
| `NETWORK_SIGNAL_ONLY` | Co-occurrence or network proximity without interpersonal interaction. |
| `NO_DIRECT_INTERACTION` | Missing verifiable email or meeting records. |
| `ONE_WAY_OUTREACH_ONLY` | Outbound communication without demonstrated reciprocal response. |
| `UNCONFIRMED_INTERACTION` | Unconfirmed interaction record (e.g. unverified calendar invite). |
| `FUTURE_INTERACTION_DATE` | Interaction date occurs in the future relative to reference date. |
| `INVALID_INTERACTION_DATE` | Interaction date is malformed or unparseable. |
| `INVALID_REFERENCE_DATE` | Reference evaluation date provided is invalid or unparseable. |
| `AGING_INTERACTION` | Interaction observed between 366 and 730 days ago. |
| `STALE_INTERACTION` | Interaction observed over 730 days ago. |
| `NO_EVIDENCE` | Zero evidentiary records attached to relationship edge. |

---

## Limitations

* **Deterministic bounds**: The engine only knows what is represented in `PathwayDataset`. It does not guess missing data.
* **No traversal or pathing**: Batch 2.1 qualifies individual edges in isolation. Combining edges into multi-hop paths is handled in Batch 3.
