"use client"

import React, { useEffect, useState, useRef, useCallback } from "react"
import { useWidCaptcha } from "./wid-captcha-context"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { VerificationLevel, ISuccessResult, IDKitWidget, useIDKit } from "@worldcoin/idkit"
import type { VerificationResult } from "./types" // Import type only

// Define IDKit global window interface
declare global {
  interface Window {
    IDKit?: {
      init: (config: any) => void;
      open: () => void;
    };
    // Note: grecaptcha and hcaptcha types are now declared in wid-captcha-context.tsx
  }
}

// Props with recaptcha included for future use
interface WidCaptchaProps {
  appId?: `app_${string}`
  actionId?: string
  recaptchaSiteKey?: string
  hcaptchaSiteKey?: string
  signal?: string
  signalDescription?: string
  verificationLevel?: VerificationLevel
  onVerificationComplete?: (result: VerificationResult) => void
  onVerificationStart?: () => void
  children?: React.ReactNode
  /** Container ID where the World ID QR code should be rendered */
  containerId?: string
  /** Hide the internal success message when true */
  hideSuccessMessage?: boolean
  /** Hide the default UI card */
  hideDefaultUICard?: boolean
}

export const WidCaptcha: React.FC<WidCaptchaProps> = ({
  appId: appIdProp,
  actionId: actionIdProp,
  recaptchaSiteKey: recaptchaSiteKeyProp,
  hcaptchaSiteKey: hcaptchaSiteKeyProp,
  signal,
  signalDescription = "Verify You're a Human",
  verificationLevel = VerificationLevel.Orb,
  onVerificationComplete,
  onVerificationStart,
  children,
  containerId,
  hideSuccessMessage = false,
  hideDefaultUICard = false,
}) => {
  // Use default container ID if not provided
  const worldIdContainerId = containerId || `worldid-container-${appIdProp || 'default'}`;

  // Client-side rendering check
  const [isClient, setIsClient] = useState(false);
  // Track when the captcha is clicked
  const [captchaClicked, setCaptchaClicked] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const {
    isVerified,
    isVerifying: contextIsVerifying,
    error: contextError,
    verifyProof,
    reset: resetContextState,
    isCaptchaScriptLoaded,
    appId: contextAppId,
    actionId: contextActionId,
    recaptchaSiteKey: contextRecaptchaSiteKey,
    hcaptchaSiteKey: contextHcaptchaSiteKey,
    captchaProvider,
  } = useWidCaptcha()

  // Determine effective IDs and Keys (prop overrides context)
  const appId = appIdProp || contextAppId;
  const actionId = actionIdProp || contextActionId;
  const recaptchaSiteKey = recaptchaSiteKeyProp || contextRecaptchaSiteKey;
  const hcaptchaSiteKey = hcaptchaSiteKeyProp || contextHcaptchaSiteKey;

  // Local state for widget IDs and interaction tracking
  const [captchaWidgetId, setCaptchaWidgetId] = useState<string | number | null>(null)
  const captchaContainerRef = useRef<HTMLDivElement>(null)
  const [localError, setLocalError] = useState<string | null>(null); // For widget-specific errors

  // Handle World ID verification success (after handleVerify completes)
  const handleWorldIDSuccess = (result: ISuccessResult) => {
    setCaptchaClicked(true);
    setLocalError(null);
    console.log("World ID Success (proof generated):", result);
  }

  // Handle World ID verification by calling the backend
  const handleWorldIDVerify = async (result: ISuccessResult) => {
    setCaptchaClicked(true);
    setLocalError(null);
    if (!result) {
      console.error("handleWorldIDVerify received null result.")
      setLocalError("World ID verification failed: Missing proof.");
      return;
    }
    try {
      if (onVerificationStart) {
        onVerificationStart();
      }
      const verificationResult = await verifyProof({ idkit_response: result })
      if (!verificationResult.success) {
        setLocalError(verificationResult.data || "World ID cloud verification failed.");
      }
    } catch (error) {
      console.error("Error during World ID verifyProof call:", error)
      const message = error instanceof Error ? error.message : String(error);
      setLocalError(`World ID verification error: ${message}`);
    }
  }

  // Success callback for both reCAPTCHA and hCaptcha
  const handleCaptchaSuccess = useCallback((token: string | null) => {
    setCaptchaClicked(true);
    setLocalError(null);
    if (token) {
      if (onVerificationStart) {
        onVerificationStart();
      }
      verifyProof({ captcha_token: token }).then(result => {
        if (!result.success) {
          setLocalError(result.data || `${captchaProvider} verification failed.`);
        }
      })
    } else {
      console.warn(`${captchaProvider} success callback received null token.`)
      setLocalError(`${captchaProvider} verification failed: No token received.`);
      resetContextState();
    }
  }, [captchaProvider, onVerificationStart, verifyProof, resetContextState]);

  // Expiry callback for both
  const handleCaptchaExpired = useCallback(() => {
    console.warn(`${captchaProvider} Token Expired.`);
    setLocalError(`${captchaProvider} challenge expired. Please try again.`);
    resetContextState();
  }, [captchaProvider, resetContextState]);

  // Error callback for both
  const handleCaptchaError = useCallback((error: any) => {
    console.error(`${captchaProvider} Error:`, error)
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    setLocalError(`${captchaProvider} widget error: ${message}`);
    resetContextState();
  }, [captchaProvider, resetContextState]);

  // Render reCAPTCHA v2 Widget
  useEffect(() => {
    console.log("Captcha render effect running with state:", {
      isClient,
      isCaptchaScriptLoaded,
      captchaContainerRefExists: !!captchaContainerRef.current,
      captchaWidgetId,
      containerNotEmpty: captchaContainerRef.current?.innerHTML !== '',
      grecaptchaExists: !!window.grecaptcha,
      grecaptchaRenderExists: !!(window.grecaptcha && window.grecaptcha.render)
    });

    if (!isClient || !isCaptchaScriptLoaded || !captchaContainerRef.current) {
      console.log("Not rendering captcha: conditions not met");
      return;
    }

    // Clear container before rendering
    if (captchaWidgetId === null && captchaContainerRef.current.innerHTML !== '') {
      console.log("Clearing container before rendering captcha");
      captchaContainerRef.current.innerHTML = '';
    }

    // Skip if widget ID already set
    if (captchaWidgetId !== null) {
      console.log("Not rendering captcha: widget ID already set");
      return;
    }

    // Create function to render captcha
    const renderCaptcha = () => {
      let widgetId: string | number | null = null;

      try {
        if (captchaProvider === 'recaptcha' && window.grecaptcha && window.grecaptcha.render && recaptchaSiteKey) {
          console.log("Rendering reCAPTCHA with site key:", recaptchaSiteKey);
          widgetId = window.grecaptcha.render(captchaContainerRef.current!, {
            sitekey: recaptchaSiteKey,
            callback: handleCaptchaSuccess,
            'expired-callback': handleCaptchaExpired,
            'error-callback': handleCaptchaError,
          });
        } else if (captchaProvider === 'hcaptcha' && window.hcaptcha && hcaptchaSiteKey) {
          console.log("Rendering hCaptcha with site key:", hcaptchaSiteKey);
          widgetId = window.hcaptcha.render(captchaContainerRef.current!, {
            sitekey: hcaptchaSiteKey,
            callback: handleCaptchaSuccess,
            'expired-callback': handleCaptchaExpired,
            'error-callback': handleCaptchaError,
          });
        } else {
          console.warn(`Captcha provider ${captchaProvider} selected, but dependencies not ready:`, {
            provider: captchaProvider,
            grecaptchaExists: !!window.grecaptcha,
            grecaptchaRenderExists: !!(window.grecaptcha && window.grecaptcha.render),
            hcaptchaExists: !!window.hcaptcha,
            recaptchaSiteKey: !!recaptchaSiteKey,
            hcaptchaSiteKey: !!hcaptchaSiteKey
          });
          return false;
        }

        if (widgetId !== null) {
          setCaptchaWidgetId(widgetId);
          console.log(`${captchaProvider} widget rendered successfully with ID:`, widgetId);
          return true;
        } else {
          console.error(`Failed to get widget ID for ${captchaProvider}.`);
          setLocalError(`Failed to render ${captchaProvider} widget.`);
          return false;
        }
      } catch (renderError) {
        console.error(`Error rendering ${captchaProvider} widget:`, renderError);
        handleCaptchaError(renderError);
        return false;
      }
    };

    // Try immediate render
    if (!renderCaptcha()) {
      // If immediate render fails, try again after a delay
      console.log("First render attempt failed, trying again in 500ms");
      const retryTimeout = setTimeout(() => {
        console.log("Retrying captcha render...");
        renderCaptcha();
      }, 500);

      return () => clearTimeout(retryTimeout);
    }

  }, [
    isClient,
    isCaptchaScriptLoaded,
    captchaProvider,
    recaptchaSiteKey,
    hcaptchaSiteKey,
    handleCaptchaSuccess,
    handleCaptchaExpired,
    handleCaptchaError,
    captchaWidgetId
  ]);

  // Reset logic
  const handleResetClick = useCallback(() => {
    console.log("Resetting CAPTCHA state and widget...");
    resetContextState();
    setCaptchaClicked(false);
    setLocalError(null);

    if (captchaWidgetId !== null) {
      try {
        if (captchaProvider === 'recaptcha' && window.grecaptcha?.reset) {
          window.grecaptcha.reset(captchaWidgetId as number);
          console.log("reCAPTCHA widget reset.");
        } else if (captchaProvider === 'hcaptcha' && window.hcaptcha?.reset) {
          window.hcaptcha.reset(captchaWidgetId as string);
          console.log("hCaptcha widget reset.");
        }
      } catch (resetError) {
        console.error(`Error resetting ${captchaProvider} widget (${captchaWidgetId}):`, resetError);
      }
    }

    setCaptchaWidgetId(null);
    if (captchaContainerRef.current) {
      captchaContainerRef.current.innerHTML = '';
    }
  }, [resetContextState, captchaWidgetId, captchaProvider]);

  // Render custom children if provided
  if (children) {
    return React.cloneElement(children as React.ReactElement, {
      isVerified,
      isVerifying: contextIsVerifying,
      error: contextError || localError,
      reset: handleResetClick,
      renderWorldIDWidget: () => (
        <IDKitWidget
          app_id={appId! as `app_${string}`}
          action={actionId!}
          signal={signal}
          verification_level={verificationLevel}
          handleVerify={handleWorldIDVerify}
          onSuccess={handleWorldIDSuccess}
          container_id={worldIdContainerId}
        >
          {({ open }) => <Button onClick={open}>Verify with World ID</Button>}
        </IDKitWidget>
      ),
      renderCaptchaWidget: () => (
        <div ref={captchaContainerRef} className="captcha-widget-container my-4"></div>
      ),
      captchaProvider
    } as any);
  }

  // Default UI Card (can be hidden with hideDefaultUICard)
  if (hideDefaultUICard) {
    return null;
  }

  // Determine overall error state
  const currentError = contextError?.message || localError;

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border border-gray-200 dark:border-gray-700">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl font-semibold">Human Verification</CardTitle>
        {signalDescription && <CardDescription className="text-sm text-gray-500 dark:text-gray-400 pt-1">{signalDescription}</CardDescription>}
      </CardHeader>

      <CardContent className="px-6 py-4">
        {/* Loading State (Script Loading) */}
        {!isClient || (!isCaptchaScriptLoaded && captchaProvider !== 'recaptcha' && captchaProvider !== 'hcaptcha') && (
          <div className="text-center text-sm text-gray-500 h-[150px] flex flex-col justify-center items-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-500" />
            <p className="mt-2">Loading verification...</p>
          </div>
        )}

        {isClient && isCaptchaScriptLoaded && (
          <>
            {/* Verified State */}
            {isVerified && !contextIsVerifying && !currentError && (
              <div className="text-center text-green-600 dark:text-green-400 py-8">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="font-medium">Verification Successful!</p>
              </div>
            )}

            {/* Verifying State (API call in progress) */}
            {contextIsVerifying && (
              <div className="text-center text-sm text-gray-500 dark:text-gray-400 h-[150px] flex flex-col justify-center items-center bg-gray-50 dark:bg-gray-800 rounded-md p-4 border border-gray-200 dark:border-gray-700">
                <Loader2 className="mx-auto h-8 w-8 animate-spin mb-3 text-blue-500" />
                <p className="text-base font-medium text-gray-700 dark:text-gray-300">Verifying...</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Please wait</p>
              </div>
            )}

            {/* Error State */}
            {!isVerified && !contextIsVerifying && currentError && (
              <div className="text-center text-red-600 dark:text-red-400 py-4 px-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/30 rounded-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="font-medium text-sm mb-2">Verification Failed</p>
                <p className="text-xs text-red-700 dark:text-red-300 break-words">{currentError}</p>
              </div>
            )}

            {/* Initial / Ready State (Not verifying, not verified, no error) */}
            {!isVerified && !contextIsVerifying && !currentError && (
              <div className="space-y-4">
                {/* World ID Button */}
                {appId && actionId && (
                  <div className="text-center">
                    <IDKitWidget
                      app_id={appId as `app_${string}`}
                      action={actionId}
                      signal={signal}
                      verification_level={verificationLevel}
                      handleVerify={handleWorldIDVerify}
                      onSuccess={handleWorldIDSuccess}
                      container_id={worldIdContainerId}
                    >
                      {({ open }) =>
                        <Button onClick={open} variant="outline" className="w-full justify-center items-center space-x-2 border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700">
                          <svg className="w-5 h-5" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 31C24.2843 31 31 24.2843 31 16C31 7.71573 24.2843 1 16 1C7.71573 1 1 7.71573 1 16C1 24.2843 7.71573 31 16 31Z" fill="black" stroke="white" strokeWidth="2" /><path d="M16.0001 25.9999C18.3175 25.9999 20.5436 25.3232 22.3839 24.066C24.2242 22.8088 25.5915 20.0161 25.5915 16.9428C25.5915 13.8695 24.2242 11.0768 22.3839 9.81957C20.5436 8.56236 18.3175 7.88568 16.0001 7.88568C13.6826 7.88568 11.4565 8.56236 9.61621 9.81957C7.77592 11.0768 6.40858 13.8695 6.40858 16.9428C6.40858 20.0161 7.77592 22.8088 9.61621 24.066C11.4565 25.3232 13.6826 25.9999 16.0001 25.9999Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M16 17.5571V25.9999" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          <span>Verify with World ID</span>
                        </Button>
                      }
                    </IDKitWidget>
                  </div>
                )}

                {/* Divider */}
                {appId && actionId && (captchaProvider === 'recaptcha' || captchaProvider === 'hcaptcha') && (
                  <div className="relative flex items-center py-1">
                    <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                    <span className="flex-shrink mx-3 text-gray-400 dark:text-gray-500 text-xs font-medium">OR</span>
                    <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                  </div>
                )}

                {/* CAPTCHA Widget Placeholder */}
                {(captchaProvider === 'recaptcha' || captchaProvider === 'hcaptcha') && (
                  <>
                    {/* Loading Messages (Outside the captcha container) - Hide when widget ID exists */}
                    {!captchaWidgetId && captchaContainerRef.current?.childElementCount === 0 && (
                      <div className="text-center py-2 mb-2">
                        {isCaptchaScriptLoaded ? (
                          <p className="text-xs text-gray-400">Loading {captchaProvider}...</p>
                        ) : (
                          <p className="text-xs text-gray-400">Waiting for {captchaProvider} script to load...</p>
                        )}
                      </div>
                    )}

                    {/* Empty container for captcha widget */}
                    <div ref={captchaContainerRef} className="captcha-widget-container min-h-[78px] flex justify-center items-center"></div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Footer (only shown if verified or error occurred) */}
      {(isVerified || currentError) && !contextIsVerifying && (
        <CardFooter className="pt-4 pb-5 px-6 border-t border-gray-200 dark:border-gray-700">
          <Button onClick={handleResetClick} variant="secondary" size="sm" className="w-full text-xs">
            {isVerified ? "Verified" : "Reset Verification"}
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
