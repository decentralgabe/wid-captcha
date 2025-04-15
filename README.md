# World ID CAPTCHA Wrapper

A React component and hook that provides human verification using World ID with reCAPTCHA as a fallback.

## Features

- Primary verification through World ID (privacy-preserving, Sybil-resistant identity verification)
- Automatic fallback to reCAPTCHA if World ID verification fails
- Easy integration with forms and other user flows
- Fully customizable UI
- TypeScript support

## Installation

\`\`\`bash
npm install @worldcoin/idkit
\`\`\`

## Usage

### Basic Component Usage

\`\`\`tsx
import { WidCaptcha } from './path/to/wid-captcha';

function MyForm() {
  const handleVerificationComplete = (result) => {
    console.log('Verification result:', result);
    if (result.success) {
      // Proceed with form submission
    }
  };

  return (
    <form>
      {/* Your form fields */}
      
      <WidCaptcha
        appId="YOUR_WORLD_ID_APP_ID"
        actionId="YOUR_ACTION_ID"
        recaptchaSiteKey="YOUR_RECAPTCHA_SITE_KEY"
        onVerificationComplete={handleVerificationComplete}
      />
      
      <button type="submit">Submit</button>
    </form>
  );
}
\`\`\`

### Using the Hook

\`\`\`tsx
import { useWidCaptchaHook } from './path/to/use-wid-captcha-hook';
import { Button } from '@/components/ui/button';

function MyForm() {
  const {
    isVerified,
    isLoading,
    verify,
    reset,
    verificationMethod
  } = useWidCaptchaHook({
    worldIdAppId: 'YOUR_WORLD_ID_APP_ID',
    worldIdActionId: 'YOUR_ACTION_ID',
    recaptchaSiteKey: 'YOUR_RECAPTCHA_SITE_KEY',
    onVerificationComplete: (result) => {
      console.log('Verification result:', result);
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isVerified) {
      const result = await verify();
      if (!result.success) {
        return;
      }
    }
    
    // Proceed with form submission
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Your form fields */}
      
      <Button 
        type="button" 
        onClick={verify} 
        disabled={isLoading || isVerified}
      >
        {isLoading ? 'Verifying...' : isVerified ? 'Verified ✓' : 'Verify Human'}
      </Button>
      
      {isVerified && (
        <div>
          Verified via {verificationMethod === 'world_id' ? 'World ID' : 'reCAPTCHA'}
        </div>
      )}
      
      <Button type="submit" disabled={!isVerified}>
        Submit
      </Button>
    </form>
  );
}
\`\`\`

## Configuration

### WidCaptcha Props

| Prop | Type | Description |
|------|------|-------------|
| `appId` | string | Your World ID App ID |
| `actionId` | string | Action ID for the verification |
| `signalDescription` | string | Description of why verification is needed |
| `recaptchaSiteKey` | string | Your Google reCAPTCHA site key |
| `onSuccessWorldId` | function | Callback when World ID verification succeeds |
| `onSuccessRecaptcha` | function | Callback when reCAPTCHA verification succeeds |
| `onVerificationComplete` | function | Callback when any verification completes |
| `onError` | function | Callback when an error occurs |
| `children` | ReactNode | Optional custom UI |

### useWidCaptchaHook Options

| Option | Type | Description |
|--------|------|-------------|
| `worldIdAppId` | string | Your World ID App ID |
| `worldIdActionId` | string | Action ID for the verification |
| `recaptchaSiteKey` | string | Your Google reCAPTCHA site key |
| `autoLoadScripts` | boolean | Whether to automatically load external scripts |
| `onVerificationComplete` | function | Callback when verification completes |

## Advanced Usage

### Custom UI

You can provide your own UI to the `WidCaptcha` component:

\`\`\`tsx
<WidCaptcha
  appId="YOUR_WORLD_ID_APP_ID"
  actionId="YOUR_ACTION_ID"
  recaptchaSiteKey="YOUR_RECAPTCHA_SITE_KEY"
  onVerificationComplete={handleVerificationComplete}
>
  {({ isVerified, isLoading, onVerify, error }) => (
    <div>
      {error && <div className="error">{error}</div>}
      <button onClick={onVerify} disabled={isLoading || isVerified}>
        {isLoading ? 'Verifying...' : isVerified ? 'Verified ✓' : 'Verify with World ID'}
      </button>
    </div>
  )}
</WidCaptcha>
\`\`\`

## Server Verification

When implementing this in a real application, you'll need to verify the proof or token on your server:

1. For World ID verification, follow the verification steps in the [World ID documentation](https://docs.world.org/world-id/reference/idkit)
2. For reCAPTCHA, send the token to your server and verify it using Google's API

## License

MIT
