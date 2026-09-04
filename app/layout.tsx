import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/app-shell";
import { LearningProvider } from "@/lib/learning-context";
import { AuthProvider } from "@/lib/auth-context";
import { ReduxProvider } from "@/lib/store/provider";
import { ContentProvider } from "@/lib/content/provider";
import { ServiceWorker } from "@/components/service-worker";
import "./globals.css";

const _inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const _notoJp = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-jp",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Manabi - Learn Japanese",
  description:
    "A modern Japanese learning app with verbs, grammar, vocabulary, kanji, reading practice and quizzes.",
  applicationName: "Manabi",
  manifest: "/manifest.json",
  icons: {
    // Vector first: the mark is drawn, so it stays crisp at every size and
    // needs no raster ladder. The PNG stays as the fallback for Safari's
    // touch icon.
    icon: [
      { url: "/mark.svg", type: "image/svg+xml" },
      { url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // `maximumScale: 1` blocked pinch-zoom, which WCAG 1.4.4 requires and which
  // matters more than usual here — learners zoom in to read kanji strokes.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcf8f6" },
    { media: "(prefers-color-scheme: dark)", color: "#130e13" },
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
        className={`${_inter.variable} ${_notoJp.variable} font-sans antialiased`}
      >
        <ReduxProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
              <ContentProvider>
              <LearningProvider>
                <AppShell>{children}</AppShell>
              </LearningProvider>
              </ContentProvider>
            </AuthProvider>
          </ThemeProvider>
        </ReduxProvider>
        <ServiceWorker />
        <Analytics />
      </body>
    </html>
  );
}
