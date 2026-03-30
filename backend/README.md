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
   ALLOWED_PAYMENT_REDIRECT_HOSTS=localhost,127.0.0.1
   ```

   The default `MONGO_URL=mongodb://localhost:27017` works with either a local MongoDB install or the repo-level Docker Compose Mongo service.

5. Start the server from this directory

   ```bash
   uvicorn server:app --reload
   ```

   The server checks MongoDB during startup. If the database is unavailable, the app still starts but health checks return a degraded status until MongoDB becomes reachable.

   If MongoDB is not installed locally, start the bundled container from the repo root:

   ```bash
   make mongo-up
   ```

   If `make mongo-up` fails with `docker: No such file or directory`, Docker Desktop is not installed or not on your `PATH`. In that case, either install Docker Desktop or run MongoDB locally on `localhost:27017`.

6. Verify backend health after startup

   ```bash
   curl http://localhost:8000/health
   ```

   Keep the `uvicorn` process running in the first terminal while you send the `curl` request from a second terminal.

7. Run the backend test suite

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
- [`test_messages.py`](/Users/banksjaco/SOLVECONNECT/jaco/backend/test_messages.py)
- [`test_socket_events.py`](/Users/banksjaco/SOLVECONNECT/jaco/backend/test_socket_events.py)
- [`test_users.py`](/Users/banksjaco/SOLVECONNECT/jaco/backend/test_users.py)

## Behavior

### Auth And Input Validation

- Registration requires at least one of `email` or `phone`.
- User `role` is validated to `need_help` or `helper`.
- Review `rating` is validated to an integer from `1` to `5`.
- Job status update payloads are validated against the supported job status enum before service logic runs.

### Jobs, Reviews, And Messages

- `/api/jobs/{job_id}/accept` is the only path that moves a job from `posted` to `accepted`.
- `/api/jobs/{job_id}/status` only allows `accepted -> in_progress|completed` and `in_progress -> completed`.
- Reviews can only be created by the job poster after the job is completed, and the submitted `helper_id` must match the job's assigned helper.
- Job messages are limited to the two job participants. The sender must belong to the job, and the receiver must be the other participant.
- Helper and job distance calculations treat `0` latitude or longitude as valid coordinates.

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

The webhook only marks a payment completed when the incoming session ID matches the stored checkout session and Stripe reports `payment_status=paid`.

### Redirect

The checkout API accepts a client-provided `redirect_uri` and validates it before building Stripe success and cancel URLs.

Supported redirect targets:

- `frontend://ads-payment` for native app flows
- `http://localhost:<port>/ads-payment` or `http://127.0.0.1:<port>/ads-payment` for local web flows

If the client does not provide a `redirect_uri`, the backend falls back to:

```text
frontend://ads-payment
```

Use `ALLOWED_PAYMENT_REDIRECT_HOSTS` to expand the set of permitted web redirect hosts beyond `localhost` and `127.0.0.1`.

If Stripe Checkout creation fails, the backend removes the pending payment record instead of leaving an orphaned purchase row behind.

## Socket.IO

- Socket clients must connect with a valid auth token.
- The server accepts the token from Socket.IO auth payload keys such as `token` or `access_token`, from a bearer-form `Authorization`, or from `token`/`access_token` query params.
- Socket room joins are restricted to the authenticated user's own room.
- Socket `send_message` events are subject to the same job-participant checks as the HTTP messaging API.

## Deployment

### MongoDB Atlas

Create an Atlas project and cluster, then set the backend `MONGO_URL` to the Atlas connection string and keep `DB_NAME=solveconnect`.

Example format:

```env
MONGO_URL=mongodb+srv://<db-user>:<db-password>@<cluster-host>/?retryWrites=true&w=majority&appName=SolveConnect
DB_NAME=solveconnect
```

Allow Railway egress to reach Atlas by either:

- temporarily allowing `0.0.0.0/0` in Atlas during setup, or
- using the more restrictive Atlas access pattern you prefer after the first successful deploy

### Railway

This directory includes [`railway.json`](/Users/banksjaco/SOLVECONNECT/jaco/backend/railway.json), which starts the app with:

```bash
uvicorn server:app --host 0.0.0.0 --port $PORT
```

When creating the Railway service, set the service root to [`backend`](/Users/banksjaco/SOLVECONNECT/jaco/backend) and define these variables:

```env
MONGO_URL=mongodb+srv://...
DB_NAME=solveconnect
SECRET_KEY=<strong-random-secret>
STRIPE_SECRET_KEY=sk_live_... or sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYMENT_REDIRECT_URI=frontend://ads-payment
ALLOWED_PAYMENT_REDIRECT_HOSTS=localhost,127.0.0.1
```

### Health Check

After the first deploy, verify both:

```bash
curl https://<your-railway-domain>/health
curl https://<your-railway-domain>/api/health
```

Healthy responses return HTTP `200` with `status=ok`. If MongoDB is unreachable, the app returns HTTP `503` with a degraded payload.

### Custom Domain

Attach `api.yourdomain.com` to the Railway service and create the DNS record Railway gives you for that exact hostname. After DNS propagation, verify:

```bash
curl https://api.yourdomain.com/health
```

If you use Stripe webhooks, update the webhook endpoint to:

```text
https://api.yourdomain.com/api/ads/webhook/stripe
```

## Notes

- If `STRIPE_SECRET_KEY` is missing, the backend falls back to demo payment completion mode.
- Mongo stores ad payment records in the `ad_payments` collection and links them to created jobs after successful posting.
- If startup fails with a MongoDB error, make sure a MongoDB server is running on `localhost:27017` or update `MONGO_URL` in [`backend/.env`](/Users/banksjaco/SOLVECONNECT/jaco/backend/.env).
- `requirements.txt` is intentionally minimal and tracks the packages imported by the current backend code and tests.
- Pytest is configured to ignore two known third-party warnings in the local verified setup: Starlette's `python_multipart` pending deprecation warning and Passlib's Python 3.11 `crypt` deprecation warning.
- The default local virtual environment is expected to use an OpenSSL-backed Python interpreter.
