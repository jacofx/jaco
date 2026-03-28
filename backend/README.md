# SolveConnect Backend

FastAPI backend for SolveConnect.

## Setup

1. Create and activate a local virtual environment

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   python -m pip install --upgrade pip
   ```

2. Create the env file from [\.env.example](/Users/banksjaco/SOLVECONNECT/jaco/backend/.env.example)

   ```bash
   cp .env.example .env
   ```

3. Install dependencies

   ```bash
   python -m pip install -r requirements.txt
   ```

4. Required env vars

   ```env
   MONGO_URL=mongodb://localhost:27017
   DB_NAME=solveconnect
   SECRET_KEY=change-me
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   PAYMENT_REDIRECT_URI=frontend://ads-payment
   ```

5. Start the server from this directory

   ```bash
   uvicorn server:app --reload
   ```

6. Run the backend test suite

   ```bash
   python -m pytest -q
   ```

## Architecture

The backend is organized into a thin route layer and a service layer.

- [`server.py`](/Users/banksjaco/SOLVECONNECT/jaco/backend/server.py): composition entrypoint that wires the app, middleware, routers, and Socket.IO exports together.
- [`core.py`](/Users/banksjaco/SOLVECONNECT/jaco/backend/core.py): shared app state, database clients, auth primitives, Pydantic models, serialization helpers, and shared constants.
- [`routes/`](/Users/banksjaco/SOLVECONNECT/jaco/backend/routes): FastAPI endpoint handlers grouped by domain. These should stay thin and delegate business logic to services.
- [`services/`](/Users/banksjaco/SOLVECONNECT/jaco/backend/services): domain logic for payments, promotions, jobs, users, reviews, messages, and notifications.
- [`socket_events.py`](/Users/banksjaco/SOLVECONNECT/jaco/backend/socket_events.py): Socket.IO event handlers.

Current route modules:

- [`routes/auth.py`](/Users/banksjaco/SOLVECONNECT/jaco/backend/routes/auth.py)
- [`routes/users.py`](/Users/banksjaco/SOLVECONNECT/jaco/backend/routes/users.py)
- [`routes/ads.py`](/Users/banksjaco/SOLVECONNECT/jaco/backend/routes/ads.py)
- [`routes/jobs.py`](/Users/banksjaco/SOLVECONNECT/jaco/backend/routes/jobs.py)
- [`routes/messages.py`](/Users/banksjaco/SOLVECONNECT/jaco/backend/routes/messages.py)
- [`routes/reviews.py`](/Users/banksjaco/SOLVECONNECT/jaco/backend/routes/reviews.py)

Current service modules:

- [`services/payments.py`](/Users/banksjaco/SOLVECONNECT/jaco/backend/services/payments.py)
- [`services/promotions.py`](/Users/banksjaco/SOLVECONNECT/jaco/backend/services/promotions.py)
- [`services/notifications.py`](/Users/banksjaco/SOLVECONNECT/jaco/backend/services/notifications.py)
- [`services/jobs.py`](/Users/banksjaco/SOLVECONNECT/jaco/backend/services/jobs.py)
- [`services/messages.py`](/Users/banksjaco/SOLVECONNECT/jaco/backend/services/messages.py)
- [`services/reviews.py`](/Users/banksjaco/SOLVECONNECT/jaco/backend/services/reviews.py)
- [`services/users.py`](/Users/banksjaco/SOLVECONNECT/jaco/backend/services/users.py)

## Tests

Pytest fixtures live in [`conftest.py`](/Users/banksjaco/SOLVECONNECT/jaco/backend/conftest.py), with fake database helpers in [`test_support.py`](/Users/banksjaco/SOLVECONNECT/jaco/backend/test_support.py).

Current test modules:

- [`test_auth.py`](/Users/banksjaco/SOLVECONNECT/jaco/backend/test_auth.py)
- [`test_ads.py`](/Users/banksjaco/SOLVECONNECT/jaco/backend/test_ads.py)
- [`test_jobs.py`](/Users/banksjaco/SOLVECONNECT/jaco/backend/test_jobs.py)

## Payments

Promoted ads are handled through Stripe Checkout.

- `GET /api/ads/packages`
- `POST /api/ads/checkout`
- `POST /api/ads/verify`
- `GET /api/ads/purchases`
- `POST /api/ads/webhook/stripe`

### Webhook

Configure Stripe to send `checkout.session.completed` to:

```text
https://your-backend-domain/api/ads/webhook/stripe
```

### Redirect

After Checkout, the app returns through:

```text
frontend://ads-payment
```

If the mobile scheme changes, update `PAYMENT_REDIRECT_URI`.

## Notes

- If `STRIPE_SECRET_KEY` is missing, the backend falls back to demo payment completion mode.
- Mongo stores ad payment records in the `ad_payments` collection and links them to created jobs after successful posting.
- `requirements.txt` is intentionally minimal and tracks the packages imported by the current backend code and tests.
- Current test runs may still show warnings from `python_multipart` and `urllib3` on the local macOS LibreSSL-backed Python build. Those warnings did not block installation or test execution in the verified setup.
