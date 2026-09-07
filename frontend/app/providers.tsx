"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { WalletProvider } from "@/lib/genlayer/WalletProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2000,
            refetchOnWindowFocus: false,
            retry: 1,
            throwOnError: false,
          },
        },
      })
  );

  useEffect(() => {
    const original = console.error.bind(console);
    console.error = (...args: unknown[]) => {
      const text = args.map((a) => String(a)).join(" ");
      if (text.includes("Error fetching") && text.includes("from GenLayer RPC")) {
        console.warn(...args);
        return;
      }
      original(...args);
    };
    return () => {
      console.error = original;
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>{children}</WalletProvider>
      <Toaster position="top-right" theme="dark" richColors closeButton />
    </QueryClientProvider>
  );
}
