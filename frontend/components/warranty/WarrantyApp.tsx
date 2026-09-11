"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ContractSetupBanner } from "@/components/ContractSetupBanner";
import { RateLimitNotice } from "@/components/RateLimitNotice";
import { CreateWarrantyForm } from "@/components/warranty/CreateWarrantyForm";
import { HowItWorks } from "@/components/warranty/HowItWorks";
import { LiabilitiesPanel } from "@/components/warranty/LiabilitiesPanel";
import { RegisterIssuerForm } from "@/components/warranty/RegisterIssuerForm";
import { WarrantyCard } from "@/components/warranty/WarrantyCard";
import { useWarranties, type WarrantyFilter } from "@/lib/hooks/useWarrantyLock";
import { getContractAddress } from "@/lib/genlayer/client";

const FILTERS: { id: WarrantyFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "seller", label: "My sales" },
  { id: "buyer", label: "Named buyer" },
  { id: "open", label: "Open" },
];

export function WarrantyApp() {
  const [filter, setFilter] = useState<WarrantyFilter>("all");
  const { data: warranties = [], isLoading, error } = useWarranties(filter);
  const configured = Boolean(getContractAddress());

  return (
    <div className="space-y-8">
      <ContractSetupBanner />
      <HowItWorks />
      {configured && <LiabilitiesPanel />}
      {configured && <RateLimitNotice />}
      {configured && <RegisterIssuerForm />}
      {configured && <CreateWarrantyForm />}
      {configured && (
        <section className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <Button
                key={item.id}
                size="sm"
                variant={filter === item.id ? "gradient" : "outline"}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>
          {isLoading && <p className="text-sm text-muted-foreground">Loading warranties…</p>}
          {error && (
            <p className="text-sm text-destructive">
              Could not read warranties. Check the contract address and StudioNet quota.
            </p>
          )}
          <div className="grid gap-4">
            {warranties.map((warranty) => (
              <WarrantyCard key={warranty.id} warranty={warranty} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
