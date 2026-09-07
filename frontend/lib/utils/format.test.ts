import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatCountdown, formatGen, isZeroAddress, parseGenToWei, shortAddr } from "./format.ts";

describe("format helpers", () => {
  it("shortens addresses", () => {
    assert.equal(shortAddr("0x1234567890abcdef1234567890abcdef12345678"), "0x1234…5678");
  });

  it("formats and parses GEN", () => {
    assert.equal(formatGen(10_000_000_000_000_000n), "0.01");
    assert.equal(parseGenToWei("0.01"), 10_000_000_000_000_000n);
    assert.throws(() => parseGenToWei("0"), /greater than 0/);
  });

  it("formats countdown", () => {
    const now = 1_700_000_000_000;
    assert.equal(formatCountdown(1_700_000_000 + 90, now), "1m 30s");
    assert.equal(formatCountdown(1_700_000_000, now), "Ready now");
  });

  it("detects the zero address", () => {
    assert.equal(isZeroAddress("0x" + "0".repeat(40)), true);
  });
});
