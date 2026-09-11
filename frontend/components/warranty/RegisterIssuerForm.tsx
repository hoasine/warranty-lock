"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProtocolConfig, useWarrantyWrites } from "@/lib/hooks/useWarrantyLock";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import { canRegisterIssuer, validateSha256Hex } from "@/lib/utils/guards";
import { EVIDENCE_TYPES, sha256Hex } from "@/lib/utils/serial";
import { error, success } from "@/lib/utils/toast";
import { friendlyTxError } from "@/components/RateLimitNotice";

export function RegisterIssuerForm() {
  const { address } = useWallet();
  const { data: config } = useProtocolConfig();
  const writes = useWarrantyWrites();
  const [issuer, setIssuer] = useState("");
  const [evidenceType, setEvidenceType] = useState<(typeof EVIDENCE_TYPES)[number]>("INVOICE");
  const [credential, setCredential] = useState("");
  const [busy, setBusy] = useState(false);
  const allowed = canRegisterIssuer(address, config?.registry_admin);

  if (!allowed) return null;

  const credentialHash = async () => {
    const trimmed = credential.trim();
    const hexProblem = validateSha256Hex(trimmed, "credential_hash");
    if (!hexProblem) return trimmed.toLowerCase().replace(/^0x/, "");
    return sha256Hex(trimmed);
  };

  const run = async (label: string, fn: () => Promise<unknown>) => {
    try {
      setBusy(true);
      await fn();
      success(label);
    } catch (err) {
      error(`${label} failed`, { description: friendlyTxError(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="brand-card grid gap-4 p-6 md:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const hash = await credentialHash();
        await run("Issuer registered", () =>
          writes.registerIssuer.mutateAsync([issuer.trim(), evidenceType, hash])
        );
      }}
    >
      <h2 className="font-display text-xl font-semibold md:col-span-2">Register an issuer</h2>
      <p className="text-sm text-muted-foreground md:col-span-2">
        Only the independent registry admin can add or revoke issuer wallets. This is not a
        manufacturer login. It records a wallet, an evidence class, and a credential hash.
      </p>
      <div className="space-y-2">
        <Label htmlFor="reg-issuer">Issuer wallet</Label>
        <Input id="reg-issuer" value={issuer} onChange={(e) => setIssuer(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="reg-type">Evidence class</Label>
        <select
          id="reg-type"
          value={evidenceType}
          onChange={(e) => setEvidenceType(e.target.value as (typeof EVIDENCE_TYPES)[number])}
          className="border-border bg-card h-10 w-full rounded-lg border px-3 py-1 text-sm"
        >
          {EVIDENCE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="reg-cred">Credential hash or text to hash</Label>
        <Input
          id="reg-cred"
          value={credential}
          onChange={(e) => setCredential(e.target.value)}
          placeholder="64-hex hash, or any credential string"
          required
        />
      </div>
      <div className="flex flex-wrap gap-2 md:col-span-2">
        <Button type="submit" disabled={busy}>
          Register issuer
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy || !issuer.trim()}
          onClick={() =>
            run("Issuer revoked", () =>
              writes.revokeIssuer.mutateAsync([issuer.trim(), evidenceType])
            )
          }
        >
          Revoke issuer
        </Button>
      </div>
    </form>
  );
}
