"use client"

import React, { useState, useEffect } from "react"
import type { WidCaptchaProps, VerificationResult } from "./types"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

// Define IDKit interface for TypeScript
declare global {
  interface Window {
    worldID?: any
  }
}

export const WidCaptcha: React.FC<WidCaptchaProps> = ({
  appId,
  actionId,
  signalDescription = "Verify you're human",
  recaptchaSiteKey,
  onSuccessWorldId,
  onSuccessRecaptcha,
  onVerificationComplete,
  onError,
  children,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isVerified, setIsVerified] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [worldIdLoaded, setWorldIdLoaded] = useState<boolean>(false)
  const [recaptchaLoaded, setRecaptchaLoaded] = useState<boolean>(false)

  // Load necessary scripts
  useEffect(() => {
    const loadWorldIdScript = async () => {
      try {
        // Dynamic import for World ID kit
        const { IDKitWidget } = await import("@worldcoin/idkit")
        setWorldIdLoaded(true)
      } catch (error) {
        console.warn("Failed to load World ID script:", error)
        // Continue to load reCAPTCHA as fallback
      }
    }

    const loadReCaptchaScript = () => {
      if (window.grecaptcha) {
        setRecaptchaLoaded(true)
        return
      }

      const script = document.createElement("script")
      script.src = `https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}`
      script.async = true
      script.defer = true
      script.onload = () => setRecaptchaLoaded(true)
      script.onerror = () => {
        console.error("Failed to load reCAPTCHA script")
        if (onError) {
          onError(new Error("Failed to load reCAPTCHA script"))
        }
      }
      document.head.appendChild(script)
    }

    // Load both scripts in parallel
    loadWorldIdScript()
    loadReCaptchaScript()
  }, [recaptchaSiteKey, onError])

  const handleWorldIdSuccess = async (proof: any) => {
    if (onSuccessWorldId) {
      onSuccessWorldId(proof)
    }

    const result: VerificationResult = {
      success: true,
      method: "world_id",
      data: proof,
    }

    setIsVerified(true)
    onVerificationComplete(result)
  }

  const handleWorldIdError = (error: Error) => {
    console.warn("World ID verification failed, falling back to reCAPTCHA:", error)
    verifyWithReCaptcha()
  }

  const verifyWithReCaptcha = async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (!window.grecaptcha) {
        throw new Error("reCAPTCHA not loaded")
      }

      const token = await new Promise<string>((resolve, reject) => {
        window.grecaptcha.ready(() => {
          window.grecaptcha.execute(recaptchaSiteKey, { action: "submit" }).then(resolve).catch(reject)
        })
      })

      if (onSuccessRecaptcha) {
        onSuccessRecaptcha(token)
      }

      const result: VerificationResult = {
        success: true,
        method: "recaptcha",
        data: token,
      }

      setIsVerified(true)
      onVerificationComplete(result)
    } catch (error) {
      setError("Verification failed. Please try again.")

      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)))
      }

      onVerificationComplete({
        success: false,
        method: "none",
        data: null,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify = async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (worldIdLoaded) {
        // This would trigger the World ID flow
        // In a real implementation, we would use IDKitWidget here
        console.log("Attempting World ID verification...")

        // In a real application, this would be handled by the IDKit component
        // For this example, we're simulating a successful World ID verification
        setTimeout(() => {
          const mockProof = {
            merkle_root: "0x123...",
            nullifier_hash: "0x456...",
            proof: "0x789...",
            verification_level: "orb",
          }

          handleWorldIdSuccess(mockProof)
          setIsLoading(false)
        }, 1500)
      } else {
        // Fall back to reCAPTCHA
        await verifyWithReCaptcha()
      }
    } catch (error) {
      handleWorldIdError(error instanceof Error ? error : new Error(String(error)))
    }
  }

  // If children are provided, render them with verification state and handlers
  if (children) {
    return React.cloneElement(children as React.ReactElement, {
      isVerified,
      isLoading,
      onVerify: handleVerify,
      error,
    })
  }

  // Default UI
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Human Verification</CardTitle>
        <CardDescription>{signalDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        {isVerified ? (
          <div className="flex items-center justify-center p-4 bg-green-50 text-green-700 rounded-md">
            ✓ Verification successful
          </div>
        ) : (
          <div className="space-y-4">
            {error && <div className="p-3 text-sm bg-red-50 text-red-700 rounded-md">{error}</div>}
            <div className="flex flex-col space-y-3">
              <Button
                onClick={handleVerify}
                disabled={isLoading || (!worldIdLoaded && !recaptchaLoaded)}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify with World ID"
                )}
              </Button>
              <div className="text-xs text-center text-gray-500">
                {!worldIdLoaded && "Loading World ID..."}
                {!worldIdLoaded && !recaptchaLoaded && " | "}
                {!recaptchaLoaded && "Loading reCAPTCHA..."}
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-xs text-gray-500">Powered by World ID with reCAPTCHA fallback</p>
      </CardFooter>
    </Card>
  )
}
