"use client";

export function HowItWorks() {
  const steps = [
    {
      n: "1",
      title: "Seller escrows coverage",
      body: "Create names one buyer, a product serial (hashed on-chain), locked terms/exclusions, and sends exactly the coverage limit. Terms cannot be edited later. The buyer must re-enter the same serial to file a claim.",
    },
    {
      n: "2",
      title: "Buyer accept starts the clock",
      body: "Accept is only valid before the activation deadline. Expiry starts at accept. If the buyer never accepts, the seller can reclaim after that deadline.",
    },
    {
      n: "3",
      title: "One open claim at a time",
      body: "The buyer files one public HTTPS evidence URL plus the exact 0.01 GEN claim stake. The contract snapshots that page and requires the serial and requested amount to appear in the snapshot. Requested payout must stay within remaining coverage.",
    },
    {
      n: "4",
      title: "Seller reply or approve",
      body: "The seller can respond once before the 3-day window, or approve the requested amount without AI — but only if the same snapshotted evidence package is intact.",
    },
    {
      n: "5",
      title: "AI eligibility, contract money",
      body: "Anyone may judge after a reply or after the response deadline, until the judge grace ends. COVERED is refused unless the snapshot, evidence class, serial bind, and amount bind all pass; otherwise the result is INCONCLUSIVE. Timeout returns the stake. Close after expiry is permissionless so leftover coverage cannot stay trapped.",
    },
  ];

  return (
    <section className="brand-card p-6">
      <h2 className="mb-4 font-display text-xl font-semibold">How WarrantyLock works</h2>
      <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {steps.map((step) => (
          <li key={step.n} className="soft-tile p-4">
            <p className="mb-2 text-xs font-semibold tracking-wide text-accent">STEP {step.n}</p>
            <p className="mb-1 font-medium">{step.title}</p>
            <p className="text-sm text-muted-foreground">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
