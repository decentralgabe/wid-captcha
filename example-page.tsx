"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { WidCaptcha } from "./wid-captcha"
import type { VerificationResult } from "./types"

export default function ExamplePage() {
  const router = useRouter()
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null)
  const [showRetry, setShowRetry] = useState(false);
  const [captchaKey, setCaptchaKey] = useState(Date.now());

  useEffect(() => {
    if (verificationResult?.success) {
      router.push("/congratulations")
    } else if (verificationResult?.success === false) {
      setShowRetry(true);
    }
  }, [verificationResult, router])

  const handleVerificationComplete = (result: VerificationResult) => {
    console.log("Verification result:", result)
    setVerificationResult(result)
    setShowRetry(!result.success);
  }

  const handleRetry = () => {
    setVerificationResult(null);
    setShowRetry(false);
    setCaptchaKey(Date.now());
  }

  const appId = process.env.NEXT_PUBLIC_WLD_APP_ID;
  const actionId = process.env.NEXT_PUBLIC_WLD_ACTION_ID;
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  if (!appId || !actionId || !recaptchaSiteKey) {
    console.error("Required environment variables (NEXT_PUBLIC_WLD_APP_ID, NEXT_PUBLIC_WLD_ACTION_ID, NEXT_PUBLIC_RECAPTCHA_SITE_KEY) are not properly set.");
    return <div className="p-4 text-red-600">Application is not configured correctly. Missing required IDs.</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-semibold mb-6">Please Verify You Are Human</h1>

      {!verificationResult && !showRetry && (
        <WidCaptcha
          key={captchaKey}
          appId={appId}
          actionId={actionId}
          recaptchaSiteKey={recaptchaSiteKey}
          onVerificationComplete={handleVerificationComplete}
        />
      )}

      {showRetry && (
        <div className="mt-4 p-4 border border-red-300 bg-red-50 rounded-md text-center">
          <p className="text-red-700 mb-3">Verification Failed. Please try again.</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}
