"use client";

export function HowItWorks() {
  const steps = [
    {
      n: "1",
      title: "Seller escrows coverage",
      body: "Create names one buyer, a pinned issuer wallet, an evidence class, a product serial (hashed on-chain), locked terms, and the exact coverage amount. The issuer key cannot be edited later.",
    },
    {
      n: "2",
      title: "Buyer accept starts the clock",
      body: "Accept is only valid before the activation deadline. Accepting also accepts the pinned issuer. If the buyer never accepts, anyone can return unused escrow after that deadline.",
    },
    {
      n: "3",
      title: "One open claim at a time",
      body: "The buyer files a claim with the serial and the exact 0.01 GEN stake. Reason text is narrative only. A public web page cannot release coverage.",
    },
    {
      n: "4",
      title: "Issuer attest, then seller or AI",
      body: "The locked issuer wallet must attest that open claim. Only then can the seller approve, or AI return COVERED. Missing attest blocks a covered payout.",
    },
    {
      n: "5",
      title: "AI eligibility, contract money",
      body: "Anyone may judge after a reply or after the response deadline, until the judge grace ends. COVERED without issuer attest becomes INCONCLUSIVE. Timeout returns the stake. Close after expiry is permissionless.",
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
