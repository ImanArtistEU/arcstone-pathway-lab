# Path Rejection & Viability Filter

## Core Purpose

Path Rejection answers a crucial filtering question:

> **Which generated routes are too unreliable or semantically invalid to even deserve scoring?**

While Path Generation discovers all technically traversable routes through the qualified relationship network, Path Rejection filters out routes that fail basic viability thresholds or data-quality gates before any scoring or ranking takes place.

---

## Core Invariants

### 1. Invariant: Path Existence $\neq$ Path Viability

$$\mathbf{Path\ Existence} \neq \mathbf{Path\ Viability}$$

A route existing structurally in the graph does not guarantee that it represents a usable introduction pathway.

### 2. Invariant: Rejection $\neq$ Ranking

$$\mathbf{Rejection} \neq \mathbf{Ranking}$$

Path Rejection applies pass/fail viability filters. It does not compute numeric scores, weights, or relative rankings among surviving paths.

### 3. Invariant: Retained $\neq$ Recommended

$$\mathbf{Retained} \neq \mathbf{Recommended}$$

A retained path merely survives hard viability gates and uncertainty bounds. It is not automatically "good", "strong", "highest probability", or "recommended". Path scoring and target selection occur in subsequent pipeline stages.

### 4. Invariant: All Paths Rejected $\neq$ Cold Outreach Required

$$\mathbf{All\ Paths\ Rejected} \neq \mathbf{Cold\ Outreach\ Required}$$

Path Rejection evaluates route viability. When all generated paths are rejected, it indicates that candidate routes were too speculative or invalid under current policy, but does not dictate outreach strategy.

---

## Rejection Reason Codes

Path Rejection emits explicit, machine-readable reason codes:

* **`ONE_WAY_OUTREACH_EDGE`**: Path contains unreplied outbound outreach (`ONE_WAY_OUTREACH_ONLY`). Unanswered outbound communication represents outreach already attempted, not social capital capable of producing an introduction.
* **`INVALID_INTERACTION_DATA`**: Path step contains invalid interaction date data (`INVALID_INTERACTION_DATE`). Data-quality failure.
* **`FUTURE_INTERACTION_DATA`**: Path step contains future-dated interaction evidence (`FUTURE_INTERACTION_DATE`). Future interactions cannot justify current route viability.
* **`INVALID_REFERENCE_CONTEXT`**: Defensive rejection when a path step contains invalid reference date context (`INVALID_REFERENCE_DATE`).
* **`EXCESS_CONFIRMATION_HOPS`**: Path contains more confirmation-required relationship hops than permitted by policy (`maxConfirmationRequiredHops`).

---

## Compounding Uncertainty Policy

To prevent founder attention from being wasted on highly speculative multi-hop routes, Path Rejection limits compounding uncertainty:

* **`maxConfirmationRequiredHops = 1`** (Default Prototype Hypothesis)
  - A path may contain at most **one** confirmation-required relationship hop.
  - Paths with two or more confirmation-required hops (e.g. *Founder $\rightarrow$ LinkedIn connection $\rightarrow$ stale former colleague $\rightarrow$ Investor*) are rejected for `EXCESS_CONFIRMATION_HOPS`.

> [!IMPORTANT]
> `maxConfirmationRequiredHops = 1` is a working **product hypothesis**, not a proven fundraising constant. It must be validated and calibrated against real-world outcome feedback (founder confirmation responses, intro requests, meeting conversions, and investments).

---

## Why Single-Hop Uncertainty Cases Survive

The following single-hop confirmation cases are **not** automatically rejected under default policy:
* `LINKEDIN_ONLY`
* `STALE_INTERACTION`
* `AGING_INTERACTION`
* `PUBLIC_CONTEXT_ONLY`
* `NETWORK_SIGNAL_ONLY`
* `UNCONFIRMED_INTERACTION`

**Rationale**: These status reasons represent unconfirmed relationships that require founder validation (e.g. *"Yes, that LinkedIn connection is actually my friend"*), not semantic or data impossibility. They survive rejection if the total count of confirmation-required hops stays within `maxConfirmationRequiredHops`.

---

## Deterministic Evaluation

1. **Rule Ordering**: Reasons are checked and collected in a stable order:
   1. `INVALID_INTERACTION_DATA`
   2. `FUTURE_INTERACTION_DATA`
   3. `INVALID_REFERENCE_CONTEXT`
   4. `ONE_WAY_OUTREACH_EDGE`
   5. `EXCESS_CONFIRMATION_HOPS`
2. **Immutability**: Input `PathGenerationResult` and original `PathCandidate` objects are never mutated. Rejected paths are returned as new cloned `PathCandidate` instances with `status = "rejected"`.
3. **Ordering Preservation**: Both `retainedPaths` and `rejectedPaths` preserve upstream deterministic path enumeration order.

---

## Current Demo Behaviour

* **Horizon Ventures**: Retained (`eligible_path_available`). All hops fully qualified (`eligible`).
* **Beacon Capital**: Retained (`retained_paths_available`). 1 confirmation-required hop (LinkedIn-only), status remains `candidate`.
* **Summit Ridge Capital**: Rejected (`all_paths_rejected`). 2 confirmation-required hops exceed `maxConfirmationRequiredHops = 1`. Status becomes `rejected`, reason `EXCESS_CONFIRMATION_HOPS`.
* **Aurora Global Ventures**: No generated paths (`no_generated_paths`).

---

## Limitations

* **No Scoring or Weights**: Rejection is strictly boolean (retain vs reject).
* **No Ranking**: Retained paths are not ordered by quality or likelihood.
* **No Target Selection**: Does not select a primary decision-maker or primary path.
