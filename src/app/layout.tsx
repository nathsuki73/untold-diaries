import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Lakki_Reddy,
  Inter,
  Suwannaphum,
  Lugrasimo,
} from "next/font/google";
import "./globals.css";
import "@/components/background/background.scss"
import "@/components/carousel/carousel.css"

import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import DeviceWarning from "@/components/DeviceWarning";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const Lakki = Lakki_Reddy({
  variable: "--font-lakki",
  weight: ["400"],
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const suwannaphum = Suwannaphum({
  variable: "--font-suwannaphum",
  weight: ["300"],
  subsets: ["latin"],
});

const lugrasimo = Lugrasimo({
  variable: "--font-lugrasimo",
  weight: ["400"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Untold Diaries",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${Lakki.variable} ${inter.variable} ${suwannaphum.variable} ${lugrasimo.variable} antialiased h-screen flex flex-col`}
      >
        <DeviceWarning>
          <NavBar />
          {children}
          <Footer />
        </DeviceWarning>
      </body>
    </html>
  );
}
