SHELL := /bin/bash
NODE20_BIN := /usr/local/opt/node@20/bin
NPM_CMD := $(if $(wildcard $(NODE20_BIN)/npm),PATH="$(NODE20_BIN):$$PATH" $(NODE20_BIN)/npm,npm)

.PHONY: doctor backend frontend test-backend lint-frontend mongo-up mongo-down mongo-logs

doctor:
	bash ./scripts/dev-doctor.sh

backend:
	cd backend && if [ -x .venv/bin/python ]; then .venv/bin/python -m uvicorn server:app --reload; else python3 -m uvicorn server:app --reload; fi

frontend:
	cd frontend && $(NPM_CMD) run start

mongo-up:
	@if ! command -v docker >/dev/null 2>&1; then \
		echo "docker is not installed or not on PATH."; \
		echo "Install Docker Desktop or run MongoDB locally on localhost:27017."; \
		exit 1; \
	fi
	docker compose up -d mongodb

mongo-down:
	@if ! command -v docker >/dev/null 2>&1; then \
		echo "docker is not installed or not on PATH."; \
		exit 1; \
	fi
	docker compose stop mongodb

mongo-logs:
	@if ! command -v docker >/dev/null 2>&1; then \
		echo "docker is not installed or not on PATH."; \
		exit 1; \
	fi
	docker compose logs -f mongodb

test-backend:
	cd backend && if [ -x .venv/bin/python ]; then .venv/bin/python -m pytest -q; else python3 -m pytest -q; fi

lint-frontend:
	cd frontend && $(NPM_CMD) run lint
