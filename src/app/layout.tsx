import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/layout/navbar";
import { ThemeProvider } from "@/components/theme-provider";
import { McpWidget } from "@/components/mcp-widget";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "better-stats",
  description: "A better way to explore package download statistics for PyPI and npm",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <ThemeProvider>
          <Navbar />
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
          <McpWidget />
        </ThemeProvider>
      </body>
    </html>
  );
}
