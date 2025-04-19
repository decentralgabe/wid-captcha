"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { WidCaptcha } from "./wid-captcha"
import { useWidCaptcha } from "./wid-captcha-context"
import type { VerificationResult } from "./types"
import Image from "next/image";
import Link from "next/link";
import "@/app/globals.css";

export default function ExamplePage() {
  const router = useRouter()
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null)
  const [captchaKey, setCaptchaKey] = useState(Date.now());
  const [showSuccess, setShowSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStartTime, setVerificationStartTime] = useState<number | null>(null);

  // Get isVerified state from context for redundancy
  const { isVerified } = useWidCaptcha();

  // Minimum time (in ms) that the verification pending state should be shown
  const MIN_VERIFICATION_DISPLAY_TIME = 2500;

  // Synchronize with the context's isVerified state
  useEffect(() => {
    if (isVerified) {
      setShowSuccess(true);
      // Save verification status to localStorage
      localStorage.setItem('verificationStatus', 'success');
    }
  }, [isVerified]);

  // Function to detect if the current page load is a refresh
  const detectPageRefresh = () => {
    // Modern method using Navigation Timing Level 2 API
    if (window.performance && window.performance.getEntriesByType) {
      const navigationEntries = window.performance.getEntriesByType('navigation');
      if (navigationEntries.length > 0) {
        // Use type assertion with any to avoid type errors
        const navEntry = navigationEntries[0] as any;
        return navEntry.type === 'reload';
      }
    }

    // Fallback for older browsers
    if (window.performance && window.performance.navigation) {
      return window.performance.navigation.type === window.performance.navigation.TYPE_RELOAD;
    }

    // Default fallback - can't detect, assume not a refresh
    return false;
  };

  // Check localStorage for verification status on initial load
  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      // Check if this is a page refresh using modern Navigation Timing API with fallback
      const isPageRefresh = detectPageRefresh();

      if (isPageRefresh) {
        // Clear verification status on page refresh
        localStorage.removeItem('verificationStatus');
        setShowSuccess(false);
      } else {
        // Only restore from localStorage if not a refresh
        const savedVerificationStatus = localStorage.getItem('verificationStatus');
        if (savedVerificationStatus === 'success') {
          setShowSuccess(true);
        }
      }
    }
  }, []);

  const handleVerificationComplete = (result: VerificationResult) => {
    // Calculate how long verification has been in progress
    if (verificationStartTime) {
      const elapsedTime = Date.now() - verificationStartTime;
      const remainingTime = Math.max(0, MIN_VERIFICATION_DISPLAY_TIME - elapsedTime);

      // If we haven't shown the pending state for the minimum time, delay the completion
      setTimeout(() => {
        finishVerification(result);
      }, remainingTime);
    } else {
      finishVerification(result);
    }
  };

  const finishVerification = (result: VerificationResult) => {
    setIsVerifying(false);
    setVerificationStartTime(null);
    setVerificationResult(result);

    if (result.success) {
      setShowSuccess(true);
      // Save verification status to localStorage
      localStorage.setItem('verificationStatus', 'success');
    } else {
      setShowSuccess(false);
    }
  };

  const handleVerificationStart = () => {
    setIsVerifying(true);
    setVerificationStartTime(Date.now());
  };

  const handleRetry = () => {
    setVerificationResult(null);
    setShowSuccess(false);
    setIsVerifying(false);
    setVerificationStartTime(null);
    // Remove verification status from localStorage
    localStorage.removeItem('verificationStatus');
    setCaptchaKey(Date.now()); // This forces the captcha component to fully re-render
  };

  const appId = process.env.NEXT_PUBLIC_WLD_APP_ID;
  const actionId = process.env.NEXT_PUBLIC_WLD_ACTION_ID;
  const captchaProvider = (process.env.NEXT_PUBLIC_CAPTCHA_PROVIDER || 'recaptcha') as 'recaptcha' | 'hcaptcha';
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const hcaptchaSiteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;

  // Get the appropriate site key based on the selected provider
  const captchaSiteKey = captchaProvider === 'recaptcha' ? recaptchaSiteKey : hcaptchaSiteKey;

  // Check if the essential variables are set and not empty
  if (!appId || !actionId || !captchaSiteKey || appId === "" || actionId === "" || captchaSiteKey === "") {
    const missingVars = [];
    if (!appId || appId === "") missingVars.push("NEXT_PUBLIC_WLD_APP_ID");
    if (!actionId || actionId === "") missingVars.push("NEXT_PUBLIC_WLD_ACTION_ID");
    if (captchaProvider === 'recaptcha' && (!recaptchaSiteKey || recaptchaSiteKey === "")) {
      missingVars.push("NEXT_PUBLIC_RECAPTCHA_SITE_KEY");
    }
    if (captchaProvider === 'hcaptcha' && (!hcaptchaSiteKey || hcaptchaSiteKey === "")) {
      missingVars.push("NEXT_PUBLIC_HCAPTCHA_SITE_KEY");
    }

    console.error(`Required environment variables (${missingVars.join(", ")}) are not properly set.`);
    return <div className="p-4 text-red-600">
      <p>Application is not configured correctly. Missing required IDs:</p>
      <ul className="list-disc pl-5 mt-2">
        {missingVars.map(v => <li key={v}>{v}</li>)}
      </ul>
      <p className="mt-3">Current CAPTCHA provider: <strong>{captchaProvider}</strong></p>
    </div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">

      {/* Always show the captcha component */}
      <WidCaptcha
        key={captchaKey}
        appId={appId as `app_${string}`}
        actionId={actionId}
        recaptchaSiteKey={captchaProvider === 'recaptcha' ? recaptchaSiteKey : undefined}
        hcaptchaSiteKey={captchaProvider === 'hcaptcha' ? hcaptchaSiteKey : undefined}
        onVerificationComplete={handleVerificationComplete}
        onVerificationStart={handleVerificationStart}
        hideSuccessMessage={true}
      />

      {verificationResult?.success === false && (
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
