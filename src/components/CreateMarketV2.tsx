"use client";

import { useState, useEffect } from "react";
import { useAccount, useSendCalls, useReadContract } from "wagmi";
import { parseEther, encodeFunctionData } from "viem";
import { useToast } from "@/components/ui/use-toast";
import {
  V2contractAddress,
  V2contractAbi,
  tokenAddress,
  tokenAbi,
} from "@/constants/contract";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Minus,
  Calendar,
  DollarSign,
  Info,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { useUserRoles } from "@/hooks/useUserRoles";
import {
  MIN_INITIAL_LIQUIDITY,
  MarketCategory,
  MarketType,
  CATEGORY_LABELS,
  MARKET_TYPE_LABELS,
  QUESTION_CREATOR_ROLE,
} from "@/lib/constants";

interface MarketOption {
  name: string;
  description: string;
}

export function CreateMarketV2() {
  const { isConnected, address } = useAccount();
  const { hasCreatorAccess } = useUserRoles();
  const { toast } = useToast();

  // Form state
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<MarketCategory>(
    MarketCategory.OTHER
  );
  const [marketType, setMarketType] = useState<MarketType>(MarketType.PAID);
  const [duration, setDuration] = useState<string>("7"); // days
  const [initialLiquidity, setInitialLiquidity] = useState<string>("5000");
  const [options, setOptions] = useState<MarketOption[]>([
    { name: "", description: "" },
    { name: "", description: "" },
  ]);

  // Free market specific
  const [maxFreeParticipants, setMaxFreeParticipants] = useState<string>("3");
  const [freeSharesPerUser, setFreeSharesPerUser] = useState<string>("100");

  // Event-based market option
  const [earlyResolutionAllowed, setEarlyResolutionAllowed] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [marketCreated, setMarketCreated] = useState(false);

  // Transaction hooks
  const {
    sendCalls,
    data: sendCallsData,
    error: sendCallsError,
    isPending: sendCallsPending,
  } = useSendCalls();

  // Handle transaction failures
  useEffect(() => {
    if (sendCallsError) {
      console.error("❌ Batch transaction failed:", sendCallsError);
      setIsSubmitting(false);
      toast({
        title: "Transaction Failed",
        description: `Failed to create market: ${sendCallsError.message}`,
        variant: "destructive",
      });
    }
  }, [sendCallsError, toast]);

  // Handle transaction success - detect when sendCalls returns data
  useEffect(() => {
    if (!sendCallsData || sendCallsError) return;

    console.log("🎉 Market creation transaction sent successfully!");
    setMarketCreated(true);
    toast({
      title: "Success",
      description:
        "Market created successfully! It may take a moment to appear.",
    });
  }, [sendCallsData, sendCallsError, toast]);

  // Check token allowance
  const { data: allowanceData } = useReadContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: "allowance",
    args: [
      address || "0x0000000000000000000000000000000000000000",
      V2contractAddress,
    ],
    query: {
      enabled: isConnected && !!address,
    },
  });
  const currentAllowance = (allowanceData as bigint | undefined) ?? 0n;

  // Check user token balance
  const { data: balanceData } = useReadContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: [address || "0x0000000000000000000000000000000000000000"],
    query: {
      enabled: isConnected && !!address,
    },
  });
  const userBalance = (balanceData as bigint | undefined) ?? 0n;

  // Check if user has QUESTION_CREATOR_ROLE
  const { data: hasCreatorRole } = useReadContract({
    address: V2contractAddress,
    abi: V2contractAbi,
    functionName: "hasRole",
    args: [
      QUESTION_CREATOR_ROLE,
      address || "0x0000000000000000000000000000000000000000",
    ],
    query: {
      enabled: isConnected && !!address,
    },
  });

  // Check if user is contract owner
  const { data: contractOwner } = useReadContract({
    address: V2contractAddress,
    abi: V2contractAbi,
    functionName: "owner",
    args: [],
    query: {
      enabled: isConnected && !!address,
    },
  });

  const isOwner = contractOwner === address;
  const hasMarketCreationAuth = hasCreatorRole || isOwner;

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, { name: "", description: "" }]);
    }
  };

  // Helper: build argument list for overloaded createMarket.
  // Overload A (paid): (question, description, optionNames, optionDescriptions, duration, category, marketType, initialLiquidity, earlyResolutionAllowed)
  // Overload B (free): same + freeParams tuple { maxFreeParticipants, tokensPerParticipant }
  type PaidArgsTuple = [
    string, // question: The market question text
    string, // description: Detailed market description and resolution criteria
    string[], // optionNames: Array of option names (e.g., ["Yes", "No"])
    string[], // optionDescriptions: Array of option descriptions
    bigint, // duration: Market duration in seconds
    MarketCategory, // category: Market category enum (Politics, Sports, etc.)
    MarketType, // marketType: Market type enum (Paid or Free Entry)
    bigint, // initialLiquidity: Initial liquidity in wei (18 decimals)
    boolean // earlyResolutionAllowed: Whether early resolution is permitted
  ];
  type FreeArgsTuple = [
    ...PaidArgsTuple,
    { maxFreeParticipants: bigint; tokensPerParticipant: bigint } // freeParams: Free market parameters
  ];
  const buildCreateMarketArgs = (): PaidArgsTuple | FreeArgsTuple => {
    const base: PaidArgsTuple = [
      question,
      description,
      options.map((o) => o.name),
      options.map((o) => o.description),
      BigInt(Math.floor(parseFloat(duration) * 24 * 60 * 60)),
      category,
      marketType,
      parseEther(initialLiquidity),
      earlyResolutionAllowed,
    ];
    if (marketType === MarketType.FREE_ENTRY) {
      const freeParams = {
        maxFreeParticipants: BigInt(maxFreeParticipants || "0"),
        tokensPerParticipant: parseEther(freeSharesPerUser || "0"),
      };
      return [...base, freeParams];
    }
    return base;
  };

  // Pure validation used only for render-time checks (no side-effects)
  // Rules:
  //  All markets (paid & free): initialLiquidity >= 100 tokens required (ensures base depth).
  //  Free params: maxFreeParticipants >=1, tokensPerParticipant >0 when FREE_ENTRY.
  const isFormValidNoSideEffects = (): boolean => {
    if (!question.trim()) return false;
    if (question.length > 200) return false;
    if (!description.trim()) return false;
    if (description.length > 1000) return false;
    if (options.length < 2) return false;
    if (options.some((opt) => !opt.name.trim())) return false;
    if (options.some((opt) => opt.name.length > 50)) return false;
    if (options.some((opt) => opt.description.length > 500)) return false;
    if (isNaN(parseFloat(duration)) || parseFloat(duration) < 1) return false;
    if (
      isNaN(parseFloat(initialLiquidity)) ||
      parseFloat(initialLiquidity) < MIN_INITIAL_LIQUIDITY
    )
      return false;
    if (options.length > 10) return false; // hard upper bound safeguard

    if (marketType === MarketType.FREE_ENTRY) {
      if (!maxFreeParticipants.trim() || !freeSharesPerUser.trim())
        return false;
      const maxParticipants = parseInt(maxFreeParticipants);
      const tokensPerUser = parseFloat(freeSharesPerUser);
      if (isNaN(maxParticipants) || maxParticipants < 1) return false;
      if (isNaN(tokensPerUser) || tokensPerUser <= 0) return false;
    }

    return true;
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (
    index: number,
    field: keyof MarketOption,
    value: string
  ) => {
    const newOptions = [...options];
    newOptions[index][field] = value;
    setOptions(newOptions);
  };

  const validateForm = () => {
    // Check authorization first
    if (!hasMarketCreationAuth) {
      toast({
        title: "Authorization Error",
        description:
          "You don't have permission to create markets. You need the QUESTION_CREATOR_ROLE or be the contract owner.",
        variant: "destructive",
      });
      return false;
    }

    if (!question.trim()) {
      toast({
        title: "Error",
        description: "Question is required",
        variant: "destructive",
      });
      return false;
    }
    if (question.length > 200) {
      toast({
        title: "Error",
        description: "Question must be 200 characters or less",
        variant: "destructive",
      });
      return false;
    }
    if (!description.trim()) {
      toast({
        title: "Error",
        description: "Description is required",
        variant: "destructive",
      });
      return false;
    }
    if (description.length > 1000) {
      toast({
        title: "Error",
        description: "Description must be 1000 characters or less",
        variant: "destructive",
      });
      return false;
    }
    if (options.length < 2) {
      toast({
        title: "Error",
        description: "At least 2 options are required",
        variant: "destructive",
      });
      return false;
    }
    if (options.some((opt) => !opt.name.trim())) {
      toast({
        title: "Error",
        description: "All options must have names",
        variant: "destructive",
      });
      return false;
    }
    if (options.some((opt) => opt.name.length > 50)) {
      toast({
        title: "Error",
        description: "Option names must be 50 characters or less",
        variant: "destructive",
      });
      return false;
    }
    if (options.some((opt) => opt.description.length > 500)) {
      toast({
        title: "Error",
        description: "Option descriptions must be 500 characters or less",
        variant: "destructive",
      });
      return false;
    }
    if (parseFloat(duration) < 1) {
      toast({
        title: "Error",
        description: "Duration must be at least 1 day",
        variant: "destructive",
      });
      return false;
    }
    if (parseFloat(initialLiquidity) < MIN_INITIAL_LIQUIDITY) {
      toast({
        title: "Error",
        description: `Initial liquidity must be at least ${MIN_INITIAL_LIQUIDITY} tokens`,
        variant: "destructive",
      });
      return false;
    }
    if (options.length > 10) {
      toast({
        title: "Error",
        description: "A maximum of 10 options is allowed",
        variant: "destructive",
      });
      return false;
    }

    // Additional validation for free markets
    if (marketType === MarketType.FREE_ENTRY) {
      console.log("🔍 Validating free market configuration...");
      console.log("Max Participants:", maxFreeParticipants);
      console.log("Tokens Per User:", freeSharesPerUser);

      // Check for empty inputs first
      if (!maxFreeParticipants.trim() || !freeSharesPerUser.trim()) {
        console.error("❌ Empty free market fields detected");
        toast({
          title: "Error",
          description: "Please fill in all free market fields",
          variant: "destructive",
        });
        return false;
      }

      const maxParticipants = parseInt(maxFreeParticipants);
      const tokensPerUser = parseFloat(freeSharesPerUser);

      console.log(
        "Parsed values - Max Participants:",
        maxParticipants,
        "Tokens Per User:",
        tokensPerUser
      );

      if (isNaN(maxParticipants) || maxParticipants < 1) {
        console.error("❌ Invalid max participants:", maxParticipants);
        toast({
          title: "Error",
          description: "Max free participants must be at least 1",
          variant: "destructive",
        });
        return false;
      }

      if (isNaN(tokensPerUser) || tokensPerUser <= 0) {
        console.error("❌ Invalid tokens per user:", tokensPerUser);
        toast({
          title: "Error",
          description: "Free tokens per user must be greater than 0",
          variant: "destructive",
        });
        return false;
      }

      // Calculate total prize pool and log it
      const totalPrizePool = tokensPerUser * maxParticipants;
      console.log("✅ Free market validation passed");
      console.log("💰 Total Prize Pool:", totalPrizePool, "tokens");
      console.log(
        "📊 Prize Pool Breakdown:",
        `${maxParticipants} participants × ${tokensPerUser} tokens each`
      );
    }

    console.log("✅ Form validation completed successfully");
    return true;
  };

  const handleSubmit = async () => {
    console.log("🚀 Starting batch market creation process...");
    console.log("📝 Form data:", {
      question,
      description,
      marketType,
      category,
      duration,
      initialLiquidity,
      options,
      earlyResolutionAllowed,
      maxFreeParticipants:
        marketType === MarketType.FREE_ENTRY ? maxFreeParticipants : "N/A",
      freeSharesPerUser:
        marketType === MarketType.FREE_ENTRY ? freeSharesPerUser : "N/A",
    });

    if (!validateForm()) {
      console.error("❌ Form validation failed");
      return;
    }

    if (!hasMarketCreationAuth) {
      console.error("❌ User lacks market creation authorization");
      toast({
        title: "Authorization Error",
        description:
          "You don't have permission to create markets. You need the QUESTION_CREATOR_ROLE or be the contract owner.",
        variant: "destructive",
      });
      return;
    }

    if (!hasCreatorAccess) {
      console.error("❌ User lacks creator access");
      toast({
        title: "Error",
        description: "You don't have permission to create markets",
        variant: "destructive",
      });
      return;
    }

    // Prevent multiple submissions
    if (isSubmitting || sendCallsPending) {
      console.warn(
        "⏳ Transaction already in progress, blocking new submission"
      );
      toast({
        title: "Error",
        description: "Please wait for the current transaction to complete",
        variant: "destructive",
      });
      return;
    }

    console.log("🔄 Setting submission state to true");
    setIsSubmitting(true);
    setMarketCreated(false);

    try {
      console.log("📐 Calculating transaction parameters...");
      const liquidityWei = parseEther(initialLiquidity);

      // Calculate required approval amount based on market type
      let requiredApproval = liquidityWei;

      if (marketType === MarketType.FREE_ENTRY) {
        console.log("🎁 Processing free market configuration...");
        if (!freeSharesPerUser.trim() || !maxFreeParticipants.trim()) {
          console.error("❌ Empty free market fields during submission");
          toast({
            title: "Error",
            description: "Please fill in all free market fields",
            variant: "destructive",
          });
          return;
        }
        const tokensPerUser = parseEther(freeSharesPerUser || "0");
        const maxParticipants = BigInt(maxFreeParticipants || "0");
        const totalPrizePool = tokensPerUser * maxParticipants;
        requiredApproval = liquidityWei + totalPrizePool;
        console.log("💰 Total required approval:", requiredApproval.toString());
      }

      // Check if user has sufficient balance
      if (userBalance < requiredApproval) {
        console.error("❌ Insufficient balance");
        const requiredTokens = Number(requiredApproval) / 1e18;
        const currentTokens = Number(userBalance) / 1e18;
        toast({
          title: "Insufficient Balance",
          description: `You need ${requiredTokens.toLocaleString()} Politics tokens but only have ${currentTokens.toLocaleString()}.`,
          variant: "destructive",
        });
        return;
      }

      // Prepare batch calls
      const calls = [];

      // Add approval call if needed
      if (requiredApproval > currentAllowance) {
        console.log("� Adding approval to batch...");
        calls.push({
          to: tokenAddress as `0x${string}`,
          data: encodeFunctionData({
            abi: tokenAbi,
            functionName: "approve",
            args: [V2contractAddress, requiredApproval],
          }),
        });
      }

      // Add market creation call
      console.log("🏗️ Adding market creation to batch...");
      const builtArgs2 = buildCreateMarketArgs();
      const createMarketCall = {
        to: V2contractAddress as `0x${string}`,
        data: encodeFunctionData({
          abi: V2contractAbi,
          functionName: "createMarket",
          args:
            builtArgs2.length === 10
              ? (builtArgs2 as [
                  string,
                  string,
                  string[],
                  string[],
                  bigint,
                  number,
                  number,
                  bigint,
                  boolean,
                  { maxFreeParticipants: bigint; tokensPerParticipant: bigint }
                ])
              : (builtArgs2 as [
                  string,
                  string,
                  string[],
                  string[],
                  bigint,
                  number,
                  number,
                  bigint,
                  boolean
                ]),
        }),
      };

      calls.push(createMarketCall);

      console.log("📦 Sending batch transaction with", calls.length, "calls");
      console.log("� Batch calls:", calls);

      // Send batch transaction
      await sendCalls({ calls });

      toast({
        title: "Transaction Sent",
        description: "Creating market with batch transaction...",
      });
    } catch (error: any) {
      console.error("❌ Fatal error creating market:", error);
      toast({
        title: "Error",
        description: `Failed to create market: ${
          error?.message || "Unknown error"
        }`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setQuestion("");
    setDescription("");
    setCategory(MarketCategory.OTHER);
    setMarketType(MarketType.PAID);
    setDuration("7");
    setInitialLiquidity("5000");
    setOptions([
      { name: "", description: "" },
      { name: "", description: "" },
    ]);
    setMaxFreeParticipants("3");
    setFreeSharesPerUser("100");
    setIsSubmitting(false);
    setMarketCreated(false);
  };

  if (!isConnected) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-[#433952] to-[#544863]">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-16 w-16 mx-auto text-yellow-300 mb-4" />
          <h3 className="text-lg font-medium mb-2 text-white">
            Connect Your Wallet
          </h3>
          <p className="text-white/80">
            Please connect your wallet to create markets.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!hasCreatorAccess && !hasMarketCreationAuth) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-[#433952] to-[#544863]">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-16 w-16 mx-auto text-red-300 mb-4" />
          <h3 className="text-lg font-medium mb-2 text-white">Access Denied</h3>
          <p className="text-white/80">
            You don&apos;t have permission to create markets. You need either:
            <br />
            • The QUESTION_CREATOR_ROLE on the contract, or
            <br />
            • Be the contract owner
            <br />
            <br />
            <strong>Authorization Status:</strong>
            <br />
            Has Creator Role: {hasCreatorRole ? "✅ Yes" : "❌ No"}
            <br />
            Is Contract Owner: {isOwner ? "✅ Yes" : "❌ No"}
            <br />
            Legacy Creator Access: {hasCreatorAccess ? "✅ Yes" : "❌ No"}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (marketCreated) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-[#433952] to-[#544863]">
        <CardContent className="p-6 text-center">
          <CheckCircle className="h-16 w-16 mx-auto text-green-300 mb-4" />
          <h3 className="text-lg font-medium mb-2 text-white">
            Market Created Successfully!
          </h3>
          <p className="text-white/80 mb-4">
            Your prediction market has been created and is now live.
          </p>
          <Button
            onClick={resetForm}
            className="mr-2 bg-white/10 hover:bg-white/20 text-white border-white/20"
          >
            Create Another Market
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/")}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
          >
            View Markets
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card className="border-0 shadow-lg bg-gradient-to-br from-[#433952] to-[#544863]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Plus className="h-5 w-5" />
            Create Market
            <Badge
              variant="secondary"
              className="bg-white/20 text-white border-white/30"
            >
              Admin
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">
              Basic Information
            </h3>

            <div className="space-y-2">
              <Label htmlFor="question" className="text-white/80">
                Market Question *
              </Label>
              <Input
                id="question"
                placeholder="e.g., Will candidate X win the 2024 election?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                maxLength={200}
                style={{ fontSize: "16px" }}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
              />
              <p className="text-sm text-white/60">
                {question.length}/200 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-white/80">
                Description *
              </Label>
              <Textarea
                id="description"
                placeholder="Provide additional context and resolution criteria..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={1000}
                style={{ fontSize: "16px" }}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
              />
              <p className="text-sm text-white/60">
                {description.length}/1000 characters
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category" className="text-white/80">
                  Category
                </Label>
                <Select
                  value={category.toString()}
                  onValueChange={(value) => setCategory(parseInt(value))}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="marketType" className="text-white/80">
                  Market Type
                </Label>
                <Select
                  value={marketType.toString()}
                  onValueChange={(value) => setMarketType(parseInt(value))}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MARKET_TYPE_LABELS).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="duration"
                  className="flex items-center gap-2 text-white/80"
                >
                  <Calendar className="h-4 w-4" />
                  Duration (days) *
                </Label>
                <Input
                  id="duration"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="365"
                  placeholder="e.g., 7"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  style={{ fontSize: "16px" }}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="initialLiquidity"
                  className="flex items-center gap-2 text-white/80"
                >
                  <DollarSign className="h-4 w-4" />
                  Initial Liquidity (Politics, min {MIN_INITIAL_LIQUIDITY}) *
                </Label>
                <Input
                  id="initialLiquidity"
                  type="number"
                  inputMode="decimal"
                  min={MIN_INITIAL_LIQUIDITY}
                  placeholder="e.g., 5000"
                  value={initialLiquidity}
                  onChange={(e) => setInitialLiquidity(e.target.value)}
                  style={{ fontSize: "16px" }}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="earlyResolution"
                checked={earlyResolutionAllowed}
                onCheckedChange={(checked) =>
                  setEarlyResolutionAllowed(checked as boolean)
                }
              />
              <Label
                htmlFor="earlyResolution"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-white/80"
              >
                Allow early resolution for event-based markets
              </Label>
            </div>
          </div>

          <Separator />

          {/* Market Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium flex items-center gap-2 text-white">
                Market Options
                <span className="text-xs font-normal text-white/60">
                  ({options.length}/10, min 2, max 10)
                </span>
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={addOption}
                disabled={options.length >= 10}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Option
              </Button>
            </div>

            {options.map((option, index) => (
              <Card key={index} className="p-4 bg-white/10 border-white/20">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-medium text-white">Option {index + 1}</h4>
                  {options.length > 2 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOption(index)}
                      className="text-red-300 hover:text-red-100 hover:bg-white/10"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <Label
                      htmlFor={`option-name-${index}`}
                      className="text-white/80"
                    >
                      Option Name *
                    </Label>
                    <Input
                      id={`option-name-${index}`}
                      placeholder="e.g., Yes, No, Candidate A"
                      value={option.name}
                      onChange={(e) =>
                        updateOption(index, "name", e.target.value)
                      }
                      maxLength={100}
                      style={{ fontSize: "16px" }}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor={`option-desc-${index}`}
                      className="text-white/80"
                    >
                      Option Description
                    </Label>
                    <Textarea
                      id={`option-desc-${index}`}
                      placeholder="Additional details about this option..."
                      value={option.description}
                      onChange={(e) =>
                        updateOption(index, "description", e.target.value)
                      }
                      rows={2}
                      maxLength={500}
                      style={{ fontSize: "16px" }}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Market Type Specific Settings */}
          {marketType === MarketType.FREE_ENTRY && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2 text-white">
                  <Info className="h-5 w-5" />
                  Free Market Settings
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="maxParticipants"
                      className="flex items-center gap-2 text-white/80"
                    >
                      <DollarSign className="h-4 w-4" />
                      Max Free Participants
                    </Label>
                    <Input
                      id="maxParticipants"
                      type="number"
                      inputMode="numeric"
                      min="1"
                      value={maxFreeParticipants}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow empty string for clearing, but validate on blur
                        setMaxFreeParticipants(value);
                      }}
                      onBlur={(e) => {
                        const value = e.target.value;
                        if (value === "" || isNaN(parseInt(value))) {
                          setMaxFreeParticipants("3"); // Reset to default
                        }
                      }}
                      placeholder="e.g., 3"
                      style={{ fontSize: "16px" }}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="freeShares" className="text-white/80">
                      Free Tokens Per User
                    </Label>
                    <Input
                      id="freeShares"
                      type="number"
                      inputMode="decimal"
                      min="1"
                      value={freeSharesPerUser}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow empty string for clearing, but validate on blur
                        setFreeSharesPerUser(value);
                      }}
                      onBlur={(e) => {
                        const value = e.target.value;
                        if (value === "" || isNaN(parseFloat(value))) {
                          setFreeSharesPerUser("100"); // Reset to default
                        }
                      }}
                      placeholder="e.g., 100"
                      style={{ fontSize: "16px" }}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <Separator className="bg-white/20" />

          {/* Cost Summary */}
          <div className="p-4 bg-[#544863]/30 rounded-lg border border-white/20">
            <h4 className="font-medium mb-2 flex items-center gap-2 text-white">
              <DollarSign className="h-4 w-4" />
              Cost Summary
            </h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-white/80">
                <span>Initial Liquidity:</span>
                <span className="text-white">{initialLiquidity} POLITICS</span>
              </div>
              {marketType === MarketType.FREE_ENTRY && (
                <>
                  <div className="flex justify-between text-white/80">
                    <span>
                      Prize Pool ({maxFreeParticipants || "0"} ×{" "}
                      {freeSharesPerUser || "0"}):
                    </span>
                    <span className="text-white">
                      {(() => {
                        const participants = parseInt(
                          maxFreeParticipants || "0"
                        );
                        const tokensPerUser = parseFloat(
                          freeSharesPerUser || "0"
                        );
                        return isNaN(participants) || isNaN(tokensPerUser)
                          ? "0"
                          : (participants * tokensPerUser).toLocaleString();
                      })()}{" "}
                      POLITICS
                    </span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-medium text-white">
                    <span>Total Required:</span>
                    <span>
                      {(() => {
                        const liquidity = parseFloat(initialLiquidity || "0");
                        const participants = parseInt(
                          maxFreeParticipants || "0"
                        );
                        const tokensPerUser = parseFloat(
                          freeSharesPerUser || "0"
                        );
                        const prizePool =
                          isNaN(participants) || isNaN(tokensPerUser)
                            ? 0
                            : participants * tokensPerUser;
                        return isNaN(liquidity)
                          ? "0"
                          : (liquidity + prizePool).toLocaleString();
                      })()}{" "}
                      POLITICS
                    </span>
                  </div>
                </>
              )}
              {marketType === MarketType.PAID && (
                <div className="flex justify-between font-medium text-white">
                  <span>Total Required:</span>
                  <span>{initialLiquidity} POLITICS</span>
                </div>
              )}

              <Separator className="my-2" />
              <div className="flex justify-between text-white/80">
                <span>Your Balance:</span>
                <span
                  className={(() => {
                    try {
                      if (!initialLiquidity || initialLiquidity.trim() === "")
                        return "text-green-300 font-medium";
                      const requiredAmount =
                        marketType === MarketType.FREE_ENTRY
                          ? (
                              parseFloat(initialLiquidity || "0") +
                              parseFloat(freeSharesPerUser || "0") *
                                parseInt(maxFreeParticipants || "0")
                            ).toString()
                          : initialLiquidity;
                      return userBalance < parseEther(requiredAmount)
                        ? "text-red-300 font-medium"
                        : "text-green-300 font-medium";
                    } catch {
                      return "text-green-300 font-medium";
                    }
                  })()}
                >
                  {(Number(userBalance) / 1e18).toLocaleString()} POLITICS
                </span>
              </div>

              {(() => {
                try {
                  if (!initialLiquidity || initialLiquidity.trim() === "")
                    return false;
                  const requiredAmount =
                    marketType === MarketType.FREE_ENTRY
                      ? (
                          parseFloat(initialLiquidity || "0") +
                          parseFloat(freeSharesPerUser || "0") *
                            parseInt(maxFreeParticipants || "0")
                        ).toString()
                      : initialLiquidity;
                  return userBalance < parseEther(requiredAmount);
                } catch {
                  return false;
                }
              })() && (
                <div className="flex items-center gap-2 p-2 bg-red-900/30 border border-red-400/30 rounded mt-2">
                  <AlertTriangle className="h-4 w-4 text-red-300" />
                  <span className="text-red-200 text-xs">
                    Insufficient balance to create this market
                  </span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Submit Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Info className="h-4 w-4" />
              <span>
                Market creation requires an initial liquidity deposit of at
                least {MIN_INITIAL_LIQUIDITY} tokens
              </span>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={resetForm}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                Reset
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  isSubmitting ||
                  sendCallsPending ||
                  !isFormValidNoSideEffects() ||
                  (() => {
                    try {
                      if (!initialLiquidity || initialLiquidity.trim() === "")
                        return true;
                      const liquidity = parseEther(initialLiquidity);
                      if (marketType === MarketType.FREE_ENTRY) {
                        if (
                          !freeSharesPerUser.trim() ||
                          !maxFreeParticipants.trim()
                        )
                          return true;
                        const tokensPerUser = parseEther(freeSharesPerUser);
                        const participants = BigInt(maxFreeParticipants);
                        return (
                          userBalance < liquidity + tokensPerUser * participants
                        );
                      }
                      return userBalance < liquidity;
                    } catch {
                      return true; // Disable if calculation fails
                    }
                  })()
                }
                className="min-w-[120px] bg-white/20 hover:bg-white/30 text-white"
              >
                {isSubmitting || sendCallsPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    {(() => {
                      try {
                        if (
                          !initialLiquidity ||
                          initialLiquidity.trim() === ""
                        ) {
                          return "Create Market";
                        }
                        const requiredApproval =
                          marketType === MarketType.FREE_ENTRY &&
                          freeSharesPerUser.trim() &&
                          maxFreeParticipants.trim()
                            ? parseEther(initialLiquidity) +
                              parseEther(freeSharesPerUser) *
                                BigInt(maxFreeParticipants)
                            : parseEther(initialLiquidity);
                        return requiredApproval > currentAllowance
                          ? "Approve & Create Market"
                          : "Create Market";
                      } catch {
                        return "Create Market";
                      }
                    })()}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
