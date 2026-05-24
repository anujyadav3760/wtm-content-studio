import type { Metadata } from "next";
import "./globals.css";
import { AppSessionProvider } from "@/components/session-provider";

export const metadata: Metadata = {
  title: "WTM Content Studio",
  description: "Creator console for WhatsTheMoat + sibling brands",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-slate-900 text-slate-100 antialiased">
        <AppSessionProvider>{children}</AppSessionProvider>
      </body>
    </html>
  );
}
