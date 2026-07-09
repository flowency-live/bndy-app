import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./skins.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { Providers } from "./providers";
import { AppShell } from "@/components/app-shell";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "bndy · live music near you",
  description: "Find live music — gigs, artists and venues near you.",
  metadataBase: new URL("https://bndy.co.uk"),
};

export const viewport: Viewport = {
  themeColor: "#05060b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/** Sets skin attributes before first paint — no flash of wrong theme.
 *  Family/mode map must stay in sync with src/lib/appSkins.ts. */
const NO_FLASH = `(function(){try{var M={print:["print","light"],"bndy-light":["soft","light"],"bndy-dark":["soft","dark"],openair:["soft","light"],goldenhour:["soft","light"],solar:["soft","light"],synthwave:["soft","dark"],blackout:["mono","dark"],hyper:["hyper","light"]};var s=localStorage.getItem("bndy-app-skin");if(!M[s])s="print";var d=document.documentElement;d.dataset.theme=s;d.dataset.family=M[s][0];d.classList.toggle("dark",M[s][1]==="dark");d.style.colorScheme=M[s][1];}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="print" data-family="print" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
      </head>
      <body className="font-sans antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
