"use client";

import { useState } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { isAddress } from "viem";
import { useToast } from "@/components/ui/use-toast";
import { V2contractAddress, V2contractAbi } from "@/constants/contract";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  UserPlus,
  UserMinus,
  Shield,
  AlertTriangle,
  Loader2,
  CheckCircle,
  Info,
} from "lucide-react";
import { useUserRoles } from "@/hooks/useUserRoles";

type RoleType = "creator" | "resolver" | "validator" | "admin";

const ROLE_INFO = {
  creator: {
    label: "Question Creator",
    description: "Can create new prediction markets",
    icon: UserPlus,
    color: "bg-blue-500/20 text-blue-200 border-blue-500/20",
  },
  resolver: {
    label: "Question Resolver",
    description: "Can resolve markets and handle disputes",
    icon: Shield,
    color: "bg-green-500/20 text-green-200 border-green-500/20",
  },
  validator: {
    label: "Market Validator",
    description: "Can validate markets before they go live",
    icon: CheckCircle,
    color: "bg-purple-500/20 text-purple-200 border-purple-500/20",
  },
  admin: {
    label: "Platform Admin",
    description: "Full admin access to all platform functions",
    icon: Shield,
    color: "bg-red-500/20 text-red-200 border-red-500/20",
  },
};
// Component for managing user roles and permissions//
export function AdminRoleManager() {
  const { isConnected } = useAccount();
  const { isOwner } = useUserRoles();
  const { toast } = useToast();

  const [selectedRole, setSelectedRole] = useState<RoleType>("creator");
  const [targetAddress, setTargetAddress] = useState("");
  const [action, setAction] = useState<"grant" | "revoke">("grant");

  const { writeContract, data: hash, error, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  const getRoleFunctionName = (role: RoleType, action: "grant" | "revoke") => {
    const actionPrefix = action === "grant" ? "grant" : "revoke";

    switch (role) {
      case "creator":
        return action === "grant" ? "grantQuestionCreatorRole" : "revokeRole";
      case "resolver":
        return action === "grant" ? "grantQuestionResolveRole" : "revokeRole";
      case "validator":
        return action === "grant" ? "grantMarketValidatorRole" : "revokeRole";
      case "admin":
        return action === "grant" ? "grantRole" : "revokeRole";
      default:
        return "grantRole";
    }
  };

  const getRoleBytes32 = (role: RoleType) => {
    // These should be the actual keccak256 hashes from the contract
    switch (role) {
      case "creator":
        return "0x1234567890123456789012345678901234567890123456789012345678901234";
      case "resolver":
        return "0x1234567890123456789012345678901234567890123456789012345678901235";
      case "validator":
        return "0x1234567890123456789012345678901234567890123456789012345678901236";
      case "admin":
        return "0x0000000000000000000000000000000000000000000000000000000000000000";
      default:
        return "0x0000000000000000000000000000000000000000000000000000000000000000";
    }
  };

  const handleRoleAction = async () => {
    if (!targetAddress || !isAddress(targetAddress) || !isOwner) {
      toast({
        title: "Error",
        description: "Please enter a valid Ethereum address.",
        variant: "destructive",
      });
      return;
    }

    try {
      const functionName = getRoleFunctionName(selectedRole, action);

      if (selectedRole === "creator" && action === "grant") {
        await writeContract({
          address: V2contractAddress,
          abi: V2contractAbi,
          functionName: "grantQuestionCreatorRole",
          args: [targetAddress as `0x${string}`],
        });
      } else if (selectedRole === "resolver" && action === "grant") {
        await writeContract({
          address: V2contractAddress,
          abi: V2contractAbi,
          functionName: "grantQuestionResolveRole",
          args: [targetAddress as `0x${string}`],
        });
      } else if (selectedRole === "validator" && action === "grant") {
        await writeContract({
          address: V2contractAddress,
          abi: V2contractAbi,
          functionName: "grantMarketValidatorRole",
          args: [targetAddress as `0x${string}`],
        });
      } else if (action === "grant") {
        // Grant admin role
        await writeContract({
          address: V2contractAddress,
          abi: V2contractAbi,
          functionName: "grantRole",
          args: [getRoleBytes32(selectedRole), targetAddress as `0x${string}`],
        });
      } else {
        // Revoke any role
        await writeContract({
          address: V2contractAddress,
          abi: V2contractAbi,
          functionName: "revokeRole",
          args: [getRoleBytes32(selectedRole), targetAddress as `0x${string}`],
        });
      }

      // Clear form on success
      setTargetAddress("");
    } catch (error) {
      console.error("Error managing role:", error);
      toast({
        title: "Error",
        description: `Failed to ${action} role.`,
        variant: "destructive",
      });
    }
  };

  if (!isConnected) {
    return (
      <Card className="border-white/10 bg-white/5 backdrop-blur-md">
        <CardContent className="p-4 md:p-6 text-center">
          <Users className="h-12 w-12 md:h-16 md:w-16 mx-auto text-white/20 mb-3 md:mb-4" />
          <h3 className="text-base md:text-lg font-medium mb-2 text-white/90">
            Connect Your Wallet
          </h3>
          <p className="text-sm md:text-base text-white/50">
            Please connect your wallet to manage user roles.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!isOwner) {
    return (
      <Card className="border-white/10 bg-white/5 backdrop-blur-md">
        <CardContent className="p-4 md:p-6 text-center">
          <AlertTriangle className="h-12 w-12 md:h-16 md:w-16 mx-auto text-red-400/50 mb-3 md:mb-4" />
          <h3 className="text-base md:text-lg font-medium mb-2 text-white/90">
            Owner Access Required
          </h3>
          <p className="text-sm md:text-base text-white/50">
            Only the contract owner can manage user roles and permissions.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isConfirmed) {
    return (
      <Card className="border-white/10 bg-white/5 backdrop-blur-md">
        <CardContent className="p-4 md:p-6 text-center">
          <CheckCircle className="h-12 w-12 md:h-16 md:w-16 mx-auto text-green-400/50 mb-3 md:mb-4" />
          <h3 className="text-base md:text-lg font-medium mb-2 text-white/90">
            Role Updated Successfully!
          </h3>
          <p className="text-sm md:text-base text-white/50 mb-3 md:mb-4">
            The user role has been {action === "grant" ? "granted" : "revoked"}.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="text-white border border-white/10 bg-white/10 hover:bg-white/20 text-xs md:text-sm px-4"
          >
            Continue Managing Roles
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Role Information */}
      <Card className="border-white/10 bg-white/5 backdrop-blur-md">
        <CardHeader className="pb-3 md:pb-6 border-b border-white/5">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg text-white font-medium">
            <Info className="h-4 w-4 md:h-5 md:w-5" />
            Platform Roles Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 md:pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {Object.entries(ROLE_INFO).map(([key, role]) => {
              const IconComponent = role.icon;
              return (
                <div
                  key={key}
                  className="p-3 md:p-4 border border-white/10 rounded-lg bg-white/5"
                >
                  <div className="flex items-center gap-2 md:gap-3 mb-2">
                    <IconComponent className="h-4 w-4 md:h-5 md:w-5 text-white/60" />
                    <h3 className="font-medium text-sm md:text-base text-white/90">
                      {role.label}
                    </h3>
                    <Badge
                      variant="outline"
                      className={`${role.color} text-[10px] uppercase border px-1.5 py-0.5 md:px-2 md:py-1`}
                    >
                      {key}
                    </Badge>
                  </div>
                  <p className="text-xs md:text-sm text-white/50">
                    {role.description}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Role Management */}
      <Card className="border-white/10 bg-white/5 backdrop-blur-md">
        <CardHeader className="pb-3 md:pb-6 border-b border-white/5">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg text-white font-medium">
            <Users className="h-4 w-4 md:h-5 md:w-5" />
            Manage User Roles
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-6 pt-4 md:pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="action"
                className="text-xs md:text-sm text-white/60"
              >
                Action
              </Label>
              <Select
                value={action}
                onValueChange={(value: "grant" | "revoke") => setAction(value)}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white h-9 md:h-10 text-sm focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#2a2435] border-white/10 text-white">
                  <SelectItem value="grant">Grant Role</SelectItem>
                  <SelectItem value="revoke">Revoke Role</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="role"
                className="text-xs md:text-sm text-white/60"
              >
                Role Type
              </Label>
              <Select
                value={selectedRole}
                onValueChange={(value: RoleType) => setSelectedRole(value)}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white h-9 md:h-10 text-sm focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#2a2435] border-white/10 text-white">
                  <SelectItem value="creator">Question Creator</SelectItem>
                  <SelectItem value="resolver">Question Resolver</SelectItem>
                  <SelectItem value="validator">Market Validator</SelectItem>
                  <SelectItem value="admin">Platform Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="address"
              className="text-xs md:text-sm text-white/60"
            >
              User Address *
            </Label>
            <Input
              id="address"
              placeholder="0x..."
              value={targetAddress}
              onChange={(e) => setTargetAddress(e.target.value)}
              className={`bg-white/5 border-white/10 text-white placeholder:text-white/30 h-9 md:h-10 text-sm focus:ring-0 ${
                targetAddress && !isAddress(targetAddress)
                  ? "border-red-500/50 focus:border-red-500/50"
                  : ""
              }`}
            />
            {targetAddress && !isAddress(targetAddress) && (
              <p className="text-[10px] md:text-xs text-red-400/80">
                Please enter a valid Ethereum address.
              </p>
            )}
          </div>

          {/* Action Summary */}
          <div className="p-3 md:p-4 bg-white/5 border border-white/10 rounded-lg">
            <h3 className="font-medium mb-2 text-sm md:text-base text-white/90">
              Action Summary
            </h3>
            <div className="space-y-1 text-xs md:text-sm text-white/60">
              <p>
                <span className="font-medium text-white/80">Action:</span>{" "}
                {action === "grant" ? "Grant" : "Revoke"}
              </p>
              <p>
                <span className="font-medium text-white/80">Role:</span>{" "}
                {ROLE_INFO[selectedRole].label}
              </p>
              <p>
                <span className="font-medium text-white/80">
                  Target Address:
                </span>{" "}
                {targetAddress || "Not specified"}
              </p>
            </div>

            {selectedRole && (
              <div className="mt-3 p-2 md:p-3 bg-white/5 border border-white/10 rounded">
                <p className="text-xs md:text-sm text-white/70">
                  <span className="font-medium text-white/90">Permission:</span>{" "}
                  {ROLE_INFO[selectedRole].description}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-2">
            <Button
              onClick={handleRoleAction}
              disabled={
                !targetAddress ||
                !isAddress(targetAddress) ||
                isPending ||
                isConfirming
              }
              className="flex items-center justify-center gap-2 h-9 md:h-10 text-sm md:text-base bg-white/10 hover:bg-white/20 text-white border border-white/10"
            >
              {isPending || isConfirming ? (
                <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
              ) : action === "grant" ? (
                <UserPlus className="h-3 w-3 md:h-4 md:w-4" />
              ) : (
                <UserMinus className="h-3 w-3 md:h-4 md:w-4" />
              )}
              {action === "grant" ? "Grant Role" : "Revoke Role"}
            </Button>

            <Button
              variant="ghost"
              onClick={() => {
                setTargetAddress("");
                setSelectedRole("creator");
                setAction("grant");
              }}
              className="h-9 md:h-10 text-sm md:text-base text-white/50 hover:text-white hover:bg-white/5"
            >
              Clear Form
            </Button>
          </div>

          {error && (
            <div className="p-3 md:p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-300 text-xs md:text-sm">
                Error: {error.message}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="border-yellow-500/20 bg-yellow-500/5">
        <CardContent className="p-3 md:p-4">
          <div className="flex items-start gap-2 md:gap-3">
            <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-yellow-500/50 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-200/90 text-sm md:text-base">
                Security Notice
              </h3>
              <p className="text-xs md:text-sm text-yellow-200/50 mt-1">
                Role management is a sensitive operation. Only grant roles to
                trusted addresses. Admin roles have significant permissions and
                should be used sparingly. Always verify the recipient address
                before granting permissions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
