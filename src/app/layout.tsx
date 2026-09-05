import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Matches the platform's design reference (seclore.com): Inter throughout.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ProposalBuilder",
  description: "Assemble technical proposals from per-component section templates.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
