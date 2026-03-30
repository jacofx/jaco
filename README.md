# SolveConnect

SolveConnect is a two-part app:

- `backend/`: FastAPI + MongoDB API
- `frontend/`: Expo React Native client

## Quick start

Run the repo health check first:

```bash
make doctor
```

Start MongoDB with the bundled container:

```bash
make mongo-up
```

That check verifies:

- the frontend Node version
- backend Python dependencies
- frontend dependencies
- MongoDB availability on `localhost:27017`
- backend availability on `localhost:8000`
- frontend dev server availability

## Repo setup

### 1. Backend

Set up the backend from [`backend/README.md`](/Users/banksjaco/SOLVECONNECT/jaco/backend/README.md). The verified flow is:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
cp .env.example .env
uvicorn server:app --reload
```

The backend now fails fast at startup if MongoDB is unavailable, instead of starting and failing later during requests.

If you do not want a local MongoDB install, start the bundled database container from the repo root:

```bash
make mongo-up
```

Backend test command:

```bash
cd backend
source .venv/bin/activate
python -m pytest -q
```

Minimum backend settings are documented in [`backend/README.md`](/Users/banksjaco/SOLVECONNECT/jaco/backend/README.md).

### 2. Frontend

Create the frontend env file from [`frontend/.env.example`](/Users/banksjaco/SOLVECONNECT/jaco/frontend/.env.example):

```bash
cp frontend/.env.example frontend/.env
```

For local development, leave `EXPO_PUBLIC_BACKEND_URL` empty so the frontend can infer the correct host across web, emulators, and Expo Go. Set it only when your API lives on another machine or domain.

Install and run the frontend:

```bash
cd frontend
npm install
npm run start
```

Or use the convenience targets from the repo root:

```bash
make backend
```

```bash
make frontend
```

```bash
make mongo-up
```

Frontend verification command:

```bash
cd frontend
npm run lint
```

## CI

GitHub Actions runs the main repo checks from [`.github/workflows/ci.yml`](/Users/banksjaco/SOLVECONNECT/jaco/.github/workflows/ci.yml).

- Backend: `python -m pytest -q`
- Frontend: `npm run lint`

Local pre-push commands:

```bash
cd backend
source .venv/bin/activate
python -m pytest -q
```

```bash
cd frontend
npm run lint
```

## Payments

Promoted ads use Stripe Checkout.

- Checkout endpoint: `POST /api/ads/checkout`
- App verification endpoint: `POST /api/ads/verify`
- Webhook endpoint: `POST /api/ads/webhook/stripe`

Configure your Stripe webhook to send `checkout.session.completed` to:

```text
https://your-backend-domain/api/ads/webhook/stripe
```

The mobile app returns from Checkout using:

```text
frontend://ads-payment
```

If you change the Expo scheme, update `PAYMENT_REDIRECT_URI` to match.

## More detail

- Backend setup, env vars, and test notes are in [`backend/README.md`](/Users/banksjaco/SOLVECONNECT/jaco/backend/README.md).
- Frontend-specific setup and usage notes are in [`frontend/README.md`](/Users/banksjaco/SOLVECONNECT/jaco/frontend/README.md).
