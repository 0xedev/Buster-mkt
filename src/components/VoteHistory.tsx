"use client";

import { useState, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import { prepareEvent, readContract, getContractEvents } from "thirdweb";
import { eth_blockNumber } from "thirdweb/rpc";
import { getRpcClient } from "thirdweb/rpc";
import { contract } from "@/constants/contract";
import { base } from "thirdweb/chains";

interface Vote {
  marketId: number;
  option: string;
  amount: bigint;
  marketName: string;
}

const preparedEvent = prepareEvent({
  signature:
    "event SharesPurchased(uint256 indexed marketId, address indexed buyer, bool isOptionA, uint256 amount)",
});

export function VoteHistory() {
  const account = useActiveAccount();
  const [votes, setVotes] = useState<Vote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!account) {
      console.log("No account connected");
      setIsLoading(false);
      return;
    }

    const fetchVotes = async () => {
      setIsLoading(true);
      try {
        console.log("Fetching vote history for address:", account.address);

        // Fetch latest block number
        const rpcClient = getRpcClient({
          client: contract.client,
          chain: base,
        });
        const latestBlock = await eth_blockNumber(rpcClient);
        const DEPLOYMENT_BLOCK = BigInt(28965072);
        const blockRange = BigInt(10000);
        let fromBlock = DEPLOYMENT_BLOCK;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allEvents: any[] = [];

        console.log("Fetching SharesPurchased events...");
        while (fromBlock <= latestBlock) {
          const toBlock =
            fromBlock + blockRange > latestBlock
              ? latestBlock
              : fromBlock + blockRange;
          console.log(`Fetching events from block ${fromBlock} to ${toBlock}`);
          const events = await getContractEvents({
            contract,
            fromBlock,
            toBlock,
            events: [preparedEvent],
          });
          allEvents.push(...events);
          fromBlock = toBlock + BigInt(1);
        }

        console.log(
          `Fetched ${allEvents.length} SharesPurchased events`,
          allEvents.map((e) => ({
            marketId: e.args.marketId.toString(),
            buyer: e.args.buyer,
            isOptionA: e.args.isOptionA,
            amount: e.args.amount.toString(),
          }))
        );

        // Filter events for the user's address
        const userEvents = allEvents.filter(
          (e) => e.args.buyer.toLowerCase() === account.address.toLowerCase()
        );
        console.log(`Filtered ${userEvents.length} events for user`);

        // Get unique market IDs
        const marketIds = [
          ...new Set(userEvents.map((e) => Number(e.args.marketId))),
        ];
        console.log("Unique market IDs:", marketIds);

        if (marketIds.length === 0) {
          console.log("No votes found for user");
          setVotes([]);
          setIsLoading(false);
          return;
        }

        // Fetch market info
        console.log("Fetching market info...");
        const marketInfos = await Promise.all(
          marketIds.map(async (marketId) => {
            try {
              const market = await readContract({
                contract,
                method:
                  "function getMarketInfo(uint256 _marketId) view returns (string question, string optionA, string optionB, uint256 endTime, uint8 outcome, uint256 totalOptionAShares, uint256 totalOptionBShares, bool resolved)",
                params: [BigInt(marketId)],
              });
              console.log(`Market ${marketId} info:`, {
                question: market[0],
                optionA: market[1],
                optionB: market[2],
              });
              return {
                marketId,
                question: market[0],
                optionA: market[1],
                optionB: market[2],
              };
            } catch (error) {
              console.error(`Market ${marketId} fetch failed:`, error);
              return null;
            }
          })
        );

        const validMarkets = marketInfos.filter(
          (
            m
          ): m is {
            marketId: number;
            question: string;
            optionA: string;
            optionB: string;
          } => m !== null
        );
        console.log("Valid markets:", validMarkets);

        // Map events to votes
        const userVotes = userEvents
          .map((e) => {
            const market = validMarkets.find(
              (m) => m.marketId === Number(e.args.marketId)
            );
            if (!market) {
              console.warn(
                `No market info for marketId ${e.args.marketId}; skipping event`
              );
              return null;
            }
            return {
              marketId: Number(e.args.marketId),
              option: e.args.isOptionA ? market.optionA : market.optionB,
              amount: e.args.amount,
              marketName: market.question,
            };
          })
          .filter((vote): vote is Vote => vote !== null);
        console.log("User votes:", userVotes);

        setVotes(userVotes);
      } catch (error) {
        console.error("Vote history error:", error);
        setVotes([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVotes();
  }, [account]);

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
        <div className="text-gray-500 font-medium">
          Connect wallet to view vote history
        </div>
        <div className="mt-2">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="bg-gray-50 p-3 border-b border-gray-200">
          <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        </div>
        <div className="divide-y divide-gray-200">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 animate-pulse">
              <div className="flex justify-between">
                <div className="h-5 bg-gray-200 rounded w-2/3"></div>
                <div className="h-5 bg-gray-200 rounded w-1/5"></div>
              </div>
              <div className="mt-2 h-4 bg-gray-100 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-700">Your Vote History</h3>
      </div>

      {votes.length > 0 ? (
        <div className="divide-y divide-gray-200">
          {votes.map((vote, idx) => (
            <div
              key={idx}
              className="px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="w-2/3">
                  <div
                    className="text-sm font-medium text-gray-900 truncate"
                    title={vote.marketName}
                  >
                    {vote.marketName}
                  </div>
                  <div className="mt-1 flex items-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {vote.option}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {(Number(vote.amount) / 1e18).toLocaleString(undefined, {
                      maximumFractionDigits: 4,
                    })}{" "}
                    $BSTR
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Market #{vote.marketId}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <svg
            className="w-12 h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            ></path>
          </svg>
          <p className="mt-2 text-sm font-medium text-gray-500">
            No votes submitted yet
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Your voting history will appear here
          </p>
        </div>
      )}
    </div>
  );
}
