import type { Metadata } from "next";
import localFont from "next/font/local";
import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
});

const body = localFont({
  variable: "--font-body",
  display: "swap",
  src: [
    {
      path: "../assets/fonts/Sarabun-Regular.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../assets/fonts/Sarabun-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../assets/fonts/Sarabun-SemiBold.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../assets/fonts/Sarabun-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../assets/fonts/Sarabun-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
});

export const metadata: Metadata = {
  title: "Promo Catalog Studio",
  description:
    "Internal catalog generator for importing Excel product sheets, matching assets, reviewing layouts, and producing printable PDF catalogs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className={`${display.variable} ${body.variable} app-body`}>
        <div className="app-chrome">{children}</div>
      </body>
    </html>
  );
}
