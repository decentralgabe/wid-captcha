import { NextRequest, NextResponse } from 'next/server';

// --- Configuration --- //
const WLD_APP_ID = process.env.NEXT_PUBLIC_WLD_APP_ID;
const WLD_ACTION_ID = process.env.NEXT_PUBLIC_WLD_ACTION_ID;
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
const VERIFICATION_PRIORITY = process.env.VERIFICATION_PRIORITY || 'worldid'; // Default to worldid

// Ensure required environment variables are set
if (!WLD_APP_ID || !WLD_ACTION_ID) {
    console.error('World ID environment variables (WLD_APP_ID, WLD_ACTION_ID) are not set.');
}
if (!RECAPTCHA_SECRET_KEY) {
    console.error('reCAPTCHA environment variable (RECAPTCHA_SECRET_KEY) is not set.');
}

// --- World ID Verification --- //
const WORLD_ID_VERIFY_URL = `https://developer.worldcoin.org/api/v2/verify/${WLD_APP_ID}`;

interface IDKitResponse {
    merkle_root: string;
    nullifier_hash: string;
    proof: string;
    credential_type: string;
}

async function verifyWorldID(idkitResponse: IDKitResponse): Promise<[boolean, string]> {
    if (!idkitResponse) {
        return [false, 'World ID proof not provided.'];
    }
    if (!WLD_APP_ID || !WLD_ACTION_ID) {
        return [false, 'World ID environment variables not configured on the server.'];
    }

    const payload = {
        merkle_root: idkitResponse.merkle_root,
        nullifier_hash: idkitResponse.nullifier_hash,
        proof: idkitResponse.proof,
        credential_type: idkitResponse.credential_type,
        action: WLD_ACTION_ID,
        signal: '', // Optional: Add signal if used in frontend IDKit
    };

    try {
        const verifyRes = await fetch(WORLD_ID_VERIFY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (verifyRes.ok) {
            // Verification successful
            return [true, 'World ID verification successful.'];
        } else {
            // Verification failed
            const errorData = await verifyRes.json();
            const detail = errorData?.detail || 'Verification failed';
            console.warn(`World ID verification failed: ${detail}`);
            return [false, `World ID verification failed: ${detail}`];
        }
    } catch (error) {
        console.error('Error connecting to World ID verify API:', error);
        return [false, `Error connecting to World ID verify API: ${error}`];
    }
}

// --- reCAPTCHA Verification --- //
const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

async function verifyRecaptcha(token: string): Promise<[boolean, string]> {
    if (!token) {
        return [false, 'reCAPTCHA token not provided.'];
    }
    if (!RECAPTCHA_SECRET_KEY) {
        return [false, 'reCAPTCHA secret key not configured on the server.'];
    }

    const params = new URLSearchParams({
        secret: RECAPTCHA_SECRET_KEY,
        response: token,
        // remoteip: request.ip // Optional: Include user's IP - requires access to request object differently in Edge Runtime
    });

    try {
        const response = await fetch(RECAPTCHA_VERIFY_URL, {
            method: 'POST',
            body: params,
        });

        const result = await response.json();

        if (result.success) {
            return [true, 'reCAPTCHA verification successful.'];
        } else {
            const errorCodes = result['error-codes'] || [];
            console.warn(`reCAPTCHA verification failed: ${errorCodes}`);
            return [false, `reCAPTCHA verification failed: ${errorCodes.join(', ')}`];
        }
    } catch (error) {
        console.error('Error connecting to reCAPTCHA API:', error);
        return [false, `Error connecting to reCAPTCHA API: ${error}`];
    }
}

// --- Verification Endpoint --- //
export async function POST(request: NextRequest) {
    try {
        const data = await request.json();
        const idkitResponse = data.idkit_response as IDKitResponse | undefined;
        const recaptchaToken = data.recaptcha_token as string | undefined;

        let primaryVerifier: (payload: any) => Promise<[boolean, string]>;
        let fallbackVerifier: (payload: any) => Promise<[boolean, string]>;
        let primaryPayload: IDKitResponse | string | undefined;
        let fallbackPayload: IDKitResponse | string | undefined;

        if (VERIFICATION_PRIORITY === 'worldid') {
            primaryVerifier = verifyWorldID;
            primaryPayload = idkitResponse;
            fallbackVerifier = verifyRecaptcha;
            fallbackPayload = recaptchaToken;
        } else if (VERIFICATION_PRIORITY === 'recaptcha') {
            primaryVerifier = verifyRecaptcha;
            primaryPayload = recaptchaToken;
            fallbackVerifier = verifyWorldID;
            fallbackPayload = idkitResponse;
        } else {
            console.warn(`Invalid VERIFICATION_PRIORITY '${VERIFICATION_PRIORITY}'. Defaulting to 'worldid'.`);
            primaryVerifier = verifyWorldID;
            primaryPayload = idkitResponse;
            fallbackVerifier = verifyRecaptcha;
            fallbackPayload = recaptchaToken;
        }

        // Attempt primary verification
        if (primaryPayload) {
            const [primarySuccess, primaryMessage] = await primaryVerifier(primaryPayload);
            if (primarySuccess) {
                return NextResponse.json({ success: true, message: primaryMessage });
            }
            console.info(`Primary verification (${VERIFICATION_PRIORITY}) failed: ${primaryMessage}`);
            // Fall through to fallback if primary payload was provided but failed
        }

        // Attempt fallback verification if primary wasn't attempted or failed
        if (fallbackPayload) {
            const [fallbackSuccess, fallbackMessage] = await fallbackVerifier(fallbackPayload);
            if (fallbackSuccess) {
                return NextResponse.json({ success: true, message: fallbackMessage });
            }
            console.warn(`Fallback verification failed: ${fallbackMessage}`);
            // Return failure from fallback
            return NextResponse.json({ success: false, error: `Fallback verification failed: ${fallbackMessage}` }, { status: 400 });
        }

        // If neither payload was provided
        return NextResponse.json({ success: false, error: 'No verification method provided or both failed.' }, { status: 400 });

    } catch (error) {
        console.error('Error in verification endpoint:', error);
        if (error instanceof SyntaxError) {
            return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
    }
}