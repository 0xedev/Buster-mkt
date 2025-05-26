"use client";

import { useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk";
import Image from "next/image";
// import Link from "next/link";
// import { Newspaper } from "lucide-react";
import { useConnect, useAccount, useDisconnect, Connector } from "wagmi";

export function Navbar() {
  const [username, setUsername] = useState<string | null>(null);
  const [pfpUrl, setPfpUrl] = useState<string | null>(null);
  const { connect, connectors } = useConnect();
  const { isConnected: isAccountConnected } = useAccount();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const context = await sdk.context;
        setUsername(context.user.username || "player");
        setPfpUrl(context.user.pfpUrl || null);
      } catch {
        setUsername("player");
        setPfpUrl(null);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const autoConnectInMiniApp = async () => {
      try {
        const inMiniApp = await sdk.isInMiniApp();
        if (inMiniApp && !isAccountConnected) {
          const farcasterConnector = connectors.find(
            (c) => c.id === "farcasterFrame"
          );
          if (farcasterConnector) {
            connect({ connector: farcasterConnector });
          }
        }
      } catch (error) {
        console.error("Error during auto-connect:", error);
      }
    };
    autoConnectInMiniApp();
  }, [isAccountConnected, connect, connectors]);

  const WalletButton = () => {
    const {
      address,
      isConnected: wagmiIsConnected,
      isConnecting: wagmiIsConnecting,
    } = useAccount();
    const { connect: wagmiConnect, connectors: wagmiConnectors } = useConnect();
    const { disconnect: wagmiDisconnect } = useDisconnect();

    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
      setIsClient(true);
    }, []);

    if (!isClient) {
      return (
        <div className="px-3 py-1 rounded-full text-sm font-medium text-green-900 animate-pulse">
          Connecting...
        </div>
      );
    }

    const isValidConnector = (c: unknown): c is Connector =>
      !!c && typeof c === "object" && "id" in c && "connect" in c;

    const validConnectors = wagmiConnectors.filter(isValidConnector);

    const primaryConnector =
      validConnectors.find((c) => c.id === "farcasterFrame") ||
      (validConnectors.length > 0 ? validConnectors[0] : undefined);

    if (wagmiIsConnected && address) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 hidden md:inline">
            {`${address.slice(0, 6)}...${address.slice(-4)}`}
          </span>
          <button
            onClick={() => wagmiDisconnect()}
            className="bg-blueGray-500 hover:bg-green-900 text-white px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200"
          >
            Disconnect
          </button>
          <div className="md:hidden">
            <button
              onClick={() => wagmiDisconnect()}
              className="bg-green-800 text-white px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 whitespace-nowrap"
            >
              {`${address.slice(0, 4)}...${address.slice(-3)}`}
            </button>
          </div>
        </div>
      );
    } else if (wagmiIsConnecting) {
      return (
        <div className="px-3 py-1 rounded-full text-sm font-medium text-gray-400 animate-pulse">
          Connecting...
        </div>
      );
    } else {
      return (
        <div>
          {primaryConnector && (
            <button
              key={primaryConnector.id}
              onClick={() => wagmiConnect({ connector: primaryConnector })}
              className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 whitespace-nowrap"
            >
              Connect Wallet
            </button>
          )}
        </div>
      );
    }
  };

  return (
    <>
      {/* Desktop View */}
      <div className="hidden md:flex justify-between items-center mb-6 px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg shadow-sm">
        <div className="flex items-center gap-3">
          {pfpUrl && (
            <Image
              src={pfpUrl}
              alt="PFP"
              width={40}
              height={40}
              className="rounded-full"
            />
          )}
          <div className="text-xl font-bold text-gray-800">
            Welcome {username || "Player"}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <WalletButton />
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden flex justify-between items-center mb-4 px-3 py-2 bg-gradient-to-r from-green-50 to-green-100 rounded-lg shadow-sm">
        <div className="flex items-center gap-2">
          {pfpUrl && (
            <Image
              src={pfpUrl}
              alt="PFP"
              width={32}
              height={32}
              className="rounded-full"
            />
          )}
          <div className="text-sm font-medium text-gray-800">
            Welcome {username || "Player"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <WalletButton />
        </div>
      </div>
    </>
  );
}
