# World ID CAPTCHA Wrapper

A React component that provides human verification using World ID with a configurable CAPTCHA provider (reCAPTCHA v2 or hCaptcha) as a fallback, powered by a Next.js API route for server-side verification.

## Prerequisites

- Node.js (recent LTS version)
- pnpm

## Setup

### 1. Clone Repository

```bash
git clone https://github.com/decentralgabe/wid-captcha.git
cd wid-captcha
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment Variables

Create a `.env.local` file with the following variables:

```
NEXT_PUBLIC_WLD_APP_ID=app_your_world_id_app_id
NEXT_PUBLIC_WLD_ACTION_ID=your_action_id
NEXT_PUBLIC_CAPTCHA_PROVIDER=recaptcha  # or hcaptcha
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_recaptcha_key  # if using recaptcha
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your_hcaptcha_key  # if using hcaptcha
CAPTCHA_PROVIDER=recaptcha  # or hcaptcha (must match frontend)
RECAPTCHA_SECRET_KEY=your_secret_key  # if using recaptcha
HCAPTCHA_SECRET_KEY=your_secret_key  # if using hcaptcha
PRIMARY_VERIFIER=worldid  # or captcha
```

Obtain the necessary keys from:
- **World ID**: [Worldcoin Developer Portal](https://developer.worldcoin.org/)
- **reCAPTCHA**: [Google Cloud Console](https://console.cloud.google.com/security/recaptcha)
- **hCaptcha**: [hCaptcha Dashboard](https://dashboard.hcaptcha.com/)

## Usage

### 1. Wrap Your App with Provider

```tsx
// app/layout.tsx
import { WidCaptchaProvider } from "./components/wid-captcha-context";

export default function RootLayout({ children }) {
  const worldIdAppId = process.env.NEXT_PUBLIC_WLD_APP_ID;
  const worldIdActionId = process.env.NEXT_PUBLIC_WLD_ACTION_ID;
  const recaptchaKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const hcaptchaKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;

  return (
    <html lang="en">
      <body>
        <WidCaptchaProvider
          appId={worldIdAppId!}
          actionId={worldIdActionId!}
          recaptchaSiteKey={recaptchaKey}
          hcaptchaSiteKey={hcaptchaKey}
          onVerificationComplete={(result) => console.log("Verification:", result)}
        >
          {children}
        </WidCaptchaProvider>
      </body>
    </html>
  );
}
```

### 2. Use the Component

```tsx
// components/MyForm.tsx
import { WidCaptcha } from './components/wid-captcha';
import { useWidCaptcha } from './components/wid-captcha-context';

function MyForm() {
  const { isVerified } = useWidCaptcha();

  return (
    <form onSubmit={handleSubmit}>
      <h2>Verify to Submit</h2>
      <WidCaptcha signal="unique-user-action" />
      <button type="submit" disabled={!isVerified}>
        Submit
      </button>
    </form>
  );
}
```

## Development

### Running Locally

```bash
pnpm dev
```

### Testing

```bash
pnpm lint
```

### Building for Production

```bash
pnpm build
pnpm start
```

## License

MIT
