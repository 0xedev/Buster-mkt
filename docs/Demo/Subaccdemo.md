================================================
FILE: base-account/auto-sub-accounts/README.md
================================================

# Sub Accounts Example

A simple Next.js app demonstrating Base Account SDK Sub Accounts integration with automatic sub account creation and USDC transfers on Base Sepolia.

## Features

- **Automatic Sub Account Creation**: Sub account is created automatically when users connect their wallet
- **USDC Transfer**: Send USDC to a specified address on Base Sepolia
- **Auto Spend Permissions**: Sub accounts can access Universal Account balance when needed
- **Modern UI**: Clean and responsive interface

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Base Account (create one at [account.base.app](https://account.base.app))
- USDC on Base Sepolia testnet

### Installation

1. Install dependencies:

```bash
npm install
```

2. Run the development s:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## How It Works

This app uses the **quickstart configuration** from the Base Account SDK:

```tsx
const sdk = createBaseAccountSDK({
  subAccounts: {
    creation: "on-connect", // Auto-create sub account on connect
    defaultAccount: "sub", // Use sub account for transactions by default
  },
});
```

### Key Benefits

- **No repeated prompts**: Transactions are sent from the sub account without repeated approval
- **Seamless funding**: Auto Spend Permissions allow the sub account to access Universal Account balance
- **Better UX**: Perfect for apps requiring frequent transactions

## Usage

1. **Connect Wallet**: Click "Connect Wallet" and approve the connection in your Base Account
2. **Sub Account Created**: A sub account is automatically created for this app
3. **Send USDC**: Enter an amount and click "Send USDC" to transfer to the recipient address

## Configuration

### Recipient Address

The USDC recipient address is set in `app/page.tsx`:

```tsx
const RECIPIENT_ADDRESS = "0xd8da6bf26964af9d7eed9e03e53415d37aa96045";
```

### USDC Contract

The app uses the USDC contract on Base Sepolia:

```tsx
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
```

## Learn More

- [Base Account Documentation](https://docs.base.org/base-account)
- [Sub Accounts Guide](https://docs.base.org/base-account/improve-ux/sub-accounts)
- [Base Account SDK](https://github.com/base/account-sdk)

## License

MIT

================================================
FILE: base-account/auto-sub-accounts/next.config.js
================================================
/\*_ @type {import('next').NextConfig} _/
const nextConfig = {
reactStrictMode: true,
}

module.exports = nextConfig

================================================
FILE: base-account/auto-sub-accounts/package.json
================================================
{
"name": "sub-accounts-example",
"version": "0.1.0",
"private": true,
"scripts": {
"dev": "next dev",
"build": "next build",
"start": "next start",
"lint": "next lint"
},
"dependencies": {
"@base-org/account": "latest",
"next": "14.2.5",
"react": "^18.3.1",
"react-dom": "^18.3.1",
"viem": "^2.21.4"
},
"devDependencies": {
"@types/node": "^20",
"@types/react": "^18",
"@types/react-dom": "^18",
"typescript": "^5"
}
}

================================================
FILE: base-account/auto-sub-accounts/tsconfig.json
================================================
{
"compilerOptions": {
"lib": ["dom", "dom.iterable", "esnext"],
"allowJs": true,
"skipLibCheck": true,
"strict": true,
"noEmit": true,
"esModuleInterop": true,
"module": "esnext",
"moduleResolution": "bundler",
"resolveJsonModule": true,
"isolatedModules": true,
"jsx": "preserve",
"incremental": true,
"plugins": [
{
"name": "next"
}
],
"paths": {
"@/_": ["./_"]
}
},
"include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
"exclude": ["node_modules"]
}

================================================
FILE: base-account/auto-sub-accounts/app/globals.css
================================================

- {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
  }

html,
body {
max-width: 100vw;
overflow-x: hidden;
}

body {
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
sans-serif;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
background: linear-gradient(to bottom, #0052ff 0%, #001a66 100%);
min-height: 100vh;
color: white;
}

.container {
max-width: 800px;
margin: 0 auto;
padding: 40px 20px;
}

.card {
background: rgba(255, 255, 255, 0.1);
backdrop-filter: blur(10px);
border-radius: 16px;
padding: 32px;
margin-bottom: 24px;
border: 1px solid rgba(255, 255, 255, 0.2);
}

.title {
font-size: 2.5rem;
font-weight: bold;
margin-bottom: 8px;
text-align: center;
}

.subtitle {
font-size: 1.1rem;
opacity: 0.9;
text-align: center;
margin-bottom: 32px;
}

.section-title {
font-size: 1.5rem;
font-weight: 600;
margin-bottom: 16px;
}

.info-row {
display: flex;
flex-direction: column;
gap: 8px;
margin-bottom: 16px;
padding: 16px;
background: rgba(0, 0, 0, 0.2);
border-radius: 8px;
}

.info-label {
font-size: 0.875rem;
opacity: 0.8;
font-weight: 500;
}

.info-value {
font-family: 'Monaco', 'Courier New', monospace;
font-size: 0.9rem;
word-break: break-all;
}

.button {
background: white;
color: #0052ff;
border: none;
padding: 14px 28px;
border-radius: 8px;
font-size: 16px;
font-weight: 600;
cursor: pointer;
transition: all 0.2s;
width: 100%;
margin-bottom: 12px;
}

.button:hover:not(:disabled) {
transform: translateY(-2px);
box-shadow: 0 4px 12px rgba(255, 255, 255, 0.3);
}

.button:disabled {
opacity: 0.5;
cursor: not-allowed;
}

.button-secondary {
background: transparent;
color: white;
border: 2px solid white;
}

.button-secondary:hover:not(:disabled) {
background: rgba(255, 255, 255, 0.1);
}

.status-message {
padding: 12px 16px;
background: rgba(0, 0, 0, 0.3);
border-radius: 8px;
margin-bottom: 16px;
font-size: 0.9rem;
}

.button-group {
display: flex;
flex-direction: column;
gap: 12px;
}

.input-group {
margin-bottom: 16px;
}

.input-label {
display: block;
margin-bottom: 8px;
font-size: 0.9rem;
font-weight: 500;
}

.input {
width: 100%;
padding: 12px 16px;
border-radius: 8px;
border: 1px solid rgba(255, 255, 255, 0.3);
background: rgba(0, 0, 0, 0.2);
color: white;
font-size: 1rem;
font-family: 'Monaco', 'Courier New', monospace;
}

.input::placeholder {
color: rgba(255, 255, 255, 0.5);
}

.input:focus {
outline: none;
border-color: white;
}

================================================
FILE: base-account/auto-sub-accounts/app/layout.tsx
================================================
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
title: "Sub Accounts Example",
description: "Demo app showing Base Account Sub Accounts integration",
};

export default function RootLayout({
children,
}: Readonly<{
children: React.ReactNode;
}>) {
return (
<html lang="en">
<body>{children}</body>
</html>
);
}

================================================
FILE: base-account/auto-sub-accounts/app/page.tsx
================================================
"use client";

import { createBaseAccountSDK } from "@base-org/account";
import { useCallback, useEffect, useState } from "react";
import { baseSepolia } from "viem/chains";
import { encodeFunctionData, parseUnits } from "viem";

// USDC contract address on Base Sepolia
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const RECIPIENT_ADDRESS = "0xd8da6bf26964af9d7eed9e03e53415d37aa96045";

// ERC-20 ABI for transfer function
const ERC20_ABI = [
{
inputs: [
{ name: "to", type: "address" },
{ name: "amount", type: "uint256" },
],
name: "transfer",
outputs: [{ name: "", type: "bool" }],
stateMutability: "nonpayable",
type: "function",
},
] as const;

export default function Home() {
const [provider, setProvider] = useState<ReturnType<
ReturnType<typeof createBaseAccountSDK>["getProvider"]

> | null>(null);
> const [connected, setConnected] = useState(false);
> const [universalAddress, setUniversalAddress] = useState<string>("");
> const [subAccountAddress, setSubAccountAddress] = useState<string>("");
> const [loading, setLoading] = useState(false);
> const [status, setStatus] = useState("Ready to connect");
> const [amount, setAmount] = useState("1");

// Initialize SDK with quickstart configuration
useEffect(() => {
const initializeSDK = async () => {
try {
const sdkInstance = createBaseAccountSDK({
appName: "Sub Accounts Example",
appLogoUrl: "https://base.org/logo.png",
appChainIds: [baseSepolia.id],
// Quickstart configuration
subAccounts: {
creation: "on-connect",
defaultAccount: "sub",
},
});

        const providerInstance = sdkInstance.getProvider();
        setProvider(providerInstance);
        setStatus("SDK initialized - ready to connect");
      } catch (error) {
        console.error("SDK initialization failed:", error);
        setStatus("SDK initialization failed");
      }
    };

    initializeSDK();

}, []);

const connectWallet = async () => {
if (!provider) {
setStatus("Provider not initialized");
return;
}

    setLoading(true);
    setStatus("Connecting wallet and creating sub account...");

    try {
      // With quickstart config, this will automatically create a sub account
      const connectedAccounts = (await provider.request({
        method: "wallet_connect",
        params: [],
      })) as string[];

      const accounts = (await provider.request({
        method: "eth_requestAccounts",
        params: [],
      })) as string[];

      // With defaultAccount: 'sub', the sub account is the first account
      const subAddr = accounts[0];
      const universalAddr = accounts[1];

      setSubAccountAddress(subAddr);
      setUniversalAddress(universalAddr);
      setConnected(true);
      setStatus("Connected! Sub Account automatically created");
    } catch (error) {
      console.error("Connection failed:", error);
      setStatus(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }

};

const sendUSDC = useCallback(async () => {
if (!provider || !subAccountAddress) {
setStatus("Not connected or sub account not available");
return;
}

    setLoading(true);
    setStatus("Preparing USDC transfer...");

    try {
      // Parse amount (USDC has 6 decimals)
      const amountInUnits = parseUnits(amount, 6);

      // Encode the transfer function call
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [RECIPIENT_ADDRESS as `0x${string}`, amountInUnits],
      });

      setStatus("Sending transaction...");

      // Send the transaction using wallet_sendCalls
      const callsId = (await provider.request({
        method: "wallet_sendCalls",
        params: [
          {
            version: "2.0",
            atomicRequired: true,
            chainId: `0x${baseSepolia.id.toString(16)}`,
            from: subAccountAddress,
            calls: [
              {
                to: USDC_ADDRESS,
                data: data,
                value: "0x0",
              },
            ],
            capabilities: {
              // Optional: Add paymaster URL here to sponsor gas
              // paymasterUrl: "your-paymaster-url",
            },
          },
        ],
      })) as string;

      setStatus(`Transaction sent! Calls ID: ${callsId}`);
    } catch (error) {
      console.error("Transaction failed:", error);
      setStatus(`Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }

}, [provider, subAccountAddress, amount]);

return (
<div className="container">
<h1 className="title">Sub Accounts Example</h1>
<p className="subtitle">
Demonstrating automatic sub account creation and USDC transfers on Base Sepolia
</p>

      <div className="card">
        <div className="status-message">{status}</div>

        {!connected ? (
          <button
            onClick={connectWallet}
            disabled={loading || !provider}
            className="button"
          >
            {loading ? "Connecting..." : "Connect Wallet"}
          </button>
        ) : (
          <>
            <div className="section-title">Account Information</div>

            <div className="info-row">
              <span className="info-label">Sub Account Address:</span>
              <span className="info-value">{subAccountAddress}</span>
            </div>

            <div className="info-row">
              <span className="info-label">Universal Account Address:</span>
              <span className="info-value">{universalAddress}</span>
            </div>

            <div style={{ marginTop: "32px" }}>
              <div className="section-title">Send USDC</div>

              <div className="info-row">
                <span className="info-label">Recipient:</span>
                <span className="info-value">{RECIPIENT_ADDRESS}</span>
              </div>

              <div className="input-group">
                <label className="input-label">Amount (USDC):</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1"
                  step="0.01"
                  min="0"
                  className="input"
                  disabled={loading}
                />
              </div>

              <button
                onClick={sendUSDC}
                disabled={loading || !amount || parseFloat(amount) <= 0}
                className="button"
              >
                {loading ? "Sending..." : `Send ${amount} USDC`}
              </button>

              <div style={{ marginTop: "16px", fontSize: "0.85rem", opacity: 0.8 }}>
                <p>• This will send USDC from your Sub Account</p>
                <p>• Auto Spend Permissions will request funds from your Universal Account if needed</p>
                <p>• Make sure you have USDC in your Universal Account on Base Sepolia</p>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <div className="section-title">About This Demo</div>
        <p style={{ lineHeight: "1.6", opacity: 0.9 }}>
          This app demonstrates the <strong>quickstart approach</strong> to Sub Accounts integration:
        </p>
        <ul style={{ marginTop: "12px", marginLeft: "20px", lineHeight: "1.8", opacity: 0.9 }}>
          <li>Sub Account is automatically created when you connect</li>
          <li>All transactions are sent from the Sub Account by default</li>
          <li>Auto Spend Permissions allow accessing Universal Account balance</li>
          <li>No repeated approval prompts for transactions</li>
        </ul>
      </div>
    </div>

);
}
