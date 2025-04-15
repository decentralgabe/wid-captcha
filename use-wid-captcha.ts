"use client"

import { useEffect, useState } from "react"
import type { VerificationMethod, VerificationResult } from "./types"

// Define window interfaces for reCAPTCHA
declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void
      execute: (siteKey: string, options: { action: string }) => Promise<string>
      render: (container: string | HTMLElement, parameters: object) => number
    }
  }
}

interface UseWidCaptchaOptions {
  worldIdAppId: string
  worldIdActionId: string
  recaptchaSiteKey: string
  autoVerify?: boolean
}

export const useWidCaptcha = ({
  worldIdAppId,
  worldIdActionId,
  recaptchaSiteKey,
  autoVerify = false,
}: UseWidCaptchaOptions) => {
  const [isVerified, setIsVerified] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>("none")
  const [error, setError] = useState<Error | null>(null)

  // Load necessary scripts
  useEffect(() => {
    const loadReCaptchaScript = () => {
      if (window.grecaptcha) {
        return Promise.resolve()
      }

      return new Promise<void>((resolve, reject) => {
        const script = document.createElement("script")
        script.src = `https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}`
        script.async = true
        script.defer = true
        script.onload = () => resolve()
        script.onerror = () => reject(new Error("Failed to load reCAPTCHA script"))
        document.head.appendChild(script)
      })
    }

    // Only load reCAPTCHA if autoVerify is true
    if (autoVerify) {
      loadReCaptchaScript().catch((err) => setError(err))
    }
  }, [recaptchaSiteKey, autoVerify])

  const verifyWithWorldId = async (): Promise<VerificationResult> => {
    try {
      setIsVerifying(true)

      // In a real implementation, we would use the IDKit flow
      // For this example, we're using dynamic imports to simulate the verification
      const { IDKitWidget } = await import("@worldcoin/idkit")

      // This is a placeholder for the actual World ID verification
      // In a real implementation, you would use IDKitWidget's verification process
      const proof = await new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            merkle_root: "0x123...",
            nullifier_hash: "0x456...",
            proof: "0x789...",
            verification_level: "orb",
          })
        }, 1000)
      })

      setVerificationMethod("world_id")
      setIsVerified(true)

      return {
        success: true,
        method: "world_id",
        data: proof,
      }
    } catch (err) {
      console.warn("World ID verification failed:", err)
      throw err
    } finally {
      setIsVerifying(false)
    }
  }

  const verifyWithReCaptcha = async (): Promise<VerificationResult> => {
    try {
      setIsVerifying(true)

      // Ensure reCAPTCHA is loaded
      if (!window.grecaptcha) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script")
          script.src = `https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}`
          script.async = true
          script.defer = true
          script.onload = () => resolve()
          script.onerror = () => reject(new Error("Failed to load reCAPTCHA script"))
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

      return {
        success: true,
        method: "recaptcha",
        data: token,
      }
    } catch (err) {
      console.error("reCAPTCHA verification failed:", err)
      throw err
    } finally {
      setIsVerifying(false)
    }
  }

  const verify = async (): Promise<VerificationResult> => {
    setError(null)

    try {
      // Try World ID first
      return await verifyWithWorldId()
    } catch (worldIdError) {
      console.warn("Falling back to reCAPTCHA:", worldIdError)

      // Fall back to reCAPTCHA
      try {
        return await verifyWithReCaptcha()
      } catch (recaptchaError) {
        const error = new Error("Both verification methods failed")
        setError(error)

        return {
          success: false,
          method: "none",
          data: null,
        }
      }
    }
  }

  const reset = () => {
    setIsVerified(false)
    setIsVerifying(false)
    setVerificationMethod("none")
    setError(null)
  }

  // Auto-verify if option is enabled
  useEffect(() => {
    if (autoVerify && !isVerified && !isVerifying) {
      verify().catch((err) => setError(err))
    }
  }, [autoVerify, isVerified, isVerifying])

  return {
    isVerified,
    isVerifying,
    verificationMethod,
    error,
    verify,
    reset,
  }
}
