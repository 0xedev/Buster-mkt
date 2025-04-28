"use client";

import { useState, useEffect, useCallback } from "react";
import { useActiveAccount } from "thirdweb/react";
import { prepareEvent, readContract, getContractEvents } from "thirdweb";
import { eth_blockNumber } from "thirdweb/rpc";
import { getRpcClient } from "thirdweb/rpc";
import { contract } from "@/constants/contract";
import { base } from "thirdweb/chains";
import { debounce } from "lodash";

// Cache keys for local storage
const CACHE_KEY = "vote_history_cache";
const LAST_BLOCK_KEY = "last_fetched_block";

interface Vote {
  marketId: number;
  option: string;
  amount: bigint;
  marketName: string;
}

interface MarketInfo {
  marketId: number;
  question: string;
  optionA: string;
  optionB: string;
}

interface CacheData {
  votes: Vote[];
  marketInfo: Record<number, MarketInfo>;
  [LAST_BLOCK_KEY]: string;
}

const preparedEvent = prepareEvent({
  signature:
    "event SharesPurchased(uint256 indexed marketId, address indexed buyer, bool isOptionA, uint256 amount)",
});

export function VoteHistory() {
  const account = useActiveAccount();
  const [votes, setVotes] = useState<Vote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load cache from local storage
  const loadCache = useCallback((): CacheData => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached
        ? JSON.parse(cached)
        : { votes: [], marketInfo: {}, [LAST_BLOCK_KEY]: "0" };
    } catch {
      return { votes: [], marketInfo: {}, [LAST_BLOCK_KEY]: "0" };
    }
  }, []);

  // Save cache to local storage
  const saveCache = useCallback((data: CacheData) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Cache save error:", error);
    }
  }, []);

  // Debounced fetch function
  const fetchVotes = useCallback(
    debounce(async (accountAddress: string) => {
      if (!accountAddress) {
        setVotes([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Load cache
        const cache = loadCache();
        let newVotes = [...cache.votes];
        let marketInfoCache = { ...cache.marketInfo };
        let fromBlock = BigInt(cache[LAST_BLOCK_KEY] || "28965072"); // Deployment block fallback

        // Fetch latest block number
        const rpcClient = getRpcClient({
          client: contract.client,
          chain: base,
        });
        const latestBlock = await eth_blockNumber(rpcClient);

        // Fetch events incrementally
        const blockRange = BigInt(1000);
        let allEvents: any[] = [];
        while (fromBlock <= latestBlock) {
          const toBlock =
            fromBlock + blockRange > latestBlock
              ? latestBlock
              : fromBlock + blockRange;
          const events = await getContractEvents({
            contract,
            fromBlock,
            toBlock,
            events: [preparedEvent],
          });
          allEvents.push(...events);
          fromBlock = toBlock + BigInt(1);
        }

        // Filter user events
        const userEvents = allEvents.filter(
          (e) => e.args.buyer.toLowerCase() === accountAddress.toLowerCase()
        );

        // Get unique market IDs
        const marketIds = [
          ...new Set(userEvents.map((e) => Number(e.args.marketId))),
        ];
        const uncachedMarketIds = marketIds.filter(
          (id) => !marketInfoCache[id]
        );

        // Fetch market info in batch
        if (uncachedMarketIds.length > 0) {
          const marketInfos = await readContract({
            contract,
            method:
              "function getMarketInfoBatch(uint256[] _marketIds) view returns (string[] questions, string[] optionAs, string[] optionBs, uint256[] endTimes, uint8[] outcomes, uint256[] totalOptionASharesArray, uint256[] totalOptionBSharesArray, bool[] resolvedArray)",
            params: [uncachedMarketIds.map(BigInt)],
          });

          // Update market info cache
          uncachedMarketIds.forEach((marketId, i) => {
            marketInfoCache[marketId] = {
              marketId,
              question: marketInfos[0][i],
              optionA: marketInfos[1][i],
              optionB: marketInfos[2][i],
            };
          });
        }

        // Map events to votes
        const newUserVotes = userEvents
          .map((e) => {
            const market = marketInfoCache[Number(e.args.marketId)];
            if (!market) return null;
            return {
              marketId: Number(e.args.marketId),
              option: e.args.isOptionA ? market.optionA : market.optionB,
              amount: e.args.amount,
              marketName: market.question,
            };
          })
          .filter((vote): vote is Vote => vote !== null);

        // Merge new votes with cached votes, avoiding duplicates
        const voteMap = new Map<number, Vote>();
        [...cache.votes, ...newUserVotes].forEach((vote, i) => {
          voteMap.set(i, vote);
        });
        newVotes = Array.from(voteMap.values());

        // Update cache
        saveCache({
          votes: newVotes,
          marketInfo: marketInfoCache,
          [LAST_BLOCK_KEY]: latestBlock.toString(),
        });

        setVotes(newVotes);
      } catch (error) {
        console.error("Vote history error:", error);
        setVotes([]);
      } finally {
        setIsLoading(false);
      }
    }, 500),
    [loadCache, saveCache]
  );

  useEffect(() => {
    fetchVotes(account?.address || "");
    return () => fetchVotes.cancel();
  }, [account, fetchVotes]);

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
        <div className="text-gray-500 font-medium">
          Your market history will appear here
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
