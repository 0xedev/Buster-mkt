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
        const blockRange = 10000n;
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
          fromBlock = toBlock + 1n;
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
      <p className="text-center text-gray-500">
        Connect wallet to view vote history.
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-6 bg-gray-200 rounded"></div>
        ))}
      </div>
    );
  }

  return votes.length > 0 ? (
    <ul className="space-y-2">
      {votes.map((vote, idx) => (
        <li key={idx} className="flex justify-between text-sm">
          <span>
            {vote.marketName} ({vote.option})
          </span>
          <span>{Number(vote.amount) / 1e18} $BSTR</span>
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-center text-gray-500">No votes submitted yet.</p>
  );
}
