import { defineChain } from "thirdweb/chains";
import { base as baseDefault } from "thirdweb/chains"; // Import the default Base chain definition

// Define your custom Base chain configuration using your Alchemy RPC URL
export const customBase = defineChain({
  ...baseDefault, // Spread all properties from the default Base chain
  rpc: process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL || baseDefault.rpc, // Override the RPC URL
  // If NEXT_PUBLIC_ALCHEMY_RPC_URL is guaranteed to be set, you can use:
  // rpc: process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL!,
});
