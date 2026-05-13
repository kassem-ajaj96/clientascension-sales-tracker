import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Client Ascension Sales Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0d0d0d] text-white min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
