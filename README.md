# World ID CAPTCHA Wrapper

A React component that provides human verification using World ID with reCAPTCHA as a fallback, powered by a Next.js API route for server-side verification.

## Features

- Primary verification through World ID (via `@worldcoin/idkit`)
- Fallback verification using Google reCAPTCHA v3 (invisible).
- Server-side verification of proofs/tokens via a Next.js API Route (`/api/verify-captcha`).
- Configurable verification priority (World ID first or reCAPTCHA first) via environment variables.
- Uses React Context (`WidCaptchaProvider`) for state management.
- Provides a default UI component (`WidCaptcha`) using Shadcn UI components.
- Allows for custom UI integration using the `useWidCaptcha` hook.
- TypeScript support.

## Setup

1.  **Install Dependencies:**
    ```bash
    npm install @worldcoin/idkit
    # or
    yarn add @worldcoin/idkit
    # or
    pnpm add @worldcoin/idkit
    ```
    Ensure you also have React, Next.js, and necessary Shadcn UI components installed.

2.  **Environment Variables:**
    *   Copy the `.env.example` file to `.env.local`:
        ```bash
        cp .env.example .env.local
        ```
    *   Fill in the values in `.env.local`:
        *   `WLD_APP_ID`: Your World ID Application ID (find it on the [Worldcoin Developer Portal](https://developer.worldcoin.org/)). Must start with `app_`.
        *   `WLD_ACTION_ID`: Your World ID Action ID (create one on the Developer Portal).
        *   `RECAPTCHA_SECRET_KEY`: **Server-side Secret Key.** Your Google reCAPTCHA v3 Secret Key (find it on the [Google Cloud Console](https://console.cloud.google.com/security/recaptcha)). **Keep this secret!** Used only in the backend API route.
        *   `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`: **Client-side Site Key.** Your Google reCAPTCHA v3 Site Key. **Important:** Prefix with `NEXT_PUBLIC_` to expose it to the browser for loading the script and executing the challenge.
        *   `VERIFICATION_PRIORITY` (Optional): Set to `worldid` (default) or `recaptcha` to determine which method the backend tries first.

3.  **API Route:** The server-side verification logic resides in `app/api/verify-captcha/route.ts`. Ensure this route is correctly set up in your Next.js project.

## Usage

1.  **Wrap your application (or relevant part) with `WidCaptchaProvider`:**
    This provider manages the verification state and loads the necessary scripts.

    ```tsx
    // Example: In your layout.tsx or a specific page
    import { WidCaptchaProvider } from "./path/to/wid-captcha-context";

    export default function RootLayout({ children }: { children: React.ReactNode }) {
        // Use the *client-side* Site Key here, exposed via NEXT_PUBLIC_
        const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

        if (!recaptchaSiteKey) {
            console.error("Client-side NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not set in environment variables.");
            // Handle the error appropriately, maybe render an error message or fallback UI
            return (
                <html>
                    <body>
                         <div>Error: reCAPTCHA Site Key not configured for the client.</div>
                         {children}
                    </body>
                </html>

            );
        }

        const handleVerificationResult = (result) => {
             console.log("Global Verification Result:", result);
             // You can add global handling logic here if needed
        };

        const handleError = (error) => {
             console.error("Global Verification Error:", error);
        };

        return (
            <html lang="en">
                <body>
                    <WidCaptchaProvider
                        recaptchaSiteKey={recaptchaSiteKey} // Pass the site key prop
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

2.  **Use the `WidCaptcha` component:**
    Place the `WidCaptcha` component where you need the verification UI. You will likely need to expose `NEXT_PUBLIC_WLD_APP_ID` to the client as well.

    ```tsx
    // Add to .env.local:
    // NEXT_PUBLIC_WLD_APP_ID="app_..."

    import { WidCaptcha } from './path/to/wid-captcha';
    import { VerificationLevel } from "@worldcoin/idkit";

    function MyProtectedComponent() {
        // Use NEXT_PUBLIC_ prefixed env vars for client-side access
        const appId = process.env.NEXT_PUBLIC_WLD_APP_ID;
        const actionId = "YOUR_ACTION_ID"; // This can remain server-side only if not needed directly in IDKitWidget props

        // Check if required props are available
        if (!appId) {
           return <div>Error: World ID App ID not configured for the client (NEXT_PUBLIC_WLD_APP_ID).</div>;
        }

        return (
            <div>
                <h2>Verify to Continue</h2>
                <WidCaptcha
                    appId={appId}
                    actionId={actionId}
                    // Optional props:
                    // signal="user-login"
                    // signalDescription="Verify it's you logging in"
                    // verificationLevel={VerificationLevel.Device} // For device auth
                />
                {/* Rest of your component - maybe enable based on verification status */}
            </div>
        );
    }
    ```

3.  **Accessing Verification State (Custom UI):**
    If you need more control or want to integrate the verification status into your own UI elements, use the `useWidCaptcha` hook within a component wrapped by the `WidCaptchaProvider`.

    ```tsx
    import { useWidCaptcha } from './path/to/wid-captcha-context';
    import { Button } from '@/components/ui/button';
    import { IDKitWidget } from "@worldcoin/idkit"; // Import if triggering manually

    function CustomVerificationButton() {
        const {
            isVerified,
            isVerifying,
            error,
            verifyProof,
            triggerRecaptchaVerification,
            reset,
            recaptchaReady
        } = useWidCaptcha();

        const appId = process.env.NEXT_PUBLIC_WLD_APP_ID;
        const actionId = "YOUR_ACTION_ID";

        const handleWorldIdSuccess = (proof) => {
             verifyProof({ idkit_response: proof });
        };

        if (!appId) return <div>Error: Client-side World ID config missing.</div>;

        if (isVerified) {
            return (
                 <div>
                     <p>You are verified!</p>
                     <Button onClick={reset}>Reset Verification</Button>
                 </div>
            );
        }

        return (
            <div>
                {error && <p style={{ color: 'red' }}>Error: {error.message}</p>}

                <IDKitWidget
                     appId={appId}
                     action={actionId}
                     onSuccess={handleWorldIdSuccess}
                     // Add other IDKit props as needed
                >
                  {({ open }) => <Button onClick={open} disabled={isVerifying}>Verify with World ID</Button>}
                </IDKitWidget>

                {recaptchaReady && triggerRecaptchaVerification && (
                     <Button
                        onClick={triggerRecaptchaVerification}
                        disabled={isVerifying || !recaptchaReady}
                        variant="outline"
                        style={{ marginLeft: '10px' }}
                     >
                        {isVerifying ? 'Verifying...' : 'Verify with reCAPTCHA'}
                     </Button>
                )}
            </div>
        );
    }
    ```

## How it Works

1.  **Frontend (`WidCaptchaProvider`, `WidCaptcha`, `useWidCaptcha`):**
    *   The `WidCaptchaProvider` is initialized with the **client-side Site Key** (`NEXT_PUBLIC_RECAPTCHA_SITE_KEY`). It loads the reCAPTCHA script using this key and manages the overall state.
    *   The `WidCaptcha` component renders the UI, including the `@worldcoin/idkit` widget (`IDKitWidget`), using the client-exposed `NEXT_PUBLIC_WLD_APP_ID`.
    *   When the user successfully verifies with World ID via `IDKitWidget`, the `onSuccess` callback receives a proof.
    *   If the user clicks the reCAPTCHA button, the component uses the **client-side Site Key** (via the loaded `grecaptcha` object) to execute the challenge and get a token.
    *   The component calls `verifyProof` (for World ID) or `triggerRecaptchaVerification` (for reCAPTCHA) from the context.
2.  **Context (`wid-captcha-context.tsx`):**
    *   These functions call `callVerificationApi`, sending either the World ID proof (`idkit_response`) or the reCAPTCHA token (`recaptcha_token`) to the backend API route.
3.  **Backend API Route (`app/api/verify-captcha/route.ts`):**
    *   Reads the necessary secrets (`WLD_APP_ID`, `WLD_ACTION_ID`, `RECAPTCHA_SECRET_KEY`) from server-side environment variables.
    *   Receives the POST request with the proof or token.
    *   Calls the appropriate verification API (Worldcoin or Google).
    *   For reCAPTCHA verification, it sends the **server-side Secret Key** (`RECAPTCHA_SECRET_KEY`) and the received token to Google's API.
    *   It returns a JSON response `{ success: boolean, message?: string, error?: string }` to the frontend.
4.  **State Update:** The context updates its state based on the backend response, and the UI re-renders.

## License

MIT
