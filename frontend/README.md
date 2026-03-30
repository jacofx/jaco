# SolveConnect Frontend

Expo frontend for the SolveConnect marketplace app.

## Frontend setup

1. Install dependencies

   ```bash
   npm install
   ```

2. Create a frontend env file from [.env.example](/Users/banksjaco/SOLVECONNECT/jaco/frontend/.env.example)

   ```bash
   cp .env.example .env
   ```

   For local development, set `EXPO_PUBLIC_BACKEND_URL` explicitly when the app is not running in the same browser session as the backend.

   Common local values:

   - Web in the same browser session as the backend:

     ```env
     EXPO_PUBLIC_BACKEND_URL=http://127.0.0.1:8000
     ```

   - Expo Go or a development build on a phone on the same Wi-Fi:

     ```env
     EXPO_PUBLIC_BACKEND_URL=http://192.168.x.x:8000
     ```

   - Production or hosted backend:

     ```env
     EXPO_PUBLIC_BACKEND_URL=https://api.yourdomain.com
     ```

3. Start the app

   ```bash
   npx expo start
   ```

## Backend setup

The backend lives in [`../backend`](/Users/banksjaco/SOLVECONNECT/jaco/backend).

1. Create a backend env file from [../backend/.env.example](/Users/banksjaco/SOLVECONNECT/jaco/backend/.env.example)

   ```bash
   cp ../backend/.env.example ../backend/.env
   ```

2. Required backend env vars

   ```env
   MONGO_URL=mongodb://localhost:27017
   DB_NAME=solveconnect
   SECRET_KEY=change-me
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   PAYMENT_REDIRECT_URI=frontend://ads-payment
   ALLOWED_PAYMENT_REDIRECT_HOSTS=localhost,127.0.0.1
   ```

3. Run the backend from the `backend` directory with your normal FastAPI entry command.

4. For local device access, bind the backend on all interfaces:

   ```bash
   python -m uvicorn server:app --reload --host 0.0.0.0 --port 8000
   ```

## Stripe ads flow

Promoted ads use Stripe Checkout.

- `POST /api/ads/checkout` creates the Stripe Checkout session.
- `POST /api/ads/verify` confirms the session when the app returns.
- `POST /api/ads/webhook/stripe` confirms payment server-to-server from Stripe webhooks.

### Stripe webhook

Point your Stripe webhook to:

```text
https://your-backend-domain/api/ads/webhook/stripe
```

Listen for:

- `checkout.session.completed`

### Expo deep link

The app scheme is `frontend`, and the web app also exposes `/ads-payment`.

The frontend now sends a client-appropriate redirect URI to the backend during checkout:

```text
frontend://ads-payment
```

Examples:

- Native app or Expo Go:

  ```text
  frontend://ads-payment
  ```

- Local Expo web on port `8083`:

  ```text
  http://localhost:8083/ads-payment
  ```

If you change the scheme in [app.json](/Users/banksjaco/SOLVECONNECT/jaco/frontend/app.json), update the frontend route assumptions accordingly.

## Environment Matrix

- Browser app:
  use `EXPO_PUBLIC_BACKEND_URL=http://127.0.0.1:8000`

- Expo Go on the same LAN:
  use `EXPO_PUBLIC_BACKEND_URL=http://<your-mac-lan-ip>:8000`

- Installed app build:
  the backend URL is baked into that build; changing the terminal env only affects Expo Go and fresh dev sessions

For a production rebuild against your live API:

```bash
EXPO_PUBLIC_BACKEND_URL=https://api.yourdomain.com eas build --profile production --platform android
```
