"use client";

import { useLiabilities } from "@/lib/hooks/useWarrantyLock";
import { formatGen } from "@/lib/utils/format";

export function LiabilitiesPanel() {
  const { data } = useLiabilities();
  if (!data) return null;
  return (
    <section className="brand-card grid gap-3 p-6 md:grid-cols-3">
      <div>
        <p className="text-xs text-muted-foreground">Coverage locked</p>
        <p className="font-display text-lg">{formatGen(data.coverage_locked)} GEN</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Claim stakes locked</p>
        <p className="font-display text-lg">{formatGen(data.claim_stakes_locked)} GEN</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Total tracked liabilities</p>
        <p className="font-display text-lg">{formatGen(data.total_locked)} GEN</p>
      </div>
    </section>
  );
}
