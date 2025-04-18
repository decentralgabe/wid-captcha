'use client';

import React from 'react';
import { WidCaptchaProvider } from '@/wid-captcha-context'; // Adjust path if needed

interface CaptchaProviderWrapperProps {
    appId: string;
    actionId: string;
    recaptchaSiteKey: string;
    children: React.ReactNode;
}

export function CaptchaProviderWrapper({
    appId,
    actionId,
    recaptchaSiteKey,
    children
}: CaptchaProviderWrapperProps) {

    // Define handlers *inside* the Client Component
    const handleVerificationResult = (result: any) => {
        console.log("CaptchaProviderWrapper Verification Result:", result);
        // Optional: Add global handling logic here (e.g., update analytics, user state)
    };

    const handleError = (error: Error) => {
        console.error("CaptchaProviderWrapper Verification Error:", error);
        // Optional: Add global error handling/reporting here
    };

    return (
        <WidCaptchaProvider
            appId={appId}
            actionId={actionId}
            recaptchaSiteKey={recaptchaSiteKey}
            onVerificationComplete={handleVerificationResult}
            onError={handleError}
        >
            {children}
        </WidCaptchaProvider>
    );
} 