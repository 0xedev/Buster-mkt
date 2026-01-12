import { Metadata, ResolvingMetadata } from "next";
import { UserStats } from "@/components/UserStats";
import { MiniAppClient } from "@/components/MiniAppClient";

interface Props {
  params: Promise<{ address: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata(
  { params, searchParams }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { address } = await params;
  const searchParamsResolved = await searchParams;

  const username = searchParamsResolved.username as string;
  const pfpUrl = searchParamsResolved.pfpUrl as string;
  const fid = searchParamsResolved.fid as string;

  if (!address) {
    console.error("generateMetadata: Invalid address", address);
    return {
      title: "User Stats Not Found",
      description: "Unable to load user stats",
    };
  }

  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://buster-mkt.vercel.app";

    // Build image with user data
    const imageParams = new URLSearchParams({
      address,
      ...(username && { username }),
      ...(pfpUrl && { pfpUrl }),
      ...(fid && { fid }),
    });

    const imageUrl = `${baseUrl}/api/user-stats-image?${imageParams.toString()}`;
    // const profileUrl = `${baseUrl}/profile/${address}?${imageParams.toString()}`;

    const displayName = username ? `@${username}` : "Anonymous Trader";
    const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
    const checkYoursUrl = `${baseUrl}/?tab=myvotes`;
    const miniAppEmbed = {
      version: "1" as const,
      imageUrl: imageUrl,
      button: {
        title: "Check Yours",
        action: {
          type: "launch_miniapp" as const,
          name: "Policast Stats",
          url: checkYoursUrl,
          iconUrl: pfpUrl || "https://buster-mkt.vercel.app/icon.png",
          splashImageUrl: pfpUrl || "https://buster-mkt.vercel.app/icon.jpg",
          splashBackgroundColor: "#131E2A",
        },
      },
    };

    const resolvedParent = await parent;
    const otherParentData = resolvedParent.other || {};

    const fcFrameKey = "fc:miniapp" as string;

    return {
      title: `${displayName}'s Stats - Policast`,
      description: `Check out ${displayName}'s prediction market performance on Policast - ${shortAddress}`,
      other: {
        ...otherParentData,
        [fcFrameKey]: JSON.stringify(miniAppEmbed),
      },
      metadataBase: new URL(baseUrl),
      openGraph: {
        title: `${displayName}'s Stats - Policast`,
        description: `Check out ${displayName}'s prediction market performance on Policast`,
        images: [
          {
            url: imageUrl,
            width: 900,
            height: 600,
            alt: `${displayName}'s Stats`,
          },
        ],
        url: checkYoursUrl,
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: `${displayName}'s Stats - Policast`,
        description: `Check out ${displayName}'s prediction market performance on Policast`,
        images: [imageUrl],
      },
    };
  } catch (error) {
    console.error(
      "generateMetadata: Error processing user stats metadata:",
      error
    );
    return {
      title: "User Stats Not Found",
      description: "Unable to load user stats",
    };
  }
}

export default async function UserProfilePage({ params, searchParams }: Props) {
  const { address } = await params;
  const searchParamsResolved = await searchParams;

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Invalid Address</h1>
        <p>The provided address is not valid.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <MiniAppClient />

      {/* Pass user data as props if available */}
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            User Performance Stats
          </h1>
          <p className="text-gray-600">
            Prediction market performance for {address.slice(0, 6)}...
            {address.slice(-4)}
          </p>
        </div>

        <UserStats />
      </div>
    </div>
  );
}
