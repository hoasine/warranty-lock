import type { ProtocolConfig, WarrantyClaimView, WarrantyView } from "../contracts/WarrantyLock.ts";
import { isZeroAddress, sameAddress } from "./format.ts";

export function asWei(value: number | string | bigint | undefined): bigint {
  return BigInt(String(value ?? "0"));
}

export function nowEpoch(nowMs = Date.now()): number {
  return Math.floor(nowMs / 1000);
}

export function canAcceptWarranty(
  warranty: WarrantyView,
  address?: string | null,
  now = nowEpoch()
): boolean {
  return (
    sameAddress(address, warranty.buyer) &&
    warranty.status === "OFFERED" &&
    !warranty.closed &&
    now < warranty.activation_deadline
  );
}

export function canCancelUnaccepted(
  warranty: WarrantyView,
  _address?: string | null,
  now = nowEpoch()
): boolean {
  return warranty.status === "OFFERED" && !warranty.closed && now >= warranty.activation_deadline;
}

export function canFileClaim(
  warranty: WarrantyView,
  address?: string | null,
  now = nowEpoch()
): boolean {
  return (
    sameAddress(address, warranty.buyer) &&
    warranty.status === "ACTIVE" &&
    !warranty.closed &&
    !warranty.has_open_claim &&
    now < warranty.expires_at
  );
}

export function canRespondToClaim(
  warranty: WarrantyView,
  claim: WarrantyClaimView | undefined,
  address?: string | null,
  now = nowEpoch()
): boolean {
  return Boolean(
    claim &&
      sameAddress(address, warranty.seller) &&
      claim.status === "OPEN" &&
      !claim.paid_out &&
      claim.responded_at === 0 &&
      now < claim.response_deadline
  );
}

export function canApproveClaim(
  warranty: WarrantyView,
  claim: WarrantyClaimView | undefined,
  address?: string | null
): boolean {
  return Boolean(
    claim &&
      sameAddress(address, warranty.seller) &&
      claim.status === "OPEN" &&
      !claim.paid_out &&
      claim.attested
  );
}

export function canAttestClaim(
  warranty: WarrantyView,
  claim: WarrantyClaimView | undefined,
  address?: string | null
): boolean {
  return Boolean(
    claim &&
      sameAddress(address, warranty.issuer) &&
      claim.status === "OPEN" &&
      !claim.paid_out &&
      !claim.attested
  );
}

export function canJudgeClaim(
  claim: WarrantyClaimView | undefined,
  now = nowEpoch()
): boolean {
  return Boolean(
    claim &&
      claim.status === "OPEN" &&
      !claim.paid_out &&
      now < (claim.judge_deadline || Number.MAX_SAFE_INTEGER) &&
      (claim.responded_at > 0 || now >= claim.response_deadline)
  );
}

export function canTimeoutClaim(
  claim: WarrantyClaimView | undefined,
  now = nowEpoch()
): boolean {
  return Boolean(
    claim &&
      claim.status === "OPEN" &&
      !claim.paid_out &&
      claim.judge_deadline > 0 &&
      now >= claim.judge_deadline
  );
}

export function canCloseWarranty(
  warranty: WarrantyView,
  _address?: string | null,
  now = nowEpoch()
): boolean {
  return (
    !warranty.closed &&
    (warranty.status === "ACTIVE" || warranty.status === "EXHAUSTED") &&
    !warranty.has_open_claim &&
    now >= warranty.expires_at
  );
}

export function validateCreateInputs(input: {
  seller?: string | null;
  buyer: string;
  issuer: string;
  evidenceType: string;
  productName: string;
  serialHash: string;
  terms: string;
  exclusions: string;
  coverageWei: bigint;
  activationSeconds: number;
  durationSeconds: number;
  config?: ProtocolConfig;
}): string | null {
  const buyer = input.buyer.trim();
  const issuer = input.issuer.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(buyer)) return "Buyer must be a 20-byte hex address";
  if (isZeroAddress(buyer)) return "Buyer cannot be the zero address";
  if (sameAddress(input.seller, buyer)) return "Seller cannot issue a warranty to themselves";
  if (!/^0x[a-fA-F0-9]{40}$/.test(issuer)) return "Issuer must be a 20-byte hex address";
  if (isZeroAddress(issuer)) return "Issuer cannot be the zero address";
  if (sameAddress(issuer, buyer)) return "Issuer cannot be the buyer";
  if (sameAddress(issuer, input.seller)) return "Issuer cannot be the seller";
  if (!["MANUFACTURER", "REPAIRER", "INVOICE", "TELEMETRY", "INSPECTION"].includes(input.evidenceType)) {
    return "evidence_type must be MANUFACTURER, REPAIRER, INVOICE, TELEMETRY, or INSPECTION";
  }
  if (!input.productName.trim()) return "product_name is required";
  if (input.productName.trim().length > 200) return "product_name exceeds maximum length 200";
  if (!input.terms.trim()) return "terms is required";
  if (input.terms.trim().length > 4000) return "terms exceeds maximum length 4000";
  if (!input.exclusions.trim()) return "exclusions is required";
  if (input.exclusions.trim().length > 2500) return "exclusions exceeds maximum length 2500";
  const minStake = asWei(input.config?.minimum_claim_stake ?? "10000000000000000");
  if (input.coverageWei < minStake) return "coverage_limit must be >= minimum_claim_stake";
  const minAct = Number(input.config?.minimum_activation_window ?? 60);
  const maxAct = Number(input.config?.maximum_activation_window ?? 30 * 24 * 60 * 60);
  if (input.activationSeconds < minAct) return "activation window below minimum";
  if (input.activationSeconds > maxAct) return "activation window above maximum";
  const minDur = Number(input.config?.minimum_duration ?? 60);
  const maxDur = Number(input.config?.maximum_duration ?? 3 * 365 * 24 * 60 * 60);
  if (input.durationSeconds < minDur) return "duration below minimum";
  if (input.durationSeconds > maxDur) return "duration above maximum";
  return null;
}

export function canRegisterIssuer(
  address?: string | null,
  registryAdmin?: string | null
): boolean {
  return Boolean(address && registryAdmin && sameAddress(address, registryAdmin));
}

export function validateArtifactUri(url: string): string | null {
  const value = url.trim();
  if (!value) return "artifact_uri is required";
  if (value.length > 500) return "artifact_uri exceeds maximum length 500";
  if (!value.toLowerCase().startsWith("https://")) return "artifact_uri must start with https://";
  if (value.includes("@")) return "Artifact URLs cannot contain user credentials";
  try {
    const host = new URL(value).hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host.endsWith(".local") ||
      host === "127.0.0.1" ||
      host === "::1"
    ) {
      return "Private or local URLs are not allowed";
    }
  } catch {
    return "artifact_uri must be a valid HTTPS URL";
  }
  return null;
}

export function validateSha256Hex(value: string, field: string): string | null {
  const text = value.trim().toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]{64}$/.test(text)) {
    return `${field} must be exactly 32 bytes (64 hex characters)`;
  }
  return null;
}
