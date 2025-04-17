// src/components/navbar.tsx
import React, { useState } from "react";
import { ConnectButton, lightTheme } from "thirdweb/react";
import { client } from "@/app/client";
import { base } from "wagmi/chains";
import { createWallet } from "thirdweb/wallets";
import { ClaimTokensButton } from "./ClaimTokensButton";
import { WagmiConfig, createConfig, http } from "wagmi";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import { Menu, X } from "lucide-react";

const wagmiConfig = createConfig({
  chains: [base],
  transports: { [base.id]: http() },
  connectors: [farcasterFrame()],
});

const wallets = [
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("io.rabby"),
  createWallet("io.zerion.wallet"),
];

const customBase = {
  id: base.id,
  name: base.name,
  nativeCurrency: base.nativeCurrency,
  rpc: "https://base-mainnet.g.alchemy.com/v2/jprc9bb4eoqJdv5K71YUZdhKyf20gILa",
  blockExplorers: [
    {
      name: "Basescan",
      url: "https://basescan.org",
      apiUrl: "https://api-basescan.org/api",
    },
  ],
  network: "base",
};

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <WagmiConfig config={wagmiConfig}>
      {/* Desktop View */}
      <div className="hidden md:flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Forecast</h1>
        <div className="items-center flex gap-3">
          <ClaimTokensButton />
          <ConnectButton
            client={client}
            theme={lightTheme()}
            chain={customBase}
            wallets={wallets}
            connectModal={{ size: "compact" }}
            connectButton={{
              style: { fontSize: "0.75rem", height: "2.5rem" },
              label: "Sign In",
            }}
            detailsButton={{
              displayBalanceToken: {
                [base.id]: "0x55b04F15A1878fa5091D5E35ebceBC06A5EC2F31",
              },
            }}
          />
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden relative mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Forecast</h1>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        
        {/* Overlay Menu */}
        {menuOpen && (
          <div className="absolute right-0 top-12 mt-2 bg-white shadow-lg rounded-lg p-4 z-50 w-full md:w-64">
            <div className="flex flex-col gap-3">
              <ClaimTokensButton />
              <ConnectButton
                client={client}
                theme={lightTheme()}
                chain={customBase}
                wallets={wallets}
                connectModal={{ size: "compact" }}
                connectButton={{
                  style: { width: "100%" },
                  label: "Sign In",
                }}
                detailsButton={{
                  displayBalanceToken: {
                    [base.id]: "0x55b04F15A1878fa5091D5E35ebceBC06A5EC2F31",
                  },
                  style: { width: "100%" }
                }}
              />
            </div>
          </div>
        )}
      </div>
    </WagmiConfig>
  );
}
