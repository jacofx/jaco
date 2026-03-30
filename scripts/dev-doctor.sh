#!/usr/bin/env bash

set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_DIR="$ROOT_DIR/backend"

EXIT_CODE=0

pass() {
  printf '[pass] %s\n' "$1"
}

warn() {
  printf '[warn] %s\n' "$1"
  EXIT_CODE=1
}

note() {
  printf '[info] %s\n' "$1"
}

check_port() {
  local port="$1"
  nc -z localhost "$port" >/dev/null 2>&1
}

note "SolveConnect dev doctor"

EXPECTED_NODE="$(cat "$FRONTEND_DIR/.nvmrc" 2>/dev/null || true)"
if [ -x "/usr/local/opt/node@20/bin/node" ]; then
  NODE_VERSION="$(/usr/local/opt/node@20/bin/node -v)"
  pass "Homebrew Node 20 is installed at /usr/local/opt/node@20/bin/node ($NODE_VERSION)"
elif command -v node >/dev/null 2>&1; then
  NODE_VERSION="$(node -v)"
  NODE_MAJOR="$(printf '%s' "$NODE_VERSION" | sed -E 's/^v([0-9]+).*/\1/')"
  if [ -n "$EXPECTED_NODE" ] && [ "$NODE_MAJOR" = "$EXPECTED_NODE" ]; then
    pass "Node.js $NODE_VERSION matches frontend requirement"
  else
    warn "Node.js is $NODE_VERSION but frontend expects major version $EXPECTED_NODE. Install node@20 with Homebrew or switch versions before running the frontend"
  fi
else
  warn "Node.js is not installed"
fi

BACKEND_PYTHON="python3"
if [ -x "$BACKEND_DIR/.venv/bin/python" ]; then
  BACKEND_PYTHON="$BACKEND_DIR/.venv/bin/python"
  pass "Backend virtualenv detected at backend/.venv"
else
  warn "Backend virtualenv is missing. Create it with: cd \"$BACKEND_DIR\" && python3 -m venv .venv"
fi

if command -v "$BACKEND_PYTHON" >/dev/null 2>&1; then
  PYTHON_VERSION="$("$BACKEND_PYTHON" --version 2>&1)"
  pass "Backend Python available: $PYTHON_VERSION"
else
  warn "Python is not available for the backend"
fi

if [ -f "$BACKEND_DIR/.env" ]; then
  pass "Backend env file exists"
else
  warn "Missing backend/.env. Create it with: cp \"$BACKEND_DIR/.env.example\" \"$BACKEND_DIR/.env\""
fi

if [ -f "$FRONTEND_DIR/.env" ]; then
  pass "Frontend env file exists"
else
  warn "Missing frontend/.env. Create it with: cp \"$FRONTEND_DIR/.env.example\" \"$FRONTEND_DIR/.env\""
fi

if "$BACKEND_PYTHON" -c "import fastapi, uvicorn, motor" >/dev/null 2>&1; then
  pass "Backend Python dependencies are installed"
else
  warn "Backend dependencies are missing. Install them with: cd \"$BACKEND_DIR\" && \"$BACKEND_PYTHON\" -m pip install -r requirements.txt"
fi

if [ -d "$FRONTEND_DIR/node_modules" ]; then
  pass "Frontend node_modules directory exists"
else
  warn "Frontend dependencies are missing. Install them with: cd \"$FRONTEND_DIR\" && npm install"
fi

if check_port 27017; then
  pass "MongoDB is listening on localhost:27017"
else
  if command -v mongod >/dev/null 2>&1 || command -v mongosh >/dev/null 2>&1; then
    warn "MongoDB tools are installed but the server is not running on localhost:27017"
  elif command -v docker >/dev/null 2>&1 && [ -f "$ROOT_DIR/docker-compose.yml" ]; then
    warn "MongoDB is not reachable on localhost:27017. Start the bundled container with: cd \"$ROOT_DIR\" && make mongo-up"
  elif command -v brew >/dev/null 2>&1; then
    warn "MongoDB is not reachable on localhost:27017 and MongoDB tools are not installed. Start the bundled container with: cd \"$ROOT_DIR\" && make mongo-up, or install MongoDB with Homebrew"
  else
    warn "MongoDB is not reachable on localhost:27017"
  fi
fi

if check_port 8000; then
  pass "Backend is listening on localhost:8000"
else
  warn "Backend is not listening on localhost:8000. Start it with: make backend"
fi

if check_port 8081 || check_port 19006; then
  pass "Frontend dev server appears to be running"
else
  warn "Frontend dev server is not running. Start it with: make frontend"
fi

printf '\n'
if [ "$EXIT_CODE" -eq 0 ]; then
  pass "Local dev stack looks healthy"
else
  note "One or more blocking issues were found"
fi

exit "$EXIT_CODE"
