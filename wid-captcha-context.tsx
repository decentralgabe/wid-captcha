"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback, useEffect } from "react"
import type { VerificationMethod, VerificationResult, WidCaptchaContextType } from "./types"

// Define window interfaces for reCAPTCHA if not already global
declare global {
  interface Window {
    grecaptcha?: {
      render: (container: string | HTMLElement, parameters: object) => number
      reset?: (widgetId?: number) => void
    }
  }
}

interface ApiVerificationResponse {
  success: boolean
  message?: string
  error?: string
  // Add any other expected fields from your API response if needed
}

const WidCaptchaContext = createContext<WidCaptchaContextType | undefined>(undefined)

export const WidCaptchaProvider: React.FC<{
  recaptchaSiteKey: string
  onVerificationComplete?: (result: VerificationResult) => void
  onError?: (error: Error) => void
  children: React.ReactNode
}> = ({ recaptchaSiteKey, onVerificationComplete, onError, children }) => {
  const [isVerified, setIsVerified] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>("none")
  const [error, setError] = useState<Error | null>(null)
  const [isRecaptchaScriptLoaded, setIsRecaptchaScriptLoaded] = useState(false)

  // Load reCAPTCHA script for v2
  useEffect(() => {
    // Check if script already exists or if window.grecaptcha is already populated
    if (window.grecaptcha || document.querySelector('script[src="https://www.google.com/recaptcha/api.js"]')) {
      setIsRecaptchaScriptLoaded(true);
      return;
    }

    const script = document.createElement("script")
    // Use standard v2 script URL, async/defer can be helpful
    script.src = "https://www.google.com/recaptcha/api.js?onload=onloadCallback&render=explicit"
    script.async = true
    script.defer = true
    script.onerror = () => {
      const loadError = new Error("Failed to load reCAPTCHA script")
      setError(loadError)
      if (onError) {
        onError(loadError)
      }
      setIsRecaptchaScriptLoaded(false) // Ensure state reflects failure
    }

      // Define the global callback function
      ; (window as any).onloadCallback = () => {
        console.log("reCAPTCHA script loaded via onloadCallback.");
        setIsRecaptchaScriptLoaded(true);
        // Clean up the global function after it's called
        delete (window as any).onloadCallback;
      };


    document.head.appendChild(script)

    // Cleanup function
    return () => {
      const existingScript = document.querySelector('script[src="https://www.google.com/recaptcha/api.js?onload=onloadCallback&render=explicit"]')
      if (existingScript) {
        // Avoid removing if other components might need it, but for this isolated context it might be okay
        // document.head.removeChild(existingScript)
      }
      // Clean up global callback if component unmounts before script loads
      if ((window as any).onloadCallback) {
        delete (window as any).onloadCallback;
      }
    }
  }, [onError]) // recaptchaSiteKey is not needed dependency for loading script itself

  const callVerificationApi = useCallback(async (payload: { idkit_response?: any; recaptcha_token?: string }) => {
    setIsVerifying(true)
    setError(null)
    setVerificationMethod("none") // Reset method during verification
    // setIsVerified(false) // Keep verification status until new result comes

    try {
      const response = await fetch("/api/verify-captcha", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const result: ApiVerificationResponse = await response.json()

      if (response.ok && result.success) {
        const method: VerificationMethod = payload.idkit_response ? "world_id" : "recaptcha"
        setVerificationMethod(method)
        setIsVerified(true)
        const verificationResult: VerificationResult = {
          success: true,
          method: method,
          data: result.message || "Verification successful", // Or pass specific data if needed
        }
        if (onVerificationComplete) {
          onVerificationComplete(verificationResult)
        }
        return verificationResult // Return result for potential direct use
      } else {
        throw new Error(result.error || "Verification failed")
      }
    } catch (err) {
      const apiError = err instanceof Error ? err : new Error(String(err))
      setError(apiError)
      if (onError) {
        onError(apiError)
      }
      const failureResult: VerificationResult = {
        success: false,
        method: "none",
        data: apiError.message,
      }
      if (onVerificationComplete) {
        // Notify completion even on failure
        onVerificationComplete(failureResult)
      }
      return failureResult // Return failure result
    } finally {
      setIsVerifying(false)
    }
  }, [onVerificationComplete, onError])

  const reset = useCallback(() => {
    setIsVerified(false)
    setIsVerifying(false)
    setVerificationMethod("none")
    setError(null)
    // Optionally, reset the reCAPTCHA widget itself if needed,
    // This requires managing the widget ID, which adds complexity.
    // The component rendering the widget might handle this better.
    // if (window.grecaptcha && widgetIdRef.current !== null) {
    //   window.grecaptcha.reset(widgetIdRef.current);
    // }
  }, [])

  return (
    <WidCaptchaContext.Provider
      value={{
        isVerified,
        isVerifying,
        verificationMethod,
        error,
        // Expose the function to call the API directly
        // The v2 widget callback will call this
        verifyProof: callVerificationApi,
        // Remove v3 specific trigger and ready state
        // triggerRecaptchaVerification,
        reset,
        // recaptchaReady,
        isRecaptchaScriptLoaded, // Expose script loaded status
      }}
    >
      {children}
    </WidCaptchaContext.Provider>
  )
}

export const useWidCaptcha = (): WidCaptchaContextType => {
  const context = useContext(WidCaptchaContext)

  if (context === undefined) {
    throw new Error("useWidCaptcha must be used within a WidCaptchaProvider")
  }

  return context
}