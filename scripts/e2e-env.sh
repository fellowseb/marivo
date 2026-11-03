#!/usr/bin/env bash
# Generates the gitignored local env files + garage.toml needed to run the
# full stack for E2E tests in CI. Secrets come from the workflow environment.
set -euo pipefail

if [ -z "${CLERK_PUBLISHABLE_KEY:-}" ] || [ -z "${CLERK_SECRET_KEY:-}" ]; then
  echo "ERROR: CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY must be set." >&2
  echo "Create a GitHub 'e2e' environment (Settings > Environments) with these secrets" >&2
  echo "from a dedicated CI Clerk instance (clerk.com dashboard > API keys)." >&2
  exit 1
fi

RPC_SECRET=$(openssl rand -hex 32)
ADMIN_TOKEN=$(openssl rand -hex 32)
METRICS_TOKEN=$(openssl rand -hex 32)
WORKER_API_KEY=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -hex 16)

# Root env (postgres + garage container)
cat > .env.development.docker <<EOF
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=marivo
GARAGE_PORT=3900
GARAGE_WEB_PORT=3902
GARAGE_ADMIN_PORT=3903
GARAGE_DEFAULT_BUCKET=marivo-imports
EOF

# Garage config (generated; admin token feeds the api's first-boot provisioning)
mkdir -p apps/api/dev
cat > apps/api/dev/garage.toml <<EOF
metadata_dir = "/var/lib/garage/meta"
data_dir = "/var/lib/garage/data"
db_engine = "sqlite"

replication_factor = 1

rpc_bind_addr = "[::]:3901"
rpc_public_addr = "127.0.0.1:3901"
rpc_secret = "$RPC_SECRET"

[s3_api]
s3_region = "garage"
api_bind_addr = "[::]:3900"
root_domain = ".s3.garage.localhost"

[s3_web]
bind_addr = "[::]:3902"
root_domain = ".web.garage.localhost"
index = "index.html"

[k2v_api]
api_bind_addr = "[::]:3904"

[admin]
api_bind_addr = "[::]:3903"
admin_token = "$ADMIN_TOKEN"
metrics_token = "$METRICS_TOKEN"
EOF

# API container env
cat > apps/api/.env.development.docker <<EOF
NODE_ENV=production
CLERK_PUBLISHABLE_KEY=$CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY=$CLERK_SECRET_KEY
IMPORT_SCRIPTS_MISTRAL_API_KEY_DEV=${MISTRAL_API_KEY:-}
GARAGE_ENDPOINT=http://garage:3900
GARAGE_ADMIN_URL=http://garage:3903
GARAGE_ADMIN_TOKEN=$ADMIN_TOKEN
REDIS_HOST=redis
REDIS_PORT=6379
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USERNAME=postgres
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
WORKER_API_KEY=$WORKER_API_KEY
EOF

# Worker container env
cat > apps/worker/.env.development.docker <<EOF
API_URL=http://api:3001
REDIS_HOST=redis
REDIS_PORT=6379
WORKER_API_KEY=$WORKER_API_KEY
# The mock LLM (mistral-mock service) never checks the key, but the SDK
# requires a non-empty one: default to a dummy when the secret is unset.
MISTRAL_API_KEY=${MISTRAL_API_KEY:-e2e-mock-key}
EOF

# Webapp (vite) env
cat > apps/webapp/.env.local <<EOF
VITE_CLERK_PUBLISHABLE_KEY=$CLERK_PUBLISHABLE_KEY
VITE_MARIVO_TRPC_API_URL=http://localhost:3001
EOF

echo "E2E env files generated."
