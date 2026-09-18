# Relationship Qualification Engine

## Core Purpose

Relationship qualification answers a single, operational question:

> **Can Arcstone credibly consider this relationship usable in a future fundraising introduction pathway?**

It does **not** attempt to calculate personal friendship, measure subjective closeness, or generate path recommendations. Instead, it deterministically classifies whether there is adequate evidentiary support to present a relationship as an introduction route without misrepresenting superficial network proximity as a warm personal introduction.

$$\mathbf{Network\ Visibility} \neq \mathbf{Introduction\ Credibility}$$

---

## Conceptual Research Rationale

Social network theory recognizes that tie strength is multidimensional. Granovetter's classic "strength of weak ties" demonstrates that acquaintances often provide novel network reach. However, fundraising introductions require more than mere reach: they demand **credibility, social capital, and willingness to facilitate**.

A founder reaching out through an unverified weak tie (e.g. an uncorroborated LinkedIn connection or co-conference attendee) risks burned bridges, unanswered emails, and damaged reputation. Arcstone therefore deliberately separates **network visibility** from **introduction credibility**.

---

## Working Product Hypotheses (Important Notice)

> [!IMPORTANT]
> The thresholds (<= 365 days for `recent`, 366–730 days for `aging`, > 730 days for `stale`) and eligibility rules implemented in Batch 2 are **prototype product hypotheses**, NOT academically proven fundraising constants or scientific truths.
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
   * *Status*: Can qualify as `eligible` or `confirmation_required` depending on recency and interaction evidence.
3. **`network_signal`**: Proximal or associative ties (e.g., `linkedin_connection`, `co_invested`, `accelerator_cohort`, `university_connection`, `event_connection`).
   * *Status*: Default `confirmation_required` unless corroborated by verified direct interaction.

---

## Evidence Categorization

Evidence is partitioned into four explicit categories:

* **`direct_interaction`** (`email_history`, `meeting_history`): Verifiable records that direct two-way communication occurred.
* **`founder_asserted`** (`crm_history`, `user_reported`): First-party recorded data from founder records or onboarding disclosures.
* **`public_context`** (`company_website`, `portfolio_page`, `press_release`, `news_article`, `public_profile`, `event_page`, `manual_research`): Publicly corroborating directories and announcements.
* **`platform_signal`** (`linkedin`): Social network connection states.

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

## Direct Interaction vs. Public Context in Recency

To prevent "recency leakage," the system strictly distinguishes:
* `latestEvidenceAt` (when an artifact like a website was crawled)
* `latestRelevantInteractionAt` (when people actually communicated)

Crawling a 2017 co-founder's public blog in September 2026 does not make their interaction recent. Only `direct_interaction` and `founder_asserted` timestamps determine relevant recency.

---

## Why `confirmation_required` Exists

Rather than binary acceptance/rejection, `confirmation_required` preserves valuable opportunities without making unwarranted promises:
* Stale historical colleagues (> 730 days) might still be warm if contacted, but Arcstone cannot assert this without founder confirmation.
* LinkedIn ties might represent genuine offline friends who simply haven't synced their calendar.
* Flagging them as `confirmation_required` invites the founder to confirm or reject before committing to an outreach sequence.

---

## Reason Codes and Determinism

Qualification decisions emit machine-readable reason codes alongside template explanations:

| Reason Code | Meaning |
|---|---|
| `STRUCTURAL_RELATIONSHIP` | Organizational or formal role; not an intro edge. |
| `RECENT_DIRECT_INTERACTION` | Verified email or meeting within the recent window (<= 365 days). |
| `RECENT_INTERNAL_EVIDENCE` | Verified founder CRM or survey record within recent window. |
| `LINKEDIN_ONLY` | Supported exclusively by platform connection signal. |
| `PUBLIC_CONTEXT_ONLY` | Supported only by public pages/press without direct communication. |
| `NETWORK_SIGNAL_ONLY` | Co-occurrence or network proximity without interpersonal interaction. |
| `NO_DIRECT_INTERACTION` | Missing verifiable email or meeting records. |
| `AGING_INTERACTION` | Interaction observed between 366 and 730 days ago. |
| `STALE_INTERACTION` | Interaction observed over 730 days ago. |
| `NO_EVIDENCE` | Zero evidentiary records attached to relationship edge. |

---

## Limitations

* **Deterministic bounds**: The engine only knows what is represented in `PathwayDataset`. It does not guess missing data.
* **No traversal or pathing**: Batch 2 qualifies individual edges in isolation. Combining edges into multi-hop paths is handled in Batch 3.
