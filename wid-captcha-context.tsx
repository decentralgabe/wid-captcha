"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback } from "react"
import type { VerificationMethod, VerificationResult, WidCaptchaContextType } from "./types"

const WidCaptchaContext = createContext<WidCaptchaContextType | undefined>(undefined)

export const WidCaptchaProvider: React.FC<{
  worldIdAppId: string
  worldIdActionId: string
  recaptchaSiteKey: string
  onVerificationComplete: (result: VerificationResult) => void
  onError?: (error: Error) => void
  children: React.ReactNode
}> = ({ worldIdAppId, worldIdActionId, recaptchaSiteKey, onVerificationComplete, onError, children }) => {
  const [isVerified, setIsVerified] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>("none")

  const verify = useCallback(async (): Promise<VerificationResult> => {
    setIsVerifying(true)

    try {
      // Attempt World ID verification first
      try {
        // Dynamic import to avoid SSR issues
        const { IDKitWidget } = await import("@worldcoin/idkit")

        // This is a simplified version - in reality, we would need to integrate
        // IDKitWidget's verification process here
        const worldIdResult = await new Promise((resolve, reject) => {
          // Simulate World ID verification success for demonstration
          // In a real implementation, this would use the actual IDKit flow
          setTimeout(() => resolve({ proof: { some: "proof-data" } }), 500)
        })

        setVerificationMethod("world_id")
        setIsVerified(true)
        setIsVerifying(false)

        const result = {
          success: true,
          method: "world_id" as VerificationMethod,
          data: worldIdResult,
        }

        onVerificationComplete(result)
        return result
      } catch (worldIdError) {
        console.warn("World ID verification failed, falling back to reCAPTCHA", worldIdError)

        // Fall back to reCAPTCHA
        try {
          // Load reCAPTCHA script if not already loaded
          if (!window.grecaptcha) {
            await new Promise<void>((resolve, reject) => {
              const script = document.createElement("script")
              script.src = `https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}`
              script.onload = () => resolve()
              script.onerror = () => reject(new Error("Failed to load reCAPTCHA"))
              document.head.appendChild(script)
            })
          }

          // Execute reCAPTCHA
          const token = await new Promise<string>((resolve, reject) => {
            window.grecaptcha.ready(() => {
              window.grecaptcha.execute(recaptchaSiteKey, { action: "submit" }).then(resolve).catch(reject)
            })
          })

          setVerificationMethod("recaptcha")
          setIsVerified(true)
          setIsVerifying(false)

          const result = {
            success: true,
            method: "recaptcha" as VerificationMethod,
            data: token,
          }

          onVerificationComplete(result)
          return result
        } catch (recaptchaError) {
          throw new Error(`Verification failed with both methods. Last error: ${recaptchaError.message}`)
        }
      }
    } catch (error) {
      setIsVerifying(false)
      setIsVerified(false)
      setVerificationMethod("none")

      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)))
      }

      return {
        success: false,
        method: "none",
        data: null,
      }
    }
  }, [recaptchaSiteKey, onVerificationComplete, onError])

  const reset = useCallback(() => {
    setIsVerified(false)
    setIsVerifying(false)
    setVerificationMethod("none")
  }, [])

  return (
    <WidCaptchaContext.Provider
      value={{
        isVerified,
        isVerifying,
        verificationMethod,
        verify,
        reset,
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
