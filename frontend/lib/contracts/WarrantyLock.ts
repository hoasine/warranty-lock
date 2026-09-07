import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

export type WarrantyStatus =
  | "OFFERED"
  | "ACTIVE"
  | "EXHAUSTED"
  | "CANCELLED"
  | "CLOSED";
export type ClaimStatus = "OPEN" | "APPROVED" | "JUDGED" | "TIMED_OUT";
export type Verdict = "COVERED" | "NOT_COVERED" | "INCONCLUSIVE" | "";

export type WarrantyView = {
  id: number;
  seller: string;
  buyer: string;
  product_name: string;
  serial_hash: string;
  terms: string;
  exclusions: string;
  coverage_limit: number | string;
  coverage_remaining: number | string;
  activation_deadline: number;
  duration_seconds: number;
  accepted_at: number;
  expires_at: number;
  status: WarrantyStatus;
  has_open_claim: boolean;
  open_claim_id: number;
  claim_count: number;
  closed: boolean;
  created_at: number;
  activation_open: boolean;
  coverage_active: boolean;
};

export type WarrantyClaimView = {
  id: number;
  warranty_id: number;
  buyer: string;
  requested_amount: number | string;
  reason: string;
  evidence: string;
  seller_response: string;
  stake: number | string;
  created_at: number;
  response_deadline: number;
  judge_deadline: number;
  responded_at: number;
  judged_at: number;
  verdict: Verdict;
  confidence: number;
  reasoning: string;
  case_key: string;
  status: ClaimStatus;
  paid_out: boolean;
};

export type ProtocolConfig = {
  minimum_claim_stake: number | string;
  minimum_activation_window: number | string;
  maximum_activation_window: number | string;
  minimum_duration: number | string;
  maximum_duration: number | string;
  response_window: number | string;
  judge_grace_window: number | string;
  warranty_count: number | string;
  claim_count: number | string;
};

export type Liabilities = {
  coverage_locked: number | string;
  claim_stakes_locked: number | string;
  total_locked: number | string;
};

export type TransactionProgress = {
  hash?: string;
  stage: "preparing" | "submitted" | "finalizing" | "finalized";
};

export type WriteResult = {
  hash: string;
  receipt: unknown;
};

const AI_TX_WAIT = {
  retries: 45,
  interval: 2500,
  status: TransactionStatus.FINALIZED,
};
const FAST_TX_WAIT = {
  retries: 18,
  interval: 2000,
  status: TransactionStatus.ACCEPTED,
};

function isRpcNoiseError(err: unknown): boolean {
  const msg = String(err instanceof Error ? err.message : err ?? "").toLowerCase();
  return (
    msg.includes("gen_call") ||
    msg.includes("rate limit") ||
    msg.includes("rate limited") ||
    msg.includes("too many requests") ||
    msg.includes("failed to fetch") ||
    msg.includes("fetch") ||
    msg.includes("network")
  );
}

function withMutedGenLayerConsole<T>(fn: () => Promise<T>): Promise<T> {
  if (typeof console === "undefined" || typeof console.error !== "function") {
    return fn();
  }
  const original = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    const text = args.map((a) => String(a)).join(" ");
    if (text.includes("Error fetching") && text.includes("from GenLayer RPC")) {
      return;
    }
    original(...args);
  };
  return fn().finally(() => {
    console.error = original;
  });
}

function normalizeReadValue(value: unknown): unknown {
  if (value instanceof Map) {
    const obj: Record<string, unknown> = {};
    for (const [key, entry] of value.entries()) {
      obj[String(key)] = normalizeReadValue(entry);
    }
    return obj;
  }
  if (typeof value === "bigint") {
    const n = Number(value);
    return Number.isSafeInteger(n) ? n : value.toString();
  }
  if (Array.isArray(value)) {
    return value.map(normalizeReadValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeReadValue(entry)])
    );
  }
  return value;
}

function normalizeReadResult<T>(raw: unknown): T {
  return normalizeReadValue(raw) as T;
}

export class WarrantyLockClient {
  private contractAddress: `0x${string}`;
  private readClient: ReturnType<typeof createClient>;
  private account?: `0x${string}`;
  private endpoint?: string;

  constructor(contractAddress: string, account?: string | null, endpoint?: string) {
    this.contractAddress = contractAddress as `0x${string}`;
    this.account = account ? (account as `0x${string}`) : undefined;
    this.endpoint = endpoint;
    const config: Record<string, unknown> = { chain: studionet };
    if (endpoint) config.endpoint = endpoint;
    this.readClient = createClient(config as Parameters<typeof createClient>[0]);
  }

  private async assertContractDeployed() {
    const endpoint = this.endpoint || "https://studio.genlayer.com/api";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "gen_getContractSchema",
          params: [this.contractAddress],
        }),
      });
      const data = (await res.json()) as {
        result?: { methods?: Record<string, unknown> };
        error?: { message?: string };
      };
      if (data.error || !data.result?.methods) {
        throw new Error(
          `No WarrantyLock contract at ${this.contractAddress} on Studionet. Deploy contracts/warranty_lock.py in GenLayer Studio, then set NEXT_PUBLIC_CONTRACT_ADDRESS.`
        );
      }
      if (!("create_warranty" in data.result.methods)) {
        throw new Error(
          `Contract at ${this.contractAddress} is missing create_warranty. Confirm you deployed WarrantyLock.`
        );
      }
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message.startsWith("No WarrantyLock") || err.message.startsWith("Contract at"))
      ) {
        throw err;
      }
    }
  }

  private async getWriteClient() {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("A browser wallet is required to send transactions.");
    }
    const { ensureGenLayerNetwork, getAccounts, requestAccounts } = await import(
      "@/lib/genlayer/client"
    );
    await ensureGenLayerNetwork();
    await this.assertContractDeployed();
    let accounts = await getAccounts();
    if (accounts.length === 0) {
      accounts = await requestAccounts();
    }
    const account = (accounts[0] || this.account) as `0x${string}` | undefined;
    if (!account) {
      throw new Error("Connect your wallet to continue");
    }
    this.account = account;
    return createClient({
      chain: studionet,
      endpoint: this.endpoint,
      account,
      provider: window.ethereum as NonNullable<
        Parameters<typeof createClient>[0]
      >["provider"],
    });
  }

  private async studioRpc<T>(method: string, params: unknown[]): Promise<T> {
    const endpoint = this.endpoint || "https://studio.genlayer.com/api";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method,
        params,
      }),
    });
    const data = (await res.json()) as { result?: T; error?: { message?: string } };
    if (data.error) {
      throw new Error(data.error.message || "Studio RPC error");
    }
    return data.result as T;
  }

  private statusReached(current: string, target: TransactionStatus | undefined): boolean {
    const cur = current.toUpperCase();
    const want = String(target ?? TransactionStatus.ACCEPTED).toUpperCase();
    if (cur.includes("CANCEL") || cur.includes("TIMEOUT")) return false;
    if (want.includes("FINAL")) {
      return cur === "FINALIZED" || cur === "ACCEPTED";
    }
    return cur === "ACCEPTED" || cur === "FINALIZED" || cur === "ACTIVATED";
  }

  private async waitForWrite(
    _client: ReturnType<typeof createClient>,
    hash: Awaited<ReturnType<ReturnType<typeof createClient>["writeContract"]>>,
    options: {
      retries: number;
      interval: number;
      status?: TransactionStatus;
    } = AI_TX_WAIT,
    onProgress?: (progress: TransactionProgress) => void
  ) {
    const txHash = String(hash);
    onProgress?.({ hash: txHash, stage: "finalizing" });
    let lastStatus = "";
    const retries = Math.max(1, options.retries);
    for (let i = 0; i < retries; i++) {
      try {
        lastStatus = String(
          await this.studioRpc<string>("gen_getTransactionStatus", [txHash])
        ).toUpperCase();
        if (lastStatus.includes("CANCEL") || lastStatus.includes("TIMEOUT")) {
          throw new Error(`Transaction ${lastStatus.toLowerCase().replace(/_/g, " ")}.`);
        }
        if (this.statusReached(lastStatus, options.status)) {
          onProgress?.({ hash: txHash, stage: "finalized" });
          return { hash: txHash, receipt: { statusName: lastStatus } } satisfies WriteResult;
        }
      } catch (err) {
        if (err instanceof Error && err.message.startsWith("Transaction ")) {
          throw err;
        }
        if (i >= 2 && isRpcNoiseError(err)) {
          onProgress?.({ hash: txHash, stage: "finalized" });
          return {
            hash: txHash,
            receipt: { statusName: lastStatus || "SUBMITTED", soft: true },
          } satisfies WriteResult;
        }
      }
      await new Promise((r) => setTimeout(r, options.interval));
    }
    onProgress?.({ hash: txHash, stage: "finalized" });
    return {
      hash: txHash,
      receipt: { statusName: lastStatus || "SUBMITTED", soft: true },
    } satisfies WriteResult;
  }

  private async write(
    functionName: string,
    args: Array<string | number>,
    value: bigint,
    wait = FAST_TX_WAIT,
    onProgress?: (progress: TransactionProgress) => void
  ) {
    onProgress?.({ stage: "preparing" });
    const client = await this.getWriteClient();
    const hash = await withMutedGenLayerConsole(() =>
      client.writeContract({
        address: this.contractAddress,
        functionName,
        args,
        value,
      })
    );
    onProgress?.({ hash: String(hash), stage: "submitted" });
    return this.waitForWrite(client, hash, wait, onProgress);
  }

  async getAllWarranties(): Promise<WarrantyView[]> {
    const raw = await this.readClient.readContract({
      address: this.contractAddress,
      functionName: "get_all_warranties",
      args: [],
    });
    const list = normalizeReadResult<WarrantyView[]>(raw);
    return Array.isArray(list) ? list : [];
  }

  async getWarrantyClaims(warrantyId: number): Promise<WarrantyClaimView[]> {
    const raw = await this.readClient.readContract({
      address: this.contractAddress,
      functionName: "get_warranty_claims",
      args: [warrantyId],
    });
    const list = normalizeReadResult<WarrantyClaimView[]>(raw);
    return Array.isArray(list) ? list : [];
  }

  async getProtocolConfig(): Promise<ProtocolConfig> {
    const raw = await this.readClient.readContract({
      address: this.contractAddress,
      functionName: "get_protocol_config",
      args: [],
    });
    return normalizeReadResult<ProtocolConfig>(raw);
  }

  async getLiabilities(): Promise<Liabilities> {
    const raw = await this.readClient.readContract({
      address: this.contractAddress,
      functionName: "get_liabilities",
      args: [],
    });
    return normalizeReadResult<Liabilities>(raw);
  }

  createWarranty(
    buyer: string,
    productName: string,
    serialHash: string,
    terms: string,
    exclusions: string,
    coverageWei: bigint,
    activationWindowSeconds: number,
    durationSeconds: number,
    onProgress?: (progress: TransactionProgress) => void
  ) {
    return this.write(
      "create_warranty",
      [
        buyer,
        productName,
        serialHash,
        terms,
        exclusions,
        coverageWei.toString(),
        activationWindowSeconds,
        durationSeconds,
      ],
      coverageWei,
      FAST_TX_WAIT,
      onProgress
    );
  }

  acceptWarranty(warrantyId: number, onProgress?: (progress: TransactionProgress) => void) {
    return this.write("accept_warranty", [warrantyId], 0n, FAST_TX_WAIT, onProgress);
  }

  cancelUnaccepted(warrantyId: number, onProgress?: (progress: TransactionProgress) => void) {
    return this.write("cancel_unaccepted", [warrantyId], 0n, FAST_TX_WAIT, onProgress);
  }

  fileClaim(
    warrantyId: number,
    requestedAmountWei: bigint,
    reason: string,
    evidence: string,
    stakeWei: bigint,
    onProgress?: (progress: TransactionProgress) => void
  ) {
    return this.write(
      "file_claim",
      [warrantyId, requestedAmountWei.toString(), reason, evidence],
      stakeWei,
      FAST_TX_WAIT,
      onProgress
    );
  }

  respondToClaim(
    claimId: number,
    response: string,
    onProgress?: (progress: TransactionProgress) => void
  ) {
    return this.write("respond_to_claim", [claimId, response], 0n, FAST_TX_WAIT, onProgress);
  }

  approveClaim(claimId: number, onProgress?: (progress: TransactionProgress) => void) {
    return this.write("approve_claim", [claimId], 0n, FAST_TX_WAIT, onProgress);
  }

  judgeClaim(claimId: number, onProgress?: (progress: TransactionProgress) => void) {
    return this.write("judge_claim", [claimId], 0n, AI_TX_WAIT, onProgress);
  }

  timeoutClaim(claimId: number, onProgress?: (progress: TransactionProgress) => void) {
    return this.write("timeout_claim", [claimId], 0n, FAST_TX_WAIT, onProgress);
  }

  closeWarranty(warrantyId: number, onProgress?: (progress: TransactionProgress) => void) {
    return this.write("close_warranty", [warrantyId], 0n, FAST_TX_WAIT, onProgress);
  }
}
