import type { Metadata, Viewport } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";
import "@/components/carousel/carousel.css";

import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { getMetadataBase } from "@/lib/siteUrl";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
});

const siteDescription =
  "Share an anonymous note paired with a song, or read the stories other people have left behind.";

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: "Untold Diaries",
    template: "%s · Untold Diaries",
  },
  description: siteDescription,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Untold Diaries",
    title: "Untold Diaries",
    description: siteDescription,
  },
  twitter: {
    card: "summary",
    title: "Untold Diaries",
    description: siteDescription,
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <meta id="theme-color" name="theme-color" content="#f7f7f5" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t='light';}document.documentElement.dataset.theme=t;var m=document.getElementById('theme-color');if(m){m.setAttribute('content',t==='dark'?'#0b0d14':'#f7f7f5');}}catch(e){document.documentElement.dataset.theme='light';}})();`,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${newsreader.variable} flex min-h-dvh flex-col overflow-x-clip bg-bg font-sans text-ink antialiased`}
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:border focus:border-line focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-ink"
        >
          Skip to content
        </a>
        <NavBar />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
