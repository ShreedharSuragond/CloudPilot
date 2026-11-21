# Deployment & Operations Guide

This guide covers deployment options, environment configuration, database management, production hardening, and operational runbooks for CloudPilot.

---

## 1. Deployment Topology

CloudPilot is distributed as a multi-container architecture orchestrated via Docker Compose:

```mermaid
flowchart TD
    subgraph Host["Production Host / Cloud VM"]
        subgraph DockerCompose["Docker Compose Stack"]
            Frontend["Frontend Caddy Server (Port 5173:80 - caddy:2-alpine)"]
            API["Backend HTTP API (Port 8080:8080 - cmd/api)"]
            Worker["Discovery Worker Daemon (cmd/worker)"]
            PostgreSQL[("PostgreSQL 18 DB (Port 5432:5432)")]
        end
    end

    Client["User Browsers"] -->|UI Requests (Port 5173)| Frontend
    Client -->|Direct API & OAuth Callback (Port 8080)| API
    API --> PostgreSQL
    Worker --> PostgreSQL
```

---

## 2. Environment Variables Reference (`.env`)

```ini
# ==========================================
# Application & Runtime
# ==========================================
APP_ENV=production
HTTP_ADDR=:8080

# ==========================================
# Database Connection (PostgreSQL 18+)
# ==========================================
POSTGRES_DB=cloudpilot
POSTGRES_USER=cloudpilot
POSTGRES_PASSWORD=secure_password
DATABASE_URL=postgres://cloudpilot:secure_password@postgres:5432/cloudpilot?sslmode=disable

# ==========================================
# Frontend & API Connectivity
# ==========================================
VITE_API_URL=http://localhost:8080/cloudpilot

# ==========================================
# Security & Cross-Origin
# ==========================================
# Comma-separated list of allowed frontend origins:
CORS_ALLOWED_ORIGINS=https://cloudpilot.yourcompany.com,http://localhost:5173
# Set to 'true' in production behind HTTPS:
COOKIE_SECURE=false

# ==========================================
# OpenID Connect (OIDC) Authentication
# ==========================================
OIDC_ISSUER_URL=https://accounts.google.com
OIDC_CLIENT_ID=your-oidc-client-id.apps.googleusercontent.com
OIDC_CLIENT_SECRET=your-oidc-client-secret
OIDC_AUDIENCE=your-oidc-client-id.apps.googleusercontent.com
OIDC_SCOPES=openid profile email
OIDC_CALLBACK_URL=http://localhost:8080/cloudpilot/auth/callback

# ==========================================
# AI Copilot Inference Engine
# ==========================================
# Choose: 'gemini' | 'claude' | 'openai' | 'mock'
AI_PROVIDER=gemini
AI_API_KEY=your-gemini-or-openai-api-key
AI_MODEL=gemini-1.5-flash
# Optional custom base URL (e.g. for local Ollama: http://localhost:11434/v1)
AI_BASE_URL=
```

---

## 3. Quickstart Deployments

### 3.1 Docker Compose (Recommended)
```bash
# 1. Clone the repository and configure environment
cp .env.example .env
nano .env

# 2. Build and launch all 4 services in detached mode
docker compose -f deployments/docker/docker-compose.yml --env-file .env up --build -d

# 3. Check service health
docker compose -f deployments/docker/docker-compose.yml ps
```

### 3.2 Manual Host Execution

#### Terminal 1: Backend API
```bash
cd backend
go run ./cmd/api
```

#### Terminal 2: Discovery Worker
```bash
cd backend
go run ./cmd/worker
```

#### Terminal 3: Frontend Application (Vite Dev Server)
```bash
cd frontend
npm install
npm run dev
```

---

## 4. Health & Monitoring Probes

CloudPilot exposes a comprehensive health probe under the application prefix:

### Unified Health Probe (`GET /cloudpilot/healthz`)
- **Purpose**: Verifies the HTTP process is alive, returns uptime and environment metadata, and checks live PostgreSQL connection health with ping latency and connection pool metrics.
- **Response**: `200 OK` (or `503 Service Unavailable` if database ping fails)
  ```json
  {
    "status": "ok",
    "timestamp": "2026-11-22T03:00:00Z",
    "uptime": "1h24m10s",
    "environment": "development",
    "version": "1.0.0",
    "database": {
      "status": "connected",
      "latency": "1.25ms",
      "total_connections": 5,
      "idle_connections": 4,
      "active_connections": 1
    }
  }
  ```

---

## 5. Operational Runbooks

### Runbook 1: Applying Database Migrations
Migrations are applied automatically by the API on startup. To verify or add a new migration:
1. Create a numbered SQL file in `backend/internal/migrations/` (e.g. `009_add_custom_table.sql`).
2. Restart the API service:
   ```bash
   docker compose -f deployments/docker/docker-compose.yml restart api
   ```
3. Inspect startup logs to confirm success:
   ```bash
   docker compose -f deployments/docker/docker-compose.yml logs api
   ```

### Runbook 2: Rotating OIDC Credentials
1. Generate new client credentials in your identity provider (Google Cloud Console, Okta, Azure AD).
2. Update `OIDC_CLIENT_ID` and `OIDC_CLIENT_SECRET` in `.env`.
3. Restart the API container. Active user sessions remain valid until natural expiration.

### Runbook 3: Troubleshooting Common Issues

| Symptom | Probable Cause | Action |
| :--- | :--- | :--- |
| `dial tcp: connection refused` on `:5432` | PostgreSQL is initializing or credentials mismatch. | Verify `DATABASE_URL` matches PostgreSQL container credentials. |
| `CORS Error: Origin not allowed` | Browser origin is missing from `CORS_ALLOWED_ORIGINS`. | Add your frontend domain/port to `CORS_ALLOWED_ORIGINS` in `.env`. |
| `OIDC redirect_uri_mismatch` | IdP callback configuration does not match. | Ensure `OIDC_CALLBACK_URL` in `.env` matches the redirect URI registered in your IdP. |
| Copilot insights returning empty | Newly created workspace with 0 connected accounts. | Connect an AWS, GCP, or Azure account in Settings > Cloud Connectors to activate discovery. |
