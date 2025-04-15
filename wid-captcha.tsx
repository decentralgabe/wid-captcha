"use client"

import React, { useEffect, useState, useRef } from "react"
import { useWidCaptcha } from "./wid-captcha-context"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { VerificationLevel, ISuccessResult, IDKitWidget, useIDKit } from "@worldcoin/idkit"
import { VerificationResult } from "./types"

// Define IDKit global window interface
declare global {
  interface Window {
    IDKit?: {
      init: (config: any) => void;
      open: () => void;
    };
  }
}

// Props with recaptcha included for future use
interface WidCaptchaProps {
  appId: `app_${string}`
  actionId: string
  recaptchaSiteKey: string
  signal?: string
  signalDescription?: string
  verificationLevel?: VerificationLevel
  onVerificationComplete?: (result: VerificationResult) => void
  children?: React.ReactNode
  /** Container ID where the World ID QR code should be rendered */
  containerId?: string
}

export const WidCaptcha: React.FC<WidCaptchaProps> = ({
  appId,
  actionId,
  recaptchaSiteKey,
  signalDescription = "Verify You're a Human",
  verificationLevel = VerificationLevel.Orb,
  onVerificationComplete,
  children,
  containerId,
}) => {
  // Use default container ID if not provided
  const worldIdContainerId = containerId || `worldid-container-${appId}`;

  // Client-side rendering check
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Use the context hook to get state
  const {
    isVerified,
    isVerifying: contextIsVerifying,
    error,
    verifyProof,
    reset,
    isRecaptchaScriptLoaded,
  } = useWidCaptcha()

  // Local state for verification status
  const [isVerifying, setIsVerifying] = useState(false)
  const [recaptchaWidgetId, setRecaptchaWidgetId] = useState<number | null>(null)
  const recaptchaContainerRef = useRef<HTMLDivElement>(null)

  // Handle World ID verification success
  const handleWorldIDSuccess = (result: ISuccessResult) => {
    console.log("World ID Success:", result)
    try {
      setIsVerifying(true)
      verifyProof({ idkit_response: result }).then(result => {
        console.log("World ID verification result:", result)
        if (onVerificationComplete) {
          onVerificationComplete(result)
        }
        setIsVerifying(false)
      })
    } catch (error) {
      console.error("Error processing World ID proof:", error)
      setIsVerifying(false)
    }
  }

  // Callbacks for reCAPTCHA v2 Widget
  const handleRecaptchaSuccess = (token: string | null) => {
    console.log("reCAPTCHA v2 Success:", token)
    if (token) {
      verifyProof({ recaptcha_token: token }).then(result => {
        console.log("reCAPTCHA verification result:", result)
        if (onVerificationComplete) {
          onVerificationComplete(result)
        }
      })
    } else {
      console.warn("reCAPTCHA v2 success callback received null token.")
      reset()
    }
  }

  const handleRecaptchaExpired = () => {
    console.warn("reCAPTCHA v2 Token Expired.")
    reset()
  }

  const handleRecaptchaError = (error: any) => {
    console.error("reCAPTCHA v2 Error:", error)
    reset()
  }

  // Render reCAPTCHA v2 Widget
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isRecaptchaScriptLoaded && window.grecaptcha && window.grecaptcha.render && recaptchaContainerRef.current) {
      if (recaptchaWidgetId === null && recaptchaContainerRef.current.innerHTML === '') {
        console.log("Rendering reCAPTCHA v2 widget...")
        try {
          const widgetId = window.grecaptcha.render(recaptchaContainerRef.current, {
            sitekey: recaptchaSiteKey,
            callback: handleRecaptchaSuccess,
            'expired-callback': handleRecaptchaExpired,
            'error-callback': handleRecaptchaError,
          })
          setRecaptchaWidgetId(widgetId)
        } catch (renderError) {
          console.error("Failed to render reCAPTCHA v2 widget:", renderError)
          handleRecaptchaError(renderError)
        }
      }
    }

    return () => { }
  }, [isRecaptchaScriptLoaded, recaptchaSiteKey, recaptchaWidgetId])

  // Reset logic
  const handleResetClick = () => {
    reset()
    if (typeof window !== 'undefined' && window.grecaptcha && window.grecaptcha.reset && recaptchaWidgetId !== null) {
      console.log(`Resetting reCAPTCHA widget ID: ${recaptchaWidgetId}`)
      try {
        window.grecaptcha.reset(recaptchaWidgetId)
      } catch (resetError) {
        console.error("Error resetting reCAPTCHA widget:", resetError)
      }
    }
    setRecaptchaWidgetId(null)
    if (recaptchaContainerRef.current) {
      recaptchaContainerRef.current.innerHTML = ''
    }
  }

  // Render custom children if provided
  if (children) {
    return React.cloneElement(children as React.ReactElement, {
      isVerified,
      isVerifying,
      error,
      reset: handleResetClick,
    } as any)
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
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
              {isClient && (
                <IDKitWidget
                  app_id={appId}
                  action={actionId}
                  verification_level={verificationLevel}
                  onSuccess={handleWorldIDSuccess}
                  autoClose={true}
                  container_id={worldIdContainerId}
                  show_modal={false}
                  handleVerify={async () => {
                    return Promise.resolve();
                  }}
                />
              )}

              {/* Conditionally render Verifying state or QR Code container */}
              {(isVerifying || contextIsVerifying) ? (
                <div className="text-center text-sm text-gray-500 h-[350px] flex flex-col justify-center items-center">
                  <Loader2 className="mx-auto h-4 w-4 animate-spin mb-2" /> Verifying...
                </div>
              ) : (
                /* Container where the World ID QR code will be rendered by IDKitWidget */
                <div
                  id={worldIdContainerId}
                  className="flex justify-center items-center mb-2"
                >
                  {/* Optional: Placeholder content while IDKit initializes */}
                  {!isClient && <p className="text-xs text-gray-400">Initializing World ID...</p>}
                </div>
              )}

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
