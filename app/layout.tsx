import type { Metadata } from "next";
import "./globals.css";
import ErrorBoundary from "@/components/ErrorBoundary";
import MobileOptimizer from "@/components/MobileOptimizer";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import OrchestratorInit from "@/components/OrchestratorInit";

export const metadata: Metadata = {
  title: "AI Math Tutor - Socratic Learning Assistant",
  description: "An AI-powered math tutor that guides students through problem-solving using the Socratic method",
  keywords: ["math tutor", "AI tutor", "Socratic method", "math learning", "problem solving"],
  authors: [{ name: "Davaakhatan Zorigtbaatar" }],
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
  },
  manifest: "/manifest.json",
  themeColor: "#6366f1",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AI Math Tutor",
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
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body>
        <ServiceWorkerRegistration />
        <MobileOptimizer />
        <OrchestratorInit />
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}

