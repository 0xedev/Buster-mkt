import { readContract } from "thirdweb";
import { contract } from "@/constants/contract";
import { notFound } from "next/navigation";
import { MarketCard } from "@/components/marketCard";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Toaster } from "@/components/ui/toaster";

type MarketInfoContractReturn = readonly [
  string,
  string,
  string,
  bigint,
  number,
  bigint,
  bigint,
  boolean
];

interface Props {
  params: Promise<{ marketId: string }>; // params is now a Promise
}

export default async function MarketDetailsPage({ params }: Props) {
  const { marketId } = await params; // Await the params to resolve the marketId

  if (!marketId || isNaN(Number(marketId))) {
    notFound();
  }

  let marketData: MarketInfoContractReturn;
  try {
    marketData = (await readContract({
      contract,
      method:
        "function getMarketInfo(uint256 _marketId) view returns (string question, string optionA, string optionB, uint256 endTime, uint8 outcome, uint256 totalOptionAShares, uint256 totalOptionBShares, bool resolved)",
      params: [BigInt(marketId)],
    })) as MarketInfoContractReturn;
  } catch (error) {
    console.error(`Failed to fetch market ${marketId}:`, error);
    notFound();
  }

  const market = {
    question: marketData[0],
    optionA: marketData[1],
    optionB: marketData[2],
    endTime: marketData[3], // Keep as bigint to match Market interface
    outcome: marketData[4], // Keep as number to match Market interface
    totalOptionAShares: marketData[5], // Keep as bigint to match Market interface
    totalOptionBShares: marketData[6], // Keep as bigint to match Market interface
    resolved: marketData[7],
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">{market.question}</h1>
        <MarketCard index={Number(marketId)} market={market} />
      </main>
      <Footer />
      <Toaster />
    </div>
  );
}
