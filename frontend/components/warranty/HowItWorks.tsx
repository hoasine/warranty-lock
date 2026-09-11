"use client";

export function HowItWorks() {
  const steps = [
    {
      n: "1",
      title: "Registry lists issuers",
      body: "An independent registry admin registers issuer wallets per evidence class (manufacturer, repairer, invoice, telemetry, or inspection) plus a credential hash. Sellers cannot write this list.",
    },
    {
      n: "2",
      title: "Seller escrows coverage",
      body: "Create names one buyer, a registered issuer, an evidence class, a serial hash, locked terms, and the exact coverage amount. The issuer cannot be the seller.",
    },
    {
      n: "3",
      title: "Buyer files a claim",
      body: "The buyer files the serial and the exact 0.01 GEN stake. Reason text is narrative only. A public web page cannot release coverage by itself.",
    },
    {
      n: "4",
      title: "Issuer commits an artifact",
      body: "The locked issuer attests this claim with type, serial, amount, and an artifact hash. Validators fetch the HTTPS artifact and require the hash to match. No attest, no payout.",
    },
    {
      n: "5",
      title: "AI eligibility, contract money",
      body: "Anyone may judge after a reply or after the response deadline. COVERED without a valid registered attest becomes INCONCLUSIVE. Timeout returns the stake.",
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
