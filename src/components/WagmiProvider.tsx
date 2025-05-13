"use client";

import React from "react"; // Import React
import { WagmiConfig, createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const wagmiConfig = createConfig({
  chains: [base],
  transports: { [base.id]: http(process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL) },
  connectors: [farcasterFrame()],
});

const queryClient = new QueryClient();

export function WagmiProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiConfig config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiConfig>
  );
}
