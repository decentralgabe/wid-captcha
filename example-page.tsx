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
  const [captchaKey, setCaptchaKey] = useState(Date.now());
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [showSuccess, setShowSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStartTime, setVerificationStartTime] = useState<number | null>(null);

  // Minimum time (in ms) that the verification pending state should be shown
  const MIN_VERIFICATION_DISPLAY_TIME = 2500;

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

    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleVerificationComplete = (result: VerificationResult) => {
    // Calculate how long verification has been in progress
    if (verificationStartTime) {
      const elapsedTime = Date.now() - verificationStartTime;
      const remainingTime = Math.max(0, MIN_VERIFICATION_DISPLAY_TIME - elapsedTime);

      // If we haven't shown the pending state for the minimum time, delay the completion
      finishVerification(result);
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
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  if (!appId || !actionId || !recaptchaSiteKey) {
    console.error("Required environment variables (NEXT_PUBLIC_WLD_APP_ID, NEXT_PUBLIC_WLD_ACTION_ID, NEXT_PUBLIC_RECAPTCHA_SITE_KEY) are not properly set.");
    return <div className="p-4 text-red-600">Application is not configured correctly. Missing required IDs.</div>;
  }

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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className={`text-2xl font-semibold mb-6 ${showSuccess ? 'text-green-600' : ''}`}>
        {!showSuccess ? (isVerifying ? "Verifying..." : "Please Verify You Are Human") : "Verification Complete"}
      </h1>

      {showSuccess && windowSize.width > 0 && windowSize.height > 0 && (
        <ReactConfetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={500}
          tweenDuration={10000}
        />
      )}

      {showSuccess && (
        <div className="marquee w-full overflow-hidden mb-4 animate-now">
          <div className="marquee-content">
            <span className="text-xl font-semibold">🎉 Verification Successful!! 🎉</span>
          </div>
        </div>
      )}

      {/* Always show the captcha component */}
      <WidCaptcha
        key={captchaKey}
        appId={appId as `app_${string}`}
        actionId={actionId}
        recaptchaSiteKey={recaptchaSiteKey}
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
