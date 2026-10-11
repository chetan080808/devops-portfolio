import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { site } from "@/content/site";
import { BootGate } from "@/components/boot/BootGate";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.meta.siteUrl),
  title: site.meta.title,
  description: site.meta.description,
  authors: [{ name: site.profile.name }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: site.profile.name,
    locale: "en_US",
    title: site.meta.title,
    description: site.meta.description,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: site.meta.title,
    description: site.meta.description,
  },
};

export const viewport: Viewport = {
  themeColor: "#05070d",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-boot is set by BootGate before first paint
    <html lang="en" className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      {/* suppressHydrationWarning: extensions (e.g. Grammarly) add attributes to <body> before React loads */}
      <body className="min-h-dvh overflow-x-hidden [html[data-boot=run]_&]:overflow-hidden" suppressHydrationWarning>
        <BootGate />
        {children}
      </body>
    </html>
  );
}
