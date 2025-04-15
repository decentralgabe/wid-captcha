"use client"

import React, { useEffect, useRef, useState } from "react"
import { useWidCaptcha } from "./wid-captcha-context"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { IDKitWidget, VerificationLevel, ISuccessResult } from "@worldcoin/idkit"

// Keep props needed for IDKitWidget and UI customization
interface WidCaptchaProps {
  appId: `app_${string}`
  actionId: string
  recaptchaSiteKey: string
  signal?: string
  signalDescription?: string
  verificationLevel?: VerificationLevel
  children?: React.ReactNode
}

export const WidCaptcha: React.FC<WidCaptchaProps> = ({
  appId,
  actionId,
  recaptchaSiteKey,
  signal = "",
  signalDescription = "Verify you're human",
  verificationLevel = VerificationLevel.Orb,
  children,
}) => {
  // Use the context hook to get state and actions
  const {
    isVerified,
    isVerifying,
    error,
    verifyProof,
    reset,
    isRecaptchaScriptLoaded,
  } = useWidCaptcha()

  const [recaptchaWidgetId, setRecaptchaWidgetId] = useState<number | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  // --- Callbacks for reCAPTCHA v2 Widget ---
  const handleRecaptchaSuccess = (token: string | null) => {
    console.log("reCAPTCHA v2 Success:", token);
    if (token) {
      verifyProof({ recaptcha_token: token });
    } else {
      console.warn("reCAPTCHA v2 success callback received null token.");
      reset();
    }
  };

  const handleRecaptchaExpired = () => {
    console.warn("reCAPTCHA v2 Token Expired.");
    reset();
  };

  const handleRecaptchaError = (error: any) => {
    console.error("reCAPTCHA v2 Error:", error);
    reset();
  };

  // --- World ID Callbacks (remain largely the same) ---
  const handleWorldIdSuccess = (proof: ISuccessResult) => {
    console.log("World ID Success:", proof);
    verifyProof({ idkit_response: proof });
  };

  const handleWorldIdError = (errorData: any) => {
    console.warn("World ID Error:", errorData);
  };

  // --- Render reCAPTCHA v2 Widget ---
  useEffect(() => {
    if (isRecaptchaScriptLoaded && window.grecaptcha && window.grecaptcha.render && recaptchaContainerRef.current) {
      if (recaptchaWidgetId === null && recaptchaContainerRef.current.innerHTML === '') {
        console.log("Rendering reCAPTCHA v2 widget...");
        try {
          const widgetId = window.grecaptcha.render(recaptchaContainerRef.current, {
            sitekey: recaptchaSiteKey,
            callback: handleRecaptchaSuccess,
            'expired-callback': handleRecaptchaExpired,
            'error-callback': handleRecaptchaError,
          });
          setRecaptchaWidgetId(widgetId);
        } catch (renderError) {
          console.error("Failed to render reCAPTCHA v2 widget:", renderError);
          handleRecaptchaError(renderError);
        }
      }
    }

    return () => {
    };

  }, [isRecaptchaScriptLoaded, recaptchaSiteKey, recaptchaWidgetId]);

  // --- Reset Logic ---
  const handleResetClick = () => {
    reset();
    if (window.grecaptcha && window.grecaptcha.reset && recaptchaWidgetId !== null) {
      console.log(`Resetting reCAPTCHA widget ID: ${recaptchaWidgetId}`);
      try {
        window.grecaptcha.reset(recaptchaWidgetId);
      } catch (resetError) {
        console.error("Error resetting reCAPTCHA widget:", resetError);
      }
    }
    setRecaptchaWidgetId(null);
    if (recaptchaContainerRef.current) {
      recaptchaContainerRef.current.innerHTML = '';
    }
  };

  // Render custom children if provided, passing relevant state/functions
  if (children) {
    return React.cloneElement(children as React.ReactElement, {
      isVerified,
      isVerifying,
      error,
      onVerifyWorldId: () => { /* Logic to trigger IDKitWidget if needed externally */ },
      reset: handleResetClick,
    } as any)
  }

  // Default UI using Shadcn components
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Human Verification</CardTitle>
        <CardDescription>{signalDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        {isVerified ? (
          <div className="flex flex-col items-center justify-center p-4 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 rounded-md space-y-2">
            <span>✓ Verification successful</span>
            <Button variant="outline" size="sm" onClick={handleResetClick}>Verify Again</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="p-3 text-sm bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md">
                Error: {error.message}
              </div>
            )}
            <div className="flex flex-col space-y-3 items-center">
              {/* World ID Button using IDKitWidget */}
              <IDKitWidget
                app_id={appId}
                action={actionId}
                signal={signal}
                onSuccess={handleWorldIdSuccess}
                onError={handleWorldIdError}
                verification_level={verificationLevel}
              >
                {({ open }) => (
                  <Button
                    onClick={open}
                    disabled={isVerifying}
                    className="w-full"
                  >
                    {isVerifying ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</>
                    ) : (
                      "Verify with World ID"
                    )}
                  </Button>
                )}
              </IDKitWidget>

              {/* Divider */}
              <div className="relative w-full flex items-center py-2">
                <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                <span className="flex-shrink mx-4 text-gray-500 dark:text-gray-400 text-xs">OR</span>
                <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
              </div>

              {/* reCAPTCHA v2 Section */}
              <div className="w-full flex justify-center">
                {!isRecaptchaScriptLoaded && (
                  <div className="text-xs text-center text-gray-500 dark:text-gray-400 py-4">
                    <Loader2 className="inline-block mr-2 h-4 w-4 animate-spin" /> Loading reCAPTCHA...
                  </div>
                )}
                <div ref={recaptchaContainerRef} id={`recaptcha-container-${appId}`} className={`${!isRecaptchaScriptLoaded ? 'hidden' : ''}`}></div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">Powered by World ID & Google reCAPTCHA</p>
      </CardFooter>
    </Card>
  )
}
