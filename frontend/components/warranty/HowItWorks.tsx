"use client";

export function HowItWorks() {
  const steps = [
    {
      n: "1",
      title: "Seller escrows coverage",
      body: "Create names one buyer, a 32-byte serial hash, locked terms/exclusions, and sends exactly the coverage limit. Terms cannot be edited later.",
    },
    {
      n: "2",
      title: "Buyer accept starts the clock",
      body: "Accept is only valid before the activation deadline. Expiry starts at accept. If the buyer never accepts, the seller can reclaim after that deadline.",
    },
    {
      n: "3",
      title: "One open claim at a time",
      body: "The buyer files an on-chain attestation plus the exact 0.01 GEN claim stake. Requested payout must stay within remaining coverage.",
    },
    {
      n: "4",
      title: "Seller reply or approve",
      body: "The seller can respond once before the 3-day window, or approve and pay the requested amount without AI.",
    },
    {
      n: "5",
      title: "AI eligibility, contract money",
      body: "Anyone may judge after a reply or after the response deadline, until the judge grace ends. Then timeout returns the stake as INCONCLUSIVE. COVERED pays the requested amount. Close after expiry is permissionless so leftover coverage cannot stay trapped.",
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
