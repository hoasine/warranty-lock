# WarrantyLock

<div align="center">

## Escrowed Product Warranties on GenLayer

| **WarrantyLock Platform** |
|---|
| **Escrow the coverage. Lock the terms. Snapshot public evidence. AI classifies eligibility — the contract pays.** |

[![Live App](https://img.shields.io/badge/Live-warranty--lock.vercel.app-0f172a?style=for-the-badge&logo=vercel)](https://warranty-lock.vercel.app)
[![Contract](https://img.shields.io/badge/Contract-0xCc7c6544…892B-1f6feb?style=for-the-badge)](#environment-variables)
[![Frontend](https://img.shields.io/badge/Frontend-Next.js_+_TypeScript-111827?style=for-the-badge)](#project-structure)
[![Network](https://img.shields.io/badge/Network-GenLayer_Studionet-16a34a?style=for-the-badge)](#environment-variables)

</div>

---

## Overview

WarrantyLock is a GenLayer intelligent contract for escrow-backed product warranties. A seller locks the complete coverage limit before making an offer to one buyer. If the buyer accepts, the policy text becomes the immutable basis for later claims.

The AI has one narrow responsibility: classify an open claim as `COVERED`, `NOT_COVERED`, or `INCONCLUSIVE`. It never chooses the amount paid.

Normal warranty promises can fail when the seller disappears, rewrites the terms, delays until coverage expires, or agrees that a defect is covered but does not pay. WarrantyLock separates the subjective policy decision from deterministic custody.

## Core Value Proposition

- **Escrow before accept:** coverage is locked per warranty before the buyer consents
- **Pinned policy:** terms, exclusions, evidence snapshot, and seller response cannot be edited
- **Exact funding:** create sends `msg.value == coverage_limit`; claims stake exactly `0.01 GEN`
- **Eligibility only:** validators agree on a verdict; contract branches decide every transfer
- **Non-overlapping windows:** accept/cancel, file/close, respond/judge/timeout never share an instant
- **Permissionless exits:** unused offers, timed-out claims, and leftover coverage cannot stay trapped
- **Evidence gate:** a COVERED payout requires a public HTTPS snapshot that binds the serial and requested amount. Fetching a URL is not manufacturer authentication.

## Protocol Flow

1. **Seller creates a warranty** — names one buyer, a 32-byte serial hash, terms/exclusions, and sends exactly the coverage limit
2. **Buyer accepts** before `activation_deadline`, which starts `expires_at = accepted_at + duration`
3. **If the buyer never accepts**, anyone may `cancel_unaccepted` after the deadline and refund the seller
4. **Buyer files a claim** while `ACTIVE`, with no open claim, `now < expires_at`, requested ≤ remaining, exact claim stake, a required evidence class, one public HTTPS URL, and the serial preimage. The contract snapshots the page and reverts if the snapshot is empty or does not contain the serial and amount tokens
5. **Seller responds once** before `response_deadline`, or **approves** the requested amount without AI only if that evidence package is still intact
6. **Anyone may `judge_claim`** after a reply or at `now >= response_deadline`, and only while `now < judge_deadline`. `COVERED` is forced to `INCONCLUSIVE` unless the package, class, serial bind, and amount bind all pass
7. **Anyone may `timeout_claim`** at `now >= judge_deadline` — `INCONCLUSIVE`, stake returns to the buyer
8. **Anyone may `close_warranty`** after expiry when no claim is open — leftover coverage always returns to the seller

Statuses:

| Entity | Path |
|--------|------|
| Warranty | `OFFERED` → `ACTIVE` → `EXHAUSTED` / `CANCELLED` / `CLOSED` |
| Claim | `OPEN` → `APPROVED` / `JUDGED` / `TIMED_OUT` |

Settlement:

- `COVERED` or manual approval pays exactly `requested_amount` from that warranty's coverage and returns the stake to the buyer
- Seller `approve_claim` uses the same evidence-package gate as an AI `COVERED` verdict
- `NOT_COVERED` leaves coverage unchanged and transfers the fixed stake to the seller
- `INCONCLUSIVE` or timeout leaves coverage unchanged and returns the stake to the buyer

## Risk Controls

| Risk | Mitigation in WarrantyLock |
|------|----------------------------|
| Seller rewrites terms after the buyer relies on them | Terms and exclusions lock at `create_warranty`; no policy-update method |
| Seller never funds the promise | Create is payable and requires `msg.value == coverage_limit` |
| Self-deal / zero-address offer | Seller ≠ buyer; zero address rejected |
| Duplicate serial reuse while live | Same seller + normalized serial blocked until `CANCELLED` or `CLOSED` |
| Coverage clock starts before consent | `expires_at` is set only on buyer `accept_warranty` |
| Unused offer traps seller funds | Permissionless `cancel_unaccepted` after `activation_deadline` |
| Claim after expiry | `file_claim` requires `now < expires_at` |
| Oversize / truncated evidence | Reason, URL, and snapshot are rejected if oversized, not silently trimmed |
| Unauthenticated claim text | Free-text reason is narrative only; it cannot release coverage |
| HTTP / private / credential URLs | `file_claim` allows one `https://` URL with no userinfo and no private/local host |
| Empty or failed page fetch | Snapshot uses `gl.eq_principle.strict_eq`; empty/failed fetch reverts the claim |
| Snapshot missing serial or amount | File reverts unless the snapshot contains the serial preimage, the wei token, and the GEN decimal token |
| AI or seller pays without a bind | `judge_claim` forces `INCONCLUSIVE` and `approve_claim` reverts unless `_evidence_package_ok` |
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

WarrantyLock protects on-chain authorization, escrow accounting, immutable policy text, time windows, deterministic transfer outcomes, and a **public-page snapshot bind**.

It does **not** authenticate a manufacturer, repairer, invoice issuer, telemetry device, or inspector. A successful fetch means validators agreed on the page text at file time. It does not mean the page was signed, that the product failed, or that the buyer owns the serial.

Remaining fraud and honest limits:

1. Anyone can publish fake public HTML that contains the serial and GEN amount, then declare `INVOICE` (or any other class).
2. A stolen real invoice that already contains the serial can be hosted and snapshotted.
3. Filing a claim publishes the raw serial; that string can be copied onto a fake page.
4. A long page can coincidentally contain `0.03` or the wei digit string.
5. The live site can change after file time; only the snapshot is locked.
6. Semantic prompt injection in the fetched page can still produce a valid `COVERED` if every validator follows it; JSON escaping only stops structural breakout.
7. Vague locked terms plus a plausible snapshot can still be classified as covered.
8. Seller–buyer collusion plus a bind-passing fake page can still use `approve_claim`.
9. There are no issuer signatures; unofficial “manufacturer” PDFs or HTML are indistinguishable from a forge.
10. Timeout / `INCONCLUSIVE` does not steal coverage; it only returns the claim stake.

Other explicit limitations:

- a serial hash hides the raw serial until claim time but does not prove the product exists
- AI can interpret ambiguous natural-language terms incorrectly
- permissionless reclaim, judge, timeout, and close still require someone to submit the transaction
- `INCONCLUSIVE` refunds the stake but does not compensate either party
- there is no amendment, appeal, top-up, assignment, or buyer claim-cancellation path in this version

The safest policy drafting style names covered failures, exclusions, required public evidence, and objective limits directly. Do not describe this protocol as verified manufacturer evidence.

## Core Contract API

| Function | Type | Description |
|----------|------|-------------|
| `create_warranty` | write (payable) | Escrow exact coverage for one buyer + serial hash; lock terms |
| `accept_warranty` | write | Named buyer starts the coverage clock before the activation deadline |
| `cancel_unaccepted` | write | Permissionless refund to seller after the activation deadline |
| `file_claim` | write (payable) | Buyer files one HTTPS evidence URL + serial preimage + exact `0.01 GEN` stake; snapshot must bind serial and amount |
| `respond_to_claim` | write | Seller replies once before `response_deadline` |
| `approve_claim` | write | Seller pays the requested amount without AI only if the evidence package is intact |
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

The Next.js app in `frontend/` mirrors contract guards instead of inventing extra policy. Evidence copy in the UI says public-page snapshot, not verified manufacturer, repairer, or signed-invoice authentication.

## Environment Variables

Configure in `frontend/.env.local` (see `frontend/.env.example`):

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0xCc7c65448cF0FAA3C2057e770D5cD29a5411892B
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
NEXT_PUBLIC_GENLAYER_CHAIN_ID=61999
NEXT_PUBLIC_GENLAYER_CHAIN_NAME=GenLayer Studionet
NEXT_PUBLIC_GENLAYER_SYMBOL=GEN
```

This Studionet address is the live app target. After contract source changes, redeploy `contracts/warranty_lock.py` and update `NEXT_PUBLIC_CONTRACT_ADDRESS` here, in `frontend/.env*`, and on Vercel.

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

The direct suite covers authorization, self-dealing, duplicate serials, exact escrow, zero address, acceptance/cancellation boundaries, immutable and bounded text, expiry races, single-open-claim behavior, exact claim stake, seller response timing, all verdicts, invalid model output, prompt delimiter escaping, manual approval, double settlement, exhausted coverage, close guards, tracked liabilities, transfer recipients and amounts, validator disagreement, cross-warranty isolation, HTTPS/private URL rejection, snapshot bind failures, and COVERED/approve evidence gates.

## Links

- Live app: [https://warranty-lock.vercel.app](https://warranty-lock.vercel.app)
- GitHub: [https://github.com/hoasine/warranty-lock](https://github.com/hoasine/warranty-lock)
- Contract (Studionet): [`0xCc7c65448cF0FAA3C2057e770D5cD29a5411892B`](https://studio.genlayer.com)
- Source: `contracts/warranty_lock.py`

## Disclaimer

Prototype/demo software for warranty-escrow experiments on GenLayer Studionet. Not financial, legal, insurance, or consumer-protection advice. A public HTTPS snapshot is not proof of a physical defect and is not manufacturer authentication.
