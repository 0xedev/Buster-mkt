"use client";

import { useState, useEffect } from "react";
import {
  Home,
  Clock,
  Trophy,
  User,
  Info,
  Newspaper,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";

export function Footer() {
  const router = useRouter();
  // const searchParams = useSearchParams();

  const [showInfo, setShowInfo] = useState(false);
  const [, setActiveTab] = useState("active");
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [, setHoveredTab] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState("active");

  const navItems = [
    {
      hrefBase: "/",
      tabValue: "active",
      icon: Home,
      label: "Active",
      gradient: "from-emerald-400 to-cyan-400",
      shadow: "shadow-emerald-400/25",
    },
    {
      hrefBase: "/",
      tabValue: "ended",
      icon: Clock,
      label: "Ended",
      gradient: "from-purple-400 to-pink-400",
      shadow: "shadow-purple-400/25",
    },
    {
      hrefBase: "/",
      tabValue: "leaderboard",
      icon: Trophy,
      label: "Leaderboard",
      gradient: "from-amber-400 to-orange-400",
      shadow: "shadow-amber-400/25",
    },
    {
      hrefBase: "/",
      tabValue: "myvotes",
      icon: User,
      label: "Shares",
      gradient: "from-blue-400 to-indigo-400",
      shadow: "shadow-blue-400/25",
    },
    {
      hrefBase: "https://news-agg-zeta.vercel.app?referrer=policast",
      tabValue: "news",
      icon: Newspaper,
      label: "News",
      gradient: "from-rose-400 to-pink-400",
      shadow: "shadow-rose-400/25",
    },
  ];

  useEffect(() => {
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleMouseMove = (e: { clientX: any; clientY: any }) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    if (isHovering) {
      window.addEventListener("mousemove", handleMouseMove);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isHovering]);

  const handleNavClick = (tabValue: string) => {
    setCurrentTab(tabValue);
    setActiveTab(tabValue);
    if (showInfo) setShowInfo(false);

    // Handle navigation
    if (tabValue === "news") {
      // External link
      window.open(
        "https://news-agg-zeta.vercel.app?referrer=policast",
        "_blank"
      );
    } else {
      // Internal navigation
      router.push(`/?tab=${tabValue}`);
    }
  };

  return (
    <div className="relative">
      {/* Animated Background Particles */}
      <div className="fixed bottom-0 left-0 w-full h-12 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float"
            style={{
              left: `${15 + i * 15}%`,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${3 + i * 0.5}s`,
            }}
          >
            <Sparkles className="w-2 h-2 text-white/20" />
          </div>
        ))}
      </div>

      {/* Info Panel with Glassmorphism */}
      {showInfo && (
        <div className="md:hidden fixed bottom-12 left-4 right-4 z-50 animate-slideInUp">
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-2xl"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-bold text-white text-lg">
                  Welcome to Policast!
                </h3>
              </div>

              <p className="text-white/90 mb-3 leading-relaxed text-sm">
                Policast is a prediction game where users can predict public
                sentiments and win big!
              </p>

              <div className="bg-black/20 backdrop-blur-sm rounded-xl p-3 mb-3">
                <p className="font-semibold text-white mb-2 flex items-center gap-2 text-sm">
                  <TrendingUp className="w-3 h-3" />
                  Quick Start Guide:
                </p>
                <div className="space-y-1.5 text-white/90 text-sm">
                  {[
                    "Sign in with your wallet",
                    "Claim 5,000 BSTR shares",
                    "Browse predictions",
                    "Place your bets & win!",
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                        {i + 1}
                      </div>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              <a
                href="https://news-agg-zeta.vercel.app?referrer=policast"
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg text-white text-sm font-medium hover:shadow-lg hover:shadow-pink-500/25 transition-all duration-300 hover:scale-105"
              >
                <Newspaper className="w-4 h-4" />
                Check News
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Main Footer */}
      <footer
        className="fixed bottom-0 left-0 w-full z-40 md:static"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Glassmorphism Background */}
        <div className="absolute inset-0 backdrop-blur-2xl bg-gradient-to-t from-slate-900/95 via-slate-800/90 to-slate-900/95"></div>

        {/* Animated Border */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60"></div>

        {/* Dynamic Mouse Follower Effect */}
        {isHovering && (
          <div
            className="absolute pointer-events-none transition-all duration-300 ease-out"
            style={{
              left: mousePosition.x - 50,
              top: mousePosition.y - 200,
              background:
                "radial-gradient(circle, rgba(34, 211, 238, 0.15) 0%, transparent 70%)",
              width: "100px",
              height: "100px",
              borderRadius: "50%",
            }}
          />
        )}

        <div className="relative z-10 container max-w-7xl mx-auto">
          {/* Mobile Navigation */}
          <div className="flex justify-around items-center py-2 md:hidden">
            {navItems.map((item, index) => {
              const href =
                item.tabValue === "news"
                  ? item.hrefBase
                  : `${item.hrefBase}?tab=${item.tabValue}`;
              const isActive = currentTab === item.tabValue;

              return (
                <a
                  key={item.tabValue}
                  href={href}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(item.tabValue);
                  }}
                  onMouseEnter={() => setHoveredTab(item.tabValue)}
                  onMouseLeave={() => setHoveredTab(null)}
                  className="relative group flex flex-col items-center p-2 transition-all duration-500 hover:scale-110"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Glow Effect */}
                  {isActive && (
                    <div
                      className={`absolute inset-0 bg-gradient-to-r ${item.gradient} rounded-xl opacity-20 blur-lg scale-150 animate-pulse`}
                    ></div>
                  )}

                  {/* Icon Container */}
                  <div
                    className={`
                    relative z-10 p-1.5 rounded-xl transition-all duration-300
                    ${
                      isActive
                        ? `bg-gradient-to-r ${item.gradient} ${item.shadow} shadow-lg`
                        : "bg-white/10 hover:bg-white/20"
                    }
                  `}
                  >
                    <item.icon
                      className={`w-4 h-4 ${
                        isActive ? "text-white" : "text-white/70"
                      } transition-colors duration-300`}
                    />
                  </div>

                  {/* Label */}
                  <span
                    className={`
                    text-xs mt-1 font-medium transition-all duration-300
                    ${isActive ? "text-white" : "text-white/60"}
                  `}
                  >
                    {item.label}
                  </span>

                  {/* Active Indicator */}
                  {isActive && (
                    <div
                      className={`absolute -bottom-0.5 w-6 h-0.5 bg-gradient-to-r ${item.gradient} rounded-full animate-slideInUp`}
                    ></div>
                  )}
                </a>
              );
            })}

            {/* Info Button */}
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="relative group flex flex-col items-center p-2 transition-all duration-500 hover:scale-110"
            >
              <div
                className={`
                relative z-10 p-1.5 rounded-xl transition-all duration-300
                ${
                  showInfo
                    ? "bg-gradient-to-r from-violet-500 to-purple-500 shadow-lg shadow-violet-500/25"
                    : "bg-white/10 hover:bg-white/20"
                }
              `}
              >
                <Info
                  className={`w-4 h-4 ${
                    showInfo ? "text-white" : "text-white/70"
                  } transition-colors duration-300`}
                />
              </div>
              <span
                className={`
                text-xs mt-1 font-medium transition-all duration-300
                ${showInfo ? "text-white" : "text-white/60"}
              `}
              >
                About
              </span>
            </button>
          </div>

          {/* Desktop Footer */}
          <div className="hidden md:flex items-center justify-between py-4 px-6">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg shadow-purple-500/25">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base">Policast</h3>
                  <p className="text-white/60 text-xs">Predict. Win. Repeat.</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-white/90 text-xs leading-relaxed">
                  Built with ❤️ by{" "}
                  <a
                    href="https://warpcast.com/~/channel/politics"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent hover:from-cyan-300 hover:to-blue-300 transition-all duration-300"
                  >
                    Politics
                  </a>
                </p>
                <a
                  href="https://news-agg-zeta.vercel.app?referrer=policast"
                  className="inline-flex items-center gap-2 mt-1 px-3 py-1.5 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg text-white text-xs font-medium hover:shadow-lg hover:shadow-pink-500/25 transition-all duration-300 hover:scale-105"
                >
                  <Newspaper className="w-3 h-3" />
                  Visit News
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-10px) rotate(180deg);
          }
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-slideInUp {
          animation: slideInUp 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
