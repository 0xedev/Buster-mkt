import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import WagmiProvider from "@/components/WagmiProvider";
import { ThemeProvider } from "@/components/theme-provider";
import { StructuredData } from "@/components/StructuredData";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
  preload: true,
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "Policast - Political Prediction Markets",
  description:
    "Trade on political outcomes with confidence. Decentralized prediction markets for politics, powered by blockchain technology.",
  keywords: [
    "prediction markets",
    "political betting",
    "decentralized",
    "blockchain",
    "crypto",
    "politics",
    "trading",
  ],
  authors: [{ name: "Oxdev" }],
  creator: "Policast",
  publisher: "Policast",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_URL || "https://policast.xyz"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Policast - Political Prediction Markets",
    description:
      "Trade on political outcomes with confidence. Decentralized prediction markets for politics, powered by blockchain technology.",
    url: process.env.NEXT_PUBLIC_URL || "https://policast.xyz",
    siteName: "Policast",
    images: [
      {
        url: "/icon.jpg",
        width: 1200,
        height: 630,
        alt: "Policast - Political Prediction Markets",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Policast - Political Prediction Markets",
    description:
      "Trade on political outcomes with confidence. Decentralized prediction markets for politics, powered by blockchain technology.",
    images: ["/icon.jpg"],
    creator: "@policastapp",
  },
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <StructuredData metadata={metadata} />
        {/* DNS prefetch for critical third-party domains */}
        <link rel="dns-prefetch" href="https://base.rpc.url" />
        <link rel="dns-prefetch" href="https://imagedelivery.net" />
        {/* Preconnect to RPC endpoints for faster blockchain calls */}
        <link
          rel="preconnect"
          href={
            process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL || "https://base.rpc.url"
          }
          crossOrigin="anonymous"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <WagmiProvider>
            {children}
            <Toaster />
          </WagmiProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
