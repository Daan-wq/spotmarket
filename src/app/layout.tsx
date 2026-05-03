import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { AuthErrorHandler } from "./auth-error-handler";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const lexend = Lexend({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const preferredRegion = "fra1";

export const metadata: Metadata = {
  title: "ClipProfit — Casino Influencer Campaign Marketplace",
  description:
    "Connect casino businesses with social media creators for view-based ad campaigns.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${lexend.variable} antialiased`}>
        <AuthErrorHandler />
        {children}
        <Toaster />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
