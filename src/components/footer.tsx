"use client";

import Link from "next/link";
import { Home, Clock, Trophy, User, Info, Settings } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useUserRoles } from "@/hooks/useUserRoles";
import { toast } from "@/hooks/use-toast";

export function Footer() {
  const pathname = usePathname();
  const router = useRouter();
  const [showInfo, setShowInfo] = useState(false);
  const [currentQueryTab, setCurrentQueryTab] = useState<string | null>(null);
  const { hasCreatorAccess, hasResolverAccess, isAdmin } = useUserRoles();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setCurrentQueryTab(params.get("tab"));
    }
  }, [pathname]);

  const navItems = [
    { hrefBase: "/", tabValue: "active", icon: Home, label: "Active" },
    { hrefBase: "/", tabValue: "ended", icon: Clock, label: "Ended" },
    {
      hrefBase: "/",
      tabValue: "leaderboard",
      icon: Trophy,
      label: "Leaderboard",
    },
    { hrefBase: "/", tabValue: "profile", icon: User, label: "Profile" },
  ];

  const allNavItems = [
    ...navItems,
    ...(hasCreatorAccess || hasResolverAccess || isAdmin
      ? [{ hrefBase: "/", tabValue: "admin", icon: Settings, label: "Admin" }]
      : []),
  ];

  const handleNavClick = (hrefBase: string, tabValue: string) => {
    if (showInfo) {
      setShowInfo(false);
    }

    if (hrefBase === "/" && tabValue) {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set("tab", tabValue);
      window.history.pushState(null, "", newUrl.toString());
      setCurrentQueryTab(tabValue);

      window.dispatchEvent(
        new CustomEvent("tabChange", { detail: { tab: tabValue } })
      );
    } else {
      router.push(hrefBase);
    }
  };

  const USDC_CAIP19 =
    "eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const CAIP_ETH = "eip155:8453/native";
  const POLITICS_CAIP19 =
    "eip155:8453/erc20:0x43ad5adae56fa09127ba147d5b24c4bc34abdb07";

  const handleBuyPolitics = async (sellToken: string) => {
    try {
      await sdk.actions.swapToken({
        sellToken,
        buyToken: POLITICS_CAIP19,
      });
    } catch (error) {
      console.error("Failed to open swap:", error);
      toast({
        title: "Swap Failed",
        description: "Unable to open token swap. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="relative">
      {/* About Panel - Compact & Modern */}
      {showInfo && (
        <div className="md:hidden bg-gradient-to-br from-[#433952] to-[#352c3f] backdrop-blur-xl shadow-2xl rounded-t-2xl border-t-2 border-purple-500 w-full fixed bottom-14 left-0 z-40 animate-slide-up">
          <div className="p-4">
            <div className="bg-gradient-to-br from-[#544863] to-[#433952] p-3 rounded-xl border border-purple-500/30">
              <h3 className="font-bold text-gray-100 text-base mb-1.5 flex items-center gap-2">
                <span className="text-purple-400">👋</span> Welcome to Policast!
              </h3>
              <p className="text-xs text-gray-300 mb-2 leading-relaxed">
                Predict public sentiments and win rewards!
              </p>
              <div className="flex flex-col gap-1.5 text-xs text-gray-200 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold">
                    1
                  </span>
                  <span>Sign in with your wallet</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                    2
                  </span>
                  <span>Browse predictions</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold">
                    3
                  </span>
                  <span>Place your bets!</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBuyPolitics(USDC_CAIP19)}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
                >
                  Buy with USDC
                </button>
                <button
                  onClick={() => handleBuyPolitics(CAIP_ETH)}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all shadow-md hover:shadow-lg"
                >
                  Buy with ETH
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="w-full bg-[#433952]/90 backdrop-blur-xl border-t border-[#544863] fixed bottom-0 left-0 z-50 md:static shadow-lg md:shadow-none">
        <div className="container max-w-7xl mx-auto flex flex-col items-center justify-between gap-4 md:flex-row md:py-6">
          {/* Mobile Navigation - Compact & Modern */}
          <div className="flex w-full justify-around md:hidden py-2">
            {allNavItems.map((item) => {
              const href =
                item.hrefBase === "/"
                  ? `${item.hrefBase}?tab=${item.tabValue}`
                  : item.hrefBase;
              const isActive =
                (currentQueryTab === null && item.tabValue === "active") ||
                currentQueryTab === item.tabValue ||
                (pathname === item.hrefBase && item.tabValue === "");

              return (
                <button
                  key={href}
                  onClick={() => handleNavClick(item.hrefBase, item.tabValue)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 transition-all duration-200 relative px-3 py-1",
                    isActive
                      ? "text-purple-400"
                      : "text-gray-400 hover:text-purple-400"
                  )}
                  aria-label={item.label}
                >
                  {isActive && (
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full" />
                  )}
                  <item.icon
                    className={cn(
                      "h-5 w-5 transition-all duration-200",
                      isActive && "scale-110"
                    )}
                  />
                  <span
                    className={cn(
                      "text-[10px] font-medium transition-all duration-200",
                      isActive && "font-semibold"
                    )}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
            <button
              onClick={() => setShowInfo(!showInfo)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-all duration-200 relative px-3 py-1",
                showInfo
                  ? "text-purple-400"
                  : "text-gray-400 hover:text-purple-400"
              )}
              aria-label="About"
            >
              {showInfo && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full" />
              )}
              <Info
                className={cn(
                  "h-5 w-5 transition-all duration-200",
                  showInfo && "scale-110"
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-medium transition-all duration-200",
                  showInfo && "font-semibold"
                )}
              >
                About
              </span>
            </button>
          </div>

          {/* Desktop Footer Content */}
          <div className="hidden md:flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
            <p className="text-center text-sm leading-loose text-gray-300 md:text-left">
              Built by{" "}
              <Link
                href="https://farcaster.xyz/~/channel/politics"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-purple-400 hover:text-purple-300 underline-offset-4 transition-colors"
              >
                Politics
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
