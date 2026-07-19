import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "train-next-word-prediction",
  description: "Control dashboard for the Wikipedia transformer training pipeline",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
