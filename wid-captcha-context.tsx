"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback, useEffect } from "react"
import type { VerificationMethod, VerificationResult, WidCaptchaContextType } from "./types"

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
}

const WidCaptchaContext = createContext<WidCaptchaContextType | undefined>(undefined)

export const WidCaptchaProvider: React.FC<{
  recaptchaSiteKey: string
  onVerificationComplete?: (result: VerificationResult) => void
  onError?: (error: Error) => void
  children: React.ReactNode
}> = ({ onVerificationComplete, onError, children }) => {
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
        setIsRecaptchaScriptLoaded(true);
        delete (window as any).onloadCallback;
      };


    document.head.appendChild(script)

    // Cleanup function
    return () => {
      const existingScript = document.querySelector('script[src="https://www.google.com/recaptcha/api.js?onload=onloadCallback&render=explicit"]')
      if (existingScript) {
        // Avoid removing if other components might need it, but for this isolated context it might be okay
      }
      if ((window as any).onloadCallback) {
        delete (window as any).onloadCallback;
      }
    }
  }, [onError]) // recaptchaSiteKey is not needed dependency for loading script itself

  const callVerificationApi = useCallback(async (payload: { idkit_response?: any; recaptcha_token?: string }) => {
    setIsVerifying(true)
    setError(null)
    setVerificationMethod("none")

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
  }, [])

  return (
    <WidCaptchaContext.Provider
      value={{
        isVerified,
        isVerifying,
        verificationMethod,
        error,
        verifyProof: callVerificationApi,
        reset,
        isRecaptchaScriptLoaded,
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