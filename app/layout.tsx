import type { Metadata } from "next";
import "./globals.css";
import { getOrCreateSessionToken } from "@/lib/session";

export const metadata: Metadata = {
  title: "AI Video Ad Generator – MVP",
  description: "Generate beautiful ad videos in minutes",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Ensure every visitor has a session token
  await getOrCreateSessionToken();

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
