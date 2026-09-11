"use client";

import { Shield } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { WarrantyApp } from "@/components/warranty/WarrantyApp";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-grow px-4 pt-24 pb-16 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-12 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              <Shield className="h-3.5 w-3.5" />
              Project · GenLayer Studionet
            </div>
            <h1 className="mb-4 font-display text-4xl font-bold md:text-6xl">
              Warranty<span className="text-gradient">Lock</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Escrow the coverage. Register an issuer. AI classifies coverage — the contract
              decides the money.
            </p>
          </header>
          <WarrantyApp />
        </div>
      </main>
      <footer className="border-t border-white/5 px-4 py-8">
        <p className="text-center text-xs text-muted-foreground">
          WarrantyLock · Powered by GenLayer · Eligibility escrow — not a physical-evidence oracle
        </p>
      </footer>
    </div>
  );
}
