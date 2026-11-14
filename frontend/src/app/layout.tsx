import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prelegal",
  description: "Draft common legal agreements from Common Paper standard templates.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
