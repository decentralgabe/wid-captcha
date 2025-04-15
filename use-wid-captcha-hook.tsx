"use client"

import { useState, useEffect, useCallback } from "react"
import type { VerificationMethod, VerificationResult } from "./types"

interface UseWidCaptchaHookOptions {
  worldIdAppId: string
  worldIdActionId: string
  recaptchaSiteKey: string
  autoLoadScripts?: boolean
  onVerificationComplete?: (result: VerificationResult) => void
}

export function useWidCaptchaHook({
  worldIdAppId,
  worldIdActionId,
  recaptchaSiteKey,
  autoLoadScripts = true,
  onVerificationComplete,
}: UseWidCaptchaHookOptions) {
  const [isVerified, setIsVerified] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>("none")
  const [worldIdReady, setWorldIdReady] = useState(false)
  const [recaptchaReady, setRecaptchaReady] = useState(false)

  // Load the scripts if autoLoadScripts is true
  useEffect(() => {
    if (!autoLoadScripts) return

    // Load World ID script
    const loadWorldId = async () => {
      try {
        // In a real implementation, we would load the World ID script here
        // For this example, we're simulating script loading
        await new Promise((resolve) => setTimeout(resolve, 500))
        setWorldIdReady(true)
      } catch (err) {
        console.warn("Failed to load World ID:", err)
      }
    }

    // Load reCAPTCHA script
    const loadReCaptcha = async () => {
      if (window.grecaptcha) {
        setRecaptchaReady(true)
        return
      }

      return new Promise<void>((resolve, reject) => {
        const script = document.createElement("script")
        script.src = `https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}`
        script.async = true
        script.onload = () => {
          setRecaptchaReady(true)
          resolve()
        }
        script.onerror = () => reject(new Error("Failed to load reCAPTCHA script"))
        document.head.appendChild(script)
      })
    }

    loadWorldId()
    loadReCaptcha()
  }, [autoLoadScripts, recaptchaSiteKey])

  const verifyWithWorldId = useCallback(async (): Promise<VerificationResult> => {
    setIsLoading(true)
    setError(null)

    try {
      // In a real implementation, we would use IDKitWidget here
      // For this example, we're simulating a successful verification
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const mockProof = {
        merkle_root: "0x123...",
        nullifier_hash: "0x456...",
        proof: "0x789...",
        verification_level: "orb",
      }

      const result: VerificationResult = {
        success: true,
        method: "world_id",
        data: mockProof,
      }

      setVerificationMethod("world_id")
      setIsVerified(true)

      if (onVerificationComplete) {
        onVerificationComplete(result)
      }

      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      console.error("World ID verification failed:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [onVerificationComplete])

  const verifyWithReCaptcha = useCallback(async (): Promise<VerificationResult> => {
    setIsLoading(true)
    setError(null)

    try {
      if (!recaptchaReady || !window.grecaptcha) {
        throw new Error("reCAPTCHA not ready")
      }

      // Execute reCAPTCHA
      const token = await new Promise<string>((resolve, reject) => {
        window.grecaptcha.ready(() => {
          window.grecaptcha.execute(recaptchaSiteKey, { action: "submit" }).then(resolve).catch(reject)
        })
      })

      const result: VerificationResult = {
        success: true,
        method: "recaptcha",
        data: token,
      }

      setVerificationMethod("recaptcha")
      setIsVerified(true)

      if (onVerificationComplete) {
        onVerificationComplete(result)
      }

      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      console.error("reCAPTCHA verification failed:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [recaptchaReady, recaptchaSiteKey, onVerificationComplete])

  const verify = useCallback(async (): Promise<VerificationResult> => {
    setError(null)

    try {
      // Try World ID first if it's ready
      if (worldIdReady) {
        return await verifyWithWorldId()
      } else if (recaptchaReady) {
        // Fall back to reCAPTCHA if World ID is not ready
        console.warn("World ID not ready, falling back to reCAPTCHA")
        return await verifyWithReCaptcha()
      } else {
        throw new Error("Neither World ID nor reCAPTCHA are ready")
      }
    } catch (worldIdError) {
      console.warn("Falling back to reCAPTCHA:", worldIdError)

      // Fall back to reCAPTCHA
      try {
        if (recaptchaReady) {
          return await verifyWithReCaptcha()
        } else {
          throw new Error("reCAPTCHA not ready")
        }
      } catch (recaptchaError) {
        const error = new Error(
          `Both verification methods failed. World ID error: ${worldIdError.message}, reCAPTCHA error: ${recaptchaError.message}`,
        )
        setError(error)

        const result: VerificationResult = {
          success: false,
          method: "none",
          data: null,
        }

        if (onVerificationComplete) {
          onVerificationComplete(result)
        }

        return result
      }
    }
  }, [worldIdReady, recaptchaReady, verifyWithWorldId, verifyWithReCaptcha, onVerificationComplete])

  const reset = useCallback(() => {
    setIsVerified(false)
    setIsLoading(false)
    setError(null)
    setVerificationMethod("none")
  }, [])

  return {
    isVerified,
    isLoading,
    error,
    verificationMethod,
    verify,
    reset,
    worldIdReady,
    recaptchaReady,
  }
}
