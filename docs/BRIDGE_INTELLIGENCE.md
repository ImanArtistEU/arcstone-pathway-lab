# Latent Network Bridge Intelligence (Batch 9 Specification)

## Product Thesis

Arcstone does **NOT** claim:
> *"We know Marcus can introduce you to Sarah."*

Arcstone **DISCOVERS**:
> *"You already know Marcus. Public evidence shows Marcus has meaningful professional overlap with Sarah... Marcus is therefore one of the most relevant people in YOUR network to ask about Sarah... Arcstone does not know whether Marcus currently knows Sarah well enough to introduce you. That must be verified."*

Arcstone surfaces the latent value of a founder's existing network by combining private, authorized relationship evidence with public, observable proximity signals.

---

## Domain Model & Architecture

### 1. Network Split Architecture

```
   [ FOUNDER NETWORK ]                     [ PUBLIC PROXIMITY ]                  [ TARGET VC ]
(Elena Vance -> Marcus Thorne)    ~~ (Shared Board / Co-Investment) ~~>         (Sarah Chen)
  Authorization: Authorized               Observable Signal: Public           Decision Target: Partner
  Status: VERIFIED / ASSERTED              Type: ProximitySignal              Mandate Fit: 100/100
```

### 2. Core Entities

1. **FounderNetworkAnchor (`FounderNetworkAnchor`)**
   - Qualified person in the founder's network (`verified`, `asserted`, `stale`).
   - Represents a network node with direct tie to campaign founder.

2. **ProximitySignal (`ProximitySignal`)**
   - Publicly observable co-occurrence/overlap tie (`co_invested_same_deal`, `shared_board`, `co_authored_publication`, `same_fund_alumni`, etc.).
   - Explicitly decoupled from private communication capability.

3. **BridgeHypothesis (`BridgeHypothesis`)**
   - Discovered candidate bridge: `FOUNDER → ANCHOR ~~ PROXIMITY SIGNAL ~~ TARGET PERSON`.
   - Rated via uncalibrated `BridgeRelevanceScore` index.
   - Statuses: `potential_bridge`, `verified_active`, `refuted`, `stale`, `unaskable`.

4. **FundAccessStrategy (`FundAccessStrategy`)**
   - Multi-tiered strategy integrating Decision Target selection, Reachable Entry Point identification, and Bridge Hypotheses.
   - Access Statuses:
     - `VERIFIED_DIRECT_RELATIONSHIP`
     - `CONFIRMED_INTRO_ROUTE`
     - `POTENTIAL_BRIDGE_FOUND`
     - `PLATFORM_ADJACENCY_ONLY`
     - `NO_CREDIBLE_BRIDGE_FOUND`

---

## Bridge Relevance Index Math (Uncalibrated)

```
BridgeRelevanceIndex = (AnchorQuality × 0.45) + (TargetProximity × 0.40) + (Freshness × 0.10) + (Corroboration × 0.05)
```

- **Anchor Quality (45%)**: `verified` (100), `asserted` (70), `stale` (40).
- **Target Proximity Strength (40%)**: `shared_board` (100), `co_invested_same_deal` (90), `same_fund_alumni` (80), `co_authored_publication` (70), `event_panel` (60), `linkedin_connection` (30).
- **Temporal Freshness (10%)**: Days elapsed from `referenceDate`.
- **Corroboration (5%)**: Multiplier for multiple independent proximity signals.

---

## Invariants & Guardrails

1. **PUBLIC PROXIMITY ≠ CONFIRMED RELATIONSHIP**
2. **CO-INVESTMENT ≠ INTRODUCTION CAPABILITY**
3. **SAME EMPLOYER ≠ ACTIVE RELATIONSHIP**
4. **LINKEDIN CONNECTION ≠ WARM RELATIONSHIP**
5. **BRIDGE HYPOTHESIS ≠ CONFIRMED INTRODUCTION ROUTE**
6. **NO KNOWN ROUTE ≠ COLD OUTREACH REQUIRED**
7. **DECISION TARGET ≠ EASIEST ENTRY POINT**
8. **KNOWN INTRO PATH ≠ DISCOVERY VALUE**

---

## Action Semantics

- **Unverified Bridge Hypothesis**: Action is `"ASK MARCUS ABOUT SARAH"`.
- **Verified Active Bridge**: Action is `"REQUEST INTRODUCTION FROM MARCUS TO SARAH"`.
- **Refuted Bridge**: Hypothesis removed from top recommendations.
