import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { WarrantyClaimView, WarrantyView } from "../contracts/WarrantyLock.ts";
import {
  canAcceptWarranty,
  canApproveClaim,
  canCancelUnaccepted,
  canCloseWarranty,
  canFileClaim,
  canJudgeClaim,
  canRespondToClaim,
  canTimeoutClaim,
  validateCreateInputs,
} from "./guards.ts";

const seller = "0x1111111111111111111111111111111111111111";
const buyer = "0x2222222222222222222222222222222222222222";

function warranty(overrides: Partial<WarrantyView> = {}): WarrantyView {
  return {
    id: 0,
    seller,
    buyer,
    product_name: "Unit",
    serial_hash: "a".repeat(64),
    terms: "terms",
    exclusions: "exclusions",
    coverage_limit: "100",
    coverage_remaining: "100",
    activation_deadline: 100,
    duration_seconds: 365,
    accepted_at: 0,
    expires_at: 200,
    status: "OFFERED",
    has_open_claim: false,
    open_claim_id: 0,
    claim_count: 0,
    closed: false,
    created_at: 1,
    activation_open: true,
    coverage_active: false,
    ...overrides,
  };
}

function claim(overrides: Partial<WarrantyClaimView> = {}): WarrantyClaimView {
  return {
    id: 0,
    warranty_id: 0,
    buyer,
    requested_amount: "30",
    reason: "failed",
    evidence: "attestation",
    seller_response: "",
    stake: "10",
    created_at: 50,
    response_deadline: 150,
    judge_deadline: 250,
    responded_at: 0,
    judged_at: 0,
    verdict: "",
    confidence: 0,
    reasoning: "",
    case_key: "",
    status: "OPEN",
    paid_out: false,
    ...overrides,
  };
}

describe("warranty action guards", () => {
  it("accepts only before the activation deadline", () => {
    const offered = warranty();
    assert.equal(canAcceptWarranty(offered, buyer, 99), true);
    assert.equal(canAcceptWarranty(offered, buyer, 100), false);
    assert.equal(canAcceptWarranty(offered, seller, 99), false);
  });

  it("lets anyone cancel only at or after the activation deadline", () => {
    const offered = warranty();
    assert.equal(canCancelUnaccepted(offered, seller, 99), false);
    assert.equal(canCancelUnaccepted(offered, buyer, 100), true);
  });

  it("files claims only while active and before expiry", () => {
    const active = warranty({ status: "ACTIVE", accepted_at: 10, expires_at: 200 });
    assert.equal(canFileClaim(active, buyer, 199), true);
    assert.equal(canFileClaim(active, buyer, 200), false);
    assert.equal(canFileClaim({ ...active, has_open_claim: true }, buyer, 199), false);
  });

  it("keeps response and judge windows from overlapping", () => {
    const active = warranty({ status: "ACTIVE" });
    const open = claim();
    assert.equal(canRespondToClaim(active, open, seller, 149), true);
    assert.equal(canRespondToClaim(active, open, seller, 150), false);
    assert.equal(canJudgeClaim(open, 149), false);
    assert.equal(canJudgeClaim(open, 150), true);
    assert.equal(canJudgeClaim({ ...open, responded_at: 80 }, 80), true);
    assert.equal(canJudgeClaim(open, 250), false);
    assert.equal(canTimeoutClaim(open, 249), false);
    assert.equal(canTimeoutClaim(open, 250), true);
  });

  it("closes only after expiry with no open claim", () => {
    const active = warranty({ status: "ACTIVE", expires_at: 200 });
    assert.equal(canCloseWarranty(active, seller, 199), false);
    assert.equal(canCloseWarranty(active, buyer, 200), true);
    assert.equal(canCloseWarranty({ ...active, has_open_claim: true }, seller, 200), false);
  });

  it("lets the seller approve an open claim", () => {
    assert.equal(canApproveClaim(warranty({ status: "ACTIVE" }), claim(), seller), true);
    assert.equal(
      canApproveClaim(warranty({ status: "ACTIVE" }), claim({ paid_out: true }), seller),
      false
    );
  });

  it("rejects self-deal and oversized create inputs", () => {
    const base = {
      seller,
      buyer,
      productName: "Unit",
      serialHash: "a".repeat(64),
      terms: "terms",
      exclusions: "exclusions",
      coverageWei: 10_000_000_000_000_000n,
      activationSeconds: 86400,
      durationSeconds: 86400,
    };
    assert.equal(validateCreateInputs(base), null);
    assert.match(validateCreateInputs({ ...base, buyer: seller }) ?? "", /themselves/);
    assert.match(validateCreateInputs({ ...base, buyer: "0x" + "0".repeat(40) }) ?? "", /zero/);
    assert.match(validateCreateInputs({ ...base, terms: "x".repeat(4001) }) ?? "", /terms/);
  });
});
