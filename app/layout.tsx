import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { UserProvider } from "./context/userData";
import SessionWatcher from "./components/SessionWatcher";
import FloatingHelpButton from "./components/FloatingHelpButton";
import NotificationToast from "./components/NotificationToast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// ✅ Move themeColor to a dedicated viewport export
export const viewport: Viewport = {
  themeColor: "#C29307",
};

export const metadata: Metadata = {
  title: {
    default: "Zidwell | Smarter Finance & Contracts Platform",
    template: "%s | Zidwell",
  },
  description:
    "Zidwell is a secure, intelligent finance and business management platform that helps you manage contracts, invoices, receipts, bill payments, tax filings, and wallet transactions — all in one place.",
  keywords: [
    "Zidwell",
    "finance app",
    "contract management",
    "invoice generator",
    "wallet app",
    "bill payment",
    "tax filing",
    "personal finance",
    "business automation",
    "Nigeria fintech",
    "online payment",
    "digital receipts",
    "smart contracts",
    "business growth",
  ],
  authors: [{ name: "Zidwell Team", url: "https://zidwell.com" }],
  creator: "Zidwell Technologies",
  publisher: "Zidwell",
  applicationName: "Zidwell",
  metadataBase: new URL("https://zidwell.com"),
  alternates: {
    canonical: "https://zidwell.com",
    languages: { "en-US": "https://zidwell.com" },
  },
  openGraph: {
    title: "Zidwell | Smarter Finance & Contracts Platform",
    description:
      "Manage your finances, contracts, and payments easily with Zidwell — your all-in-one business and personal finance companion.",
    url: "https://zidwell.com",
    siteName: "Zidwell",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Zidwell – Smart Finance & Contract Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Zidwell | Smarter Finance & Contracts Platform",
    description:
      "Simplify contracts, receipts, invoices, and financial management with Zidwell — built for professionals and businesses.",
    creator: "@zidwellapp",
    images: ["/images/twitter-card.jpg"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "Finance & Business Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <UserProvider>
          <SessionWatcher>
            {children}
            <FloatingHelpButton />
            <NotificationToast />
          </SessionWatcher>
        </UserProvider>
      </body>
    </html>
  );
}
