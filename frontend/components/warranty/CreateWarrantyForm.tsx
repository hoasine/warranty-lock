"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProtocolConfig, useWarrantyWrites } from "@/lib/hooks/useWarrantyLock";
import { formatGen, parseGenToWei } from "@/lib/utils/format";
import { hashSerialText } from "@/lib/utils/serial";
import { validateCreateInputs } from "@/lib/utils/guards";
import { error, success } from "@/lib/utils/toast";
import { friendlyTxError } from "@/components/RateLimitNotice";
import { useWallet } from "@/lib/genlayer/WalletProvider";

export function CreateWarrantyForm() {
  const { address } = useWallet();
  const { data: config } = useProtocolConfig();
  const { create } = useWarrantyWrites();
  const [buyer, setBuyer] = useState("");
  const [product, setProduct] = useState("Portable Power Station");
  const [serial, setSerial] = useState("");
  const [terms, setTerms] = useState(
    "Covers manufacturing defects in the power system during the coverage term."
  );
  const [exclusions, setExclusions] = useState(
    "Excludes intentional damage, unauthorized modification, and normal wear."
  );
  const [coverage, setCoverage] = useState("0.10");
  const [activationDays, setActivationDays] = useState("1");
  const [durationDays, setDurationDays] = useState("365");
  const [busy, setBusy] = useState(false);

  const minStake = formatGen(config?.minimum_claim_stake ?? "10000000000000000");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) {
      error("Connect a wallet first");
      return;
    }
    try {
      setBusy(true);
      const serialHash = await hashSerialText(serial);
      const coverageWei = parseGenToWei(coverage);
      const activationSeconds = Math.round(Number(activationDays) * 24 * 60 * 60);
      const durationSeconds = Math.round(Number(durationDays) * 24 * 60 * 60);
      const problem = validateCreateInputs({
        seller: address,
        buyer,
        productName: product,
        serialHash,
        terms,
        exclusions,
        coverageWei,
        activationSeconds,
        durationSeconds,
        config,
      });
      if (problem) {
        error(problem);
        return;
      }
      await create.mutateAsync([
        buyer.trim(),
        product.trim(),
        serialHash,
        terms.trim(),
        exclusions.trim(),
        coverageWei,
        activationSeconds,
        durationSeconds,
      ]);
      success("Warranty offered. Coverage is now escrowed.");
    } catch (err) {
      error("Create failed", { description: friendlyTxError(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="brand-card grid gap-4 p-6 md:grid-cols-2">
      <h2 className="font-display text-xl font-semibold md:col-span-2">Offer a warranty</h2>
      <p className="text-sm text-muted-foreground md:col-span-2">
        You send exactly the coverage amount. The named buyer must accept before the activation
        deadline. Claim stake later is exactly {minStake} GEN. Terms lock at create — there is no
        amend path.
      </p>
      <div className="space-y-2">
        <Label htmlFor="buyer">Buyer address</Label>
        <Input id="buyer" value={buyer} onChange={(e) => setBuyer(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="product">Product</Label>
        <Input id="product" value={product} onChange={(e) => setProduct(e.target.value)} maxLength={200} required />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="serial">Serial or 64-hex hash</Label>
        <Input
          id="serial"
          value={serial}
          onChange={(e) => setSerial(e.target.value)}
          placeholder="Paste 64 hex characters, or a serial that will be SHA-256 hashed"
          required
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="terms">Locked terms ({terms.trim().length}/4000)</Label>
        <Textarea id="terms" value={terms} onChange={(e) => setTerms(e.target.value)} maxLength={4000} required />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="exclusions">Locked exclusions ({exclusions.trim().length}/2500)</Label>
        <Textarea
          id="exclusions"
          value={exclusions}
          onChange={(e) => setExclusions(e.target.value)}
          maxLength={2500}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="coverage">Coverage escrow (GEN)</Label>
        <Input id="coverage" value={coverage} onChange={(e) => setCoverage(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="activation">Activation window (days)</Label>
        <Input
          id="activation"
          type="number"
          min="1"
          max="30"
          value={activationDays}
          onChange={(e) => setActivationDays(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="duration">Coverage duration (days)</Label>
        <Input
          id="duration"
          type="number"
          min="1"
          max="1095"
          value={durationDays}
          onChange={(e) => setDurationDays(e.target.value)}
          required
        />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" variant="gradient" disabled={busy || create.isPending}>
          {busy ? "Escrowing…" : "Create warranty"}
        </Button>
      </div>
    </form>
  );
}
