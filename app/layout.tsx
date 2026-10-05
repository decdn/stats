import type { Metadata } from "next"
import { Geist_Mono, Inter } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

const description =
  "raw on-chain state read from arbitrum sepolia — value settled, bytes served, active nodes."

// The share card mirrors decdn.org's: the same site name, locale and X
// account. Its image is app/opengraph-image.tsx; X falls back to og:image, so
// there's no twitter-image.
export const metadata: Metadata = {
  metadataBase: new URL("https://stats.decdn.org"),
  title: "network status",
  description,
  alternates: { canonical: "/" },
  openGraph: {
    title: "decdn network status",
    description,
    url: "/",
    siteName: "deCDN",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@decdn_",
    creator: "@decdn_",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased motion-safe:scroll-smooth",
        fontMono.variable,
        "font-sans",
        inter.variable
      )}
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
