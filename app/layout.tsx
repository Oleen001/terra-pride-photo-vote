import type { Metadata } from "next";
import Script from "next/script";
import {
  Fraunces,
  IBM_Plex_Sans_Thai,
  Geist_Mono,
  Monoton,
  Sriracha,
  Caveat,
  Pacifico,
  Lobster,
  Permanent_Marker,
  Shadows_Into_Light,
  Indie_Flower,
  Satisfy,
  Dancing_Script,
  Gloria_Hallelujah,
  Architects_Daughter,
  Patrick_Hand,
  Kalam,
  Amatic_SC,
  Rock_Salt,
} from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

const sans = IBM_Plex_Sans_Thai({
  variable: "--font-geist-sans",
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600", "700"],
});

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const monoton = Monoton({
  variable: "--font-monoton",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const sriracha = Sriracha({
  variable: "--font-sriracha",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

// ── Typewriter font pool (gallery graph view). Each phrase picks one at random.
// All loaded here so next/font self-hosts them under their literal family names
// (e.g. "Permanent Marker"), which the canvas references directly via ctx.font.
// next/font requires the call argument to be an inline object literal, so each
// is spelled out rather than sharing a config object.
const caveat = Caveat({ variable: "--font-tw-caveat", subsets: ["latin"], weight: "400", display: "swap" });
const pacifico = Pacifico({ variable: "--font-tw-pacifico", subsets: ["latin"], weight: "400", display: "swap" });
const lobster = Lobster({ variable: "--font-tw-lobster", subsets: ["latin"], weight: "400", display: "swap" });
const permanentMarker = Permanent_Marker({ variable: "--font-tw-permanent-marker", subsets: ["latin"], weight: "400", display: "swap" });
const shadowsIntoLight = Shadows_Into_Light({ variable: "--font-tw-shadows", subsets: ["latin"], weight: "400", display: "swap" });
const indieFlower = Indie_Flower({ variable: "--font-tw-indie", subsets: ["latin"], weight: "400", display: "swap" });
const satisfy = Satisfy({ variable: "--font-tw-satisfy", subsets: ["latin"], weight: "400", display: "swap" });
const dancingScript = Dancing_Script({ variable: "--font-tw-dancing", subsets: ["latin"], weight: "400", display: "swap" });
const gloriaHallelujah = Gloria_Hallelujah({ variable: "--font-tw-gloria", subsets: ["latin"], weight: "400", display: "swap" });
const architectsDaughter = Architects_Daughter({ variable: "--font-tw-architects", subsets: ["latin"], weight: "400", display: "swap" });
const patrickHand = Patrick_Hand({ variable: "--font-tw-patrick", subsets: ["latin"], weight: "400", display: "swap" });
const kalam = Kalam({ variable: "--font-tw-kalam", subsets: ["latin"], weight: "400", display: "swap" });
const amaticSC = Amatic_SC({ variable: "--font-tw-amatic", subsets: ["latin"], weight: "400", display: "swap" });
const rockSalt = Rock_Salt({ variable: "--font-tw-rock-salt", subsets: ["latin"], weight: "400", display: "swap" });

const typewriterFontVars = [
  monoton.variable,
  sriracha.variable,
  caveat.variable,
  pacifico.variable,
  lobster.variable,
  permanentMarker.variable,
  shadowsIntoLight.variable,
  indieFlower.variable,
  satisfy.variable,
  dancingScript.variable,
  gloriaHallelujah.variable,
  architectsDaughter.variable,
  patrickHand.variable,
  kalam.variable,
  amaticSC.variable,
  rockSalt.variable,
].join(" ");

export const metadata: Metadata = {
  title: "Terra Pride — Photo Vote",
  description: "A private photo gallery and voting space for Terra Pride.",
  icons: {
    icon: "/terra-logo-mark.png",
    apple: "/terra-logo-mark.png",
  },
};

const themeInitScript = `
try {
  var theme = localStorage.getItem("theme");
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  } else {
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
  }
} catch {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      suppressHydrationWarning
      className={`${sans.variable} ${display.variable} ${geistMono.variable} ${typewriterFontVars} h-full antialiased`}
    >
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
