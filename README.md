# WarrantyLock

<div align="center">

## Escrowed Product Warranties on GenLayer

| **WarrantyLock Platform** |
|---|
| **Escrow the coverage. Pin an issuer wallet. AI classifies eligibility — the contract pays.** |

[![Live App](https://img.shields.io/badge/Live-warranty--lock.vercel.app-0f172a?style=for-the-badge&logo=vercel)](https://warranty-lock.vercel.app)
[![Contract](https://img.shields.io/badge/Contract-0xA6223E73…E095-1f6feb?style=for-the-badge)](#environment-variables)
[![Frontend](https://img.shields.io/badge/Frontend-Next.js_+_TypeScript-111827?style=for-the-badge)](#project-structure)
[![Network](https://img.shields.io/badge/Network-GenLayer_Studionet-16a34a?style=for-the-badge)](#environment-variables)

</div>

---

## Overview

WarrantyLock is a GenLayer intelligent contract for escrow-backed product warranties. A seller locks the complete coverage limit before making an offer to one buyer, and pins one issuer wallet plus an evidence class. If the buyer accepts, the policy text and issuer become the immutable basis for later claims.

The AI has one narrow responsibility: classify an open claim as `COVERED`, `NOT_COVERED`, or `INCONCLUSIVE`. It never chooses the amount paid. A `COVERED` payout also requires an on-chain `attest_claim` from the locked issuer. That authenticates the pinned key, not a manufacturer login, signed invoice, or brand PKI.

Normal warranty promises can fail when the seller disappears, rewrites the terms, delays until coverage expires, or agrees that a defect is covered but does not pay. WarrantyLock separates the subjective policy decision from deterministic custody.

## Core Value Proposition

- **Escrow before accept:** coverage is locked per warranty before the buyer consents
- **Pinned policy:** terms, exclusions, evidence class, issuer wallet, and seller response cannot be edited
- **Exact funding:** create sends `msg.value == coverage_limit`; claims stake exactly `0.01 GEN`
- **Eligibility only:** validators agree on a verdict; contract branches decide every transfer
- **Non-overlapping windows:** accept/cancel, file/close, respond/judge/timeout never share an instant
- **Permissionless exits:** unused offers, timed-out claims, and leftover coverage cannot stay trapped
- **Issuer attest gate:** a COVERED payout requires the locked issuer wallet to attest that claim. This authenticates the pinned key, not a manufacturer login or signed invoice.

## Protocol Flow

1. **Seller creates a warranty** — names one buyer, a 32-byte serial hash, terms/exclusions, an evidence class (`MANUFACTURER` | `REPAIRER` | `INVOICE` | `TELEMETRY` | `INSPECTION`), a pinned issuer wallet, and sends exactly the coverage limit. Issuer ≠ zero and ≠ buyer. Seller may equal issuer.
2. **Buyer accepts** before `activation_deadline`, which starts `expires_at = accepted_at + duration`. Accepting also accepts that pinned issuer.
3. **If the buyer never accepts**, anyone may `cancel_unaccepted` after the deadline and refund the seller
4. **Buyer files a claim** while `ACTIVE`, with no open claim, `now < expires_at`, requested ≤ remaining, exact claim stake, and the serial preimage that SHA-256-matches the locked hash. Reason text is narrative only. Evidence class is copied from the warranty. A public web page cannot release coverage.
5. **Locked issuer calls `attest_claim`** once while the claim is `OPEN`. The transaction binds warranty, claim, serial, amount, and type.
6. **Seller responds once** before `response_deadline`, or **approves** the requested amount without AI only after that attest
7. **Anyone may `judge_claim`** after a reply or at `now >= response_deadline`, and only while `now < judge_deadline`. `COVERED` without issuer attest is forced to `INCONCLUSIVE` and does not pay coverage
8. **Anyone may `timeout_claim`** at `now >= judge_deadline` — `INCONCLUSIVE`, stake returns to the buyer
9. **Anyone may `close_warranty`** after expiry when no claim is open — leftover coverage always returns to the seller

Statuses:

| Entity | Path |
|--------|------|
| Warranty | `OFFERED` → `ACTIVE` → `EXHAUSTED` / `CANCELLED` / `CLOSED` |
| Claim | `OPEN` → `APPROVED` / `JUDGED` / `TIMED_OUT` |

Settlement:

- `COVERED` or manual approval pays exactly `requested_amount` from that warranty's coverage and returns the stake to the buyer
- Seller `approve_claim` reverts unless the issuer has attested
- `NOT_COVERED` leaves coverage unchanged and transfers the fixed stake to the seller
- `INCONCLUSIVE` or timeout leaves coverage unchanged and returns the stake to the buyer

## Risk Controls

| Risk | Mitigation in WarrantyLock |
|------|----------------------------|
| Seller rewrites terms after the buyer relies on them | Terms, exclusions, evidence class, and issuer lock at `create_warranty`; no policy-update method |
| Seller never funds the promise | Create is payable and requires `msg.value == coverage_limit` |
| Self-deal / zero-address offer | Seller ≠ buyer; zero address rejected |
| Issuer is the buyer | Issuer ≠ buyer and ≠ zero |
| Duplicate serial reuse while live | Same seller + normalized serial blocked until `CANCELLED` or `CLOSED` |
| Coverage clock starts before consent | `expires_at` is set only on buyer `accept_warranty` |
| Unused offer traps seller funds | Permissionless `cancel_unaccepted` after `activation_deadline` |
| Claim after expiry | `file_claim` requires `now < expires_at` |
| Oversize / truncated narrative | Reason and seller response are rejected if oversized, not silently trimmed |
| Unauthenticated claim text | Free-text reason is narrative only; it cannot release coverage |
| AI or seller pays without issuer attest | `approve_claim` reverts; `judge_claim` forces `INCONCLUSIVE`; `_settle_claim` COVERED also requires `_issuer_attested` |
| Accidental oversized stake | Claim stake must exactly equal `minimum_claim_stake` (0.01 GEN) |
| Seller silence blocks the buyer | Judge is allowed after reply or at `response_deadline` |
| AFK judge / validator deadlock | Permissionless `timeout_claim` after `judge_deadline` |
| AI chooses the payout | Model returns only a verdict; requested amount is fixed at file time |
| Prompt breakout via quotes/newlines | Case data is JSON-escaped; user text treated as untrusted |
| Invalid model output | Unknown verdicts become `INCONCLUSIVE` |
| Double settlement | `paid_out` guard; state/liabilities update before `emit_transfer` |
| Cross-warranty drain | Each warranty spends only its own `coverage_remaining` |
| Leftover escrow after expiry | Permissionless `close_warranty` refunds remaining coverage to the seller |
| Open claim filed just before expiry | Close is blocked until that claim is approved, judged, or timed out |
| Wall-clock disagreement | Writes use consensus `datetime` only and fail closed if it is missing |

Time boundaries do not overlap:

- accept: `now < activation_deadline`
- cancel unaccepted: `now >= activation_deadline`
- file claim: `now < expires_at`
- close accepted warranty: `now >= expires_at`
- seller response: `now < response_deadline`
- judge without response: `now >= response_deadline` and `now < judge_deadline`
- timeout: `now >= judge_deadline`

## Threat model and limitations

WarrantyLock protects on-chain authorization, escrow accounting, immutable policy text, time windows, deterministic transfer outcomes, and a **pinned-issuer attest**.

It does **not** authenticate a manufacturer login, repairer credential, invoice issuer identity, telemetry device, inspector, signed PDF, or brand PKI. A successful `attest_claim` means the locked issuer wallet signed that transaction. It does not mean the product failed, that an inspection happened, or that the buyer owns the serial.

Remaining fraud and honest limits:

1. The seller can pin an issuer wallet they control.
2. Buyer accept is also accepting that issuer.
3. A compromised issuer key or a rogue employee can attest a false claim.
4. A real issuer can collude with the buyer.
5. Attest is not physical failure or inspection.
6. Vague locked terms plus a valid attest can still be classified as covered.
7. Seller == issuer can self-attest.
8. There is no brand PKI, signed PDF, or device certificate.
9. Timeout / `INCONCLUSIVE` does not steal coverage; it only returns the claim stake.

Other explicit limitations:

- a serial hash hides the raw serial until claim time but does not prove the product exists
- AI can interpret ambiguous natural-language terms incorrectly
- permissionless reclaim, judge, timeout, and close still require someone to submit the transaction
- `INCONCLUSIVE` refunds the stake but does not compensate either party
- there is no amendment, appeal, top-up, assignment, or buyer claim-cancellation path in this version

The safest policy drafting style names covered failures, exclusions, required issuer role, and objective limits directly. Do not describe this protocol as verified manufacturer evidence.

## Core Contract API

| Function | Type | Description |
|----------|------|-------------|
| `create_warranty` | write (payable) | Escrow exact coverage for one buyer + serial hash; lock terms, evidence class, and issuer |
| `accept_warranty` | write | Named buyer starts the coverage clock before the activation deadline |
| `cancel_unaccepted` | write | Permissionless refund to seller after the activation deadline |
| `file_claim` | write (payable) | Buyer files serial preimage + exact `0.01 GEN` stake; reason is narrative only |
| `attest_claim` | write | Locked issuer wallet attests the open claim once; required before COVERED |
| `respond_to_claim` | write | Seller replies once before `response_deadline` |
| `approve_claim` | write | Seller pays the requested amount without AI only after issuer attest |
| `judge_claim` | write | Permissionless AI eligibility verdict before `judge_deadline` |
| `timeout_claim` | write | Permissionless `INCONCLUSIVE` after `judge_deadline` |
| `close_warranty` | write | Permissionless leftover-coverage refund after expiry, no open claim |
| `get_warranty` / `get_claim` / `get_warranty_claims` | view | Entity reads |
| `get_all_warranties` / `get_protocol_config` / `get_liabilities` | view | Listing, windows, tracked escrow |

`get_liabilities` exposes tracked protocol liabilities. It does not claim to report the native balance because the pinned GenLayer SDK does not provide that view API.

## Project Structure

```text
contracts/   # GenLayer intelligent contract (Python)
frontend/    # Next.js application (TypeScript) — Vercel Root Directory
tests/       # Direct contract tests
```

The Next.js app in `frontend/` mirrors contract guards instead of inventing extra policy. Evidence copy in the UI says pinned-issuer attest, not verified manufacturer, repairer, or signed-invoice authentication.

## Environment Variables

Configure in `frontend/.env.local` (see `frontend/.env.example`):

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0xA6223E73bFEb2379bb146643214df568984cE095
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
NEXT_PUBLIC_GENLAYER_CHAIN_ID=61999
NEXT_PUBLIC_GENLAYER_CHAIN_NAME=GenLayer Studionet
NEXT_PUBLIC_GENLAYER_SYMBOL=GEN
```

This Studionet address is the live issuer-attest contract. After contract source changes, redeploy `contracts/warranty_lock.py` and update `NEXT_PUBLIC_CONTRACT_ADDRESS` here, in `frontend/.env*`, and on Vercel.

## Local Development

```bash
cd frontend
npm install
npm run dev
```

Use the Studionet address above, or deploy `contracts/warranty_lock.py` and update `NEXT_PUBLIC_CONTRACT_ADDRESS`.

## Tests

```bash
pip install -r requirements-dev.txt
python -m pytest -q
python -m genvm_linter.cli check contracts/warranty_lock.py
cd frontend
npm test
```

The direct suite covers authorization, self-dealing, duplicate serials, exact escrow, zero address, acceptance/cancellation boundaries, immutable and bounded text, expiry races, single-open-claim behavior, exact claim stake, seller response timing, all verdicts, invalid model output, prompt delimiter escaping, issuer attest, manual approval, double settlement, exhausted coverage, close guards, tracked liabilities, transfer recipients and amounts, validator disagreement, cross-warranty isolation, and COVERED/approve issuer gates.

## Links

- Live app: [https://warranty-lock.vercel.app](https://warranty-lock.vercel.app)
- GitHub: [https://github.com/hoasine/warranty-lock](https://github.com/hoasine/warranty-lock)
- Contract (Studionet): [`0xA6223E73bFEb2379bb146643214df568984cE095`](https://studio.genlayer.com)
- Source: `contracts/warranty_lock.py`

## Disclaimer

Prototype/demo software for warranty-escrow experiments on GenLayer Studionet. Not financial, legal, insurance, or consumer-protection advice. A pinned-issuer attest is not proof of a physical defect and is not manufacturer authentication.
