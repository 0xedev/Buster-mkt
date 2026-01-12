import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { PolicastViews, PolicastViewsAbi } from "@/constants/contract";

const publicClient = createPublicClient({
  chain: base,
  transport: http(
    process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL || "https://mainnet.base.org"
  ),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { marketId, userAddress } = body;

    // Accept marketId = 0 (falsy in JS), so explicitly check for null/undefined.//
    if (
      marketId === undefined ||
      marketId === null ||
      typeof userAddress !== "string" ||
      userAddress.trim() === ""
    ) {
      return NextResponse.json(
        { error: "Market ID and user address are required" },
        { status: 400 }
      );
    }

    // Validate marketId is a valid number
    const marketIdNum = parseInt(marketId.toString());
    if (isNaN(marketIdNum) || marketIdNum < 0) {
      return NextResponse.json({ error: "Invalid market ID" }, { status: 400 });
    }

    // Ensure the Views ABI contains getUserWinnings and call the Views contract
    const abiHasFn =
      Array.isArray(PolicastViewsAbi) &&
      PolicastViewsAbi.some(
        (f: any) => f.type === "function" && f.name === "getUserWinnings"
      );

    if (!abiHasFn) {
      return NextResponse.json(
        {
          error:
            'ABI missing "getUserWinnings" on PolicastViews. Verify PolicastViewsAbi in /src/constants/contract.ts',
        },
        { status: 500 }
      );
    }

    // PolicastViews.getUserWinnings(address _user, uint256 _marketId)
    const rawResult = (await (publicClient.readContract as any)({
      address: PolicastViews,
      abi: PolicastViewsAbi,
      functionName: "getUserWinnings",
      args: [userAddress as `0x${string}`, BigInt(marketIdNum)],
    })) as unknown;

    // Normalize result into bigint safely (avoid passing an object to BigInt)
    let amount = 0n;
    if (typeof rawResult === "bigint") {
      amount = rawResult;
    } else if (typeof rawResult === "number") {
      amount = BigInt(Math.trunc(rawResult));
    } else if (typeof rawResult === "string") {
      try {
        amount = BigInt(rawResult);
      } catch {
        amount = 0n;
      }
    } else if (rawResult && typeof (rawResult as any).toString === "function") {
      const s = (rawResult as any).toString();
      if (/^\d+$/.test(s)) {
        try {
          amount = BigInt(s);
        } catch {
          amount = 0n;
        }
      }
    } else {
      amount = 0n;
    }
    const hasWinnings = amount > 0n;

    return NextResponse.json({
      hasWinnings,
      amount: amount.toString(), // Convert BigInt to string for JSON
    });
  } catch (error) {
    console.error("Check user winnings error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to check user winnings: ${errorMessage}` },
      { status: 500 }
    );
  }
}
