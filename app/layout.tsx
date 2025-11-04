import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Math Tutor - Socratic Learning Assistant",
  description: "An AI-powered math tutor that guides students through problem-solving using the Socratic method",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

