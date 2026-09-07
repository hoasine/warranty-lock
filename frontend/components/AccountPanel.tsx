"use client";

import { useState } from "react";
import { User, LogOut, AlertCircle, ExternalLink, Droplets } from "lucide-react";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import { success, error, userRejected } from "@/lib/utils/toast";
import { AddressDisplay } from "./AddressDisplay";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { getContractAddress } from "@/lib/genlayer/client";

export function AccountPanel() {
  const {
    address,
    isConnected,
    isMetaMaskInstalled,
    isOnCorrectNetwork,
    isLoading,
    connectWallet,
    disconnectWallet,
    switchWalletAccount,
    switchToStudionet,
  } = useWallet();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const hasContract = Boolean(getContractAddress());

  const handleConnect = async () => {
    if (!isMetaMaskInstalled) return;
    try {
      setBusy(true);
      await connectWallet();
      setOpen(false);
      success("Wallet connected");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to connect";
      if (!msg.includes("rejected")) error("Connection failed", { description: msg });
      else userRejected("Connection cancelled");
    } finally {
      setBusy(false);
    }
  };

  if (!isConnected) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="gradient" disabled={isLoading}>
            <User className="mr-2 h-4 w-4" />
            Connect wallet
          </Button>
        </DialogTrigger>
        <DialogContent className="brand-card max-w-md">
          <DialogHeader>
            <DialogTitle>Connect MetaMask</DialogTitle>
            <DialogDescription>Studionet · Chain ID 61999 · Token GEN</DialogDescription>
          </DialogHeader>
          {!isMetaMaskInstalled ? (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>MetaMask not installed</AlertTitle>
                <AlertDescription>Install MetaMask to send Studionet transactions.</AlertDescription>
              </Alert>
              <Button onClick={() => window.open("https://metamask.io/download/", "_blank")} variant="gradient">
                <ExternalLink className="mr-2 h-4 w-4" />
                Install MetaMask
              </Button>
            </>
          ) : (
            <Button onClick={handleConnect} variant="gradient" disabled={busy}>
              {busy ? "Connecting..." : "Connect MetaMask"}
            </Button>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-2">
        {!isOnCorrectNetwork && (
          <Button variant="outline" size="sm" onClick={() => switchToStudionet().catch((e) => error(String(e)))}>
            Switch network
          </Button>
        )}
        <div className="hidden items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 text-sm sm:flex">
          <div className={`h-2 w-2 rounded-full ${isOnCorrectNetwork ? "bg-[var(--mint)]" : "bg-[var(--peach)]"}`} />
          <AddressDisplay address={address} maxLength={10} />
          {hasContract && <span className="text-[10px] font-semibold text-accent">IC ✓</span>}
        </div>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <User className="h-4 w-4" />
          </Button>
        </DialogTrigger>
      </div>
      <DialogContent className="brand-card max-w-md">
        <DialogHeader>
          <DialogTitle>Your wallet</DialogTitle>
          <DialogDescription>GenLayer Studionet</DialogDescription>
        </DialogHeader>
        <code className="break-all text-xs">{address}</code>
        <Alert>
          <Droplets className="h-4 w-4" />
          <AlertDescription>
            Need GEN? Open{" "}
            <a href="https://studio.genlayer.com" className="underline" target="_blank" rel="noreferrer">
              Studio
            </a>{" "}
            faucet.
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => switchWalletAccount().catch(() => undefined)}>
          Switch account
        </Button>
        <Button
          variant="outline"
          className="text-destructive"
          onClick={() => {
            disconnectWallet();
            setOpen(false);
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </Button>
      </DialogContent>
    </Dialog>
  );
}
