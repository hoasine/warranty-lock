"use client";

import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { createWalletClient, custom, type WalletClient } from "viem";

export const GENLAYER_CHAIN_ID = parseInt(
  process.env.NEXT_PUBLIC_GENLAYER_CHAIN_ID || "61999",
  10
);
export const GENLAYER_CHAIN_ID_HEX = `0x${GENLAYER_CHAIN_ID.toString(16)}`;

export const GENLAYER_NETWORK = {
  chainId: GENLAYER_CHAIN_ID_HEX,
  chainName: process.env.NEXT_PUBLIC_GENLAYER_CHAIN_NAME || "GenLayer Studionet",
  nativeCurrency: {
    name: process.env.NEXT_PUBLIC_GENLAYER_SYMBOL || "GEN",
    symbol: process.env.NEXT_PUBLIC_GENLAYER_SYMBOL || "GEN",
    decimals: 18,
  },
  rpcUrls: [
    process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://studio.genlayer.com/api",
  ],
  blockExplorerUrls: ["https://studio.genlayer.com"],
};

function isMissingChainError(error: unknown): boolean {
  const err = error as {
    code?: number | string;
    message?: string;
    data?: { originalError?: { code?: number }; code?: number };
  };
  const code = typeof err?.code === "string" ? parseInt(err.code, 10) : err?.code;
  const nested = err?.data?.originalError?.code ?? err?.data?.code;
  const msg = String(err?.message || error || "").toLowerCase();
  return (
    code === 4902 ||
    nested === 4902 ||
    code === -32603 ||
    msg.includes("unrecognized chain") ||
    msg.includes("try adding the chain") ||
    msg.includes("wallet_addethereumchain")
  );
}

interface EthereumProvider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
}

function providerErrorCode(error: unknown): number | undefined {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "number" ? code : undefined;
  }
  return undefined;
}

function providerErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? error);
  }
  return String(error);
}

function asAddressList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export function getStudioUrl(): string {
  return process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://studio.genlayer.com/api";
}

export function getContractAddress(): string {
  return process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim() || "";
}

export function isValidContractAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function isMetaMaskInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return !!window.ethereum?.isMetaMask;
}

export function getEthereumProvider(): EthereumProvider | null {
  if (typeof window === "undefined") return null;
  return window.ethereum || null;
}

export async function requestAccounts(): Promise<string[]> {
  const provider = getEthereumProvider();
  if (!provider) throw new Error("MetaMask is not installed");
  try {
    return asAddressList(await provider.request({ method: "eth_requestAccounts" }));
  } catch (error: unknown) {
    if (providerErrorCode(error) === 4001) {
      throw new Error("User rejected the connection request");
    }
    throw new Error(`Failed to connect to MetaMask: ${providerErrorMessage(error)}`);
  }
}

export async function getAccounts(): Promise<string[]> {
  const provider = getEthereumProvider();
  if (!provider) return [];
  try {
    return asAddressList(await provider.request({ method: "eth_accounts" }));
  } catch {
    return [];
  }
}

export async function getCurrentChainId(): Promise<string | null> {
  const provider = getEthereumProvider();
  if (!provider) return null;
  try {
    const chainId = await provider.request({ method: "eth_chainId" });
    return typeof chainId === "string" ? chainId : null;
  } catch {
    return null;
  }
}

export async function addGenLayerNetwork(): Promise<void> {
  const provider = getEthereumProvider();
  if (!provider) throw new Error("MetaMask is not installed");
  try {
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [GENLAYER_NETWORK],
    });
  } catch (error: unknown) {
    if (providerErrorCode(error) === 4001) {
      throw new Error("User rejected adding the network");
    }
    throw new Error(`Failed to add GenLayer network: ${providerErrorMessage(error)}`);
  }
}

export async function switchToGenLayerNetwork(): Promise<void> {
  const provider = getEthereumProvider();
  if (!provider) throw new Error("MetaMask is not installed");
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: GENLAYER_CHAIN_ID_HEX }],
    });
  } catch (error: unknown) {
    const err = error as { code?: number };
    if (err?.code === 4001) throw new Error("User rejected switching the network");
    if (isMissingChainError(error)) {
      await addGenLayerNetwork();
      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: GENLAYER_CHAIN_ID_HEX }],
        });
      } catch (switchAgain: unknown) {
        const again = switchAgain as { code?: number };
        if (again?.code === 4001) throw new Error("User rejected switching the network");
      }
      if (!(await isOnGenLayerNetwork())) {
        throw new Error(
          "Studionet was added but MetaMask is not on chain 61999 yet. Open MetaMask and select GenLayer Studionet."
        );
      }
      return;
    }
    throw new Error(`Failed to switch network: ${providerErrorMessage(error)}`);
  }
}

export async function isOnGenLayerNetwork(): Promise<boolean> {
  const chainId = await getCurrentChainId();
  if (!chainId) return false;
  return parseInt(chainId, 16) === GENLAYER_CHAIN_ID;
}

export async function ensureGenLayerNetwork(): Promise<void> {
  if (!(await isOnGenLayerNetwork())) {
    await switchToGenLayerNetwork();
  }
}

export async function connectMetaMask(): Promise<string> {
  if (!isMetaMaskInstalled()) throw new Error("MetaMask is not installed");
  const accounts = await requestAccounts();
  if (!accounts.length) throw new Error("No accounts found");
  if (!(await isOnGenLayerNetwork())) await switchToGenLayerNetwork();
  return accounts[0];
}

export async function switchAccount(): Promise<string> {
  const provider = getEthereumProvider();
  if (!provider) throw new Error("MetaMask is not installed");
  try {
    await provider.request({
      method: "wallet_requestPermissions",
      params: [{ eth_accounts: {} }],
    });
    const accounts = asAddressList(await provider.request({ method: "eth_accounts" }));
    if (!accounts.length) throw new Error("No account selected");
    return accounts[0];
  } catch (error: unknown) {
    const code = providerErrorCode(error);
    if (code === 4001) throw new Error("User rejected account switch");
    if (code === -32002) throw new Error("Account switch request already pending");
    throw new Error(`Failed to switch account: ${providerErrorMessage(error)}`);
  }
}

export function createMetaMaskWalletClient(): WalletClient | null {
  const provider = getEthereumProvider();
  if (!provider) return null;
  try {
    return createWalletClient({
      chain: studionet as unknown as Parameters<typeof createWalletClient>[0]["chain"],
      transport: custom(provider as Parameters<typeof custom>[0]),
    });
  } catch {
    return null;
  }
}

export function createGenLayerClient(address?: string) {
  const config: Parameters<typeof createClient>[0] = { chain: studionet };
  if (address) config.account = address as `0x${string}`;
  return createClient(config);
}
