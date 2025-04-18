# World ID CAPTCHA Wrapper

A React component that provides human verification using World ID with a configurable CAPTCHA provider (reCAPTCHA v2 or hCaptcha) as a fallback, powered by a Next.js API route for server-side verification.

**Table of Contents**

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Install Dependencies](#2-install-dependencies)
  - [3. Configure Environment Variables](#3-configure-environment-variables)
- [Running Locally](#running-locally)
- [Building for Production](#building-for-production)
- [Usage](#usage)
  - [1. Wrap with Provider (`WidCaptchaProvider`)](#1-wrap-with-provider-widcaptchaprovider)
  - [2. Use the Default Component (`WidCaptcha`)](#2-use-the-default-component-widcaptcha)
  - [3. Build a Custom UI (`useWidCaptcha` Hook)](#3-build-a-custom-ui-usewidcaptcha-hook)
- [How it Works](#how-it-works)
- [Linting](#linting)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Features

- Primary verification through World ID (via `@worldcoin/idkit`).
- Configurable fallback verification using either Google reCAPTCHA v2 (Checkbox) or hCaptcha (Checkbox).
- Server-side verification of proofs/tokens via a Next.js API Route (`/api/verify-captcha`).
- Configurable verification priority (World ID first or CAPTCHA first) via environment variables.
- Uses React Context (`WidCaptchaProvider`) for state management and configuration (`appId`, `actionId`, CAPTCHA keys, provider choice).
- Provides a default UI component (`WidCaptcha`) using Shadcn UI components, dynamically rendering the chosen CAPTCHA widget.
- Allows for custom UI integration using the `useWidCaptcha` hook.
- TypeScript support.
- Development mode warnings for missing configuration.

## Prerequisites

- Node.js (Check `.nvmrc` or `package.json` engines field if available, otherwise use a recent LTS version)
- pnpm (Version specified in `package.json` -> `packageManager` field)

## Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-username/wid-captcha.git # Replace with actual repo URL if applicable
cd wid-captcha
```

### 2. Install Dependencies

This project uses pnpm for package management.

```bash
pnpm install
```
This command reads the `package.json` and installs the exact dependencies specified in `pnpm-lock.yaml`.

### 3. Configure Environment Variables

- Copy the example environment file:
  ```bash
  cp .env.example .env.local
  ```
- Obtain the necessary keys/IDs:
  - **World ID:** Create an application and action on the [Worldcoin Developer Portal](https://developer.worldcoin.org/).
    - **App ID:** Find under your Application details (looks like `app_...`).
    - **Action ID:** Find or create under your Application -> Actions (e.g., `signup`, `login`).
  - **reCAPTCHA (if using):** Set up a reCAPTCHA v2 Checkbox site on the [Google Cloud Console -> Security -> reCAPTCHA Enterprise](https://console.cloud.google.com/security/recaptcha) (or standard reCAPTCHA admin console if not using Enterprise).
    - **Site Key:** Used in the frontend.
    - **Secret Key:** Used **only** in the backend API. Keep this secure!
  - **hCaptcha (if using):** Set up a site on the [hCaptcha Dashboard](https://dashboard.hcaptcha.com/).
    - **Site Key:** Used in the frontend (Sites -> Your Site -> Settings).
    - **Secret Key:** Used **only** in the backend API. Find in your Account Settings (`Profile Icon` -> `Settings`) - **Keep Secret!**
- Fill in the values in `.env.local`. **Keep secrets like `RECAPTCHA_SECRET_KEY` and `HCAPTCHA_SECRET_KEY` secure and never commit them to version control.**

**Environment Variables Overview:**

| Variable                          | Scope        | Description                                                                  | Example             | Required                  | Location Obtained                                                                                                              |
| :-------------------------------- | :----------- | :--------------------------------------------------------------------------- | :------------------ | :------------------------ | :----------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_WLD_APP_ID`          | Client-Side  | Your World ID **App ID**.                                                    | `app_1234...`       | Yes                       | [Worldcoin Developer Portal](https://developer.worldcoin.org/) (Application Details)                                           |
| `NEXT_PUBLIC_WLD_ACTION_ID`       | Client-Side  | Your World ID **Action ID**.                                                 | `signup`            | Yes                       | [Worldcoin Developer Portal](https://developer.worldcoin.org/) (Application -> Actions)                                        |
| `CAPTCHA_PROVIDER`                | Server-Side  | Selects CAPTCHA service: `recaptcha` or `hcaptcha`. Defaults to `recaptcha`. | `hcaptcha`          | No (defaults `recaptcha`) | -                                                                                                              |
| `NEXT_PUBLIC_CAPTCHA_PROVIDER`    | Client-Side  | **Must match `CAPTCHA_PROVIDER`**. Used by frontend to load correct script. | `hcaptcha`          | No (defaults `recaptcha`) | -                                                                                                              |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`  | Client-Side  | Google reCAPTCHA v2 **Site Key**.                                            | `6LeIxAcTAAAAAJ...` | Yes (if `CAPTCHA_PROVIDER` is `recaptcha`) | [Google Cloud Console / reCAPTCHA Admin](https://console.cloud.google.com/security/recaptcha) (Site Settings)                 |
| `RECAPTCHA_SECRET_KEY`            | Server-Side  | Google reCAPTCHA v2 **Secret Key**. **Keep Secret!**                           | `6LeIxAcTAAAAAG...` | Yes (if `CAPTCHA_PROVIDER` is `recaptcha`) | [Google Cloud Console / reCAPTCHA Admin](https://console.cloud.google.com/security/recaptcha) (Site Settings)                 |
| `NEXT_PUBLIC_HCAPTCHA_SITE_KEY`   | Client-Side  | hCaptcha **Site Key**.                                                       | `10000000-ffff...`  | Yes (if `CAPTCHA_PROVIDER` is `hcaptcha`)  | [hCaptcha Dashboard](https://dashboard.hcaptcha.com/) (Site Settings)                                                          |
| `HCAPTCHA_SECRET_KEY`             | Server-Side  | hCaptcha **Secret Key**. **Keep Secret!**                                      | `0x0000000000...`   | Yes (if `CAPTCHA_PROVIDER` is `hcaptcha`)  | [hCaptcha Dashboard](https://dashboard.hcaptcha.com/) (Account Settings)                                                       |
| `PRIMARY_VERIFIER`                | Server-Side  | Order for backend check: `worldid` (default) or `captcha`.                   | `worldid`           | No                        | -                                                                                                              |

*Note: Prefixes like `NEXT_PUBLIC_` are required by Next.js to expose variables to the browser/client-side code.*

## Running Locally

To start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) (or the specified port) in your browser. Check the browser console for any warnings from `WidCaptchaProvider` about missing configuration for the selected `CAPTCHA_PROVIDER`.
The example page (`example-page.tsx`) demonstrates component usage.

## Building for Production

Ensure all environment variables are correctly configured in your deployment environment, corresponding to the selected `CAPTCHA_PROVIDER`.

To create an optimized production build:

```bash
pnpm build
```

To run the production server:

```bash
pnpm start
```

## Usage

### 1. Wrap with Provider (`WidCaptchaProvider`)

Wrap your application's root layout or relevant component tree section with `WidCaptchaProvider`. This initializes the context, loads the correct CAPTCHA script based on `NEXT_PUBLIC_CAPTCHA_PROVIDER`, and provides configuration to child components/hooks.

**Props:**
- `appId` (string, required): Your World ID Application ID.
- `actionId` (string, required): Your World ID Action ID.
- `recaptchaSiteKey?` (string): Optional override for `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`.
- `hcaptchaSiteKey?` (string): Optional override for `NEXT_PUBLIC_HCAPTCHA_SITE_KEY`.
- `onVerificationComplete?` (function): Callback fired when verification succeeds *or* fails. Receives `{ success: boolean, method: VerificationMethod, data: any, details?: Record<string, any> }`.
- `onError?` (function): Callback fired on script loading errors or internal errors.

```tsx
// Example: app/layout.tsx
import { WidCaptchaProvider } from "@/path/to/wid-captcha-context"; // Adjust path

export default function RootLayout({ children }: { children: React.ReactNode }) {
    // Read client-side variables from environment
    const worldIdAppId = process.env.NEXT_PUBLIC_WLD_APP_ID;
    const worldIdActionId = process.env.NEXT_PUBLIC_WLD_ACTION_ID;
    const recaptchaKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    const hcaptchaKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;
    const provider = process.env.NEXT_PUBLIC_CAPTCHA_PROVIDER;

    // Basic checks (can be more robust)
    if (!worldIdAppId || !worldIdActionId) {
        console.error("Essential World ID environment variables missing.");
        // Render fallback...
    }
    if (provider === 'recaptcha' && !recaptchaKey) {
         console.error("reCAPTCHA provider selected, but NEXT_PUBLIC_RECAPTCHA_SITE_KEY missing.");
         // Render fallback...
    }
    if (provider === 'hcaptcha' && !hcaptchaKey) {
         console.error("hCaptcha provider selected, but NEXT_PUBLIC_HCAPTCHA_SITE_KEY missing.");
         // Render fallback...
    }


    const handleVerificationResult = (result: any) => {
        console.log("Global Verification Result:", result);
        // { success: boolean, method: 'world_id' | 'recaptcha' | 'hcaptcha' | 'none', data: any, details?: any }
    };

    const handleError = (error: Error) => {
        console.error("Global Verification Error:", error);
    };

    return (
        <html lang="en">
            <body>
                <WidCaptchaProvider
                    appId={worldIdAppId!} // Use non-null assertion if check passed
                    actionId={worldIdActionId!} // Use non-null assertion if check passed
                    // Pass keys; context uses env vars as primary source but allows overrides
                    recaptchaSiteKey={recaptchaKey}
                    hcaptchaSiteKey={hcaptchaKey}
                    onVerificationComplete={handleVerificationResult}
                    onError={handleError}
                >
                    {children}
                </WidCaptchaProvider>
            </body>
        </html>
    );
}
```

### 2. Use the Default Component (`WidCaptcha`)

Place the `WidCaptcha` component where you need the standard verification UI (World ID button + the configured CAPTCHA widget).

**Props:**
- `appId?`: Optional override for context `appId`.
- `actionId?`: Optional override for context `actionId`.
- `recaptchaSiteKey?`: Optional override for context `recaptchaSiteKey`.
- `hcaptchaSiteKey?`: Optional override for context `hcaptchaSiteKey`.
- `signal?` (string): Optional value passed to World ID verification (and API). Should be unique per user action.
- `signalDescription?` (string): Text displayed above the verification methods.
- `verificationLevel?` (`VerificationLevel` from `@worldcoin/idkit`): Optional, e.g., `VerificationLevel.Device`.
- `onVerificationComplete?` (function): Component-level callback.
- `onVerificationStart?` (function): Callback when verification starts.
- `onError?` (function): Component-level error callback.
- `hideDefaultUICard?` (boolean): Set to true to hide the default card UI (useful if using custom children).

*Note: Configuration like `appId`, `actionId`, CAPTCHA provider, and site keys are automatically obtained from the `WidCaptchaProvider` context unless explicitly overridden by props.*

```tsx
// Example: components/MyProtectedForm.tsx
import { WidCaptcha } from '@/path/to/wid-captcha'; // Adjust path
import { useWidCaptcha } from '@/path/to/wid-captcha-context';
import { VerificationLevel } from "@worldcoin/idkit";

function MyProtectedForm() {
    const { isVerified, verificationMethod } = useWidCaptcha(); // Use hook to check status

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!isVerified) {
            alert("Please verify you are human first!");
            return;
        }
        console.log("Form submitted! Verified via:", verificationMethod);
        // Proceed with form submission logic
    };

    return (
        <form onSubmit={handleSubmit}>
            <h2>Verify to Submit</h2>
            {/* Form fields */}
            <WidCaptcha
                signal="user-signup-123" // Example signal
                signalDescription="Complete one check below"
                // verificationLevel={VerificationLevel.Device}
            />
            <button type="submit" disabled={!isVerified}>
                 Submit {isVerified ? `(Verified via ${verificationMethod})` : ""}
            </button>
        </form>
    );
}
```

### 3. Build a Custom UI (`useWidCaptcha` Hook)

For full control over the UI and verification flow, use the `useWidCaptcha` hook within a component wrapped by `WidCaptchaProvider`.

**Hook Return Values:**
- `isVerified` (boolean): Current verification status.
- `isVerifying` (boolean): True if an API call is in progress.
- `verificationMethod` ('world_id' | 'recaptcha' | 'hcaptcha' | 'none'): Which method succeeded.
- `error` (Error | null): Any error object from API calls or script loading.
- `verifyProof` (function): Call this with the World ID proof object (`{ idkit_response: proof }`) or the CAPTCHA token (`{ captcha_token: token }`).
- `reset` (function): Resets verification state (use `handleResetClick` from `WidCaptcha` for full widget reset).
- `isCaptchaScriptLoaded` (boolean): True if the configured CAPTCHA script has loaded.
- `captchaProvider` ('recaptcha' | 'hcaptcha'): Which provider is configured.
- `appId` (string | null): World ID App ID from context.
- `actionId` (string | null): World ID Action ID from context.
- `recaptchaSiteKey` (string | null): reCAPTCHA site key from context.
- `hcaptchaSiteKey` (string | null): hCaptcha site key from context.

```tsx
// Example: components/CustomVerification.tsx
import { useWidCaptcha } from '@/path/to/wid-captcha-context'; // Adjust path
import { Button } from '@/components/ui/button';
import { IDKitWidget, VerificationLevel } from "@worldcoin/idkit"; // Import IDKitWidget
import React, { useCallback, useRef, useEffect } from 'react';

function CustomVerificationFlow() {
    const {
        isVerified,
        isVerifying,
        error,
        verifyProof, // Unified function
        reset,
        isCaptchaScriptLoaded,
        captchaProvider,
        appId,
        actionId,
        recaptchaSiteKey, // Key available from context
        hcaptchaSiteKey,  // Key available from context
    } = useWidCaptcha();

    const captchaContainerRef = useRef<HTMLDivElement>(null);
    const [captchaWidgetId, setCaptchaWidgetId] = useState<string | number | null>(null);

    // --- World ID ---
    const handleWorldIdSuccess = useCallback((proof: any) => { // Type proof if possible
        console.log("World ID Proof received:", proof);
        verifyProof({ idkit_response: proof });
    }, [verifyProof]);

    // --- CAPTCHA ---
    const handleCaptchaSuccess = useCallback((token: string | null) => {
        if (token) {
            console.log(`${captchaProvider} token received.`);
            verifyProof({ captcha_token: token });
        } else {
             console.warn(`${captchaProvider} success callback received null token.`);
             reset(); // Reset state if captcha fails internally
        }
    }, [verifyProof, captchaProvider, reset]);

    const handleCaptchaExpired = useCallback(() => {
        console.warn(`${captchaProvider} Token Expired.`);
        reset();
        // Optionally force re-render widget if needed
        setCaptchaWidgetId(null);
        if (captchaContainerRef.current) captchaContainerRef.current.innerHTML = '';
    }, [captchaProvider, reset]);

    const handleCaptchaError = useCallback((error: any) => {
        console.error(`${captchaProvider} Error:`, error)
        reset();
        setCaptchaWidgetId(null);
        if (captchaContainerRef.current) captchaContainerRef.current.innerHTML = '';
    }, [captchaProvider, reset]);

    // Render CAPTCHA widget
    useEffect(() => {
        if (!isCaptchaScriptLoaded || !captchaContainerRef.current || captchaWidgetId !== null || isVerified) return;

        const currentContainer = captchaContainerRef.current;
        if (currentContainer.innerHTML !== '') return; // Avoid re-rendering if manually cleared but state not updated

        let widgetId: string | number | null = null;
        const siteKey = captchaProvider === 'recaptcha' ? recaptchaSiteKey : hcaptchaSiteKey;

        if (!siteKey) {
            console.error(`Site key for ${captchaProvider} not found in context.`);
            return;
        }

        try {
            if (captchaProvider === 'recaptcha' && window.grecaptcha) {
                 widgetId = window.grecaptcha.render(currentContainer, { sitekey: siteKey, callback: handleCaptchaSuccess, 'expired-callback': handleCaptchaExpired, 'error-callback': handleCaptchaError });
            } else if (captchaProvider === 'hcaptcha' && window.hcaptcha) {
                 widgetId = window.hcaptcha.render(currentContainer, { sitekey: siteKey, callback: handleCaptchaSuccess, 'expired-callback': handleCaptchaExpired, 'error-callback': handleCaptchaError });
            }
            if (widgetId !== null) setCaptchaWidgetId(widgetId);
        } catch (renderError) {
            console.error(`Failed to render ${captchaProvider} widget:`, renderError);
            handleCaptchaError(renderError); // Trigger reset/cleanup
        }
        // No direct cleanup needed, reset handles it
    }, [isCaptchaScriptLoaded, captchaProvider, recaptchaSiteKey, hcaptchaSiteKey, captchaWidgetId, isVerified, handleCaptchaSuccess, handleCaptchaExpired, handleCaptchaError]);


    // --- Render ---
    if (!appId || !actionId) {
        return <div>Error: Essential World ID config missing from provider.</div>;
    }

    if (isVerified) {
        return (
            <div>
                <p>✅ You are verified!</p>
                <Button onClick={() => {
                    reset();
                    setCaptchaWidgetId(null); // Ensure widget ID is cleared for re-render
                    if (captchaContainerRef.current) captchaContainerRef.current.innerHTML = ''; // Force clear container
                }}>Reset Verification</Button>
            </div>
        );
    }

    return (
        <div>
            <h4>Choose Verification Method:</h4>
            {error && <p style={{ color: 'red' }}>Error: {error.message}</p>}

            {/* World ID */}
            <IDKitWidget
                app_id={appId as `app_${string}`}
                action={actionId}
                onSuccess={handleWorldIdSuccess}
                signal="custom-user-signal-456"
            >
              {({ open }) => ( <Button onClick={open} disabled={isVerifying}>{isVerifying ? 'Verifying...' : 'Verify with World ID'}</Button> )}
            </IDKitWidget>

            <hr style={{ margin: '20px 0' }}/>

            {/* CAPTCHA */}
            {!isCaptchaScriptLoaded && <p>Loading {captchaProvider}...</p>}
            <div ref={captchaContainerRef} style={{ minHeight: '80px' }}>
                {/* Container for the CAPTCHA widget */}
            </div>
             {isVerifying && <p>Verifying...</p>}
        </div>
    );
}
```
*Note: This custom example shows how to render the CAPTCHA widget manually using the context's state and keys. Resetting requires manually clearing the widget ID state and the container.*

## How it Works

1.  **Frontend (`WidCaptchaProvider`, `WidCaptcha`, `useWidCaptcha`):**
    *   The `WidCaptchaProvider` reads `NEXT_PUBLIC_CAPTCHA_PROVIDER` to determine which CAPTCHA service to use (`recaptcha` or `hcaptcha`).
    *   It loads the corresponding script (`api.js` for reCAPTCHA, `1/api.js` for hCaptcha) and provides configuration (World ID `appId`, `actionId`, and the relevant **client-side** CAPTCHA Site Key) via React Context.
    *   The `WidCaptcha` component (or custom UI) uses context values to configure `IDKitWidget` and render the appropriate CAPTCHA widget (`<div class="g-recaptcha">` or `<div class="h-captcha">`) using the site key from context.
    *   On World ID success, `IDKitWidget` provides a `proof`. The component calls the context's `verifyProof({ idkit_response: proof })`.
    *   When the CAPTCHA challenge is solved, the widget provides a `token`. The component calls the context's `verifyProof({ captcha_token: token })`.
2.  **Backend API Route (`app/api/verify-captcha/route.ts`):**
    *   Reads server-side environment variables, including `CAPTCHA_PROVIDER` and the corresponding **Secret Key** (`RECAPTCHA_SECRET_KEY` or `HCAPTCHA_SECRET_KEY`).
    *   Receives the POST request with either `idkit_response` or the generic `captcha_token`.
    *   Based on `PRIMARY_VERIFIER`, it calls the corresponding verification service first (Worldcoin API or the selected CAPTCHA API).
    *   World ID: Verifies the `proof` against the server-side `WLD_APP_ID` and `WLD_ACTION_ID`.
    *   CAPTCHA: Based on `CAPTCHA_PROVIDER`, calls either Google's `/siteverify` or hCaptcha's `/siteverify` endpoint with the `captcha_token` and the appropriate **server-side Secret Key**.
    *   Returns a JSON response: `{ success: boolean, message?: string, method?: string, error?: string, details?: any }`.
3.  **State Update:** The `WidCaptchaProvider` context updates its state (`isVerified`, `isVerifying`, `error`, `verificationMethod`) based on the API response, causing consuming components to re-render.

## Linting

To check the code style and identify potential errors:

```bash
pnpm lint
```

## Troubleshooting

- **`Error: Client-side CAPTCHA configuration missing.` (Layout/Provider)**: Ensure `NEXT_PUBLIC_WLD_APP_ID`, `NEXT_PUBLIC_WLD_ACTION_ID` are set. Also check `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` (if using reCAPTCHA) or `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` (if using hCaptcha).
- **`[WidCaptchaProvider] Missing required prop: ...` / `[useWidCaptcha] Error: ... missing from context.` (Console)**: Verify `appId`, `actionId` are passed to `<WidCaptchaProvider>`. Also check that the correct CAPTCHA site key (`recaptchaSiteKey` or `hcaptchaSiteKey`) is provided (either via prop or env var `NEXT_PUBLIC_...`) based on the selected `NEXT_PUBLIC_CAPTCHA_PROVIDER`.
- **`Failed to load [recaptcha|hcaptcha] script` (Console Error):** Check network connectivity, firewall rules, ad-blockers, or potential conflicts with other scripts. Ensure the correct script URL is being loaded by the context based on `NEXT_PUBLIC_CAPTCHA_PROVIDER`.
- **CAPTCHA Widget Doesn't Appear:**
    - Check the browser console for errors (script loading, rendering errors).
    - Ensure `NEXT_PUBLIC_CAPTCHA_PROVIDER` is correctly set (`recaptcha` or `hcaptcha`).
    - Ensure the corresponding `NEXT_PUBLIC_..._SITE_KEY` is set and correct for the domain you are testing on.
    - Verify the `captchaContainerRef` div is present in the DOM before the render `useEffect` runs.
- **World ID Verification Fails (400 Error from API):**
    - Ensure the `action` configured on the [Worldcoin Developer Portal](https://developer.worldcoin.org/) matches the `actionId` you are using.
    - If using a `signal`, make sure the signal passed matches the one expected/verified by the backend.
- **CAPTCHA Verification Fails (API responds with `success: false`):**
    - Verify the **server-side** `CAPTCHA_PROVIDER` environment variable matches the frontend (`recaptcha` or `hcaptcha`).
    - Verify the correct **server-side** Secret Key (`RECAPTCHA_SECRET_KEY` or `HCAPTCHA_SECRET_KEY`) is configured in your environment and matches the Site Key being used on the frontend.
    - Check the `details` field in the API response or server logs for specific error codes from the CAPTCHA provider (e.g., `invalid-input-secret`, `invalid-input-response`, `sitekey-secret-mismatch`).
    - Check the domain/hostname configuration for your Site Key in the respective CAPTCHA provider's dashboard.

## License

MIT
