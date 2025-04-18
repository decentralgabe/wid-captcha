import { NextRequest, NextResponse } from 'next/server';

// --- Configuration --- //
// **Server-Side Environment Variables**

// Your World ID Application ID (should match the one used in the frontend IDKitWidget).
const WLD_APP_ID = process.env.NEXT_PUBLIC_WLD_APP_ID;
// Your World ID Action ID (should match the one used in the frontend IDKitWidget).
const WLD_ACTION_ID = process.env.NEXT_PUBLIC_WLD_ACTION_ID;

// --- CAPTCHA Configuration ---
// Select the CAPTCHA provider ('recaptcha' or 'hcaptcha')
const CAPTCHA_PROVIDER = (process.env.CAPTCHA_PROVIDER || 'recaptcha') as 'recaptcha' | 'hcaptcha';
// Google reCAPTCHA v3 Secret Key (Keep this secret!)
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
// hCaptcha Secret Key (Keep this secret!)
const HCAPTCHA_SECRET_KEY = process.env.HCAPTCHA_SECRET_KEY;
// Client-side keys (used here mainly for existence checks)
const NEXT_PUBLIC_RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
const NEXT_PUBLIC_HCAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;


// Optional: Determines the verification order ('worldid' or 'captcha'). Defaults to 'worldid'.
// Renamed from VERIFICATION_PRIORITY for clarity, as the second option is now configurable.
const PRIMARY_VERIFIER = (process.env.PRIMARY_VERIFIER || 'worldid') as 'worldid' | 'captcha';

// --- Initial Checks --- //
// Log errors during server startup if essential configurations are missing.
if (!WLD_APP_ID) {
    console.error('Server Error: WLD_APP_ID environment variable is not set.');
}
if (!WLD_ACTION_ID) {
    console.error('Server Error: WLD_ACTION_ID environment variable is not set.');
}
// Check keys based on selected CAPTCHA provider
if (CAPTCHA_PROVIDER === 'recaptcha') {
    if (!RECAPTCHA_SECRET_KEY) {
        console.error('Server Error: CAPTCHA_PROVIDER is "recaptcha", but RECAPTCHA_SECRET_KEY environment variable is not set.');
    }
    if (!NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
        // Check client key as well, helps catch config issues early
        console.warn('Server Warning: CAPTCHA_PROVIDER is "recaptcha", but NEXT_PUBLIC_RECAPTCHA_SITE_KEY environment variable is not set. Frontend widget might fail.');
    }
} else if (CAPTCHA_PROVIDER === 'hcaptcha') {
    if (!HCAPTCHA_SECRET_KEY) {
        console.error('Server Error: CAPTCHA_PROVIDER is "hcaptcha", but HCAPTCHA_SECRET_KEY environment variable is not set.');
    }
    if (!NEXT_PUBLIC_HCAPTCHA_SITE_KEY) {
        console.warn('Server Warning: CAPTCHA_PROVIDER is "hcaptcha", but NEXT_PUBLIC_HCAPTCHA_SITE_KEY environment variable is not set. Frontend widget might fail.');
    }
} else {
    console.error(`Server Error: Invalid CAPTCHA_PROVIDER "${CAPTCHA_PROVIDER}". Must be "recaptcha" or "hcaptcha".`);
}


// --- World ID Verification --- //
const WORLD_ID_VERIFY_URL = `https://developer.worldcoin.org/api/v2/verify/${WLD_APP_ID}`;

/**
 * Expected shape of the response object from the World ID Kit frontend component (`IDKitWidget`).
 */
interface IDKitResponse {
    merkle_root: string;
    nullifier_hash: string;
    proof: string;
    credential_type: string;
    signal?: string; // Optional: Include signal if used in the frontend widget
}

/**
 * Verifies the World ID proof using the World Developer Portal API.
 * @param idkitResponse - The response object received from the frontend IDKitWidget.
 * @returns [boolean, string] - A tuple indicating verification success and a status message.
 */
async function verifyWorldID(idkitResponse: IDKitResponse): Promise<[boolean, string]> {
    if (!idkitResponse) {
        return [false, 'World ID proof (idkit_response) not provided in request body.'];
    }
    // Check server configuration again, in case env vars were loaded after initial check
    if (!WLD_APP_ID || !WLD_ACTION_ID) {
        return [false, 'World ID environment variables (NEXT_PUBLIC_WLD_APP_ID, NEXT_PUBLIC_WLD_ACTION_ID) not configured on the server.'];
    }

    // Prepare the payload for the Worldcoin /verify API
    // This includes the proof details received from the frontend, plus the server-side Action ID.
    // The signal received from the frontend should also be included if provided.
    const payloadToSend = {
        ...idkitResponse, // Spread the received proof fields
        action: WLD_ACTION_ID, // Use the server-side Action ID for verification
        signal: idkitResponse.signal ?? '', // Use signal from frontend if present, otherwise empty string
    };
    console.log("Verifying World ID with payload:", payloadToSend); // Debug log

    try {
        const verifyRes = await fetch(WORLD_ID_VERIFY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payloadToSend),
        });

        const responseBody = await verifyRes.json(); // Always parse JSON to get details

        if (verifyRes.ok) {
            // Status code 200 indicates successful verification
            console.log("World ID Verification Success:", responseBody);
            return [true, 'World ID verification successful.'];
        } else {
            // Verification failed (e.g., 400 Bad Request)
            const detail = responseBody?.detail || `Verification failed with status ${verifyRes.status}`;
            console.warn(`World ID verification failed (${verifyRes.status}): ${detail}`, responseBody);
            return [false, `World ID Verification Failed: ${detail}`];
        }
    } catch (error: unknown) {
        console.error('Error connecting to World ID verify API:', error);
        // Explicitly handle potential errors during fetch or JSON parsing
        const errorMessage = error instanceof Error ? error.message : String(error);
        return [false, `API Connection Error: ${errorMessage}`];
    }
}

// --- CAPTCHA Verification --- //

// Generic result type for CAPTCHA verification functions
type CaptchaVerifyResult = [boolean, string, Record<string, any>?]; // [success, message, optionalDetails]

// --- reCAPTCHA Verification --- //
const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

/**
 * Verifies the reCAPTCHA token using the Google reCAPTCHA API.
 * @param token - The reCAPTCHA token received from the frontend.
 * @returns CaptchaVerifyResult - A tuple indicating verification success, a status message, and details.
 */
async function verifyRecaptcha(token: string): Promise<CaptchaVerifyResult> {
    if (!token) {
        return [false, 'reCAPTCHA token not provided in request body.'];
    }
    if (!RECAPTCHA_SECRET_KEY) {
        return [false, 'reCAPTCHA Secret Key (RECAPTCHA_SECRET_KEY) not configured on the server.'];
    }

    // Prepare the payload for the Google siteverify API
    const params = new URLSearchParams({
        secret: RECAPTCHA_SECRET_KEY, // The server-side secret key
        response: token, // The token received from the frontend
    });

    try {
        const response = await fetch(RECAPTCHA_VERIFY_URL, {
            method: 'POST',
            body: params,
        });

        const result = await response.json();

        if (result.success) {
            // reCAPTCHA verification successful
            console.log("reCAPTCHA Verification Success:", result);
            return [true, 'reCAPTCHA verification successful.', result];
        } else {
            // reCAPTCHA verification failed
            const errorCodes = result['error-codes'] || ['unknown'];
            console.warn(`reCAPTCHA verification failed: ${errorCodes.join(', ')}`, result);
            return [false, `reCAPTCHA Verification Failed: ${errorCodes.join(', ')}`, result];
        }
    } catch (error: unknown) {
        console.error('Error connecting to reCAPTCHA API:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return [false, `API Connection Error: ${errorMessage}`];
    }
}

// --- hCaptcha Verification --- //
const HCAPTCHA_VERIFY_URL = 'https://api.hcaptcha.com/siteverify';

/**
 * Verifies the hCaptcha token using the hCaptcha API.
 * @param token - The hCaptcha token received from the frontend.
 * @returns CaptchaVerifyResult - A tuple indicating verification success, a status message, and details.
 */
async function verifyHCaptcha(token: string): Promise<CaptchaVerifyResult> {
    if (!token) {
        return [false, 'hCaptcha token not provided in request body.'];
    }
    if (!HCAPTCHA_SECRET_KEY) {
        return [false, 'hCaptcha Secret Key (HCAPTCHA_SECRET_KEY) not configured on the server.'];
    }

    // Prepare the payload for the hCaptcha siteverify API (application/x-www-form-urlencoded)
    const params = new URLSearchParams({
        secret: HCAPTCHA_SECRET_KEY,
        response: token,
        // remoteip: // Optional: Pass user's IP if available and desired
        // sitekey: // Optional: Pass NEXT_PUBLIC_HCAPTCHA_SITE_KEY if desired for extra check
    });

    try {
        const response = await fetch(HCAPTCHA_VERIFY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(), // Send as form-urlencoded string
        });

        const result = await response.json();

        if (result.success === true) {
            // hCaptcha verification successful
            console.log("hCaptcha Verification Success:", result);
            // Note: Check hostname, challenge_ts, etc. if needed from `result`
            return [true, 'hCaptcha verification successful.', result];
        } else {
            // hCaptcha verification failed
            const errorCodes = result['error-codes'] || ['unknown'];
            console.warn(`hCaptcha verification failed: ${errorCodes.join(', ')}`, result);
            // Consider specific error codes like 'expired-input-response', 'invalid-input-response'
            return [false, `hCaptcha Verification Failed: ${errorCodes.join(', ')}`, result];
        }
    } catch (error: unknown) {
        console.error('Error connecting to hCaptcha API:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return [false, `API Connection Error: ${errorMessage}`];
    }
}


// --- Verification Endpoint --- //

/**
 * API Route handler for POST requests to /api/verify-captcha.
 * Expects a JSON body containing `idkit_response` (for World ID)
 * AND/OR `captcha_token` (for the configured CAPTCHA provider).
 * Verifies the provided proof/token based on the `PRIMARY_VERIFIER` env variable.
 */
export async function POST(request: NextRequest) {
    try {
        // 1. Parse Request Body
        let data: any;
        try {
            data = await request.json();
        } catch (parseError) {
            console.error("Failed to parse request JSON:", parseError);
            return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
        }

        // Extract potential payloads
        const idkitResponse = data.idkit_response as IDKitResponse | undefined;
        const captchaToken = data.captcha_token as string | undefined; // Use generic captcha token
        console.log("Received verification request:", {
            hasIdKit: !!idkitResponse,
            hasCaptcha: !!captchaToken,
            captchaProvider: CAPTCHA_PROVIDER,
            priority: PRIMARY_VERIFIER
        });

        // 2. Determine Verification Functions based on Config
        const captchaVerifier = CAPTCHA_PROVIDER === 'hcaptcha' ? verifyHCaptcha : verifyRecaptcha;
        const captchaMethodName = CAPTCHA_PROVIDER === 'hcaptcha' ? 'hCaptcha' : 'reCAPTCHA';
        const worldIdVerifier = verifyWorldID;
        const worldIdMethodName = 'World ID';

        let primaryVerifier: (payload: any) => Promise<CaptchaVerifyResult>;
        let fallbackVerifier: (payload: any) => Promise<CaptchaVerifyResult>;
        let primaryPayload: IDKitResponse | string | undefined;
        let fallbackPayload: IDKitResponse | string | undefined;
        let primaryMethodName: string;
        let fallbackMethodName: string;

        if (PRIMARY_VERIFIER === 'captcha') {
            primaryVerifier = captchaVerifier;
            primaryPayload = captchaToken;
            primaryMethodName = captchaMethodName;
            fallbackVerifier = worldIdVerifier;
            fallbackPayload = idkitResponse;
            fallbackMethodName = worldIdMethodName;
        } else {
            // Default to World ID first if priority is 'worldid' or invalid
            if (PRIMARY_VERIFIER !== 'worldid') {
                console.warn(`Invalid PRIMARY_VERIFIER '${PRIMARY_VERIFIER}'. Defaulting to 'worldid'.`);
            }
            primaryVerifier = worldIdVerifier;
            primaryPayload = idkitResponse;
            primaryMethodName = worldIdMethodName;
            fallbackVerifier = captchaVerifier;
            fallbackPayload = captchaToken;
            fallbackMethodName = captchaMethodName;
        }

        // 3. Attempt Primary Verification
        if (primaryPayload) {
            console.log(`Attempting primary verification: ${primaryMethodName}`);
            const [primarySuccess, primaryMessage, primaryDetails] = await primaryVerifier(primaryPayload);
            if (primarySuccess) {
                // Primary verification succeeded
                const responseMethod = primaryMethodName === worldIdMethodName ? 'world_id' : CAPTCHA_PROVIDER;
                return NextResponse.json({ success: true, message: primaryMessage, method: responseMethod, details: primaryDetails });
            }
            // Primary verification failed, log and potentially fall through to fallback
            console.info(`Primary verification (${primaryMethodName}) failed: ${primaryMessage}`);
        } else {
            console.log(`Skipping primary verification (${primaryMethodName}): No payload provided.`);
        }

        // 4. Attempt Fallback Verification (if primary failed or wasn't attempted)
        if (fallbackPayload) {
            console.log(`Attempting fallback verification: ${fallbackMethodName}`);
            const [fallbackSuccess, fallbackMessage, fallbackDetails] = await fallbackVerifier(fallbackPayload);
            if (fallbackSuccess) {
                // Fallback verification succeeded
                const responseMethod = fallbackMethodName === worldIdMethodName ? 'world_id' : CAPTCHA_PROVIDER;
                return NextResponse.json({ success: true, message: fallbackMessage, method: responseMethod, details: fallbackDetails });
            }
            // Fallback also failed
            console.warn(`Fallback verification (${fallbackMethodName}) failed: ${fallbackMessage}`);
            const responseMethod = fallbackMethodName === worldIdMethodName ? 'world_id' : CAPTCHA_PROVIDER;
            return NextResponse.json({ success: false, error: `Verification Failed: ${fallbackMessage}`, method: responseMethod, details: fallbackDetails }, { status: 400 });
        } else {
            console.log(`Skipping fallback verification (${fallbackMethodName}): No payload provided.`);
        }

        // 5. Handle Cases Where No Method Succeeded or No Payload Provided
        // If primary payload was provided but failed, and no fallback payload exists
        if (primaryPayload && !fallbackPayload) {
            // The primary message is already logged, return a generic failure based on primary method
            const responseMethod = primaryMethodName === worldIdMethodName ? 'world_id' : CAPTCHA_PROVIDER;
            return NextResponse.json({ success: false, error: `Verification Failed: Primary method (${primaryMethodName}) failed.`, method: responseMethod }, { status: 400 });
        }
        // If neither payload was provided initially
        return NextResponse.json({ success: false, error: 'No verification payload (idkit_response or captcha_token) provided in the request.' }, { status: 400 });

    } catch (error: unknown) {
        // Catch unexpected errors in the handler logic
        console.error('Critical error in verification endpoint:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return NextResponse.json({ success: false, error: `Internal Server Error: ${errorMessage}` }, { status: 500 });
    }
}