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
  method?: VerificationMethod
}

interface InternalWidCaptchaContextType extends WidCaptchaContextType {
  appId: string | null
  actionId: string | null
}

const WidCaptchaContext = createContext<InternalWidCaptchaContextType | undefined>(undefined)

export const WidCaptchaProvider: React.FC<{
  appId: string
  actionId: string
  recaptchaSiteKey: string
  onVerificationComplete?: (result: VerificationResult) => void
  onError?: (error: Error) => void
  children: React.ReactNode
}> = ({
  appId,
  actionId,
  recaptchaSiteKey,
  onVerificationComplete,
  onError,
  children,
}) => {
    const [isVerified, setIsVerified] = useState(false)
    const [isVerifying, setIsVerifying] = useState(false)
    const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>("none")
    const [error, setError] = useState<Error | null>(null)
    const [isRecaptchaScriptLoaded, setIsRecaptchaScriptLoaded] = useState(false)

    useEffect(() => {
      if (process.env.NODE_ENV === 'development') {
        if (!appId) {
          console.error(
            '[WidCaptchaProvider] Missing required prop: "appId". Get this from the Worldcoin Developer Portal.'
          )
        } else if (typeof appId !== 'string' || !appId.startsWith('app_')) {
          console.warn(
            `[WidCaptchaProvider] Invalid prop format: "appId" should be a string starting with "app_". Received: ${appId}`
          )
        }
        if (!actionId) {
          console.error(
            '[WidCaptchaProvider] Missing required prop: "actionId". Get this from the Worldcoin Developer Portal.'
          )
        }
        if (!recaptchaSiteKey) {
          console.error(
            '[WidCaptchaProvider] Missing required prop: "recaptchaSiteKey" (Client-side Site Key). Get this from the Google Cloud Console.'
          )
        }
      }
    }, [appId, actionId, recaptchaSiteKey])

    useEffect(() => {
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
        setIsRecaptchaScriptLoaded(false)
      }

        ; (window as any).onloadCallback = () => {
          setIsRecaptchaScriptLoaded(true);
          delete (window as any).onloadCallback;
        };

      document.head.appendChild(script)

      return () => {
        if ((window as any).onloadCallback) {
          delete (window as any).onloadCallback;
        }
      }
    }, [onError])

    const callVerificationApi = useCallback(async (payload: { idkit_response?: any; recaptcha_token?: string }) => {
      setIsVerifying(true)
      setError(null)

      if (!payload.idkit_response && !payload.recaptcha_token) {
        const err = new Error("No verification payload provided to callVerificationApi");
        setError(err);
        if (onError) onError(err);
        setIsVerifying(false);
        return { success: false, method: "none", data: err.message } as VerificationResult;
      }

      try {
        const response = await fetch("/api/verify-captcha", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...payload,
            idkit_response: payload.idkit_response ? {
              ...payload.idkit_response,
              signal: payload.idkit_response.signal ?? '',
            } : undefined,
          }),
        })

        const result: ApiVerificationResponse = await response.json()

        if (response.ok && result.success) {
          const method: VerificationMethod = result.method || (payload.idkit_response ? "world_id" : "recaptcha");
          setVerificationMethod(method)
          setIsVerified(true)
          const verificationResult: VerificationResult = {
            success: true,
            method: method,
            data: result.message || "Verification successful",
          }
          if (onVerificationComplete) {
            onVerificationComplete(verificationResult)
          }
          return verificationResult
        } else {
          throw new Error(result.error || result.message || `Verification failed with status ${response.status}`)
        }
      } catch (err) {
        const apiError = err instanceof Error ? err : new Error(String(err))
        setError(apiError)
        if (onError) {
          onError(apiError)
        }
        setVerificationMethod("none")
        setIsVerified(false)

        const failureResult: VerificationResult = {
          success: false,
          method: "none",
          data: apiError.message,
        }
        if (onVerificationComplete) {
          onVerificationComplete(failureResult)
        }
        return failureResult
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

    const contextValue: InternalWidCaptchaContextType = {
      isVerified,
      isVerifying,
      verificationMethod,
      error,
      verifyProof: callVerificationApi,
      reset,
      isRecaptchaScriptLoaded,
      appId: appId ?? null,
      actionId: actionId ?? null,
    };

    return (
      <WidCaptchaContext.Provider value={contextValue}>
        {children}
      </WidCaptchaContext.Provider>
    )
  }

export const useWidCaptcha = (): InternalWidCaptchaContextType => {
  const context = useContext(WidCaptchaContext)

  if (context === undefined) {
    throw new Error("useWidCaptcha must be used within a WidCaptchaProvider")
  }

  if (process.env.NODE_ENV === 'development') {
    if (!context.appId) {
      console.error("[useWidCaptcha] Error: appId is missing from WidCaptchaProvider context. Ensure it's passed as a prop to the provider.");
    }
    if (!context.actionId) {
      console.error("[useWidCaptcha] Error: actionId is missing from WidCaptchaProvider context. Ensure it's passed as a prop to the provider.");
    }
  }

  return context
}