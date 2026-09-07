"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import {
  isMetaMaskInstalled,
  connectMetaMask,
  switchAccount,
  getAccounts,
  getCurrentChainId,
  isOnGenLayerNetwork,
  switchToGenLayerNetwork,
  getEthereumProvider,
  GENLAYER_CHAIN_ID,
} from "./client";
import { error, userRejected, warning } from "../utils/toast";

const DISCONNECT_FLAG = "wallet_disconnected";

export interface WalletState {
  address: string | null;
  chainId: string | null;
  isConnected: boolean;
  isLoading: boolean;
  isMetaMaskInstalled: boolean;
  isOnCorrectNetwork: boolean;
}

interface WalletContextValue extends WalletState {
  connectWallet: () => Promise<string>;
  disconnectWallet: () => void;
  switchWalletAccount: () => Promise<string>;
  switchToStudionet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    address: null,
    chainId: null,
    isConnected: false,
    isLoading: true,
    isMetaMaskInstalled: false,
    isOnCorrectNetwork: false,
  });

  useEffect(() => {
    const initWallet = async () => {
      const installed = isMetaMaskInstalled();
      if (!installed) {
        setState({
          address: null,
          chainId: null,
          isConnected: false,
          isLoading: false,
          isMetaMaskInstalled: false,
          isOnCorrectNetwork: false,
        });
        return;
      }
      if (typeof window !== "undefined" && localStorage.getItem(DISCONNECT_FLAG) === "true") {
        setState({
          address: null,
          chainId: null,
          isConnected: false,
          isLoading: false,
          isMetaMaskInstalled: true,
          isOnCorrectNetwork: false,
        });
        return;
      }
      try {
        const accounts = await getAccounts();
        let chainId = await getCurrentChainId();
        let correctNetwork = await isOnGenLayerNetwork();
        if (accounts.length > 0 && !correctNetwork) {
          try {
            await switchToGenLayerNetwork();
            chainId = await getCurrentChainId();
            correctNetwork = await isOnGenLayerNetwork();
          } catch (switchErr) {
            console.warn("Could not auto-switch to GenLayer Studionet:", switchErr);
          }
        }
        setState({
          address: accounts[0] || null,
          chainId,
          isConnected: accounts.length > 0,
          isLoading: false,
          isMetaMaskInstalled: true,
          isOnCorrectNetwork: correctNetwork,
        });
      } catch {
        setState({
          address: null,
          chainId: null,
          isConnected: false,
          isLoading: false,
          isMetaMaskInstalled: true,
          isOnCorrectNetwork: false,
        });
      }
    };
    void initWallet();
  }, []);

  useEffect(() => {
    const provider = getEthereumProvider();
    if (!provider) return;

    const handleAccountsChanged = async (...args: unknown[]) => {
      const accounts = Array.isArray(args[0])
        ? args[0].filter((entry): entry is string => typeof entry === "string")
        : [];
      const hasDisconnectIntent =
        typeof window !== "undefined" && localStorage.getItem(DISCONNECT_FLAG) === "true";
      if (hasDisconnectIntent && accounts.length > 0) {
        setState((prev) => ({ ...prev, address: null, isConnected: false }));
        return;
      }
      let nextAccounts = accounts;
      if (nextAccounts.length === 0) {
        await new Promise((r) => setTimeout(r, 250));
        nextAccounts = await getAccounts();
      }
      const chainId = await getCurrentChainId();
      const correctNetwork = await isOnGenLayerNetwork();
      setState((prev) => ({
        ...prev,
        address: nextAccounts[0] || null,
        chainId,
        isConnected: nextAccounts.length > 0,
        isOnCorrectNetwork: correctNetwork,
      }));
    };

    const handleChainChanged = async (...args: unknown[]) => {
      const chainId = typeof args[0] === "string" ? args[0] : "0x0";
      const correctNetwork = parseInt(chainId, 16) === GENLAYER_CHAIN_ID;
      await new Promise((r) => setTimeout(r, 150));
      const accounts = await getAccounts();
      setState((prev) => ({
        ...prev,
        chainId,
        address: accounts[0] || prev.address,
        isConnected: accounts.length > 0 || prev.isConnected,
        isOnCorrectNetwork: correctNetwork,
      }));
    };

    const handleDisconnect = async () => {
      await new Promise((r) => setTimeout(r, 200));
      const accounts = await getAccounts();
      if (accounts.length > 0) {
        const chainId = await getCurrentChainId();
        const correctNetwork = await isOnGenLayerNetwork();
        setState((prev) => ({
          ...prev,
          address: accounts[0],
          chainId,
          isConnected: true,
          isOnCorrectNetwork: correctNetwork,
        }));
        return;
      }
      setState((prev) => ({ ...prev, address: null, isConnected: false }));
    };

    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("chainChanged", handleChainChanged);
    provider.on("disconnect", handleDisconnect);
    return () => {
      provider.removeListener("accountsChanged", handleAccountsChanged);
      provider.removeListener("chainChanged", handleChainChanged);
      provider.removeListener("disconnect", handleDisconnect);
    };
  }, []);

  const connectWallet = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      const wasDisconnected =
        typeof window !== "undefined" && localStorage.getItem(DISCONNECT_FLAG) === "true";
      const address = wasDisconnected ? await switchAccount() : await connectMetaMask();
      const chainId = await getCurrentChainId();
      const correctNetwork = await isOnGenLayerNetwork();
      if (typeof window !== "undefined") localStorage.removeItem(DISCONNECT_FLAG);
      setState({
        address,
        chainId,
        isConnected: true,
        isLoading: false,
        isMetaMaskInstalled: true,
        isOnCorrectNetwork: correctNetwork,
      });
      return address;
    } catch (err: unknown) {
      setState((prev) => ({ ...prev, isLoading: false }));
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("rejected")) userRejected("Connection cancelled");
      else if (message.includes("MetaMask is not installed")) {
        error("MetaMask not found", {
          description: "Please install MetaMask to connect your wallet.",
          action: {
            label: "Install MetaMask",
            onClick: () => window.open("https://metamask.io/download/", "_blank"),
          },
        });
      } else {
        error("Failed to connect wallet", { description: message });
      }
      throw err;
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    if (typeof window !== "undefined") localStorage.setItem(DISCONNECT_FLAG, "true");
    setState((prev) => ({ ...prev, address: null, isConnected: false }));
  }, []);

  const switchWalletAccount = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      const newAddress = await switchAccount();
      const chainId = await getCurrentChainId();
      const correctNetwork = await isOnGenLayerNetwork();
      if (typeof window !== "undefined") localStorage.removeItem(DISCONNECT_FLAG);
      setState({
        address: newAddress,
        chainId,
        isConnected: true,
        isLoading: false,
        isMetaMaskInstalled: true,
        isOnCorrectNetwork: correctNetwork,
      });
      return newAddress;
    } catch (err: unknown) {
      setState((prev) => ({ ...prev, isLoading: false }));
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("rejected")) userRejected("Account switch cancelled");
      else error("Failed to switch account", { description: message });
      throw err;
    }
  }, []);

  const switchToStudionet = useCallback(async () => {
    await switchToGenLayerNetwork();
    const chainId = await getCurrentChainId();
    const correctNetwork = await isOnGenLayerNetwork();
    setState((prev) => ({ ...prev, chainId, isOnCorrectNetwork: correctNetwork }));
    if (!correctNetwork) {
      warning("Still not on Studionet", {
        description: "Pick GenLayer Studionet (61999) in MetaMask manually.",
      });
    }
  }, []);

  return (
    <WalletContext.Provider
      value={{
        ...state,
        connectWallet,
        disconnectWallet,
        switchWalletAccount,
        switchToStudionet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
