**Phase 1: Setup & Personalization**

1.  **Understand Frame Context:**
    - Review the Farcaster Mini Apps documentation (when you share it) to understand exactly what user information (FID, username, PFP, verification status, etc.) is passed in the signed packet (`trustedData`) when a user interacts with your frame.
    - Confirm how the `@farcaster/frame-wagmi-connector` makes this context available within your Next.js app (e.g., through hooks or props).
2.  **Verify Signed Packet:**
    - Implement server-side validation (likely in an API route or middleware) to verify the `trustedData` payload from Farcaster. This is crucial for security to ensure the user data is authentic. The Neynar SDK or Farcaster Hubs can often help with this.
3.  **Fetch User Farcaster Profile:**
    - Once a user connects their wallet _and_ you have their verified FID from the frame context, use the FID to fetch their Farcaster username and PFP URL. You can use:
      - The Neynar API (like your leaderboard does, but triggered client-side or via a dedicated API route based on the verified FID).
      - Data potentially already available directly from the verified frame context/signed packet.
4.  **Display User Profile in UI:**
    - Modify `src/components/navbar.tsx` (or another suitable global component).
    - When running inside a Farcaster frame and the user is connected, display their fetched PFP and Farcaster username instead of just the wallet address or generic "Sign In" button. This addresses the personalization feedback (1:26).

**Phase 2: Dynamic Frame Content**

5.  **Create a Dynamic Frame API Route:**
    - Design and implement a new Next.js API route (e.g., `src/app/api/frame/market/[marketId]/route.ts`).
    - This route will take a `marketId` as input.
    - It should fetch the details for that specific market (question, options, current shares/odds) from your contract using `thirdweb`'s server-side utilities.
    - It needs to generate the appropriate Farcaster Frame HTML `<meta>` tags dynamically based on the fetched market data (e.g., `fc:frame:image` showing the market question/odds, `fc:frame:button:1` text set to "Bet [Option A]", etc.).
6.  **Update Frame URLs:**
    - Modify how you generate URLs that will be casted or shared. Instead of pointing to the generic app URL (`https://buster-mkt.vercel.app`), links shared for specific markets should point to your new dynamic frame API route (e.g., `https://buster-mkt.vercel.app/api/frame/market/123`).
7.  **Handle Frame Actions:**
    - Configure the `fc:frame:post_url` in your dynamic frame's meta tags to point to another API route (or potentially the same one with logic to handle POST requests).
    - This action handler route will receive the signed packet containing which button the user pressed (e.g., Button 1 for Option A) and the user's FID.
    - After verifying the packet, this route should ideally redirect the user back into your main Mini App (`https://buster-mkt.vercel.app`) but potentially pre-fill the state for the selected market and option, readying the `MarketBuyInterface` for the user to simply confirm the amount and transaction.

**Phase 3: Polish & Testing**

8.  **Visual Consistency:**
    - Review and align the images/icons used for the frame (`fc:frame:image`, etc.) with the visual elements within the app itself (e.g., `public/banner2.avif`) for a cohesive look.
9.  **End-to-End Testing in Warpcast:**
    - Thoroughly test the entire flow within the Warpcast mobile app:
      - Sharing a dynamic frame URL.
      - Interacting with the frame buttons.
      - Being redirected into the Mini App.
      - Having the wallet auto-connect.
      - Seeing the correct market/option pre-filled (if implemented).
      - Completing a bet transaction using the integrated wallet.

This is a starting point. Once you share the Farcaster Mini Apps docs, we can refine these steps with the specific APIs and best practices recommended there. Let me know when you have the docs!
