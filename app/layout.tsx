import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: {
    default: "Zidwell | Smarter Finance & Contracts Platform",
    template: "%s | Zidwell",
  },
  description:
    "Zidwell is an intelligent finance and business management platform that lets you handle contracts, invoices, receipts, bill payments, and wallet transactions securely — all in one place.",
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
  ],
  authors: [{ name: "Zidwell Team" }],
  creator: "Zidwell Technologies",
  publisher: "Zidwell",
  applicationName: "Zidwell",
  openGraph: {
    title: "Zidwell | Smarter Finance & Contracts Platform",
    description:
      "Manage your finances, contracts, and payments easily with Zidwell — your all-in-one personal and business finance companion.",
    url: "https://zidwell.com",
    siteName: "Zidwell",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zidwell | Smarter Finance & Contracts Platform",
    description:
      "Simplify contracts, receipts, invoices, and financial management with Zidwell — built for professionals and businesses.",
    creator: "@zidwellapp",
  },
  category: "Finance & Business Management",
  // themeColor: "#0F172A",
  // manifest: "/manifest.json",
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
