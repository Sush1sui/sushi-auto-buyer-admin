import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sushi Auto-Buyer Admin",
  description:
    "Operator control panel for Sushi extension monetization & access gating",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
