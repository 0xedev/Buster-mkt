Introduction
What is EIP-5792?
EIP-5792 enables applications to ask a wallet to process a batch of onchain write calls and to check on the status of those calls. These calls can be enhanced by capabilities (such as atomic execution or paymasters), if they are supported by the wallet.

More specifically, this introduces a wallet_sendCalls method (with additional methods to check the status of submitted calls and display call information). Apps can specify whether they require atomic execution of calls using the atomicRequired field, and wallets can indicate their support for atomic execution through the atomic capability.

Meanwhile wallet_getCapabilities can be called by applications to establish what capabilities are supported by the wallet. These capabilities can then be passed by applications when sending calls to be executed by the wallet.

What does that mean for users?
End users will no longer need to manually execute multiple transactions one by one. The canonical example is the "approve and transfer" flow for ERC-20 tokens, which currently requires two transactions, and necessitates a disorienting UI, particularly for users who are new to the space. User interfaces can be simpler and more intuitive.

This obviously also simplifies things for app developers and designers, who will no longer need to create those complex interfaces. And app developers will no longer need to "guess" what a given wallet is capable of.

For wallets, batched calls provide more context on the application's intent, enabling richer and more informative confirmation dialogs, rather than looking at each transaction one by one. Wallets can also indicate their support for atomic execution of batches through the atomic capability, which can have three states:

supported: The wallet will execute all calls atomically and contiguously
ready: The wallet is able to upgrade to supported pending user approval (e.g. via EIP-7702)
unsupported: The wallet does not provide any atomicity or contiguity guarantees
For both sides, capabilities establish a foundation for iteratively adding new functionality over time to further improve and streamline the user experience.

Why now?
The approaching Pectra upgrade includes EIP-7702, which will enable Externally Owned Accounts (EOAs) to set their address to be represented by a code of an existing smart contract. This means that any account on Ethereum will be able to make batched calls (assuming the EOA's designated smart contract supports it).

This is a transformative unlock for user experience, but for end-users to benefit, applications need to access that new capability. That is where EIP-5792 comes in.

The time is now!

What is the status of this EIP?
This EIP is currently in "Last Call", with a deadline of May 5, 2025. There is already significant support for the EIP across wallets and tools.

Getting Started
For Wallets
To implement support for the new RPC methods, wallets need to:

Implement wallet_getCapabilities to indicate support for atomic execution and other capabilities
Implement wallet_sendCalls to process batches of calls
Implement wallet_getCallsStatus to allow checking the status of submitted calls
Implement wallet_showCallsStatus to display call information to users
wallet_getCapabilities
This method allows wallets to indicate their support for various capabilities, including atomic execution. The atomic capability can have three states:

supported: The wallet will execute all calls atomically and contiguously
ready: The wallet is able to upgrade to supported pending user approval (e.g. via EIP-7702)
unsupported: The wallet does not provide any atomicity or contiguity guarantees
Example response:

{
"atomic": "supported",
"paymasterService": {
"supported": true
}
}
wallet_sendCalls
This method processes a batch of calls. If atomicRequired field is set to true, the wallet must execute all of the calls atomically, otherwise it may execute them atomically or sequentially.

Example request:

{
"method": "wallet_sendCalls",
"params": [
{
"version": "2.0.0",
"chainId": "0x1",
"from": "0x...",
"calls": [
{
"to": "0x...",
"data": "0x...",
"value": "0x0"
}
],
"capabilities": {
"atomic": {
"required": true
}
}
}
]
}
Example response:

{
"id": "0x00000000000000000000000000000000000000000000000000000000000000000e670ec64341771606e55d6b4ca35a1a6b75ee3d5145a99d05921026d1527331",
"capabilities": {
"atomic": {
"status": "supported"
}
}
}
The response includes:

id: A unique identifier for the batch of calls (up to 4096 bytes)
capabilities: Optional capability-specific metadata from the wallet
wallet_getCallsStatus
This method allows checking the status of submitted calls. The status codes follow these categories:

1xx: Pending states
2xx: Confirmed states
4xx: Offchain failures
5xx: Chain rules failures
Code Description
100 Batch has been received by the wallet but has not completed execution onchain (pending)
200 Batch has been included onchain without reverts, receipts array contains info of all calls (confirmed)
400 Batch has not been included onchain and wallet will not retry (offchain failure)
500 Batch reverted completely and only changes related to gas charge may have been included onchain (chain rules failure)
600 Batch reverted partially and some changes related to batch calls may have been included onchain (partial chain rules failure)
Example response:

{
"status": 200,
"receipts": [
{
"logs": [],
"status": "0x1",
"blockHash": "0x...",
"blockNumber": "0x...",
"gasUsed": "0x...",
"transactionHash": "0x..."
}
]
}
wallet_showCallsStatus
This method displays call information to users. It can be used to show the status of submitted calls, including any errors or confirmations.

Example request:

{
"method": "wallet_showCallsStatus",
"params": [
{
"chainId": "0x1",
"calls": [
{
"to": "0x...",
"data": "0x...",
"value": "0x0"
}
],
"status": 200,
"receipts": [
{
"logs": [],
"status": "0x1",
"blockHash": "0x...",
"blockNumber": "0x...",
"gasUsed": "0x...",
"transactionHash": "0x..."
}
]
}
]
}
For Apps
The easiest way for apps to start using EIP-5792 is to use a library which has implemented support for EIP-5792:

Wagmi
Viem
thirdweb
For example, the following fetches the connected wallet's capabilities using wagmi's useCapabilities hook:

App.tsx

import { useCapabilities } from 'wagmi'

function App() {
const { data: capabilities } = useCapabilities()
{

    "0x0": {

      "flow-control": {

        "supported": true

      }

    },

    "0x1": {

      "atomic": true,

      "auxiliaryFunds": {

        "supported": true

      }

    }

}

return <div />
}
While not all wallets are EIP-5792 compliant, apps can call wallet_sendCalls, falling back to a legacy method if they encounter an 4200 Unsupported Method error.

See the following example using Viem's sendCalls implementation, falling back to sendTransaction if the connected wallet doesn't support EIP-5792:

executeTransactions.ts

import { createWalletClient, custom, parseEther } from 'viem'
import { mainnet } from 'viem/chains'

export const walletClient = createWalletClient({
chain: mainnet,
transport: custom(window.ethereum!),
})

const [account] = await walletClient.getAddresses()

// Define our transaction calls
const calls = [
{
to: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as const,
value: parseEther('1')
},
{
data: '0xdeadbeef' as const,
to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as const,
},
]

async function executeTransactions() {
try {
const { id } = await walletClient.sendCalls({
account,
calls,
forceAtomic: true // Force atomic execution, sets `atomicRequired`: true
})
return id
} catch (error) {
// Check for EIP-5792 unsupported method error (code 4200)
const err = error as { code?: number; message?: string }
if (err.code === 4200 || (err.message && err.message.includes('Unsupported Method'))) {

      const results = []
      for (const call of calls) {
        try {
          const hash = await walletClient.sendTransaction({ account, ...call })
          results.push({ hash, success: true })
        } catch (txError) {
          results.push({ error: txError, success: false })
        }
      }

      return results
    }

    throw error

}
}

executeTransactions()
.then(result => console.log('Transaction result:', result))
.catch(error => console.error('Transaction failed:', error))

wallet_getCapabilities
Allows an application to query what capabilities a wallet supports. This method should return a 4100 Unauthorized error if the user has not authorized a connection between the application and the requested address.

Note that the capabilities shown below are for illustrative purposes. We expect the community to align on the definition of additional capabilities in separate ERCs over time.

Example Usage

provider.request({
method: 'wallet_getCapabilities',
params: ['0xd46e8dd67c5d32be8058bb8eb970870f07244567', ['0x2105', '0x14A34']]
})
{

"0x0": {

    "flow-control": {

      "supported": true

    }

},

"0x2105": {

    "paymasterService": {

      "supported": true

    },

    "sessionKeys": {

      "supported": true

    }

},

"0x14A34": {

    "auxiliaryFunds": {

      "supported": true

    }

}

}
Parameters
[Address, string[]]
An array with:

The wallet address to query capabilities for
Opt array of chain IDs in hexadecimal format to query capabilities for
Returns
Record<string, Record<string, any>>
An object where:

The top-level keys are chain IDs in hexadecimal format
Chain ID "0x0" indicates capabilities supported across all chains
The values are objects mapping capability names to capability-specific parameters
Each capability's parameters are defined in that capability's specification

wallet_sendCalls
Requests that a wallet submits a batch of calls. The wallet may execute these calls atomically (in a single transaction) or non-atomically (in multiple transactions), depending on the wallet's capabilities and the atomicRequired parameter.

Example Usage

provider.request({
method: 'wallet_sendCalls',
params: [{
version: '1.0',
id: '0x123...',
chainId: '0x01',
from: '0xd46e8dd67c5d32be8058bb8eb970870f07244567',
atomicRequired: true,
calls: [
{
to: '0xd46e8dd67c5d32be8058bb8eb970870f07244567',
value: '0x9184e72a',
data: '0xd46e8dd67c5d32be8d46e8dd67c5d32be8058bb8eb970870f072445675058bb8eb970870f072445675'
},
{
to: '0xd46e8dd67c5d32be8058bb8eb970870f07244567',
value: '0x182183',
data: '0xfbadbaf01'
}
],
capabilities: {
paymasterService: {
url: "https://...",
optional: true
}
}
}]
})
{

"id": "0x00000000000000000000000000000000000000000000000000000000000000000e670ec64341771606e55d6b4ca35a1a6b75ee3d5145a99d05921026d1527331"

}
Parameters
An array with a single object that contains the following fields:

version
string
The version of the sendCalls API to use. Currently, '1.0' is the only version.
id
string (optional)
A unique identifier for this batch of calls. If provided, must be a unique string up to 4096 bytes (8194 characters including leading 0x). Must be unique per sender per app. If not provided, the wallet will generate a random ID.
chainId
Hex
The chain ID to send the calls on. This is top level because all calls must be submitted on the same chain.
from
Address (optional)
The address to send the calls from. If not provided, the wallet should allow the user to select the address during confirmation.
atomicRequired
boolean
Specifies whether the wallet must execute all calls atomically (in a single transaction) or not. If set to true, the wallet MUST execute all calls atomically and contiguously. If set to false, the wallet MUST execute calls sequentially (one after another), but they need not be contiguous (other transactions may be interleaved) and some calls may fail independently.
If the wallet's atomic capability is ready, it MUST upgrade to supported before proceeding with atomic execution.
calls
Call[]
The calls to submit. A Call is defined as an object that has the following fields:
to (optional)
Address
The address to send this call to. This field is optional because a call can be a contract creation.
value (optional)
Hex
Value in wei to send with this call.
data
Hex
The hash of the invoked method signature and encoded parameters OR the compiled code of a contract.
capabilities (optional)
Record<string, Capability>
Call-specific capability parameters
capabilities
Record<string, Capability>
An object where the keys are capability names and the values are capability-specific parameters. The wallet MUST support all non-optional capabilities requested or reject the request.
Returns
{ id: string, capabilities?: Record<string, any> }
Returns an object containing:

id: A call bundle identifier that can be used with wallet_getCallsStatus and wallet_showCallsStatus
capabilities: Optional capability-specific response data

wallet_getCallsStatus
Returns the status of a call batch that was sent via wallet_sendCalls. The atomic field indicates whether the wallet executed the calls atomically or not, which affects the structure of the receipts field.

Example Usage

provider.request({
method: 'wallet_getCallsStatus',
params: ['0xe670ec64341771606e55d6b4ca35a1a6b75ee3d5145a99d05921026d1527331']
})
{

version: "1.0",

chainId: "0x01",

id: "0xe670ec64341771606e55d6b4ca35a1a6b75ee3d5145a99d05921026d1527331",

status: 200,

atomic: true,

receipts: [

    {

      logs: [

        {

          address: '0xa922b54716264130634d6ff183747a8ead91a40b',

          topics: ['0x5a2a90727cc9d000dd060b1132a5c977c9702bb3a52afe360c9c22f0e9451a68'],

          data: '0xabcd'

        }

      ],

      status: '0x1',

      blockHash: '0xf19bbafd9fd0124ec110b848e8de4ab4f62bf60c189524e54213285e7f540d4a',

      blockNumber: '0xabcd',

      gasUsed: '0xdef',

      transactionHash: '0x9b7bb827c2e5e3c1a0a44dc53e573aa0b3af3bd1f9f5ed03071b100bb039eaff'

    }

]

}
Parameters
[string]
An array with a single element: a call bundle identifier returned by a wallet_sendCalls call.

Returns
version
string
The version of the API being used. Currently "1.0".
chainId
string
The chain ID in hexadecimal format.
id
string
The call bundle identifier.
status
number
Status code indicating the current state of the batch. Status codes follow these categories:
1xx: Pending states
100: Batch has been received by the wallet but has not completed execution onchain
2xx: Confirmed states
200: Batch has been included onchain without reverts
4xx: Offchain failures
400: Batch has not been included onchain and wallet will not retry
5xx: Chain rules failures
500: Batch reverted completely and only changes related to gas charge may have been included onchain
6xx: Partial chain rules failures
600: Batch reverted partially and some changes related to batch calls may have been included onchain
atomic
boolean
Indicates whether the wallet executed the calls atomically or not. If true, the wallet executed all calls in a single transaction. If false, the wallet executed the calls in multiple transactions.
receipts
Receipt[]
The receipts associated with a call bundle, if available. The structure depends on the atomic field:
If atomic is true, this may be a single receipt or an array of receipts, corresponding to how the batch was included onchain
If atomic is false, this must be an array of receipts for all transactions containing batch calls that were included onchain
Each receipt contains:
logs
Log[]
The logs generated by the calls. For smart contract wallets (e.g. ERC-4337), these should only include logs relevant to the specific calls, not infrastructure logs.
status
'0x1' | '0x0'
0x1 for success, 0x0 for failure
blockHash
Hash
Hash of the block containing these calls
blockNumber
Hex
Block number containing these calls
gasUsed
Hex
The amount of gas used by these calls
transactionHash
Hash
Hash of the transaction containing these calls
capabilities
Record<string, any>
Optional capability-specific metadata

wallet_showCallsStatus
Requests that a wallet shows information about a given call bundle that was sent with wallet_sendCalls. This method does not return anything.

Example Usage

provider.request({
method: 'wallet_showCallsStatus',
params: ['0xe670ec64341771606e55d6b4ca35a1a6b75ee3d5145a99d05921026d1527331']
})
Parameters
[string]
An array with a single element: a call bundle identifier returned by a wallet_sendCalls call.
