"use client";

import Link from "next/link";
import { Home, Clock, Trophy, User, Info } from "lucide-react"; // Icons for tabs and About
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function Footer() {
  const pathname = usePathname();
  const [showInfo, setShowInfo] = useState(false);

  const navItems = [
    { href: "/?tab=active", icon: Home, label: "Active" },
    { href: "/?tab=ended", icon: Clock, label: "Ended" },
    { href: "/?tab=leaderboard", icon: Trophy, label: "Leaderboard" },
    { href: "/?tab=myvotes", icon: User, label: "My Shares" },
  ];

  return (
    <footer className="w-full border-t bg-background fixed bottom-0 left-0 z-50 md:static">
      <div className="container max-w-7xl mx-auto flex flex-col items-center justify-between gap-4 py-4 md:flex-row md:py-8">
        {/* Mobile Navigation with Icons */}
        <div className="flex w-full justify-around md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center p-2",
                pathname.includes(item.href.split("?")[0]) &&
                  new URLSearchParams(pathname).get("tab") ===
                    item.label.toLowerCase()
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary"
              )}
              aria-label={item.label}
            >
              <item.icon className="h-6 w-6" />
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          ))}
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
