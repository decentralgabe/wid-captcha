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
  description: "A CAPTCHA alternative using World ID with hCAPTCHA or reCAPTCHA as a fallback",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Get the client-side Site Key from environment variables
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const hcaptchaSiteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;
  const captchaProvider = (process.env.NEXT_PUBLIC_CAPTCHA_PROVIDER || 'recaptcha') as 'recaptcha' | 'hcaptcha';
  const worldIdAppId = process.env.NEXT_PUBLIC_WLD_APP_ID;
  const worldIdActionId = process.env.NEXT_PUBLIC_WLD_ACTION_ID;

  // Determine which captcha key to check based on provider
  const hasCaptchaKey = captchaProvider === 'recaptcha' ? !!recaptchaSiteKey : !!hcaptchaSiteKey;

  // Basic error handling if required keys are missing
  if (!hasCaptchaKey || !worldIdAppId || !worldIdActionId) {
    const missingVars = [];
    if (!worldIdAppId) missingVars.push("NEXT_PUBLIC_WLD_APP_ID");
    if (!worldIdActionId) missingVars.push("NEXT_PUBLIC_WLD_ACTION_ID");
    if (captchaProvider === 'recaptcha' && !recaptchaSiteKey) missingVars.push("NEXT_PUBLIC_RECAPTCHA_SITE_KEY");
    if (captchaProvider === 'hcaptcha' && !hcaptchaSiteKey) missingVars.push("NEXT_PUBLIC_HCAPTCHA_SITE_KEY");

    console.error(`Layout: Client-side environment variables missing: ${missingVars.join(", ")}`);
    // Render a fallback or throw an error during build if preferred
    return (
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          <div>
            Error: Application is misconfigured. Missing required configuration:
            <ul className="list-disc pl-5 mt-2">
              {missingVars.map(v => <li key={v}>{v}</li>)}
            </ul>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <CaptchaProviderWrapper
          recaptchaSiteKey={recaptchaSiteKey}
          hcaptchaSiteKey={hcaptchaSiteKey}
          appId={worldIdAppId}
          actionId={worldIdActionId}
        >
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
          </ThemeProvider>
        </CaptchaProviderWrapper>
      </body>
    </html>
  )
}