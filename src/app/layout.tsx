import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Suspense } from "react";
import { Archivo, Archivo_Black, Chakra_Petch, Instrument_Serif, Inter, Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import "./skins.css";
import "./cyberpunk.css";
import "./signature-skins.css";
import "./polish.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { Providers } from "./providers";
import { AppShell } from "@/components/app-shell";
import { BrassAppShell } from "@/components/brass-app-shell";
import { InstallPrompt } from "@/components/InstallPrompt";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const archivoBlack = Archivo_Black({ weight: "400", subsets: ["latin"], variable: "--font-archivo-black", display: "swap" });
const archivo = Archivo({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-archivo", display: "swap" });
const instrument = Instrument_Serif({ weight: "400", style: ["normal", "italic"], subsets: ["latin"], variable: "--font-instrument", display: "swap" });
const spaceMono = Space_Mono({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-space-mono", display: "swap" });
const chakra = Chakra_Petch({ weight: ["600", "700"], subsets: ["latin"], variable: "--font-chakra", display: "swap" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", display: "swap" });

const FONT_VARS = `${inter.variable} ${archivoBlack.variable} ${archivo.variable} ${instrument.variable} ${spaceMono.variable} ${chakra.variable} ${grotesk.variable}`;
const IS_BRASS = process.env.NEXT_PUBLIC_BNDY_EDITION === "brass";

// Cloudflare Web Analytics beacon identifiers are public by design and are
// included in the page source for every visitor.
const CLOUDFLARE_WEB_ANALYTICS_TOKEN = "d10ac97e9abc49b793d53253aa13f245";

export const metadata: Metadata = IS_BRASS ? {
  title: "bndy Brass · brass bands and concerts near you",
  description: "Discover brass bands, concerts and festivals on the bndy Brass map.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://brass.bndy.live"),
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: [{ url: "/pwa-icon-192", sizes: "192x192", type: "image/png" }] },
  appleWebApp: { capable: true, title: "bndy Brass", statusBarStyle: "black-translucent" },
} : {
  title: "bndy · live music near you",
  description: "Find live music: gigs, artists and venues near you.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://gigmap.bndy.co.uk"),
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: [{ url: "/pwa-icon-192", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "bndy",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#05060b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/** Sets skin attributes before first paint. Family/mode map must stay in sync with src/lib/appSkins.ts. */
const NO_FLASH = `(function(){try{var M={"bndy-light":["soft","light"],"bndy-dark":["soft","dark"],hyper:["hyper","light"],cyberpunk:["soft","dark"],"roadcase-light":["roadcase","light"],roadcase:["roadcase","dark"],flyer:["flyer","light"],"flyer-dark":["flyer","dark"],"synthwave-light":["soft","light"],synthwave:["soft","dark"],underground:["mono","light"],poole:["soft","dark"]};var L={openair:"cyberpunk",goldenhour:"roadcase-light",print:"flyer",solar:"roadcase-light",blackout:"roadcase",lemonrock:"bndy-light",onthecase:"roadcase"};var s=localStorage.getItem("bndy-app-skin");if(s&&!M[s]&&L[s]){s=L[s];localStorage.setItem("bndy-app-skin",s);}if(!s){s=(window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches)?"bndy-light":"bndy-dark";}if(!M[s])s="bndy-dark";var d=document.documentElement;d.dataset.theme=s;d.dataset.family=M[s][0];d.classList.toggle("dark",M[s][1]==="dark");d.style.colorScheme=M[s][1];}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const Shell = IS_BRASS ? BrassAppShell : AppShell;
  return (
    <html lang="en" data-theme="bndy-dark" data-family="soft" className={`dark ${FONT_VARS}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: NO_FLASH }} /></head>
      <body className="font-sans antialiased">
        <Providers>
          <Suspense><Shell>{children}</Shell></Suspense>
          <InstallPrompt />
        </Providers>
        <Script id="cloudflare-web-analytics" type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon={JSON.stringify({ token: CLOUDFLARE_WEB_ANALYTICS_TOKEN })} strategy="afterInteractive" />
      </body>
    </html>
  );
}
