"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import { getContractAddress, getStudioUrl, ensureGenLayerNetwork } from "@/lib/genlayer/client";
import {
  WarrantyLockClient,
  type TransactionProgress,
} from "@/lib/contracts/WarrantyLock";

export type WarrantyFilter = "all" | "seller" | "buyer" | "open";

export function useWarrantyLockClient() {
  const { address } = useWallet();
  const contract = getContractAddress();
  return useMemo(() => {
    if (!contract) return null;
    return new WarrantyLockClient(contract, address, getStudioUrl());
  }, [contract, address]);
}

export function useWarranties(filter: WarrantyFilter = "all") {
  const client = useWarrantyLockClient();
  const { address } = useWallet();
  return useQuery({
    queryKey: ["warranties", getContractAddress(), filter, address],
    queryFn: async () => {
      if (!client) return [];
      const list = await client.getAllWarranties();
      const sorted = [...list].sort((a, b) => b.id - a.id);
      const me = address?.toLowerCase();
      if (filter === "seller") {
        if (!me) return [];
        return sorted.filter((w) => w.seller.toLowerCase() === me);
      }
      if (filter === "buyer") {
        if (!me) return [];
        return sorted.filter((w) => w.buyer.toLowerCase() === me);
      }
      if (filter === "open") {
        return sorted.filter(
          (w) => w.has_open_claim || w.status === "OFFERED" || w.status === "ACTIVE"
        );
      }
      return sorted;
    },
    enabled: !!client,
    refetchInterval: 60_000,
    retry: 0,
  });
}

export function useWarrantyClaims(warrantyId: number, enabled = true) {
  const client = useWarrantyLockClient();
  return useQuery({
    queryKey: ["warranty-claims", getContractAddress(), warrantyId],
    queryFn: () => client!.getWarrantyClaims(warrantyId),
    enabled: !!client && enabled && warrantyId >= 0,
    refetchInterval: 8_000,
    retry: 0,
  });
}

export function useProtocolConfig() {
  const client = useWarrantyLockClient();
  return useQuery({
    queryKey: ["warranty-lock-config", getContractAddress()],
    queryFn: () => client!.getProtocolConfig(),
    enabled: !!client,
    staleTime: 60_000,
  });
}

export function useLiabilities() {
  const client = useWarrantyLockClient();
  return useQuery({
    queryKey: ["warranty-lock-liabilities", getContractAddress()],
    queryFn: () => client!.getLiabilities(),
    enabled: !!client,
    refetchInterval: 60_000,
    retry: 0,
  });
}

function useInvalidateWarranties() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["warranties"] });
    queryClient.invalidateQueries({ queryKey: ["warranty-claims"] });
    queryClient.invalidateQueries({ queryKey: ["warranty-lock-liabilities"] });
  };
}

function useWrite<T extends unknown[]>(
  client: WarrantyLockClient | null,
  invalidate: () => void,
  fn: (c: WarrantyLockClient, ...args: T) => Promise<unknown>
) {
  return useMutation({
    mutationFn: async (vars: T) => {
      if (!client) throw new Error("Contract not configured");
      await ensureGenLayerNetwork();
      return fn(client, ...vars);
    },
    onSuccess: invalidate,
  });
}

export function useWarrantyWrites() {
  const client = useWarrantyLockClient();
  const invalidate = useInvalidateWarranties();

  return {
    create: useWrite(
      client,
      invalidate,
      (
        c,
        buyer: string,
        productName: string,
        serialHash: string,
        terms: string,
        exclusions: string,
        coverageWei: bigint,
        activationSeconds: number,
        durationSeconds: number,
        evidenceType: string,
        issuer: string,
        onProgress?: (p: TransactionProgress) => void
      ) =>
        c.createWarranty(
          buyer,
          productName,
          serialHash,
          terms,
          exclusions,
          coverageWei,
          activationSeconds,
          durationSeconds,
          evidenceType,
          issuer,
          onProgress
        )
    ),
    accept: useWrite(
      client,
      invalidate,
      (c, warrantyId: number, onProgress?: (p: TransactionProgress) => void) =>
      c.acceptWarranty(warrantyId, onProgress)
    ),
    cancel: useWrite(
      client,
      invalidate,
      (c, warrantyId: number, onProgress?: (p: TransactionProgress) => void) =>
      c.cancelUnaccepted(warrantyId, onProgress)
    ),
    file: useWrite(
      client,
      invalidate,
      (
        c,
        warrantyId: number,
        requested: bigint,
        reason: string,
        serialPreimage: string,
        stake: bigint,
        onProgress?: (p: TransactionProgress) => void
      ) => c.fileClaim(warrantyId, requested, reason, serialPreimage, stake, onProgress)
    ),
    attest: useWrite(
      client,
      invalidate,
      (c, claimId: number, onProgress?: (p: TransactionProgress) => void) =>
        c.attestClaim(claimId, onProgress)
    ),
    respond: useWrite(
      client,
      invalidate,
      (c, claimId: number, response: string, onProgress?: (p: TransactionProgress) => void) =>
        c.respondToClaim(claimId, response, onProgress)
    ),
    approve: useWrite(
      client,
      invalidate,
      (c, claimId: number, onProgress?: (p: TransactionProgress) => void) =>
      c.approveClaim(claimId, onProgress)
    ),
    judge: useWrite(
      client,
      invalidate,
      (c, claimId: number, onProgress?: (p: TransactionProgress) => void) =>
      c.judgeClaim(claimId, onProgress)
    ),
    timeout: useWrite(
      client,
      invalidate,
      (c, claimId: number, onProgress?: (p: TransactionProgress) => void) =>
      c.timeoutClaim(claimId, onProgress)
    ),
    close: useWrite(
      client,
      invalidate,
      (c, warrantyId: number, onProgress?: (p: TransactionProgress) => void) =>
      c.closeWarranty(warrantyId, onProgress)
    ),
  };
}
