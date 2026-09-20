# Evidence Observability & Provenance Model

This document specifies Arcstone Pathway's evidence observability and provenance rules (Batch 8.1).

## 1. Core Directives & Invariants

```
EVIDENCE EXISTENCE != ARCSTONE OBSERVABILITY
PRIVATE COMMUNICATION != ACCESSIBLE EVIDENCE
PUBLIC PROXIMITY != CONFIRMED INTERPERSONAL RELATIONSHIP
USER ASSERTION != VERIFIED INTERACTION
CONNECTED FOUNDER DATA != THIRD-PARTY INBOX ACCESS
```

1. **Evidence Existence vs. Observability**: The presence of an email or calendar event in external history does not mean Arcstone has authorization or technical capability to observe it.
2. **First-Party Scoping**: Private communication data (`gmail`, `google_calendar`, `crm`) is **only** observable if at least one endpoint of the relationship (`fromPersonId` or `toPersonId`) is a connected campaign founder (`sourcePrincipalPersonId`).
3. **Third-Party Isolation**: Arcstone **never** infers or claims direct private interaction between two non-founder third parties (e.g. Intermediary $\rightarrow$ Target Investor) based on connected founder inbox or calendar syncs.
4. **Public Evidence Limitations**: Public evidence (`press`, `news_article`, `portfolio_page`, `company_website`, `linkedin`) establishes structural context or public proximity, but **cannot** produce a `confirmedTwoWayInteraction` or `RECENT_DIRECT_INTERACTION`.

---

## 2. Evidence Access Classes

Each `RelationshipEvidence` record includes explicit `provenance`:

- `first_party_private`: Private communications or calendar records directly authorized by a connected campaign founder (e.g. founder's Gmail / Google Calendar sync).
- `user_asserted`: Information manually provided or claimed by the user / campaign team without raw system log verification.
- `public`: Publicly accessible web sources, press releases, company team pages, or news articles.
- `consented_third_party_private`: Private data explicitly shared or consented to by a third party.

---

## 3. Evidence Source Systems

Supported evidence source systems:
- `gmail`
- `google_calendar`
- `crm`
- `manual`
- `linkedin`
- `company_website`
- `portfolio_page`
- `press`
- `public_web`
- `other`

---

## 4. Relationship Qualification & Observability Rules

### Direct Interaction Qualification
To establish a direct confirmed interaction (`confirmedTwoWayInteraction` / `RECENT_DIRECT_INTERACTION`):
- Evidence **must** be `first_party_private` or `consented_third_party_private`.
- The `sourcePrincipalPersonId` **must** match a connected campaign founder.
- The connected founder **must** be a direct endpoint (`from` or `to`) of the relationship.

### Third-Party Relationship Qualification
Relationships between third parties (where neither side is a connected campaign founder):
- Any private email/calendar evidence is classified as **unobservable**.
- The qualification engine downgrades the relationship to `confirmation_required` with `qualificationReasonCode = "PRIVATE_EVIDENCE_NOT_OBSERVABLE"` or `"PUBLIC_PROXIMITY_ONLY"`.
- Qualification recency drops to `unconfirmed`.

---

## 5. Explanation Disclosures

Every step in a pathway explanation provides clear transparency:
- **`originLabel`**: Badges rendered in the UI (`YOUR CONNECTED DATA`, `PUBLIC SOURCE`, `YOUR ASSERTION`, `SHARED WITH ARCSTONE`).
- **`whatArcstoneKnows`**: Explicit list of facts Arcstone can legitimately observe (e.g., "Arcstone observes public co-investment press releases and board observer listings").
- **`whatArcstoneDoesNotKnow`**: Explicit boundary declarations (e.g., "Arcstone cannot observe private emails or meetings between third parties where no connected founder is a party").
- **`activationPlan`**: When a route contains an unobservable or confirmation-required third-party hop, the activation plan mandates a `verify_then_request_intro` strategy before asking for an introduction.
