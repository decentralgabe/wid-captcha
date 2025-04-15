import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import "./marquee.css"
import { ThemeProvider } from "@/components/theme-provider"
import { CaptchaProviderWrapper } from "@/components/captcha-provider-wrapper"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "World ID CAPTCHA",
  description: "A CAPTCHA alternative using World ID with reCAPTCHA fallback",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Get the client-side Site Key from environment variables
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  // Basic error handling if the key is missing
  if (!recaptchaSiteKey) {
    console.error("Client-side NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not set.");
    // Render a fallback or throw an error during build if preferred
    return (
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          <div>
            Error: Application is misconfigured. Missing reCAPTCHA site key.
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <CaptchaProviderWrapper recaptchaSiteKey={recaptchaSiteKey}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
          </ThemeProvider>
        </CaptchaProviderWrapper>
      </body>
    </html>
  )
}