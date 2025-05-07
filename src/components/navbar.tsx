"use client";

import React, { useState } from "react";
import { ConnectButton, lightTheme } from "thirdweb/react";
import { client } from "@/app/client";
import { base } from "wagmi/chains";
import { createWallet } from "thirdweb/wallets";
import { ClaimTokensButton } from "./ClaimTokensButton";
import { WagmiConfig, createConfig, http } from "wagmi";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";

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
  const [showInfo, setShowInfo] = useState(false);

  return (
    <WagmiConfig config={wagmiConfig}>
      {/* Desktop View */}
      <div className="hidden md:flex justify-between items-center mb-6 px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">Policast</h1>
        <div className="flex items-center gap-4">
          <ClaimTokensButton />
          <ConnectButton
            client={client}
            theme={lightTheme({
              colors: {
                accentText: "#374151", // gray-700
                accentButtonBg: "#1f2937", // gray-800
                accentButtonText: "white",
              },
            })}
            chain={customBase}
            wallets={wallets}
            autoConnect={true}
            connectModal={{ size: "compact" }}
            connectButton={{
              style: {
                fontSize: "0.875rem",
                height: "2.75rem",
                borderRadius: "0.5rem",
                fontWeight: "600",
              },
              label: "Sign In",
            }}
            detailsButton={{
              displayBalanceToken: {
                [base.id]: "0x55b04F15A1878fa5091D5E35ebceBC06A5EC2F31",
              },
              style: {
                borderRadius: "0.5rem",
                fontWeight: "600",
              },
            }}
          />
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden flex justify-end items-center mb-4 px-3 py-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`px-3 py-1 rounded-lg transition-colors text-sm font-medium ${
              showInfo
                ? "bg-gray-800 text-white"
                : "bg-white text-gray-700 border border-gray-300"
            }`}
          >
            About
          </button>
          <ConnectButton
            client={client}
            theme={lightTheme({
              colors: {
                accentText: "#374151", // gray-700
                accentButtonBg: "#1f2937", // gray-800
                accentButtonText: "white",
              },
            })}
            chain={customBase}
            wallets={wallets}
            autoConnect={true}
            connectModal={{ size: "compact" }}
            connectButton={{
              style: {
                fontSize: "0.75rem",
                height: "2.25rem",
                padding: "0 0.75rem",
                borderRadius: "0.5rem",
                fontWeight: "600",
              },
              label: "Sign In",
            }}
            detailsButton={{
              displayBalanceToken: {
                [base.id]: "0x55b04F15A1878fa5091D5E35ebceBC06A5EC2F31",
              },
              style: {
                fontSize: "0.65rem",
                height: "2.25rem",
                borderRadius: "0.5rem",
                fontWeight: "600",
              },
            }}
          />
        </div>
      </div>

      {/* Info Panel */}
      {showInfo && (
        <div className="md:hidden bg-white shadow-lg rounded-lg p-4 mb-6 border-l-4 border-gray-500">
          <div className="flex flex-col gap-3">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-bold text-gray-800 text-lg mb-2">
                Welcome to Policast!
              </h3>
              <p className="mb-3 text-gray-700">
                Policast is a prediction game where users can predict public
                sentiments.
              </p>
              <p className="mb-2 font-medium text-gray-800">
                To start playing:
              </p>
              <ol className="list-decimal pl-5 mb-3 space-y-1 text-gray-700">
                <li>Sign in with your wallet</li>
                <li>Claim 5,000 BSTR shares</li>
                <li>Browse available predictions</li>
                <li>Place your bets!</li>
              </ol>
              <p className="text-gray-800 font-semibold">
                Claim your tokens now to begin!
              </p>
            </div>
            <ClaimTokensButton />
          </div>
        </div>
      )}
    </WagmiConfig>
  );
}
