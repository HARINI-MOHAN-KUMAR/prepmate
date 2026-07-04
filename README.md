<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/56eef892-71b4-4985-8405-c9afa92cb92e

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Voice / Microphone Troubleshooting

- If the browser reports microphone access denied, click the **Speak Answer** button — the app will request microphone permission. If the permission dialog is blocked, use the "Retry Microphone" banner button to explicitly prompt for access.
- If the microphone is still denied, open your browser settings and enable microphone access for `localhost` or `127.0.0.1`, then reload the page.

## Development HMR Port

- The dev server may pick an available HMR port to avoid conflicts. You can override the base HMR port with `VITE_HMR_PORT` and the HMR host with `VITE_HMR_HOST` in your environment.
- Example:

```bash
VITE_HMR_PORT=24678 VITE_HMR_HOST=127.0.0.1 npm run dev
```

## Automated Flow Test

- A small test script `scripts/testInterviewFlow.ts` is provided to exercise session creation and answer submission. Run it after starting the server:

```bash
# start server in another terminal
npm run dev

# in a new terminal
npm run test:flow
```

## Docker

Build: `npm run docker:build`

Run: `npm run docker:up`

Production (PM2):

After building, the container runs `pm2` in cluster mode. You can also run locally with:

```bash
npm run build
npm run start:prod
```

## CI

A GitHub Actions workflow is provided at `.github/workflows/ci.yml` which runs build and flow tests.
