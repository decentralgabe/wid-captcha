"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback, useEffect } from "react"
import type { VerificationMethod, VerificationResult, WidCaptchaContextType } from "./types"

// --- Environment Variables (Client-Side) ---
const CAPTCHA_PROVIDER = (process.env.NEXT_PUBLIC_CAPTCHA_PROVIDER || 'recaptcha') as 'recaptcha' | 'hcaptcha';
const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
const HCAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;

declare global {
  interface Window {
    grecaptcha?: {
      render: (container: string | HTMLElement, parameters: object) => number
      reset?: (widgetId?: number) => void
    };
    // Add hCaptcha type to window
    hcaptcha?: {
      render: (container: string | HTMLElement, params: object) => string; // Returns widget ID
      reset: (widgetId?: string) => void;
      getResponse: (widgetId?: string) => string; // Gets the response token
      execute: (widgetId?: string, opts?: { async: boolean }) => Promise<void>;
    };
    // Callback for explicit reCAPTCHA load
    onloadCallback?: () => void;
  }
}

interface ApiVerificationResponse {
  success: boolean
  message?: string
  error?: string
  method?: VerificationMethod
  details?: Record<string, any>; // Include details from API response
}

interface InternalWidCaptchaContextType extends WidCaptchaContextType {
  appId: string | null
  actionId: string | null
  // Add hcaptcha site key to internal context
  recaptchaSiteKey: string | null
  hcaptchaSiteKey: string | null
  captchaProvider: 'recaptcha' | 'hcaptcha' // Explicitly store the provider
}

const WidCaptchaContext = createContext<InternalWidCaptchaContextType | undefined>(undefined)

export const WidCaptchaProvider: React.FC<{
  appId: string
  actionId: string
  // Keep props separate for potential direct use, though env vars are primary
  recaptchaSiteKey?: string
  hcaptchaSiteKey?: string
  onVerificationComplete?: (result: VerificationResult) => void
  onError?: (error: Error) => void
  children: React.ReactNode
}> = ({
  appId,
  actionId,
  recaptchaSiteKey: recaptchaSiteKeyProp,
  hcaptchaSiteKey: hcaptchaSiteKeyProp,
  onVerificationComplete,
  onError,
  children,
}) => {
    // Use environment variables as primary source, allow props as override (optional)
    const effectiveRecaptchaSiteKey = recaptchaSiteKeyProp || RECAPTCHA_SITE_KEY;
    const effectiveHcaptchaSiteKey = hcaptchaSiteKeyProp || HCAPTCHA_SITE_KEY;

    const [isVerified, setIsVerified] = useState(false)
    const [isVerifying, setIsVerifying] = useState(false)
    const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>("none")
    const [error, setError] = useState<Error | null>(null)
    const [isCaptchaScriptLoaded, setIsCaptchaScriptLoaded] = useState(false)

    // Load the correct CAPTCHA script
    useEffect(() => {
      console.log("Script loading effect running. CAPTCHA_PROVIDER:", CAPTCHA_PROVIDER);

      const loadScript = (src: string, checkLoaded: () => boolean, id: string) => {
        console.log(`Attempting to load ${id} script from ${src}`);

        if (checkLoaded() || document.getElementById(id)) {
          console.log(`${id} already loaded or script tag exists`);
          setIsCaptchaScriptLoaded(true);
          return null; // Already loaded or loading
        }

        const script = document.createElement("script")
        script.id = id;
        script.src = src
        script.defer = true
        script.onerror = () => {
          const loadError = new Error(`Failed to load ${CAPTCHA_PROVIDER} script from ${src}`)
          console.error("Script load error:", loadError);
          setError(loadError)
          if (onError) {
            onError(loadError)
          }
          setIsCaptchaScriptLoaded(false)
          // Attempt to remove the failed script
          const existingScript = document.getElementById(id);
          if (existingScript) document.head.removeChild(existingScript);
        }

        // Specific onload handling
        if (CAPTCHA_PROVIDER === 'recaptcha') {
          // Use explicit onload callback for reCAPTCHA
          console.log("Setting up onloadCallback for reCAPTCHA");
          window.onloadCallback = () => {
            console.log("reCAPTCHA onloadCallback fired");
            setIsCaptchaScriptLoaded(true);
            delete window.onloadCallback;
          };
        } else if (CAPTCHA_PROVIDER === 'hcaptcha') {
          // hCaptcha loads globally, set loaded state once script tag added
          // Verification of actual API readiness happens in the component using it
          script.onload = () => {
            console.log("hCaptcha script onload fired");
            setIsCaptchaScriptLoaded(true);
          };
        }

        console.log(`Appending ${id} script to document head`);
        document.head.appendChild(script);
        return script; // Return the script element for cleanup
      };

      let scriptElement: HTMLScriptElement | null = null;

      if (CAPTCHA_PROVIDER === 'recaptcha') {
        console.log("Loading reCAPTCHA script with key:", RECAPTCHA_SITE_KEY ? "Key provided" : "No key provided");
        scriptElement = loadScript(
          "https://www.google.com/recaptcha/api.js?onload=onloadCallback&render=explicit",
          () => {
            const recaptchaReady = !!window.grecaptcha;
            console.log("Check if grecaptcha already available:", recaptchaReady);
            return recaptchaReady;
          },
          "recaptcha-script"
        );
      } else if (CAPTCHA_PROVIDER === 'hcaptcha') {
        console.log("Loading hCaptcha script with key:", HCAPTCHA_SITE_KEY ? "Key provided" : "No key provided");
        scriptElement = loadScript(
          "https://js.hcaptcha.com/1/api.js",
          () => {
            const hcaptchaReady = !!window.hcaptcha;
            console.log("Check if hcaptcha already available:", hcaptchaReady);
            return hcaptchaReady;
          },
          "hcaptcha-script"
        );
      }

      // Cleanup function
      return () => {
        // if (CAPTCHA_PROVIDER === 'recaptcha' && window.onloadCallback) {
        //   delete window.onloadCallback;
        // }
        // Note: Removing the script tag itself might cause issues if multiple
        // providers/widgets rely on it. Let's leave it loaded.
        // if (scriptElement && scriptElement.parentNode) {
        //   scriptElement.parentNode.removeChild(scriptElement);
        // }
      }
    }, [onError]) // Rerun only if onError changes (stable)

    // Updated API call function
    const callVerificationApi = useCallback(async (payload: { idkit_response?: any; captcha_token?: string }) => {
      setIsVerifying(true)
      setError(null)

      if (!payload.idkit_response && !payload.captcha_token) {
        const err = new Error("No verification payload (idkit_response or captcha_token) provided to callVerificationApi");
        setError(err);
        if (onError) onError(err);
        setIsVerifying(false);
        return { success: false, method: "none", data: err.message } as VerificationResult;
      }

      console.log("Sending verification payload to API:", payload); // Debug log

      try {
        const response = await fetch("/api/verify-captcha", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            // Send both potential payloads, API route will decide based on priority/availability
            idkit_response: payload.idkit_response ? {
              ...payload.idkit_response,
              signal: payload.idkit_response.signal ?? '',
            } : undefined,
            captcha_token: payload.captcha_token,
          }),
        })

        const result: ApiVerificationResponse = await response.json()
        console.log("Received API verification response:", result); // Debug log

        if (response.ok && result.success) {
          // Determine method from API response if provided, otherwise infer
          const method: VerificationMethod = result.method || (payload.idkit_response ? "world_id" : CAPTCHA_PROVIDER);
          setVerificationMethod(method)
          setIsVerified(true)
          const verificationResult: VerificationResult = {
            success: true,
            method: method,
            data: result.message || "Verification successful",
            details: result.details, // Pass along details
          }
          if (onVerificationComplete) {
            onVerificationComplete(verificationResult)
          }
          return verificationResult
        } else {
          // Handle API error or verification failure
          const errorMessage = result.error || result.message || `Verification failed with status ${response.status}`;
          console.error("API Verification Error:", errorMessage, result.details);
          throw new Error(errorMessage)
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
          method: "none", // Or potentially the attempted method if known?
          data: apiError.message,
        }
        if (onVerificationComplete) {
          onVerificationComplete(failureResult)
        }
        return failureResult
      } finally {
        setIsVerifying(false)
      }
    }, [onVerificationComplete, onError]) // Dependencies: CAPTCHA_PROVIDER is constant within component lifecycle

    const reset = useCallback(() => {
      setIsVerified(false)
      setIsVerifying(false)
      setVerificationMethod("none")
      setError(null)
      // Note: Resetting the actual CAPTCHA widget (grecaptcha.reset or hcaptcha.reset)
      // should happen in the component that renders it (WidCaptcha.tsx)
    }, [])

    const contextValue: InternalWidCaptchaContextType = {
      isVerified,
      isVerifying,
      verificationMethod,
      error,
      verifyProof: callVerificationApi,
      reset,
      isCaptchaScriptLoaded, // Use renamed state
      appId: appId ?? null,
      actionId: actionId ?? null,
      recaptchaSiteKey: effectiveRecaptchaSiteKey ?? null,
      hcaptchaSiteKey: effectiveHcaptchaSiteKey ?? null,
      captchaProvider: CAPTCHA_PROVIDER,
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

  return context
}