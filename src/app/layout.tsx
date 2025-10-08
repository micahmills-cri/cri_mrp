import "./globals.css";
import React from "react";
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Boat Factory Operations",
  description: "Operations MVP for high-mix, low-volume boat factory",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased transition-colors duration-300 bg-[var(--background)] text-[var(--foreground)]">
        <ThemeProvider>
          <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300">
            <ThemeToggle />
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
