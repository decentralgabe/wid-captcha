import type React from "react"
export interface WidCaptchaProps {
  // World ID props
  appId: string
  actionId: string
  signalDescription?: string
  onSuccessWorldId?: (proof: any) => void

  // reCAPTCHA props
  recaptchaSiteKey: string
  onSuccessRecaptcha?: (token: string) => void

  // Common props
  onVerificationComplete: (result: VerificationResult) => void
  onError?: (error: Error) => void
  children?: React.ReactNode
}

export type VerificationMethod = "world_id" | "recaptcha" | "none"

export interface VerificationResult {
  success: boolean
  method: VerificationMethod
  data: any // World ID proof or reCAPTCHA token
}

export interface WidCaptchaContextType {
  isVerified: boolean
  isVerifying: boolean
  verificationMethod: VerificationMethod
  error: Error | null
  verifyProof: (payload: { idkit_response?: any; recaptcha_token?: string }) => Promise<VerificationResult>
  reset: () => void
  isRecaptchaScriptLoaded: boolean
  // Keeping verify for backward compatibility if needed
  verify?: () => Promise<VerificationResult>
}
