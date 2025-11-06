import type { Metadata } from "next";
import "./globals.css";
import ErrorBoundary from "@/components/ErrorBoundary";
import MobileOptimizer from "@/components/MobileOptimizer";

export const metadata: Metadata = {
  title: "AI Math Tutor - Socratic Learning Assistant",
  description: "An AI-powered math tutor that guides students through problem-solving using the Socratic method",
  keywords: ["math tutor", "AI tutor", "Socratic method", "math learning", "problem solving"],
  authors: [{ name: "Davaakhatan Zorigtbaatar" }],
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover", // Support for notched devices
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <MobileOptimizer />
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}

