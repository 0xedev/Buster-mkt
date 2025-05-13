import { base } from "wagmi/chains";

export const customBase = {
  ...base,
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL || base.rpcUrls.default.http[0],
      ],
    },
    public: {
      http: [
        process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL || base.rpcUrls.default.http[0],
      ],
    },
  },
};
