"use client";

import Link from "next/link";
import { Home, Clock, Trophy, User, Info } from "lucide-react"; // Icons for tabs and About
import { usePathname, useSearchParams } from "next/navigation"; // Import useSearchParams
import { cn } from "@/lib/utils";
import { useState } from "react";

export function Footer() {
  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  const pathname = usePathname();
  const searchParams = useSearchParams(); // Use the hook
  const [showInfo, setShowInfo] = useState(false);
  const currentQueryTab = searchParams.get("tab");

  const navItems = [
    { hrefBase: "/", tabValue: "active", icon: Home, label: "Active" },
    { hrefBase: "/", tabValue: "ended", icon: Clock, label: "Ended" },
    {
      hrefBase: "/",
      tabValue: "leaderboard",
      icon: Trophy,
      label: "Leaderboard",
    },
    { hrefBase: "/", tabValue: "myvotes", icon: User, label: "My Shares" },
  ];

  return (
    <footer className="w-full border-t bg-background fixed bottom-0 left-0 z-50 md:static">
      <div className="container max-w-7xl mx-auto flex flex-col items-center justify-between gap-4 py-4 md:flex-row md:py-8">
        {/* Mobile Navigation with Icons */}
        <div className="flex w-full justify-around md:hidden">
          {navItems.map((item) => {
            const href = `${item.hrefBase}?tab=${item.tabValue}`;
            // An item is active if its tabValue matches the currentQueryTab.
            // If currentQueryTab is null (no tab in URL), 'active' is the default active tab.
            const isActive =
              (currentQueryTab === null && item.tabValue === "active") ||
              currentQueryTab === item.tabValue;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center p-2",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-primary"
                )}
                aria-label={item.label}
              >
                <item.icon className="h-6 w-6" />
                <span className="text-xs mt-1">{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={cn(
              "flex flex-col items-center p-2",
              showInfo
                ? "text-primary"
                : "text-muted-foreground hover:text-primary"
            )}
            aria-label="About"
          >
            <Info className="h-6 w-6" />
            <span className="text-xs mt-1">About</span>
          </button>
        </div>

        {/* About Panel for Mobile */}
        {showInfo && (
          <div className="md:hidden bg-white shadow-lg rounded-lg p-4 mb-6 border-l-4 border-gray-500 w-full">
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
            </div>
          </div>
        )}

        {/* Desktop Footer Content */}
        <div className="hidden md:flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built by{" "}
            <Link
              href="https://warpcast.com/~/channel/politics"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4"
            >
              Politics
            </Link>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
