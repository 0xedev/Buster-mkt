import React, { useState } from "react";
import { ConnectButton, lightTheme } from "thirdweb/react";
import { client } from "@/app/client";
import { base } from "wagmi/chains";
import { createWallet } from "thirdweb/wallets";
import { ClaimTokensButton } from "./ClaimTokensButton";
import { WagmiConfig, createConfig, http } from "wagmi";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import { Info } from "lucide-react";

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
      <div className="hidden md:flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Forecast</h1>
        <div className="flex items-center gap-3">
          <ClaimTokensButton />
          <ConnectButton
            client={client}
            theme={lightTheme()}
            chain={customBase}
            wallets={wallets}
            autoConnect={true}
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
      <div className="md:hidden flex justify-between items-center mb-6">
        <ConnectButton
          client={client}
          theme={lightTheme()}
          chain={customBase}
          wallets={wallets}
          autoConnect={true}
          connectModal={{ size: "compact" }}
          connectButton={{
            style: { fontSize: "0.65rem", height: "2rem", padding: "0 0.5rem" },
            label: "Sign In",
          }}
          detailsButton={{
            displayBalanceToken: {
              [base.id]: "0x55b04F15A1878fa5091D5E35ebceBC06A5EC2F31",
            },
            style: {
              fontSize: "0.6rem",
              height: "2rem",
            } /* padding: "0 0.5rem"*/,
          }}
        />
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="p-2 bg-rose-300 hover:bg-rose-500 text-white rounded-lg transition-colors"
        >
          <Info size={18} />
        </button>
      </div>

      {/* Info Panel */}
      {showInfo && (
        <div className="md:hidden bg-white shadow-lg rounded-lg p-4 mb-6">
          <div className="flex flex-col gap-3">
            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              <h3 className="font-bold mb-1">Welcome to Forecast!</h3>
              <p className="mb-2">
                Forecast is a prediction game where users can predict outcomes
                of various events.
              </p>
              <p className="mb-2">To start playing:</p>
              <ol className="list-decimal pl-5 mb-2">
                <li>Sign in with your wallet</li>
                <li>Claim 5,000 BSTR shares</li>
                <li>Browse available predictions</li>
                <li>Place your bets!</li>
              </ol>
              <p className="text-rose-300 font-semibold">
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
