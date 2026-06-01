import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ShaderBackground } from "@/components/visuals/ShaderBackground";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { DictionaryProvider } from "@/lib/i18n/DictionaryProvider";
import { getCurrentDictionary } from "@/lib/i18n/getDictionary";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Helix",
    template: "%s · Helix",
  },
  description: "Live forward test of a quantitative trading strategy.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://helix.local"),
  openGraph: {
    title: "Helix",
    description: "Live forward test of a quantitative trading strategy.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Helix",
    description: "Live forward test of a quantitative trading strategy.",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
};

// Root layout = global shell only: <html>/<body>, fonts, shader background, and
// the providers every surface needs. Chrome (nav/footer) lives in the route-group
// layouts: (marketing) for the public site, (panel) for the app, (auth) for login.
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale, dict } = await getCurrentDictionary();

  return (
    <html
      lang={locale}
      className={`dark ${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body
        className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] antialiased"
        suppressHydrationWarning
      >
        <ShaderBackground />
        <DictionaryProvider dict={dict} locale={locale}>
          <ToastProvider>{children}</ToastProvider>
        </DictionaryProvider>
      </body>
    </html>
  );
}
