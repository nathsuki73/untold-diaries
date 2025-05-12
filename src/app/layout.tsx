import type { Metadata } from "next";
import { Geist, Geist_Mono, Lakki_Reddy } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";

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
        className={`${geistSans.variable} ${geistMono.variable} ${Lakki.variable} antialiased h-screen flex flex-col`}>
            <NavBar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
