"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AddressDisplay } from "@/components/AddressDisplay";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import { useProtocolConfig, useWarrantyClaims, useWarrantyWrites } from "@/lib/hooks/useWarrantyLock";
import type { WarrantyView } from "@/lib/contracts/WarrantyLock";
import { formatCountdown, formatGen, parseGenToWei } from "@/lib/utils/format";
import {
  asWei,
  canAcceptWarranty,
  canApproveClaim,
  canCancelUnaccepted,
  canCloseWarranty,
  canFileClaim,
  canJudgeClaim,
  canRespondToClaim,
  canTimeoutClaim,
  nowEpoch,
} from "@/lib/utils/guards";
import { error, success } from "@/lib/utils/toast";
import { friendlyTxError } from "@/components/RateLimitNotice";

export function WarrantyCard({ warranty }: { warranty: WarrantyView }) {
  const { address } = useWallet();
  const writes = useWarrantyWrites();
  const { data: config } = useProtocolConfig();
  const { data: claims = [] } = useWarrantyClaims(warranty.id);
  const liveClaim = claims.find((c) => c.status === "OPEN");
  const openClaim = liveClaim ?? claims[claims.length - 1];
  const now = nowEpoch();
  const [requested, setRequested] = useState("");
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [response, setResponse] = useState("");
  const [busy, setBusy] = useState(false);

  const minStake = asWei(config?.minimum_claim_stake ?? "10000000000000000");
  const remaining = asWei(warranty.coverage_remaining);
  const canAccept = canAcceptWarranty(warranty, address, now);
  const canCancel = canCancelUnaccepted(warranty, address, now);
  const canFile = canFileClaim(warranty, address, now);
  const canRespond = canRespondToClaim(warranty, liveClaim, address, now);
  const canApprove = canApproveClaim(warranty, liveClaim, address);
  const canJudge = canJudgeClaim(liveClaim, now);
  const canTimeout = canTimeoutClaim(liveClaim, now);
  const canClose = canCloseWarranty(warranty, address, now);

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

  const onFile = async () => {
    try {
      const amount = parseGenToWei(requested);
      if (amount > remaining) {
        error("requested_amount exceeds remaining coverage");
        return;
      }
      if (!reason.trim() || reason.trim().length > 2000) {
        error("reason is required and must be at most 2000 characters");
        return;
      }
      if (!evidence.trim() || evidence.trim().length > 4000) {
        error("evidence is required and must be at most 4000 characters");
        return;
      }
      await run("Claim filed", () =>
        writes.file.mutateAsync([warranty.id, amount, reason.trim(), evidence.trim(), minStake])
      );
    } catch (err) {
      error("Claim failed", { description: friendlyTxError(err) });
    }
  };

  return (
    <article className="brand-card space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">{warranty.product_name}</h3>
          <p className="font-mono text-xs text-muted-foreground">{warranty.serial_hash}</p>
        </div>
        <Badge>{warranty.status}</Badge>
      </div>
      <div className="grid gap-2 text-sm md:grid-cols-2">
        <p>
          Seller <AddressDisplay address={warranty.seller} showCopy />
        </p>
        <p>
          Buyer <AddressDisplay address={warranty.buyer} showCopy />
        </p>
        <p>
          Coverage {formatGen(warranty.coverage_remaining)} / {formatGen(warranty.coverage_limit)} GEN
        </p>
        <p>Claims {warranty.claim_count}</p>
        {warranty.status === "OFFERED" && (
          <p className="md:col-span-2 text-amber">
            Accept window {formatCountdown(warranty.activation_deadline)}
          </p>
        )}
        {warranty.status === "ACTIVE" && (
          <p className="md:col-span-2 text-muted-foreground">
            Coverage ends {formatCountdown(warranty.expires_at)}
          </p>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <pre className="max-h-28 overflow-auto rounded-lg bg-black/30 p-3 text-xs text-muted-foreground">
          TERMS{"\n"}
          {warranty.terms}
        </pre>
        <pre className="max-h-28 overflow-auto rounded-lg bg-black/30 p-3 text-xs text-muted-foreground">
          EXCLUSIONS{"\n"}
          {warranty.exclusions}
        </pre>
      </div>

      {openClaim && (
        <div className="soft-tile space-y-1 p-3 text-sm">
          <p>
            Claim #{openClaim.id} · {openClaim.status}
            {openClaim.verdict ? ` · ${openClaim.verdict}` : ""}
            {openClaim.paid_out ? " · paid" : ""}
          </p>
          <p>Requested {formatGen(openClaim.requested_amount)} GEN</p>
          <p className="text-muted-foreground">{openClaim.reason}</p>
          {openClaim.seller_response && (
            <p className="text-muted-foreground">Seller: {openClaim.seller_response}</p>
          )}
          {openClaim.status === "OPEN" && openClaim.responded_at === 0 && (
            <p className="text-amber">
              Seller reply window {formatCountdown(openClaim.response_deadline)}
            </p>
          )}
          {openClaim.reasoning && <p className="text-muted-foreground">{openClaim.reasoning}</p>}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {canAccept && (
          <Button disabled={busy} onClick={() => run("Warranty accepted", () => writes.accept.mutateAsync([warranty.id]))}>
            Accept warranty
          </Button>
        )}
        {canCancel && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => run("Unaccepted warranty cancelled", () => writes.cancel.mutateAsync([warranty.id]))}
          >
            Return escrow to seller
          </Button>
        )}
        {canApprove && openClaim && (
          <Button
            disabled={busy}
            onClick={() => run("Claim approved", () => writes.approve.mutateAsync([openClaim.id]))}
          >
            Approve requested payout
          </Button>
        )}
        {canJudge && liveClaim && (
          <Button
            variant="outline"
            disabled={busy || writes.judge.isPending}
            onClick={() => run("Claim judged", () => writes.judge.mutateAsync([liveClaim.id]))}
          >
            Judge claim
          </Button>
        )}
        {canTimeout && liveClaim && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => run("Claim timed out", () => writes.timeout.mutateAsync([liveClaim.id]))}
          >
            Timeout as inconclusive
          </Button>
        )}
        {canClose && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => run("Warranty closed", () => writes.close.mutateAsync([warranty.id]))}
          >
            Return remaining coverage to seller
          </Button>
        )}
      </div>

      {warranty.status === "OFFERED" && !canAccept && !canCancel && (
        <p className="text-xs text-muted-foreground">
          Only the named buyer can accept before the deadline. After that deadline anyone can return
          the unused escrow to the seller.
        </p>
      )}
      {warranty.has_open_claim && !canClose && warranty.status !== "OFFERED" && (
        <p className="text-xs text-muted-foreground">
          An open claim keeps coverage escrowed even after expiry until it is approved or judged.
        </p>
      )}

      {canFile && (
        <div className="soft-tile grid gap-3 p-4">
          <p className="text-sm font-medium">File a claim · stake exactly {formatGen(minStake)} GEN</p>
          <p className="text-xs text-muted-foreground">
            Evidence is an immutable attestation, not a verified physical inspection.
          </p>
          <div className="space-y-2">
            <Label htmlFor={`req-${warranty.id}`}>Requested payout (GEN)</Label>
            <Input id={`req-${warranty.id}`} value={requested} onChange={(e) => setRequested(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`reason-${warranty.id}`}>Reason ({reason.trim().length}/2000)</Label>
            <Textarea id={`reason-${warranty.id}`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={2000} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`ev-${warranty.id}`}>Attestation ({evidence.trim().length}/4000)</Label>
            <Textarea id={`ev-${warranty.id}`} value={evidence} onChange={(e) => setEvidence(e.target.value)} maxLength={4000} />
          </div>
          <Button disabled={busy} onClick={onFile}>
            File claim
          </Button>
        </div>
      )}

      {canRespond && openClaim && (
        <div className="soft-tile grid gap-3 p-4">
          <Label htmlFor={`resp-${openClaim.id}`}>Seller response ({response.trim().length}/3000)</Label>
          <Textarea
            id={`resp-${openClaim.id}`}
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            maxLength={3000}
          />
          <Button
            disabled={busy || !response.trim()}
            onClick={() =>
              run("Response recorded", () => writes.respond.mutateAsync([openClaim.id, response.trim()]))
            }
          >
            Respond once
          </Button>
        </div>
      )}
    </article>
  );
}
