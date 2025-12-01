// src/app/analytics/page.tsx
import { Suspense } from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { AnalyticsContent } from "./components/AnalyticsContent";
import { Skeleton } from "@/components/ui/skeleton";

function AnalyticsPageContent() {
  return (
    <>
      <Suspense
        fallback={
          <div className="flex-grow container mx-auto p-4 md:p-6 max-w-7xl">
            <div className="space-y-6">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-full" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-48 w-full" />
                ))}
              </div>
            </div>
          </div>
        }
      >
        <AnalyticsContent />
      </Suspense>

      <Footer />
    </>
  );
}

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#6A5ACD] via-[#E6E6FA] to-[#F0F8FF] dark:from-[#2D1B69] dark:via-[#1a1a2e] dark:to-[#16213e]">
      <Navbar />

      <Suspense
        fallback={
          <div className="flex-grow container mx-auto p-4 md:p-6 max-w-7xl flex items-center justify-center">
            <div className="text-center">
              <Skeleton className="h-8 w-32 mx-auto mb-4" />
              <p>Loading analytics...</p>
            </div>
          </div>
        }
      >
        <AnalyticsPageContent />
      </Suspense>
    </div>
  );
}
