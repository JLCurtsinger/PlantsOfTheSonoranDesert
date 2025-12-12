import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import Navbar from "./(components)/Navbar";
import SiteFooter from "./(components)/SiteFooter";

const ibmPlexSans = IBM_Plex_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-sans",
});

export const metadata: Metadata = {
  title: "Plants of the Sonoran Desert",
  description: "A field guide to the plants of the Sonoran Desert",
  icons: {
    icon: "/images/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${ibmPlexSans.variable} antialiased bg-page text-text-primary`}>
        <Navbar />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
