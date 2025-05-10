"use client";

import { useEffect, useState } from "react";
import { ConnectButton, lightTheme } from "thirdweb/react";
import { client } from "@/app/client";
import { base } from "wagmi/chains";
import { createWallet } from "thirdweb/wallets";
import { WagmiConfig, createConfig, http } from "wagmi";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import { sdk } from "@farcaster/frame-sdk";

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
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await (await sdk.context).user;
        setUsername(user.username || "player");
      } catch {
        setUsername("player");
      }
    };
    fetchUser();
  }, []);

  return (
    <WagmiConfig config={wagmiConfig}>
      {/* Desktop View */}
      <div className="hidden md:flex justify-between items-center mb-6 px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg shadow-sm">
        <div className="text-xl font-bold text-gray-800">
          Welcome {username}
        </div>
        <ConnectButton
          client={client}
          theme={lightTheme({
            colors: {
              accentText: "#374151",
              accentButtonBg: "#1f2937",
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
      {/* Mobile View */}
      <div className="md:hidden flex justify-between items-center mb-4 px-3 py-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg shadow-sm">
        <div className="text-sm font-medium text-gray-800">
          Welcome {username}
        </div>
        <ConnectButton
          client={client}
          theme={lightTheme({
            colors: {
              accentText: "#374151",
              accentButtonBg: "#1f2937",
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
    </WagmiConfig>
  );
}
