// src/app/page.tsx
import { EnhancedPredictionMarketDashboard } from "@/components/enhanced-prediction-market-dashboard";
import { OnboardingModal } from "@/components/OnboardingModal";
import { Suspense } from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Policast",
  description: "Political Prediction Market!",
  openGraph: {
    title: "Policast",
    images: ["/icon.jpg"],
  },
  other: {
    "fc:frame": JSON.stringify({
      version: "next",
      imageUrl: "https://buster-mkt.vercel.app/icon.jpg",
      button: {
        title: "Explore Markets🏪",
        action: {
          type: "launch_frame",
          name: "Policast",
          iconUrl: "https://buster-mkt.vercel.app/icon.png",
          url: "https://buster-mkt.vercel.app",
          splashImageUrl: "https://buster-mkt.vercel.app/icon.jpg",
          splashBackgroundColor: "#ffffff",
          state: "marketId",
        },
      },
    }),
  },
};

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center">
          {/* You can put a more sophisticated loading skeleton here if you like */}
          <p className="text-lg text-gray-600">Loading Dashboard...</p>
        </div>
      }
    >
      <EnhancedPredictionMarketDashboard />
      <OnboardingModal /> {/* <-- 2b. Render the modal */}
    </Suspense>
  );
}
