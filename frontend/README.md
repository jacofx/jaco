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
   ```

3. Run the backend from the `backend` directory with your normal FastAPI entry command.

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

The app scheme is `frontend`, so Stripe Checkout returns to:

```text
frontend://ads-payment
```

If you change the scheme in [app.json](/Users/banksjaco/SOLVECONNECT/jaco/frontend/app.json), update `PAYMENT_REDIRECT_URI` to match.
