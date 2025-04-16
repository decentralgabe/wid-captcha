"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import ReactConfetti from 'react-confetti';
import { WidCaptcha } from "./wid-captcha"
import type { VerificationResult } from "./types"
import Image from "next/image";
import Link from "next/link";
import "./app/globals.css";
import "./app/marquee.css";

export default function ExamplePage() {
  const router = useRouter()
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null)
  const [showRetry, setShowRetry] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [captchaKey, setCaptchaKey] = useState(Date.now());
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (verificationResult?.success) {
      setShowCelebration(true);
      setShowRetry(false);
    } else if (verificationResult?.success === false) {
      setShowRetry(true);
      setShowCelebration(false);
    }
  }, [verificationResult])

  const handleVerificationComplete = (result: VerificationResult) => {
    console.log("Verification result:", result)
    setVerificationResult(result)
  }

  const handleRetry = () => {
    setVerificationResult(null);
    setShowRetry(false);
    setShowCelebration(false);
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
      {!showCelebration && <h1 className="text-2xl font-semibold mb-6">Please Verify You Are Human</h1>}

      {!verificationResult && !showRetry && !showCelebration && (
        <WidCaptcha
          key={captchaKey}
          appId={appId as `app_${string}`}
          actionId={actionId}
          recaptchaSiteKey={recaptchaSiteKey}
          onVerificationComplete={handleVerificationComplete}
        />
      )}

      {showRetry && !showCelebration && (
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

      {showCelebration && (
        <div className="flex flex-col items-center justify-center text-center">
          {windowSize.width > 0 && windowSize.height > 0 && (
            <ReactConfetti
              width={windowSize.width}
              height={windowSize.height}
              recycle={false}
              numberOfPieces={500}
              tweenDuration={10000}
            />
          )}
          <div className="marquee w-full overflow-hidden my-4">
            <span className="text-xl font-semibold">🎉 Verification Successful! Welcome! 🎉 Verification Successful! Welcome! 🎉</span>
          </div>
          <h2 className="text-3xl font-bold text-green-600 mt-8 mb-4">Verification Successful!</h2>
          <p className="text-lg">Thank you for verifying.</p>
          <button
            onClick={handleRetry}
            className="mt-6 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Verify Again
          </button>
        </div>
      )}
    </div>
  )
}
