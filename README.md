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
2. Copy or rename `.env.example` to `.env` and set your secrets there, including `GEMINI_API_KEY`.
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

A GitHub Actions workflow is provided at `.github/workflows/render-deploy.yml` which triggers a Render deploy when you push to `main`.

## Deploying to Render

This project includes a `render.yaml` manifest configured to deploy the service using Docker. Follow these steps:

1. Push your repository to GitHub (or connect your Git provider to Render).
2. In Render, create a new service by selecting "Connect a repository" and choose the repository/branch.
3. Render will read `render.yaml` and create the `prepmate-ai` web service. It uses the `Dockerfile` to build the image.
4. Add the required environment variables in the Render service settings (Dashboard → Environment):
   - `JWT_SECRET` (required in production)
   - `MONGODB_URI` (recommended for production)
   - `GEMINI_API_KEY` (optional — leaving it empty uses offline fallback)
   - `SENTRY_DSN` (optional)
5. Trigger a manual deploy or enable automatic deploys.

Notes:
- Do NOT commit real secrets to the repository. Use the Render dashboard to store secrets.
- The project uses a local JSON DB when `MONGODB_URI` is not provided; for production use a managed MongoDB and set `MONGODB_URI`.
- The service exposes a health check at `/api/health`.

If you want, I can create a `.env.example` file with placeholders (non-secret) and update `render.yaml` or help you set the secrets in your Render dashboard.

### Optional: Automatic Deploy via GitHub Actions

You can trigger Render deploys automatically when you push to `main` by adding two repository secrets and using the provided workflow `.github/workflows/render-deploy.yml`.

1. In your GitHub repository settings → Secrets → Actions, add:
   - `RENDER_API_KEY` — a Render API key with deploy permissions
   - `RENDER_SERVICE_ID` — your Render service id (found in Render service settings)
2. Push to `main` and the workflow will call the Render API to create a new deploy. Render will build the image from your repo using the `Dockerfile`.

Note: This workflow only triggers a deploy request — Render performs the build. Monitor the Render dashboard for build logs and runtime environment status.
