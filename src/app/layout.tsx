import type { Metadata } from "next";
import { Cormorant_Garamond, Geist, Geist_Mono, Instrument_Serif, Outfit } from "next/font/google";
import { LanguageProvider } from "@/components/bloom/i18n";
import { LicenseProvider } from "@/lib/license-context";
import { TierThemeProvider } from "@/components/theme/tier-theme-provider";
import { KeyUnlockOverlay } from "@/components/onboarding/key-unlock-overlay";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});
// Geometric sans with a true-circle "o", used only for the wordmark.
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"], weight: ["400", "500"] });
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Bloom AI — Category-Defining Autonomous Engines",
  description:
    "Category-defining autonomous engines for creators, founders, and high-end enterprises: the Aware Marketing Engine, Aware Infrastructure Architect, Autonomous Shadow Workforce, and IntentPulse Lead Engine. Built and launched as standalone apps by the Bloom AI lab.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Applies the saved language's lang/dir before first paint, so Hebrew never flashes left-to-right. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var l=localStorage.getItem("bloom-lang");if(l==="es"||l==="he"){document.documentElement.lang=l;document.documentElement.dir=l==="he"?"rtl":"ltr"}}catch(e){}`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} ${cormorant.variable} ${outfit.variable} min-h-dvh bg-background antialiased`}>
        {/* Site-wide, so the chosen language follows the visitor from the home page into every engine. */}
        <LanguageProvider>
          <LicenseProvider>
            {/* The access key decides the obsidian glass theme: accent, glass and density. */}
            <TierThemeProvider>
              {children}
              <KeyUnlockOverlay />
            </TierThemeProvider>
          </LicenseProvider>
        </LanguageProvider>
        <Toaster richColors />
      </body>
    </html>
  );
}
