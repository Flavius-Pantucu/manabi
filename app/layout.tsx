import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_JP, Shippori_Mincho } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/app-shell";
import { LearningProvider } from "@/lib/learning-context";
import { LanguageProvider } from "@/lib/language-context";
import { AuthProvider } from "@/lib/auth-context";
import { ReduxProvider } from "@/lib/store/provider";
import { ContentProvider } from "@/lib/content/provider";
import { SyncProvider } from "@/lib/sync/provider";
import { ServiceWorker } from "@/components/service-worker";
import "./globals.css";

const _inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const _notoJp = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-jp",
  weight: ["400", "500", "700"],
});
// The wordmark face. A mincho — the Japanese equivalent of a serif — whose
// Latin glyphs carry the same brush-cut terminals as its kana, so "Manabi"
// reads as Japanese typography rather than as Inter next to a sakura.
const _shippori = Shippori_Mincho({
  subsets: ["latin"],
  variable: "--font-shippori",
  weight: ["500", "600"],
});

const rawAppUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.VERCEL_PROJECT_PRODUCTION_URL ??
  process.env.VERCEL_URL ??
  "https://manabi.app";
const appUrl = rawAppUrl.startsWith("http")
  ? rawAppUrl
  : `https://${rawAppUrl}`;

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Manabi — Language Learning Platform",
    template: "%s | Manabi",
  },
  description:
    "Master languages with spaced repetition, interactive flashcards, grammar guides, reading practice, and quizzes.",
  applicationName: "Manabi",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/icon.png", type: "image/png", sizes: "192x192" }],
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    siteName: "Manabi",
    title: "Manabi — Language Learning Platform",
    description:
      "Master languages with spaced repetition, interactive flashcards, grammar guides, reading practice, and quizzes.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Manabi — Master languages with spaced repetition",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Manabi — Language Learning Platform",
    description:
      "Master languages with spaced repetition, interactive flashcards, grammar guides, reading practice, and quizzes.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // `maximumScale: 1` blocked pinch-zoom, which WCAG 1.4.4 requires and which
  // matters more than usual here — learners zoom in to read kanji strokes.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-background" suppressHydrationWarning>
      <body
        className={`${_inter.variable} ${_notoJp.variable} ${_shippori.variable} font-sans antialiased`}
      >
        <ReduxProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
              <LanguageProvider>
                {/* Inside AuthProvider and the store: it needs both to know
                    who is signed in and what there is to send. */}
                <SyncProvider>
                  <ContentProvider>
                    <LearningProvider>
                      <AppShell>{children}</AppShell>
                    </LearningProvider>
                  </ContentProvider>
                </SyncProvider>
              </LanguageProvider>
            </AuthProvider>
          </ThemeProvider>
        </ReduxProvider>
        <ServiceWorker />
        <Analytics />
      </body>
    </html>
  );
}
