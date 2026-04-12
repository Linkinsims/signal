// Root Layout
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SIGNAL — Market Intelligence & Trading Signals",
  description:
    "Professional market signal and trend prediction platform covering Crypto, Stocks, and Forex. Real-time signals, technical analysis, and AI-powered forecasts.",
  keywords: ["trading signals", "crypto signals", "stock market", "forex", "technical analysis", "market intelligence"],
};

import { ClerkProvider } from '@clerk/nextjs'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
        <body className={`${inter.className} antialiased`}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
