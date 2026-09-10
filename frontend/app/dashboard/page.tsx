"use client";

import { Shield } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { WarrantyApp } from "@/components/warranty/WarrantyApp";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-grow px-4 pt-24 pb-16 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-12 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              <Shield className="h-3.5 w-3.5" />
              Board
            </div>
            <h1 className="mb-4 font-display text-4xl font-bold md:text-6xl">
              Warranty<span className="text-gradient">Lock</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Create, accept, claim, attest, respond, approve, judge, or close.
            </p>
          </header>
          <WarrantyApp />
        </div>
      </main>
    </div>
  );
}
