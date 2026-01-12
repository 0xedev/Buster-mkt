"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { useAccount, useReadContract } from "wagmi";
import { contractAddress, contractAbi } from "@/constants/contract";
import { MarketProgress } from "./market-progress";
import MarketTime from "./market-time";
import { MarketResolved } from "./market-resolved";
import { MarketPending } from "./market-pending";
import { MarketBuyInterface } from "./market-buy-interface";
import { MarketSharesDisplay } from "./market-shares-display";
import { sdk } from "@farcaster/miniapp-sdk";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faShareFromSquare,
  faUpRightAndDownLeftFromCenter,
} from "@fortawesome/free-solid-svg-icons";
import { MessageCircle } from "lucide-react";

// Add LinkifiedText component for URL preview support//
const LinkifiedText = ({ text }: { text: string }) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  const getDomainFromUrl = (url: string) => {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return url;
    }
  };

  return (
    <>
      {parts.map((part, index) =>
        urlRegex.test(part) ? (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 bg-blue-50 border border-blue-200 rounded text-blue-700 hover:bg-blue-100 transition-colors text-xs"
            title={part}
          >
            <svg
              className="w-2.5 h-2.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"
                clipRule="evenodd"
              />
            </svg>
            {getDomainFromUrl(part)}
          </a>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
};

export interface Market {
  question: string;
  optionA: string;
  optionB: string;
  endTime: bigint;
  outcome: number;
  totalOptionAShares: bigint;
  totalOptionBShares: bigint;
  resolved: boolean;
}

interface SharesBalance {
  optionAShares: bigint;
  optionBShares: bigint;
}

interface MarketCardProps {
  index: number;
  market: Market;
}

export function MarketCard({ index, market }: MarketCardProps) {
  const { address } = useAccount();
  const [commentCount, setCommentCount] = useState<number>(0);

  const marketData = market;

  const { data: optionAShares } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: "getMarketOptionUserShares",
    args: [BigInt(index), 0n, address as `0x${string}`],
    query: { enabled: !!address && !!marketData },
  });

  const { data: optionBShares } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: "getMarketOptionUserShares",
    args: [BigInt(index), 1n, address as `0x${string}`],
    query: { enabled: !!address && !!marketData },
  });

  const sharesBalance: SharesBalance | undefined =
    optionAShares !== undefined && optionBShares !== undefined
      ? {
          optionAShares: optionAShares as bigint,
          optionBShares: optionBShares as bigint,
        }
      : undefined;

  // Fetch comment count
  useEffect(() => {
    const fetchCommentCount = async () => {
      try {
        const response = await fetch(
          `/api/comments?marketId=${index}&version=v1`
        );
        if (response.ok) {
          const data = await response.json();
          setCommentCount(data.total || 0);
        }
      } catch (error) {
        console.error("Error fetching comment count:", error);
      }
    };

    fetchCommentCount();
  }, [index]);

  const isExpired = new Date(Number(marketData.endTime) * 1000) < new Date();
  const isResolved = marketData.resolved;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://policast.xyz";
  const marketPageUrl = `${appUrl}/market/${index}/details`;
  const handleShare = async () => {
    try {
      await sdk.actions.composeCast({
        text: `Check out this market on Policast: ${
          marketData?.question || `Market ${index}`
        }`,
        embeds: [marketPageUrl],
      });
    } catch (error) {
      console.error("Failed to compose cast:", error);
      // Optionally, show a toast notification to the user
    }
  };

  return (
    <Card key={index} className="flex flex-col">
      <CardHeader>
        <MarketTime endTime={marketData.endTime} />
        <CardTitle className="text-base leading-relaxed">
          <LinkifiedText text={marketData.question} />
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-0">
        <MarketProgress
          optionA={marketData.optionA}
          optionB={marketData.optionB}
          totalOptionAShares={marketData.totalOptionAShares}
          totalOptionBShares={marketData.totalOptionBShares}
        />
        {isExpired ? (
          isResolved ? (
            <MarketResolved
              marketId={index}
              outcome={Math.max(0, Number(marketData.outcome) - 1)}
              options={[
                marketData.optionA || "Option A",
                marketData.optionB || "Option B",
              ]}
            />
          ) : (
            <MarketPending />
          )
        ) : (
          <MarketBuyInterface marketId={index} market={marketData} />
        )}
      </CardContent>
      <CardFooter className="flex justify-between items-center pt-4">
        {sharesBalance &&
        (sharesBalance.optionAShares > 0n ||
          sharesBalance.optionBShares > 0n) ? (
          <MarketSharesDisplay
            market={marketData}
            sharesBalance={sharesBalance}
          />
        ) : (
          <div />
        )}
        <div className="flex items-center space-x-2">
          {/* Comment count indicator */}
          {commentCount > 0 && (
            <div className="flex items-center text-gray-500 text-xs mr-2">
              <MessageCircle className="w-3 h-3 mr-1" />
              <span>{commentCount}</span>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="border border-gray-300 hover:bg-gray-100 hover:text-gray-900 rounded-md px-4 py-2 transition-colors"
            onClick={handleShare}
          >
            <FontAwesomeIcon icon={faShareFromSquare} />
          </Button>
          <Button
            asChild
            variant="default"
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 py-2 transition-colors"
          >
            <Link href={`/market/${index}/details`} legacyBehavior>
              <a>
                <FontAwesomeIcon icon={faUpRightAndDownLeftFromCenter} />
              </a>
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
