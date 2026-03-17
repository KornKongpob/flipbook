import type { Metadata } from "next";
import { Bricolage_Grotesque, Sarabun } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
});

const body = Sarabun({
  variable: "--font-body",
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700"],
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
