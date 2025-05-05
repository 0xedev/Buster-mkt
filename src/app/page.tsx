// src/app/page.tsx
import { EnhancedPredictionMarketDashboard } from "@/components/enhanced-prediction-market-dashboard";
import { OnboardingModal } from "@/components/OnboardingModal";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forecast - Prediction Market",
  description: "Forecast outcomes!",
  openGraph: {
    title: "Forecast",
    images: ["/icon.jpg"],
  },
  other: {
    "fc:frame": JSON.stringify({
      version: "next",
      imageUrl: "https://buster-mkt.vercel.app/icon.jpg",
      button: {
        title: "Farcaster Prediction Market",
        action: {
          type: "launch_frame",
          name: "Forecast",
          iconUrl: "https://buster-mkt.vercel.app/icon.jpg",
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
    <>
      {" "}
      {/* <-- 2a. Wrap in a Fragment */}
      <EnhancedPredictionMarketDashboard />
      <OnboardingModal /> {/* <-- 2b. Render the modal */}
    </>
  );
}
