import { Metadata } from "next";

interface StructuredDataProps {
  metadata: Metadata;
}

export function StructuredData({ metadata }: StructuredDataProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Policast",
    description:
      "Decentralized political prediction markets powered by blockchain technology",
    url: process.env.NEXT_PUBLIC_URL || "https://policast.xyz",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web Browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    creator: {
      "@type": "Organization",
      name: "Policast Team",
    },
    featureList: [
      "Decentralized prediction markets",
      "Political outcome trading",
      "Blockchain-based security",
      "Real-time analytics",
      "Community-driven platform",
    ],
    screenshot: `${
      process.env.NEXT_PUBLIC_URL || "https://policast.xyz"
    }/icon.jpg`,
    sameAs: [
      // Add your social media URLs here when available
      // "https://twitter.com/policastapp",
      // "https://github.com/yourusername/policast"
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData),
      }}
    />
  );
}
