# CloudPilot

CloudPilot starts as a modular monolith with a Go HTTP API, a separate Go worker, a React dashboard, and PostgreSQL. This is the runnable foundation: the dashboard shell, API health endpoints, database schema for organisations/memberships/audit events, and local development infrastructure. Cloud discovery, authentication flows, and product APIs are not implemented yet.

## Prerequisites

- Go 1.26 or newer (the Go module may automatically download the required toolchain)
- Node.js 20.19+ or 22.12+
- npm
- Docker Desktop with Compose
- Git

## Start locally on Windows / PowerShell

From the repository root:

```powershell
Copy-Item .env.example .env
# Edit .env and set POSTGRES_PASSWORD to a local development password.
docker compose -f deployments/docker/docker-compose.yml --env-file .env up --build -d
```

Database setup uses a small Go migration runner and numbered SQL files in [backend/internal/migrations](backend/internal/migrations). On API startup, `migrations.Apply` creates the `schema_migrations` table, applies only migration files that have not already run, and starts the HTTP server only after success.

Add a new migration by creating a numbered file such as `002_add_example.sql`. File names sort in sequence, and each file runs once in a single transaction. Migrations are embedded into the API binary, so Docker does not need mounted SQL files or a separate migration CLI.

The backend uses direct `pgx` SQL in feature packages.

Start the frontend in a second terminal:

```powershell
Set-Location frontend
npm run dev
```

Open the local URL printed by Vite. Its development proxy forwards `/healthz` and `/readyz` to the Go API on port 8080. The Docker API is available at `http://localhost:8080/healthz`; `/readyz` also checks PostgreSQL connectivity.

Database setup is intentionally simple: the API applies embedded SQL migration files using the shared pgx pool. Backend feature packages use direct pgx SQL; no generated database layer or external migration CLI is required.

To regenerate TypeScript API types:

```powershell
Set-Location frontend
npm run api:types
```

## Useful checks

```powershell
Set-Location backend
go test ./...
go vet ./...
Set-Location ..\frontend
npm run lint
npm run build
Set-Location ..
docker compose -f deployments/docker/docker-compose.yml --env-file .env.example config
```

## Configuration and security notes

- Compose requires a local `.env`, which is ignored by Git. Never commit credentials.
- Configure OIDC with `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_AUDIENCE`, `OIDC_SCOPES`, `OIDC_CALLBACK_URL`, and `COOKIE_SECURE`. Never commit provider secrets.
- The current API exposes only health and readiness endpoints. Organisation, membership, and audit tables are a schema foundation, not a complete authorization implementation. Do not expose tenant data endpoints until verified authentication, deny-by-default authorization, and tenant-isolation tests are in place.
- The worker is an independently runnable graceful-shutdown placeholder; no background jobs are configured yet.
- Replace the placeholder Go module path `github.com/your-org/cloudpilot` with the actual repository path before publishing.
