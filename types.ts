import type React from "react"

// Keep original props for reference, but primary config comes from context/env
export interface WidCaptchaProps {
  appId?: string // Optional, can come from context
  actionId?: string // Optional, can come from context
  signalDescription?: string
  onSuccessWorldId?: (proof: any) => void // Consider removing if context handles all

  // CAPTCHA props - Keep for potential overrides, though context is preferred
  recaptchaSiteKey?: string
  hcaptchaSiteKey?: string // Add hCaptcha key prop
  onSuccessCaptcha?: (token: string, provider: 'recaptcha' | 'hcaptcha') => void // Unified success callback

  // Common props
  onVerificationComplete: (result: VerificationResult) => void
  onVerificationStart?: () => void // Added for consistency
  onError?: (error: Error) => void
  children?: React.ReactNode
}

// Defines the method used for successful verification, or none
export type VerificationMethod = "world_id" | "recaptcha" | "hcaptcha" | "none";

// Structure of the result passed to onVerificationComplete
export interface VerificationResult {
  success: boolean
  method: VerificationMethod
  data: any // Message string or error data
  details?: Record<string, any>; // Optional: Additional details from verification API (like score)
}

// Defines the shape of the context provided by WidCaptchaProvider
export interface WidCaptchaContextType {
  isVerified: boolean
  isVerifying: boolean
  verificationMethod: VerificationMethod
  error: Error | null
  // Updated verifyProof to accept a generic captcha_token
  verifyProof: (payload: { idkit_response?: any; captcha_token?: string }) => Promise<VerificationResult>
  reset: () => void
  isCaptchaScriptLoaded: boolean // Renamed from isRecaptchaScriptLoaded
  // Add captcha provider and site keys to context for components
  captchaProvider: 'recaptcha' | 'hcaptcha';
  recaptchaSiteKey: string | null;
  hcaptchaSiteKey: string | null;
  // Expose appId and actionId from provider
  appId: string | null;
  actionId: string | null;

  // Deprecated verify - remove if not used elsewhere
  verify?: () => Promise<VerificationResult>
}
