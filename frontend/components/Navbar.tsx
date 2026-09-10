"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AccountPanel } from "./AccountPanel";
import { Logo, LogoMark } from "./Logo";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed top-0 right-0 left-0 z-50">
      <div
        className={`mx-auto border-b border-white/10 backdrop-blur-xl transition-all ${
          scrolled ? "max-w-7xl rounded-full border" : "max-w-none"
        }`}
      >
        <div className="flex h-16 items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3" aria-label="WarrantyLock home">
            <LogoMark className="flex md:hidden" />
            <Logo className="hidden md:flex" />
            <span className="text-lg font-bold">WarrantyLock</span>
          </Link>
          <p className="hidden text-sm text-muted-foreground md:block">
            Escrow coverage. Pin an issuer. AI decides eligibility only.
          </p>
          <AccountPanel />
        </div>
      </div>
    </header>
  );
}
