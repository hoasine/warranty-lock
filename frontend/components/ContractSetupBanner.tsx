"use client";

import { AlertCircle, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getContractAddress } from "@/lib/genlayer/client";

export function ContractSetupBanner() {
  if (getContractAddress()) return null;

  return (
    <Alert className="mb-8 border-accent/40 bg-accent/10">
      <AlertCircle className="h-5 w-5 text-accent" />
      <AlertTitle className="text-accent">Contract not configured</AlertTitle>
      <AlertDescription className="space-y-2 text-muted-foreground">
        <p>
          Deploy <code className="text-foreground">contracts/warranty_lock.py</code> in GenLayer
          Studio, then create <code className="text-foreground">frontend/.env.local</code>:
        </p>
        <pre className="overflow-x-auto rounded-lg bg-black/40 p-3 text-xs text-foreground">
          {`NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api`}
        </pre>
        <a
          href="https://studio.genlayer.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
        >
          Open GenLayer Studio <ExternalLink className="h-3 w-3" />
        </a>
      </AlertDescription>
    </Alert>
  );
}
