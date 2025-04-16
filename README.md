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
  - [1. Wrap with Provider](#1-wrap-with-provider)
  - [2. Use the Component](#2-use-the-component)
  - [3. Custom UI with Hook](#3-custom-ui-with-hook)
- [How it Works](#how-it-works)
- [Linting](#linting)
- [License](#license)

## Features

- Primary verification through World ID (via `@worldcoin/idkit`)
- Fallback verification using Google reCAPTCHA v3 (invisible).
- Server-side verification of proofs/tokens via a Next.js API Route (`/api/verify-captcha`).
- Configurable verification priority (World ID first or reCAPTCHA first) via environment variables.
- Uses React Context (`WidCaptchaProvider`) for state management.
- Provides a default UI component (`WidCaptcha`) using Shadcn UI components.
- Allows for custom UI integration using the `useWidCaptcha` hook.
- TypeScript support.

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
  - **World ID:** Create an application and an action on the [Worldcoin Developer Portal](https://developer.worldcoin.org/).
  - **reCAPTCHA:** Set up a reCAPTCHA v3 site on the [Google Cloud Console](https://console.cloud.google.com/security/recaptcha) and get your Site Key and Secret Key.
- Fill in the values in `.env.local`. **Keep secrets like `RECAPTCHA_SECRET_KEY` secure and never commit them to version control.**

**Client-Side Variables (Required in Browser)**

These need to be prefixed with `NEXT_PUBLIC_` to be exposed to the browser by Next.js.

| Variable                     | Description                                             | Example         | Required |
| :--------------------------- | :------------------------------------------------------ | :-------------- | :------- |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Your Google reCAPTCHA v3 **Site Key**.                  | `6LeIxAcTAAAAAJ...` | Yes      |
| `NEXT_PUBLIC_WLD_APP_ID`     | Your World ID Application ID (must start with `app_`). | `app_1234...`   | Yes      |

**Server-Side Variables (Used in API Route Only)**

These are used only in the backend API route (`/api/verify-captcha`) and should **not** be prefixed with `NEXT_PUBLIC_`.

| Variable                 | Description                                                                      | Example         | Required          |
| :----------------------- | :------------------------------------------------------------------------------- | :-------------- | :---------------- |
| `WLD_ACTION_ID`          | Your World ID Action ID.                                                         | `my_action`     | Yes               |
| `RECAPTCHA_SECRET_KEY`   | Your Google reCAPTCHA v3 **Secret Key**. **Keep this secret!**                     | `6LeIxAcTAAAAAG...` | Yes               |
| `VERIFICATION_PRIORITY`  | Determines backend check order: `worldid` (default) or `recaptcha`.              | `worldid`       | No (defaults to `worldid`) |

**Important:** The API route (`app/api/verify-captcha/route.ts`) is pre-configured to handle the server-side verification using these environment variables. You typically don't need to modify it for standard usage.

## Running Locally

To start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) (or the specified port) in your browser to see the application. The example page (`example-page.tsx`) demonstrates the component's usage.

## Building for Production

To create an optimized production build:

```bash
pnpm build
```

To run the production server:

```bash
pnpm start
```

## Usage

### 1. Wrap with Provider

Wrap your application's root layout or the relevant part of your component tree with `WidCaptchaProvider`. This initializes the context and loads necessary scripts.

```tsx
// Example: app/layout.tsx
import { WidCaptchaProvider } from "@/path/to/wid-captcha-context"; // Adjust path as needed

export default function RootLayout({ children }: { children: React.ReactNode }) {
    // Use the *client-side* Site Key here, exposed via NEXT_PUBLIC_
    const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    const worldIdAppId = process.env.NEXT_PUBLIC_WLD_APP_ID; // Needed for IDKitWidget inside Provider

    if (!recaptchaSiteKey || !worldIdAppId) {
        console.error(
            "Client-side NEXT_PUBLIC_RECAPTCHA_SITE_KEY or NEXT_PUBLIC_WLD_APP_ID is not set in environment variables."
        );
        // Handle the error appropriately, maybe render an error message or fallback UI
        return (
            <html lang="en">
                <body>
                    <div>Error: Client-side CAPTCHA configuration missing.</div>
                    {children}
                </body>
            </html>
        );
    }

    const handleVerificationResult = (result: any) => {
        console.log("Global Verification Result:", result);
        // Optional: Add global handling logic here
    };

    const handleError = (error: Error) => {
        console.error("Global Verification Error:", error);
    };

    return (
        <html lang="en">
            <body>
                <WidCaptchaProvider
                    recaptchaSiteKey={recaptchaSiteKey}
                    appId={worldIdAppId} // Pass World ID App ID here too
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

### 2. Use the Component

Place the `WidCaptcha` component where you need the verification UI. It requires the `actionId` and optionally other parameters like `signal`.

```tsx
// Example: components/MyProtectedForm.tsx
import { WidCaptcha } from '@/path/to/wid-captcha'; // Adjust path
import { VerificationLevel } from "@worldcoin/idkit";

function MyProtectedForm() {
    // You only need the Action ID here if passing it directly.
    // If you rely on the server-side WLD_ACTION_ID, you might not need it client-side.
    // However, IDKitWidget best practices often involve passing it client-side too.
    // Consider if you need to expose WLD_ACTION_ID as NEXT_PUBLIC_WLD_ACTION_ID
    const actionId = process.env.NEXT_PUBLIC_WLD_ACTION_ID || "YOUR_DEFAULT_ACTION_ID"; // Ensure this is set

    // Ensure WLD_APP_ID is available via Provider or passed explicitly if needed elsewhere
    // The WidCaptcha component gets appId from the context if not passed directly

    return (
        <form>
            <h2>Verify to Submit</h2>
            {/* Form fields */}
            <WidCaptcha
                actionId={actionId}
                // Optional props:
                // signal="user-signup"
                // verificationLevel={VerificationLevel.Device} // For device auth
            />
            <button type="submit" > {/* Add logic to enable button based on verification state */}
                 Submit
            </button>
        </form>
    );
}
```
*Note: The `WidCaptcha` component relies on the `appId` provided to `WidCaptchaProvider`. Ensure `NEXT_PUBLIC_WLD_APP_ID` is set.*

### 3. Custom UI with Hook

For full control over the UI and verification flow, use the `useWidCaptcha` hook within a component wrapped by `WidCaptchaProvider`.

```tsx
// Example: components/CustomVerification.tsx
import { useWidCaptcha } from '@/path/to/wid-captcha-context'; // Adjust path
import { Button } from '@/components/ui/button';
import { IDKitWidget } from "@worldcoin/idkit"; // Import if triggering manually

function CustomVerificationButton() {
    const {
        isVerified,
        isVerifying,
        error,
        verifyProof, // Renamed from context for clarity in hook usage
        triggerRecaptcha, // Renamed from context
        resetVerification, // Renamed from context
        isRecaptchaReady, // Renamed from context
        appId, // Get appId from context
        actionId, // Use a configured actionId
    } = useWidCaptcha();

    // Action ID should be configured, e.g., from env vars or constants
    const currentActionId = process.env.NEXT_PUBLIC_WLD_ACTION_ID || "YOUR_ACTION_ID_HERE";

    if (!appId) return <div>Error: Client-side World ID App ID missing from provider.</div>;

    const handleWorldIdSuccess = (proof: any) => { // Add type safety if possible
        verifyProof({ idkit_response: proof });
    };

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
            {error && <p style={{ color: 'red' }}>Error: {error}</p>} {/* Assuming error is a string */}

            <IDKitWidget
                app_id={appId} // Use app_id prop for IDKitWidget v2+
                action={currentActionId}
                onSuccess={handleWorldIdSuccess}
                // verification_level={VerificationLevel.Orb} // Default is Orb
                // Add other IDKit props as needed (signal, etc.)
            >
              {({ open }) => (
                <Button onClick={open} disabled={isVerifying}>
                    {isVerifying ? 'Verifying...' : 'Verify with World ID'}
                 </Button>
              )}
            </IDKitWidget>

            {isRecaptchaReady && (
                <Button
                    onClick={triggerRecaptcha}
                    disabled={isVerifying || !isRecaptchaReady}
                    variant="outline"
                    style={{ marginLeft: '10px' }}
                >
                    {isVerifying ? 'Verifying...' : 'Verify with reCAPTCHA (Fallback)'}
                </Button>
            )}
        </div>
    );
}
```

## How it Works

1.  **Frontend (`WidCaptchaProvider`, `WidCaptcha`, `useWidCaptcha`):**
    *   The `WidCaptchaProvider` is initialized with the **client-side Site Key** (`NEXT_PUBLIC_RECAPTCHA_SITE_KEY`) and **World ID App ID** (`NEXT_PUBLIC_WLD_APP_ID`). It loads the reCAPTCHA script and manages the overall state, including making the `appId` available via context.
    *   The `WidCaptcha` component renders the UI, including the `@worldcoin/idkit` widget (`IDKitWidget`). It gets the `appId` from context and requires the `actionId`.
    *   When the user successfully verifies with World ID via `IDKitWidget`, the `onSuccess` callback receives a proof.
    *   If the user clicks the reCAPTCHA button (either default or custom), the `triggerRecaptcha` function uses the loaded `grecaptcha` object (via the **client-side Site Key**) to execute the challenge and get a token.
    *   The component/hook calls `verifyProof` (from the context) which handles sending the verification data (World ID proof or reCAPTCHA token) to the backend API.
2.  **Backend API Route (`app/api/verify-captcha/route.ts`):**
    *   Reads the necessary secrets (`WLD_ACTION_ID`, `RECAPTCHA_SECRET_KEY`) and the `WLD_APP_ID` from **server-side** environment variables.
    *   Receives the POST request containing either `idkit_response` (World ID proof) or `recaptcha_token`.
    *   Based on the `VERIFICATION_PRIORITY` and the received data, it calls the appropriate verification service (Worldcoin Developer Portal API or Google reCAPTCHA API).
    *   For World ID, it verifies the proof against the configured `WLD_APP_ID` and `WLD_ACTION_ID`.
    *   For reCAPTCHA, it sends the **server-side Secret Key** (`RECAPTCHA_SECRET_KEY`) and the received token to Google's verification endpoint.
    *   It returns a JSON response like `{ success: boolean, message?: string, detail?: string }` to the frontend.
3.  **State Update:** The `WidCaptchaProvider` context receives the response from the API, updates its internal state (`isVerified`, `isVerifying`, `error`), triggering UI re-renders in components consuming the context or hook.

## Linting

To check the code style and identify potential errors:

```bash
pnpm lint
```

## License

MIT
