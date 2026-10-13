import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SettingsProvider, themeBootScript } from "@/lib/settings";
import { ToastProvider } from "@/lib/toast";
import { QrwcProvider } from "@/lib/qrwc/QrwcProvider";
import { AppShell } from "@/components/shell/AppShell";
import "./globals.css";

// Q-SYS brand fonts, self-hosted by next/font.
const sohne = localFont({
  src: [
    { path: "./fonts/Sohne-Leicht.otf", weight: "400" },
    { path: "./fonts/Sohne-Kraftig.otf", weight: "500" },
  ],
  variable: "--sohne",
});
const sohneBreit = localFont({ src: "./fonts/SohneBreit-Kraftig.otf", variable: "--sohne-breit" });
const sohneMono = localFont({ src: "./fonts/SohneMono-Buch.otf", variable: "--sohne-mono" });

export const metadata: Metadata = {
  title: "QRWC Full Example",
  description: "Best-practice QRWC control app: audio, video, cameras, and things a UCI can't do.",
  icons: [{ rel: "icon", url: "/logo-icon.svg" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0b0c",
};

/**
 * Providers, outermost first:
 *   Settings (connection, theme) → Toasts → QRWC (ONE connection) → AppShell
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-GB"
      data-theme="horizon"
      suppressHydrationWarning
      className={`${sohne.variable} ${sohneBreit.variable} ${sohneMono.variable} antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <SettingsProvider>
          <ToastProvider>
            <QrwcProvider>
              <AppShell>{children}</AppShell>
            </QrwcProvider>
          </ToastProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
