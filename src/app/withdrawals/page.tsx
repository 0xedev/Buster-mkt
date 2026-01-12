import { WithdrawalChecker } from "@/components/WithdrawalChecker";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function WithdrawalStatusPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#6A5ACD] via-[#E6E6FA] to-[#F0F8FF] dark:from-[#2D1B69] dark:via-[#1a1a2e] dark:to-[#16213e]">
      <Navbar />

      <div className="flex-grow container mx-auto p-4 md:p-6 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Admin Withdrawals
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Check your admin permissions and available withdrawals from resolved
            markets
          </p>
        </div>

        <WithdrawalChecker />
      </div>

      <Footer />
    </div>
  );
}

export const metadata = {
  title: "Admin Withdrawals - Policast",
  description:
    "Check and claim your admin liquidity and unused free market funds",
};
