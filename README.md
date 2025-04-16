# World ID CAPTCHA Wrapper

A React component that provides human verification using World ID with reCAPTCHA as a fallback, powered by a Next.js API route for server-side verification.

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

- Primary verification through World ID (via `@worldcoin/idkit`)
- Fallback verification using Google reCAPTCHA v3 (invisible).
- Server-side verification of proofs/tokens via a Next.js API Route (`/api/verify-captcha`).
- Configurable verification priority (World ID first or reCAPTCHA first) via environment variables.
- Uses React Context (`WidCaptchaProvider`) for state management and configuration (`appId`, `actionId`).
- Provides a default UI component (`WidCaptcha`) using Shadcn UI components.
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
  - **reCAPTCHA:** Set up a reCAPTCHA v3 site on the [Google Cloud Console -> Security -> reCAPTCHA Enterprise](https://console.cloud.google.com/security/recaptcha) (or standard reCAPTCHA admin console if not using Enterprise).
    - **Site Key:** Used in the frontend.
    - **Secret Key:** Used **only** in the backend API. Keep this secure!
- Fill in the values in `.env.local`. **Keep secrets like `RECAPTCHA_SECRET_KEY` secure and never commit them to version control.**

**Environment Variables Overview:**

| Variable                          | Scope        | Description                                                      | Example             | Required | Location Obtained                                                                                                              |
| :-------------------------------- | :----------- | :--------------------------------------------------------------- | :------------------ | :------- | :----------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_WLD_APP_ID`          | Client-Side  | Your World ID **App ID**. Prefix required by Next.js.            | `app_1234...`       | Yes      | [Worldcoin Developer Portal](https://developer.worldcoin.org/) (Application Details)                                           |
| `NEXT_PUBLIC_WLD_ACTION_ID`       | Client-Side  | Your World ID **Action ID**. Prefix required by Next.js.           | `signup`            | Yes      | [Worldcoin Developer Portal](https://developer.worldcoin.org/) (Application -> Actions)                                        |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`  | Client-Side  | Your Google reCAPTCHA v3 **Site Key**. Prefix required by Next.js. | `6LeIxAcTAAAAAJ...` | Yes      | [Google Cloud Console / reCAPTCHA Admin](https://console.cloud.google.com/security/recaptcha) (Site Settings)                 |
| `RECAPTCHA_SECRET_KEY`            | Server-Side  | Your Google reCAPTCHA v3 **Secret Key**. **No** prefix.          | `6LeIxAcTAAAAAG...` | Yes      | [Google Cloud Console / reCAPTCHA Admin](https://console.cloud.google.com/security/recaptcha) (Site Settings - **Keep Secret!**) |
| `VERIFICATION_PRIORITY`           | Server-Side  | Order for backend check: `worldid` (default) or `recaptcha`.     | `worldid`           | No       | -                                                                                                              |


## Running Locally

To start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) (or the specified port) in your browser. Check the browser console for any warnings from `WidCaptchaProvider` about missing configuration.
The example page (`example-page.tsx`) demonstrates component usage.

## Building for Production

Ensure all server-side environment variables (`NEXT_PUBLIC_WLD_APP_ID`, `NEXT_PUBLIC_WLD_ACTION_ID`, `RECAPTCHA_SECRET_KEY`, `VERIFICATION_PRIORITY`) are correctly configured in your deployment environment.

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

Wrap your application's root layout or relevant component tree section with `WidCaptchaProvider`. This initializes the context, loads scripts, and provides configuration (`appId`, `actionId`) to child components/hooks.

**Props:**
- `appId` (string, required): Your World ID Application ID (from `NEXT_PUBLIC_WLD_APP_ID`).
- `actionId` (string, required): Your World ID Action ID (from `NEXT_PUBLIC_WLD_ACTION_ID`).
- `recaptchaSiteKey` (string, required): Your reCAPTCHA Site Key (from `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`).
- `onVerificationComplete?` (function): Callback fired when verification succeeds *or* fails.
- `onError?` (function): Callback fired on script loading errors or internal errors.

```tsx
// Example: app/layout.tsx
import { WidCaptchaProvider } from "@/path/to/wid-captcha-context"; // Adjust path as needed

export default function RootLayout({ children }: { children: React.ReactNode }) {
    // Read client-side variables
    const worldIdAppId = process.env.NEXT_PUBLIC_WLD_APP_ID;
    const worldIdActionId = process.env.NEXT_PUBLIC_WLD_ACTION_ID;
    const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

    // Basic check to ensure variables are loaded before rendering provider
    if (!worldIdAppId || !worldIdActionId || !recaptchaSiteKey) {
        console.error(
            "Essential CAPTCHA environment variables (NEXT_PUBLIC_WLD_APP_ID, NEXT_PUBLIC_WLD_ACTION_ID, NEXT_PUBLIC_RECAPTCHA_SITE_KEY) are not set. Provider cannot be initialized."
        );
        // Render fallback or error state - Provider requires these props
        return (
            <html lang="en">
                <body>
                    <div>Error: Client-side CAPTCHA configuration missing. Cannot initialize verification.</div>
                    {children}
                </body>
            </html>
        );
    }

    const handleVerificationResult = (result: any) => {
        console.log("Global Verification Result:", result); // { success: boolean, method: 'world_id' | 'recaptcha' | 'none', data: string }
        // Optional: Add global handling logic (e.g., analytics)
    };

    const handleError = (error: Error) => {
        console.error("Global Verification Error:", error);
    };

    return (
        <html lang="en">
            <body>
                <WidCaptchaProvider
                    appId={worldIdAppId}
                    actionId={worldIdActionId}
                    recaptchaSiteKey={recaptchaSiteKey}
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

Place the `WidCaptcha` component where you need the standard verification UI (World ID button + reCAPTCHA fallback logic).

**Props:**
- `signal?` (string): Optional value passed to World ID verification (and API). Should be unique per user action.
- `verificationLevel?` (`VerificationLevel` from `@worldcoin/idkit`): Optional, e.g., `VerificationLevel.Device`.
- `buttonText?` (string): Customize World ID button text.
- `fallbackButtonText?` (string): Customize reCAPTCHA fallback button text.

*Note: `appId` and `actionId` are automatically obtained from the `WidCaptchaProvider` context.*

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
- `verificationMethod` ('world_id' | 'recaptcha' | 'none'): Which method succeeded.
- `error` (Error | null): Any error object from API calls or script loading.
- `verifyProof` (function): Call this with the World ID proof object (`{ idkit_response: proof }`).
- `triggerRecaptcha` (function): Call this to trigger reCAPTCHA verification (returns token, sends to API).
- `resetVerification` (function): Resets verification state.
- `isRecaptchaReady` (boolean): True if the reCAPTCHA script has loaded.
- `appId` (string | null): World ID App ID from context.
- `actionId` (string | null): World ID Action ID from context.

```tsx
// Example: components/CustomVerification.tsx
import { useWidCaptcha } from '@/path/to/wid-captcha-context'; // Adjust path
import { Button } from '@/components/ui/button';
import { IDKitWidget, VerificationLevel } from "@worldcoin/idkit"; // Import IDKitWidget
import { useCallback } from 'react';

function CustomVerificationFlow() {
    const {
        isVerified,
        isVerifying,
        error,
        verifyProof,
        triggerRecaptcha, // Renamed in previous step, ensure context provides this specific function
        resetVerification,
        isRecaptchaReady,
        appId,
        actionId,
    } = useWidCaptcha();

    // Handler for successful World ID verification via IDKitWidget
    const handleWorldIdSuccess = useCallback((proof: any) => { // Add correct type for proof if available
        console.log("World ID Proof received:", proof);
        verifyProof({ idkit_response: proof }); // Send proof to backend via context function
    }, [verifyProof]);

    // Handler for triggering reCAPTCHA
    const handleRecaptchaVerify = useCallback(async () => {
         if (!isRecaptchaReady || isVerifying) return;
         console.log("Triggering reCAPTCHA verification...");
         // Assuming triggerRecaptcha in context handles token generation + API call
         // Need to implement triggerRecaptcha if not already present
         // Example implementation might be needed in context if `useWidCaptcha` should expose this
         // For now, assume a placeholder or direct API call pattern
         // await callVerificationApi({ recaptcha_token: await getRecaptchaToken() });
         alert("Manual reCAPTCHA trigger needs implementation in context or component.")
    }, [isRecaptchaReady, isVerifying /*, callVerificationApi */]);

    // Render logic based on state
    if (!appId || !actionId) {
        // This check should ideally be handled by the Provider's dev warning,
        // but good practice to handle potential null values.
        return <div>Error: Essential configuration (appId, actionId) missing from provider.</div>;
    }

    if (isVerified) {
        return (
            <div>
                <p>✅ You are verified!</p>
                <Button onClick={resetVerification}>Reset Verification</Button>
            </div>
        );
    }

    return (
        <div>
            <h4>Choose Verification Method:</h4>
            {error && <p style={{ color: 'red' }}>Error: {error.message}</p>}

            {/* World ID Button using IDKitWidget */}
            <IDKitWidget
                app_id={appId} // Pass appId from context
                action={actionId} // Pass actionId from context
                onSuccess={handleWorldIdSuccess} // Hook success callback to context function
                // verification_level={VerificationLevel.Orb} // Optional
                signal="custom-user-signal-456" // Optional
            >
              {({ open }) => (
                <Button onClick={open} disabled={isVerifying}>
                    {isVerifying ? 'Verifying...' : 'Verify with World ID'}
                 </Button>
              )}
            </IDKitWidget>

            {/* Custom reCAPTCHA Trigger Button */}
            {isRecaptchaReady && (
                <Button
                    onClick={handleRecaptchaVerify} // Hook click to custom handler
                    disabled={isVerifying || !isRecaptchaReady}
                    variant="outline"
                    style={{ marginLeft: '10px' }}
                >
                    {isVerifying ? 'Verifying...' : 'Verify with reCAPTCHA (Fallback)'}
                </Button>
            )}
             {!isRecaptchaReady && <p>reCAPTCHA loading...</p>}
        </div>
    );
}
```
*Note: The `CustomVerificationFlow` example assumes the context provides a `triggerRecaptcha` function or similar mechanism. You might need to adjust the context or the component logic depending on how you want to handle manual reCAPTCHA triggering.* See `wid-captcha.tsx` for an example of how the default component handles this.

## How it Works

1.  **Frontend (`WidCaptchaProvider`, `WidCaptcha`, `useWidCaptcha`):**
    *   The `WidCaptchaProvider` is initialized with required client-side keys/IDs (`appId`, `actionId`, `recaptchaSiteKey`). It loads the reCAPTCHA script and manages the verification state and configuration within React Context.
    *   The `WidCaptcha` component or a custom component using `useWidCaptcha` accesses the `appId` and `actionId` from context to configure the `IDKitWidget`.
    *   On World ID success, `IDKitWidget` provides a `proof`. The `onSuccess` callback calls `verifyProof({ idkit_response: proof })` from the context.
    *   If reCAPTCHA is triggered (automatically by the default component or manually via a custom implementation), a token is obtained using the **client-side Site Key**. This token is then sent to the backend via `verifyProof({ recaptcha_token: token })` (or a dedicated function like `triggerRecaptcha`).
2.  **Backend API Route (`app/api/verify-captcha/route.ts`):**
    *   Reads necessary **server-side** environment variables (`NEXT_PUBLIC_WLD_APP_ID`, `NEXT_PUBLIC_WLD_ACTION_ID`, `RECAPTCHA_SECRET_KEY`).
    *   Receives the POST request with either `idkit_response` or `recaptcha_token`.
    *   Based on `VERIFICATION_PRIORITY`, it calls the corresponding verification service (Worldcoin API or Google reCAPTCHA API).
    *   World ID: Verifies the `proof` against the server-side `NEXT_PUBLIC_WLD_APP_ID` and `NEXT_PUBLIC_WLD_ACTION_ID` (and `signal` if provided).
    *   reCAPTCHA: Verifies the `token` using the server-side `RECAPTCHA_SECRET_KEY`.
    *   Returns a JSON response: `{ success: boolean, message?: string, method?: string, error?: string }`.
3.  **State Update:** The `WidCaptchaProvider` context updates its state (`isVerified`, `isVerifying`, `error`, `verificationMethod`) based on the API response, causing consuming components to re-render.

## Linting

To check the code style and identify potential errors:

```bash
pnpm lint
```

## Troubleshooting

- **`Error: Client-side CAPTCHA configuration missing.` (Layout/Provider)**: Ensure `NEXT_PUBLIC_WLD_APP_ID`, `NEXT_PUBLIC_WLD_ACTION_ID`, and `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` are correctly set in your `.env.local` and the provider is receiving them as props.
- **`[WidCaptchaProvider] Missing required prop: ...` (Console Warning)**: Check that `appId`, `actionId`, and `recaptchaSiteKey` are being passed correctly to `<WidCaptchaProvider>` in your layout or parent component.
- **`[useWidCaptcha] Error: ... is missing from WidCaptchaProvider context.` (Console Error)**: Usually indicates the provider wasn't rendered correctly or is missing required props (`appId`, `actionId`). Verify the provider setup.
- **World ID Verification Fails (400 Error from API):**
    - Ensure the `action` configured on the [Worldcoin Developer Portal](https://developer.worldcoin.org/) matches the `actionId` you are using.
    - If using a `signal`, make sure the signal passed to `IDKitWidget` matches the one expected/verified by the backend (currently the API route uses the signal from the proof if present).
- **reCAPTCHA Verification Fails:**
    - Verify the **server-side** `RECAPTCHA_SECRET_KEY` is correct.
    - Confirm the **client-side** `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` matches the site registered in Google Cloud Console / reCAPTCHA Admin.
    - Check the domain configured for your reCAPTCHA keys.
- **`Failed to load reCAPTCHA script` (Console Error):** Check network connectivity, firewall rules, or potential conflicts with other scripts.

## License

MIT
