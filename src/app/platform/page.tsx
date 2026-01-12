import { V3AdminDashboard } from "@/components/V3AdminDashboard";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function PlatformPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#6A5ACD] via-[#E6E6FA] to-[#F0F8FF] dark:from-[#2D1B69] dark:via-[#1a1a2e] dark:to-[#16213e]">
      <Navbar />

      <div className="flex-grow container mx-auto p-4 md:p-6 max-w-7xl">
        <V3AdminDashboard />
      </div>

      <Footer />
    </div>
  );
}

export const metadata = {
  title: "Platform Management - Policast",
  description: "Manage V3 platform settings and collect fees",
};
