import { NextRequest, NextResponse } from 'next/server';

// --- Configuration --- //
// **Server-Side Environment Variables**

// Your World ID Application ID (should match the one used in the frontend IDKitWidget).
const WLD_APP_ID = process.env.NEXT_PUBLIC_WLD_APP_ID;
// Your World ID Action ID (should match the one used in the frontend IDKitWidget).
const WLD_ACTION_ID = process.env.NEXT_PUBLIC_WLD_ACTION_ID;
// Your Google reCAPTCHA v3 Secret Key (obtain from Google Cloud Console). Keep this secret!
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
// Optional: Determines the verification order ('worldid' or 'recaptcha'). Defaults to 'worldid'.
const VERIFICATION_PRIORITY = process.env.VERIFICATION_PRIORITY || 'worldid';

// --- Initial Checks --- //
// Log errors during server startup if essential configurations are missing.
if (!WLD_APP_ID) {
    console.error('Server Error: WLD_APP_ID environment variable is not set.');
}
if (!WLD_ACTION_ID) {
    console.error('Server Error: WLD_ACTION_ID environment variable is not set.');
}
if (!RECAPTCHA_SECRET_KEY) {
    console.error('Server Error: RECAPTCHA_SECRET_KEY environment variable is not set.');
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

// --- reCAPTCHA Verification --- //
const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

/**
 * Verifies the reCAPTCHA token using the Google reCAPTCHA API.
 * @param token - The reCAPTCHA token received from the frontend.
 * @returns [boolean, string] - A tuple indicating verification success and a status message.
 */
async function verifyRecaptcha(token: string): Promise<[boolean, string]> {
    if (!token) {
        return [false, 'reCAPTCHA token (recaptcha_token) not provided in request body.'];
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
            return [true, 'reCAPTCHA verification successful.'];
        } else {
            // reCAPTCHA verification failed
            const errorCodes = result['error-codes'] || ['unknown'];
            console.warn(`reCAPTCHA verification failed: ${errorCodes.join(', ')}`, result);
            return [false, `reCAPTCHA Verification Failed: ${errorCodes.join(', ')}`];
        }
    } catch (error: unknown) {
        console.error('Error connecting to reCAPTCHA API:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return [false, `API Connection Error: ${errorMessage}`];
    }
}

// --- Verification Endpoint --- //

/**
 * API Route handler for POST requests to /api/verify-captcha.
 * Expects a JSON body containing either `idkit_response` (for World ID)
 * or `recaptcha_token` (for reCAPTCHA).
 * Verifies the provided proof/token based on the `VERIFICATION_PRIORITY` env variable.
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
        const recaptchaToken = data.recaptcha_token as string | undefined;
        console.log("Received verification request:", { hasIdKit: !!idkitResponse, hasRecaptcha: !!recaptchaToken, priority: VERIFICATION_PRIORITY });

        // 2. Determine Verification Order based on Priority
        let primaryVerifier: (payload: any) => Promise<[boolean, string]>;
        let fallbackVerifier: (payload: any) => Promise<[boolean, string]>;
        let primaryPayload: IDKitResponse | string | undefined;
        let fallbackPayload: IDKitResponse | string | undefined;
        let primaryMethodName: string;
        let fallbackMethodName: string;

        if (VERIFICATION_PRIORITY === 'recaptcha') {
            primaryVerifier = verifyRecaptcha;
            primaryPayload = recaptchaToken;
            primaryMethodName = 'reCAPTCHA';
            fallbackVerifier = verifyWorldID;
            fallbackPayload = idkitResponse;
            fallbackMethodName = 'World ID';
        } else {
            // Default to World ID first if priority is 'worldid' or invalid
            if (VERIFICATION_PRIORITY !== 'worldid') {
                console.warn(`Invalid VERIFICATION_PRIORITY '${VERIFICATION_PRIORITY}'. Defaulting to 'worldid'.`);
            }
            primaryVerifier = verifyWorldID;
            primaryPayload = idkitResponse;
            primaryMethodName = 'World ID';
            fallbackVerifier = verifyRecaptcha;
            fallbackPayload = recaptchaToken;
            fallbackMethodName = 'reCAPTCHA';
        }

        // 3. Attempt Primary Verification
        if (primaryPayload) {
            console.log(`Attempting primary verification: ${primaryMethodName}`);
            const [primarySuccess, primaryMessage] = await primaryVerifier(primaryPayload);
            if (primarySuccess) {
                // Primary verification succeeded
                return NextResponse.json({ success: true, message: primaryMessage, method: primaryMethodName.toLowerCase().replace(' ', '_') });
            }
            // Primary verification failed, log and potentially fall through to fallback
            console.info(`Primary verification (${primaryMethodName}) failed: ${primaryMessage}`);
        } else {
            console.log(`Skipping primary verification (${primaryMethodName}): No payload provided.`);
        }

        // 4. Attempt Fallback Verification (if primary failed or wasn't attempted)
        if (fallbackPayload) {
            console.log(`Attempting fallback verification: ${fallbackMethodName}`);
            const [fallbackSuccess, fallbackMessage] = await fallbackVerifier(fallbackPayload);
            if (fallbackSuccess) {
                // Fallback verification succeeded
                return NextResponse.json({ success: true, message: fallbackMessage, method: fallbackMethodName.toLowerCase().replace(' ', '_') });
            }
            // Fallback also failed
            console.warn(`Fallback verification (${fallbackMethodName}) failed: ${fallbackMessage}`);
            return NextResponse.json({ success: false, error: `Verification Failed: ${fallbackMessage}`, method: fallbackMethodName.toLowerCase().replace(' ', '_') }, { status: 400 });
        } else {
            console.log(`Skipping fallback verification (${fallbackMethodName}): No payload provided.`);
        }

        // 5. Handle Cases Where No Method Succeeded or No Payload Provided
        // If primary payload was provided but failed, and no fallback payload exists
        if (primaryPayload && !fallbackPayload) {
            // The primary message is already logged, return a generic failure based on primary method
            return NextResponse.json({ success: false, error: `Verification Failed: Primary method (${primaryMethodName}) failed.`, method: primaryMethodName.toLowerCase().replace(' ', '_') }, { status: 400 });
        }
        // If neither payload was provided initially
        return NextResponse.json({ success: false, error: 'No verification payload (idkit_response or recaptcha_token) provided in the request.' }, { status: 400 });

    } catch (error: unknown) {
        // Catch unexpected errors in the handler logic
        console.error('Critical error in verification endpoint:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return NextResponse.json({ success: false, error: `Internal Server Error: ${errorMessage}` }, { status: 500 });
    }
}