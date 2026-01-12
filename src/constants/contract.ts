import { getContract } from "viem";
import { createPublicClient, http } from "viem";
import { base } from "wagmi/chains";

export const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL),
});

export const PolicastcontractAddress =
  "0x23743c3e9bCD1D834413905059Bfa7B6D8B7eD9D";
export const contractAddress = PolicastcontractAddress; // unified alias for app consumers
export const tokenAddress = "0x43ad5adae56fa09127ba147d5b24c4bc34abdb07";
export const V2contractAddress = PolicastcontractAddress; // legacy alias now points to Policast
export const PolicastViews = "0x90Eb51869405EbA4c84F857eeCb6ffd8A12248BB";
export const FreeClaimHandler = "0xDC7E158A944d0Ee57598B3CF170AcdD166D8B298";

// V1 Contract ABI for binary markets (legacy)
export const PolicastcontractAbi = [
  {
    type: "constructor",
    inputs: [
      {
        name: "_bettingToken",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "DEFAULT_ADMIN_ROLE",
    inputs: [],
    outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MARKET_CREATOR_ROLE",
    inputs: [],
    outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MARKET_VALIDATOR_ROLE",
    inputs: [],
    outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MAX_LMSR_B",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MAX_MARKET_DURATION",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MIN_LMSR_B",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MIN_MARKET_DURATION",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "PAYOUT_PER_SHARE",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "QUESTION_CREATOR_ROLE",
    inputs: [],
    outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "QUESTION_RESOLVE_ROLE",
    inputs: [],
    outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "allParticipants",
    inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "bettingToken",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "contract IERC20" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "buyShares",
    inputs: [
      { name: "_marketId", type: "uint256", internalType: "uint256" },
      { name: "_optionId", type: "uint256", internalType: "uint256" },
      { name: "_quantity", type: "uint256", internalType: "uint256" },
      {
        name: "_maxPricePerShare",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_maxTotalCost",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "categoryMarkets",
    inputs: [
      {
        name: "",
        type: "uint8",
        internalType: "enum Policast.MarketCategory",
      },
      { name: "", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "claimFreeTokens",
    inputs: [
      { name: "_marketId", type: "uint256", internalType: "uint256" },
      { name: "_optionId", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimWinnings",
    inputs: [{ name: "_marketId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "createMarket",
    inputs: [
      { name: "_question", type: "string", internalType: "string" },
      { name: "_description", type: "string", internalType: "string" },
      {
        name: "_optionNames",
        type: "string[]",
        internalType: "string[]",
      },
      {
        name: "_optionDescriptions",
        type: "string[]",
        internalType: "string[]",
      },
      { name: "_duration", type: "uint256", internalType: "uint256" },
      {
        name: "_category",
        type: "uint8",
        internalType: "enum Policast.MarketCategory",
      },
      {
        name: "_marketType",
        type: "uint8",
        internalType: "enum Policast.MarketType",
      },
      {
        name: "_initialLiquidity",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_earlyResolutionAllowed",
        type: "bool",
        internalType: "bool",
      },
      {
        name: "_freeParams",
        type: "tuple",
        internalType: "struct Policast.FreeMarketParams",
        components: [
          {
            name: "maxFreeParticipants",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "tokensPerParticipant",
            type: "uint256",
            internalType: "uint256",
          },
        ],
      },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "createMarket",
    inputs: [
      { name: "_question", type: "string", internalType: "string" },
      { name: "_description", type: "string", internalType: "string" },
      {
        name: "_optionNames",
        type: "string[]",
        internalType: "string[]",
      },
      {
        name: "_optionDescriptions",
        type: "string[]",
        internalType: "string[]",
      },
      { name: "_duration", type: "uint256", internalType: "uint256" },
      {
        name: "_category",
        type: "uint8",
        internalType: "enum Policast.MarketCategory",
      },
      {
        name: "_marketType",
        type: "uint8",
        internalType: "enum Policast.MarketType",
      },
      {
        name: "_initialLiquidity",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_earlyResolutionAllowed",
        type: "bool",
        internalType: "bool",
      },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "disputeMarket",
    inputs: [
      { name: "_marketId", type: "uint256", internalType: "uint256" },
      { name: "_reason", type: "string", internalType: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "emergencyWithdraw",
    inputs: [{ name: "_amount", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "feeCollector",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "freeClaimHandler",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMarketBasicInfo",
    inputs: [{ name: "_marketId", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "question", type: "string", internalType: "string" },
      { name: "description", type: "string", internalType: "string" },
      { name: "endTime", type: "uint256", internalType: "uint256" },
      {
        name: "category",
        type: "uint8",
        internalType: "enum Policast.MarketCategory",
      },
      { name: "optionCount", type: "uint256", internalType: "uint256" },
      { name: "resolved", type: "bool", internalType: "bool" },
      {
        name: "marketType",
        type: "uint8",
        internalType: "enum Policast.MarketType",
      },
      { name: "invalidated", type: "bool", internalType: "bool" },
      { name: "totalVolume", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMarketDisputeStatus",
    inputs: [{ name: "_marketId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMarketExtendedMeta",
    inputs: [{ name: "_marketId", type: "uint256", internalType: "uint256" }],
    outputs: [
      {
        name: "winningOptionId",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "disputed", type: "bool", internalType: "bool" },
      { name: "validated", type: "bool", internalType: "bool" },
      { name: "creator", type: "address", internalType: "address" },
      {
        name: "earlyResolutionAllowed",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMarketFinancialsData",
    inputs: [{ name: "_marketId", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "createdAt", type: "uint256", internalType: "uint256" },
      { name: "creator", type: "address", internalType: "address" },
      {
        name: "adminLiquidityClaimed",
        type: "bool",
        internalType: "bool",
      },
      {
        name: "adminInitialLiquidity",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "adminRemainingLiquidity",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "userLiquidity",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "totalVolume", type: "uint256", internalType: "uint256" },
      {
        name: "platformFeesCollected",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMarketFreeConfig",
    inputs: [{ name: "_marketId", type: "uint256", internalType: "uint256" }],
    outputs: [
      {
        name: "maxFreeParticipants",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "tokensPerParticipant",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "currentFreeParticipants",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "totalPrizePool",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "remainingPrizePool",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "isActive", type: "bool", internalType: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMarketLMSRB",
    inputs: [{ name: "_marketId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMarketOption",
    inputs: [
      { name: "_marketId", type: "uint256", internalType: "uint256" },
      { name: "_optionId", type: "uint256", internalType: "uint256" },
    ],
    outputs: [
      { name: "name", type: "string", internalType: "string" },
      { name: "description", type: "string", internalType: "string" },
      { name: "totalShares", type: "uint256", internalType: "uint256" },
      { name: "totalVolume", type: "uint256", internalType: "uint256" },
      {
        name: "currentPrice",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "isActive", type: "bool", internalType: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMarketOptionUserShares",
    inputs: [
      { name: "_marketId", type: "uint256", internalType: "uint256" },
      { name: "_optionId", type: "uint256", internalType: "uint256" },
      { name: "_user", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRoleAdmin",
    inputs: [{ name: "role", type: "bytes32", internalType: "bytes32" }],
    outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getUserClaimStatus",
    inputs: [
      { name: "_marketId", type: "uint256", internalType: "uint256" },
      { name: "_user", type: "address", internalType: "address" },
    ],
    outputs: [
      { name: "claimedWinnings", type: "bool", internalType: "bool" },
      { name: "claimedFreeTokens", type: "bool", internalType: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "globalTradeCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "grantMarketValidatorRole",
    inputs: [{ name: "_account", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "grantQuestionCreatorRole",
    inputs: [{ name: "_account", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "grantQuestionResolveRole",
    inputs: [{ name: "_account", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "grantRole",
    inputs: [
      { name: "role", type: "bytes32", internalType: "bytes32" },
      { name: "account", type: "address", internalType: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "hasRole",
    inputs: [
      { name: "role", type: "bytes32", internalType: "bytes32" },
      { name: "account", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "invalidateMarket",
    inputs: [{ name: "_marketId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "marketCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "marketsByType",
    inputs: [
      {
        name: "",
        type: "uint8",
        internalType: "enum Policast.MarketType",
      },
      { name: "", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pause",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "paused",
    inputs: [],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "platformFeeRate",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "priceHistory",
    inputs: [
      { name: "", type: "uint256", internalType: "uint256" },
      { name: "", type: "uint256", internalType: "uint256" },
      { name: "", type: "uint256", internalType: "uint256" },
    ],
    outputs: [
      { name: "price", type: "uint256", internalType: "uint256" },
      { name: "timestamp", type: "uint256", internalType: "uint256" },
      { name: "volume", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "renounceOwnership",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "renounceRole",
    inputs: [
      { name: "role", type: "bytes32", internalType: "bytes32" },
      {
        name: "callerConfirmation",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "resolveMarket",
    inputs: [
      { name: "_marketId", type: "uint256", internalType: "uint256" },
      {
        name: "_winningOptionId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "revokeRole",
    inputs: [
      { name: "role", type: "bytes32", internalType: "bytes32" },
      { name: "account", type: "address", internalType: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "sellShares",
    inputs: [
      { name: "_marketId", type: "uint256", internalType: "uint256" },
      { name: "_optionId", type: "uint256", internalType: "uint256" },
      { name: "_quantity", type: "uint256", internalType: "uint256" },
      {
        name: "_minPricePerShare",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_minTotalProceeds",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setBettingToken",
    inputs: [
      {
        name: "_newBettingToken",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setFeeCollector",
    inputs: [
      {
        name: "_feeCollector",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setFreeClaimHandler",
    inputs: [{ name: "_handler", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setPlatformFeeRate",
    inputs: [{ name: "_feeRate", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "supportsInterface",
    inputs: [{ name: "interfaceId", type: "bytes4", internalType: "bytes4" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalLockedPlatformFees",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalPlatformFeesCollected",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalUnlockedPlatformFees",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalWithdrawnPlatformFees",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "transferOwnership",
    inputs: [{ name: "newOwner", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "unpause",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateLMSRPrices",
    inputs: [{ name: "marketId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateMaxOptionShares",
    inputs: [
      { name: "marketId", type: "uint256", internalType: "uint256" },
      { name: "optionId", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateOptionShares",
    inputs: [
      { name: "marketId", type: "uint256", internalType: "uint256" },
      { name: "optionId", type: "uint256", internalType: "uint256" },
      { name: "quantity", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateUserShares",
    inputs: [
      { name: "user", type: "address", internalType: "address" },
      { name: "marketId", type: "uint256", internalType: "uint256" },
      { name: "optionId", type: "uint256", internalType: "uint256" },
      { name: "quantity", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "userCostBasis",
    inputs: [
      { name: "", type: "address", internalType: "address" },
      { name: "", type: "uint256", internalType: "uint256" },
      { name: "", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "userPortfolios",
    inputs: [{ name: "", type: "address", internalType: "address" }],
    outputs: [
      {
        name: "totalInvested",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "totalWinnings",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "unrealizedPnL", type: "int256", internalType: "int256" },
      { name: "realizedPnL", type: "int256", internalType: "int256" },
      { name: "tradeCount", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "userTradeHistory",
    inputs: [
      { name: "", type: "address", internalType: "address" },
      { name: "", type: "uint256", internalType: "uint256" },
    ],
    outputs: [
      { name: "marketId", type: "uint256", internalType: "uint256" },
      { name: "optionId", type: "uint256", internalType: "uint256" },
      { name: "buyer", type: "address", internalType: "address" },
      { name: "seller", type: "address", internalType: "address" },
      { name: "price", type: "uint256", internalType: "uint256" },
      { name: "quantity", type: "uint256", internalType: "uint256" },
      { name: "timestamp", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "validateMarket",
    inputs: [{ name: "_marketId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "withdrawAdminLiquidity",
    inputs: [{ name: "_marketId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "withdrawPlatformFees",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "AdminLiquidityWithdrawn",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "creator",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "BComputed",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "bValue",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "coverageRatioNum",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "coverageRatioDen",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "BettingTokenUpdated",
    inputs: [
      {
        name: "oldToken",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newToken",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Claimed",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "user",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "FeeAccrued",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "optionId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "isBuy",
        type: "bool",
        indexed: false,
        internalType: "bool",
      },
      {
        name: "rawAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "fee",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "FeeCollectorUpdated",
    inputs: [
      {
        name: "oldCollector",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newCollector",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "FeesUnlocked",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "FreeMarketConfigSet",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "maxFreeParticipants",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "tokensPerParticipant",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "totalPrizePool",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "FreeTokensClaimed",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "user",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "tokens",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "MarketCreated",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "question",
        type: "string",
        indexed: false,
        internalType: "string",
      },
      {
        name: "options",
        type: "string[]",
        indexed: false,
        internalType: "string[]",
      },
      {
        name: "endTime",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "category",
        type: "uint8",
        indexed: false,
        internalType: "enum Policast.MarketCategory",
      },
      {
        name: "marketType",
        type: "uint8",
        indexed: false,
        internalType: "enum Policast.MarketType",
      },
      {
        name: "creator",
        type: "address",
        indexed: false,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "MarketDisputed",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "disputer",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "reason",
        type: "string",
        indexed: false,
        internalType: "string",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "MarketInvalidated",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "validator",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "refundedAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "MarketResolved",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "winningOptionId",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "resolver",
        type: "address",
        indexed: false,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "MarketValidated",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "validator",
        type: "address",
        indexed: false,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      {
        name: "previousOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Paused",
    inputs: [
      {
        name: "account",
        type: "address",
        indexed: false,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "PlatformFeesWithdrawn",
    inputs: [
      {
        name: "collector",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RoleAdminChanged",
    inputs: [
      {
        name: "role",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "previousAdminRole",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "newAdminRole",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RoleGranted",
    inputs: [
      {
        name: "role",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "account",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "sender",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RoleRevoked",
    inputs: [
      {
        name: "role",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "account",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "sender",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "SlippageProtect",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "optionId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "isBuy",
        type: "bool",
        indexed: false,
        internalType: "bool",
      },
      {
        name: "quantity",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "bound",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "actualTotal",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "TradeExecuted",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "optionId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "buyer",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "seller",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "price",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "quantity",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Unpaused",
    inputs: [
      {
        name: "account",
        type: "address",
        indexed: false,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "UnusedPrizePoolWithdrawn",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "creator",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "UserPortfolioUpdated",
    inputs: [
      {
        name: "user",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "totalInvested",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "totalWinnings",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "unrealizedPnL",
        type: "int256",
        indexed: false,
        internalType: "int256",
      },
      {
        name: "realizedPnL",
        type: "int256",
        indexed: false,
        internalType: "int256",
      },
      {
        name: "tradeCount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  { type: "error", name: "AccessControlBadConfirmation", inputs: [] },
  {
    type: "error",
    name: "AccessControlUnauthorizedAccount",
    inputs: [
      { name: "account", type: "address", internalType: "address" },
      { name: "neededRole", type: "bytes32", internalType: "bytes32" },
    ],
  },
  { type: "error", name: "AdminLiquidityAlreadyClaimed", inputs: [] },
  { type: "error", name: "AlreadyClaimed", inputs: [] },
  { type: "error", name: "AlreadyClaimedFree", inputs: [] },
  { type: "error", name: "AmountMustBePositive", inputs: [] },
  { type: "error", name: "BadDuration", inputs: [] },
  { type: "error", name: "BadOptionCount", inputs: [] },
  { type: "error", name: "EmptyQuestion", inputs: [] },
  { type: "error", name: "EnforcedPause", inputs: [] },
  { type: "error", name: "ExpectedPause", inputs: [] },
  { type: "error", name: "FeeTooHigh", inputs: [] },
  { type: "error", name: "FreeEntryInactive", inputs: [] },
  { type: "error", name: "FreeSlotseFull", inputs: [] },
  { type: "error", name: "InsufficientContractBalance", inputs: [] },
  { type: "error", name: "InsufficientPrizePool", inputs: [] },
  { type: "error", name: "InsufficientShares", inputs: [] },
  { type: "error", name: "InsufficientSolvency", inputs: [] },
  { type: "error", name: "InvalidInput", inputs: [] },
  { type: "error", name: "InvalidMarket", inputs: [] },
  { type: "error", name: "InvalidOption", inputs: [] },
  { type: "error", name: "InvalidToken", inputs: [] },
  { type: "error", name: "InvalidWinningOption", inputs: [] },
  { type: "error", name: "LengthMismatch", inputs: [] },
  { type: "error", name: "MarketAlreadyInvalidated", inputs: [] },
  { type: "error", name: "MarketAlreadyResolved", inputs: [] },
  { type: "error", name: "MarketEnded", inputs: [] },
  { type: "error", name: "MarketIsInvalidated", inputs: [] },
  { type: "error", name: "MarketNotEndedYet", inputs: [] },
  { type: "error", name: "MarketNotReady", inputs: [] },
  { type: "error", name: "MarketNotResolved", inputs: [] },
  { type: "error", name: "MarketNotValidated", inputs: [] },
  { type: "error", name: "MarketResolvedAlready", inputs: [] },
  { type: "error", name: "MarketTooNew", inputs: [] },
  { type: "error", name: "MinTokensRequired", inputs: [] },
  { type: "error", name: "NoLiquidityToWithdraw", inputs: [] },
  { type: "error", name: "NoUnlockedFees", inputs: [] },
  { type: "error", name: "NoWinningShares", inputs: [] },
  { type: "error", name: "NotAuthorized", inputs: [] },
  { type: "error", name: "OptionInactive", inputs: [] },
  {
    type: "error",
    name: "OwnableInvalidOwner",
    inputs: [{ name: "owner", type: "address", internalType: "address" }],
  },
  {
    type: "error",
    name: "OwnableUnauthorizedAccount",
    inputs: [{ name: "account", type: "address", internalType: "address" }],
  },
  {
    type: "error",
    name: "PRBMath_UD60x18_Exp2_InputTooBig",
    inputs: [{ name: "x", type: "uint256", internalType: "UD60x18" }],
  },
  {
    type: "error",
    name: "PRBMath_UD60x18_Exp_InputTooBig",
    inputs: [{ name: "x", type: "uint256", internalType: "UD60x18" }],
  },
  {
    type: "error",
    name: "PRBMath_UD60x18_Log_InputTooSmall",
    inputs: [{ name: "x", type: "uint256", internalType: "UD60x18" }],
  },
  { type: "error", name: "PriceInvariant", inputs: [] },
  { type: "error", name: "PriceTooHigh", inputs: [] },
  { type: "error", name: "PriceTooLow", inputs: [] },
  { type: "error", name: "ProbabilityInvariant", inputs: [] },
  { type: "error", name: "ReentrancyGuardReentrantCall", inputs: [] },
  { type: "error", name: "SlippageExceeded", inputs: [] },
  { type: "error", name: "TransferFailed", inputs: [] },
] as const;

export const tokenAbi = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "allowance",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "needed",
        type: "uint256",
      },
    ],
    name: "ERC20InsufficientAllowance",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "balance",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "needed",
        type: "uint256",
      },
    ],
    name: "ERC20InsufficientBalance",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "approver",
        type: "address",
      },
    ],
    name: "ERC20InvalidApprover",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "receiver",
        type: "address",
      },
    ],
    name: "ERC20InvalidReceiver",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "sender",
        type: "address",
      },
    ],
    name: "ERC20InvalidSender",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
    ],
    name: "ERC20InvalidSpender",
    type: "error",
  },
  {
    inputs: [],
    name: "EnforcedPause",
    type: "error",
  },
  {
    inputs: [],
    name: "ExpectedPause",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "OwnableInvalidOwner",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "OwnableUnauthorizedAccount",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "Paused",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "Unpaused",
    type: "event",
  },
  {
    inputs: [],
    name: "CLAIM_AMOUNT",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MAX_CLAIMS",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
    ],
    name: "allowance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "approve",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [
      {
        internalType: "uint8",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "hasClaimed",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "pause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "paused",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaims",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "transfer",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "transferFrom",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "unpause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// Unified ABI alias for app consumers
export const contractAbi = PolicastcontractAbi;

// V3 Contract ABI for multi-option markets
export const V2contractAbi = PolicastcontractAbi;

export const PolicastViewsAbi = [
  {
    type: "constructor",
    inputs: [{ name: "_policast", type: "address", internalType: "address" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "calculateCurrentPrice",
    inputs: [
      { name: "_marketId", type: "uint256", internalType: "uint256" },
      { name: "_optionId", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "calculateCurrentPriceInTokens",
    inputs: [
      { name: "_marketId", type: "uint256", internalType: "uint256" },
      { name: "_optionId", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "calculateSellPrice",
    inputs: [
      { name: "_marketId", type: "uint256", internalType: "uint256" },
      { name: "_optionId", type: "uint256", internalType: "uint256" },
      { name: "_quantity", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "calculateUnrealizedPnL",
    inputs: [{ name: "_user", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "int256", internalType: "int256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getBettingToken",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getEventBasedMarkets",
    inputs: [],
    outputs: [{ name: "", type: "uint256[]", internalType: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getFeeCollector",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getFreeMarketInfo",
    inputs: [{ name: "_marketId", type: "uint256", internalType: "uint256" }],
    outputs: [
      {
        name: "maxFreeParticipants",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "tokensPerParticipant",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "currentFreeParticipants",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "totalPrizePool",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "remainingPrizePool",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "isActive", type: "bool", internalType: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getGlobalTradeCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMarketCategory",
    inputs: [{ name: "_marketId", type: "uint256", internalType: "uint256" }],
    outputs: [
      {
        name: "",
        type: "uint8",
        internalType: "enum Policast.MarketCategory",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMarketCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMarketCreator",
    inputs: [{ name: "_marketId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMarketEarlyResolutionAllowed",
    inputs: [{ name: "_marketId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMarketEndTime",
    inputs: [{ name: "_marketId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMarketFeeStatus",
    inputs: [{ name: "_marketId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "feesUnlocked", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMarketFinancials",
    inputs: [{ name: "_marketId", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "creator", type: "address", internalType: "address" },
      {
        name: "adminLiquidityClaimed",
        type: "bool",
        internalType: "bool",
      },
      {
        name: "adminInitialLiquidity",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "userLiquidity",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "totalVolume", type: "uint256", internalType: "uint256" },
      {
        name: "platformFeesCollected",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMarketInfo",
    inputs: [{ name: "_marketId", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "question", type: "string", internalType: "string" },
      { name: "description", type: "string", internalType: "string" },
      { name: "endTime", type: "uint256", internalType: "uint256" },
      {
        name: "category",
        type: "uint8",
        internalType: "enum Policast.MarketCategory",
      },
      {
        name: "marketType",
        type: "uint8",
        internalType: "enum Policast.MarketType",
      },
      { name: "resolved", type: "bool", internalType: "bool" },
      { name: "invalidated", type: "bool", internalType: "bool" },
      { name: "creator", type: "address", internalType: "address" },
      { name: "lmsrB", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMarketInvalidated",
    inputs: [{ name: "_marketId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMarketLiquidity",
    inputs: [{ name: "_marketId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMarketOdds",
    inputs: [{ name: "_marketId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "uint256[]", internalType: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMarketOption",
    inputs: [
      { name: "_marketId", type: "uint256", internalType: "uint256" },
      { name: "_optionId", type: "uint256", internalType: "uint256" },
    ],
    outputs: [
      { name: "name", type: "string", internalType: "string" },
      { name: "totalShares", type: "uint256", internalType: "uint256" },
      {
        name: "currentPrice",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "isActive", type: "bool", internalType: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMarketOptionCount",
    inputs: [{ name: "_marketId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMarketResolved",
    inputs: [{ name: "_marketId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMarketResolvedOutcome",
    inputs: [{ name: "_marketId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMarketStatus",
    inputs: [{ name: "_marketId", type: "uint256", internalType: "uint256" }],
    outputs: [
      {
        name: "",
        type: "uint8",
        internalType: "enum PolicastViews.MarketStatus",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMarketTiming",
    inputs: [{ name: "_marketId", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "createdAt", type: "uint256", internalType: "uint256" },
      { name: "endTime", type: "uint256", internalType: "uint256" },
      {
        name: "earlyResolutionAllowed",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMarketTotalVolume",
    inputs: [{ name: "_marketId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMarketType",
    inputs: [{ name: "_marketId", type: "uint256", internalType: "uint256" }],
    outputs: [
      {
        name: "",
        type: "uint8",
        internalType: "enum Policast.MarketType",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMarketUserLiquidity",
    inputs: [{ name: "_marketId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMarketsByCategory",
    inputs: [
      {
        name: "_category",
        type: "uint8",
        internalType: "enum Policast.MarketCategory",
      },
    ],
    outputs: [{ name: "", type: "uint256[]", internalType: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMarketsByCategory",
    inputs: [
      {
        name: "_category",
        type: "uint8",
        internalType: "enum Policast.MarketCategory",
      },
      { name: "_limit", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256[]", internalType: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPlatformFeeBreakdown",
    inputs: [],
    outputs: [
      {
        name: "cumulativeFees",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "lockedFees", type: "uint256", internalType: "uint256" },
      {
        name: "unlockedFees",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "withdrawnFees",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "collector", type: "address", internalType: "address" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPlatformStats",
    inputs: [],
    outputs: [
      {
        name: "totalFeesCollected",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "currentFeeCollector",
        type: "address",
        internalType: "address",
      },
      {
        name: "totalMarkets",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "totalTrades", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPriceHistory",
    inputs: [
      { name: "", type: "uint256", internalType: "uint256" },
      { name: "", type: "uint256", internalType: "uint256" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        internalType: "struct Policast.PricePoint[]",
        components: [
          { name: "price", type: "uint256", internalType: "uint256" },
          {
            name: "timestamp",
            type: "uint256",
            internalType: "uint256",
          },
          { name: "volume", type: "uint256", internalType: "uint256" },
        ],
      },
    ],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "getTotalFeesCollected",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getUnresolvedMarkets",
    inputs: [],
    outputs: [{ name: "", type: "uint256[]", internalType: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getUserMarkets",
    inputs: [{ name: "_user", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256[]", internalType: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getUserPortfolio",
    inputs: [{ name: "_user", type: "address", internalType: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct Policast.UserPortfolio",
        components: [
          {
            name: "totalInvested",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "totalWinnings",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "unrealizedPnL",
            type: "int256",
            internalType: "int256",
          },
          {
            name: "realizedPnL",
            type: "int256",
            internalType: "int256",
          },
          {
            name: "tradeCount",
            type: "uint256",
            internalType: "uint256",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getUserShares",
    inputs: [
      { name: "_marketId", type: "uint256", internalType: "uint256" },
      { name: "_user", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "uint256[]", internalType: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getUserWinnings",
    inputs: [
      { name: "_user", type: "address", internalType: "address" },
      { name: "_marketId", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getWithdrawableAdminLiquidity",
    inputs: [{ name: "_marketId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasUserClaimedFreeTokens",
    inputs: [
      { name: "_marketId", type: "uint256", internalType: "uint256" },
      { name: "_user", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasUserClaimedWinnings",
    inputs: [
      { name: "_marketId", type: "uint256", internalType: "uint256" },
      { name: "_user", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isMarketTradable",
    inputs: [{ name: "_marketId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "policast",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "contract Policast" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "quoteBuy",
    inputs: [
      { name: "_marketId", type: "uint256", internalType: "uint256" },
      { name: "_optionId", type: "uint256", internalType: "uint256" },
      { name: "_quantity", type: "uint256", internalType: "uint256" },
    ],
    outputs: [
      { name: "rawCost", type: "uint256", internalType: "uint256" },
      { name: "fee", type: "uint256", internalType: "uint256" },
      { name: "totalCost", type: "uint256", internalType: "uint256" },
      {
        name: "avgPricePerShare",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "quoteSell",
    inputs: [
      { name: "_marketId", type: "uint256", internalType: "uint256" },
      { name: "_optionId", type: "uint256", internalType: "uint256" },
      { name: "_quantity", type: "uint256", internalType: "uint256" },
    ],
    outputs: [
      { name: "rawRefund", type: "uint256", internalType: "uint256" },
      { name: "fee", type: "uint256", internalType: "uint256" },
      { name: "netRefund", type: "uint256", internalType: "uint256" },
      {
        name: "avgPricePerShare",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "error",
    name: "PRBMath_UD60x18_Exp2_InputTooBig",
    inputs: [{ name: "x", type: "uint256", internalType: "UD60x18" }],
  },
  {
    type: "error",
    name: "PRBMath_UD60x18_Exp_InputTooBig",
    inputs: [{ name: "x", type: "uint256", internalType: "UD60x18" }],
  },
  {
    type: "error",
    name: "PRBMath_UD60x18_Log_InputTooSmall",
    inputs: [{ name: "x", type: "uint256", internalType: "UD60x18" }],
  },
  { type: "error", name: "PriceInvariant", inputs: [] },
] as const;

export const FreeClaimHandlerabi = [
  {
    type: "constructor",
    inputs: [
      {
        name: "_bettingToken",
        type: "address",
        internalType: "address",
      },
      { name: "_feeRate", type: "uint256", internalType: "uint256" },
      {
        name: "_mainContract",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "DEFAULT_ADMIN_ROLE",
    inputs: [],
    outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "bettingToken",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "contract IERC20" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "claimAndAutoBuy",
    inputs: [
      { name: "_user", type: "address", internalType: "address" },
      { name: "_marketId", type: "uint256", internalType: "uint256" },
      { name: "_optionId", type: "uint256", internalType: "uint256" },
      {
        name: "_market",
        type: "address",
        internalType: "contract IPolicastMarket",
      },
    ],
    outputs: [
      { name: "sharesBought", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getMarketLMSRDetails",
    inputs: [
      { name: "marketId", type: "uint256", internalType: "uint256" },
      { name: "market", type: "address", internalType: "address" },
    ],
    outputs: [
      { name: "", type: "uint256", internalType: "uint256" },
      { name: "", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRoleAdmin",
    inputs: [{ name: "role", type: "bytes32", internalType: "bytes32" }],
    outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "grantRole",
    inputs: [
      { name: "role", type: "bytes32", internalType: "bytes32" },
      { name: "account", type: "address", internalType: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "hasRole",
    inputs: [
      { name: "role", type: "bytes32", internalType: "bytes32" },
      { name: "account", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "mainContract",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "paused",
    inputs: [],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "platformFeeRate",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "renounceRole",
    inputs: [
      { name: "role", type: "bytes32", internalType: "bytes32" },
      {
        name: "callerConfirmation",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "revokeRole",
    inputs: [
      { name: "role", type: "bytes32", internalType: "bytes32" },
      { name: "account", type: "address", internalType: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "supportsInterface",
    inputs: [{ name: "interfaceId", type: "bytes4", internalType: "bytes4" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "Paused",
    inputs: [
      {
        name: "account",
        type: "address",
        indexed: false,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RoleAdminChanged",
    inputs: [
      {
        name: "role",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "previousAdminRole",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "newAdminRole",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RoleGranted",
    inputs: [
      {
        name: "role",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "account",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "sender",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RoleRevoked",
    inputs: [
      {
        name: "role",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "account",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "sender",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Unpaused",
    inputs: [
      {
        name: "account",
        type: "address",
        indexed: false,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  { type: "error", name: "AccessControlBadConfirmation", inputs: [] },
  {
    type: "error",
    name: "AccessControlUnauthorizedAccount",
    inputs: [
      { name: "account", type: "address", internalType: "address" },
      { name: "neededRole", type: "bytes32", internalType: "bytes32" },
    ],
  },
  { type: "error", name: "AlreadyClaimedFree", inputs: [] },
  { type: "error", name: "AutoBuyFailed", inputs: [] },
  { type: "error", name: "EnforcedPause", inputs: [] },
  { type: "error", name: "ExpectedPause", inputs: [] },
  { type: "error", name: "FreeEntryInactive", inputs: [] },
  { type: "error", name: "FreeSlotseFull", inputs: [] },
  { type: "error", name: "InsufficientPrizePool", inputs: [] },
  { type: "error", name: "MarketMovedTooMuch", inputs: [] },
  { type: "error", name: "NoContractsAllowed", inputs: [] },
  { type: "error", name: "NoSharesAffordable", inputs: [] },
  {
    type: "error",
    name: "PRBMath_UD60x18_Exp2_InputTooBig",
    inputs: [{ name: "x", type: "uint256", internalType: "UD60x18" }],
  },
  {
    type: "error",
    name: "PRBMath_UD60x18_Exp_InputTooBig",
    inputs: [{ name: "x", type: "uint256", internalType: "UD60x18" }],
  },
  {
    type: "error",
    name: "PRBMath_UD60x18_Log_InputTooSmall",
    inputs: [{ name: "x", type: "uint256", internalType: "UD60x18" }],
  },
  { type: "error", name: "PriceInvariant", inputs: [] },
  { type: "error", name: "ReentrancyGuardReentrantCall", inputs: [] },
  { type: "error", name: "SlippageExceeded", inputs: [] },
  { type: "error", name: "TransferFailed", inputs: [] },
] as const;

export const Policastcontract = getContract({
  address: PolicastcontractAddress,
  abi: PolicastcontractAbi,
  client: publicClient,
});

export const V2contract = getContract({
  address: V2contractAddress,
  abi: V2contractAbi,
  client: publicClient,
});

export const PoliticalViewContract = getContract({
  address: PolicastViews,
  abi: PolicastViewsAbi,
  client: publicClient,
});

export const tokenContract = getContract({
  address: tokenAddress,
  abi: tokenAbi,
  client: publicClient,
});

export const freeClaimHandlerContract = getContract({
  address: FreeClaimHandler,
  abi: FreeClaimHandlerabi,
  client: publicClient,
});
