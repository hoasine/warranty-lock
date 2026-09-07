import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hashSerialText, isSerialHash, normalizeSerialHash } from "./serial.ts";

describe("serial hash", () => {
  it("normalizes 0x-prefixed 64 hex", () => {
    assert.equal(normalizeSerialHash("0x" + "A".repeat(64)), "a".repeat(64));
  });

  it("rejects short or non-hex values", () => {
    assert.throws(() => normalizeSerialHash("short"), /64 hex/);
    assert.throws(() => normalizeSerialHash("z".repeat(64)), /64 hex/);
    assert.equal(isSerialHash("z".repeat(64)), false);
  });

  it("hashes raw serial text with SHA-256", async () => {
    const hash = await hashSerialText("SN-12345");
    assert.equal(hash.length, 64);
    assert.equal(isSerialHash(hash), true);
  });
});
